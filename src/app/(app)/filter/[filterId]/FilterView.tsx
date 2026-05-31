"use client";

import { useEffect, useState } from "react";
import { FilterPanel } from "@/components/ui/FilterPanel";
import { TaskDetail } from "@/components/ui/TaskDetail";
import { TaskItem } from "@/components/ui/TaskItem";
import { createClient } from "@/lib/supabase/client";
import { loadFilters, type FilterSpec } from "@/lib/filters";
import { taskFromRow, type TaskRow } from "@/lib/tasks/fromDb";
import type { Task } from "@/lib/types";

function applyFilter(tasks: Task[], spec: FilterSpec): Task[] {
  return tasks.filter((task) => {
    if (spec.priorities?.length && !spec.priorities.includes(task.prio)) return false;
    if (spec.tags?.length && !spec.tags.some((t) => task.tags.includes(t))) return false;

    const dueAt = task.dueAt ?? null;
    if (dueAt === null) {
      const hasDateFilter = !!(spec.dueAfter || spec.dueBefore);
      if (hasDateFilter && !spec.showNoDue) return false;
    } else {
      const d = dueAt.slice(0, 10);
      if (spec.dueAfter && d < spec.dueAfter) return false;
      if (spec.dueBefore && d > spec.dueBefore) return false;
    }

    return true;
  });
}

type Props = {
  filterId: string;
  userId: string;
};

export function FilterView({ filterId, userId }: Props) {
  const [supabase] = useState(() => createClient());
  const [spec, setSpec] = useState<FilterSpec | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingFilter, setEditingFilter] = useState(false);

  useEffect(() => {
    const found = loadFilters().find((f) => f.id === filterId) ?? null;
    setSpec(found);
  }, [filterId]);

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

  if (!loading && !spec) {
    return (
      <main className="pk-content">
        <div className="pk-content-inner">
          <div className="pk-empty">
            <div className="pk-empty-title">Filtre introuvable</div>
            <div className="pk-empty-sub">Ce filtre n&apos;existe pas ou a été supprimé.</div>
          </div>
        </div>
      </main>
    );
  }

  const filteredTasks = spec ? applyFilter(allTasks, spec) : [];
  const openCount = filteredTasks.filter((t) => !t.done).length;

  return (
    <>
      <main className="pk-content">
        <div className="pk-content-inner">
          <div className="pk-view-head">
            <div>
              <h1 className="pk-view-title">{spec?.name ?? "…"}</h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="pk-view-count">
                {openCount} {openCount !== 1 ? "tâches" : "tâche"}
                <br />
                {openCount !== 1 ? "restantes" : "restante"}
              </span>
              {spec && (
                <button
                  type="button"
                  className="pk-qa-go"
                  onClick={() => setEditingFilter(true)}
                >
                  Modifier
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="pk-empty">
              <div className="pk-empty-sub">Chargement…</div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="pk-empty">
              <div className="pk-empty-title">Aucune tâche correspondante</div>
              <div className="pk-empty-sub">Modifie les critères du filtre.</div>
            </div>
          ) : (
            <div className="pk-section">
              <div className="pk-listcard">
                {filteredTasks.map((t) => (
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

      {editingFilter && spec && (
        <FilterPanel
          initialSpec={spec}
          onSave={(updated) => {
            setSpec(updated);
            setEditingFilter(false);
          }}
          onDelete={() => {
            setEditingFilter(false);
          }}
          onClose={() => setEditingFilter(false)}
        />
      )}
    </>
  );
}
