"use client";

import { useMemo } from "react";
import type { Countdown } from "@/lib/types";
import {
  formatElapsed,
  formatRemaining,
  parseDateOnly,
  type Remaining,
} from "@/lib/countdowns/format";

function formatTargetDate(value: string): string {
  // « YYYY-MM-DD » → « JJ/MM/AAAA » sans dépendre du fuseau.
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

/** Rend le grand chiffre en gros et les unités (« sem », « j », « m ») en petit. */
function BigValue({ remaining }: { remaining: Remaining }) {
  if (remaining.unit === "jour-J") {
    return <span className="cd-big cd-big--word">{remaining.value}</span>;
  }

  const parts = remaining.value.split(/(\d+)/).filter(Boolean);
  return (
    <span className="cd-big">
      {parts.map((part, i) =>
        /^\d+$/.test(part) ? (
          <span key={i} className="cd-big-num">
            {part}
          </span>
        ) : (
          <span key={i} className="cd-big-unit">
            {part}
          </span>
        ),
      )}
    </span>
  );
}

type Props = {
  countdown: Countdown;
  manageMode: boolean;
  isFirst: boolean;
  isLast: boolean;
  onOpen: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
};

export function CountdownCard({
  countdown,
  manageMode,
  isFirst,
  isLast,
  onOpen,
  onMoveUp,
  onMoveDown,
  onDelete,
}: Props) {
  const remaining = useMemo<Remaining>(() => {
    const target = parseDateOnly(countdown.targetDate);
    const today = new Date();
    return countdown.type === "countup"
      ? formatElapsed(target, today)
      : formatRemaining(target, today);
  }, [countdown.targetDate, countdown.type]);

  const subtitle =
    countdown.type === "countup"
      ? `Jours depuis le ${formatTargetDate(countdown.targetDate)}`
      : `Jours jusqu'à ${formatTargetDate(countdown.targetDate)}`;

  return (
    <div className="cd-card">
      <button
        type="button"
        className="cd-card-main"
        onClick={onOpen}
        aria-label={`Modifier ${countdown.name}`}
      >
        <div className="cd-card-head">
          {countdown.icon && (
            <span className="cd-card-icon" aria-hidden>
              {countdown.icon}
            </span>
          )}
          <span className="cd-card-name">{countdown.name}</span>
        </div>
        <BigValue remaining={remaining} />
        <p className="cd-card-sub">{subtitle}</p>
      </button>

      {manageMode && (
        <div className="cd-card-manage">
          <div className="cd-card-reorder">
            <button
              type="button"
              className="cd-mini-btn"
              onClick={onMoveUp}
              disabled={isFirst}
              aria-label="Monter"
            >
              ↑
            </button>
            <button
              type="button"
              className="cd-mini-btn"
              onClick={onMoveDown}
              disabled={isLast}
              aria-label="Descendre"
            >
              ↓
            </button>
          </div>
          <button type="button" className="cd-del-btn" onClick={onDelete}>
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}
