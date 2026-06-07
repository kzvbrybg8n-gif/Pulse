"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  IconCalendarDays,
  IconChevronRight,
  IconFolder,
  IconHash,
  IconInbox,
  IconMore,
  IconPencil,
  IconPlus,
  IconRepeat,
  IconSearch,
  IconSettings,
  IconSun,
  IconTimer,
  IconTrash,
  IconX,
} from "@/components/icons";
import { FilterPanel } from "@/components/ui/FilterPanel";
import { createClient } from "@/lib/supabase/client";
import { getAuthClaims } from "@/lib/supabase/user";
import { loadFilters, type FilterSpec } from "@/lib/filters";

/* ── Types ──────────────────────────────────────────────── */

type ListItem = { id: string; name: string; count: number; order_index: number };
type FolderItem = { id: string; name: string; order_index: number; lists: ListItem[] };
type TagItem = { id: string; name: string; count: number };

type SidebarData = {
  todayCount: number;
  upcomingCount: number;
  allCount: number;
  folders: FolderItem[];
  tags: TagItem[];
};

/** Cible d'une action de gestion (renommage / suppression). */
type Target = { kind: "folder" | "list"; id: string };

/* ── Cache partagé au niveau module ──────────────────────────
   La Sidebar est rendue à l'intérieur de chaque vue : elle se démonte et se
   remonte à chaque navigation. Sans cache, son useEffect relançait deux
   requêtes Supabase (compteurs + dossiers) à CHAQUE bascule de vue — la
   cause principale de la lenteur ressentie au changement de vue.

   Ce cache survit aux remontages : on réaffiche instantanément les dernières
   données connues, puis on revalide en arrière-plan (stale-while-revalidate).
   ──────────────────────────────────────────────────────────── */
let sidebarCache: SidebarData | null = null;

