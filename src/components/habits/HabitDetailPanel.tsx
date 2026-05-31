"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IconCheck,
  IconChevronRight,
  IconPencil,
  IconRepeat,
  IconSparkles,
  IconX,
} from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { localDateStr } from "@/lib/habits/streak";
import type { Habit } from "@/lib/types";

const MONTH_FMT = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const DOW_LABELS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

type Props = {
  habit: Habit;
  onClose: () => void;
  onEdit: (habit: Habit) => void;
};

type CalCell = {
  key: string;
  dayNum: number;
  inMonth: boolean;
  checked: boolean;
  isToday: boolean;
};

function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function HabitDetailPanel({ habit, onClose, onEdit }: Props) {
  const [supabase] = useState(() => createClient());
  const [logSet, setLogSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<Date>(() => firstOfMonth(new Date()));

  // Charge tout l'historique de l'habitude (jeu de données réduit) ;
  // re-fetch quand on coche/décoche le jour pour rester synchrone.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void supabase
      .from("habit_logs")
      .select("day")
      .eq("habit_id", habit.id)
      .then(({ data }) => {
        if (cancelled) return;
        setLogSet(new Set((data ?? []).map((r) => r.day as string)));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, habit.id, habit.checkedToday]);

  const todayStr = localDateStr(new Date());

  // Statistiques du mois affiché
  const stats = useMemo(() => {
    const y = month.getFullYear();
    const m = month.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    let monthCheckins = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      if (logSet.has(localDateStr(new Date(y, m, day)))) monthCheckins++;
    }

    const now = new Date();
    const isCurrentMonth = y === now.getFullYear() && m === now.getMonth();
    const isFutureMonth = new Date(y, m, 1) > firstOfMonth(now);
    // Dénominateur = jours écoulés (mois courant) ou mois entier (passé)
    const elapsed = isFutureMonth ? 0 : isCurrentMonth ? now.getDate() : daysInMonth;
    const rate = elapsed > 0 ? Math.round((monthCheckins / elapsed) * 100) : 0;

    return { monthCheckins, rate };
  }, [logSet, month]);

  // Grille du calendrier (6 semaines, lundi en tête)
  const cells = useMemo<CalCell[]>(() => {
    const y = month.getFullYear();
    const m = month.getMonth();
    const firstDow = (new Date(y, m, 1).getDay() + 6) % 7; // 0 = lundi
    const start = new Date(y, m, 1 - firstDow);

    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const ds = localDateStr(d);
      return {
        key: ds,
        dayNum: d.getDate(),
        inMonth: d.getMonth() === m,
        checked: logSet.has(ds),
        isToday: ds === todayStr,
      };
    });
  }, [month, logSet, todayStr]);

  function shiftMonth(delta: number) {
    setMonth((cur) => new Date(cur.getFullYear(), cur.getMonth() + delta, 1));
  }

  return (
    <>
      <div className="pd-mob-back" onClick={onClose} role="presentation" />
      <div className="pd-panel" role="dialog" aria-modal aria-label={`Statistiques — ${habit.name}`}>
        <div className="pd-grip" />

        <div className="pd-head">
          <span className="pd-head-title" style={{ fontFamily: "var(--font-serif)" }}>
            {habit.name}
          </span>
          <div className="pd-head-actions">
            <button
              type="button"
              className="pk-icon-btn sm"
              onClick={() => onEdit(habit)}
              aria-label="Modifier"
            >
              <IconPencil size={16} />
            </button>
            <button type="button" className="fp-close-btn" onClick={onClose} aria-label="Fermer">
              <IconX size={17} />
            </button>
          </div>
        </div>

        <div className="pd-body">
          {/* Cartes de statistiques */}
          <div className="hb-stats-grid">
            <StatCard
              icon={<IconCheck size={15} />}
              label="Pointage mensuel"
              value={stats.monthCheckins}
              unit={stats.monthCheckins > 1 ? "jours" : "jour"}
            />
            <StatCard
              icon={<IconSparkles size={15} />}
              label="Total des enregistrements"
              value={habit.totalDone}
              unit={habit.totalDone > 1 ? "jours" : "jour"}
            />
            <StatCard
              icon={<span className="hb-stat-glyph">%</span>}
              label="Taux de présence mensuel"
              value={stats.rate}
              unit="%"
            />
            <StatCard
              icon={<IconRepeat size={15} />}
              label="Série actuelle"
              value={habit.streak}
              unit={habit.streak > 1 ? "jours" : "jour"}
            />
          </div>

          {/* Calendrier mensuel */}
          <div className="hb-cal">
            <div className="hb-cal-head">
              <button
                type="button"
                className="hb-cal-nav"
                onClick={() => shiftMonth(-1)}
                aria-label="Mois précédent"
              >
                <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>
                  <IconChevronRight size={18} />
                </span>
              </button>
              <span className="hb-cal-month">{MONTH_FMT.format(month)}</span>
              <button
                type="button"
                className="hb-cal-nav"
                onClick={() => shiftMonth(1)}
                aria-label="Mois suivant"
              >
                <IconChevronRight size={18} />
              </button>
            </div>

            <div className="hb-cal-grid">
              {DOW_LABELS.map((d) => (
                <span key={d} className="hb-cal-dow">{d}</span>
              ))}
              {cells.map((c) => (
                <div
                  key={c.key}
                  className={
                    "hb-cal-cell" +
                    (c.inMonth ? "" : " is-out") +
                    (c.isToday ? " is-today" : "")
                  }
                >
                  <span className="hb-cal-num">{c.dayNum}</span>
                  <span className={"hb-cal-mark" + (c.checked ? " is-on" : "")}>
                    {c.checked && <IconCheck size={13} />}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Journal */}
          <div className="pd-sec-head">
            <span className="pd-sec-lbl">Journal des habitudes</span>
          </div>
          <p className="hb-journal-empty">
            {loading ? "Chargement…" : "Pas de note de check-in pour ce mois-ci."}
          </p>
        </div>
      </div>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="hb-stat-card">
      <div className="hb-stat-card-top">
        <span className="hb-stat-card-ico">{icon}</span>
        <span className="hb-stat-card-lbl">{label}</span>
      </div>
      <div className="hb-stat-card-val">
        {value}
        <span className="hb-stat-card-unit">{unit}</span>
      </div>
    </div>
  );
}
