import { IconBell, IconCornerDownRight, IconNote, IconRepeat } from "@/components/icons";
import type { Task } from "@/lib/types";

type Props = { task: Task };

export function TaskMeta({ task }: Props) {
  return (
    <div className="pk-task-meta">
      {task.due && (
        <span className={"pk-due" + (task.late ? " late" : "")}>
          {task.late ? "en retard · " : ""}
          {task.due}
        </span>
      )}
      {task.recur && (
        <span className="pk-meta-ico" title="Récurrence">
          <IconRepeat size={13} />
        </span>
      )}
      {task.reminder && (
        <span className="pk-meta-ico" title="Rappel">
          <IconBell size={13} />
        </span>
      )}
      {task.note && (
        <span className="pk-meta-ico" title="Note">
          <IconNote size={13} />
        </span>
      )}
      {task.subtasks && task.subtasks.length > 0 && (
        <span className="pk-meta-ico" title="Sous-tâches">
          <IconCornerDownRight size={13} />
          <span className="pk-subcount">
            {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}
          </span>
        </span>
      )}
      {task.tags?.map((t) => (
        <span className="pk-tag" key={t}>
          #{t}
        </span>
      ))}
    </div>
  );
}
