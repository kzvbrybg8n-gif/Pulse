import { createClient } from "@/lib/supabase/server";
import type { TaskRow } from "@/lib/tasks/fromDb";
import { groupToday } from "@/lib/tasks/groupToday";
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
      dateLabel={dateLabel}
      userId={user?.id ?? ""}
    />
  );
}
