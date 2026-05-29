# Pulse — Spécification fonctionnelle

Périmètre exact de l'application. Tout ce qui n'est pas ici est hors-scope (voir CLAUDE.md).

## Module Tâches

- Création, édition, complétion
- Échéance : date + heure
- Priorité à 4 niveaux
- Tags (multiples par tâche)
- Notes (texte libre)
- Sous-tâches : **un seul niveau** de profondeur
- Récurrence : quotidienne, hebdomadaire, mensuelle, règles personnalisées
- Organisation en listes/projets, regroupables en dossiers

### Saisie rapide avec parsing en langage naturel

Champ de saisie unique : on détecte priorité, tags et échéance **dans le texte**, on
les extrait, et on conserve le reste comme titre.

Grammaire à implémenter :
- Priorité : `!` = P3, `!!` = P2, `!!!` = P1 (P4 = aucune marque, défaut)
- Tag : `#nom`
- Échéance : mots-clés de date/heure relatifs et absolus

Exemples entrée → sortie attendus :

| Entrée | Titre | Échéance | Priorité | Tags |
|---|---|---|---|---|
| `Rendre le mémo demain 14h !! #travail` | Rendre le mémo | demain 14:00 | P2 | [travail] |
| `Appeler le client lundi #clients` | Appeler le client | lundi prochain 00:00 | P4 | [clients] |
| `Relire la clause !!!` | Relire la clause | aucune | P1 | [] |
| `Courses` | Courses | aucune | P4 | [] |

Règles : si plusieurs marques de priorité, garder la plus haute. Tags multiples possibles.
Heure absente sur une date → 00:00 (ou un défaut configurable). Texte résiduel nettoyé
(espaces superflus retirés).

### Récurrence

Stocker la règle dans une structure type RRULE (réutiliser un format standard plutôt
qu'inventer). Exemples :

| Expression utilisateur | Règle |
|---|---|
| tous les jours | `FREQ=DAILY` |
| toutes les semaines le lundi | `FREQ=WEEKLY;BYDAY=MO` |
| le 1er de chaque mois | `FREQ=MONTHLY;BYMONTHDAY=1` |
| tous les 3 jours | `FREQ=DAILY;INTERVAL=3` |

À la complétion d'une tâche récurrente, générer la prochaine occurrence selon la règle.

## Smart lists & filtres

- Vues automatiques : « Aujourd'hui », « 7 prochains jours », « Toutes les tâches »
- Filtres personnalisés combinant tags + dates + priorité (persistés)
- **Vue Liste uniquement** (pas d'autre mode d'affichage)

Les smart lists et filtres sont des vues **dérivées** : aucune table dédiée, juste des
requêtes paramétrées sur `tasks`.

## Rappels

- Rappel paramétrable par tâche
- Notifications push web / desktop

Contrainte connue : sur iOS, le Web Push n'est disponible qu'en PWA installée
(Safari 16.4+). À anticiper si des rappels fiables sur iPhone sont attendus.

## Module Habitudes

- Définition d'une habitude avec fréquence cible
- Check-in quotidien
- Calcul des séries (streaks)
- Historique et statistiques simples

## Module Pomodoro

- Minuteur Focus / Pause
- Bascule de cycle automatique (durées configurables, défaut classique 25/5)
- Historique des sessions
- Association optionnelle à une tâche
