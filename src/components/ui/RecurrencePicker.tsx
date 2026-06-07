"use client";

import {
  RRULE_WEEKDAYS,
  buildMonthlyRule,
  buildWeeklyRule,
  parseRRule,
  weekdayCodeOf,
  weekdayCodesFromRule,
} from "@/lib/recurrence";

type Freq = "none" | "daily" | "weekly" | "monthly";

type Props = {
  value: string | null;
  onChange: (rule: string | null) => void;
  /** Échéance de la tâche : sert à pré-cocher le bon jour / jour du mois. */
  referenceDate?: Date | null;
};

const FREQ_OPTIONS: { key: Freq; label: string }[] = [
  { key: "none", label: "Aucune" },
  { key: "daily", label: "Quotidien" },
  { key: "weekly", label: "Hebdomadaire" },
  { key: "monthly", label: "Mensuel" },
];

function freqOf(rule: string | null): Freq {
  if (!rule) return "none";
  try {
    const spec = parseRRule(rule);
    if (spec.freq === "DAILY") return "daily";
    if (spec.freq === "WEEKLY") return "weekly";
    return "monthly";
  } catch {
    return "none";
  }
}

/**
 * Sélecteur de récurrence convivial (partagé QuickAdd / TaskDetail).
 * « Hebdomadaire » fait apparaître le choix des jours de la semaine —
 * même logique que les habitudes. « Mensuel » dérive le jour du mois de
 * l'échéance (ou d'aujourd'hui à défaut).
 */
export function RecurrencePicker({ value, onChange, referenceDate }: Props) {
  const ref = referenceDate ?? new Date();
  const freq = freqOf(value);
  const selectedCodes = weekdayCodesFromRule(value);

  function selectFreq(next: Freq) {
    if (next === "none") return onChange(null);
    if (next === "daily") return onChange("FREQ=DAILY");
    if (next === "weekly") {
      // Pré-coche le jour de l'échéance (ou d'aujourd'hui) si rien de choisi.
      const codes = selectedCodes.length > 0 ? selectedCodes : [weekdayCodeOf(ref)];
      return onChange(buildWeeklyRule(codes));
    }
    return onChange(buildMonthlyRule(ref.getDate()));
  }

  function toggleWeekday(code: string) {
    const has = selectedCodes.includes(code);
    // On empêche de tout décocher : une récurrence hebdo a au moins un jour.
    if (has && selectedCodes.length === 1) return;
    const next = has
      ? selectedCodes.filter((c) => c !== code)
      : [...selectedCodes, code];
    onChange(buildWeeklyRule(next));
  }

  return (
    <div className="rp">
      <div className="rp-freqs">
        {FREQ_OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            className={"pk-qa-recur-preset" + (freq === o.key ? " sel" : "")}
            onClick={() => selectFreq(o.key)}
            aria-pressed={freq === o.key}
          >
            {o.label}
          </button>
        ))}
      </div>

      {freq === "weekly" && (
        <div className="rp-weekdays" role="group" aria-label="Jours de la semaine">
          {RRULE_WEEKDAYS.map((d) => {
            const active = selectedCodes.includes(d.code);
            return (
              <button
                key={d.code}
                type="button"
                className={"rp-weekday" + (active ? " is-active" : "")}
                onClick={() => toggleWeekday(d.code)}
                aria-pressed={active}
                aria-label={d.label}
                title={d.label}
              >
                {d.initial}
              </button>
            );
          })}
        </div>
      )}

      {freq === "monthly" && (
        <div className="rp-hint">Le {ref.getDate()} de chaque mois</div>
      )}
    </div>
  );
}
