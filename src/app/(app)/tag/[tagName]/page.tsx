import { createClient } from "@/lib/supabase/server";
import { getAuthClaims } from "@/lib/supabase/user";
import { TagView } from "./TagView";

export default async function TagPage({
  params,
}: {
  params: Promise<{ tagName: string }>;
}) {
  const { tagName } = await params;
  const supabase = await createClient();
  const user = await getAuthClaims(supabase);

  return <TagView tagName={decodeURIComponent(tagName)} userId={user?.id ?? ""} />;
}
