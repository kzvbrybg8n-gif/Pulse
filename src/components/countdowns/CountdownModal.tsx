"use client";

import { useEffect, useRef, useState } from "react";
import { IconX } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import type {
  Countdown,
  CountdownRecurrence,
  CountdownType,
} from "@/lib/types";

// Presets de rappel ↔ valeur stockée en base (champ texte libre).
const REMINDER_OPTIONS: { label: string; value: string }[] = [
  { label: "Aucun", value: "" },
  { label: "Le jour même", value: "same_day" },
  { label: "Le jour même, 3 jours avant", value: "same_day,3_days_before" },
  { label: "1 semaine avant", value: "1_week_before" },
];

const RECURRENCE_OPTIONS: { label: string; value: CountdownRecurrence }[] = [
  { label: "Aucun", value: "none" },
  { label: "Quotidien", value: "daily" },
  { label: "Hebdomadaire", value: "weekly" },
  { label: "Mensuel", value: "monthly" },
  { label: "Annuel", value: "yearly" },
];

const TYPE_OPTIONS: { label: string; value: CountdownType }[] = [
  { label: "Compte à rebours", value: "countdown" },
  { label: "Compte à l'endroit", value: "countup" },
];

// Petit choix d'émojis pour l'icône (picker simple, sans librairie).
const ICON_CHOICES = [
  "🎯", "🎂", "✈️", "🎓", "💍", "🏖️",
  "🎄", "📅", "❤️", "🏆", "🚀", "📌",
];

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type Props = {
  initialCountdown: Countdown | null; // null = création
  userId: string;
  sortOrder: number; // position pour une nouvelle carte
  onSave: (countdown: Countdown) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

export function CountdownModal({
  initialCountdown,
  userId,
  sortOrder,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [supabase] = useState(() => createClient());
  const panelRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState(initialCountdown?.name ?? "");
  const [icon, setIcon] = useState<string | null>(initialCountdown?.icon ?? null);
  const [iconOpen, setIconOpen] = useState(false);
  const [targetDate, setTargetDate] = useState(
    initialCountdown?.targetDate ?? todayISO(),
  );
  const [reminder, setReminder] = useState(initialCountdown?.reminder ?? "");
  const [recurrence, setRecurrence] = useState<CountdownRecurrence>(
    initialCountdown?.recurrence ?? "none",
  );
  const [type, setType] = useState<CountdownType>(
    initialCountdown?.type ?? "countdown",
  );
  const [showInSmartList, setShowInSmartList] = useState(
    initialCountdown?.showInSmartList ?? false,
  );
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Échap pour fermer + piège de focus simple (accessibilité).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canSave = name.trim().length > 0 && targetDate !== "" && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setErrorMsg("");

    const trimmed = name.trim();
    const reminderValue = reminder === "" ? null : reminder;

    if (initialCountdown) {
      const { error } = await supabase
        .from("countdowns")
        .update({
          name: trimmed,
          icon,
          target_date: targetDate,
          type,
          reminder: reminderValue,
          recurrence,
          day_calc_mode: "standard",
          show_in_smart_list: showInSmartList,
        })
        .eq("id", initialCountdown.id);

      if (error) {
        setErrorMsg(error.message);
        setSaving(false);
        return;
      }

      onSave({
        ...initialCountdown,
        name: trimmed,
        icon,
        targetDate,
        type,
        reminder: reminderValue,
        recurrence,
        dayCalcMode: "standard",
        showInSmartList,
      });
    } else {
      const id = crypto.randomUUID();
      const { error } = await supabase.from("countdowns").insert({
        id,
        user_id: userId,
        name: trimmed,
        icon,
        target_date: targetDate,
        type,
        reminder: reminderValue,
        recurrence,
        day_calc_mode: "standard",
        show_in_smart_list: showInSmartList,
        sort_order: sortOrder,
      });

      if (error) {
        setErrorMsg(error.message);
        setSaving(false);
        return;
      }

      onSave({
        id,
        name: trimmed,
        icon,
        targetDate,
        type,
        reminder: reminderValue,
        recurrence,
        dayCalcMode: "standard",
        showInSmartList,
        sortOrder,
        createdAt: new Date().toISOString(),
      });
    }

    setSaving(false);
  }

  function handleDelete() {
    if (!initialCountdown) return;
    // La suppression (+ rollback) est centralisée dans CountdownsView.handleDelete.
    onDelete(initialCountdown.id);
  }

  return (
    <>
      <div className="pd-mob-back" onClick={onClose} role="presentation" />
      <div
        ref={panelRef}
        className="pd-panel"
        role="dialog"
        aria-modal
        aria-label={
          initialCountdown
            ? "Modifier le compte à rebours"
            : "Nouveau compte à rebours"
        }
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
            {initialCountdown ? "Modifier" : "Nouveau compte à rebours"}
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

        <div className="pd-body">
          {/* Icône + nom */}
          <div className="hb-field">
            <label className="hb-field-label" htmlFor="cd-name">
              Nom
            </label>
            <div className="cd-name-row">
              <div className="cd-icon-picker">
                <button
                  type="button"
                  className="cd-icon-btn"
                  onClick={() => setIconOpen((v) => !v)}
                  aria-label="Choisir une icône"
                >
                  {icon ?? "🙂"}
                </button>
                {iconOpen && (
                  <div className="cd-icon-pop">
                    <button
                      type="button"
                      className="cd-icon-none"
                      onClick={() => {
                        setIcon(null);
                        setIconOpen(false);
                      }}
                    >
                      Aucune
                    </button>
                    <div className="cd-icon-grid">
                      {ICON_CHOICES.map((choice) => (
                        <button
                          key={choice}
                          type="button"
                          className="cd-icon-opt"
                          onClick={() => {
                            setIcon(choice);
                            setIconOpen(false);
                          }}
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <input
                id="cd-name"
                className="hb-input"
                type="text"
                placeholder="Ex. Anniversaire…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Date cible */}
          <div className="hb-field">
            <label className="hb-field-label" htmlFor="cd-date">
              Date cible
            </label>
            <input
              id="cd-date"
              className="hb-input"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          {/* Rappel */}
          <div className="hb-field">
            <label className="hb-field-label" htmlFor="cd-reminder">
              Rappel
            </label>
            <select
              id="cd-reminder"
              className="hb-select"
              value={reminder}
              onChange={(e) => setReminder(e.target.value)}
            >
              {REMINDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Récurrence */}
          <div className="hb-field">
            <label className="hb-field-label" htmlFor="cd-recurrence">
              Récurrence
            </label>
            <select
              id="cd-recurrence"
              className="hb-select"
              value={recurrence}
              onChange={(e) =>
                setRecurrence(e.target.value as CountdownRecurrence)
              }
            >
              {RECURRENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div className="hb-field">
            <label className="hb-field-label" htmlFor="cd-type">
              Type
            </label>
            <select
              id="cd-type"
              className="hb-select"
              value={type}
              onChange={(e) => setType(e.target.value as CountdownType)}
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Mode de calcul (Standard seul actif) */}
          <div className="hb-field">
            <label className="hb-field-label" htmlFor="cd-mode">
              Mode de calcul des jours
            </label>
            <select id="cd-mode" className="hb-select" value="standard" disabled>
              <option value="standard">Standard</option>
            </select>
          </div>

          {/* Liste intelligente */}
          <div className="hb-field">
            <label className="cd-check">
              <input
                type="checkbox"
                checked={showInSmartList}
                onChange={(e) => setShowInSmartList(e.target.checked)}
              />
              <span>Afficher dans la liste intelligente</span>
            </label>
          </div>

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
              <button
                type="button"
                className="pd-del-yes"
                onClick={handleDelete}
                disabled={saving}
              >
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
              {initialCountdown && (
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
                disabled={!canSave}
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
