"use client";

import { useState, type ReactNode } from "react";
import { IconPlus } from "@/components/icons";
import { QuickAdd } from "@/components/ui/QuickAdd";
import { TaskDetail } from "@/components/ui/TaskDetail";
import { TaskItem } from "@/components/ui/TaskItem";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTasks } from "@/hooks/useRealtimeTasks";
import { formatDueLabel } from "@/lib/tasks/fromDb";
import { nextOccurrence, parseRRule } from "@/lib/recurrence";
import type { Task } from "@/lib/types";

/* ============================================================
   Vue « Aujourd'hui » — Composant Client (interactivité)
   Reçoit les données initiales du Composant Serveur. Les bascules
   (cocher tâche / sous-tâche) écrivent en base de façon optimiste :
   on met à jour l'état local immédiatement, puis on persiste ;
   en cas d'erreur, on revient à l'état précédent.

   Header / Section / MobileQuickAddSheet sont internes à cette vue.
   ============================================================ */

function Header({ dateLabel, count }: { dateLabel: string; count: number }) {
  return (
    <div className="pk-view-head">
      <div>
        <div className="pk-eyebrow">{dateLabel}</div>
        <h1 className="pk-view-title">Aujourd&apos;hui</h1>
      </div>
      <span className="pk-view-count">
        {count} {count > 1 ? "tâches" : "tâche"}
        <br />
        restante{count > 1 ? "s" : ""}
      </span>
    </div>
  );
}

function Section({
  label,
  accent,
  children,
}: {
  label?: string;
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="pk-section">
      {label && <div className={"pk-section-lab" + (accent ? " accent" : "")}>{label}</div>}
      <div className="pk-listcard">{children}</div>
    </div>
  );
}

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
  initialOverdue: Task[];
  initialToday: Task[];
  dateLabel: string;
  userId: string;
};

