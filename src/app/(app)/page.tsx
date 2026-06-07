import { createClient } from "@/lib/supabase/server";
import { getAuthClaims } from "@/lib/supabase/user";
import type { TaskRow } from "@/lib/tasks/fromDb";
import { groupToday } from "@/lib/tasks/groupToday";
import { habitFromRow, type HabitRow } from "@/lib/habits/fromDb";
import { isHabitDueOn } from "@/lib/habits/schedule";
import { localDateStr } from "@/lib/habits/streak";
import { TodayView } from "./TodayView";

/**
 * Vue « Aujourd'hui » — Composant Serveur.
 * Récupère les tâches de l'utilisateur (RLS garantit le périmètre), les
 * groupe (en retard / aujourd'hui) et passe les données initiales au
 * composant client interactif.
 */
export default async function TodayPage() {
  const supabase = await createClient();
  const now = new Date();

  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, status, prio, due_at, recur_rule, note, subtasks(*), task_tags(tags(name)), reminders(remind_at)")
    .neq("status", "archived")
    .order("due_at", { ascending: true })
    .order("order_index", { ascending: true });

  if (error) {
    // État d'erreur explicite (convention CLAUDE.md).
    return (
      <>
        <main className="pk-content">
          <div className="pk-content-inner">
            <div className="pk-empty">
              <div className="pk-empty-title">Impossible de charger les tâches</div>
              <div className="pk-empty-sub">{error.message}</div>
            </div>
          </div>
        </main>
      </>
    );
  }

  const rows = (data ?? []) as unknown as TaskRow[];
  const { overdue, today } = groupToday(rows, now);

  // Habitudes à réaliser aujourd'hui — fenêtre de 35 j pour calculer les séries.
  const habitWindowStart = localDateStr(new Date(now.getTime() - 35 * 86_400_000));
  const { data: habitData } = await supabase
    .from("habits")
    .select("id, name, target_per_period, period, weekdays, created_at, habit_logs(day)")
    .gte("habit_logs.day", habitWindowStart)
    .order("created_at", { ascending: true });

  const habitRows = (habitData ?? []) as unknown as HabitRow[];
  const todayHabits = habitRows
    .map((r) => habitFromRow(r, now))
    .filter((h) => isHabitDueOn(h, now));

  const user = await getAuthClaims(supabase);

  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  return (
    <TodayView
      initialOverdue={overdue}
      initialToday={today}
      initialHabits={todayHabits}
      dateLabel={dateLabel}
      userId={user?.id ?? ""}
    />
  );
}
