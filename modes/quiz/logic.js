import { mulberry32 } from "../../js/sim.js";
import { arr, hash } from "../../js/util.js";
import { filterPool } from "../../js/pack.js";

// ---------- constants ----------
export const POINTS = { kind: 200, species: 400 };
export const IDENT_MS = 5000;
export const REVEAL_MS = 14000;
export const QR_MS = 9000;   // answer card after every question
export const LEAD_MS = 2000;
export const GRACE_MS = 1200;
export const DEFAULTS = { quizAnimals: 8, quizSeconds: 20, quizNumeric: 3, quizSpecies: true, quizReveal: "question", quizPenalty: 100, quizLowConf: false, quizDifficulty: "medium" };

const clamp = (v, lo, hi, d) => { v = Math.floor(+v); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
export function normalizeSettings(s) {
  s = s || {};
  return {
    animals: clamp(s.quizAnimals ?? DEFAULTS.quizAnimals, 1, 30, DEFAULTS.quizAnimals),
    seconds: clamp(s.quizSeconds ?? DEFAULTS.quizSeconds, 5, 120, DEFAULTS.quizSeconds),
    numeric: clamp(s.quizNumeric ?? DEFAULTS.quizNumeric, 0, 6, DEFAULTS.quizNumeric),
    species: (s.quizSpecies ?? DEFAULTS.quizSpecies) !== false,
    reveal: s.quizReveal === "end" ? "end" : s.quizReveal === "each" ? "each" : "question",
    penalty: clamp(s.quizPenalty ?? DEFAULTS.quizPenalty, 0, 400, DEFAULTS.quizPenalty),
    lowConf: !!(s.quizLowConf ?? DEFAULTS.quizLowConf),
    difficulty: DIFFICULTIES.includes(s.quizDifficulty) ? s.quizDifficulty : DEFAULTS.quizDifficulty
  };
}

export const clean = (v) => JSON.parse(JSON.stringify(v));
export const sk = (i) => "s" + i;
export const ak = (a) => "a" + a;


// Numeric scoring (stricter than before): ratio-based, symmetric (half and double are equally wrong).
//   inside the published range, or within ~2% of the real value -> 1000
//   then a smooth fall-off to 0 points at a factor of 2 (too high or too low)
//   beyond a factor of 2 you LOSE points, up to `penalty` at a factor of 5 or more (penalty 0 = never negative)
export function scoreNumeric(guess, actual, lo, hi, penalty = 0) {
  if (typeof guess !== "number" || !Number.isFinite(guess) || guess <= 0) return 0;
  if (typeof actual !== "number" || !Number.isFinite(actual) || actual <= 0) return 0;
  if (typeof lo === "number" && typeof hi === "number" && guess >= lo && guess <= hi) return 1000;
  const x = Math.abs(Math.log(guess / actual)) / Math.LN2;   // 1 = exactly a factor of 2 off
  if (x <= 0.03) return 1000;
  if (x < 1) return Math.round(1000 * Math.pow(1 - x, 1.3));
  const loss = Math.round(Math.max(0, +penalty || 0) * Math.min(1, (x - 1) / 1.32));
  return loss ? -loss : 0;
}

export function fmtNum(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return "?";
  const a = Math.abs(v);
  if (a >= 1000) return Math.round(v).toLocaleString("en-US");
  if (a >= 100) return String(Math.round(v));
  return String(+v.toPrecision(3));
}

export function offBy(v, actual, lo, hi) {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return "no valid answer";
  if (typeof lo === "number" && typeof hi === "number" && v >= lo && v <= hi) return "inside the published range";
  const r = v / actual;
  if (Math.abs(r - 1) < 0.005) return "spot on";
  return r > 1 ? `×${fmtNum(r)} too high` : `×${fmtNum(1 / r)} too low`;
}
export const article = (name) => (/^[aeiou]/i.test(String(name || "")) ? "an" : "a");
const fill = (tpl, vars) => String(tpl).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

export function kindOfEntity(pack, facts, e) {
  const f = facts && facts[e.id];
  if (f && typeof f.kind === "string" && f.kind) return f.kind;
  const fb = pack.quiz && pack.quiz.kindFallbackField;
  return fb && typeof e[fb] === "string" && e[fb] ? e[fb] : null;
}

export function factFor(def, e, facts, lowOk) {
  if (def.source === "entity") {
    const v = e[def.key];
    return typeof v === "number" && v > 0 ? { v, src: def.src || "Pack data", note: "", conf: "high" } : null;
  }
  const f = facts && facts[e.id] && facts[e.id].facts && facts[e.id].facts[def.key];
  if (!f || typeof f.v !== "number" || !(f.v > 0)) return null;
  if (!(f.conf === "medium" || f.conf === "high") && !lowOk) return null;
  return { v: f.v, lo: typeof f.lo === "number" ? f.lo : undefined, hi: typeof f.hi === "number" ? f.hi : undefined, src: f.src || "", note: f.note || "", conf: f.conf || "", medium: f.medium };
}
export function makeTruth(pack, map, facts) {
  const defs = Object.fromEntries(((pack.quiz && pack.quiz.numeric) || []).map((d) => [d.key, d]));
  return {
    kind: (id) => (map.get(id) ? kindOfEntity(pack, facts, map.get(id)) : null),
    fact: (id, key) => (map.get(id) && defs[key] ? factFor(defs[key], map.get(id), facts, true) : null),
    def: (key) => defs[key] || null
  };
}

// ---------- difficulty levels ----------
// A level decides how SIMILAR the wrong options are and how much the identification questions are worth.
// KIND tiers (distance from the right kind): 0 = a kind that looks alike (shares a group in pack.quiz.kindGroups), 1 = same class, 2 = another class.
// SPECIES tiers: 0 = a curated look-alike, 1 = same kind, 2 = a kind of the same look-alike group (same class), 3 = same class. Never another class.
// kindWant / speciesWant = how many wrong options come from each tier; whatever is missing is filled from the other tiers ("far" = most different first, "near" = most similar first).
export const LEVELS = {
  easy:   { label: "Easy",   mult: 1,   kindOptions: 4, kindWant: [0, 2, 1], speciesOptions: 4, speciesWant: [0, 1, 1, 1], fill: "far" },
  medium: { label: "Medium", mult: 1.5, kindOptions: 4, kindWant: [1, 2, 0], speciesOptions: 4, speciesWant: [1, 1, 1, 0], fill: "near" },
  hard:   { label: "Hard",   mult: 2,   kindOptions: 4, kindWant: [2, 1, 0], speciesOptions: 4, speciesWant: [2, 1, 0, 0], fill: "near" },
  expert: { label: "Expert", mult: 3,   kindOptions: 5, kindWant: [4, 0, 0], speciesOptions: 5, speciesWant: [4, 0, 0, 0], fill: "near" }
};
export const DIFFICULTIES = ["easy", "medium", "hard", "expert", "escalating"];
// The level of animal number i of n. "escalating" climbs from easy to expert over the game.
export function levelFor(difficulty, i, n) {
  if (difficulty !== "escalating") return LEVELS[difficulty] ? difficulty : "medium";
  return ["easy", "medium", "hard", "expert"][Math.min(3, Math.floor((i * 4) / Math.max(1, n)))];
}
// Takes want[t] items from each tier, then fills up to `total` from what is left. Returns fewer than `total` when there are not enough candidates.
function pickTiered(tiers, want, total, fill) {
  const out = [], used = new Set();
  const take = (t, n) => { for (const x of tiers[t]) { if (n <= 0 || out.length >= total) break; if (!used.has(x)) { used.add(x); out.push(x); n--; } } };
  tiers.forEach((_, t) => take(t, want[t] || 0));
  const order = tiers.map((_, t) => t); if (fill === "far") order.reverse();
  for (const t of order) take(t, total);
  return out;
}
// Merge an extra facts object (animals/facts_web.js: sourced facts) over the base one. Same fact key = the extra one wins; everything else is kept.
export function mergeFacts(base, extra) {
  if (!extra) return base;
  const out = { ...(base || {}) };
  for (const [id, e] of Object.entries(extra)) {
    const b = out[id] || {};
    out[id] = { ...b, ...(e.kind ? { kind: e.kind } : {}), ...(e.look_alikes ? { look_alikes: e.look_alikes } : {}), facts: { ...(b.facts || {}), ...(e.facts || {}) } };
  }
  return out;
}

const shuffle = (list, rng) => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const uniq = (l) => [...new Set(l)];

export function buildPlan({ pack, entities, facts, settings, keys, seed, gid }) {
  const Q = pack.quiz;
  if (!Q) throw new Error("This category does not support the Silhouette Quiz.");
  const s = normalizeSettings(settings), map = new Map(entities.map((e) => [e.id, e]));
  const skipKinds = new Set(Q.skipKinds || []);
  const kindOf = (e) => kindOfEntity(pack, facts, e);
  const classOf = (x) => (Q.groupField ? x[Q.groupField] : null);
  const sizeOf = (x) => (Q.sizeField && typeof x[Q.sizeField] === "number" && x[Q.sizeField] > 0 ? x[Q.sizeField] : null);
  const groups = Q.kindGroups || [], close = (a, b) => groups.some((g) => g.includes(a) && g.includes(b));   // do two kinds look alike?
  const allKinds = uniq(entities.map(kindOf).filter((k) => k && !skipKinds.has(k)));
  const kcls = new Map();   // kind -> its usual class
  { const v = {}; for (const e of entities) { const k = kindOf(e); if (k) { v[k] = v[k] || {}; v[k][classOf(e)] = (v[k][classOf(e)] || 0) + 1; } } for (const [k, c] of Object.entries(v)) kcls.set(k, Object.entries(c).sort((x, y) => y[1] - x[1])[0][0]); }
  const pool = filterPool(entities, (settings && settings.filters) || {}, pack).filter((e) => e.silhouette);
  if (!pool.length) throw new Error(`No ${pack.nouns.plural} with a silhouette match the current filters.`);
  const rngFor = (id, salt) => mulberry32(((seed >>> 0) ^ Math.floor(hash(id + salt, seed) * 4294967296)) >>> 0);
  const picked = shuffle(pool.map((e) => e.id), mulberry32((seed >>> 0) ^ 0x51ed)).slice(0, s.animals);

  const animals = picked.map((id, idx) => {
    const e = map.get(id), kind = kindOf(e), r = rngFor(id, "k"), level = levelFor(s.difficulty, idx, picked.length), LV = LEVELS[level];
    // KIND question: the right kind plus wrong kinds that look alike, by level (see LEVELS). "other" is never asked or offered.
    let kq = null;
    if (kind && !skipKinds.has(kind)) {
      const tiers = [[], [], []];
      for (const k of allKinds) if (k !== kind) tiers[close(kind, k) ? 0 : kcls.get(k) === kcls.get(kind) ? 1 : 2].push(k);
      const d = pickTiered(tiers.map((t) => shuffle(t, r)), LV.kindWant, LV.kindOptions - 1, LV.fill);
      if (d.length >= 1) kq = { options: shuffle([kind, ...d], r) };
    }
    // SPECIES question: curated look-alikes, same kind, kinds that look alike, same class; closest in size first. Never another class.
    let sq = null;
    if (s.species) {
      const cls = classOf(e), sz = sizeOf(e);
      const ok = (x) => x.id !== id && classOf(x) === cls;
      const la = uniq(arr(facts && facts[id] && facts[id].look_alikes)).filter((x) => map.has(x) && ok(map.get(x)));
      const byClose = (list) => shuffle(list, r).map((x) => ({ x, d: (sz && sizeOf(map.get(x)) ? Math.abs(Math.log10(sizeOf(map.get(x)) / sz)) : 0) + r() * 0.25 })).sort((p, q) => p.d - q.d).map((o) => o.x);
      const sameKind = kind ? entities.filter((x) => ok(x) && kindOf(x) === kind).map((x) => x.id) : [];
      const nearKind = kind ? entities.filter((x) => ok(x) && kindOf(x) && kindOf(x) !== kind && close(kind, kindOf(x))).map((x) => x.id) : [];
      const d = pickTiered([la, byClose(sameKind), byClose(nearKind), byClose(entities.filter(ok).map((x) => x.id))], LV.speciesWant, LV.speciesOptions - 1, LV.fill);
      if (d.length >= 1) sq = { options: shuffle([id, ...d], r) };
    }
    const avail = [];
    for (const def of Q.numeric || []) {
      const f = factFor(def, e, facts, s.lowConf); if (!f) continue;
      avail.push({
        key: def.key, label: def.label, unit: def.unit, min: def.min, max: def.max, scale: def.scale, integer: !!def.integer,
        prompt: fill(def.prompt, { a: article(e.name), name: e.name, medium: f.medium || def.medium || "move" }),
        note: def.hint || ""
      });
    }
    const num = shuffle(avail, rngFor(id, "n")).slice(0, s.numeric);
    return { id, level, mult: LV.mult, kind: kq, species: sq, num };
  });

  const steps = [];
  const pushQ = (st) => { steps.push(st); if (s.reveal === "question") steps.push({ t: "qr", a: st.a, q: steps.length - 1 }); };   // "qr" = answer card right after that question
  animals.forEach((an, a) => {
    if (an.kind) pushQ({ t: "kind", a });
    if (an.species) pushQ({ t: "species", a });
    // The "It was..." step only where nothing else shows the animal yet: "question" mode shows photo + name on the species answer card, "each" on the Results card (unless numeric questions follow)
    if (s.reveal === "end" || (s.reveal === "question" ? !an.species : an.num.length > 0)) steps.push({ t: "ident", a });
    an.num.forEach((_, n) => pushQ({ t: "num", a, n }));
    if (s.reveal === "each") steps.push({ t: "reveal", a });
  });
  if (s.reveal === "end") animals.forEach((_, a) => steps.push({ t: "reveal", a }));

  return clean({
    gid, seed, keys,
    settings: { secs: s.seconds, reveal: s.reveal, species: s.species, penalty: s.penalty, points: POINTS, difficulty: s.difficulty },
    prompts: { kind: Q.kindPrompt || "What kind is this?", species: Q.speciesPrompt || "Which one exactly?" },
    animals, steps
  });
}
export function normPlan(p) {
  if (!p) return null;
  return {
    ...p, keys: arr(p.keys), steps: arr(p.steps),
    animals: arr(p.animals).map((a) => ({ ...a, kind: a.kind ? { options: arr(a.kind.options) } : null, species: a.species ? { options: arr(a.species.options) } : null, num: arr(a.num) }))
  };
}
export const isQuestion = (st) => !!st && (st.t === "kind" || st.t === "species" || st.t === "num");
export const stepMs = (P, st, first) => (isQuestion(st) ? P.settings.secs * 1000 + (first ? LEAD_MS : 0) : st.t === "ident" ? IDENT_MS : st.t === "qr" ? QR_MS : REVEAL_MS);

export function gradeStep(P, i, row, truth, { gid, cutoff } = {}) {
  const st = P.steps[i], an = P.animals[st.a], out = {};
  for (const k of P.keys) {
    const d = row && row[k];
    const valid = d && (!gid || d.g === gid) && (cutoff == null || d.t == null || d.t <= cutoff);
    const v = valid ? d.v : undefined;
    let p = 0;
    if (st.t === "kind") {
      if (typeof v === "string" && an.kind.options.includes(v)) p = v === truth.kind(an.id) ? Math.round(P.settings.points.kind * (an.mult || 1)) : 0;
    } else if (st.t === "species") {
      if (typeof v === "string" && an.species.options.includes(v)) p = v === an.id ? Math.round(P.settings.points.species * (an.mult || 1)) : -Math.round(P.settings.penalty * (an.mult || 1));   // no v = skipped = 0
    } else if (st.t === "num") {
      const q = an.num[st.n], f = truth.fact(an.id, q.key);
      p = f ? scoreNumeric(v, f.v, f.lo, f.hi, P.settings.penalty) : 0;
    }
    out[k] = v === undefined ? { p } : { v, p };
  }
  return out;
}

const sc = (scores, i) => (scores && scores[sk(i)] && scores[sk(i)].r) || {};
export function animalGains(P, scores, a) {
  const g = Object.fromEntries(P.keys.map((k) => [k, 0]));
  P.steps.forEach((st, i) => { if (st.a === a && isQuestion(st)) { const r = sc(scores, i); for (const k of P.keys) g[k] += (r[k] && r[k].p) || 0; } });
  return g;
}
export function totalsThrough(P, scores, lastAnimal) {
  const t = Object.fromEntries(P.keys.map((k) => [k, 0]));
  for (let a = 0; a <= lastAnimal; a++) { const g = animalGains(P, scores, a); for (const k of P.keys) t[k] += g[k]; }
  return t;
}
export const rankKeys = (P, totals) => P.keys.slice().sort((x, y) => (totals[y] - totals[x]) || (P.keys.indexOf(x) - P.keys.indexOf(y)));

export function buildReveal(P, a, scores, truth) {
  const an = P.animals[a], out = { a, id: an.id, kind: null, species: null, nums: [] };
  P.steps.forEach((st, i) => {
    if (st.a !== a || !isQuestion(st)) return;
    const r = sc(scores, i);
    if (st.t === "kind") out.kind = { correct: truth.kind(an.id), rows: r };
    else if (st.t === "species") out.species = { correct: an.id, rows: r };
    else {
      const q = an.num[st.n], f = truth.fact(an.id, q.key) || {};
      out.nums.push({ key: q.key, label: q.label, unit: q.unit, prompt: q.prompt, actual: f.v, lo: f.lo, hi: f.hi, src: f.src || "", note: f.note || "", rows: r });
    }
  });
  out.gain = animalGains(P, scores, a);
  out.board = totalsThrough(P, scores, a);
  out.order = rankKeys(P, out.board);
  return clean(out);
}
export function buildQR(P, qi, scores, truth) {   // the answer card for ONE question: correct answer, every player's answer + points, running totals
  const st = P.steps[qi], an = P.animals[st.a], out = { i: qi, a: st.a, id: an.id, t: st.t, rows: sc(scores, qi) };
  if (st.t === "kind") { out.prompt = P.prompts.kind; out.correct = truth.kind(an.id); }
  else if (st.t === "species") { out.prompt = P.prompts.species; out.correct = an.id; }
  else { const q = an.num[st.n], f = truth.fact(an.id, q.key) || {}; Object.assign(out, { key: q.key, label: q.label, unit: q.unit, prompt: q.prompt, actual: f.v, lo: f.lo, hi: f.hi, src: f.src || "", note: f.note || "" }); }
  out.board = totalsThrough(P, scores, st.a); out.order = rankKeys(P, out.board);
  return clean(out);
}
export function buildFinal(P, scores) {
  const last = P.animals.length - 1, totals = totalsThrough(P, scores, last);
  return clean({ order: rankKeys(P, totals), totals, per: P.animals.map((an, a) => ({ id: an.id, gain: animalGains(P, scores, a) })) });
}

// ---------- everything a player reads BEFORE answering (the screens render from these; the tests scan them for leaks) ----------
export const isLogScale = (q) => (q.scale ? q.scale === "log" : q.max / q.min > 40);   // wide ranges (weights) on a log slider, small ranges (stats, speeds) linear
export function choiceText(P, st, nameOf) {
  const an = P.animals[st.a], sp = st.t === "species", m = an.mult || 1, pts = Math.round(P.settings.points[sp ? "species" : "kind"] * m);
  return {
    prompt: sp ? P.prompts.species : P.prompts.kind,
    hint: sp ? `Bonus: +${pts} if right, ${P.settings.penalty ? "−" + Math.round(P.settings.penalty * m) + " if wrong" : "no penalty if wrong"}, 0 if you skip.` : `${pts} points`,
    options: (sp ? an.species : an.kind).options.map((o) => ({ value: o, label: sp ? nameOf(o) : o }))
  };
}
export function numText(P, st) {
  const q = P.animals[st.a].num[st.n], pen = P.settings.penalty;
  return {
    prompt: q.prompt, hint: q.note || "",
    help: `${isLogScale(q) ? "Log scale: each step is a multiplication, so small and huge values both fit. " : ""}Full marks inside the published range, fewer the further off you are. A guess twice as high or low as the real value scores nothing${pen ? ", and you lose points if you are even further off" : ""}.`
  };
}
