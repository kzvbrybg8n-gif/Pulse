"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  IconAlignLeft,
  IconBell,
  IconCalendar,
  IconCornerDownRight,
  IconFolder,
  IconPlus,
  IconRepeat,
  IconTag,
  IconTimer,
  IconTrash,
  IconX,
} from "@/components/icons";
import { Checkbox } from "@/components/ui/Checkbox";
import { PriorityFlag } from "@/components/ui/PriorityFlag";
import { ensurePushSubscribed } from "@/components/ui/PushManager";
import { createClient } from "@/lib/supabase/client";
import type { Priority, Subtask, Task } from "@/lib/types";

/* ── Types internes ──────────────────────────────────────── */

type DetailSubtask = { id: string; title: string; done: boolean; order_index: number };

type DetailData = {
  id: string;
  title: string;
  status: string;
  prio: Priority;
  due_at: string | null;
  remind_at: string | null;
  recur_rule: string | null;
  note: string | null;
  list_id: string | null;
  list_name: string | null;
  folder_name: string | null;
  created_at: string;
  subtasks: DetailSubtask[];
  tags: string[];
};

type FolderOption = { id: string; name: string; lists: { id: string; name: string }[] };

/* ── Utilitaires ─────────────────────────────────────────── */

function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatCreatedAt(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(
    new Date(iso),
  );
}

