"use client";

import { useRef, useState } from "react";
import { IconCheck, IconMore } from "@/components/icons";
import type { Habit } from "@/lib/types";

const PERIOD_LABELS: Record<string, string> = {
  day: "Quotidien",
  week: "Hebdomadaire",
  month: "Mensuel",
};

type Props = {
  habit: Habit;
  onToggle: (id: string) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (id: string) => void;
};

export function HabitRow({ habit, onToggle, onEdit, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  function closeMenu() {
    setMenuOpen(false);
    setDeleteConfirm(false);
  }

  const freqLabel =
    habit.targetPerPeriod > 1
      ? `${habit.targetPerPeriod}× / ${PERIOD_LABELS[habit.period]?.toLowerCase()}`
      : PERIOD_LABELS[habit.period] ?? habit.period;

  return (
    <div className="hb-row">
      {/* Name + frequency */}
      <div className="hb-info">
        <div className="hb-name">{habit.name}</div>
        <div className="hb-freq">{freqLabel}</div>
      </div>

      {/* Mini-calendar: 7 dots */}
      <div className="hb-dots" aria-hidden>
        {habit.weekDots.map((done, i) => (
          <span
            key={i}
            className={
              "hb-dot" + (done ? " done" : "") + (i === 6 ? " today" : "")
            }
          />
        ))}
      </div>

      {/* Streak */}
      <span className={"hb-streak" + (habit.streak > 0 ? " active" : "")}>
        {habit.streak > 0 ? `${habit.streak}🔥` : "—"}
      </span>

      {/* Check-in button */}
      <button
        type="button"
        className={"hb-check-btn" + (habit.checkedToday ? " done" : "")}
        onClick={() => onToggle(habit.id)}
        aria-label={habit.checkedToday ? "Décocher" : "Cocher pour aujourd'hui"}
      >
        <IconCheck size={14} />
      </button>

      {/* Context menu */}
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          type="button"
          className="hb-more-btn"
          onClick={() => {
            setMenuOpen((o) => !o);
            setDeleteConfirm(false);
          }}
          aria-label="Options"
        >
          <IconMore size={16} />
        </button>

        {menuOpen && (
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 49 }}
              onClick={closeMenu}
              role="presentation"
            />
            <div className="hb-menu">
              {deleteConfirm ? (
                <div className="hb-del-confirm" style={{ padding: "8px 14px" }}>
                  <span className="hb-del-label">Supprimer ?</span>
                  <button
                    type="button"
                    className="hb-del-yes"
                    onClick={() => {
                      onDelete(habit.id);
                      closeMenu();
                    }}
                  >
                    Oui
                  </button>
                  <button
                    type="button"
                    className="hb-del-no"
                    onClick={() => setDeleteConfirm(false)}
                  >
                    Non
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="hb-menu-item"
                    onClick={() => {
                      onEdit(habit);
                      closeMenu();
                    }}
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    className="hb-menu-item danger"
                    onClick={() => setDeleteConfirm(true)}
                  >
                    Supprimer
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
