import { taskFromRow, type TaskRow } from "@/lib/tasks/fromDb";
import type { Task } from "@/lib/types";

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Groupe les tâches pour la vue « Aujourd'hui ».
 *
 *  - **overdue** : échéance passée (avant aujourd'hui) ET encore ouverte.
 *  - **today**   : sans échéance, OU échéance tombant aujourd'hui (toute
 *                  statut — une tâche faite aujourd'hui reste visible).
 *
 * Les tâches futures (demain et au-delà) et les tâches faites/passées
 * sont volontairement exclues : elles relèveront des smart lists « 7
 * prochains jours » / « Toutes » (Phase 5). Le groupage opère sur les
 * lignes brutes car il a besoin du `due_at` réel, puis mappe vers `Task`.
 */
export function groupToday(
  rows: TaskRow[],
  now: Date,
): { overdue: Task[]; today: Task[] } {
  const todayStart = startOfDay(now).getTime();
  const tomorrowStart = todayStart + 86_400_000;

  const overdue: Task[] = [];
  const today: Task[] = [];

  for (const row of rows) {
    const dueMs = row.due_at ? new Date(row.due_at).getTime() : null;

    if (dueMs !== null && dueMs < todayStart && row.status === "open") {
      overdue.push(taskFromRow(row, now));
    } else if (dueMs === null || (dueMs >= todayStart && dueMs < tomorrowStart)) {
      today.push(taskFromRow(row, now));
    }
  }

  return { overdue, today };
}
