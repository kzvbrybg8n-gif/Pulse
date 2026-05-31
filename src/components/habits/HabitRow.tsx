"use client";

import { IconPencil } from "@/components/icons";
import { Checkbox } from "@/components/ui/Checkbox";
import type { Habit } from "@/lib/types";

const PERIOD_LABELS: Record<string, string> = {
  day: "Quotidien",
  week: "Hebdomadaire",
  month: "Mensuel",
};

type Props = {
  habit: Habit;
  onToggle: (id: string) => void;
  onEdit: (habit: Habit) => void;
};

export function HabitRow({ habit, onToggle, onEdit }: Props) {
  const freqLabel =
    habit.targetPerPeriod > 1
      ? `${habit.targetPerPeriod}× / ${PERIOD_LABELS[habit.period]?.toLowerCase()}`
      : PERIOD_LABELS[habit.period] ?? habit.period;

  return (
    <div className="pk-task" tabIndex={0}>
      {/* Check-in du jour — même grammaire qu'une tâche (coche à gauche) */}
      <Checkbox
        done={habit.checkedToday}
        onToggle={() => onToggle(habit.id)}
        label={habit.checkedToday ? "Décocher pour aujourd'hui" : "Cocher pour aujourd'hui"}
      />

      <div className="pk-task-mid">
        <div className="pk-task-title">{habit.name}</div>
        <div className="pk-task-meta">
          <span className="hb-freq">{freqLabel}</span>
        </div>
      </div>

      <div className="pk-task-right">
        <div className="pk-task-actions">
          <button
            type="button"
            className="pk-icon-btn sm"
            aria-label="Modifier"
            onClick={() => onEdit(habit)}
          >
            <IconPencil size={16} />
          </button>
        </div>
        <span
          className={"hb-streak" + (habit.streak > 0 ? " active" : "")}
          aria-label={habit.streak > 0 ? `Série de ${habit.streak} jours` : "Aucune série"}
        >
          {habit.streak > 0 ? `${habit.streak} j` : "—"}
        </span>
      </div>
    </div>
  );
}
