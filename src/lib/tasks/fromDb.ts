import type { Priority, Subtask, Task } from "@/lib/types";

/**
 * Forme d'une ligne `tasks` enrichie des jointures attendues par la vue
 * « Aujourd'hui ». Correspond au `.select("*, subtasks(*), task_tags(tags(name)))`.
 * On reste structurel (pas de dépendance directe au type généré) pour que
 * le mapping soit testable et stable même si la requête évolue.
 */
export type TaskRow = {
  id: string;
  title: string;
  status: string;
  prio: number;
  due_at: string | null;
  recur_rule: string | null;
  note: string | null;
  subtasks: {
    id: string;
    title: string;
    done: boolean;
    order_index: number;
  }[];
  task_tags: { tags: { name: string } | null }[];
};

const WEEKDAYS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const MONTHS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Étiquette d'échéance lisible (formateur minimal de Phase 3) :
 *  - aujourd'hui  → "14:00"
 *  - hier         → "hier · 18:00"
 *  - demain       → "demain · 09:00"
 *  - autre date   → "ven. 5 juin · 14:00"
 * Le préfixe « en retard · » est ajouté par TaskMeta selon `late`.
 */
export function formatDueLabel(dueAt: string | null, now: Date): string | null {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const today = startOfDay(now).getTime();
  const dueDay = startOfDay(due).getTime();
  const dayMs = 86_400_000;
  const diffDays = Math.round((dueDay - today) / dayMs);
  const time = hhmm(due);

  if (diffDays === 0) return time;
  if (diffDays === -1) return `hier · ${time}`;
  if (diffDays === 1) return `demain · ${time}`;
  return `${WEEKDAYS[due.getDay()]} ${due.getDate()} ${MONTHS[due.getMonth()]} · ${time}`;
}

function toPriority(prio: number): Priority {
  return prio >= 1 && prio <= 4 ? (prio as Priority) : 4;
}

/** Mappe une ligne DB (avec jointures) vers le type `Task` de l'UI. */
export function taskFromRow(row: TaskRow, now: Date): Task {
  const subtasks: Subtask[] = [...row.subtasks]
    .sort((a, b) => a.order_index - b.order_index)
    .map((s) => ({ id: s.id, title: s.title, done: s.done }));

  const tags = row.task_tags
    .map((tt) => tt.tags?.name)
    .filter((n): n is string => Boolean(n));

  const isDone = row.status === "done";
  const late = Boolean(row.due_at && new Date(row.due_at) < now && !isDone);

  return {
    id: row.id,
    title: row.title,
    done: isDone,
    prio: toPriority(row.prio),
    due: formatDueLabel(row.due_at, now),
    dueAt: row.due_at ?? null,
    late,
    tags,
    recur: row.recur_rule,
    reminder: false, // table reminders câblée en Phase 8
    note: Boolean(row.note && row.note.trim().length > 0),
    noteContent: row.note ?? null,
    subtasks,
    expanded: subtasks.length > 0,
  };
}
