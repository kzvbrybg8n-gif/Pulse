import type { HabitPeriod } from "@/lib/types";

export function localDateStr(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function shiftDays(dateStr: string, delta: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + delta);
  return localDateStr(d);
}

function mondayOf(d: Date): string {
  const copy = new Date(d);
  const dow = (copy.getDay() + 6) % 7; // 0=Mon
  copy.setDate(copy.getDate() - dow);
  return localDateStr(copy);
}

function firstOfMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function prevWeekMonday(weekMonday: string): string {
  return shiftDays(weekMonday, -7);
}

function prevMonthFirst(monthFirst: string): string {
  const d = new Date(monthFirst + "T12:00:00");
  return firstOfMonth(new Date(d.getFullYear(), d.getMonth() - 1, 1));
}

export function computeStreak(
  logDays: string[],
  today: Date,
  period: HabitPeriod,
  target: number,
): number {
  if (logDays.length === 0) return 0;

  if (period === "day") {
    const set = new Set(logDays);
    const todayStr = localDateStr(today);
    // Start from today; if not checked yet start from yesterday (streak still active)
    let cursor = set.has(todayStr) ? todayStr : shiftDays(todayStr, -1);
    let count = 0;
    while (set.has(cursor)) {
      count++;
      cursor = shiftDays(cursor, -1);
    }
    return count;
  }

  if (period === "week") {
    const weekCounts = new Map<string, number>();
    for (const d of logDays) {
      const wk = mondayOf(new Date(d + "T12:00:00"));
      weekCounts.set(wk, (weekCounts.get(wk) ?? 0) + 1);
    }
    const thisWeek = mondayOf(today);
    let cursor = (weekCounts.get(thisWeek) ?? 0) >= target ? thisWeek : prevWeekMonday(thisWeek);
    let count = 0;
    while ((weekCounts.get(cursor) ?? 0) >= target) {
      count++;
      cursor = prevWeekMonday(cursor);
    }
    return count;
  }

  if (period === "month") {
    const monthCounts = new Map<string, number>();
    for (const d of logDays) {
      const mk = firstOfMonth(new Date(d + "T12:00:00"));
      monthCounts.set(mk, (monthCounts.get(mk) ?? 0) + 1);
    }
    const thisMonth = firstOfMonth(today);
    let cursor = (monthCounts.get(thisMonth) ?? 0) >= target ? thisMonth : prevMonthFirst(thisMonth);
    let count = 0;
    while ((monthCounts.get(cursor) ?? 0) >= target) {
      count++;
      cursor = prevMonthFirst(cursor);
    }
    return count;
  }

  return 0;
}
