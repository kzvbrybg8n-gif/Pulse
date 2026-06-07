"use client";

import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  IconBell,
  IconCalendar,
  IconRepeat,
  IconSparkles,
  IconTag,
  IconX,
} from "@/components/icons";
import { PriorityFlag } from "@/components/ui/PriorityFlag";
import { RecurrencePicker } from "@/components/ui/RecurrencePicker";
import { ensurePushSubscribed } from "@/components/ui/PushManager";
import { createClient } from "@/lib/supabase/client";
import { formatDueLabel } from "@/lib/tasks/fromDb";
import {
  MOMENTS,
  MOMENT_LABEL,
  isoWithMoment,
  momentFromIso,
  type Moment,
} from "@/lib/tasks/moment";
import { describeRecurrence } from "@/lib/recurrence";
import { parseQuickAdd } from "@/lib/parseQuickAdd";
import type { Priority, Task } from "@/lib/types";

/* ============================================================
   Saisie rapide — Composant Client
   Le parsing en langage naturel reste actif (échéance, priorité,
   tags détectés dans le texte). En complément, une rangée de
   contrôles toujours visible permet de régler manuellement chaque
   propriété. Règle de fusion : un réglage manuel l'emporte sur la
   valeur détectée dans le texte.
   ============================================================ */

const PRIO_LABELS: Record<Priority, string> = {
  1: "Urgente",
  2: "Haute",
  3: "Moyenne",
  4: "Aucune",
};

function recurLabel(rule: string): string {
  return describeRecurrence(rule);
}

/** datetime-local (valeur de l'input) → ISO UTC, ou null si vide. */
function localToIso(local: string): string | null {
  if (!local) return null;
  return new Date(local).toISOString();
}

/** Échéance en retard ? Jugé au jour (l'heure n'est qu'un moment). */
function isLateDay(iso: string | null, now: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const dueDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return dueDay < today;
}

/** ISO UTC → valeur d'input date (heure locale, "YYYY-MM-DD"). */
function isoToDateInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Valeurs effectives de la tâche : le manuel l'emporte sur le détecté. */
type Effective = {
  title: string;
  dueIso: string | null;
  prio: Priority;
  tags: string[];
  recur: string | null;
  remindIso: string | null;
};

async function findOrCreateTag(
  supabase: SupabaseClient,
  userId: string,
  tagName: string,
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("tags")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", tagName)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data: created } = await supabase
    .from("tags")
    .insert({ user_id: userId, name: tagName.toLowerCase() })
    .select("id")
    .single();
  return (created as { id: string } | null)?.id ?? null;
}

type Panel = "prio" | "due" | "recur" | "remind" | "tags" | null;

type Props = {
  userId: string;
  listId?: string | null;
  onAdd?: (task: Task) => void;
  defaultValue?: string;
};

