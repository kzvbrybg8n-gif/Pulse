"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
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

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

/* ── Props ───────────────────────────────────────────── */

type OpenTask = { id: string; title: string };

type Props = {
  initialSessions: PomodoroSession[];
  openTasks: OpenTask[];
  userId: string;
};

/* ── Component ───────────────────────────────────────── */

export function FocusView({ initialSessions, openTasks, userId }: Props) {
  const [supabase] = useState(() => createClient());

  // Timer state
  const [settings, setSettings] = useState<PomodoroSettings>(loadSettings);
  const [phase, setPhase] = useState<TimerPhase>("idle");
  const [mode, setMode] = useState<PomodoroMode>("focus");
  const [isLongBreak, setIsLongBreak] = useState(false);
  const [pomodorosDone, setPomodorosDone] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(() => loadSettings().focusMinutes * 60);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Data state
  const [sessions, setSessions] = useState<PomodoroSession[]>(initialSessions);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
        taskTitle: openTasks.find((t) => t.id === selectedTaskId)?.title ?? null,
      };
      setSessions((prev) => [newSess, ...prev].slice(0, 20));
    }

    // Transition: focus → break (auto-start) ; break → idle focus
    if (mode === "focus") {
      const newDone = pomodorosDone + 1;
      const nextLong = newDone >= settings.longBreakInterval;
      const breakSecs = (nextLong ? settings.longBreakMinutes : settings.breakMinutes) * 60;
      setPomodorosDone(nextLong ? 0 : newDone);
      setIsLongBreak(nextLong);
      setMode("break");
      setSecondsLeft(breakSecs);
      startedAtRef.current = new Date();
      // phase stays "running" → break auto-starts
    } else {
      setIsLongBreak(false);
      setMode("focus");
      setSecondsLeft(settings.focusMinutes * 60);
      setPhase("idle");
      startedAtRef.current = null;
    }
  }, [mode, settings, isLongBreak, pomodorosDone, selectedTaskId, userId, supabase, openTasks]);

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
          {openTasks.length > 0 && (
            <div className="fc-task-row">
              <select
                className="fc-task-select"
                value={selectedTaskId ?? ""}
                onChange={(e) => setSelectedTaskId(e.target.value || null)}
                aria-label="Associer une tâche"
              >
                <option value="">Aucune tâche associée</option>
                {openTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
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
              >
                <IconPause size={18} />
              </button>
            ) : (
              <button
                type="button"
                className="fc-btn primary"
                onClick={handleStart}
                aria-label="Démarrer"
              >
                <IconPlay size={16} />
              </button>
            )}

            <button
              type="button"
              className="fc-btn"
              onClick={handleSkip}
              aria-label="Passer"
              title="Passer"
            >
              <IconSkip size={16} />
            </button>
          </div>

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
