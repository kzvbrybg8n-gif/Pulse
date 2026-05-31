"use client";

import { IconPencil } from "@/components/icons";
import { Checkbox } from "@/components/ui/Checkbox";
import { PriorityFlag } from "@/components/ui/PriorityFlag";
import { TaskMeta } from "@/components/ui/TaskMeta";
import type { Task } from "@/lib/types";

type Props = {
  task: Task;
  onToggle?: (id: string) => void;
  onToggleSub?: (taskId: string, subId: string) => void;
  onEdit?: (id: string) => void;
  hoverDemo?: boolean;
};

export function TaskItem({ task, onToggle, onToggleSub, onEdit, hoverDemo }: Props) {
  return (
    <div className="pk-task-block">
      <div className={"pk-task" + (hoverDemo ? " hover-demo" : "")}>
        <Checkbox done={task.done} onToggle={() => onToggle?.(task.id)} />
        <div
          className="pk-task-mid"
          role="button"
          tabIndex={0}
          aria-label={`Modifier « ${task.title} »`}
          onClick={() => onEdit?.(task.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onEdit?.(task.id);
            }
          }}
        >
          <div className={"pk-task-title" + (task.done ? " done" : "")}>{task.title}</div>
          <TaskMeta task={task} />
        </div>
        <div className="pk-task-right">
          <div className="pk-task-actions">
            <button
              type="button"
              className="pk-icon-btn sm"
              aria-label="Modifier"
              onClick={() => onEdit?.(task.id)}
            >
              <IconPencil size={16} />
            </button>
          </div>
          {task.prio < 4 && (
            <span className="pk-task-flag">
              <PriorityFlag prio={task.prio} />
            </span>
          )}
        </div>
      </div>

      {task.expanded && task.subtasks && task.subtasks.length > 0 && (
        <div className="pk-subrows">
          {task.subtasks.map((s) => (
            <div className="pk-subrow" key={s.id}>
              <Checkbox done={s.done} size={17} onToggle={() => onToggleSub?.(task.id, s.id)} />
              <span className={"pk-subrow-title" + (s.done ? " done" : "")}>{s.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
