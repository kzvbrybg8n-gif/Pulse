/* Pulse — données mock pour la vue « Aujourd'hui ».
   Sera remplacé par des requêtes Supabase en Phase 3.
   Contenu fictif (assistant juridique) issu de l'export Claude Design. */

import {
  IconCalendarDays,
  IconInbox,
  IconRepeat,
  IconSettings,
  IconSun,
  IconTimer,
} from "@/components/icons";
import type {
  Folder,
  FootNavItem,
  PrioConfig,
  SmartList,
  Task,
} from "@/lib/types";

export const PRIO: PrioConfig = {
  1: { label: "Urgent", varName: "--prio-1", filled: true, sw: 1.75 },
  2: { label: "Haute", varName: "--prio-2", filled: true, sw: 1.75 },
  3: { label: "Moyenne", varName: "--prio-3", filled: false, sw: 1.75 },
  4: { label: "Basse", varName: "--prio-4", filled: false, sw: 1.5 },
};

export const SMART_LISTS: SmartList[] = [
  { id: "today", label: "Aujourd'hui", Icon: IconSun, count: 5, active: true },
  { id: "upcoming", label: "7 prochains jours", Icon: IconCalendarDays, count: 8 },
  { id: "all", label: "Toutes les tâches", Icon: IconInbox, count: 27 },
];

export const FOLDERS: Folder[] = [
  {
    name: "Cabinet",
    open: true,
    lists: [
      { name: "Dossiers clients", count: 12 },
      { name: "Veille juridique", count: 3 },
      { name: "Rédaction de clauses", count: 5 },
    ],
  },
  {
    name: "Perso",
    open: true,
    lists: [
      { name: "Courses", count: 4 },
      { name: "Administratif", count: 2 },
    ],
  },
];

export const FOOT_NAV: FootNavItem[] = [
  { id: "habits", label: "Habitudes", Icon: IconRepeat },
  { id: "focus", label: "Focus", Icon: IconTimer },
  { id: "settings", label: "Réglages", Icon: IconSettings },
];

export const OVERDUE: Task[] = [
  {
    id: 1,
    title: "Finaliser la clause de non-concurrence — dossier Lemoine",
    done: false,
    prio: 1,
    due: "hier · 18:00",
    late: true,
    tags: ["rédaction"],
    recur: null,
    reminder: false,
    note: true,
    subtasks: [],
  },
];

export const TODAY: Task[] = [
  {
    id: 2,
    title: "Envoyer la note de synthèse à Me Dubois",
    done: true,
    prio: 3,
    due: "09:30",
    late: false,
    tags: ["client"],
    recur: null,
    reminder: false,
    note: false,
    subtasks: [],
  },
  {
    id: 3,
    title: "Préparer le rendez-vous client TechNova",
    done: false,
    prio: 2,
    due: "15:00",
    late: false,
    tags: ["client", "M&A"],
    recur: null,
    reminder: false,
    note: true,
    expanded: true,
    subtasks: [
      { id: 31, title: "Relire le pacte d'associés", done: false },
      { id: 32, title: "Lister les points de vigilance", done: true },
    ],
  },
  {
    id: 4,
    title: "Veille jurisprudentielle",
    done: false,
    prio: 3,
    due: null,
    late: false,
    tags: ["veille"],
    recur: "chaque jour",
    reminder: false,
    note: false,
    subtasks: [],
  },
  {
    id: 5,
    title: "Relire le contrat de prestation",
    done: false,
    prio: 2,
    due: "14:00",
    late: false,
    tags: ["client"],
    recur: null,
    reminder: true,
    note: false,
    subtasks: [],
  },
];
