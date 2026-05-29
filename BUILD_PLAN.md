# Pulse — Plan de construction

Avancer **phase par phase**. À la fin de chaque phase : l'app compile, tourne, et est
committée. Proposer un plan court avant chaque phase et attendre validation.

## Phase 0 — Scaffolding + design system partagé

- Initialiser Next.js (App Router, TS strict), Tailwind, ESLint, Prettier, Git
- Centraliser les tokens depuis `styles/colors_and_type.css` en variables CSS globales,
  et les exposer à Tailwind via `theme.extend`
- Monter le kit de composants partagé (`kit.css` + `components.jsx` + `icons.jsx`)
  comme une bibliothèque réutilisable, **dédupliquée** (cf. décision 3 de CLAUDE.md)
- `.env.example` ; aucune clé versionnée

**Fin de phase :** `npm run dev` démarre, la palette/typo s'affiche correctement.

## Phase 1 — Vertical slice « Aujourd'hui » (données en mock)

- Intégrer la vue « Aujourd'hui » de bout en bout, données encore issues de `data.jsx`
- Fusionner `desktop.jsx` + `mobile.jsx` en un composant responsive unique
- Figer ici les conventions de structure de composants (décisions 1 et 2 validées sur un
  cas réel, pas dans l'abstrait)

**Fin de phase :** « Aujourd'hui » s'affiche, responsive, fidèle au design, en mock.

## Phase 2 — Supabase : schéma + RLS

- Créer le schéma SQL (entités de CLAUDE.md), migrations versionnées
- Activer RLS sur **chaque** table avec policy `user_id = auth.uid()`
- Seed de données de test

**Fin de phase :** schéma déployé, RLS testée (un user ne voit que ses données).

## Phase 3 — Auth + branchement données

- Supabase Auth (email/mot de passe ou magic link)
- Route guard, layouts `(auth)` / `(app)`
- Remplacer le mock de « Aujourd'hui » par les vraies requêtes Supabase

**Fin de phase :** connexion fonctionnelle, « Aujourd'hui » lit/écrit en base.

## Phase 4 — Module Tâches complet

- CRUD tâches, sous-tâches (1 niveau), priorité, échéance, tags, notes
- Saisie rapide + parsing langage naturel (cf. exemples de SPEC.md ; logique pure,
  testée unitairement et isolée de l'UI)
- Listes / projets / dossiers
- Récurrence (moteur isolé, testé unitairement)

**Fin de phase :** gestion de tâches complète sur toutes les routes Tâches.

## Phase 5 — Smart lists & filtres

- Vues « 7 prochains jours », « Toutes les tâches »
- Filtres personnalisés (tags + dates + priorité), persistés

**Fin de phase :** vues dérivées et filtres opérationnels (aucune nouvelle table).

## Phase 6 — Habitudes

- Définition, fréquence cible, check-in quotidien, streaks, historique, stats simples

## Phase 7 — Pomodoro

- Minuteur Focus/Pause, bascule auto, durées configurables
- Historique en base, association optionnelle à une tâche

## Phase 8 — Rappels / notifications (le plus risqué, en dernier)

- Rappel par tâche, Web Push desktop
- PWA pour le push iOS (Safari 16.4+) ; isoler ce code, documenter la limite

## Phase 9 — Realtime + déploiement

- Abonnements Supabase Realtime (synchro multi-appareils)
- Déploiement Vercel + variables d'env, vérification RLS en conditions réelles
