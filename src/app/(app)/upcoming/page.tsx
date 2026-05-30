import { createClient } from "@/lib/supabase/server";
import type { TaskRow } from "@/lib/tasks/fromDb";
import { groupByDay } from "@/lib/tasks/groupByDay";
import { UpcomingView } from "./UpcomingView";

export default async function UpcomingPage() {
  const supabase = await createClient();
  const now = new Date();

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 86_400_000);
  const windowEnd = new Date(tomorrowStart.getTime() + 7 * 86_400_000);

  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, status, prio, due_at, recur_rule, note, subtasks(*), task_tags(tags(name))")
    .neq("status", "archived")
    .gte("due_at", tomorrowStart.toISOString())
    .lt("due_at", windowEnd.toISOString())
    .order("due_at", { ascending: true })
    .order("order_index", { ascending: true });

  if (error) {
    return (
      <div className="pk-app">
        <main className="pk-content">
          <div className="pk-content-inner">
            <div className="pk-empty">
              <div className="pk-empty-title">Impossible de charger les tâches</div>
              <div className="pk-empty-sub">{error.message}</div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rows = (data ?? []) as unknown as TaskRow[];
  const groups = groupByDay(rows, now);

  return <UpcomingView initialGroups={groups} userId={user?.id ?? ""} />;
}
