import { createClient } from "@/lib/supabase/server";
import type { TaskRow } from "@/lib/tasks/fromDb";
import { taskFromRow } from "@/lib/tasks/fromDb";
import { AllView } from "./AllView";

export default async function AllPage() {
  const supabase = await createClient();
  const now = new Date();

  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, status, prio, due_at, recur_rule, note, subtasks(*), task_tags(tags(name)), reminders(remind_at)")
    .neq("status", "archived")
    .order("prio", { ascending: true })
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("order_index", { ascending: true });

  if (error) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rows = (data ?? []) as unknown as TaskRow[];
  const tasks = rows.map((r) => taskFromRow(r, now));

  return <AllView initialTasks={tasks} userId={user?.id ?? ""} />;
}
