import { createClient } from "@/lib/supabase/server";
import { getAuthClaims } from "@/lib/supabase/user";
import { habitFromRow, type HabitRow } from "@/lib/habits/fromDb";
import { localDateStr } from "@/lib/habits/streak";
import { HabitsView } from "./HabitsView";

export default async function HabitsPage() {
  const supabase = await createClient();
  const now = new Date();

  const windowStartStr = localDateStr(new Date(now.getTime() - 35 * 86_400_000));

  const user = await getAuthClaims(supabase);

  const { data, error } = await supabase
    .from("habits")
    .select("id, name, target_per_period, period, created_at, habit_logs(day)")
    .gte("habit_logs.day", windowStartStr)
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <>
        <main className="pk-content">
          <div className="pk-content-inner">
            <div className="pk-empty">
              <div className="pk-empty-title">Erreur de chargement</div>
              <div className="pk-empty-sub">{error.message}</div>
            </div>
          </div>
        </main>
      </>
    );
  }

  const rows = (data ?? []) as unknown as HabitRow[];
  const habits = rows.map((r) => habitFromRow(r, now));

  return <HabitsView initialHabits={habits} userId={user?.id ?? ""} />;
}
