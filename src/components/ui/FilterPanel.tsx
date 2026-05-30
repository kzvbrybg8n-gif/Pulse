"use client";

import { useEffect, useState } from "react";
import { IconX } from "@/components/icons";
import { PriorityFlag } from "@/components/ui/PriorityFlag";
import { createClient } from "@/lib/supabase/client";
import { deleteFilter, upsertFilter, type FilterSpec } from "@/lib/filters";
import type { Priority } from "@/lib/types";

type Props = {
  initialSpec: FilterSpec | null;
  onSave: (spec: FilterSpec) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

export function FilterPanel({ initialSpec, onSave, onDelete, onClose }: Props) {
  const [supabase] = useState(() => createClient());
  const [name, setName] = useState(initialSpec?.name ?? "");
  const [selectedTags, setSelectedTags] = useState<string[]>(initialSpec?.tags ?? []);
  const [selectedPrios, setSelectedPrios] = useState<Priority[]>(initialSpec?.priorities ?? []);
  const [dueAfter, setDueAfter] = useState(initialSpec?.dueAfter ?? "");
  const [dueBefore, setDueBefore] = useState(initialSpec?.dueBefore ?? "");
  const [showNoDue, setShowNoDue] = useState(initialSpec?.showNoDue ?? false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    supabase
      .from("tags")
      .select("name")
      .order("name")
      .then(({ data }) => {
        setAvailableTags((data ?? []).map((t) => (t as { name: string }).name));
      });
  }, [supabase]);

  function toggleTag(tagName: string) {
    setSelectedTags((ts) =>
      ts.includes(tagName) ? ts.filter((t) => t !== tagName) : [...ts, tagName],
    );
  }

  function togglePrio(p: Priority) {
    setSelectedPrios((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]));
  }

  function handleSave() {
    if (!name.trim()) return;
    const spec: FilterSpec = {
      id: initialSpec?.id ?? crypto.randomUUID(),
      name: name.trim(),
      ...(selectedTags.length > 0 && { tags: selectedTags }),
      ...(selectedPrios.length > 0 && { priorities: selectedPrios }),
      ...(dueAfter && { dueAfter }),
      ...(dueBefore && { dueBefore }),
      ...(showNoDue && { showNoDue: true }),
    };
    upsertFilter(spec);
    onSave(spec);
  }

  function handleDelete() {
    if (!initialSpec) return;
    deleteFilter(initialSpec.id);
    onDelete(initialSpec.id);
  }

  return (
    <>
      <div className="pd-mob-back" onClick={onClose} role="presentation" />
      <div
        className="pd-panel"
        role="dialog"
        aria-modal
        aria-label={initialSpec ? "Modifier le filtre" : "Nouveau filtre"}
      >
        <div className="pd-grip" />

        {/* En-tête */}
        <div className="pd-head">
          <span
            style={{
              flex: 1,
              fontFamily: "var(--font-serif)",
              fontSize: 18,
              fontWeight: 400,
              color: "var(--fg)",
            }}
          >
            {initialSpec ? "Modifier le filtre" : "Nouveau filtre"}
          </span>
          <div className="pd-head-actions">
            <button
              type="button"
              className="fp-close-btn"
              onClick={onClose}
              aria-label="Fermer"
            >
              <IconX size={17} />
            </button>
          </div>
        </div>

        {/* Corps */}
        <div className="pd-body">
          {/* Nom */}
          <div className="fp-section">
            <div className="fp-label">Nom</div>
            <input
              className="fp-name-input"
              type="text"
              placeholder="Nom du filtre…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Priorité */}
          <div className="fp-section">
            <div className="fp-label">Priorité</div>
            <div className="fp-prio-row">
              {([1, 2, 3, 4] as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={"fp-prio-btn" + (selectedPrios.includes(p) ? " sel" : "")}
                  onClick={() => togglePrio(p)}
                >
                  <PriorityFlag prio={p} size={13} />
                  P{p}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          {availableTags.length > 0 && (
            <div className="fp-section">
              <div className="fp-label">Tags</div>
              <div className="fp-tags-list">
                {availableTags.map((tagName) => (
                  <label key={tagName} className="fp-tag-row">
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tagName)}
                      onChange={() => toggleTag(tagName)}
                    />
                    <span className="fp-tag-name">#{tagName}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Échéance */}
          <div className="fp-section">
            <div className="fp-label">Échéance</div>
            <div className="fp-date-row">
              <span className="fp-date-lbl">Après</span>
              <input
                type="date"
                className="fp-date-input"
                value={dueAfter}
                onChange={(e) => setDueAfter(e.target.value)}
              />
            </div>
            <div className="fp-date-row">
              <span className="fp-date-lbl">Avant</span>
              <input
                type="date"
                className="fp-date-input"
                value={dueBefore}
                onChange={(e) => setDueBefore(e.target.value)}
              />
            </div>
            <label className="fp-toggle-row">
              <input
                type="checkbox"
                checked={showNoDue}
                onChange={(e) => setShowNoDue(e.target.checked)}
              />
              <span className="fp-toggle-lbl">Inclure les tâches sans date</span>
            </label>
          </div>
        </div>

        {/* Pied de page */}
        <div className="pd-footer">
          {deleteConfirm ? (
            <div className="pd-del-confirm">
              <span>Supprimer ?</span>
              <button type="button" className="pd-del-yes" onClick={handleDelete}>
                Oui
              </button>
              <button
                type="button"
                className="pd-del-no"
                onClick={() => setDeleteConfirm(false)}
              >
                Non
              </button>
            </div>
          ) : (
            <>
              {initialSpec && (
                <button
                  type="button"
                  className="pd-del-btn"
                  onClick={() => setDeleteConfirm(true)}
                >
                  Supprimer
                </button>
              )}
              <button
                type="button"
                className="fp-save-btn"
                onClick={handleSave}
                disabled={!name.trim()}
              >
                Enregistrer
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
