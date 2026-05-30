import type { Priority } from "@/lib/types";

export type FilterSpec = {
  id: string;
  name: string;
  tags?: string[];
  priorities?: Priority[];
  dueBefore?: string; // "YYYY-MM-DD"
  dueAfter?: string;  // "YYYY-MM-DD"
  showNoDue?: boolean;
};

const STORAGE_KEY = "pulse_filters";

export function loadFilters(): FilterSpec[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as FilterSpec[];
  } catch {
    return [];
  }
}

function saveFilters(filters: FilterSpec[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
}

export function upsertFilter(spec: FilterSpec): void {
  const filters = loadFilters();
  const idx = filters.findIndex((f) => f.id === spec.id);
  if (idx >= 0) {
    filters[idx] = spec;
  } else {
    filters.push(spec);
  }
  saveFilters(filters);
}

export function deleteFilter(id: string): void {
  saveFilters(loadFilters().filter((f) => f.id !== id));
}
