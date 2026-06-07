/**
 * Moteur de récurrence minimal — sous-ensemble RRULE (RFC 5545).
 *
 * Cas supportés (SPEC.md) :
 *   FREQ=DAILY
 *   FREQ=WEEKLY;BYDAY=MO  (un ou plusieurs jours : BYDAY=MO,WE,FR)
 *   FREQ=MONTHLY;BYMONTHDAY=1  (jour du mois, 1-31)
 *   FREQ=DAILY;INTERVAL=3
 *
 * Entrée  : une règle RRULE sous forme de chaîne ("FREQ=DAILY;INTERVAL=2").
 * Sortie  : `nextOccurrence(spec, from)` → Date suivante après `from`.
 */

export type RecurrenceSpec =
  | { freq: "DAILY"; interval: number }
  | { freq: "WEEKLY"; byDays: number[] } // jours JS triés : 0=dim..6=sam
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
 * Jours de la semaine pour l'UI, ordonnés lundi → dimanche.
 * `code` = code RRULE (BYDAY), `js` = numéro JS (Date.getDay), `initial`/`label`
 * = libellés FR. Source unique partagée par le sélecteur de récurrence.
 */
export const RRULE_WEEKDAYS = [
  { code: "MO", js: 1, initial: "L", label: "Lun" },
  { code: "TU", js: 2, initial: "M", label: "Mar" },
  { code: "WE", js: 3, initial: "M", label: "Mer" },
  { code: "TH", js: 4, initial: "J", label: "Jeu" },
  { code: "FR", js: 5, initial: "V", label: "Ven" },
  { code: "SA", js: 6, initial: "S", label: "Sam" },
  { code: "SU", js: 0, initial: "D", label: "Dim" },
] as const;

const JS_TO_CODE: Record<number, string> = Object.fromEntries(
  RRULE_WEEKDAYS.map((d) => [d.js, d.code]),
);

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
    const byDays = bydayStr
      .split(",")
      .map((code) => {
        const js = BYDAY_MAP[code.trim()];
        if (js === undefined) throw new Error(`BYDAY inconnu : ${code}`);
        return js;
      })
      .sort((a, b) => a - b);
    // Déduplication (tableau trié)
    const unique = byDays.filter((d, i) => i === 0 || d !== byDays[i - 1]);
    return { freq: "WEEKLY", byDays: unique };
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
    // On vise le prochain jour ciblé strictement après `from` : on cherche
    // le plus petit décalage positif (1..7) parmi tous les jours sélectionnés.
    let best = 7;
    for (const target of spec.byDays) {
      let daysAhead = target - fromDay;
      if (daysAhead <= 0) daysAhead += 7;
      if (daysAhead < best) best = daysAhead;
    }
    return new Date(from.getTime() + best * 86_400_000);
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

// ============================================================
// Helpers de construction / description — utilisés par l'UI
// ============================================================

/** Construit une règle hebdomadaire à partir de codes BYDAY (ex. ["MO","WE"]). */
export function buildWeeklyRule(codes: string[]): string | null {
  const ordered = RRULE_WEEKDAYS.filter((d) => codes.includes(d.code)).map((d) => d.code);
  if (ordered.length === 0) return null;
  return `FREQ=WEEKLY;BYDAY=${ordered.join(",")}`;
}

/** Construit une règle mensuelle au jour du mois donné (1-31). */
export function buildMonthlyRule(monthDay: number): string {
  const day = Math.min(31, Math.max(1, Math.round(monthDay)));
  return `FREQ=MONTHLY;BYMONTHDAY=${day}`;
}

/** Codes BYDAY (ordonnés lundi→dimanche) extraits d'une règle, sinon []. */
export function weekdayCodesFromRule(rule: string | null): string[] {
  if (!rule) return [];
  try {
    const spec = parseRRule(rule);
    if (spec.freq !== "WEEKLY") return [];
    const set = new Set(spec.byDays);
    return RRULE_WEEKDAYS.filter((d) => set.has(d.js)).map((d) => d.code);
  } catch {
    return [];
  }
}

/**
 * Libellé lisible d'une règle de récurrence (FR), tolérant aux règles
 * inconnues (renvoyées telles quelles). Ex. « Chaque lun, mer ».
 */
export function describeRecurrence(rule: string | null): string {
  if (!rule) return "Aucune";
  let spec: RecurrenceSpec;
  try {
    spec = parseRRule(rule);
  } catch {
    return rule;
  }

  if (spec.freq === "DAILY") {
    return spec.interval === 1 ? "Tous les jours" : `Tous les ${spec.interval} jours`;
  }

  if (spec.freq === "WEEKLY") {
    if (spec.byDays.length === 7) return "Tous les jours";
    const labels = RRULE_WEEKDAYS.filter((d) => spec.byDays.includes(d.js)).map((d) =>
      d.label.toLowerCase(),
    );
    return `Chaque ${labels.join(", ")}`;
  }

  return `Le ${spec.byMonthDay} du mois`;
}

/** Code BYDAY correspondant à une date (pour pré-cocher le jour de l'échéance). */
export function weekdayCodeOf(date: Date): string {
  return JS_TO_CODE[date.getDay()];
}
