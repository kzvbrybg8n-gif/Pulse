import { createClient } from "@/lib/supabase/server";
import { FilterView } from "./FilterView";

export default async function FilterPage({
  params,
}: {
  params: Promise<{ filterId: string }>;
}) {
  const { filterId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <FilterView filterId={filterId} userId={user?.id ?? ""} />;
}
