import { describe, expect, it } from "vitest";
import {
  buildMonthlyRule,
  buildWeeklyRule,
  describeRecurrence,
  nextOccurrence,
  parseRRule,
  weekdayCodeOf,
  weekdayCodesFromRule,
} from "./recurrence";

// Référence : lundi 1er juin 2026 à 09:00
const BASE = new Date(2026, 5, 1, 9, 0, 0); // mois 0-indexé → 5 = juin

describe("parseRRule", () => {
  it("FREQ=DAILY", () => {
    expect(parseRRule("FREQ=DAILY")).toEqual({ freq: "DAILY", interval: 1 });
  });

  it("FREQ=DAILY;INTERVAL=3", () => {
    expect(parseRRule("FREQ=DAILY;INTERVAL=3")).toEqual({ freq: "DAILY", interval: 3 });
  });

  it("FREQ=WEEKLY;BYDAY=MO", () => {
    expect(parseRRule("FREQ=WEEKLY;BYDAY=MO")).toEqual({ freq: "WEEKLY", byDays: [1] });
  });

  it("FREQ=WEEKLY;BYDAY=FR", () => {
    expect(parseRRule("FREQ=WEEKLY;BYDAY=FR")).toEqual({ freq: "WEEKLY", byDays: [5] });
  });

  it("FREQ=WEEKLY;BYDAY=MO,WE,FR (plusieurs jours, triés)", () => {
    expect(parseRRule("FREQ=WEEKLY;BYDAY=FR,MO,WE")).toEqual({
      freq: "WEEKLY",
      byDays: [1, 3, 5],
    });
  });

  it("FREQ=WEEKLY;BYDAY=MO,MO (dédupliqué)", () => {
    expect(parseRRule("FREQ=WEEKLY;BYDAY=MO,MO")).toEqual({ freq: "WEEKLY", byDays: [1] });
  });

  it("FREQ=MONTHLY;BYMONTHDAY=1", () => {
    expect(parseRRule("FREQ=MONTHLY;BYMONTHDAY=1")).toEqual({
      freq: "MONTHLY",
      byMonthDay: 1,
    });
  });

  it("insensible à la casse", () => {
    expect(parseRRule("freq=daily;interval=2")).toEqual({ freq: "DAILY", interval: 2 });
  });

  it("lève une erreur sur FREQ inconnu", () => {
    expect(() => parseRRule("FREQ=HOURLY")).toThrow();
  });

  it("lève une erreur si BYDAY manquant pour WEEKLY", () => {
    expect(() => parseRRule("FREQ=WEEKLY")).toThrow();
  });
});

describe("nextOccurrence — DAILY", () => {
  it("tous les jours : +1 jour", () => {
    const spec = parseRRule("FREQ=DAILY");
    const next = nextOccurrence(spec, BASE);
    expect(next).toEqual(new Date(2026, 5, 2, 9, 0, 0));
  });

  it("tous les 3 jours : +3 jours", () => {
    const spec = parseRRule("FREQ=DAILY;INTERVAL=3");
    const next = nextOccurrence(spec, BASE);
    expect(next).toEqual(new Date(2026, 5, 4, 9, 0, 0));
  });

  it("préserve l'heure", () => {
    const from = new Date(2026, 5, 1, 14, 30, 0);
    const spec = parseRRule("FREQ=DAILY");
    const next = nextOccurrence(spec, from);
    expect(next.getHours()).toBe(14);
    expect(next.getMinutes()).toBe(30);
  });
});

describe("nextOccurrence — WEEKLY", () => {
  it("tous les lundis depuis un lundi → lundi suivant (+7j)", () => {
    // BASE est un lundi (1er juin 2026)
    const spec = parseRRule("FREQ=WEEKLY;BYDAY=MO");
    const next = nextOccurrence(spec, BASE);
    expect(next).toEqual(new Date(2026, 5, 8, 9, 0, 0)); // lundi 8 juin
  });

  it("tous les vendredis depuis un lundi → vendredi de la même semaine (+4j)", () => {
    const spec = parseRRule("FREQ=WEEKLY;BYDAY=FR");
    const next = nextOccurrence(spec, BASE);
    expect(next).toEqual(new Date(2026, 5, 5, 9, 0, 0)); // vendredi 5 juin
  });

  it("tous les dimanches depuis un lundi → dimanche suivant (+6j)", () => {
    const spec = parseRRule("FREQ=WEEKLY;BYDAY=SU");
    const next = nextOccurrence(spec, BASE);
    expect(next).toEqual(new Date(2026, 5, 7, 9, 0, 0)); // dimanche 7 juin
  });

  it("lun/mer/ven depuis un lundi → mercredi (jour ciblé le plus proche)", () => {
    const spec = parseRRule("FREQ=WEEKLY;BYDAY=MO,WE,FR");
    const next = nextOccurrence(spec, BASE);
    expect(next).toEqual(new Date(2026, 5, 3, 9, 0, 0)); // mercredi 3 juin
  });

  it("lun/mer/ven depuis un vendredi → lundi suivant", () => {
    const friday = new Date(2026, 5, 5, 9, 0, 0); // vendredi 5 juin
    const spec = parseRRule("FREQ=WEEKLY;BYDAY=MO,WE,FR");
    const next = nextOccurrence(spec, friday);
    expect(next).toEqual(new Date(2026, 5, 8, 9, 0, 0)); // lundi 8 juin
  });
});

