import type { Habit } from "@/lib/types";

/** Jours de la semaine, 0 = lundi … 6 = dimanche. */
export const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
export const WEEKDAY_INITIALS = ["L", "M", "M", "J", "V", "S", "D"];

/** Index du jour (0 = lundi … 6 = dimanche) pour une date donnée. */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/**
 * Une habitude est-elle « à réaliser » le jour donné ?
 * - quotidienne : tous les jours
 * - hebdomadaire avec jours précis : seulement ces jours-là
 * - hebdomadaire sans jour précis (x fois/semaine) : tous les jours (au choix)
 * - mensuelle : tous les jours (au choix)
 */
export function isHabitDueOn(habit: Habit, date: Date): boolean {
  if (habit.period === "week" && habit.weekdays.length > 0) {
    return habit.weekdays.includes(weekdayIndex(date));
  }
  return true;
}
