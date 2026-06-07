/**
 * Moment de la journée pour l'échéance d'une tâche.
 *
 * Décision produit : on ne saisit pas une heure précise mais un « moment »
 * (Matin / Midi / Soir). Pour éviter une migration de schéma, le moment est
 * encodé dans l'heure de `due_at` : chaque moment est ancré à une heure
 * canonique. Le tri chronologique reste donc cohérent (matin < midi < soir),
 * et l'absence de moment (date seule) correspond à minuit.
 */

export type Moment = "matin" | "midi" | "soir";

export const MOMENTS: Moment[] = ["matin", "midi", "soir"];

/** Heure canonique de chaque moment (locale). */
export const MOMENT_HOUR: Record<Moment, number> = {
  matin: 9,
  midi: 13,
  soir: 19,
};

export const MOMENT_LABEL: Record<Moment, string> = {
  matin: "Matin",
  midi: "Midi",
  soir: "Soir",
};

/** Moment dont l'heure canonique est la plus proche de (h:m). */
export function nearestMoment(hours: number, minutes: number): Moment {
  let best: Moment = "matin";
  let bestDist = Infinity;
  for (const mo of MOMENTS) {
    const dist = Math.abs(MOMENT_HOUR[mo] * 60 - (hours * 60 + minutes));
    if (dist < bestDist) {
      bestDist = dist;
      best = mo;
    }
  }
  return best;
}

/**
 * Déduit le moment d'une échéance.
 * Renvoie `null` pour une date seule (minuit) ou une absence d'échéance.
 * Une heure quelconque (tâche héritée à heure précise) est rattachée au
 * moment le plus proche.
 */
export function momentFromIso(iso: string | null): Moment | null {
  if (!iso) return null;
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  if (h === 0 && m === 0) return null; // date seule, pas de moment
  return nearestMoment(h, m);
}

/**
 * Applique un moment (ou date seule) à un jour donné et renvoie l'ISO.
 * `moment === null` ⇒ minuit (date seule).
 */
export function isoWithMoment(date: Date, moment: Moment | null): string {
  const d = new Date(date);
  if (moment === null) {
    d.setHours(0, 0, 0, 0);
  } else {
    d.setHours(MOMENT_HOUR[moment], 0, 0, 0);
  }
  return d.toISOString();
}
