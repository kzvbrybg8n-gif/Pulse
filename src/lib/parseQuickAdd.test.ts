import { describe, expect, it } from "vitest";
import { parseQuickAdd } from "./parseQuickAdd";

// Référence temporelle fixe : samedi 30 mai 2026 à 09:00 (UTC+2 = 07:00 UTC)
const NOW = new Date("2026-05-30T07:00:00.000Z"); // samedi

function due(y: number, m: number, d: number, hh = 0, mm = 0): string {
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
}

// ─── Exemples SPEC.md ────────────────────────────────────────────────────────

describe("exemples SPEC.md", () => {
  it("Rendre le mémo demain 14h !! #travail", () => {
    const r = parseQuickAdd("Rendre le mémo demain 14h !! #travail", NOW);
    expect(r.title).toBe("Rendre le mémo");
    // 14h est rattaché au moment le plus proche : midi (13h).
    expect(r.due_at).toBe(due(2026, 5, 31, 13, 0));
    expect(r.prio).toBe(2);
    expect(r.tags).toEqual(["travail"]);
  });

  it("Appeler le client lundi #clients", () => {
    const r = parseQuickAdd("Appeler le client lundi #clients", NOW);
    expect(r.title).toBe("Appeler le client");
    // Samedi + 2j = lundi 1er juin
    expect(r.due_at).toBe(due(2026, 6, 1, 0, 0));
    expect(r.prio).toBe(4);
    expect(r.tags).toEqual(["clients"]);
  });

  it("Relire la clause !!!", () => {
    const r = parseQuickAdd("Relire la clause !!!", NOW);
    expect(r.title).toBe("Relire la clause");
    expect(r.due_at).toBeNull();
    expect(r.prio).toBe(1);
    expect(r.tags).toEqual([]);
  });

  it("Courses", () => {
    const r = parseQuickAdd("Courses", NOW);
    expect(r.title).toBe("Courses");
    expect(r.due_at).toBeNull();
    expect(r.prio).toBe(4);
    expect(r.tags).toEqual([]);
  });
});

// ─── Priorité ────────────────────────────────────────────────────────────────

describe("priorité", () => {
  it("! → P3", () => expect(parseQuickAdd("Tâche !", NOW).prio).toBe(3));
  it("!! → P2", () => expect(parseQuickAdd("Tâche !!", NOW).prio).toBe(2));
  it("!!! → P1", () => expect(parseQuickAdd("Tâche !!!", NOW).prio).toBe(1));
  it("!!!! → P1 (plus de 3 exclamations)", () =>
    expect(parseQuickAdd("Tâche !!!!", NOW).prio).toBe(1));
  it("!urgent → P1", () =>
    expect(parseQuickAdd("Tâche !urgent", NOW).prio).toBe(1));
  it("!URGENT → P1 (insensible casse)", () =>
    expect(parseQuickAdd("Tâche !URGENT", NOW).prio).toBe(1));
  it("sans marqueur → P4", () =>
    expect(parseQuickAdd("Tâche simple", NOW).prio).toBe(4));
  it("!! enlève les marqueurs du titre", () => {
    expect(parseQuickAdd("Faire rapport !!", NOW).title).toBe("Faire rapport");
  });
});

// ─── Tags ─────────────────────────────────────────────────────────────────────

describe("tags", () => {
  it("tag simple", () => {
    expect(parseQuickAdd("Tâche #travail", NOW).tags).toEqual(["travail"]);
  });
  it("plusieurs tags", () => {
    const r = parseQuickAdd("Réunion #travail #urgent #client", NOW);
    expect(r.tags).toEqual(["travail", "urgent", "client"]);
  });
  it("tags retirés du titre", () => {
    expect(parseQuickAdd("Appeler #client demain", NOW).title).toBe("Appeler");
  });
  it("tags en minuscules normalisés", () => {
    expect(parseQuickAdd("Tâche #Client", NOW).tags).toEqual(["client"]);
  });
  it("tag avec tiret", () => {
    expect(parseQuickAdd("Tâche #bon-de-commande", NOW).tags).toEqual([
      "bon-de-commande",
    ]);
  });
});

// ─── Dates ───────────────────────────────────────────────────────────────────

