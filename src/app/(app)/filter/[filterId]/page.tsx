import { createClient } from "@/lib/supabase/server";
import { getAuthClaims } from "@/lib/supabase/user";
import { FilterView } from "./FilterView";

export default async function FilterPage({
  params,
}: {
  params: Promise<{ filterId: string }>;
}) {
  const { filterId } = await params;
  const supabase = await createClient();
  const user = await getAuthClaims(supabase);

  return <FilterView filterId={filterId} userId={user?.id ?? ""} />;
}
