/**
 * Moteur de récurrence minimal — sous-ensemble RRULE (RFC 5545).
 *
 * Cas supportés (SPEC.md) :
 *   FREQ=DAILY
 *   FREQ=WEEKLY;BYDAY=MO (ou TU, WE, TH, FR, SA, SU)
 *   FREQ=MONTHLY;BYMONTHDAY=1  (jour du mois, 1-31)
 *   FREQ=DAILY;INTERVAL=3
 *
 * Entrée  : une règle RRULE sous forme de chaîne ("FREQ=DAILY;INTERVAL=2").
 * Sortie  : `nextOccurrence(spec, from)` → Date suivante après `from`.
 */

export type RecurrenceSpec =
  | { freq: "DAILY"; interval: number }
  | { freq: "WEEKLY"; byDay: number } // 0=Sun..6=Sat
  | { freq: "MONTHLY"; byMonthDay: number };

const BYDAY_MAP: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

/**
 * Parse une chaîne RRULE en RecurrenceSpec.
 * Lève une erreur si la règle n'est pas reconnue.
 */
export function parseRRule(rule: string): RecurrenceSpec {
  const parts = Object.fromEntries(
    rule
      .toUpperCase()
      .split(";")
      .map((p) => p.split("=") as [string, string]),
  );

  const freq = parts["FREQ"];

  if (freq === "DAILY") {
    const interval = parts["INTERVAL"] ? parseInt(parts["INTERVAL"], 10) : 1;
    if (!Number.isFinite(interval) || interval < 1) throw new Error("INTERVAL invalide");
    return { freq: "DAILY", interval };
  }

  if (freq === "WEEKLY") {
    const bydayStr = parts["BYDAY"];
    if (!bydayStr) throw new Error("BYDAY requis pour FREQ=WEEKLY");
    const byDay = BYDAY_MAP[bydayStr.trim()];
    if (byDay === undefined) throw new Error(`BYDAY inconnu : ${bydayStr}`);
    return { freq: "WEEKLY", byDay };
  }

  if (freq === "MONTHLY") {
    const bymonthdayStr = parts["BYMONTHDAY"];
    if (!bymonthdayStr) throw new Error("BYMONTHDAY requis pour FREQ=MONTHLY");
    const byMonthDay = parseInt(bymonthdayStr, 10);
    if (!Number.isFinite(byMonthDay) || byMonthDay < 1 || byMonthDay > 31)
      throw new Error("BYMONTHDAY invalide");
    return { freq: "MONTHLY", byMonthDay };
  }

  throw new Error(`FREQ non supporté : ${freq}`);
}

/**
 * Calcule la prochaine occurrence APRÈS `from` (strictement supérieure).
 * Le résultat préserve l'heure de `from` (HH:MM:SS), sauf pour MONTHLY
 * où l'heure est également préservée.
 */
export function nextOccurrence(spec: RecurrenceSpec, from: Date): Date {
  if (spec.freq === "DAILY") {
    return new Date(from.getTime() + spec.interval * 86_400_000);
  }

  if (spec.freq === "WEEKLY") {
    const fromDay = from.getDay(); // 0=Sun..6=Sat
    let daysAhead = spec.byDay - fromDay;
    if (daysAhead <= 0) daysAhead += 7;
    return new Date(from.getTime() + daysAhead * 86_400_000);
  }

  // MONTHLY — on vise le jour du mois demandé, clampé au dernier jour réel
  // du mois (ex. BYMONTHDAY=31 → 28/29 février, 30 avril) pour ne sauter
  // aucun mois ni déborder sur le mois suivant.
  const lastDayOfMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();

  const atMonthDay = (year: number, month: number): Date => {
    const day = Math.min(spec.byMonthDay, lastDayOfMonth(year, month));
    const d = new Date(from);
    d.setFullYear(year, month, day);
    return d;
  };

  let next = atMonthDay(from.getFullYear(), from.getMonth());
  if (next <= from) {
    next = atMonthDay(from.getFullYear(), from.getMonth() + 1);
  }
  return next;
}
