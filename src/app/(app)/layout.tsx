import { PushManager } from "@/components/ui/PushManager";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTabs } from "@/components/layout/MobileTabs";

/**
 * Layout des routes applicatives protégées.
 *
 * La garde d'authentification est assurée par le middleware (updateSession),
 * qui appelle `getUser()` — revalidation distante du JWT — sur chaque requête
 * et redirige vers /login si nécessaire. On ne la duplique donc PAS ici :
 * un second `getUser()` ajoutait un aller-retour réseau bloquant à chaque
 * navigation, sans bénéfice de sécurité (le middleware s'exécute avant ce
 * rendu).
 */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
