// Pulse — Module « Compte à rebours » : logique de calcul pure.
// Aucune dépendance UI ni librairie externe (le repo fait son propre calcul
// de dates). Testée unitairement dans format.test.ts.

export type RemainingUnit = "jour-J" | "days" | "weeks-days" | "months-days";

export type Remaining = {
  /** Chaîne prête à afficher : « Jour J », « 1 », « 1 sem 5 j », « 3m 1j », « 0 ». */
  value: string;
  unit: RemainingUnit;
};

/** Ramène une date à minuit local (ignore l'heure pour un calcul calendaire). */
function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Différence calendaire en jours, de minuit à minuit (aujourd'hui = jour 0). */
function calendarDaysBetween(target: Date, today: Date): number {
  const ms = stripTime(target).getTime() - stripTime(today).getTime();
  // Arrondi pour absorber les éventuels sauts d'heure d'été.
  return Math.round(ms / 86_400_000);
}

/**
 * Ajoute n mois calendaires à une date, en bornant le jour au dernier jour du
 * mois cible (ex. 31/05 + 1 mois = 30/06, pas 01/07). Comportement « clamp »
 * standard, indispensable pour des mois réellement calendaires.
 */
function addCalendarMonths(date: Date, n: number): Date {
  const base = stripTime(date);
  const targetMonth = new Date(base.getFullYear(), base.getMonth() + n, 1);
  const year = targetMonth.getFullYear();
  const month = targetMonth.getMonth();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(base.getDate(), lastDayOfMonth));
}

/** True si la cible est à au moins un mois calendaire plein. */
function isAtLeastOneCalendarMonthAway(target: Date, today: Date): boolean {
  return addCalendarMonths(today, 1).getTime() <= stripTime(target).getTime();
}

/**
 * Nombre de mois calendaires *pleins* entre today et target, plus le reliquat
 * en jours. « Plein » = addCalendarMonths(today, n) <= target.
 */
function calendarMonthsAndDays(
  target: Date,
  today: Date,
): { months: number; days: number } {
  const t = stripTime(today);
  const tgt = stripTime(target);

  // Estimation grossière puis ajustement fin (le clamp peut décaler d'un mois).
  let months =
    (tgt.getFullYear() - t.getFullYear()) * 12 +
    (tgt.getMonth() - t.getMonth());
  while (months > 0 && addCalendarMonths(t, months).getTime() > tgt.getTime()) {
    months -= 1;
  }
  while (addCalendarMonths(t, months + 1).getTime() <= tgt.getTime()) {
    months += 1;
  }

  const days = calendarDaysBetween(tgt, addCalendarMonths(t, months));
  return { months, days };
}

/**
 * Formate le temps restant pour un compte à rebours en mode « standard ».
 * Règles d'affichage (par priorité) :
 *  - diff == 0          → « Jour J »
 *  - >= 1 mois calendaire → « Xm Yj »
 *  - 7 <= diff < 1 mois → « X sem Y j » (« Y j » omis si Y == 0)
 *  - 0 < diff < 7       → chiffre seul
 *  - diff <= 0 (passé)  → « 0 »
 */
export function formatRemaining(target: Date, today: Date): Remaining {
  const diff = calendarDaysBetween(target, today);

  if (diff === 0) return { value: "Jour J", unit: "jour-J" };
  if (diff < 0) return { value: "0", unit: "days" };

  if (isAtLeastOneCalendarMonthAway(target, today)) {
    const { months, days } = calendarMonthsAndDays(target, today);
    const value = days === 0 ? `${months}m` : `${months}m ${days}j`;
    return { value, unit: "months-days" };
  }

  if (diff >= 7) {
    const weeks = Math.floor(diff / 7);
    const remDays = diff % 7;
    const value = remDays === 0 ? `${weeks} sem` : `${weeks} sem ${remDays} j`;
    return { value, unit: "weeks-days" };
  }

  return { value: String(diff), unit: "days" };
}

/**
 * Pour un « compte à l'endroit » (countup) : jours écoulés depuis la cible.
 * Même logique, direction inversée.
 */
export function formatElapsed(target: Date, today: Date): Remaining {
  return formatRemaining(today, target);
}

/** Convertit une date pure « YYYY-MM-DD » en Date locale (minuit). */
export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}
