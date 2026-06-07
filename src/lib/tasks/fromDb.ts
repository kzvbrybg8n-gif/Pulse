import type { Priority, Subtask, Task } from "@/lib/types";
import { MOMENT_LABEL, momentFromIso } from "@/lib/tasks/moment";

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
  reminders?: { remind_at: string }[];
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

/**
 * Étiquette d'échéance lisible. L'heure précise est remplacée par le moment
 * de la journée (Matin / Midi / Soir) ; une date seule n'affiche pas de moment.
 *  - aujourd'hui  → "Matin" (ou "aujourd'hui" si date seule)
 *  - hier         → "hier · Soir"
 *  - demain       → "demain · Matin"
 *  - autre date   → "ven. 5 juin · Matin"
 * Le préfixe « en retard · » est ajouté par TaskMeta selon `late`.
 */
export function formatDueLabel(dueAt: string | null, now: Date): string | null {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const today = startOfDay(now).getTime();
  const dueDay = startOfDay(due).getTime();
  const dayMs = 86_400_000;
  const diffDays = Math.round((dueDay - today) / dayMs);

  const moment = momentFromIso(dueAt);
  const momentLabel = moment ? MOMENT_LABEL[moment] : null;
  const withMoment = (base: string) => (momentLabel ? `${base} · ${momentLabel}` : base);

  if (diffDays === 0) return momentLabel ?? "aujourd'hui";
  if (diffDays === -1) return withMoment("hier");
  if (diffDays === 1) return withMoment("demain");
  return withMoment(`${WEEKDAYS[due.getDay()]} ${due.getDate()} ${MONTHS[due.getMonth()]}`);
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
  // Avec les moments (heure non significative), le « retard » se juge au jour :
  // une tâche n'est en retard que si son jour d'échéance est antérieur à
  // aujourd'hui. Évite qu'une tâche du matin paraisse en retard l'après-midi.
  const late = Boolean(
    row.due_at &&
      startOfDay(new Date(row.due_at)).getTime() < startOfDay(now).getTime() &&
      !isDone,
  );

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
    reminder: (row.reminders?.length ?? 0) > 0,
    remindAt: row.reminders?.[0]?.remind_at ?? null,
    note: Boolean(row.note && row.note.trim().length > 0),
    noteContent: row.note ?? null,
    subtasks,
    expanded: subtasks.length > 0,
  };
}
