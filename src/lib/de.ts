/**
 * German number/price engine — pure functions, testable via vitest.
 * Cardinal words come from n2words (MIT); price speech stays custom
 * because colloquial German drops "und ... Cent": "elf Euro
 * fünfundsechzig", not the invoice form "elf Euro und fünfundsechzig Cent".
 */
import { toCardinal, toOrdinal } from "n2words/de-DE";

export const numDE = (n: number): string => toCardinal(Math.round(n));
export const ordDE = (n: number): string => toOrdinal(n);

/** German display format: 1.234 or 3,99 */
export const fmtDE = (n: number): string => n.toLocaleString("de-DE");

/** Spoken price from integer cents (colloquial register). */
export function priceDE(cents: number): string {
  const e = Math.floor(cents / 100);
  const c = cents % 100;
  if (e === 0) return `${numDE(c)} Cent`;
  if (c === 0) return `${numDE(e)} Euro`;
  return `${numDE(e)} Euro ${numDE(c)}`;
}

/** Price display string: "11,65 €" */
export function priceStr(cents: number): string {
  return `${fmtDE(cents / 100)} €`;
}

/* ---------- lookup tables for the distractor engine ---------- */
const U = [
  "null", "eins", "zwei", "drei", "vier",
  "fünf", "sechs", "sieben", "acht", "neun",
];
const Z10 = [
  "zehn", "elf", "zwölf", "dreizehn", "vierzehn",
  "fünfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn",
];
const TZ = [
  "", "", "zwanzig", "dreißig", "vierzig",
  "fünfzig", "sechzig", "siebzig", "achtzig", "neunzig",
];

/**
 * Plausible learner errors for a number — the point of the exercise is
 * recognising traps: digit flips, missing `und`, reversed `und`,
 * teen/zig confusion, umlaut-stem misspellings.
 */
export function distractors(n: number): string[] {
  const out = new Set<string>();
  const u = n % 10;
  const t = Math.floor(n / 10) % 10;
  const h = Math.floor(n / 100);

  if (n >= 21 && n < 100 && u > 0) {
    out.add(numDE(u * 10 + t)); // lật số: 65 → 56
    if (t >= 2) out.add(U[u] + TZ[t]); // thiếu "und": fünfsechzig
    out.add(TZ[t] + "und" + (u === 1 ? "ein" : U[u])); // und lộn ngược
    out.add(numDE(n + 10)); // lệch chục: 65 → 75
    out.add(numDE(u * 10 + 6)); // nhầm sang 6
  }
  if (n >= 13 && n < 20) {
    out.add(numDE(u * 10)); // 16 → 60 (teen/zig)
    out.add(numDE(u * 10 + ((u + 3) % 10)));
    if (u === 7) out.add("siebenzehn"); // quên cắt đuôi
    if (u === 6) out.add("sechszehn");
    out.add(numDE(u) + "undzehn"); // nhầm rule
  }
  if (n >= 20 && n < 100 && u === 0) {
    const uu = n / 10;
    if (uu === 3) out.add("dreizig"); // sai chính tả
    if (uu === 6) out.add("sechszig"); // quên cắt s
    if (uu === 7) out.add("siebenzig"); // quên cắt en
    out.add(Z10[uu] ?? `${numDE(uu)}zehn`); // 30 → dreizehn?
    out.add(numDE(uu * 10 + ((uu % 10) || 3)));
  }
  if (n >= 100) {
    const r = n % 100;
    out.add(numDE(h * 100) + (r ? "und" + numDE(r) : "")); // thêm und sai
    if (r >= 21) {
      out.add(numDE(h * 100 + (r % 10) * 10 + Math.floor(r / 10))); // lật phần lẻ
    }
    out.add(numDE(n + 100));
  }

  out.delete(numDE(n)); // không trùng đáp án đúng
  return [...out];
}

/** Plausible wrong prices (integer cents). */
export function priceDistractors(cents: number): number[] {
  const out = new Set<number>();
  const e = Math.floor(cents / 100);
  const c = cents % 100;
  if (c > 0) {
    const u = c % 10;
    const t = Math.floor(c / 10);
    if (t > 0 && u > 0) out.add(e * 100 + u * 10 + t); // lật cent
    out.add(e * 100 + (((c + 10) % 100) || 99)); // lệch chục cent
  }
  if (e > 0) out.add((e + (e % 10 === 0 ? 1 : 10)) * 100 + c); // lệch euro
  out.add(c * 100 + e); // hoán đổi euro/cent
  out.delete(cents);
  return [...out].filter((v) => v > 0 && v < 1_000_000);
}

export const rand = (a: number, b: number): number =>
  a + Math.floor(Math.random() * (b - a + 1));

export function shuffle<T>(a: T[]): T[] {
  return a
    .map((v) => [Math.random(), v] as const)
    .sort((x, y) => x[0] - y[0])
    .map((v) => v[1]);
}

export interface QuizQuestion {
  display: string;
  options: string[];
  correct: string;
}

/** Generated question: 60% two-digit (the backwards rule), 20% hundreds, 20% teens. */
export function genQuiz(rng: () => number = Math.random): QuizQuestion {
  const roll = rng();
  let n: number;
  if (roll < 0.6) n = rand(21, 99);
  else if (roll < 0.8) n = rand(100, 999);
  else n = rand(13, 19);

  const correct = numDE(n);
  const pool = new Set(distractors(n));

  // pad the distractor pool if needed so 3 unique wrong answers exist
  let guard = 0;
  while (pool.size < 3 && guard++ < 50) {
    const extra = numDE(rand(11, 999));
    if (extra !== correct) pool.add(extra);
  }

  const options = shuffle([correct, ...[...pool].slice(0, 3)]);
  return { display: fmtDE(n), options, correct };
}