/* ── Composant ───────────────────────────────────────────── */

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [supabase] = useState(() => createClient());
  // Amorçage depuis le cache : affichage immédiat au remontage, sans spinner.
  const [data, setData] = useState<SidebarData | null>(() => sidebarCache);
  const [userId, setUserId] = useState("");
  const [folderOpen, setFolderOpen] = useState<Record<string, boolean>>(() =>
    sidebarCache
      ? Object.fromEntries(sidebarCache.folders.map((f) => [f.id, true]))
      : {},
  );
  const [filters, setFilters] = useState<FilterSpec[]>([]);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [filterPanelSpec, setFilterPanelSpec] = useState<FilterSpec | null>(null);

  // ── États d'édition organisation (dossiers / listes) ──────
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderDraft, setFolderDraft] = useState("");
  const [creatingListIn, setCreatingListIn] = useState<string | null>(null);
  const [listDraft, setListDraft] = useState("");
  const [editing, setEditing] = useState<Target | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Target | null>(null);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const listInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // ── Chargement des données sidebar ────────────────────────
  const load = useCallback(async () => {
    // 1. Tâches ouvertes : counts pour les smart lists + répartition par liste
    const { data: openTasks } = await supabase
      .from("tasks")
      .select("id, list_id, due_at")
      .eq("status", "open");

    const tasks = openTasks ?? [];
    const openIds = new Set(tasks.map((t) => t.id as string));
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart.getTime() + 86_400_000);
    const sevenDaysEnd = new Date(tomorrowStart.getTime() + 7 * 86_400_000);

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

    // 3. Tags + compteur de tâches ouvertes par tag
    const [{ data: tagsRaw }, { data: taskTagsRaw }] = await Promise.all([
      supabase.from("tags").select("id, name").order("name"),
      supabase.from("task_tags").select("tag_id, task_id"),
    ]);

    const tagCountMap = new Map<string, number>();
    for (const tt of taskTagsRaw ?? []) {
      const taskId = tt.task_id as string;
      const tagId = tt.tag_id as string;
      if (openIds.has(taskId)) {
        tagCountMap.set(tagId, (tagCountMap.get(tagId) ?? 0) + 1);
      }
    }

    const tags: TagItem[] = (tagsRaw ?? []).map((t) => {
      const tr = t as { id: string; name: string };
      return { id: tr.id, name: tr.name, count: tagCountMap.get(tr.id) ?? 0 };
    });

    const next = { todayCount, upcomingCount, allCount, folders, tags };
    sidebarCache = next;
    setData(next);
    // Conserve l'état d'ouverture choisi par l'utilisateur ; n'ouvre par
    // défaut que les dossiers encore inconnus.
    setFolderOpen((prev) =>
      Object.fromEntries(folders.map((f) => [f.id, prev[f.id] ?? true])),
    );

    // 4. Filtres personnalisés (localStorage)
    setFilters(loadFilters());
  }, [supabase]);

  useEffect(() => {
    void load();
    void getAuthClaims(supabase).then((u) => setUserId(u.id));
  }, [load, supabase]);

  // Focus automatique des champs de saisie inline
  useEffect(() => {
    if (creatingFolder) folderInputRef.current?.focus();
  }, [creatingFolder]);
  useEffect(() => {
    if (creatingListIn) listInputRef.current?.focus();
  }, [creatingListIn]);
  useEffect(() => {
    if (editing) editInputRef.current?.focus();
  }, [editing]);

  // ── Mutations organisation ────────────────────────────────

  async function createFolder() {
    const name = folderDraft.trim();
    setCreatingFolder(false);
    setFolderDraft("");
    if (!name || !userId) return;
    const maxOrder = (data?.folders ?? []).reduce((m, f) => Math.max(m, f.order_index), -1);
    await supabase.from("folders").insert({ user_id: userId, name, order_index: maxOrder + 1 });
    await load();
  }

  async function createList(folderId: string) {
    const name = listDraft.trim();
    setCreatingListIn(null);
    setListDraft("");
    if (!name || !userId) return;
    const folder = data?.folders.find((f) => f.id === folderId);
    const maxOrder = (folder?.lists ?? []).reduce((m, l) => Math.max(m, l.order_index), -1);
    await supabase
      .from("lists")
      .insert({ user_id: userId, folder_id: folderId, name, order_index: maxOrder + 1 });
    setFolderOpen((o) => ({ ...o, [folderId]: true }));
    await load();
  }

  async function saveRename() {
    const target = editing;
    const name = editDraft.trim();
    setEditing(null);
    setEditDraft("");
    if (!target || !name) return;
    const table = target.kind === "folder" ? "folders" : "lists";
    await supabase.from(table).update({ name }).eq("id", target.id);
    await load();
  }

  async function performDelete(target: Target) {
    setConfirmDelete(null);
    setMenuFor(null);
    if (target.kind === "folder") {
      // Cascade applicative : supprimer les listes du dossier puis le dossier.
      // (FK folder_id = ON DELETE SET NULL : sans cela les listes deviendraient
      // orphelines et disparaîtraient de la sidebar.) Les tâches concernées
      // repassent list_id = null via la FK ON DELETE SET NULL de lists.
      await supabase.from("lists").delete().eq("folder_id", target.id);
      await supabase.from("folders").delete().eq("id", target.id);
    } else {
      await supabase.from("lists").delete().eq("id", target.id);
    }
    await load();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const smartLists = [
    { id: "today", label: "Aujourd'hui", Icon: IconSun, href: "/", count: data?.todayCount ?? 0 },
    {
      id: "upcoming",
      label: "7 prochains jours",
      Icon: IconCalendarDays,
      href: "/upcoming",
      count: data?.upcomingCount ?? 0,
    },
    { id: "all", label: "Toutes les tâches", Icon: IconInbox, href: "/all", count: data?.allCount ?? 0 },
  ];

  const appLinks = [
    { id: "habits", label: "Habitudes", Icon: IconRepeat, href: "/habits" },
    { id: "focus", label: "Focus", Icon: IconTimer, href: "/focus" },
    { id: "countdowns", label: "Compte à rebours", Icon: IconCalendarDays, href: "/countdowns" },
  ];

  const tagsWithTasks = (data?.tags ?? []).filter((t) => t.count > 0);

  return (
    <aside className="pk-side">
      <div className="pk-brand">
        <Image src="/logo-light.svg" alt="Pulse" width={96} height={28} priority />
      </div>

      <div className="pk-side-search">
        <IconSearch size={16} />
        <input aria-label="Rechercher une tâche" placeholder="Rechercher une tâche…" />
      </div>

      <div className="pk-side-lab">Application</div>
      <nav className="pk-nav">
        {appLinks.map((v) => {
          const isActive = pathname.startsWith(v.href);
          return (
            <Link
              key={v.id}
              href={v.href}
              className={"pk-navitem" + (isActive ? " active" : "")}
            >
              <v.Icon size={18} />
              <span className="t">{v.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="pk-side-lab">Listes intelligentes</div>
      <nav className="pk-nav">
        {smartLists.map((v) => {
          const isActive = pathname === v.href;
          return (
            <Link
              key={v.id}
              href={v.href}
              className={"pk-navitem" + (isActive ? " active" : "")}
            >
              <v.Icon size={18} />
              <span className="t">{v.label}</span>
              <span className="c">{v.count}</span>
            </Link>
          );
        })}
      </nav>

      {/* Filtres personnalisés */}
      <div className="fp-side-head">
        <div className="pk-side-lab" style={{ margin: 0, padding: 0 }}>
          Filtres
        </div>
        <button
          type="button"
          className="fp-side-add-btn"
          onClick={() => {
            setFilterPanelSpec(null);
            setFilterPanelOpen(true);
          }}
          aria-label="Nouveau filtre"
        >
          <IconPlus size={14} />
        </button>
      </div>
      {filters.length > 0 && (
        <nav className="pk-nav">
          {filters.map((f) => {
            const href = `/filter/${f.id}`;
            return (
              <Link
                key={f.id}
                href={href}
                className={"pk-navitem" + (pathname === href ? " active" : "")}
              >
                <IconHash size={18} />
                <span className="t">{f.name}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* Tags — vues dérivées : regrouper les tâches par tag */}
      {tagsWithTasks.length > 0 && (
        <>
          <div className="pk-side-lab">Tags</div>
          <nav className="pk-nav">
            {tagsWithTasks.map((t) => {
              const href = `/tag/${encodeURIComponent(t.name)}`;
              return (
                <Link
                  key={t.id}
                  href={href}
                  className={"pk-navitem" + (pathname === href ? " active" : "")}
                >
                  <IconHash size={18} />
                  <span className="t">{t.name}</span>
                  <span className="c">{t.count}</span>
                </Link>
              );
            })}
          </nav>
        </>
      )}

      {/* Listes & projets (dossiers) */}
      <div className="fp-side-head">
        <div className="pk-side-lab" style={{ margin: 0, padding: 0 }}>
          Listes &amp; projets
        </div>
        <button
          type="button"
          className="fp-side-add-btn"
          onClick={() => {
            setCreatingFolder(true);
            setFolderDraft("");
          }}
          aria-label="Nouveau dossier"
        >
          <IconPlus size={14} />
        </button>
      </div>

      {creatingFolder && (
        <div className="pk-side-newrow">
          <IconFolder size={16} />
          <input
            ref={folderInputRef}
            className="pk-side-input"
            placeholder="Nom du dossier…"
            value={folderDraft}
            onChange={(e) => setFolderDraft(e.target.value)}
            onBlur={() => void createFolder()}
            onKeyDown={(e) => {
              if (e.key === "Enter") void createFolder();
              if (e.key === "Escape") {
                setCreatingFolder(false);
                setFolderDraft("");
              }
            }}
          />
        </div>
      )}

      {(data?.folders ?? []).map((f) => (
        <div className="pk-folder" key={f.id}>
          <div className="pk-folder-row">
            {editing?.kind === "folder" && editing.id === f.id ? (
              <div className="pk-side-newrow">
                <IconFolder size={16} />
                <input
                  ref={editInputRef}
                  className="pk-side-input"
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  onBlur={() => void saveRename()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void saveRename();
                    if (e.key === "Escape") {
                      setEditing(null);
                      setEditDraft("");
                    }
                  }}
                />
              </div>
            ) : (
              <>
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
                <div className="pk-row-actions">
                  <button
                    type="button"
                    className="fp-side-add-btn"
                    aria-label={`Ajouter une liste dans ${f.name}`}
                    onClick={() => {
                      setCreatingListIn(f.id);
                      setListDraft("");
                      setFolderOpen((o) => ({ ...o, [f.id]: true }));
                    }}
                  >
                    <IconPlus size={13} />
                  </button>
                  <button
                    type="button"
                    className="fp-side-add-btn"
                    aria-label={`Options du dossier ${f.name}`}
                    onClick={() => setMenuFor((m) => (m === f.id ? null : f.id))}
                  >
                    <IconMore size={14} />
                  </button>
                </div>
                {menuFor === f.id && (
                  <SidebarMenu
                    onRename={() => {
                      setMenuFor(null);
                      setEditing({ kind: "folder", id: f.id });
                      setEditDraft(f.name);
                    }}
                    onDelete={() => {
                      setMenuFor(null);
                      setConfirmDelete({ kind: "folder", id: f.id });
                    }}
                    onClose={() => setMenuFor(null)}
                  />
                )}
              </>
            )}
          </div>

          {confirmDelete?.kind === "folder" && confirmDelete.id === f.id && (
            <DeleteConfirm
              label="Supprimer ce dossier et ses listes ?"
              onYes={() => void performDelete(confirmDelete)}
              onNo={() => setConfirmDelete(null)}
            />
          )}

          {folderOpen[f.id] && (
            <div className="pk-folder-lists">
              {f.lists.map((l) => {
                const href = `/list/${l.id}`;
                const isEditing = editing?.kind === "list" && editing.id === l.id;
                return (
                  <div className="pk-list-row" key={l.id}>
                    {isEditing ? (
                      <div className="pk-side-newrow pk-side-newrow-list">
                        <IconHash size={14} />
                        <input
                          ref={editInputRef}
                          className="pk-side-input"
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onBlur={() => void saveRename()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void saveRename();
                            if (e.key === "Escape") {
                              setEditing(null);
                              setEditDraft("");
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <>
                        <Link
                          href={href}
                          className={"pk-listitem" + (pathname === href ? " active" : "")}
                        >
                          <IconHash size={14} />
                          <span className="t">{l.name}</span>
                          <span className="c">{l.count}</span>
                        </Link>
                        <button
                          type="button"
                          className="fp-side-add-btn"
                          aria-label={`Options de la liste ${l.name}`}
                          onClick={() => setMenuFor((m) => (m === l.id ? null : l.id))}
                        >
                          <IconMore size={14} />
                        </button>
                        {menuFor === l.id && (
                          <SidebarMenu
                            onRename={() => {
                              setMenuFor(null);
                              setEditing({ kind: "list", id: l.id });
                              setEditDraft(l.name);
                            }}
                            onDelete={() => {
                              setMenuFor(null);
                              setConfirmDelete({ kind: "list", id: l.id });
                            }}
                            onClose={() => setMenuFor(null)}
                          />
                        )}
                      </>
                    )}
                    {confirmDelete?.kind === "list" && confirmDelete.id === l.id && (
                      <DeleteConfirm
                        label="Supprimer cette liste ?"
                        onYes={() => void performDelete(confirmDelete)}
                        onNo={() => setConfirmDelete(null)}
                      />
                    )}
                  </div>
                );
              })}

              {creatingListIn === f.id && (
                <div className="pk-side-newrow pk-side-newrow-list">
                  <IconHash size={14} />
                  <input
                    ref={listInputRef}
                    className="pk-side-input"
                    placeholder="Nom de la liste…"
                    value={listDraft}
                    onChange={(e) => setListDraft(e.target.value)}
                    onBlur={() => void createList(f.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void createList(f.id);
                      if (e.key === "Escape") {
                        setCreatingListIn(null);
                        setListDraft("");
                      }
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <div className="pk-side-foot">
        <Link
          href="/settings"
          className={
            "pk-footitem" + (pathname.startsWith("/settings") ? " active" : "")
          }
        >
          <IconSettings size={18} />
          <span className="t">Réglages</span>
        </Link>
        <button type="button" className="pk-footitem" onClick={signOut}>
          <IconX size={18} />
          <span className="t">Déconnexion</span>
        </button>
      </div>

      {filterPanelOpen && (
        <FilterPanel
          initialSpec={filterPanelSpec}
          onSave={(spec) => {
            setFilters(loadFilters());
            setFilterPanelOpen(false);
            router.push(`/filter/${spec.id}`);
          }}
          onDelete={() => {
            setFilters(loadFilters());
            setFilterPanelOpen(false);
          }}
          onClose={() => setFilterPanelOpen(false)}
        />
      )}
    </aside>
  );
}

/* ── Sous-composants locaux ──────────────────────────────── */

/** Petit menu contextuel (Renommer / Supprimer) avec fermeture au clic extérieur. */
function SidebarMenu({
  onRename,
  onDelete,
  onClose,
}: {
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="pk-menu-back" role="presentation" onClick={onClose} />
      <div className="pk-menu" role="menu">
        <button type="button" className="pk-menu-item" role="menuitem" onClick={onRename}>
          <IconPencil size={13} />
          Renommer
        </button>
        <button
          type="button"
          className="pk-menu-item danger"
          role="menuitem"
          onClick={onDelete}
        >
          <IconTrash size={13} />
          Supprimer
        </button>
      </div>
    </>
  );
}

/** Confirmation de suppression inline. */
function DeleteConfirm({
  label,
  onYes,
  onNo,
}: {
  label: string;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <div className="pk-side-confirm">
      <span>{label}</span>
      <div className="pk-side-confirm-actions">
        <button type="button" className="pd-del-yes" onClick={onYes}>
          Oui
        </button>
        <button type="button" className="pd-del-no" onClick={onNo}>
          Non
        </button>
      </div>
    </div>
  );
}
