import { taskFromRow, type TaskRow } from "@/lib/tasks/fromDb";
import type { Task } from "@/lib/types";

export type DayGroup = {
  dayLabel: string;
  dateStr: string; // "YYYY-MM-DD" en heure locale
  tasks: Task[];
};

const WEEKDAYS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const MONTHS = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function localDateStr(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export function dayLabelFor(due: Date, now: Date): string {
  const todayMs = startOfDay(now).getTime();
  const diffDays = Math.round((startOfDay(due).getTime() - todayMs) / 86_400_000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Demain";
  return `${WEEKDAYS[due.getDay()]} ${due.getDate()} ${MONTHS[due.getMonth()]}`;
}

/**
 * Groupe les tâches ayant une échéance dans [demain, demain + 7 jours).
 * Les tâches sans due_at sont exclues (elles relèvent de « Aujourd'hui »).
 * Résultat trié chronologiquement, jours vides omis.
 */
export function groupByDay(rows: TaskRow[], now: Date): DayGroup[] {
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart.getTime() + 86_400_000);
  const windowEnd = new Date(tomorrowStart.getTime() + 7 * 86_400_000);

  const buckets = new Map<string, { dateStr: string; label: string; tasks: Task[] }>();

  for (const row of rows) {
    if (!row.due_at) continue;
    const due = new Date(row.due_at);
    const dueStart = startOfDay(due);

    if (dueStart < tomorrowStart || dueStart >= windowEnd) continue;

    const ds = localDateStr(dueStart);
    if (!buckets.has(ds)) {
      buckets.set(ds, { dateStr: ds, label: dayLabelFor(due, now), tasks: [] });
    }
    buckets.get(ds)!.tasks.push(taskFromRow(row, now));
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, { dateStr, label, tasks }]) => ({ dayLabel: label, dateStr, tasks }));
}
