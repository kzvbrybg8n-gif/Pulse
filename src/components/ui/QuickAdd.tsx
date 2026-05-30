"use client";

import { useState } from "react";
import { IconSparkles } from "@/components/icons";

/* TODO Phase 4 : extraire ce parser dans src/lib/parseQuickAdd.ts,
   le tester unitairement contre les exemples de SPEC.md, et le rendre
   exhaustif (toutes les marques de priorité, dates absolues, tags
   multiples, récurrences, etc.). Pour l'instant, version minimale
   suffisante pour la démo visuelle de Phase 1. */

const DATE_WORDS = [
  "aujourd'hui",
  "demain",
  "hier",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
  "dimanche",
];

type DetectedToken = {
  kind: "date" | "prio" | "tag";
  label: string;
  sig?: boolean;
};

function parseQuickAdd(text: string): DetectedToken[] {
  const tokens: DetectedToken[] = [];
  const low = text.toLowerCase();

  // échéance : mot de date + heure éventuelle (14h / 14:00 / 14h30)
  const dw = DATE_WORDS.find((w) => new RegExp("\\b" + w + "\\b").test(low));
  const timeM = low.match(/\b(\d{1,2})\s*h\s*(\d{2})?\b|\b(\d{1,2}):(\d{2})\b/);
  if (dw || timeM) {
    let t = "";
    if (timeM) {
      if (timeM[1] != null) t = timeM[1].padStart(2, "0") + ":" + (timeM[2] || "00");
      else t = timeM[3].padStart(2, "0") + ":" + timeM[4];
    }
    const dueLabel = [dw, t].filter(Boolean).join(" · ");
    tokens.push({ kind: "date", label: "échéance · " + dueLabel });
  }

  // priorité : !urgent / !!! / !! / !
  if (/!\s*urgent/.test(low) || /!{3}/.test(text)) {
    tokens.push({ kind: "prio", label: "priorité · urgent", sig: true });
  } else if (/!{2}/.test(text)) {
    tokens.push({ kind: "prio", label: "priorité · haute" });
  } else if (/!/.test(text)) {
    tokens.push({ kind: "prio", label: "priorité · moyenne" });
  }

  // tag : #client
  const tagM = text.match(/#(\w[\wàâéèêëîïôûùüç&-]*)/i);
  if (tagM) tokens.push({ kind: "tag", label: "tag · #" + tagM[1] });

  return tokens;
}

type Props = {
  defaultValue?: string;
};

export function QuickAdd({ defaultValue = "" }: Props) {
  const [text, setText] = useState(defaultValue);
  const tokens = parseQuickAdd(text);
  const active = text.trim().length > 0;

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
          onChange={(e) => setText(e.target.value)}
        />
        {active && (
          <button type="button" className="pk-qa-go">
            Ajouter
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
