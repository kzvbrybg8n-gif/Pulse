"use client";

import type { MouseEvent } from "react";
import { IconCheck } from "@/components/icons";

type Props = {
  done: boolean;
  onToggle?: () => void;
  size?: number;
  label?: string;
};

export function Checkbox({ done, onToggle, size = 20, label = "Terminer" }: Props) {
  return (
    <button
      type="button"
      className={"pk-check round" + (done ? " done" : "")}
      onClick={(e: MouseEvent) => {
        e.stopPropagation();
        onToggle?.();
      }}
      style={{ width: size, height: size }}
      aria-pressed={done}
      aria-label={label}
    >
      {done && <IconCheck size={size * 0.6} />}
    </button>
  );
}
