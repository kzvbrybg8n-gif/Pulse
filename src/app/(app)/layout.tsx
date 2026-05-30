import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PushManager } from "@/components/ui/PushManager";

/**
 * Layout des routes applicatives protégées.
 * Double garde (le middleware redirige déjà) : vérifie la session côté
 * serveur via getUser() — défense en profondeur. Aucune route sous ce
 * groupe ne se rend sans utilisateur authentifié.
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <PushManager />
      {children}
    </>
  );
}
