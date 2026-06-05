/**
 * Fallback de navigation pour les routes applicatives.
 *
 * Next affiche ce composant *immédiatement* au clic, le temps que le Server
 * Component de la vue cible récupère ses données. Sans lui, le `<Link>`
 * attendait la réponse serveur complète avant de basculer : la transition
 * paraissait gelée. La Sidebar/MobileTabs restent montées (elles vivent dans
 * le layout) ; seul ce contenu central est remplacé.
 */
export default function AppLoading() {
  return (
    <main className="pk-content" aria-busy="true">
      <div className="pk-content-inner">
        <div className="pk-skeleton" role="status" aria-label="Chargement…">
          <div className="pk-skel-line pk-skel-title" />
          <div className="pk-skel-line" />
          <div className="pk-skel-line" />
          <div className="pk-skel-line pk-skel-short" />
        </div>
      </div>
    </main>
  );
}
