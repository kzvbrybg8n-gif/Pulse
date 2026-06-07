"use client";

import { useState } from "react";
import { IconX } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { WEEKDAY_INITIALS, WEEKDAY_LABELS } from "@/lib/habits/schedule";
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
  const [weekdays, setWeekdays] = useState<number[]>(initialHabit?.weekdays ?? []);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Pour une habitude hebdomadaire à jours précis, l'objectif = nombre de jours.
  const sortedWeekdays = [...weekdays].sort((a, b) => a - b);
  const isWeekly = period === "week";
  const effectiveTarget = isWeekly ? Math.max(1, sortedWeekdays.length) : target;
  const dbWeekdays = isWeekly && sortedWeekdays.length > 0 ? sortedWeekdays : null;
  const canSave = name.trim().length > 0 && (!isWeekly || sortedWeekdays.length > 0);

  function toggleWeekday(d: number) {
    setWeekdays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setErrorMsg("");

    const now = new Date().toISOString();

    if (initialHabit) {
      const { error } = await supabase
        .from("habits")
        .update({
          name: name.trim(),
          period,
          target_per_period: effectiveTarget,
          weekdays: dbWeekdays,
          updated_at: now,
        })
        .eq("id", initialHabit.id);

      if (error) {
        setErrorMsg(error.message);
        setSaving(false);
        return;
      }

      onSave({
        ...initialHabit,
        name: name.trim(),
        period,
        targetPerPeriod: effectiveTarget,
        weekdays: dbWeekdays ?? [],
      });
    } else {
      const id = crypto.randomUUID();
      const { error } = await supabase.from("habits").insert({
        id,
        user_id: userId,
        name: name.trim(),
        period,
        target_per_period: effectiveTarget,
        weekdays: dbWeekdays,
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
        targetPerPeriod: effectiveTarget,
        weekdays: dbWeekdays ?? [],
        streak: 0,
        checkedToday: false,
        weekDots: [false, false, false, false, false, false, false],
        logDays: [],
        totalDone: 0,
        createdAt: now,
      });
    }

    setSaving(false);
  }

  function handleDelete() {
    if (!initialHabit) return;
    // La suppression en base (+ rollback) est centralisée dans HabitsView.handleDelete
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

        <div className="pd-body hb-modal-body">
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
                const next = e.target.value as HabitPeriod;
                setPeriod(next);
                if (next === "day") setTarget(1);
                if (next === "month" && target < 1) setTarget(1);
              }}
            >
              {PERIOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Jours de la semaine (si hebdomadaire) */}
          {period === "week" && (
            <div className="hb-field">
              <label className="hb-field-label">Jours de la semaine</label>
              <div className="hb-weekdays" role="group" aria-label="Jours de la semaine">
                {WEEKDAY_INITIALS.map((initial, d) => {
                  const active = weekdays.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      className={"hb-weekday" + (active ? " is-active" : "")}
                      onClick={() => toggleWeekday(d)}
                      aria-pressed={active}
                      aria-label={WEEKDAY_LABELS[d]}
                      title={WEEKDAY_LABELS[d]}
                    >
                      {initial}
                    </button>
                  );
                })}
              </div>
              {weekdays.length === 0 && (
                <div className="hb-field-hint">Choisis au moins un jour.</div>
              )}
            </div>
          )}

          {/* Cible (si mensuel) */}
          {period === "month" && (
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
                <span className="hb-target-lbl">fois par mois</span>
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
                disabled={!canSave || saving}
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
