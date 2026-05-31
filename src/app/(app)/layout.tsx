import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PushManager } from "@/components/ui/PushManager";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTabs } from "@/components/layout/MobileTabs";

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

  // Chrome persistante : Sidebar + MobileTabs vivent dans le layout, donc
  // restent montés d'une vue à l'autre (le layout ne se re-rend pas lors
  // d'une navigation entre routes sœurs — seul {children} change). Chaque
  // vue ne rend plus que son contenu (<main class="pk-content"> + modales).
  return (
    <>
      <PushManager />
      <div className="pk-app">
        <Sidebar />
        {children}
        <MobileTabs />
      </div>
    </>
  );
}