describe("nextOccurrence — MONTHLY", () => {
  it("le 1er du mois depuis le 1er → 1er du mois suivant", () => {
    const spec = parseRRule("FREQ=MONTHLY;BYMONTHDAY=1");
    const next = nextOccurrence(spec, BASE);
    expect(next).toEqual(new Date(2026, 6, 1, 9, 0, 0)); // 1er juillet
  });

  it("le 15 depuis le 1er → le 15 du même mois", () => {
    const spec = parseRRule("FREQ=MONTHLY;BYMONTHDAY=15");
    const next = nextOccurrence(spec, BASE);
    expect(next).toEqual(new Date(2026, 5, 15, 9, 0, 0)); // 15 juin
  });

  it("le 15 depuis le 20 → le 15 du mois suivant", () => {
    const from = new Date(2026, 5, 20, 9, 0, 0);
    const spec = parseRRule("FREQ=MONTHLY;BYMONTHDAY=15");
    const next = nextOccurrence(spec, from);
    expect(next).toEqual(new Date(2026, 6, 15, 9, 0, 0)); // 15 juillet
  });

  it("le 31 depuis le 31 janvier → 28 février (clamp, pas de débordement)", () => {
    const from = new Date(2026, 0, 31, 9, 0, 0); // 31 janv. 2026 (année non bissextile)
    const spec = parseRRule("FREQ=MONTHLY;BYMONTHDAY=31");
    const next = nextOccurrence(spec, from);
    expect(next).toEqual(new Date(2026, 1, 28, 9, 0, 0)); // 28 février, pas le 3 mars
  });

  it("le 31 depuis le 15 avril → 30 avril (clamp au dernier jour du mois)", () => {
    const from = new Date(2026, 3, 15, 9, 0, 0); // 15 avril
    const spec = parseRRule("FREQ=MONTHLY;BYMONTHDAY=31");
    const next = nextOccurrence(spec, from);
    expect(next).toEqual(new Date(2026, 3, 30, 9, 0, 0)); // 30 avril
  });

  it("le 31 depuis le 31 mars → 30 avril (mois suivant clampé)", () => {
    const from = new Date(2026, 2, 31, 9, 0, 0); // 31 mars
    const spec = parseRRule("FREQ=MONTHLY;BYMONTHDAY=31");
    const next = nextOccurrence(spec, from);
    expect(next).toEqual(new Date(2026, 3, 30, 9, 0, 0)); // 30 avril
  });

  it("le 29 depuis février 2028 (bissextile) → 29 février", () => {
    const from = new Date(2028, 1, 10, 9, 0, 0); // 10 févr. 2028 (bissextile)
    const spec = parseRRule("FREQ=MONTHLY;BYMONTHDAY=29");
    const next = nextOccurrence(spec, from);
    expect(next).toEqual(new Date(2028, 1, 29, 9, 0, 0)); // 29 février existe
  });
});

describe("helpers de construction / description", () => {
  it("buildWeeklyRule ordonne lundi→dimanche", () => {
    expect(buildWeeklyRule(["FR", "MO", "WE"])).toBe("FREQ=WEEKLY;BYDAY=MO,WE,FR");
  });

  it("buildWeeklyRule renvoie null si aucun jour", () => {
    expect(buildWeeklyRule([])).toBeNull();
  });

  it("buildMonthlyRule clampe entre 1 et 31", () => {
    expect(buildMonthlyRule(15)).toBe("FREQ=MONTHLY;BYMONTHDAY=15");
    expect(buildMonthlyRule(99)).toBe("FREQ=MONTHLY;BYMONTHDAY=31");
    expect(buildMonthlyRule(0)).toBe("FREQ=MONTHLY;BYMONTHDAY=1");
  });

  it("weekdayCodesFromRule extrait les jours ordonnés", () => {
    expect(weekdayCodesFromRule("FREQ=WEEKLY;BYDAY=FR,MO")).toEqual(["MO", "FR"]);
    expect(weekdayCodesFromRule("FREQ=DAILY")).toEqual([]);
    expect(weekdayCodesFromRule(null)).toEqual([]);
  });

  it("weekdayCodeOf renvoie le code BYDAY d'une date", () => {
    expect(weekdayCodeOf(new Date(2026, 5, 1))).toBe("MO"); // 1er juin = lundi
    expect(weekdayCodeOf(new Date(2026, 5, 7))).toBe("SU"); // 7 juin = dimanche
  });

  it("describeRecurrence produit des libellés lisibles", () => {
    expect(describeRecurrence(null)).toBe("Aucune");
    expect(describeRecurrence("FREQ=DAILY")).toBe("Tous les jours");
    expect(describeRecurrence("FREQ=DAILY;INTERVAL=2")).toBe("Tous les 2 jours");
    expect(describeRecurrence("FREQ=WEEKLY;BYDAY=MO,WE")).toBe("Chaque lun, mer");
    expect(describeRecurrence("FREQ=MONTHLY;BYMONTHDAY=15")).toBe("Le 15 du mois");
  });
});
