/**
 * Client-side game logic for the Zahlen lesson.
 * Bundled by Astro/Vite — DOM ids are the contract with index.astro.
 */
import {
  fmtDE,
  genQuiz,
  numDE,
  priceDE,
  priceDistractors,
  priceStr,
  rand,
  shuffle,
  type QuizQuestion,
} from "../lib/de";

/* ---------- TTS ---------- */
function speak(text: string): void {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "de-DE";
  u.rate = 0.82;
  const v = speechSynthesis.getVoices().find((v) => v.lang.startsWith("de"));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}
speechSynthesis?.getVoices(); // warm up

const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

/* ---------- data-driven card grids (already server-rendered; cards just speak) ---------- */
document.querySelectorAll<HTMLElement>("[data-speak]").forEach((el) => {
  el.addEventListener("click", () => speak(el.dataset.speak ?? ""));
});

/* ---------- QUIZ ---------- */
let qScore = 0, qDone = 0, qLocked = false, curQ: QuizQuestion | null = null;
function renderQ(): void {
  qLocked = false;
  curQ = genQuiz();
  $("qNum").textContent = curQ.display;
  $("qOpts").innerHTML = curQ.options
    .map((o, i) => `<button class="q-opt" data-qopt="${i}">${o}</button>`)
    .join("");
  document.querySelectorAll<HTMLButtonElement>("[data-qopt]").forEach((b) =>
    b.addEventListener("click", () => pick(+b.dataset.qopt!)),
  );
}
function pick(i: number): void {
  if (qLocked || !curQ) return;
  qLocked = true;
  const btns = document.querySelectorAll<HTMLButtonElement>(".q-opt");
  const ok = curQ.options[i] === curQ.correct;
  btns[i].classList.add(ok ? "right" : "wrong");
  btns[curQ.options.indexOf(curQ.correct)].classList.add("right");
  if (ok) qScore++;
  qDone++;
  speak(curQ.correct);
  $("qScore").textContent = `Điểm: ${qScore} / ${qDone}`;
}
function nextQ(): void {
  renderQ();
}
renderQ();

/* ---------- DIKTAT ---------- */
let dTarget = 0;
let dSaid = "";
let dIsPrice = false;
let dScore = 0, dDone = 0, dStreak = 0;

function newDiktat(): void {
  const roll = Math.random();
  dIsPrice = roll >= 0.85;
  if (roll < 0.65) {
    dTarget = rand(21, 99);
    dSaid = numDE(dTarget);
  } else if (!dIsPrice) {
    dTarget = rand(100, 999);
    dSaid = numDE(dTarget);
  } else {
    dTarget = rand(101, 9999);
    dSaid = priceDE(dTarget);
  }
  const input = $("diktatIn") as HTMLInputElement;
  input.value = "";
  input.focus();
}
function playDiktat(): void {
  newDiktat();
  speak(dSaid);
}
function replayDiktat(): void {
  if (dSaid) speak(dSaid);
}
function checkDiktat(): void {
  if (!dSaid) return playDiktat();
  const raw = ($("diktatIn") as HTMLInputElement).value.trim().replace(",", ".");
  const val = parseFloat(raw.replace(/\.(?=\d{3})/g, "")); // 1.234 → 1234
  const expect = dIsPrice ? dTarget / 100 : dTarget;
  const ok = Math.abs(val - expect) < 0.001;
  const fb = $("diktatFb");
  dDone++;
  if (ok) {
    dScore++;
    dStreak++;
    fb.innerHTML = `✅ <b style="color:var(--yellow)">Richtig!</b> "${dSaid}" = <b>${fmtDE(expect)}</b>`;
  } else {
    dStreak = 0;
    fb.innerHTML = `❌ Đáp án: <b style="color:var(--yellow)">${fmtDE(expect)}</b> — "${dSaid}". Bạn gõ: ${raw || "∅"}`;
    speak(dSaid);
  }
  $("diktatScore").textContent = `Streak: ${dStreak} · Đúng: ${dScore} / ${dDone}`;
  if (ok) setTimeout(playDiktat, 1400);
}
$("diktatIn").addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.key === "Enter") checkDiktat();
});

