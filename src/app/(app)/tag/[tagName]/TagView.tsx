"use client";

import { useEffect, useState } from "react";
import { TaskDetail } from "@/components/ui/TaskDetail";
import { TaskItem } from "@/components/ui/TaskItem";
import { createClient } from "@/lib/supabase/client";
import { taskFromRow, type TaskRow } from "@/lib/tasks/fromDb";
import type { Task } from "@/lib/types";

type Props = {
  tagName: string;
  userId: string;
};

/**
 * Vue dérivée « regrouper par tag » : aucune table dédiée, simple filtrage
 * des tâches non archivées portant le tag. Calquée sur FilterView.
 */
export function TagView({ tagName, userId }: Props) {
  const [supabase] = useState(() => createClient());
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTasks() {
      setLoading(true);
      const { data } = await supabase
        .from("tasks")
        .select(
          "id, title, status, prio, due_at, recur_rule, note, subtasks(*), task_tags(tags(name))",
        )
        .neq("status", "archived")
        .order("prio", { ascending: true })
        .order("due_at", { ascending: true, nullsFirst: false })
        .order("order_index", { ascending: true });

      const now = new Date();
      const rows = (data ?? []) as unknown as TaskRow[];
      setAllTasks(rows.map((r) => taskFromRow(r, now)));
      setLoading(false);
    }
    void fetchTasks();
  }, [supabase]);

  function handleTaskUpdate(id: string, changes: Partial<Task>) {
    setAllTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...changes } : t)));
  }

  function handleTaskDelete(id: string) {
    setAllTasks((ts) => ts.filter((t) => t.id !== id));
  }

  async function toggleTask(id: string) {
    const task = allTasks.find((t) => t.id === id);
    if (!task) return;
    const newDone = !task.done;
    setAllTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: newDone } : t)));
    const { error } = await supabase
      .from("tasks")
      .update({ status: newDone ? "done" : "open" })
      .eq("id", id);
    if (error) {
      setAllTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: task.done } : t)));
    }
  }

  async function toggleSub(taskId: string, subId: string) {
    const task = allTasks.find((t) => t.id === taskId);
    const sub = task?.subtasks.find((s) => s.id === subId);
    if (!sub) return;
    const newDone = !sub.done;
    setAllTasks((ts) =>
      ts.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, done: newDone } : s)),
            }
          : t,
      ),
    );
    const { error } = await supabase.from("subtasks").update({ done: newDone }).eq("id", subId);
    if (error) {
      setAllTasks((ts) =>
        ts.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, done: sub.done } : s)),
              }
            : t,
        ),
      );
    }
  }

  const tagged = allTasks.filter((t) => t.tags.includes(tagName));
  const openCount = tagged.filter((t) => !t.done).length;

  return (
    <>
      <main className="pk-content">
        <div className="pk-content-inner">
          <div className="pk-view-head">
            <div>
              <h1 className="pk-view-title">#{tagName}</h1>
            </div>
            <span className="pk-view-count">
              {openCount} {openCount !== 1 ? "tâches" : "tâche"}
              <br />
              {openCount !== 1 ? "restantes" : "restante"}
            </span>
          </div>

          {loading ? (
            <div className="pk-empty">
              <div className="pk-empty-sub">Chargement…</div>
            </div>
          ) : tagged.length === 0 ? (
            <div className="pk-empty">
              <div className="pk-empty-title">Aucune tâche avec ce tag</div>
              <div className="pk-empty-sub">
                Ajoutez le tag #{tagName} à une tâche depuis son panneau de détail.
              </div>
            </div>
          ) : (
            <div className="pk-section">
              <div className="pk-listcard">
                {tagged.map((t) => (
                  <TaskItem
                    key={t.id}
                    task={t}
                    onToggle={toggleTask}
                    onToggleSub={toggleSub}
                    onEdit={setSelectedTaskId}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {selectedTaskId && (
        <TaskDetail
          taskId={selectedTaskId}
          userId={userId}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={handleTaskUpdate}
          onDelete={handleTaskDelete}
        />
      )}
    </>
  );
}
