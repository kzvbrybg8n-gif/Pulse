"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconCheck,
  IconPause,
  IconPlay,
  IconSettings,
  IconSkip,
  IconX,
} from "@/components/icons";
import { Checkbox } from "@/components/ui/Checkbox";
import { createClient } from "@/lib/supabase/client";
import { loadAutoAdvance, saveAutoAdvance } from "@/lib/pomodoro/settings";
import type {
  FocusServerSettings,
  PomodoroMode,
  PomodoroSession,
  PomodoroSettings,
  TimerPhase,
} from "@/lib/types";

/* ── Constants ───────────────────────────────────────── */

const RADIUS = 88;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/* ── Helpers ─────────────────────────────────────────── */

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 1) return "moins d'une minute";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h} h ${rem} min` : `${h} h`;
}

/** Durée compacte « 25m » / « 1h42m » pour l'enregistrement de focus. */
function formatCompact(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h${String(rem).padStart(2, "0")}` : `${h}h`;
}

/** Heures+minutes « 0 m » / « 9 h 12 m » pour les cartes d'aperçu. */
function formatHM(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h} h ${rem} m` : `${h} h`;
}

const CLOCK_FMT = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const DAY_FMT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

function dayKey(d: Date): string {
  return [d.getFullYear(), d.getMonth(), d.getDate()].join("-");
}

function dayLabel(d: Date): string {
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (dayKey(d) === dayKey(today)) return "Aujourd'hui";
  if (dayKey(d) === dayKey(yest)) return "Hier";
  return DAY_FMT.format(d);
}

/**
 * Joue un court carillon de deux notes via la Web Audio API
 * (aucun fichier asset). Montant pour un focus, descendant pour une pause.
 */
function playChime(next: PomodoroMode): void {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const freqs = next === "focus" ? [660, 880] : [880, 660];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      const t = now + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
    window.setTimeout(() => void ctx.close(), 1000);
  } catch {
    /* audio indisponible : on ignore silencieusement */
  }
}

/* ── Props ───────────────────────────────────────────── */

type OpenTask = { id: string; title: string };
type FocusLogEntry = { startedAt: string; durationSeconds: number };

type Props = {
  initialSessions: PomodoroSession[];
  initialFocusLog: FocusLogEntry[];
  openTasks: OpenTask[];
  userId: string;
  initialTaskId: string | null;
  serverSettings: FocusServerSettings;
};

type FinishedRecap = { title: string; seconds: number };

/* ── Component ───────────────────────────────────────── */

export function FocusView({
  initialSessions,
  initialFocusLog,
  openTasks,
  userId,
  initialTaskId,
  serverSettings,
}: Props) {
  const [supabase] = useState(() => createClient());

  // Timer state.
  // Durées + son viennent du serveur (canoniques) ; autoAdvance est local.
  const [settings, setSettings] = useState<PomodoroSettings>(() => ({
    ...serverSettings,
    autoAdvance: loadAutoAdvance(),
  }));
  const [phase, setPhase] = useState<TimerPhase>("idle");
  const [mode, setMode] = useState<PomodoroMode>("focus");
  const [isLongBreak, setIsLongBreak] = useState(false);
  const [pomodorosDone, setPomodorosDone] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(() => serverSettings.focusMinutes * 60);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId);

  // Data state
  const [taskList, setTaskList] = useState<OpenTask[]>(openTasks);
  const [sessions, setSessions] = useState<PomodoroSession[]>(initialSessions);
  const [focusLog, setFocusLog] = useState<FocusLogEntry[]>(initialFocusLog);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Temps total cumulé en focus sur la tâche sélectionnée (toutes sessions)
  const [taskFocusSeconds, setTaskFocusSeconds] = useState(0);
  const [finishedRecap, setFinishedRecap] = useState<FinishedRecap | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Ref to track when each session started (for started_at in DB)
  const startedAtRef = useRef<Date | null>(null);

  /* ── Interval ──────────────────────────────────────── */

  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  /* ── Total focus de la tâche sélectionnée ──────────── */

  const refreshTaskTotal = useCallback(
    async (taskId: string | null) => {
      if (!taskId) {
        setTaskFocusSeconds(0);
        return;
      }
      const { data } = await supabase
        .from("pomodoro_sessions")
        .select("duration_seconds")
        .eq("task_id", taskId)
        .eq("mode", "focus");
      const total = (data ?? []).reduce(
        (sum, r) => sum + (r as { duration_seconds: number }).duration_seconds,
        0,
      );
      setTaskFocusSeconds(total);
    },
    [supabase],
  );

  useEffect(() => {
    void refreshTaskTotal(selectedTaskId);
  }, [selectedTaskId, refreshTaskTotal]);

  /* ── Session completion ────────────────────────────── */

  const handleSessionComplete = useCallback(async () => {
    const now = new Date();
    const durSeconds =
      mode === "focus"
        ? settings.focusMinutes * 60
        : isLongBreak
          ? settings.longBreakMinutes * 60
          : settings.breakMinutes * 60;

    const sessionId = crypto.randomUUID();
    const startedAt = startedAtRef.current?.toISOString() ?? now.toISOString();

    const { error } = await supabase.from("pomodoro_sessions").insert({
      id: sessionId,
      user_id: userId,
      task_id: selectedTaskId,
      mode,
      duration_seconds: durSeconds,
      started_at: startedAt,
      ended_at: now.toISOString(),
    });

    if (error) {
      setActionError("La session n'a pas pu être enregistrée.");
    } else {
      const newSess: PomodoroSession = {
        id: sessionId,
        mode,
        durationSeconds: durSeconds,
        startedAt,
        endedAt: now.toISOString(),
        taskId: selectedTaskId,
        taskTitle: taskList.find((t) => t.id === selectedTaskId)?.title ?? null,
      };
      setSessions((prev) => [newSess, ...prev].slice(0, 20));
      if (mode === "focus") {
        setFocusLog((prev) => [...prev, { startedAt, durationSeconds: durSeconds }]);
        // Met à jour le cumul affiché si la session focus concerne la tâche active
        if (selectedTaskId) setTaskFocusSeconds((s) => s + durSeconds);
      }
    }

    // Carillon de fin de phase, puis transition vers la phase suivante.
    const nextMode: PomodoroMode = mode === "focus" ? "break" : "focus";
    if (settings.soundEnabled) playChime(nextMode);

    if (mode === "focus") {
      const newDone = pomodorosDone + 1;
      const nextLong = newDone >= settings.longBreakInterval;
      const breakSecs =
        (nextLong ? settings.longBreakMinutes : settings.breakMinutes) * 60;
      setPomodorosDone(nextLong ? 0 : newDone);
      setIsLongBreak(nextLong);
      setMode("break");
      setSecondsLeft(breakSecs);
    } else {
      setIsLongBreak(false);
      setMode("focus");
      setSecondsLeft(settings.focusMinutes * 60);
    }

    if (settings.autoAdvance) {
      startedAtRef.current = new Date();
      setPhase("running");
    } else {
      startedAtRef.current = null;
      setPhase("idle");
    }
  }, [
    mode,
    settings,
    isLongBreak,
    pomodorosDone,
    selectedTaskId,
    userId,
    supabase,
    taskList,
  ]);

  useEffect(() => {
    if (phase === "running" && secondsLeft === 0) {
      void handleSessionComplete();
    }
  }, [phase, secondsLeft, handleSessionComplete]);

  /* ── Controls ──────────────────────────────────────── */

  function handleStart() {
    if (startedAtRef.current === null) startedAtRef.current = new Date();
    setPhase("running");
  }

  function handlePause() {
    setPhase("paused");
  }

  function handleReset() {
    setPhase("idle");
    startedAtRef.current = null;
    const secs =
      mode === "focus"
        ? settings.focusMinutes * 60
        : isLongBreak
          ? settings.longBreakMinutes * 60
          : settings.breakMinutes * 60;
    setSecondsLeft(secs);
  }

  function handleSkip() {
    setPhase("idle");
    startedAtRef.current = null;
    if (mode === "focus") {
      setMode("break");
      setIsLongBreak(false);
      setSecondsLeft(settings.breakMinutes * 60);
    } else {
      setMode("focus");
      setIsLongBreak(false);
      setSecondsLeft(settings.focusMinutes * 60);
    }
  }

  async function handleFinishTask() {
    if (!selectedTaskId) return;
    const task = taskList.find((t) => t.id === selectedTaskId);
    const { error } = await supabase
      .from("tasks")
      .update({ status: "done" })
      .eq("id", selectedTaskId);
    if (error) {
      setActionError("La tâche n'a pas pu être marquée comme terminée.");
      return;
    }
    setActionError(null);
    setFinishedRecap({
      title: task?.title ?? "Tâche",
      seconds: taskFocusSeconds,
    });
    setTaskList((prev) => prev.filter((t) => t.id !== selectedTaskId));
    setSelectedTaskId(null);
  }

  function toggleAutoAdvance() {
    const next = !settings.autoAdvance;
    saveAutoAdvance(next);
    setSettings((s) => ({ ...s, autoAdvance: next }));
  }

  /* ── Derived ───────────────────────────────────────── */

  const totalSeconds =
    mode === "focus"
      ? settings.focusMinutes * 60
      : isLongBreak
        ? settings.longBreakMinutes * 60
        : settings.breakMinutes * 60;

  const dashOffset = CIRCUMFERENCE * (secondsLeft / totalSeconds);

  const phaseLabel =
    mode === "focus" ? "FOCUS" : isLongBreak ? "LONGUE PAUSE" : "PAUSE";
  const isBreak = mode === "break";

  const cycleCount = settings.longBreakInterval;

  // Libellé d'action sous les contrôles : rend explicite l'état du minuteur.
  let controlHint: string;
  if (phase === "running") {
    controlHint = mode === "focus" ? "Focus en cours…" : "Pause en cours…";
  } else if (phase === "paused") {
    controlHint = "En pause — reprendre quand tu veux";
  } else if (mode === "focus") {
    controlHint = "Prêt à démarrer le focus";
  } else {
    controlHint = isLongBreak
      ? "Prêt pour la longue pause"
      : "Prêt pour la pause";
  }

  const selectedTask = taskList.find((t) => t.id === selectedTaskId) ?? null;

  /* ── Aperçu (compteurs) ────────────────────────────── */

  const overview = useMemo(() => {
    const todayK = dayKey(new Date());
    let todayPomos = 0;
    let todaySeconds = 0;
    let totalSeconds = 0;
    for (const e of focusLog) {
      totalSeconds += e.durationSeconds;
      if (dayKey(new Date(e.startedAt)) === todayK) {
        todayPomos++;
        todaySeconds += e.durationSeconds;
      }
    }
    return {
      todayPomos,
      todaySeconds,
      totalPomos: focusLog.length,
      totalSeconds,
    };
  }, [focusLog]);

  /* ── Enregistrement de Focus (groupé par jour) ─────── */

  const focusByDay = useMemo(() => {
    const focusSessions = sessions.filter((s) => s.mode === "focus");
    const groups = new Map<string, { label: string; items: PomodoroSession[] }>();
    for (const s of focusSessions) {
      const d = new Date(s.startedAt);
      const k = dayKey(d);
      if (!groups.has(k)) groups.set(k, { label: dayLabel(d), items: [] });
      groups.get(k)!.items.push(s);
    }
    return Array.from(groups.values());
  }, [sessions]);

  /* ── Render ────────────────────────────────────────── */

  return (
    <>
      <main className="pk-content">
        <div className="pk-content-inner">
          {/* Header */}
          <div className="pk-view-head">
            <h1 className="pk-view-title">Focus</h1>
            <button
              type="button"
              className={`fc-settings-toggle${settingsOpen ? " open" : ""}`}
              onClick={() => setSettingsOpen((o) => !o)}
              aria-label="Réglages"
            >
              <IconSettings size={16} />
            </button>
          </div>

          {/* Timer */}
          <div className="fc-timer-wrap">
            <div className="fc-ring-container">
              <svg
                className="fc-ring-svg"
                width={200}
                height={200}
                viewBox="0 0 200 200"
                aria-hidden="true"
              >
                <circle className="fc-ring-bg" cx={100} cy={100} r={RADIUS} />
                <circle
                  className={`fc-ring-progress${isBreak ? " break" : ""}`}
                  cx={100}
                  cy={100}
                  r={RADIUS}
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                />
              </svg>
              <div className="fc-time-display">
                <span className="fc-time">{formatTime(secondsLeft)}</span>
              </div>
            </div>

            <span className={`fc-phase-badge${isBreak ? " break" : ""}`}>
              {phaseLabel}
            </span>

            <div
              className="fc-cycles"
              role="img"
              aria-label={`${pomodorosDone} sur ${cycleCount} pomodoros avant la longue pause`}
            >
              {Array.from({ length: cycleCount }).map((_, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className={`fc-cycle-dot${i < pomodorosDone ? " done" : ""}`}
                />
              ))}
            </div>
          </div>

          {/* Task selector */}
          {taskList.length > 0 && (
            <div className="fc-task-row">
              <select
                className="fc-task-select"
                value={selectedTaskId ?? ""}
                onChange={(e) => setSelectedTaskId(e.target.value || null)}
                aria-label="Associer une tâche"
              >
                <option value="">Aucune tâche associée</option>
                {taskList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Récap de la tâche en cours de focus */}
          {selectedTask && (
            <div className="fc-task-recap">
              <div className="fc-task-recap-info">
                <span className="fc-task-recap-label">Focus sur cette tâche</span>
                <span className="fc-task-recap-total">
                  {formatDuration(taskFocusSeconds)} au total
                </span>
              </div>
              <button
                type="button"
                className="fc-task-finish"
                onClick={() => void handleFinishTask()}
              >
                <IconCheck size={14} />
                Terminer la tâche
              </button>
            </div>
          )}

          {/* Récap affiché après avoir terminé une tâche */}
          {finishedRecap && (
            <div className="fc-finished-recap" role="status">
              <IconCheck size={15} />
              <span>
                <strong>{finishedRecap.title}</strong> terminée —{" "}
                {formatDuration(finishedRecap.seconds)} de focus au total.
              </span>
              <button
                type="button"
                className="fc-finished-close"
                aria-label="Fermer"
                onClick={() => setFinishedRecap(null)}
              >
                <IconX size={13} />
              </button>
            </div>
          )}

          {/* Controls */}
          <div className="fc-controls">
            <button
              type="button"
              className="fc-btn"
              onClick={handleReset}
              aria-label="Réinitialiser"
              title="Réinitialiser"
            >
              <IconX size={16} />
            </button>

            {phase === "running" ? (
              <button
                type="button"
                className="fc-btn primary"
                onClick={handlePause}
                aria-label="Pause"
                title="Mettre en pause"
              >
                <IconPause size={18} />
              </button>
            ) : (
              <button
                type="button"
                className="fc-btn primary"
                onClick={handleStart}
                aria-label={mode === "focus" ? "Démarrer le focus" : "Démarrer la pause"}
                title={mode === "focus" ? "Démarrer le focus" : "Démarrer la pause"}
              >
                <IconPlay size={16} />
              </button>
            )}

            <button
              type="button"
              className="fc-btn"
              onClick={handleSkip}
              aria-label="Passer"
              title="Passer à la phase suivante"
            >
              <IconSkip size={16} />
            </button>
          </div>

          <p className="fc-controls-hint" aria-live="polite">
            {controlHint}
          </p>

          {actionError && (
            <p className="fc-action-error" role="alert">
              {actionError}
            </p>
          )}

          {/* Settings panel */}
          {settingsOpen && (
            <div className="fc-settings-panel">
              <div className="fc-setting-toggle">
                <Checkbox
                  done={settings.autoAdvance}
                  size={20}
                  label="Enchaîner automatiquement les phases"
                  onToggle={toggleAutoAdvance}
                />
                <div className="fc-setting-toggle-text">
                  <span className="fc-setting-toggle-title">Enchaîner automatiquement</span>
                  <span className="fc-setting-toggle-desc">
                    Démarre la phase suivante sans attendre. Sinon, le minuteur
                    s’arrête à chaque fin de phase.
                  </span>
                </div>
              </div>

              <p className="fc-settings-link">
                Durées et son&nbsp;:{" "}
                <Link href="/settings">à régler dans Réglages</Link>.
              </p>
            </div>
          )}

          {/* Aperçu — compteurs de focus */}
          <section className="fc-overview">
            <h2 className="fc-section-title">Aperçu</h2>
            <div className="fc-stats-grid">
              <div className="fc-stat-card">
                <span className="fc-stat-lbl">Pomo d&apos;aujourd&apos;hui</span>
                <span className="fc-stat-val">{overview.todayPomos}</span>
              </div>
              <div className="fc-stat-card">
                <span className="fc-stat-lbl">Focus d&apos;aujourd&apos;hui</span>
                <span className="fc-stat-val">{formatHM(overview.todaySeconds)}</span>
              </div>
              <div className="fc-stat-card">
                <span className="fc-stat-lbl">Total des Pomos</span>
                <span className="fc-stat-val">{overview.totalPomos}</span>
              </div>
              <div className="fc-stat-card">
                <span className="fc-stat-lbl">Durée totale de Focus</span>
                <span className="fc-stat-val">{formatHM(overview.totalSeconds)}</span>
              </div>
            </div>
          </section>

          {/* Enregistrement de Focus — sessions groupées par jour */}
          {focusByDay.length > 0 && (
            <section className="fc-log">
              <h2 className="fc-section-title">L&apos;enregistrement de Focus</h2>
              {focusByDay.map((group) => (
                <div key={group.label} className="fc-log-day">
                  <div className="fc-log-day-label">{group.label}</div>
                  {group.items.map((s) => (
                    <div key={s.id} className="fc-log-item">
                      <span className="fc-log-dot" aria-hidden="true" />
                      <div className="fc-log-body">
                        <span className="fc-log-time">
                          {CLOCK_FMT.format(new Date(s.startedAt))}
                          {s.endedAt && ` – ${CLOCK_FMT.format(new Date(s.endedAt))}`}
                        </span>
                        <span className="fc-log-task">{s.taskTitle ?? "Sans tâche"}</span>
                      </div>
                      <span className="fc-log-dur">{formatCompact(s.durationSeconds)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </section>
          )}
        </div>
      </main>
    </>
  );
}
