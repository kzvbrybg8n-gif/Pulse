"use client";

import { useMemo } from "react";
import type { Habit } from "@/lib/types";

const DOW_FMT = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });

type DayCell = {
  key: string;
  dow: string; // "lun.", "mar."…
  dayNum: number;
  done: number;
  total: number;
  isToday: boolean;
};

type Props = {
  habits: Habit[];
};

/**
 * Bandeau de semaine : pour chacun des 7 jours (de J-6 à aujourd'hui),
 * un anneau de progression rempli selon la part d'habitudes réalisées ce jour-là.
 * S'appuie sur `weekDots` (index 0 = J-6, index 6 = aujourd'hui).
 */
export function HabitWeekStrip({ habits }: Props) {
  const cells = useMemo<DayCell[]>(() => {
    const today = new Date();
    const total = habits.length;

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const done = habits.reduce((n, h) => n + (h.weekDots[i] ? 1 : 0), 0);
      return {
        key: i.toString(),
        dow: DOW_FMT.format(d),
        dayNum: d.getDate(),
        done,
        total,
        isToday: i === 6,
      };
    });
  }, [habits]);

  return (
    <div className="hb-week" role="list" aria-label="Progression de la semaine">
      {cells.map((c) => (
        <WeekDay key={c.key} cell={c} />
      ))}
    </div>
  );
}

const R = 13;
const STROKE = 2.5;
const C = 2 * Math.PI * R;

function WeekDay({ cell }: { cell: DayCell }) {
  const frac = cell.total > 0 ? cell.done / cell.total : 0;
  const label = `${cell.dow} ${cell.dayNum} — ${cell.done} sur ${cell.total}`;

  return (
    <div
      role="listitem"
      className={"hb-week-day" + (cell.isToday ? " is-today" : "")}
      aria-label={label}
    >
      <span className="hb-week-dow">{cell.dow}</span>
      <span className="hb-week-num">{cell.dayNum}</span>
      <svg className="hb-week-ring" width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
        <circle className="hb-week-ring-bg" cx="16" cy="16" r={R} strokeWidth={STROKE} fill="none" />
        {frac > 0 && (
          <circle
            className="hb-week-ring-fg"
            cx="16"
            cy="16"
            r={R}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - frac)}
            transform="rotate(-90 16 16)"
          />
        )}
      </svg>
    </div>
  );
}
