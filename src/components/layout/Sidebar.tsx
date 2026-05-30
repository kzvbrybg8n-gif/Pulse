"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  IconCalendarDays,
  IconChevronRight,
  IconFolder,
  IconHash,
  IconInbox,
  IconSearch,
  IconSun,
  IconX,
} from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { FOOT_NAV } from "@/lib/mocks/today";

/* ── Types ──────────────────────────────────────────────── */

type ListItem = { id: string; name: string; count: number; order_index: number };
type FolderItem = { id: string; name: string; order_index: number; lists: ListItem[] };

type SidebarData = {
  todayCount: number;
  upcomingCount: number;
  allCount: number;
  folders: FolderItem[];
};

/* ── Composant ───────────────────────────────────────────── */

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [supabase] = useState(() => createClient());
  const [data, setData] = useState<SidebarData | null>(null);
  const [folderOpen, setFolderOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function load() {
      // 1. Tâches ouvertes : counts pour les smart lists + répartition par liste
      const { data: openTasks } = await supabase
        .from("tasks")
        .select("id, list_id, due_at")
        .eq("status", "open");

      const tasks = openTasks ?? [];
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrowStart = new Date(todayStart.getTime() + 86_400_000);
      const sevenDaysEnd = new Date(todayStart.getTime() + 7 * 86_400_000);

      const todayCount = tasks.filter((t) => {
        if (!t.due_at) return true;
        return new Date(t.due_at as string) < tomorrowStart;
      }).length;

      const upcomingCount = tasks.filter((t) => {
        if (!t.due_at) return false;
        const d = new Date(t.due_at as string);
        return d >= tomorrowStart && d < sevenDaysEnd;
      }).length;

      const allCount = tasks.length;

      const listCountMap = new Map<string, number>();
      for (const t of tasks) {
        if (t.list_id) {
          listCountMap.set(t.list_id as string, (listCountMap.get(t.list_id as string) ?? 0) + 1);
        }
      }

      // 2. Dossiers avec leurs listes
      const { data: foldersRaw } = await supabase
        .from("folders")
        .select("id, name, order_index, lists(id, name, order_index)")
        .order("order_index");

      const folders: FolderItem[] = (foldersRaw ?? []).map((f) => {
        const fr = f as {
          id: string;
          name: string;
          order_index: number;
          lists: { id: string; name: string; order_index: number }[];
        };
        return {
          id: fr.id,
          name: fr.name,
          order_index: fr.order_index,
          lists: (fr.lists ?? [])
            .sort((a, b) => a.order_index - b.order_index)
            .map((l) => ({
              id: l.id,
              name: l.name,
              order_index: l.order_index,
              count: listCountMap.get(l.id) ?? 0,
            })),
        };
      });

      setData({ todayCount, upcomingCount, allCount, folders });
      setFolderOpen(Object.fromEntries(folders.map((f) => [f.id, true])));
    }

    void load();
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const smartLists = [
    { id: "today", label: "Aujourd'hui", Icon: IconSun, href: "/", count: data?.todayCount ?? 0 },
    { id: "upcoming", label: "7 prochains jours", Icon: IconCalendarDays, href: "/upcoming", count: data?.upcomingCount ?? 0 },
    { id: "all", label: "Toutes les tâches", Icon: IconInbox, href: "/all", count: data?.allCount ?? 0 },
  ];

  return (
    <aside className="pk-side">
      <div className="pk-brand">
        <Image src="/logo-light.svg" alt="Pulse" width={96} height={28} priority />
      </div>

      <div className="pk-side-search">
        <IconSearch size={16} />
        <input placeholder="Rechercher une tâche…" />
      </div>

      <div className="pk-side-lab">Listes intelligentes</div>
      <nav className="pk-nav">
        {smartLists.map((v) => {
          const isActive = pathname === v.href;
          return (
            <button
              key={v.id}
              type="button"
              className={"pk-navitem" + (isActive ? " active" : "")}
              onClick={() => router.push(v.href)}
            >
              <v.Icon size={18} />
              <span className="t">{v.label}</span>
              <span className="c">{v.count}</span>
            </button>
          );
        })}
      </nav>

      {(data?.folders.length ?? 0) > 0 && (
        <>
          <div className="pk-side-lab">Listes & projets</div>
          {(data?.folders ?? []).map((f) => (
            <div className="pk-folder" key={f.id}>
              <button
                type="button"
                className="pk-folder-head"
                onClick={() => setFolderOpen((o) => ({ ...o, [f.id]: !o[f.id] }))}
              >
                <span className={"pk-folder-chev" + (folderOpen[f.id] ? " open" : "")}>
                  <IconChevronRight size={14} />
                </span>
                <IconFolder size={16} />
                <span className="t">{f.name}</span>
              </button>
              {folderOpen[f.id] && (
                <div className="pk-folder-lists">
                  {f.lists.map((l) => {
                    const href = `/list/${l.id}`;
                    return (
                      <button
                        key={l.id}
                        type="button"
                        className={"pk-listitem" + (pathname === href ? " active" : "")}
                        onClick={() => router.push(href)}
                      >
                        <IconHash size={14} />
                        <span className="t">{l.name}</span>
                        <span className="c">{l.count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      <div className="pk-side-foot">
        {FOOT_NAV.map((v) => (
          <button key={v.id} type="button" className="pk-footitem">
            <v.Icon size={18} />
            <span className="t">{v.label}</span>
          </button>
        ))}
        <button type="button" className="pk-footitem" onClick={signOut}>
          <IconX size={18} />
          <span className="t">Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
