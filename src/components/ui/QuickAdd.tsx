"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { IconSparkles } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { formatDueLabel } from "@/lib/tasks/fromDb";
import { parseQuickAdd } from "@/lib/parseQuickAdd";
import type { Task } from "@/lib/types";

type DetectedToken = {
  kind: "date" | "prio" | "tag";
  label: string;
  sig?: boolean;
};

const PRIO_LABELS: Record<number, string> = { 1: "urgent", 2: "haute", 3: "moyenne" };

function buildTokens(text: string): DetectedToken[] {
  if (!text.trim()) return [];
  const result = parseQuickAdd(text);
  const tokens: DetectedToken[] = [];

  if (result.due_at) {
    const label = formatDueLabel(result.due_at, new Date()) ?? result.due_at;
    tokens.push({ kind: "date", label: "échéance · " + label });
  }
  if (result.prio < 4) {
    tokens.push({
      kind: "prio",
      label: "priorité · " + PRIO_LABELS[result.prio],
      sig: result.prio === 1,
    });
  }
  for (const tag of result.tags) {
    tokens.push({ kind: "tag", label: "tag · #" + tag });
  }
  return tokens;
}

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

  const tokens = buildTokens(text);
  const active = text.trim().length > 0;

  async function handleSubmit() {
    const raw = text.trim();
    if (!raw || submitting) return;

    const result = parseQuickAdd(raw);
    if (!result.title) return;

    setSubmitting(true);
    try {
      // 1. Insérer la tâche
      const { data: inserted, error: taskError } = await supabase
        .from("tasks")
        .insert({
          user_id: userId,
          list_id: listId,
          title: result.title,
          status: "open",
          prio: result.prio,
          due_at: result.due_at,
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
      for (const tagName of result.tags) {
        const tagId = await findOrCreateTag(supabase, userId, tagName);
        if (!tagId) continue;
        await supabase
          .from("task_tags")
          .upsert({ task_id: taskId, tag_id: tagId, user_id: userId }, { ignoreDuplicates: true });
      }

      // 3. Construire l'objet Task pour la mise à jour locale
      const now = new Date();
      const task: Task = {
        id: taskId,
        title: result.title,
        done: false,
        prio: result.prio,
        due: formatDueLabel(result.due_at, now),
        dueAt: result.due_at,
        late: Boolean(result.due_at && new Date(result.due_at) < now),
        tags: result.tags,
        recur: null,
        reminder: false,
        note: false,
        subtasks: [],
        expanded: false,
      };

      setText("");
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
          placeholder="Relire le mémo demain 14h !urgent #client"
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
      {active && tokens.length > 0 && (
        <div className="pk-qa-detected">
          <span className="pk-qa-dlab">DÉTECTÉ</span>
          {tokens.map((t, i) => (
            <span key={i} className={"pk-qa-tok " + t.kind + (t.sig ? " sig" : "")}>
              {t.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
