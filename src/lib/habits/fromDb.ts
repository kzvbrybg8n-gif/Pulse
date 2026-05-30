import { computeStreak, localDateStr } from "@/lib/habits/streak";
import type { Habit, HabitPeriod } from "@/lib/types";

export type HabitRow = {
  id: string;
  name: string;
  target_per_period: number;
  period: string;
  created_at: string;
  habit_logs: { day: string }[];
};

export function habitFromRow(row: HabitRow, today: Date): Habit {
  const todayStr = localDateStr(today);
  const logSet = new Set(row.habit_logs.map((l) => l.day));

  // weekDots[0] = 6 days ago, weekDots[6] = today
  const weekDots: boolean[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    weekDots.push(logSet.has(localDateStr(d)));
  }

  const period = row.period as HabitPeriod;

  return {
    id: row.id,
    name: row.name,
    targetPerPeriod: row.target_per_period,
    period,
    streak: computeStreak(row.habit_logs.map((l) => l.day), today, period, row.target_per_period),
    checkedToday: logSet.has(todayStr),
    weekDots,
    totalDone: row.habit_logs.length,
    createdAt: row.created_at,
  };
}
