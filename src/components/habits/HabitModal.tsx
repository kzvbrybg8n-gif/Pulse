"use client";

import { useState } from "react";
import { IconX } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import type { Habit, HabitPeriod } from "@/lib/types";

type Props = {
  initialHabit: Habit | null;
  userId: string;
  onSave: (habit: Habit) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

const PERIOD_OPTIONS: { value: HabitPeriod; label: string }[] = [
  { value: "day", label: "Quotidien" },
  { value: "week", label: "Hebdomadaire" },
  { value: "month", label: "Mensuel" },
];

export function HabitModal({ initialHabit, userId, onSave, onDelete, onClose }: Props) {
  const [supabase] = useState(() => createClient());
  const [name, setName] = useState(initialHabit?.name ?? "");
  const [period, setPeriod] = useState<HabitPeriod>(initialHabit?.period ?? "day");
  const [target, setTarget] = useState(initialHabit?.targetPerPeriod ?? 1);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setErrorMsg("");

    const now = new Date().toISOString();

    if (initialHabit) {
      const { error } = await supabase
        .from("habits")
        .update({ name: name.trim(), period, target_per_period: target, updated_at: now })
        .eq("id", initialHabit.id);

      if (error) {
        setErrorMsg(error.message);
        setSaving(false);
        return;
      }

      onSave({ ...initialHabit, name: name.trim(), period, targetPerPeriod: target });
    } else {
      const id = crypto.randomUUID();
      const { error } = await supabase.from("habits").insert({
        id,
        user_id: userId,
        name: name.trim(),
        period,
        target_per_period: target,
      });

      if (error) {
        setErrorMsg(error.message);
        setSaving(false);
        return;
      }

      onSave({
        id,
        name: name.trim(),
        period,
        targetPerPeriod: target,
        streak: 0,
        checkedToday: false,
        weekDots: [false, false, false, false, false, false, false],
        totalDone: 0,
        createdAt: now,
      });
    }

    setSaving(false);
  }

  async function handleDelete() {
    if (!initialHabit) return;
    setSaving(true);
    const { error } = await supabase.from("habits").delete().eq("id", initialHabit.id);
    if (error) {
      setErrorMsg(error.message);
      setSaving(false);
      return;
    }
    onDelete(initialHabit.id);
  }

  return (
    <>
      <div className="pd-mob-back" onClick={onClose} role="presentation" />
      <div
        className="pd-panel"
        role="dialog"
        aria-modal
        aria-label={initialHabit ? "Modifier l'habitude" : "Nouvelle habitude"}
      >
        <div className="pd-grip" />

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
            {initialHabit ? "Modifier l'habitude" : "Nouvelle habitude"}
          </span>
          <div className="pd-head-actions">
            <button type="button" className="fp-close-btn" onClick={onClose} aria-label="Fermer">
              <IconX size={17} />
            </button>
          </div>
        </div>

        <div className="pd-body">
          {/* Nom */}
          <div className="hb-field">
            <label className="hb-field-label" htmlFor="hb-name">Nom</label>
            <input
              id="hb-name"
              className="hb-input"
              type="text"
              placeholder="Nom de l'habitude…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && !saving && void handleSave()}
            />
          </div>

          {/* Fréquence */}
          <div className="hb-field">
            <label className="hb-field-label" htmlFor="hb-period">Fréquence</label>
            <select
              id="hb-period"
              className="hb-select"
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value as HabitPeriod);
                if (e.target.value === "day") setTarget(1);
              }}
            >
              {PERIOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Cible (si non quotidien) */}
          {period !== "day" && (
            <div className="hb-field">
              <label className="hb-field-label">Objectif</label>
              <div className="hb-target-row">
                <input
                  className="hb-target-input"
                  type="number"
                  min={1}
                  max={99}
                  value={target}
                  onChange={(e) => setTarget(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
                <span className="hb-target-lbl">
                  fois par {period === "week" ? "semaine" : "mois"}
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div style={{ color: "var(--clay-1)", fontSize: 13, marginTop: 8 }}>
              {errorMsg}
            </div>
          )}
        </div>

        <div className="pd-footer">
          {deleteConfirm ? (
            <div className="pd-del-confirm">
              <span>Supprimer ?</span>
              <button type="button" className="pd-del-yes" onClick={handleDelete} disabled={saving}>
                Oui
              </button>
              <button type="button" className="pd-del-no" onClick={() => setDeleteConfirm(false)}>
                Non
              </button>
            </div>
          ) : (
            <>
              {initialHabit && (
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
                disabled={!name.trim() || saving}
              >
                {saving ? "…" : "Enregistrer"}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