/* ---------- KASSE ---------- */
let kTarget = 0, kSaid = "", kScore = 0, kDone = 0, kLocked = false;
function playKasse(): void {
  kLocked = false;
  kTarget = rand(50, 9999);
  if (kTarget % 10 !== 0 && Math.random() < 0.4) kTarget -= kTarget % 10;
  kSaid = priceDE(kTarget);
  const opts = shuffle([kTarget, ...priceDistractors(kTarget)]).slice(0, 4);
  if (!opts.includes(kTarget)) opts[rand(0, 3)] = kTarget;
  $("kasseOpts").innerHTML = opts
    .map(
      (c) => `<div class="pb" style="text-align:center" data-kc="${c}">
                <div class="pb-p" style="font-size:1.7rem">${priceStr(c)}</div>
              </div>`,
    )
    .join("");
  document.querySelectorAll<HTMLElement>("[data-kc]").forEach((el) =>
    el.addEventListener("click", () => pickKasse(+el.dataset.kc!, el)),
  );
  $("kasseFb").innerHTML = "";
  speak(kSaid);
}
function replayKasse(): void {
  if (kSaid) speak(kSaid);
}
function pickKasse(c: number, el: HTMLElement): void {
  if (kLocked) return;
  kLocked = true;
  kDone++;
  const ok = c === kTarget;
  const fb = $("kasseFb");
  if (ok) {
    kScore++;
    el.style.background = "var(--green)";
    el.style.color = "var(--paper)";
    fb.innerHTML = `✅ <b>Richtig!</b> "${kSaid}"`;
  } else {
    el.style.background = "var(--red)";
    el.style.color = "var(--paper)";
    fb.innerHTML = `❌ Đúng là <b>${priceStr(kTarget)}</b> — "${kSaid}"`;
    speak(kSaid);
  }
  $("kasseScore").textContent = `Điểm: ${kScore} / ${kDone}`;
}

/* ---------- BOOK navigation ---------- */
const spreads = [...document.querySelectorAll<HTMLElement>(".spread")];
const total = spreads.length;
let cur = 0;

const CHAP_LABELS = [
  "ZAHLEN! — Übungsbuch", "Inhalt · Mục lục",
  "Kap. 01 · 0–12", "Kap. 02 · 13–19", "Kap. 03 · Chục tròn",
  "Kap. 04 · Đọc ngược", "Kap. 05 · Số lớn", "Kap. 06 · Giá tiền",
  "Kap. 07 · Test nhanh", "Kap. 08 · Diktat", "Kap. 09 · An der Kasse",
  "Ende · SUMME",
];

function go(i: number): void {
  cur = Math.max(0, Math.min(total - 1, i));
  spreads.forEach((s, idx) => {
    s.classList.toggle("active", idx === cur);
    s.classList.toggle("passed", idx < cur);
  });
  $("pageno").textContent = `${cur}/${total - 1}`;
  $("pfill").style.width = `${(cur / (total - 1)) * 100}%`;
  $("chap").textContent = CHAP_LABELS[cur] ?? "ZAHLEN!";
  ($("prevBtn") as HTMLButtonElement).disabled = cur === 0;
  ($("nextBtn") as HTMLButtonElement).disabled = cur === total - 1;
  speechSynthesis?.cancel();
}
const nextPage = () => go(cur + 1);
const prevPage = () => go(cur - 1);

$("nextBtn").addEventListener("click", nextPage);
$("prevBtn").addEventListener("click", prevPage);

document.addEventListener("keydown", (e) => {
  const tag = (e.target as HTMLElement).tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  if (e.key === "ArrowRight") nextPage();
  if (e.key === "ArrowLeft") prevPage();
});

// swipe
let touchX = 0, touchY = 0;
document.addEventListener("touchstart", (e) => {
  touchX = e.touches[0].clientX;
  touchY = e.touches[0].clientY;
}, { passive: true });
document.addEventListener("touchend", (e) => {
  const dx = e.changedTouches[0].clientX - touchX;
  const dy = e.changedTouches[0].clientY - touchY;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) {
    dx < 0 ? nextPage() : prevPage();
  }
}, { passive: true });

// page-corner fold buttons on each spread
spreads.forEach((s, i) => {
  if (i < total - 1) {
    const c = document.createElement("div");
    c.className = "corner next";
    c.title = "Trang sau →";
    c.addEventListener("click", nextPage);
    s.appendChild(c);
  }
  if (i > 0) {
    const c = document.createElement("div");
    c.className = "corner prev";
    c.title = "← Trang trước";
    c.addEventListener("click", prevPage);
    s.appendChild(c);
  }
});

// TOC / cover / restart jumps
document.querySelectorAll<HTMLElement>("[data-goto]").forEach((el) =>
  el.addEventListener("click", () => go(+el.dataset.goto!)),
);
go(0);

/* ---------- wire buttons (markup uses data-action, no inline handlers) ---------- */
const actions: Record<string, () => void> = {
  speak_was_kostet: () => speak("Was kostet das?"),
  nextQ,
  playDiktat,
  replayDiktat,
  checkDiktat,
  playKasse,
  replayKasse,
};
document.querySelectorAll<HTMLElement>("[data-action]").forEach((el) =>
  el.addEventListener("click", () => actions[el.dataset.action ?? ""]?.()),
);

export {};
