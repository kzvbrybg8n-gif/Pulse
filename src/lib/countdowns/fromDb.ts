import type { Countdown } from "@/lib/types";
import type { Database } from "@/lib/supabase/database.types";

export type CountdownRow = Database["public"]["Tables"]["countdowns"]["Row"];

/** Mappe une ligne Supabase (snake_case) vers le modèle de domaine (camelCase). */
export function countdownFromRow(row: CountdownRow): Countdown {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    targetDate: row.target_date,
    type: row.type,
    reminder: row.reminder,
    recurrence: row.recurrence,
    dayCalcMode: row.day_calc_mode,
    showInSmartList: row.show_in_smart_list,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}
