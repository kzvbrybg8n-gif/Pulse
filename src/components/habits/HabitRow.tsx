"use client";

import { useEffect, useRef, useState } from "react";
import { IconCheck, IconFlame, IconMore, IconPencil, IconRepeat, IconTrash } from "@/components/icons";
import type { Habit } from "@/lib/types";

const PERIOD_LABELS: Record<string, string> = {
  day: "Quotidien",
  week: "Hebdomadaire",
  month: "Mensuel",
};

/** Au-delà de ce seuil, la série est mise en valeur avec un badge doré. */
const GOLD_STREAK_THRESHOLD = 21;

type Props = {
  habit: Habit;
  selected?: boolean;
  onToggle: (id: string) => void;
  onEdit: (habit: Habit) => void;
  onOpen: (habit: Habit) => void;
  onDelete: (id: string) => void;
};

/** Mini-calendrier : 7 points alignés (J-6 → aujourd'hui). */
function MiniCal({ days }: { days: boolean[] }) {
  return (
    <div className="hb-minical" aria-hidden="true">
      {days.map((done, i) => (
        <span key={i} className={"hb-dot" + (done ? " done" : " missed")} />
      ))}
    </div>
  );
}

/** Série : badge doré au-delà du seuil, sinon flamme + nombre. */
function StreakBadge({ streak }: { streak: number }) {
  if (streak >= GOLD_STREAK_THRESHOLD) {
    return (
      <div className="hb-streak-gold" aria-label={`Belle série de ${streak} jours`}>
        <IconFlame size={12} />
        <span>{streak} jours</span>
      </div>
    );
  }
  const has = streak > 0;
  return (
    <div className="hb-streak" aria-label={has ? `Série de ${streak} jours` : "Aucune série"}>
      <IconFlame size={14} style={{ color: has ? "var(--accent)" : "var(--fg-faint)" }} />
      <span className={"hb-streak-num" + (has ? " active" : "")}>{has ? `${streak} j` : "—"}</span>
    </div>
  );
}

export function HabitRow({ habit, selected, onToggle, onEdit, onOpen, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const done = habit.checkedToday;

  const freqLabel =
    habit.targetPerPeriod > 1
      ? `${habit.targetPerPeriod}× / ${PERIOD_LABELS[habit.period]?.toLowerCase()}`
      : PERIOD_LABELS[habit.period] ?? habit.period;

  // Fermeture du menu contextuel au clic extérieur ou sur Échap
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div className={"hb-row" + (done ? " done-row" : "") + (selected ? " is-selected" : "")}>
      {/* Icône de l'habitude */}
      <div className={"hb-icon" + (done ? " done-icon" : "")}>
        <IconRepeat size={16} />
      </div>

      {/* Nom + fréquence — ouvre le panneau de statistiques */}
      <button
        type="button"
        className="hb-info hb-open"
        onClick={() => onOpen(habit)}
        aria-label={`Voir les statistiques de ${habit.name}`}
      >
        <div className="hb-name">{habit.name}</div>
        <div className="hb-freq">{freqLabel}</div>
      </button>

      {/* Mini-calendrier 7 jours */}
      <MiniCal days={habit.weekDots} />

      {/* Série */}
      <StreakBadge streak={habit.streak} />

      {/* Bouton de check-in du jour */}
      <button
        type="button"
        className={"hb-check-btn" + (done ? " done" : "")}
        onClick={() => onToggle(habit.id)}
        aria-pressed={done}
        aria-label={done ? "Décocher pour aujourd'hui" : "Cocher pour aujourd'hui"}
      >
        <IconCheck size={13} />
      </button>

      {/* Menu … (Modifier / Supprimer) */}
      <div className="hb-row-actions" ref={actionsRef}>
        <button
          type="button"
          className="hb-more-btn"
          onClick={() => setMenuOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Plus d'options"
        >
          <IconMore size={16} />
        </button>
        {menuOpen && (
          <div className="hb-menu" role="menu">
            <button
              type="button"
              className="hb-menu-item"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onEdit(habit);
              }}
            >
              <IconPencil size={13} />
              Modifier
            </button>
            <button
              type="button"
              className="hb-menu-item hb-menu-item--danger"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onDelete(habit.id);
              }}
            >
              <IconTrash size={13} />
              Supprimer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
