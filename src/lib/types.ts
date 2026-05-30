import type { ComponentType } from "react";
import type { IconProps } from "@/components/icons";

export type Priority = 1 | 2 | 3 | 4;

export type Subtask = {
  id: string;
  title: string;
  done: boolean;
};

export type Task = {
  id: string;
  title: string;
  done: boolean;
  prio: Priority;
  due: string | null;
  late: boolean;
  dueAt?: string | null;
  tags: string[];
  recur: string | null;
  reminder: boolean;
  note: boolean;
  noteContent?: string | null;
  subtasks: Subtask[];
  expanded?: boolean;
};

export type PrioConfig = Record<
  Priority,
  { label: string; varName: string; filled: boolean; sw: number }
>;

export type SmartList = {
  id: string;
  label: string;
  Icon: ComponentType<IconProps>;
  count: number;
  active?: boolean;
};

export type Folder = {
  name: string;
  open: boolean;
  lists: { name: string; count: number }[];
};

export type FootNavItem = {
  id: string;
  label: string;
  Icon: ComponentType<IconProps>;
};

export type HabitPeriod = "day" | "week" | "month";

export type Habit = {
  id: string;
  name: string;
  targetPerPeriod: number;
  period: HabitPeriod;
  streak: number;
  checkedToday: boolean;
  weekDots: boolean[]; // index 0 = 6 days ago, index 6 = today
  totalDone: number;
  createdAt: string;
};
