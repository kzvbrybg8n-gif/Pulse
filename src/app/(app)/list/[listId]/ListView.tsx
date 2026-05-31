"use client";

import { useState } from "react";
import { IconPlus } from "@/components/icons";
import { QuickAdd } from "@/components/ui/QuickAdd";
import { TaskDetail } from "@/components/ui/TaskDetail";
import { TaskItem } from "@/components/ui/TaskItem";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/lib/types";

/* ── Sous-composants ─────────────────────────────────────── */

function MobileQuickAddSheet({
  open,
  onClose,
  userId,
  listId,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  listId: string;
  onAdd?: (task: Task) => void;
}) {
  if (!open) return null;
  return (
    <div className="pm-sheet-back" onClick={onClose} role="presentation">
      <div className="pm-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="pm-sheet-grip" />
        <QuickAdd
          userId={userId}
          listId={listId}
          onAdd={(task) => {
            onAdd?.(task);
            onClose();
          }}
        />
      </div>
    </div>
  );
}

/* ── Composant principal ─────────────────────────────────── */

type Props = {
  listId: string;
  listName: string;
  folderName: string | null;
  initialTasks: Task[];
  userId: string;
};

export function ListView({ listId, listName, folderName, initialTasks, userId }: Props) {
  const [supabase] = useState(() => createClient());
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  function handleTaskAdded(task: Task) {
    setTasks((ts) => [...ts, task]);
  }

  function handleTaskUpdate(id: string, changes: Partial<Task>) {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...changes } : t)));
  }

  function handleTaskDelete(id: string) {
    setTasks((ts) => ts.filter((t) => t.id !== id));
  }

  async function toggleTask(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newDone = !task.done;

    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: newDone } : t)));

    const { error } = await supabase
      .from("tasks")
      .update({ status: newDone ? "done" : "open" })
      .eq("id", id);

    if (error) {
      setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: task.done } : t)));
      console.error("Échec de la mise à jour de la tâche", error);
    }
  }

  async function toggleSub(taskId: string, subId: string) {
    const task = tasks.find((t) => t.id === taskId);
    const sub = task?.subtasks.find((s) => s.id === subId);
    if (!sub) return;
    const newDone = !sub.done;

    setTasks((ts) =>
      ts.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, done: newDone } : s)) }
          : t,
      ),
    );

    const { error } = await supabase.from("subtasks").update({ done: newDone }).eq("id", subId);

    if (error) {
      setTasks((ts) =>
        ts.map((t) =>
          t.id === taskId
            ? { ...t, subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, done: sub.done } : s)) }
            : t,
        ),
      );
    }
  }

  const openCount = tasks.filter((t) => !t.done).length;

  return (
    <>
      <main className="pk-content">
        <div className="pk-content-inner">
          {/* En-tête */}
          <div className="pk-view-head">
            <div>
              {folderName && <div className="pk-eyebrow">{folderName}</div>}
              <h1 className="pk-view-title">{listName}</h1>
            </div>
            <span className="pk-view-count">
              {openCount} {openCount !== 1 ? "tâches" : "tâche"}
              <br />
              {openCount !== 1 ? "restantes" : "restante"}
            </span>
          </div>

          {/* Saisie rapide */}
          <div className="pk-qa-wrap">
            <QuickAdd userId={userId} listId={listId} onAdd={handleTaskAdded} />
          </div>

          {tasks.length === 0 ? (
            <div className="pk-empty">
              <div className="pk-empty-title">Cette liste est vide</div>
              <div className="pk-empty-sub">Ajoute une tâche pour commencer.</div>
            </div>
          ) : (
            <div className="pk-section">
              <div className="pk-listcard">
                {tasks.map((t) => (
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

      <button
        type="button"
        className="pm-fab"
        onClick={() => setSheetOpen(true)}
        aria-label="Ajouter une tâche"
      >
        <IconPlus size={26} />
      </button>

      <MobileQuickAddSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        userId={userId}
        listId={listId}
        onAdd={handleTaskAdded}
      />

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
