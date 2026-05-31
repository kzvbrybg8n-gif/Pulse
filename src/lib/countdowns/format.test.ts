import { describe, it, expect } from "vitest";
import { formatRemaining, parseDateOnly } from "./format";

// Tous les cas sont calculés depuis « aujourd'hui = 31/05/2026 ».
const today = new Date(2026, 4, 31);

describe("formatRemaining (mode standard)", () => {
  // --- Cas obligatoires de la spécification ---
  it("01/06/2026 → « 1 »", () => {
    expect(formatRemaining(new Date(2026, 5, 1), today)).toEqual({
      value: "1",
      unit: "days",
    });
  });

  it("12/06/2026 → « 1 sem 5 j »", () => {
    expect(formatRemaining(new Date(2026, 5, 12), today)).toEqual({
      value: "1 sem 5 j",
      unit: "weeks-days",
    });
  });

  it("01/09/2026 → « 3m 1j » (mois calendaires, pas jours/30)", () => {
    expect(formatRemaining(new Date(2026, 8, 1), today)).toEqual({
      value: "3m 1j",
      unit: "months-days",
    });
  });

  // --- Cas limites complémentaires ---
  it("jour même → « Jour J »", () => {
    expect(formatRemaining(today, today)).toEqual({
      value: "Jour J",
      unit: "jour-J",
    });
  });

  it("date passée → « 0 »", () => {
    expect(formatRemaining(new Date(2026, 4, 30), today)).toEqual({
      value: "0",
      unit: "days",
    });
  });

  it("exactement 7 jours → « 1 sem » (omet « 0 j »)", () => {
    expect(formatRemaining(new Date(2026, 5, 7), today)).toEqual({
      value: "1 sem",
      unit: "weeks-days",
    });
  });

  it("ignore l'heure (différence calendaire de minuit à minuit)", () => {
    const target = new Date(2026, 5, 1, 23, 59);
    const now = new Date(2026, 4, 31, 1, 0);
    expect(formatRemaining(target, now)).toEqual({ value: "1", unit: "days" });
  });
});

describe("parseDateOnly", () => {
  it("interprète « YYYY-MM-DD » en date locale", () => {
    const d = parseDateOnly("2026-09-01");
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 8, 1]);
  });
});
