/* Pulse — configuration encore statique de la chrome « Aujourd'hui ».

   Les tâches (OVERDUE/TODAY) viennent désormais de Supabase (Phase 3).
   Ne restent ici que des données de navigation/présentation pas encore
   branchées : PRIO (table de correspondance priorité → drapeau),
   SMART_LISTS, FOLDERS, FOOT_NAV. Leur branchement DB est prévu en
   Phase 4/5. */

import {
  IconCalendarDays,
  IconInbox,
  IconRepeat,
  IconSettings,
  IconSun,
  IconTimer,
} from "@/components/icons";
import type { Folder, FootNavItem, PrioConfig, SmartList } from "@/lib/types";

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
