/**
 * Persistance locale de l'état du minuteur Focus.
 *
 * Pourquoi : l'état du minuteur vivait uniquement dans le state React de la vue
 * `/focus`. En changeant de vue, le composant se démonte et l'état est perdu —
 * le minuteur « se réinitialisait ». De plus, `setInterval` est throttlé par le
 * navigateur quand l'onglet passe en arrière-plan, ce qui faussait le décompte.
 *
 * Solution : on persiste l'état et, surtout, on mémorise un **horodatage de fin
 * absolu** (`endsAt`). Le temps restant se recalcule à partir de l'horloge
 * murale (`endsAt - now`), donc le minuteur « continue de courir » même si la
 * vue est démontée, l'onglet en arrière-plan, ou la page rechargée.
 */

import type { PomodoroMode, TimerPhase } from "@/lib/types";

export type PersistedTimer = {
  phase: TimerPhase;
  mode: PomodoroMode;
  isLongBreak: boolean;
  pomodorosDone: number;
  selectedTaskId: string | null;
  /** ISO du début de la phase courante (pour `started_at` en base). */
  startedAt: string | null;
  /** ms epoch de fin de phase quand le minuteur tourne ; `null` sinon. */
  endsAt: number | null;
  /** Secondes restantes — source de vérité quand le minuteur ne tourne pas. */
  secondsLeft: number;
};

const STORAGE_KEY = "pulse:pomodoro-timer";

export function loadTimer(): PersistedTimer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedTimer) : null;
  } catch {
    return null;
  }
}

export function saveTimer(timer: PersistedTimer): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
  } catch {
    /* quota indisponible : on ignore */
  }
}

export function clearTimer(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/** Secondes restantes recalculées depuis l'horloge murale. */
export function secondsLeftFrom(endsAt: number | null): number {
  if (endsAt === null) return 0;
  return Math.max(0, Math.round((endsAt - Date.now()) / 1000));
}
