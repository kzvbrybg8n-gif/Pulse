import type { PomodoroSettings } from "@/lib/types";

export const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
};

const STORAGE_KEY = "pulse:pomodoro-settings";

export function loadSettings(): PomodoroSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<PomodoroSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: PomodoroSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}
