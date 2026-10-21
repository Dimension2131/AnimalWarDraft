import { mulberry32 } from "../../js/sim.js";
import { arr, hash } from "../../js/util.js";
import { filterPool } from "../../js/pack.js";

// ---------- constants ----------
export const POINTS = { kind: 200, species: 400 };
export const IDENT_MS = 5000;
export const REVEAL_MS = 14000;
export const LEAD_MS = 2000;
export const GRACE_MS = 1200;
export const DEFAULTS = { quizAnimals: 8, quizSeconds: 20, quizNumeric: 3, quizSpecies: true, quizReveal: "each", quizPenalty: 100, quizLowConf: false };

const clamp = (v, lo, hi, d) => { v = Math.floor(+v); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
export function normalizeSettings(s) {
  s = s || {};
  return {
    animals: clamp(s.quizAnimals ?? DEFAULTS.quizAnimals, 1, 30, DEFAULTS.quizAnimals),
    seconds: clamp(s.quizSeconds ?? DEFAULTS.quizSeconds, 5, 120, DEFAULTS.quizSeconds),
    numeric: clamp(s.quizNumeric ?? DEFAULTS.quizNumeric, 0, 6, DEFAULTS.quizNumeric),
    species: (s.quizSpecies ?? DEFAULTS.quizSpecies) !== false,
    reveal: s.quizReveal === "end" ? "end" : "each",
    penalty: clamp(s.quizPenalty ?? DEFAULTS.quizPenalty, 0, 400, DEFAULTS.quizPenalty),
    lowConf: !!(s.quizLowConf ?? DEFAULTS.quizLowConf)
  };
}

export const clean = (v) => JSON.parse(JSON.stringify(v));
export const sk = (i) => "s" + i;
export const ak = (a) => "a" + a;


export function scoreNumeric(guess, actual, lo, hi) {
  if (typeof guess !== "number" || !Number.isFinite(guess) || guess <= 0) return 0;
  if (typeof actual !== "number" || !Number.isFinite(actual) || actual <= 0) return 0;
  if (typeof lo === "number" && typeof hi === "number" && guess >= lo && guess <= hi) return 1000;
  return Math.round(1000 * Math.max(0, 1 - Math.abs(Math.log10(guess / actual))));
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

const shuffle = (list, rng) => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const uniq = (l) => [...new Set(l)];

export function buildPlan({ pack, entities, facts, settings, keys, seed, gid }) {
  const Q = pack.quiz;
  if (!Q) throw new Error("This category does not support the Silhouette Quiz.");
  const s = normalizeSettings(settings), map = new Map(entities.map((e) => [e.id, e]));
  const skipKinds = new Set(Q.skipKinds || []);
  const kindOf = (e) => kindOfEntity(pack, facts, e);
  const groupOf = (e) => (Q.groupField ? e[Q.groupField] : null);
  const allKinds = uniq(entities.map(kindOf).filter((k) => k && !skipKinds.has(k)));
  const pool = filterPool(entities, (settings && settings.filters) || {}, pack).filter((e) => e.silhouette);
  if (!pool.length) throw new Error(`No ${pack.nouns.plural} with a silhouette match the current filters.`);
  const rngFor = (id, salt) => mulberry32(((seed >>> 0) ^ Math.floor(hash(id + salt, seed) * 4294967296)) >>> 0);
  const picked = shuffle(pool.map((e) => e.id), mulberry32((seed >>> 0) ^ 0x51ed)).slice(0, s.animals);

  const animals = picked.map((id) => {
    const e = map.get(id), kind = kindOf(e), r = rngFor(id, "k");
    let kq = null;
    if (kind && !skipKinds.has(kind)) {
      const others = shuffle(allKinds.filter((k) => k !== kind), r).slice(0, 3);
      if (others.length >= 1) kq = { options: shuffle([kind, ...others], r) };
    }
    let sq = null;
    if (s.species) {
      const la = uniq(arr(facts && facts[id] && facts[id].look_alikes)).filter((x) => x !== id && map.has(x));
      const sameKind = kind ? entities.filter((x) => x.id !== id && kindOf(x) === kind).map((x) => x.id) : [];
      const g = groupOf(e), sameGroup = g ? entities.filter((x) => x.id !== id && groupOf(x) === g).map((x) => x.id) : [];
      const d = [];
      for (const list of [la, shuffle(sameKind, r), shuffle(sameGroup, r)]) for (const x of list) { if (d.length < 3 && !d.includes(x)) d.push(x); }
      if (d.length >= 1) sq = { options: shuffle([id, ...d], r) };
    }
    const avail = [];
    for (const def of Q.numeric || []) {
      const f = factFor(def, e, facts, s.lowConf); if (!f) continue;
      avail.push({
        key: def.key, label: def.label, unit: def.unit, min: def.min, max: def.max,
        prompt: fill(def.prompt, { a: article(e.name), name: e.name, medium: f.medium || def.medium || "move" }),
        note: def.hint || ""
      });
    }
    const num = shuffle(avail, rngFor(id, "n")).slice(0, s.numeric);
    return { id, kind: kq, species: sq, num };
  });

  const steps = [];
  animals.forEach((an, a) => {
    if (an.kind) steps.push({ t: "kind", a });
    if (an.species) steps.push({ t: "species", a });
    steps.push({ t: "ident", a });
    an.num.forEach((_, n) => steps.push({ t: "num", a, n }));
    if (s.reveal === "each") steps.push({ t: "reveal", a });
  });
  if (s.reveal === "end") animals.forEach((_, a) => steps.push({ t: "reveal", a }));

  return clean({
    gid, seed, keys,
    settings: { secs: s.seconds, reveal: s.reveal, species: s.species, penalty: s.penalty, points: POINTS },
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
export const stepMs = (P, st, first) => (isQuestion(st) ? P.settings.secs * 1000 + (first ? LEAD_MS : 0) : st.t === "ident" ? IDENT_MS : REVEAL_MS);

export function gradeStep(P, i, row, truth, { gid, cutoff } = {}) {
  const st = P.steps[i], an = P.animals[st.a], out = {};
  for (const k of P.keys) {
    const d = row && row[k];
    const valid = d && (!gid || d.g === gid) && (cutoff == null || d.t == null || d.t <= cutoff);
    const v = valid ? d.v : undefined;
    let p = 0;
    if (st.t === "kind") {
      if (typeof v === "string" && an.kind.options.includes(v)) p = v === truth.kind(an.id) ? P.settings.points.kind : 0;
    } else if (st.t === "species") {
      if (typeof v === "string" && an.species.options.includes(v)) p = v === an.id ? P.settings.points.species : -P.settings.penalty;   // no v = skipped = 0
    } else if (st.t === "num") {
      const q = an.num[st.n], f = truth.fact(an.id, q.key);
      p = f ? scoreNumeric(v, f.v, f.lo, f.hi) : 0;
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
export function buildFinal(P, scores) {
  const last = P.animals.length - 1, totals = totalsThrough(P, scores, last);
  return clean({ order: rankKeys(P, totals), totals, per: P.animals.map((an, a) => ({ id: an.id, gain: animalGains(P, scores, a) })) });
}