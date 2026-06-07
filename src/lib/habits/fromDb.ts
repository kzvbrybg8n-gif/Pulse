import { computeStreak, localDateStr } from "@/lib/habits/streak";
import type { Habit, HabitPeriod } from "@/lib/types";

export type HabitRow = {
  id: string;
  name: string;
  target_per_period: number;
  period: string;
  weekdays: number[] | null;
  created_at: string;
  habit_logs: { day: string }[];
};

/**
 * Recalcule les champs dérivés d'une habitude à partir de la liste brute des
 * jours cochés. Fonction pure, partagée entre le rendu serveur (habitFromRow)
 * et les mises à jour optimistes côté client (toggle d'un jour quelconque).
 */
export function deriveHabitFields(
  logDays: string[],
  today: Date,
  period: HabitPeriod,
  target: number,
): Pick<Habit, "streak" | "checkedToday" | "weekDots" | "totalDone" | "logDays"> {
  const todayStr = localDateStr(today);
  const logSet = new Set(logDays);

  // weekDots[0] = 6 days ago, weekDots[6] = today
  const weekDots: boolean[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    weekDots.push(logSet.has(localDateStr(d)));
  }

  return {
    streak: computeStreak(logDays, today, period, target),
    checkedToday: logSet.has(todayStr),
    weekDots,
    totalDone: logDays.length,
    logDays,
  };
}

export function habitFromRow(row: HabitRow, today: Date): Habit {
  const period = row.period as HabitPeriod;
  const logDays = row.habit_logs.map((l) => l.day);

  return {
    id: row.id,
    name: row.name,
    targetPerPeriod: row.target_per_period,
    period,
    weekdays: row.weekdays ?? [],
    createdAt: row.created_at,
    ...deriveHabitFields(logDays, today, period, row.target_per_period),
  };
}