export function TodayView({ initialOverdue, initialToday, dateLabel, userId }: Props) {
  const [supabase] = useState(() => createClient());
  const [overdue, setOverdue] = useState<Task[]>(initialOverdue);
  const [today, setToday] = useState<Task[]>(initialToday);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  function handleTaskAdded(task: Task) {
    const exists = (ts: Task[]) => ts.some((t) => t.id === task.id);
    if (task.late) {
      setOverdue((ts) => (exists(ts) ? ts : [task, ...ts]));
    } else {
      setToday((ts) => (exists(ts) ? ts : [...ts, task]));
    }
  }

  function handleTaskUpdate(id: string, changes: Partial<Task>) {
    const apply = (ts: Task[]) => ts.map((t) => (t.id === id ? { ...t, ...changes } : t));
    setOverdue(apply);
    setToday(apply);
  }

  function handleTaskDelete(id: string) {
    setOverdue((ts) => ts.filter((t) => t.id !== id));
    setToday((ts) => ts.filter((t) => t.id !== id));
  }

  // Synchro Realtime — changements depuis un autre appareil ou onglet
  useRealtimeTasks(supabase, userId, {
    onUpdate: (task) => {
      setOverdue((ts) => ts.map((t) => (t.id === task.id ? task : t)));
      setToday((ts) => ts.map((t) => (t.id === task.id ? task : t)));
    },
    onDelete: handleTaskDelete,
    onInsert: (task) => {
      // L'ajout optimiste local (QuickAdd / récurrence) précède souvent cet
      // événement Realtime sur l'appareil émetteur : on déduplique par id.
      const exists = (ts: Task[]) => ts.some((t) => t.id === task.id);
      const now = new Date();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      if (task.dueAt && new Date(task.dueAt) < now) {
        setOverdue((ts) => (exists(ts) ? ts : [task, ...ts]));
      } else if (task.dueAt && new Date(task.dueAt) < todayEnd) {
        setToday((ts) => (exists(ts) ? ts : [...ts, task]));
      }
    },
  });

  function makeToggleTask(
    list: Task[],
    setList: React.Dispatch<React.SetStateAction<Task[]>>,
  ) {
    return async (id: string) => {
      const task = list.find((t) => t.id === id);
      if (!task) return;
      const newDone = !task.done;

      setList((ts) => ts.map((t) => (t.id === id ? { ...t, done: newDone } : t)));

      const { error } = await supabase
        .from("tasks")
        .update({ status: newDone ? "done" : "open" })
        .eq("id", id);

      if (error) {
        setList((ts) => ts.map((t) => (t.id === id ? { ...t, done: task.done } : t)));
        console.error("Échec de la mise à jour de la tâche", error);
        return;
      }

      // Récurrence : si la tâche est marquée done ET a une règle, créer la prochaine occurrence
      if (newDone && task.recur) {
        try {
          const spec = parseRRule(task.recur);
          const now = new Date();
          // Prochaine occurrence calculée depuis l'échéance réelle de la tâche
          // (préserve l'heure/le jour d'origine) ; faute d'échéance, depuis maintenant.
          // Pour une tâche en retard, on avance jusqu'à dépasser le présent.
          let nextDue = nextOccurrence(spec, task.dueAt ? new Date(task.dueAt) : now);
          let guard = 0;
          while (nextDue <= now && guard < 1000) {
            nextDue = nextOccurrence(spec, nextDue);
            guard++;
          }

          const { data: newTask } = await supabase
            .from("tasks")
            .insert({
              user_id: userId,
              title: task.title,
              status: "open",
              prio: task.prio,
              due_at: nextDue.toISOString(),
              recur_rule: task.recur,
              order_index: 0,
            })
            .select("id")
            .single();

          if (newTask) {
            // Si la prochaine occurrence tombe aujourd'hui, l'ajouter à la liste
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const tomorrowStart = new Date(todayStart.getTime() + 86_400_000);
            if (nextDue >= todayStart && nextDue < tomorrowStart) {
              const nextTask: Task = {
                id: (newTask as { id: string }).id,
                title: task.title,
                done: false,
                prio: task.prio,
                due: formatDueLabel(nextDue.toISOString(), now),
                late: false,
                tags: task.tags,
                recur: task.recur,
                reminder: false,
                remindAt: null,
                note: false,
                subtasks: [],
                expanded: false,
              };
              setToday((ts) => (ts.some((t) => t.id === nextTask.id) ? ts : [...ts, nextTask]));
            }
          }
        } catch {
          // Règle non reconnue — on ignore silencieusement
        }
      }
    };
  }

  async function toggleSub(taskId: string, subId: string) {
    const task = [...overdue, ...today].find((t) => t.id === taskId);
    const sub = task?.subtasks.find((s) => s.id === subId);
    if (!sub) return;
    const newDone = !sub.done;

    const apply = (target: boolean) => (ts: Task[]) =>
      ts.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((s) =>
                s.id === subId ? { ...s, done: target } : s,
              ),
            }
          : t,
      );

    setOverdue(apply(newDone));
    setToday(apply(newDone));

    const { error } = await supabase
      .from("subtasks")
      .update({ done: newDone })
      .eq("id", subId);

    if (error) {
      setOverdue(apply(sub.done));
      setToday(apply(sub.done));
      console.error("Échec de la mise à jour de la sous-tâche", error);
    }
  }

  const remaining =
    overdue.filter((t) => !t.done).length + today.filter((t) => !t.done).length;
  const isEmpty = overdue.length === 0 && today.length === 0;

  return (
    <>
      <main className="pk-content">
        <div className="pk-content-inner">
          <Header dateLabel={dateLabel} count={remaining} />

          <div className="pk-qa-wrap">
            <QuickAdd userId={userId} onAdd={handleTaskAdded} />
          </div>

          {isEmpty ? (
            <div className="pk-empty">
              <div className="pk-empty-title">Rien pour aujourd&apos;hui</div>
              <div className="pk-empty-sub">Profite du calme, ou ajoute une tâche.</div>
            </div>
          ) : (
            <>
              {overdue.length > 0 && (
                <Section label="En retard" accent>
                  {overdue.map((t) => (
                    <TaskItem
                      key={t.id}
                      task={t}
                      onToggle={makeToggleTask(overdue, setOverdue)}
                      onToggleSub={toggleSub}
                      onEdit={setSelectedTaskId}
                    />
                  ))}
                </Section>
              )}

              {today.length > 0 && (
                <Section label={overdue.length > 0 ? "Aujourd'hui" : undefined}>
                  {today.map((t) => (
                    <TaskItem
                      key={t.id}
                      task={t}
                      onToggle={makeToggleTask(today, setToday)}
                      onToggleSub={toggleSub}
                      onEdit={setSelectedTaskId}
                    />
                  ))}
                </Section>
              )}
            </>
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
