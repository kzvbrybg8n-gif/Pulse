import type { Priority } from "@/lib/types";

export type ParseResult = {
  title: string;
  due_at: string | null; // ISO UTC string, null si pas de date
  prio: Priority;
  tags: string[];
};

// ─── Priorité ────────────────────────────────────────────────────────────────

function extractPriority(text: string): { prio: Priority; cleaned: string } {
  let prio: Priority = 4;

  if (/!+urgent/i.test(text) || /!!!+/.test(text)) {
    prio = 1;
  } else if (/!!/.test(text)) {
    prio = 2;
  } else if (/!/.test(text)) {
    prio = 3;
  }

  const cleaned = text
    .replace(/!+urgent/gi, "")
    .replace(/!+/g, "")
    .trim();
  return { prio, cleaned };
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

function extractTags(text: string): { tags: string[]; cleaned: string } {
  const tags: string[] = [];
  const cleaned = text
    .replace(/#([\wàâéèêëîïôûùüç&-]+)/gi, (_, name: string) => {
      tags.push(name.toLowerCase());
      return "";
    })
    .trim();
  return { tags, cleaned };
}

// ─── Date + heure ─────────────────────────────────────────────────────────────

const DAY_INDEX: Record<string, number> = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
};

function nextWeekday(now: Date, targetDay: number): Date {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let daysAhead = targetDay - today.getDay();
  if (daysAhead <= 0) daysAhead += 7;
  return new Date(today.getTime() + daysAhead * 86_400_000);
}

function isWordChar(c: string): boolean {
  return /[a-zàâéèêëîïôûùüç]/i.test(c);
}

/** Normalise apostrophes courbes → droite pour comparaisons uniformes. */
const normApostrophe = (s: string) =>
  s.toLowerCase().replace(/‘|’/g, "'");

/** Trouve l'index du mot-clé dans le texte (insensible à la casse, frontières de mots). */
function findKeywordIndex(text: string, keyword: string): number {
  const low = normApostrophe(text);
  const kw = normApostrophe(keyword);
  let idx = 0;
  while (idx <= low.length - kw.length) {
    const found = low.indexOf(kw, idx);
    if (found === -1) return -1;
    const before = found > 0 ? low[found - 1] : " ";
    const after =
      found + kw.length < low.length ? low[found + kw.length] : " ";
    if (!isWordChar(before) && !isWordChar(after)) return found;
    idx = found + 1;
  }
  return -1;
}

// Pattern : optionnellement "à", puis HHh[MM] ou HH:MM
const TIME_RE =
  /^\s*(?:à\s*)?(\d{1,2})\s*h\s*(\d{0,2})(?!\d)|^\s*(?:à\s*)?(\d{1,2}):(\d{2})/i;

function findTimeAfter(
  text: string,
  from: number,
): { hours: number; minutes: number; len: number } | null {
  const segment = text.slice(from);
  const m = TIME_RE.exec(segment);
  if (!m) return null;

  let hours: number, minutes: number;
  if (m[1] != null) {
    hours = parseInt(m[1], 10);
    minutes = m[2] ? parseInt(m[2], 10) : 0;
  } else {
    hours = parseInt(m[3], 10);
    minutes = parseInt(m[4], 10);
  }

  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes, len: m[0].length };
}

// Mots-clés de date dans l’ordre de recherche
// Note : apostrophe droite U+0027 (le texte d’entrée est normalisé avant le matching)
const DATE_KEYWORDS = [
  "aujourd’hui",
  "demain",
  "hier",
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];

function extractDate(
  text: string,
  now: Date,
): { due_at: string | null; cleaned: string } {
  for (const kw of DATE_KEYWORDS) {
    const kwIdx = findKeywordIndex(text, kw);
    if (kwIdx === -1) continue;

    const todayBase = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let base: Date;

    if (kw === "aujourd’hui") {
      base = new Date(todayBase);
    } else if (kw === "demain") {
      base = new Date(todayBase.getTime() + 86_400_000);
    } else if (kw === "hier") {
      base = new Date(todayBase.getTime() - 86_400_000);
    } else {
      base = nextWeekday(now, DAY_INDEX[kw] ?? 1);
    }

    const timeInfo = findTimeAfter(text, kwIdx + kw.length);
    base.setHours(timeInfo?.hours ?? 0, timeInfo?.minutes ?? 0, 0, 0);

    const matchEnd = kwIdx + kw.length + (timeInfo?.len ?? 0);
    const cleaned = (text.slice(0, kwIdx) + text.slice(matchEnd))
      .replace(/\s+/g, " ")
      .trim();

    return { due_at: base.toISOString(), cleaned };
  }

  return { due_at: null, cleaned: text };
}

// ─── Parser principal ─────────────────────────────────────────────────────────

/**
 * Parse une saisie rapide en langage naturel.
 * Extrait : titre propre, échéance ISO, priorité (1-4), tags.
 *
 * @param input - texte brut saisi par l'utilisateur
 * @param now   - référentiel temporel (défaut : maintenant)
 */
export function parseQuickAdd(
  input: string,
  now: Date = new Date(),
): ParseResult {
  // Normaliser apostrophes typographiques (U+2018 U+2019) → apostrophe droite (U+0027)
  let text = input.replace(/[‘’]/g, "’").trim();

  const { prio, cleaned: t1 } = extractPriority(text);
  text = t1;

  const { tags, cleaned: t2 } = extractTags(text);
  text = t2;

  const { due_at, cleaned: t3 } = extractDate(text, now);
  text = t3;

  const title = text.replace(/\s+/g, " ").trim();

  return { title, due_at, prio, tags };
}
