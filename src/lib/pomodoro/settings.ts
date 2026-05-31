/**
 * Réglage local-only de la vue Focus : « enchaîner automatiquement ».
 *
 * Les durées (focus/pause/longue pause/cycle) et le son de fin de phase sont
 * canoniques côté serveur (table `user_preferences`, édités dans Réglages) et
 * passés à la vue Focus en props. Seul `autoAdvance` vit en local, car c'est un
 * comportement de session propre à cette page.
 */

const STORAGE_KEY = "pulse:pomodoro-auto-advance";

export function loadAutoAdvance(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export function saveAutoAdvance(value: boolean): void {
  localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
}
