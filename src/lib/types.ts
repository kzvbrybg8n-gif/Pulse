import type { ComponentType } from "react";
import type { IconProps } from "@/components/icons";

export type Priority = 1 | 2 | 3 | 4;

export type Subtask = {
  id: string;
  title: string;
  done: boolean;
};

export type Task = {
  id: string;
  title: string;
  done: boolean;
  prio: Priority;
  due: string | null;
  late: boolean;
  dueAt?: string | null;
  tags: string[];
  recur: string | null;
  reminder: boolean;
  remindAt: string | null;
  note: boolean;
  noteContent?: string | null;
  subtasks: Subtask[];
  expanded?: boolean;
};

export type PrioConfig = Record<
  Priority,
  { label: string; varName: string; filled: boolean; sw: number }
>;

export type SmartList = {
  id: string;
  label: string;
  Icon: ComponentType<IconProps>;
  count: number;
  active?: boolean;
};

export type Folder = {
  name: string;
  open: boolean;
  lists: { name: string; count: number }[];
};

export type FootNavItem = {
  id: string;
  label: string;
  Icon: ComponentType<IconProps>;
};

export type PomodoroMode = "focus" | "break";
export type TimerPhase = "idle" | "running" | "paused";

export type PomodoroSession = {
  id: string;
  mode: PomodoroMode;
  durationSeconds: number;
  startedAt: string;
  endedAt: string | null;
  taskId: string | null;
  taskTitle?: string | null;
};

export type PomodoroSettings = {
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
  soundEnabled: boolean;
  autoAdvance: boolean;
};

/** Durées + son canoniques, lus depuis les prefs serveur (édités dans Réglages). */
export type FocusServerSettings = {
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
  soundEnabled: boolean;
};

/* ── Module Compte à rebours ─────────────────────────────── */

export type CountdownType = "countdown" | "countup";

export type CountdownRecurrence =
  | "none"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly";

export type CountdownDayCalcMode = "standard";

/** Modèle de domaine (camelCase) ; voir countdownFromRow pour le mapping DB. */
export type Countdown = {
  id: string;
  name: string;
  icon: string | null;
  /** Date pure « YYYY-MM-DD » (sans fuseau horaire). */
  targetDate: string;
  type: CountdownType;
  reminder: string | null;
  recurrence: CountdownRecurrence;
  dayCalcMode: CountdownDayCalcMode;
  showInSmartList: boolean;
  sortOrder: number;
  createdAt: string;
};

/** Champs éditables via le formulaire (création / mise à jour). */
export type CountdownInput = {
  name: string;
  icon: string | null;
  targetDate: string;
  type: CountdownType;
  reminder: string | null;
  recurrence: CountdownRecurrence;
  dayCalcMode: CountdownDayCalcMode;
  showInSmartList: boolean;
};

export type HabitPeriod = "day" | "week" | "month";

export type Habit = {
  id: string;
  name: string;
  targetPerPeriod: number;
  period: HabitPeriod;
  streak: number;
  checkedToday: boolean;
  weekDots: boolean[]; // index 0 = 6 days ago, index 6 = today
  logDays: string[]; // tous les jours cochés (YYYY-MM-DD), source des champs dérivés
  totalDone: number;
  createdAt: string;
};
