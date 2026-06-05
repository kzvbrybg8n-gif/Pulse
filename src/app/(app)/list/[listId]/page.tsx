import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthClaims } from "@/lib/supabase/user";
import type { TaskRow } from "@/lib/tasks/fromDb";
import { taskFromRow } from "@/lib/tasks/fromDb";
import { ListView } from "./ListView";

export default async function ListPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;
  const supabase = await createClient();
  const now = new Date();

  // Métadonnées de la liste
  const { data: list } = await supabase
    .from("lists")
    .select("id, name, folders(name)")
    .eq("id", listId)
    .single();

  if (!list) notFound();

  const listRow = list as { id: string; name: string; folders: { name: string } | null };

  // Tâches de cette liste (sauf archivées)
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, status, prio, due_at, recur_rule, note, subtasks(*), task_tags(tags(name)), reminders(remind_at)")
    .eq("list_id", listId)
    .neq("status", "archived")
    .order("prio", { ascending: true })
    .order("due_at", { ascending: true })
    .order("order_index", { ascending: true });

  if (error) {
    return (
      <>
        <main className="pk-content">
          <div className="pk-content-inner">
            <div className="pk-empty">
              <div className="pk-empty-title">Impossible de charger la liste</div>
              <div className="pk-empty-sub">{error.message}</div>
            </div>
          </div>
        </main>
      </>
    );
  }

  const user = await getAuthClaims(supabase);

  const rows = (data ?? []) as unknown as TaskRow[];
  const tasks = rows.map((r) => taskFromRow(r, now));

  return (
    <ListView
      listId={listId}
      listName={listRow.name}
      folderName={listRow.folders?.name ?? null}
      initialTasks={tasks}
      userId={user?.id ?? ""}
    />
  );
}
