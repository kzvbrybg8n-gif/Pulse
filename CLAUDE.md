# Pulse — Constitution du projet

Ce fichier est lu automatiquement par Claude Code à chaque session.
Les règles ici l'emportent sur toute instruction ponctuelle donnée en conversation.

Spécification fonctionnelle complète : @SPEC.md
Plan de construction par phases : @BUILD_PLAN.md

## Produit

Pulse : application web de productivité personnelle, **mono-utilisateur**, multi-appareils.
Trois modules dans une interface unique et épurée : Tâches, Habitudes, Pomodoro.
Pas collaboratif. Esthétique calme et éditoriale (papier/encre, accent vert).

## Stack (non négociable)

- Next.js (App Router) + TypeScript en mode `strict`
- Tailwind CSS pour les composants neufs (voir « Décisions » ci-dessous)
- Supabase : PostgreSQL, Auth, Realtime, Row-Level Security
- Hébergement cible : Vercel (front) + Supabase (back managé)

## Décisions d'architecture déjà tranchées — NE PAS rediscuter

1. **Style = hybride.** Les exports Claude Design fournissent du CSS classique.
   `styles/colors_and_type.css` est la **source de vérité** des tokens (variables CSS).
   Exposer ces variables à Tailwind via `theme.extend`. Réutiliser le CSS existant
   qui fonctionne ; n'écrire en Tailwind que les composants neufs.
   **Ne PAS réécrire l'existant en classes Tailwind.**
2. **Responsive unifié.** Les exports séparent `desktop.jsx` et `mobile.jsx`.
   Les fusionner en un seul arbre responsive (breakpoints). Ne garder deux variantes
   que si un layout diverge réellement trop.
3. **Zéro duplication.** Chaque vue exportée répète composants/icônes/CSS.
   Construire **un paquet partagé une seule fois** (design system + composants + icônes),
   puis monter chaque vue dessus. Interdiction de copier les fichiers partagés par vue.

## Exports Claude Design — quoi en faire (dans chaque dossier de vue)

- **Réutiliser :** `src/components.jsx`, `src/icons.jsx`, `assets/*.svg`
- **Centraliser (source de vérité) :** `styles/colors_and_type.css`, `styles/kit.css`
- **Transformer :** `src/data.jsx` (mock → Supabase) ; `desktop.jsx` + `mobile.jsx`
  (→ responsive unifié) ; CSS spécifique à la vue (ex. `today.css`) → garder par vue
- **Jeter** (échafaudage de présentation, pas du code applicatif) :
  `design-canvas.jsx`, `src/ios-frame.jsx`, `*.html`, `screenshots/`

## Routes (App Router) — protégées par auth sauf `/login`

`/login` · `/today` (= `/`) · `/upcoming` · `/all` · `/list/[listId]` ·
`/filter/[filterId]` · `/habits` · `/focus` · `/settings`

## Modèle de données — point de départ, à finaliser en Phase 2

Toutes les tables portent `user_id uuid` + policy RLS `user_id = auth.uid()`.

- `tasks`, `subtasks`, `lists`, `folders`, `tags`, `task_tags` (table de jointure)
- `habits`, `habit_logs`
- `pomodoro_sessions`
- `reminders`

Prévoir un champ `status` sur `tasks` dès le départ (vue board envisageable plus tard,
sans dette technique).

## Périmètre — HORS-SCOPE STRICTEMENT INTERDIT

Ne jamais implémenter, même si l'idée surgit en cours de route. Signaler et s'arrêter :

- Collaboration (partage de listes, attribution, commentaires)
- Vues calendrier, Kanban, timeline, matrice d'Eisenhower
- Intégrations tierces (Google/Outlook Calendar), import, API publique
- Mode hors-ligne avec résolution de conflits

Toute demande sortant de @SPEC.md doit être signalée à l'utilisateur, pas codée.

## Conventions de code

- TypeScript strict, jamais de `any` implicite
- Lisibilité > concision ; commentaires uniquement sur le non-évident
- Accessibilité : navigation clavier, focus visibles, contrastes AA
- Toujours gérer explicitement les états vide / chargement / erreur
- Un commit par étape de @BUILD_PLAN.md, message clair et atomique
- **Ne JAMAIS committer de secret** (clés Supabase) : tout en `.env.local`,
  jamais versionné ; fournir un `.env.example` sans valeurs

## Méthode de travail

- Avant chaque phase, proposer un plan court et attendre validation (plan mode)
- Avancer phase par phase ; ne pas tout générer d'un coup
- À la fin de chaque phase, l'application doit compiler et tourner
