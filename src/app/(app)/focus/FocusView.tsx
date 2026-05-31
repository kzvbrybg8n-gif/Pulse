"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconCheck,
  IconPause,
  IconPlay,
  IconSettings,
  IconSkip,
  IconX,
} from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { loadSettings, saveSettings } from "@/lib/pomodoro/settings";
import type {
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

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
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

type Props = {
  initialSessions: PomodoroSession[];
  openTasks: OpenTask[];
  userId: string;
  initialTaskId: string | null;
};

type FinishedRecap = { title: string; seconds: number };

/* ── Component ───────────────────────────────────────── */

export function FocusView({
  initialSessions,
  openTasks,
  userId,
  initialTaskId,
}: Props) {
  const [supabase] = useState(() => createClient());

  // Timer state
  const [settings, setSettings] = useState<PomodoroSettings>(loadSettings);
  const [phase, setPhase] = useState<TimerPhase>("idle");
  const [mode, setMode] = useState<PomodoroMode>("focus");
  const [isLongBreak, setIsLongBreak] = useState(false);
  const [pomodorosDone, setPomodorosDone] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(() => loadSettings().focusMinutes * 60);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId);

  // Data state
  const [taskList, setTaskList] = useState<OpenTask[]>(openTasks);
  const [sessions, setSessions] = useState<PomodoroSession[]>(initialSessions);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Temps total cumulé en focus sur la tâche sélectionnée (toutes sessions)
  const [taskFocusSeconds, setTaskFocusSeconds] = useState(0);
  const [finishedRecap, setFinishedRecap] = useState<FinishedRecap | null>(null);

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

    if (!error) {
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
      // Met à jour le cumul affiché si la session focus concerne la tâche active
      if (mode === "focus" && selectedTaskId) {
        setTaskFocusSeconds((s) => s + durSeconds);
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
    await supabase.from("tasks").update({ status: "done" }).eq("id", selectedTaskId);
    setFinishedRecap({
      title: task?.title ?? "Tâche",
      seconds: taskFocusSeconds,
    });
    setTaskList((prev) => prev.filter((t) => t.id !== selectedTaskId));
    setSelectedTaskId(null);
  }

  function handleSettingsChange(key: keyof PomodoroSettings, raw: string) {
    const val = Math.max(1, parseInt(raw, 10) || 1);
    const next = { ...settings, [key]: val };
    saveSettings(next);
    setSettings(next);
    if (phase === "idle") {
      if (mode === "focus") setSecondsLeft(next.focusMinutes * 60);
      else {
        const secs = (isLongBreak ? next.longBreakMinutes : next.breakMinutes) * 60;
        setSecondsLeft(secs);
      }
    }
  }

  function handleToggle(key: "soundEnabled" | "autoAdvance") {
    const next = { ...settings, [key]: !settings[key] };
    saveSettings(next);
    setSettings(next);
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

            <div className="fc-cycles" aria-label="Progression du cycle">
              {Array.from({ length: cycleCount }).map((_, i) => (
                <span
                  key={i}
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
          <div className="fc-controls" style={{ marginTop: 20 }}>
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

          <p className="fc-controls-hint">{controlHint}</p>

          {/* Settings panel */}
          {settingsOpen && (
            <div className="fc-settings-panel">
              <div className="fc-setting-row">
                <label className="fc-setting-label">Focus (min)</label>
                <input
                  type="number"
                  className="fc-setting-input"
                  min={1}
                  max={120}
                  value={settings.focusMinutes}
                  onChange={(e) => handleSettingsChange("focusMinutes", e.target.value)}
                />
              </div>
              <div className="fc-setting-row">
                <label className="fc-setting-label">Pause (min)</label>
                <input
                  type="number"
                  className="fc-setting-input"
                  min={1}
                  max={60}
                  value={settings.breakMinutes}
                  onChange={(e) => handleSettingsChange("breakMinutes", e.target.value)}
                />
              </div>
              <div className="fc-setting-row">
                <label className="fc-setting-label">Longue pause (min)</label>
                <input
                  type="number"
                  className="fc-setting-input"
                  min={1}
                  max={60}
                  value={settings.longBreakMinutes}
                  onChange={(e) => handleSettingsChange("longBreakMinutes", e.target.value)}
                />
              </div>
              <div className="fc-setting-row">
                <label className="fc-setting-label">Pomodoros / cycle</label>
                <input
                  type="number"
                  className="fc-setting-input"
                  min={1}
                  max={10}
                  value={settings.longBreakInterval}
                  onChange={(e) => handleSettingsChange("longBreakInterval", e.target.value)}
                />
              </div>

              <label className="fc-setting-toggle">
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={() => handleToggle("soundEnabled")}
                />
                <span>Son de fin de phase</span>
              </label>

              <label className="fc-setting-toggle">
                <input
                  type="checkbox"
                  checked={settings.autoAdvance}
                  onChange={() => handleToggle("autoAdvance")}
                />
                <span>Enchaîner automatiquement</span>
              </label>
            </div>
          )}

          {/* History */}
          {sessions.length > 0 && (
            <div className="fc-history">
              <div className="fc-hist-title">Historique récent</div>
              <div className="fc-hist-list">
                {sessions.slice(0, 10).map((s) => (
                  <div key={s.id} className="fc-hist-item">
                    <span className={`fc-hist-badge${s.mode === "break" ? " break" : ""}`}>
                      {s.mode === "focus" ? "Focus" : "Pause"}
                    </span>
                    <span className="fc-hist-duration">
                      {Math.round(s.durationSeconds / 60)} min
                    </span>
                    {s.taskTitle && (
                      <span className="fc-hist-task">{s.taskTitle}</span>
                    )}
                    <span className="fc-hist-time">{formatRelative(s.startedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
