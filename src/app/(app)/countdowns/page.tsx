import { createClient } from "@/lib/supabase/server";
import { countdownFromRow, type CountdownRow } from "@/lib/countdowns/fromDb";
import { CountdownsView } from "./CountdownsView";

export default async function CountdownsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("countdowns")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("target_date", { ascending: true });

  if (error) {
    return (
      <main className="pk-content">
        <div className="pk-content-inner">
          <div className="pk-empty">
            <div className="pk-empty-title">Erreur de chargement</div>
            <div className="pk-empty-sub">{error.message}</div>
          </div>
        </div>
      </main>
    );
  }

  const countdowns = ((data ?? []) as CountdownRow[]).map(countdownFromRow);

  return <CountdownsView initialCountdowns={countdowns} userId={user?.id ?? ""} />;
}
