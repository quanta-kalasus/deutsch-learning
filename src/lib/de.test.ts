import { describe, expect, it } from "vitest";
import {
  distractors,
  genQuiz,
  numDE,
  ordDE,
  priceDE,
  priceStr,
} from "./de";

describe("numDE", () => {
  it.each([
    [0, "null"],
    [1, "eins"],
    [16, "sechzehn"],
    [17, "siebzehn"],
    [21, "einundzwanzig"],
    [30, "dreißig"],
    [47, "siebenundvierzig"],
    [65, "fünfundsechzig"],
    [100, "einhundert"],
    [125, "einhundertfünfundzwanzig"],
    [1234, "eintausendzweihundertvierunddreißig"],
    [1000000, "eine Million"],
    [2000000, "zwei Millionen"],
    [1000000000, "eine Milliarde"],
  ])("%i → %s", (n, w) => expect(numDE(n)).toBe(w));
});

describe("ordDE", () => {
  it.each([
    [1, "erste"],
    [3, "dritte"],
    [21, "einundzwanzigste"],
  ])("%i → %s", (n, w) => expect(ordDE(n)).toBe(w));
});

describe("priceDE (colloquial)", () => {
  it.each([
    [399, "drei Euro neunundneunzig"],
    [50, "fünfzig Cent"],
    [1165, "elf Euro fünfundsechzig"],
    [1200, "zwölf Euro"],
  ])("%i ct → %s", (c, w) => expect(priceDE(c)).toBe(w));
});

describe("priceStr", () => {
  it.each([
    [399, "3,99 €"],
    [1165, "11,65 €"],
    [150000, "1.500 €"],
  ])("%i ct → %s", (c, w) => expect(priceStr(c)).toBe(w));
});

describe("distractors", () => {
  it("never contains the correct answer", () => {
    for (const n of [21, 30, 47, 65, 99, 100, 152, 365, 999]) {
      expect(distractors(n)).not.toContain(numDE(n));
    }
  });
  it("includes the digit-flip trap for two-digit numbers", () => {
    expect(distractors(65)).toContain("sechsundfünfzig");
  });
  it("includes stem-truncation traps", () => {
    expect(distractors(70)).toContain("siebenzig");
    expect(distractors(30)).toContain("dreizig");
  });
});

describe("genQuiz", () => {
  it("returns 4 unique options including the correct one", () => {
    for (let i = 0; i < 200; i++) {
      const q = genQuiz();
      expect(new Set(q.options).size).toBe(4);
      expect(q.options).toContain(q.correct);
    }
  });
});
