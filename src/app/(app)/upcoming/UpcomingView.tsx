"use client";

import { useState } from "react";
import { IconPlus } from "@/components/icons";
import { MobileTabs } from "@/components/layout/MobileTabs";
import { Sidebar } from "@/components/layout/Sidebar";
import { QuickAdd } from "@/components/ui/QuickAdd";
import { TaskDetail } from "@/components/ui/TaskDetail";
import { TaskItem } from "@/components/ui/TaskItem";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTasks } from "@/hooks/useRealtimeTasks";
import { dayLabelFor, localDateStr, type DayGroup } from "@/lib/tasks/groupByDay";
import type { Task } from "@/lib/types";

function MobileQuickAddSheet({
  open,
  onClose,
  userId,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  onAdd?: (task: Task) => void;
}) {
  if (!open) return null;
  return (
    <div className="pm-sheet-back" onClick={onClose} role="presentation">
      <div className="pm-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="pm-sheet-grip" />
        <QuickAdd
          userId={userId}
          onAdd={(task) => {
            onAdd?.(task);
            onClose();
          }}
        />
      </div>
    </div>
  );
}

type Props = {
  initialGroups: DayGroup[];
  userId: string;
};

export function UpcomingView({ initialGroups, userId }: Props) {
  const [supabase] = useState(() => createClient());
  const [groups, setGroups] = useState<DayGroup[]>(initialGroups);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  function updateTask(id: string, changes: Partial<Task>) {
    setGroups((gs) =>
      gs.map((g) => ({
        ...g,
        tasks: g.tasks.map((t) => (t.id === id ? { ...t, ...changes } : t)),
      })),
    );
  }

  function handleTaskUpdate(id: string, changes: Partial<Task>) {
    updateTask(id, changes);
  }

  function handleTaskDelete(id: string) {
    setGroups((gs) =>
      gs
        .map((g) => ({ ...g, tasks: g.tasks.filter((t) => t.id !== id) }))
        .filter((g) => g.tasks.length > 0),
    );
  }

  // Synchro Realtime — changements depuis un autre appareil ou onglet
  useRealtimeTasks(supabase, userId, {
    onUpdate: (task) =>
      setGroups((gs) =>
        gs.map((g) => ({
          ...g,
          tasks: g.tasks.map((t) => (t.id === task.id ? task : t)),
        })),
      ),
    onDelete: handleTaskDelete,
    onInsert: (task) => {
      // Ajouter dans le bon groupe si la tâche tombe dans la fenêtre upcoming
      if (!task.dueAt) return;
      const taskDateStr = localDateStr(new Date(task.dueAt));
      const now = new Date();
      setGroups((gs) => {
        const existing = gs.find((g) => g.dateStr === taskDateStr);
        if (existing) {
          return gs.map((g) =>
            g.dateStr === taskDateStr ? { ...g, tasks: [...g.tasks, task] } : g,
          );
        }
        const newGroup: import("@/lib/tasks/groupByDay").DayGroup = { dateStr: taskDateStr, dayLabel: dayLabelFor(new Date(task.dueAt!), now), tasks: [task] };
        return [...gs, newGroup].sort((a, b) => a.dateStr.localeCompare(b.dateStr));
      });
    },
  });

  function handleTaskAdded(task: Task) {
    if (!task.dueAt) return;
    const taskDateStr = localDateStr(new Date(task.dueAt));
    const now = new Date();
    setGroups((gs) => {
      const existing = gs.find((g) => g.dateStr === taskDateStr);
      if (existing) {
        return gs.map((g) =>
          g.dateStr === taskDateStr ? { ...g, tasks: [...g.tasks, task] } : g,
        );
      }
      const label = dayLabelFor(new Date(task.dueAt!), now);
      const newGroup: DayGroup = { dayLabel: label, dateStr: taskDateStr, tasks: [task] };
      return [...gs, newGroup].sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    });
  }

  async function toggleTask(id: string) {
    const task = groups.flatMap((g) => g.tasks).find((t) => t.id === id);
    if (!task) return;
    const newDone = !task.done;
    updateTask(id, { done: newDone });
    const { error } = await supabase
      .from("tasks")
      .update({ status: newDone ? "done" : "open" })
      .eq("id", id);
    if (error) {
      updateTask(id, { done: task.done });
      console.error("Échec de la mise à jour", error);
    }
  }

  async function toggleSub(taskId: string, subId: string) {
    const task = groups.flatMap((g) => g.tasks).find((t) => t.id === taskId);
    const sub = task?.subtasks.find((s) => s.id === subId);
    if (!sub) return;
    const newDone = !sub.done;

    const applySubToggle = (target: boolean) => (gs: DayGroup[]) =>
      gs.map((g) => ({
        ...g,
        tasks: g.tasks.map((t) =>
          t.id === taskId
            ? { ...t, subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, done: target } : s)) }
            : t,
        ),
      }));

    setGroups(applySubToggle(newDone));
    const { error } = await supabase.from("subtasks").update({ done: newDone }).eq("id", subId);
    if (error) setGroups(applySubToggle(sub.done));
  }

  const totalOpen = groups.reduce((sum, g) => sum + g.tasks.filter((t) => !t.done).length, 0);

  return (
    <div className="pk-app">
      <Sidebar />

      <main className="pk-content">
        <div className="pk-content-inner">
          <div className="pk-view-head">
            <div>
              <h1 className="pk-view-title">7 prochains jours</h1>
            </div>
            <span className="pk-view-count">
              {totalOpen} {totalOpen !== 1 ? "tâches" : "tâche"}
              <br />
              {totalOpen !== 1 ? "restantes" : "restante"}
            </span>
          </div>

          <div className="pk-qa-wrap">
            <QuickAdd userId={userId} onAdd={handleTaskAdded} />
          </div>

          {groups.length === 0 ? (
            <div className="pk-empty">
              <div className="pk-empty-title">Rien dans les 7 prochains jours</div>
              <div className="pk-empty-sub">
                Planifie des tâches avec une date d&apos;échéance.
              </div>
            </div>
          ) : (
            groups.map((g) => (
              <div className="pk-section" key={g.dateStr}>
                <div className="pk-section-lab">{g.dayLabel}</div>
                <div className="pk-listcard">
                  {g.tasks.map((t) => (
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
            ))
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

      <MobileTabs />

      <MobileQuickAddSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        userId={userId}
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
    </div>
  );
}