describe("dates", () => {
  it("aujourd'hui → today", () => {
    const r = parseQuickAdd("Faire ça aujourd'hui", NOW);
    expect(r.due_at).toBe(due(2026, 5, 30, 0, 0));
  });

  it("demain → tomorrow", () => {
    const r = parseQuickAdd("Envoyer demain", NOW);
    expect(r.due_at).toBe(due(2026, 5, 31, 0, 0));
  });

  it("hier → yesterday", () => {
    const r = parseQuickAdd("Rappel hier", NOW);
    expect(r.due_at).toBe(due(2026, 5, 29, 0, 0));
  });

  it("lundi (depuis samedi) → lundi suivant", () => {
    const r = parseQuickAdd("Réunion lundi", NOW);
    expect(r.due_at).toBe(due(2026, 6, 1, 0, 0)); // lundi 1er juin
  });

  it("samedi (depuis samedi) → samedi +7j", () => {
    const r = parseQuickAdd("Sport samedi", NOW);
    expect(r.due_at).toBe(due(2026, 6, 6, 0, 0)); // samedi 6 juin
  });

  it("mercredi → prochain mercredi", () => {
    const r = parseQuickAdd("Dentiste mercredi", NOW);
    expect(r.due_at).toBe(due(2026, 6, 3, 0, 0)); // mercredi 3 juin
  });

  it("date retirée du titre", () => {
    const r = parseQuickAdd("Relire le rapport demain", NOW);
    expect(r.title).toBe("Relire le rapport");
    expect(r.due_at).toBe(due(2026, 5, 31, 0, 0));
  });
});

// ─── Heure → moment ────────────────────────────────────────────────────────────
// On ne conserve plus l'heure précise : elle est ramenée au moment le plus
// proche (matin 9h / midi 13h / soir 19h).

describe("heure rattachée au moment", () => {
  it("14h → midi (13h)", () => {
    const r = parseQuickAdd("Appel demain 14h", NOW);
    expect(r.due_at).toBe(due(2026, 5, 31, 13, 0));
  });

  it("9h30 → matin (9h)", () => {
    const r = parseQuickAdd("Rendez-vous demain 9h30", NOW);
    expect(r.due_at).toBe(due(2026, 5, 31, 9, 0));
  });

  it("14:30 → midi (13h)", () => {
    const r = parseQuickAdd("Réunion demain 14:30", NOW);
    expect(r.due_at).toBe(due(2026, 5, 31, 13, 0));
  });

  it("20h → soir (19h)", () => {
    const r = parseQuickAdd("Dîner demain 20h", NOW);
    expect(r.due_at).toBe(due(2026, 5, 31, 19, 0));
  });

  it("heure seule sans date → pas d'échéance", () => {
    // Pas de mot-clé de date → pas d'extraction d'heure seule
    const r = parseQuickAdd("Tâche 14h", NOW);
    expect(r.due_at).toBeNull();
    expect(r.title).toBe("Tâche 14h");
  });
});

// ─── Moments (matin / midi / soir) ──────────────────────────────────────────────

describe("moments", () => {
  it("demain soir → 19h, titre nettoyé", () => {
    const r = parseQuickAdd("Réviser demain soir", NOW);
    expect(r.due_at).toBe(due(2026, 5, 31, 19, 0));
    expect(r.title).toBe("Réviser");
  });

  it("demain matin → 9h", () => {
    const r = parseQuickAdd("Courir demain matin", NOW);
    expect(r.due_at).toBe(due(2026, 5, 31, 9, 0));
  });

  it("lundi midi → 13h", () => {
    const r = parseQuickAdd("Déjeuner lundi midi", NOW);
    expect(r.due_at).toBe(due(2026, 6, 1, 13, 0));
  });

  it("après-midi → midi (13h)", () => {
    const r = parseQuickAdd("Sieste demain après-midi", NOW);
    expect(r.due_at).toBe(due(2026, 5, 31, 13, 0));
  });

  it("ce soir (sans date) → aujourd'hui 19h", () => {
    const r = parseQuickAdd("Appeler maman ce soir", NOW);
    expect(r.due_at).toBe(due(2026, 5, 30, 19, 0));
    expect(r.title).toBe("Appeler maman");
  });

  it("cet après-midi (sans date) → aujourd'hui 13h", () => {
    const r = parseQuickAdd("Ranger cet après-midi", NOW);
    expect(r.due_at).toBe(due(2026, 5, 30, 13, 0));
    expect(r.title).toBe("Ranger");
  });
});

// ─── Combinaisons ─────────────────────────────────────────────────────────────

describe("combinaisons", () => {
  it("date + heure + priorité + tag", () => {
    const r = parseQuickAdd("Envoyer mémo demain 9h !!! #travail #important", NOW);
    expect(r.title).toBe("Envoyer mémo");
    expect(r.due_at).toBe(due(2026, 5, 31, 9, 0));
    expect(r.prio).toBe(1);
    expect(r.tags).toEqual(["travail", "important"]);
  });

  it("priorité en milieu de phrase", () => {
    const r = parseQuickAdd("Rapport !! à envoyer", NOW);
    expect(r.prio).toBe(2);
    expect(r.title).toBe("Rapport à envoyer");
  });

  it("saisie vide → titre vide", () => {
    const r = parseQuickAdd("", NOW);
    expect(r.title).toBe("");
    expect(r.prio).toBe(4);
    expect(r.tags).toEqual([]);
    expect(r.due_at).toBeNull();
  });

  it("uniquement des marqueurs → titre vide", () => {
    const r = parseQuickAdd("!! #tag", NOW);
    expect(r.title).toBe("");
    expect(r.prio).toBe(2);
    expect(r.tags).toEqual(["tag"]);
  });
});
