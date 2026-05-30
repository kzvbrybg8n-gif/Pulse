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