function formatDueDisplay(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/* ── Composant principal ──────────────────────────────────── */

type Props = {
  taskId: string | null;
  userId: string;
  onClose: () => void;
  onUpdate: (id: string, changes: Partial<Task>) => void;
  onDelete: (id: string) => void;
};

export function TaskDetail({ taskId, userId, onClose, onUpdate, onDelete }: Props) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(false);

  // États d'édition
  const [editTitle, setEditTitle] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editingDue, setEditingDue] = useState(false);
  const [editDue, setEditDue] = useState("");
  const [editingRemind, setEditingRemind] = useState(false);
  const [editRemind, setEditRemind] = useState("");
  const [editingRecur, setEditingRecur] = useState(false);
  const [editRecur, setEditRecur] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Sélecteur de liste (rangement dans un dossier)
  const [listPickerOpen, setListPickerOpen] = useState(false);
  const [folderOptions, setFolderOptions] = useState<FolderOption[] | null>(null);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch ───────────────────────────────────────────────

  useEffect(() => {
    if (!taskId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setDeleteConfirm(false);

    supabase
      .from("tasks")
      .select(
        "id, title, status, prio, due_at, recur_rule, note, list_id, created_at, lists(name, folders(name)), subtasks(id, title, done, order_index), task_tags(tags(id, name)), reminders(remind_at)",
      )
      .eq("id", taskId)
      .single()
      .then(({ data: row, error }) => {
        setLoading(false);
        if (error || !row) return;

        const r = row as Record<string, unknown>;
        const listRel = r.lists as { name: string; folders?: { name: string } | null } | null;
        const tags = (
          r.task_tags as { tags: { id: string; name: string } | null }[] | null ?? []
        )
          .map((tt) => tt.tags?.name)
          .filter((n): n is string => Boolean(n));

        const subs = (r.subtasks as DetailSubtask[] | null ?? [])
          .slice()
          .sort((a, b) => a.order_index - b.order_index);

        const reminders = r.reminders as { remind_at: string }[] | null ?? [];

        const d: DetailData = {
          id: r.id as string,
          title: r.title as string,
          status: r.status as string,
          prio: (r.prio as number) as Priority,
          due_at: r.due_at as string | null,
          remind_at: reminders[0]?.remind_at ?? null,
          recur_rule: r.recur_rule as string | null,
          note: r.note as string | null,
          list_id: r.list_id as string | null,
          list_name: listRel?.name ?? null,
          folder_name: listRel?.folders?.name ?? null,
          created_at: r.created_at as string,
          subtasks: subs,
          tags,
        };

        setDetail(d);
        setEditTitle(d.title);
        setEditNote(d.note ?? "");
        setEditRecur(d.recur_rule ?? "");
      });
  }, [taskId, supabase]);

  useEffect(() => {
    if (showTagInput) tagInputRef.current?.focus();
  }, [showTagInput]);

  // ── Sauvegardes ────────────────────────────────────────

  async function saveTitle() {
    if (!detail || editTitle.trim() === detail.title) return;
    const title = editTitle.trim() || detail.title;
    await supabase.from("tasks").update({ title }).eq("id", detail.id);
    setDetail((d) => d && { ...d, title });
    onUpdate(detail.id, { title });
  }

  async function savePrio(prio: Priority) {
    if (!detail) return;
    await supabase.from("tasks").update({ prio }).eq("id", detail.id);
    setDetail((d) => d && { ...d, prio });
    onUpdate(detail.id, { prio });
  }

  async function toggleStatus() {
    if (!detail) return;
    const newStatus = detail.status === "done" ? "open" : "done";
    await supabase.from("tasks").update({ status: newStatus }).eq("id", detail.id);
    setDetail((d) => d && { ...d, status: newStatus });
    onUpdate(detail.id, { done: newStatus === "done" });
  }

  async function saveDueAt() {
    if (!detail) return;
    const iso = editDue ? new Date(editDue).toISOString() : null;
    await supabase.from("tasks").update({ due_at: iso }).eq("id", detail.id);
    setDetail((d) => d && { ...d, due_at: iso });
    setEditingDue(false);
    onUpdate(detail.id, { due: iso ? formatDueDisplay(iso) : null, late: false });
  }

  async function saveNote() {
    if (!detail) return;
    const note = editNote.trim() || null;
    await supabase.from("tasks").update({ note }).eq("id", detail.id);
    setDetail((d) => d && { ...d, note });
    onUpdate(detail.id, { note: Boolean(note) });
  }

  async function saveRecur() {
    if (!detail) return;
    const recur_rule = editRecur.trim() || null;
    await supabase.from("tasks").update({ recur_rule }).eq("id", detail.id);
    setDetail((d) => d && { ...d, recur_rule });
    setEditingRecur(false);
    onUpdate(detail.id, { recur: recur_rule });
  }

  async function saveReminder() {
    if (!detail || !editRemind) {
      setEditingRemind(false);
      return;
    }
    const remind_at = new Date(editRemind).toISOString();
    await ensurePushSubscribed();
    // Supprimer l'éventuel rappel existant puis insérer (pas d'upsert : pas de UNIQUE sur task_id)
    await supabase.from("reminders").delete().eq("task_id", detail.id).eq("user_id", userId);
    const { error } = await supabase.from("reminders").insert({
      user_id: userId,
      task_id: detail.id,
      remind_at,
    });
    if (!error) {
      setDetail((d) => d && { ...d, remind_at });
      onUpdate(detail.id, { reminder: true, remindAt: remind_at });
    }
    setEditingRemind(false);
  }

  async function clearReminder() {
    if (!detail) return;
    await supabase.from("reminders").delete().eq("task_id", detail.id).eq("user_id", userId);
    setDetail((d) => d && { ...d, remind_at: null });
    onUpdate(detail.id, { reminder: false, remindAt: null });
  }

  // ── Sous-tâches ────────────────────────────────────────

  async function addSubtaskHandler() {
    if (!detail || !newSubtask.trim()) return;
    const maxIdx = detail.subtasks.reduce((m, s) => Math.max(m, s.order_index), -1);
    const { data: inserted } = await supabase
      .from("subtasks")
      .insert({ user_id: userId, task_id: detail.id, title: newSubtask.trim(), done: false, order_index: maxIdx + 1 })
      .select("id, title, done, order_index")
      .single();

    if (!inserted) return;
    const sub = inserted as DetailSubtask;
    const subs = [...detail.subtasks, sub];
    setDetail((d) => d && { ...d, subtasks: subs });
    setNewSubtask("");
    onUpdate(detail.id, { subtasks: subs.map(mapSub) });
  }

  async function toggleSubtaskHandler(subId: string) {
    if (!detail) return;
    const sub = detail.subtasks.find((s) => s.id === subId);
    if (!sub) return;
    const done = !sub.done;
    await supabase.from("subtasks").update({ done }).eq("id", subId);
    const subs = detail.subtasks.map((s) => (s.id === subId ? { ...s, done } : s));
    setDetail((d) => d && { ...d, subtasks: subs });
    onUpdate(detail.id, { subtasks: subs.map(mapSub) });
  }

  async function deleteSubtaskHandler(subId: string) {
    if (!detail) return;
    await supabase.from("subtasks").delete().eq("id", subId);
    const subs = detail.subtasks.filter((s) => s.id !== subId);
    setDetail((d) => d && { ...d, subtasks: subs });
    onUpdate(detail.id, { subtasks: subs.map(mapSub) });
  }

  // ── Tags ───────────────────────────────────────────────

  async function addTagHandler() {
    if (!detail || !newTag.trim()) {
      setShowTagInput(false);
      return;
    }
    const name = newTag.trim().toLowerCase().replace(/^#/, "");
    if (detail.tags.includes(name)) {
      setNewTag("");
      setShowTagInput(false);
      return;
    }

    // Trouver ou créer le tag
    const { data: existing } = await supabase
      .from("tags")
      .select("id")
      .eq("user_id", userId)
      .ilike("name", name)
      .maybeSingle();

    let tagId: string | null = (existing as { id: string } | null)?.id ?? null;
    if (!tagId) {
      const { data: created } = await supabase
        .from("tags")
        .insert({ user_id: userId, name })
        .select("id")
        .single();
      tagId = (created as { id: string } | null)?.id ?? null;
    }
    if (!tagId) return;

    await supabase
      .from("task_tags")
      .upsert({ task_id: detail.id, tag_id: tagId, user_id: userId }, { ignoreDuplicates: true });

    const tags = [...detail.tags, name];
    setDetail((d) => d && { ...d, tags });
    setNewTag("");
    setShowTagInput(false);
    onUpdate(detail.id, { tags });
  }

  async function removeTagHandler(name: string) {
    if (!detail) return;
    const { data: tag } = await supabase
      .from("tags")
      .select("id")
      .eq("user_id", userId)
      .ilike("name", name)
      .maybeSingle();

    if (tag) {
      await supabase
        .from("task_tags")
        .delete()
        .eq("task_id", detail.id)
        .eq("tag_id", (tag as { id: string }).id);
    }

    const tags = detail.tags.filter((t) => t !== name);
    setDetail((d) => d && { ...d, tags });
    onUpdate(detail.id, { tags });
  }

  // ── Liste (rangement dans un dossier) ──────────────────

  async function openListPicker() {
    setListPickerOpen(true);
    if (folderOptions) return; // déjà chargé
    const { data } = await supabase
      .from("folders")
      .select("id, name, order_index, lists(id, name, order_index)")
      .order("order_index");

    const opts: FolderOption[] = (data ?? []).map((f) => {
      const fr = f as {
        id: string;
        name: string;
        lists: { id: string; name: string; order_index: number }[];
      };
      return {
        id: fr.id,
        name: fr.name,
        lists: (fr.lists ?? [])
          .sort((a, b) => a.order_index - b.order_index)
          .map((l) => ({ id: l.id, name: l.name })),
      };
    });
    setFolderOptions(opts);
  }

  async function assignList(listId: string | null, listName: string | null, folderName: string | null) {
    if (!detail) return;
    setListPickerOpen(false);
    if (listId === detail.list_id) return;
    await supabase.from("tasks").update({ list_id: listId }).eq("id", detail.id);
    setDetail((d) => d && { ...d, list_id: listId, list_name: listName, folder_name: folderName });
  }

  // ── Suppression ────────────────────────────────────────

  async function deleteTaskHandler() {
    if (!detail) return;
    await supabase.from("tasks").delete().eq("id", detail.id);
    onDelete(detail.id);
    onClose();
  }

  // ── Rendu ──────────────────────────────────────────────

  if (!taskId) return null;

  function renderContent() {
    if (loading || !detail) return <div className="pd-loading">Chargement…</div>;

    const doneSubs = detail.subtasks.filter((s) => s.done).length;

    return (
      <>
        {/* En-tête */}
        <div className="pd-head">
          <div className="pd-head-chk">
            <Checkbox
              done={detail.status === "done"}
              size={22}
              onToggle={() => void toggleStatus()}
            />
          </div>
          <textarea
            ref={titleRef}
            className="pd-head-title"
            rows={2}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={() => void saveTitle()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                titleRef.current?.blur();
              }
            }}
          />
          <div className="pd-head-actions">
            <button
              type="button"
              className="pk-icon-btn sm"
              aria-label="Démarrer une session focus"
              title="Démarrer une session focus"
              onClick={() => router.push(`/focus?task=${detail.id}`)}
            >
              <IconTimer size={16} />
            </button>
            <button type="button" className="pk-icon-btn sm" aria-label="Fermer" onClick={onClose}>
              <IconX size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="pd-body">
          {/* Liste (rangement dans un dossier) */}
          <div className="pd-list-wrap">
            <button
              type="button"
              className="pd-list-row"
              aria-haspopup="menu"
              aria-expanded={listPickerOpen}
              onClick={() => (listPickerOpen ? setListPickerOpen(false) : void openListPicker())}
            >
              <IconFolder size={13} style={{ color: "var(--fg-subtle)", flex: "none" }} />
              {detail.folder_name && (
                <>
                  <span className="pd-list-folder">{detail.folder_name}</span>
                  <span className="pd-list-sep">›</span>
                </>
              )}
              <span className={"pd-list-name" + (detail.list_name ? "" : " faint")}>
                {detail.list_name ?? "Aucune liste"}
              </span>
            </button>
            {listPickerOpen && (
              <>
                <div className="pd-list-back" role="presentation" onClick={() => setListPickerOpen(false)} />
                <div className="pd-list-menu" role="menu">
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={detail.list_id === null}
                    className={"pd-list-opt" + (detail.list_id === null ? " sel" : "")}
                    onClick={() => void assignList(null, null, null)}
                  >
                    Aucune liste
                  </button>
                  {folderOptions === null ? (
                    <div className="pd-list-empty">Chargement…</div>
                  ) : folderOptions.length === 0 ? (
                    <div className="pd-list-empty">
                      Aucune liste. Créez-en une depuis la barre latérale.
                    </div>
                  ) : (
                    folderOptions.map((f) => (
                      <div key={f.id} className="pd-list-group">
                        <div className="pd-list-group-lbl">{f.name}</div>
                        {f.lists.length === 0 ? (
                          <div className="pd-list-empty sub">Aucune liste</div>
                        ) : (
                          f.lists.map((l) => (
                            <button
                              key={l.id}
                              type="button"
                              role="menuitemradio"
                              aria-checked={detail.list_id === l.id}
                              className={"pd-list-opt sub" + (detail.list_id === l.id ? " sel" : "")}
                              onClick={() => void assignList(l.id, l.name, f.name)}
                            >
                              {l.name}
                            </button>
                          ))
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          <div className="pd-sep" />

          {/* Propriétés */}
          <div className="pd-props">
            {/* Échéance */}
            <div className="pd-prop">
              <span className="pd-prop-ico"><IconCalendar size={15} /></span>
              <span className="pd-prop-lbl">Échéance</span>
              {editingDue ? (
                <input
                  type="datetime-local"
                  className="pd-due-input"
                  value={editDue}
                  autoFocus
                  onChange={(e) => setEditDue(e.target.value)}
                  onBlur={() => void saveDueAt()}
                />
              ) : (
                <span
                  className={"pd-prop-val " + (detail.due_at ? "mono" : "faint")}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setEditDue(detail.due_at ? isoToDatetimeLocal(detail.due_at) : "");
                    setEditingDue(true);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && setEditingDue(true)}
                >
                  {detail.due_at ? formatDueDisplay(detail.due_at) : "Aucune"}
                </span>
              )}
            </div>

            {/* Priorité */}
            <div className="pd-prop">
              <span className="pd-prop-ico">
                <PriorityFlag prio={detail.prio} size={15} />
              </span>
              <span className="pd-prop-lbl">Priorité</span>
              <div className="pd-prio-row">
                {([1, 2, 3, 4] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={"pd-prio-btn" + (detail.prio === p ? " sel" : "")}
                    aria-label={`Priorité ${p}`}
                    onClick={() => void savePrio(p)}
                  >
                    <PriorityFlag prio={p} size={14} />
                  </button>
                ))}
              </div>
            </div>

            {/* Rappel */}
            <div className="pd-prop">
              <span className="pd-prop-ico">
                <IconBell size={15} style={{ color: detail.remind_at ? "var(--accent-text)" : undefined }} />
              </span>
              <span className="pd-prop-lbl">Rappel</span>
              {editingRemind ? (
                <input
                  type="datetime-local"
                  className="pd-due-input"
                  value={editRemind}
                  autoFocus
                  onChange={(e) => setEditRemind(e.target.value)}
                  onBlur={() => void saveReminder()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void saveReminder();
                    if (e.key === "Escape") setEditingRemind(false);
                  }}
                />
              ) : (
                <span
                  className={"pd-prop-val " + (detail.remind_at ? "" : "faint")}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setEditRemind(detail.remind_at ? isoToDatetimeLocal(detail.remind_at) : "");
                    setEditingRemind(true);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && setEditingRemind(true)}
                >
                  {detail.remind_at ? formatDueDisplay(detail.remind_at) : "Pas de rappel"}
                </span>
              )}
              {detail.remind_at && !editingRemind && (
                <button
                  type="button"
                  className="pd-prop-clear"
                  onClick={() => void clearReminder()}
                  aria-label="Supprimer le rappel"
                >
                  <IconX size={12} />
                </button>
              )}
            </div>

            {/* Récurrence */}
            <div className="pd-prop">
              <span className="pd-prop-ico">
                <IconRepeat size={15} style={{ color: detail.recur_rule ? `var(--accent-text)` : undefined }} />
              </span>
              <span className="pd-prop-lbl">Récurrence</span>
              {editingRecur ? (
                <input
                  type="text"
                  className="pd-recur-input"
                  placeholder="FREQ=DAILY"
                  value={editRecur}
                  autoFocus
                  onChange={(e) => setEditRecur(e.target.value)}
                  onBlur={() => void saveRecur()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void saveRecur();
                    if (e.key === "Escape") { setEditingRecur(false); setEditRecur(detail.recur_rule ?? ""); }
                  }}
                />
              ) : (
                <span
                  className={"pd-prop-val " + (detail.recur_rule ? "" : "faint")}
                  role="button"
                  tabIndex={0}
                  style={detail.recur_rule ? { color: "var(--accent-text)", fontFamily: "var(--font-mono)", fontSize: "12.5px" } : {}}
                  onClick={() => setEditingRecur(true)}
                  onKeyDown={(e) => e.key === "Enter" && setEditingRecur(true)}
                >
                  {detail.recur_rule ?? "Aucune"}
                </span>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="pd-props" style={{ paddingTop: 4 }}>
            <div className="pd-prop" style={{ borderTop: "1px solid var(--border)", borderBottom: "none" }}>
              <span className="pd-prop-ico">
                <IconTag size={15} style={{ color: detail.tags.length ? "var(--accent-text)" : undefined }} />
              </span>
              <span className="pd-prop-lbl">Tags</span>
              <div className="pd-tags-row">
                {detail.tags.map((tag) => (
                  <span key={tag} className="pd-tag">
                    #{tag}
                    <button
                      type="button"
                      className="pd-tag-del"
                      aria-label={`Supprimer le tag ${tag}`}
                      onClick={() => void removeTagHandler(tag)}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {showTagInput ? (
                  <input
                    ref={tagInputRef}
                    type="text"
                    className="pd-tag-input"
                    placeholder="#tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onBlur={() => void addTagHandler()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void addTagHandler();
                      if (e.key === "Escape") { setShowTagInput(false); setNewTag(""); }
                    }}
                  />
                ) : (
                  <button type="button" className="pd-tag-add" onClick={() => setShowTagInput(true)}>
                    + ajouter
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="pd-sep" />

          {/* Notes */}
          <div className="pd-sec-head">
            <IconAlignLeft size={12} style={{ color: "var(--fg-subtle)" }} />
            <span className="pd-sec-lbl">Notes</span>
          </div>
          <textarea
            className="pd-note"
            placeholder="Ajouter des notes…"
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            onBlur={() => void saveNote()}
          />

          {/* Sous-tâches */}
          <div className="pd-sec-head">
            <IconCornerDownRight size={12} style={{ color: "var(--fg-subtle)" }} />
            <span className="pd-sec-lbl">Sous-tâches</span>
            {detail.subtasks.length > 0 && (
              <span className="pd-sec-badge">
                {doneSubs}/{detail.subtasks.length}
              </span>
            )}
          </div>
          <div className="pd-subs">
            {detail.subtasks.map((s) => (
              <div className="pd-sub" key={s.id}>
                <Checkbox
                  done={s.done}
                  size={17}
                  onToggle={() => void toggleSubtaskHandler(s.id)}
                />
                <span className={"pd-sub-title" + (s.done ? " done" : "")}>{s.title}</span>
                <button
                  type="button"
                  className="pd-sub-del"
                  aria-label="Supprimer la sous-tâche"
                  onClick={() => void deleteSubtaskHandler(s.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="pd-sub-add">
            <IconPlus size={13} style={{ color: "var(--fg-faint)", flex: "none" }} />
            <input
              type="text"
              className="pd-sub-add-input"
              placeholder="Ajouter une sous-tâche"
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addSubtaskHandler();
              }}
              onBlur={() => void addSubtaskHandler()}
            />
          </div>

          {/* Pied */}
          <div className="pd-footer">
            <span className="pd-created">Créée le {formatCreatedAt(detail.created_at)}</span>
            {deleteConfirm ? (
              <div className="pd-del-confirm">
                <span>Supprimer ?</span>
                <button type="button" className="pd-del-yes" onClick={() => void deleteTaskHandler()}>
                  Oui
                </button>
                <button type="button" className="pd-del-no" onClick={() => setDeleteConfirm(false)}>
                  Non
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="pd-del-btn"
                onClick={() => setDeleteConfirm(true)}
              >
                <IconTrash size={13} />
                Supprimer
              </button>
            )}
          </div>
        </div>
      </>
    );

  }

  return (
    <>
      <div
        className="pd-mob-back"
        onClick={onClose}
        role="presentation"
        aria-hidden
      />
      <div
        className="pd-panel"
        role="complementary"
        aria-label="Détail de la tâche"
      >
        <div className="pd-grip" />
        {renderContent()}
      </div>
    </>
  );
}

/* ── Helper ── */
function mapSub(s: DetailSubtask): Subtask {
  return { id: s.id, title: s.title, done: s.done };
}