export function QuickAdd({ userId, listId = null, onAdd, defaultValue = "" }: Props) {
  const [supabase] = useState(() => createClient());
  const [text, setText] = useState(defaultValue);
  const [submitting, setSubmitting] = useState(false);

  // Réglages manuels — `null`/`false` = « laisser le parsing décider ».
  const [prioOverride, setPrioOverride] = useState<Priority | null>(null);
  const [dueSet, setDueSet] = useState(false);
  const [dueValue, setDueValue] = useState(""); // "YYYY-MM-DD"
  const [dueMoment, setDueMoment] = useState<Moment | null>(null);
  const [recurValue, setRecurValue] = useState("");
  const [remindSet, setRemindSet] = useState(false);
  const [remindValue, setRemindValue] = useState("");
  const [manualTags, setManualTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [panel, setPanel] = useState<Panel>(null);

  const parsed = useMemo(() => parseQuickAdd(text), [text]);

  // Fusion détecté + manuel (manuel prioritaire).
  const eff: Effective = useMemo(() => {
    const tags = Array.from(new Set([...parsed.tags, ...manualTags]));
    return {
      title: parsed.title,
      dueIso: dueSet
        ? dueValue
          ? isoWithMoment(new Date(`${dueValue}T00:00:00`), dueMoment)
          : null
        : parsed.due_at,
      prio: prioOverride ?? parsed.prio,
      tags,
      recur: recurValue.trim() || null,
      remindIso: remindSet ? localToIso(remindValue) : null,
    };
  }, [parsed, manualTags, dueSet, dueValue, dueMoment, prioOverride, recurValue, remindSet, remindValue]);

  const active = text.trim().length > 0;
  const now = new Date();
  const dueLabel = eff.dueIso ? formatDueLabel(eff.dueIso, now) : null;
  const remindLabel = eff.remindIso ? formatDueLabel(eff.remindIso, now) : null;

  function resetControls() {
    setPrioOverride(null);
    setDueSet(false);
    setDueValue("");
    setDueMoment(null);
    setRecurValue("");
    setRemindSet(false);
    setRemindValue("");
    setManualTags([]);
    setTagDraft("");
    setPanel(null);
  }

  function togglePanel(p: Exclude<Panel, null>) {
    setPanel((cur) => (cur === p ? null : p));
  }

  function addTagDraft() {
    const name = tagDraft.trim().toLowerCase().replace(/^#/, "");
    if (name && !eff.tags.includes(name)) {
      setManualTags((ts) => [...ts, name]);
    }
    setTagDraft("");
  }

  function removeManualTag(name: string) {
    setManualTags((ts) => ts.filter((t) => t !== name));
  }

  async function handleSubmit() {
    if (!eff.title || submitting) return;

    setSubmitting(true);
    try {
      // 1. Insérer la tâche
      const { data: inserted, error: taskError } = await supabase
        .from("tasks")
        .insert({
          user_id: userId,
          list_id: listId,
          title: eff.title,
          status: "open",
          prio: eff.prio,
          due_at: eff.dueIso,
          recur_rule: eff.recur,
          order_index: 0,
        })
        .select("id, created_at")
        .single();

      if (taskError || !inserted) {
        console.error("Échec création tâche", taskError);
        return;
      }

      const taskId = (inserted as { id: string }).id;

      // 2. Tags : trouver ou créer, puis lier
      for (const tagName of eff.tags) {
        const tagId = await findOrCreateTag(supabase, userId, tagName);
        if (!tagId) continue;
        await supabase
          .from("task_tags")
          .upsert({ task_id: taskId, tag_id: tagId, user_id: userId }, { ignoreDuplicates: true });
      }

      // 3. Rappel optionnel
      let reminderOk = false;
      if (eff.remindIso) {
        await ensurePushSubscribed();
        const { error: remErr } = await supabase.from("reminders").insert({
          user_id: userId,
          task_id: taskId,
          remind_at: eff.remindIso,
        });
        reminderOk = !remErr;
        if (remErr) console.error("Échec création rappel", remErr);
      }

      // 4. Construire l'objet Task pour la mise à jour locale
      const task: Task = {
        id: taskId,
        title: eff.title,
        done: false,
        prio: eff.prio,
        due: formatDueLabel(eff.dueIso, now),
        dueAt: eff.dueIso,
        late: isLateDay(eff.dueIso, now),
        tags: eff.tags,
        recur: eff.recur,
        reminder: reminderOk,
        remindAt: reminderOk ? eff.remindIso : null,
        note: false,
        subtasks: [],
        expanded: false,
      };

      setText("");
      resetControls();
      onAdd?.(task);
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <div className={"pk-qa" + (active ? " active" : "")}>
      <div className="pk-qa-line">
        <span className="pk-qa-spark">
          <IconSparkles size={18} />
        </span>
        <input
          className="pk-qa-input"
          value={text}
          aria-label="Ajouter une tâche"
          placeholder="Relire le mémo demain 14h !! #client"
          disabled={submitting}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {active && (
          <button
            type="button"
            className="pk-qa-go"
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? "…" : "Ajouter"}
          </button>
        )}
      </div>

      {/* Rangée de contrôles manuels — toujours visible */}
      <div className="pk-qa-tools">
        <button
          type="button"
          className={
            "pk-qa-tool" + (eff.prio < 4 ? " set" : "") + (panel === "prio" ? " open" : "")
          }
          onClick={() => togglePanel("prio")}
        >
          <PriorityFlag prio={eff.prio} size={14} />
          <span>{eff.prio < 4 ? PRIO_LABELS[eff.prio] : "Priorité"}</span>
        </button>

        <button
          type="button"
          className={
            "pk-qa-tool" + (eff.dueIso ? " set" : "") + (panel === "due" ? " open" : "")
          }
          onClick={() => {
            if (eff.dueIso && !dueSet) {
              setDueValue(isoToDateInput(eff.dueIso));
              setDueMoment(momentFromIso(eff.dueIso));
              setDueSet(true);
            }
            togglePanel("due");
          }}
        >
          <IconCalendar size={14} />
          <span>{dueLabel ?? "Échéance"}</span>
        </button>

        <button
          type="button"
          className={
            "pk-qa-tool" + (eff.recur ? " set" : "") + (panel === "recur" ? " open" : "")
          }
          onClick={() => togglePanel("recur")}
        >
          <IconRepeat size={14} />
          <span>{eff.recur ? recurLabel(eff.recur) : "Récurrence"}</span>
        </button>

        <button
          type="button"
          className={
            "pk-qa-tool" + (eff.remindIso ? " set" : "") + (panel === "remind" ? " open" : "")
          }
          onClick={() => togglePanel("remind")}
        >
          <IconBell size={14} />
          <span>{remindLabel ?? "Rappel"}</span>
        </button>

        <button
          type="button"
          className={
            "pk-qa-tool" + (eff.tags.length ? " set" : "") + (panel === "tags" ? " open" : "")
          }
          onClick={() => togglePanel("tags")}
        >
          <IconTag size={14} />
          <span>
            {eff.tags.length ? `${eff.tags.length} tag${eff.tags.length > 1 ? "s" : ""}` : "Tags"}
          </span>
        </button>
      </div>

      {/* Panneau d'édition du contrôle ouvert */}
      {panel === "prio" && (
        <div className="pk-qa-panel">
          <div className="pd-prio-row">
            {([1, 2, 3, 4] as Priority[]).map((p) => (
              <button
                key={p}
                type="button"
                className={"pd-prio-btn" + (eff.prio === p ? " sel" : "")}
                aria-label={`Priorité ${p}`}
                onClick={() => {
                  setPrioOverride(p);
                  setPanel(null);
                }}
              >
                <PriorityFlag prio={p} size={14} />
              </button>
            ))}
          </div>
          {prioOverride !== null && (
            <button type="button" className="pk-qa-reset" onClick={() => setPrioOverride(null)}>
              Auto
            </button>
          )}
        </div>
      )}

      {panel === "due" && (
        <div className="pk-qa-panel">
          <input
            type="date"
            className="pd-due-input"
            value={dueValue}
            autoFocus
            onChange={(e) => {
              setDueValue(e.target.value);
              setDueSet(true);
            }}
          />
          <div className="pd-moment-row" role="group" aria-label="Moment de la journée">
            {MOMENTS.map((m) => (
              <button
                key={m}
                type="button"
                className={"pd-moment-btn" + (dueMoment === m ? " sel" : "")}
                onClick={() => {
                  setDueMoment((cur) => (cur === m ? null : m));
                  setDueSet(true);
                }}
              >
                {MOMENT_LABEL[m]}
              </button>
            ))}
          </div>
          {dueSet && (
            <button
              type="button"
              className="pk-qa-reset"
              onClick={() => {
                setDueSet(false);
                setDueValue("");
                setDueMoment(null);
              }}
            >
              Auto
            </button>
          )}
        </div>
      )}

      {panel === "recur" && (
        <div className="pk-qa-panel">
          <RecurrencePicker
            value={recurValue || null}
            onChange={(rule) => setRecurValue(rule ?? "")}
            referenceDate={eff.dueIso ? new Date(eff.dueIso) : null}
          />
        </div>
      )}

      {panel === "remind" && (
        <div className="pk-qa-panel">
          <input
            type="datetime-local"
            className="pd-due-input"
            value={remindValue}
            autoFocus
            onChange={(e) => {
              setRemindValue(e.target.value);
              setRemindSet(true);
            }}
          />
          {remindSet && (
            <button
              type="button"
              className="pk-qa-reset"
              onClick={() => {
                setRemindSet(false);
                setRemindValue("");
              }}
            >
              Effacer
            </button>
          )}
        </div>
      )}

      {panel === "tags" && (
        <div className="pk-qa-panel pk-qa-panel-tags">
          {eff.tags.map((tag) => {
            const manual = manualTags.includes(tag);
            return (
              <span key={tag} className="pk-tag">
                #{tag}
                {manual && (
                  <button
                    type="button"
                    className="pk-qa-tag-del"
                    aria-label={`Retirer le tag ${tag}`}
                    onClick={() => removeManualTag(tag)}
                  >
                    <IconX size={11} />
                  </button>
                )}
              </span>
            );
          })}
          <input
            type="text"
            className="pd-tag-input"
            placeholder="#tag"
            value={tagDraft}
            autoFocus
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTagDraft();
              }
            }}
            onBlur={addTagDraft}
          />
        </div>
      )}
    </div>
  );
}
