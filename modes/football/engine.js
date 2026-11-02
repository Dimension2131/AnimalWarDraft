// modes/football/engine.js: pure football logic (no DOM, no network). Formations, position fit, auto line-up, team ratings and a seeded match simulation.
// One seeded simulation per fixture: "quick result" and "watch" show the same outcome because every device re-runs the same events.
import { mulberry32 } from "../../js/sim.js";
import { hid } from "../../football/hidden.js";   // hidden stats (see football/hidden.js); a player without a row falls back on his visible stats

// Slot codes and the line each one belongs to. A formation is its ROWS, back to front, left to right ("LB CB CB RB"): the rows are what the line-up screen draws, and together with the codes
// they decide where the match viewer stands everyone (choreo.baseLayout). A row can carry its own sideways spots (second item) when the default spread would look wrong.
const CODE_LINE = { GK: "GK", LB: "DEF", CB: "DEF", RB: "DEF", LWB: "DEF", RWB: "DEF", CDM: "MID", CM: "MID", CAM: "MID", LM: "MID", RM: "MID", LW: "FWD", ST: "FWD", CF: "FWD", RW: "FWD" };
export const FORMATIONS = {};
const addFormation = (id, group, ...rows) => {
  const all = [["GK"]].concat(rows.map((r) => (typeof r === "string" ? [r] : r))), slots = [];
  all.forEach(([codes, ys], row) => { const cs = codes.split(" "); cs.forEach((code, col) => slots.push({ line: CODE_LINE[code], code, row, col, n: cs.length, y: ys ? ys[col] : null })); });
  FORMATIONS[id] = { label: id, group, rows: all.map((r) => r[0]), slots };
};
const B4 = "Back four", B3 = "Back three", B5 = "Back five";
addFormation("4-3-3", B4, "LB CB CB RB", "CM CM CM", "LW ST RW");
addFormation("4-4-2", B4, "LB CB CB RB", "LM CM CM RM", "ST ST");
addFormation("3-5-2", B3, "CB CB CB", "LM CM CM CM RM", "ST ST");
addFormation("4-2-3-1", B4, "LB CB CB RB", "CDM CDM", ["LM CAM RM", [0.14, 0.5, 0.86]], "ST");
addFormation("4-1-4-1", B4, "LB CB CB RB", "CDM", "LM CM CM RM", "ST");
addFormation("4-5-1", B4, "LB CB CB RB", "LM CM CAM CM RM", "ST");
addFormation("4-3-2-1", B4, "LB CB CB RB", ["CM CM CM", [0.15, 0.5, 0.85]], ["CAM CAM", [0.3, 0.7]], "ST");
addFormation("4-4-1-1", B4, "LB CB CB RB", "LM CM CM RM", ["CF", [0.33]], "ST");
addFormation("4-2-2-2", B4, "LB CB CB RB", "CDM CDM", ["CAM CAM", [0.27, 0.73]], "ST ST");
addFormation("4-1-2-1-2", B4, "LB CB CB RB", "CDM", ["CM CM", [0.3, 0.7]], "CAM", "ST ST");
addFormation("4-3-1-2", B4, "LB CB CB RB", "CM CM CM", "CAM", "ST ST");
addFormation("4-1-2-3", B4, "LB CB CB RB", "CDM", ["CM CM", [0.3, 0.7]], "LW ST RW");
addFormation("3-4-3", B3, "CB CB CB", "LM CM CM RM", "LW ST RW");
addFormation("3-4-1-2", B3, "CB CB CB", "LM CM CM RM", "CAM", "ST ST");
addFormation("3-4-2-1", B3, "CB CB CB", "LM CM CM RM", ["CAM CAM", [0.25, 0.75]], "ST");
addFormation("3-1-4-2", B3, "CB CB CB", "CDM", "LM CM CM RM", "ST ST");
addFormation("5-3-2", B5, "LWB CB CB CB RWB", "CM CM CM", "ST ST");
addFormation("5-4-1", B5, "LWB CB CB CB RWB", "LM CM CM RM", "ST");
addFormation("5-2-1-2", B5, "LWB CB CB CB RWB", ["CM CM", [0.32, 0.68]], "CAM", "ST ST");
addFormation("5-2-3", B5, "LWB CB CB CB RWB", ["CM CM", [0.35, 0.65]], "LW ST RW");
export const FORMATION_IDS = Object.keys(FORMATIONS);
export const XI = 11, BENCH_MAX = 7;
export const DEFAULT_FORMATION = "4-3-3";
export const normFormation = (f) => (FORMATIONS[f] ? f : DEFAULT_FORMATION);
const SLOT_CACHE = {};
export const slotsOf = (f) => { const id = normFormation(f); return SLOT_CACHE[id] || (SLOT_CACHE[id] = FORMATIONS[id].slots.map((s, i) => ({ i, ...s }))); };

const LINE = { goalkeeper: "GK", defender: "DEF", midfielder: "MID", forward: "FWD" };
const LINE_ORD = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
export const lineOf = (p) => LINE[p.position] || "MID";

// How well a player fits a slot: 1 = a position he is listed at (even one that belongs to another line), 0.97 = a close relative of the slot (a left-back at left wing-back, a CM at CDM...),
// 0.95 same line, 0.85 / 0.72 one / two lines away, 0.35 a keeper outfield or an outfielder in goal.
const KIN = { LB: ["LWB"], RB: ["RWB"], LWB: ["LB", "LM"], RWB: ["RB", "RM"], CDM: ["CM"], CM: ["CDM", "CAM"], CAM: ["CM", "CF"], LM: ["LW", "LWB"], RM: ["RW", "RWB"], LW: ["LM"], RW: ["RM"], ST: ["CF"], CF: ["ST", "CAM"] };
export function fit(p, slot) {
  if (!p) return 0;
  const pl = lineOf(p), pos = p.positions || [p.pos];
  if (pl === "GK" || slot.line === "GK") return pl === slot.line ? 1 : 0.35;
  if (pos.includes(slot.code)) return 1;
  if ((KIN[slot.code] || []).some((c) => pos.includes(c))) return 0.97;
  if (pl === slot.line) return 0.95;
  return Math.abs(LINE_ORD[pl] - LINE_ORD[slot.line]) === 1 ? 0.85 : 0.72;
}
export const isKeeper = (p) => !!p && p.position === "goalkeeper";
const S = (p, k) => (typeof p[k] === "number" ? p[k] : 40);
// Stat view of a player used by the simulation (keepers have goalkeeping stats, everyone else the six outfield stats)
// Hidden stats of a player with a fallback on his visible ones (every key always has a number). Cached for players with a hidden row; computed fresh otherwise.
const HS_CACHE = new Map();
export function hs(p) {
  const h = hid(p), hit = h ? HS_CACHE.get(p.id) : null; if (hit) return hit;
  const g = (k, fb) => (h && typeof h[k] === "number" ? h[k] : fb), ovr = p.ovr || 60, sho = S(p, "sho"), pas = S(p, "pas"), dri = S(p, "dri"), def = S(p, "def"), phy = S(p, "phy"), pac = S(p, "pac");
  const o = { fin: g("fin", sho), lsh: g("lsh", sho - 4), fk: g("fk", sho - 8), hea: g("hea", phy * 0.7 + 10), cro: g("cro", pas), vis: g("vis", pas), bc: g("bc", dri), lp: g("lp", pas), off: g("off", sho * 0.8 + 10), tkl: g("tkl", def), int: g("int", def), mrk: g("mrk", def),
    agg: g("agg", 45), sta: g("sta", 70 + (phy - 75) * 0.12), acc: g("acc", pac), spr: g("spr", pac), agi: g("agi", dri), bal: g("bal", dri), str: g("str", phy), jmp: g("jmp", phy), com: g("com", ovr * 0.9), ldr: g("ldr", 50), big: g("big", 60), con: g("con", 70), inj: g("inj", 40), crd: g("crd", 45),
    wra: g("wra", 2), wrd: g("wrd", 2), wf: g("wf", 3), sm: g("sm", 2), foot: g("foot", 0), pen: g("pen", sho), aer: g("aer", 70), oo: g("oo", 70), pks: g("pks", 70), pos: g("pos", 70), has: !!h };
  if (h) HS_CACHE.set(p.id, o); return o;
}
// Stat view of an outfielder used by the simulation: each visible stat blended with the hidden ones that belong to it (a player without hidden stats keeps his visible six exactly)
export const outfield = (p) => {
  if (isKeeper(p)) return { pac: S(p, "spd") * 0.7, sho: 25, pas: S(p, "kic") * 0.8, dri: 30, def: 20, phy: 55 };
  const pac = S(p, "pac"), sho = S(p, "sho"), pas = S(p, "pas"), dri = S(p, "dri"), def = S(p, "def"), phy = S(p, "phy"), h = hs(p);
  if (!h.has) return { pac, sho, pas, dri, def, phy };
  return { pac: 0.4 * pac + 0.3 * h.acc + 0.3 * h.spr, sho: 0.45 * sho + 0.35 * h.fin + 0.2 * h.lsh, pas: 0.55 * pas + 0.25 * h.vis + 0.2 * h.lp, dri: 0.5 * dri + 0.25 * h.bc + 0.15 * h.agi + 0.1 * h.bal + (h.sm - 2) * 1.2, def: 0.45 * def + 0.2 * h.tkl + 0.2 * h.int + 0.15 * h.mrk, phy: 0.55 * phy + 0.25 * h.str + 0.2 * h.jmp };
};
// how tired a player is at a minute: his stamina (the visible physical stat when he has no hidden one) decides how fast he fades after the 60th minute
const tireOf = (p, minute) => 1 - (minute - 60) * 0.0016 * (1.4 - Math.min(1, hs(p).sta / 100));
const gkRating = (p) => (isKeeper(p) ? (S(p, "div") + S(p, "han") + S(p, "ref") + S(p, "gkp") * 0.8 + S(p, "kic") * 0.2) / 3.99 : 25);

// ---------- line-up helpers ----------
// Value of a player in a slot (used by the line-up helpers): overall x fit, a little extra for a player in his own line.
const slotValue = (p, sl) => (p.ovr || 50) * fit(p, sl) + (lineOf(p) === sl.line ? 3 : 0);
// The best pairing of n slots with m >= n players (Hungarian algorithm, O(n^2 m)): the sum of slotValue is as high as it can be, so a natural CDM or wing-back is never wasted on the wrong slot.
function assign(slots, players) {
  const n = slots.length, m = players.length, INF = 1e18;
  const u = new Array(n + 1).fill(0), v = new Array(m + 1).fill(0), pm = new Array(m + 1).fill(0), way = new Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    pm[0] = i; let j0 = 0; const minv = new Array(m + 1).fill(INF), used = new Array(m + 1).fill(false);
    do {
      used[j0] = true; const i0 = pm[j0]; let delta = INF, j1 = 0;
      for (let j = 1; j <= m; j++) if (!used[j]) { const cur = -slotValue(players[j - 1], slots[i0 - 1]) - u[i0] - v[j]; if (cur < minv[j]) { minv[j] = cur; way[j] = j0; } if (minv[j] < delta) { delta = minv[j]; j1 = j; } }
      for (let j = 0; j <= m; j++) { if (used[j]) { u[pm[j]] += delta; v[j] -= delta; } else minv[j] -= delta; }
      j0 = j1;
    } while (pm[j0] !== 0);
    do { const j1 = way[j0]; pm[j0] = pm[j1]; j0 = j1; } while (j0);
  }
  const out = new Array(n).fill(null); for (let j = 1; j <= m; j++) if (pm[j]) out[pm[j] - 1] = players[j - 1]; return out;
}
// Best assignment of a set of players to the slots of a formation. Returns an array with one player per slot (null for a slot nobody can fill).
export function arrange(players, formation) {
  const slots = slotsOf(formation);
  if (players.length >= slots.length) return assign(slots, players);
  const left = players.slice(), out = new Array(slots.length).fill(null);   // fewer players than slots: greedy, the keeper slot first
  const order = slots.slice().sort((a, b) => (a.line === "GK" ? -1 : b.line === "GK" ? 1 : 0));
  for (const sl of order) {
    let best = -1, bs = -1;
    left.forEach((p, i) => { const sc = (p.ovr || 50) * fit(p, sl); if (sc > bs) { bs = sc; best = i; } });
    if (best >= 0) out[sl.i] = left.splice(best, 1)[0];
  }
  return out;
}
// Starting XI = the best 11 for the formation out of the whole squad; the rest, strongest first, form the bench. Returns ids: first 11 in slot order, then the bench.
export function autoLineup(squad, formation) {
  const slots = slotsOf(formation);
  if (squad.length >= slots.length) {
    const xi = assign(slots, squad), used = new Set(xi.map((p) => p.id)), bench = squad.filter((p) => !used.has(p.id)).sort((a, b) => (b.ovr || 0) - (a.ovr || 0));
    return xi.concat(bench).map((p) => p.id);
  }
  const left = squad.slice(), xi = new Array(slots.length).fill(null);
  const pick = (sl) => {
    let best = -1, bs = -1;
    left.forEach((p, i) => { const sc = slotValue(p, sl); if (sc > bs) { bs = sc; best = i; } });
    return best >= 0 ? left.splice(best, 1)[0] : null;
  };
  const order = slots.filter((s) => s.i < Math.max(1, squad.length)).sort((a, b) => (a.line === "GK" ? -1 : b.line === "GK" ? 1 : 0));   // a squad smaller than 11 fills the first slots, so empty slots trail
  for (const sl of order) xi[sl.i] = pick(sl);
  const bench = left.sort((a, b) => (b.ovr || 0) - (a.ovr || 0));
  return xi.filter(Boolean).concat(bench).map((p) => p.id);
}
// Swap two positions in a lineup order (indexes 0..10 = pitch slots, 11+ = bench). Returns a NEW array; invalid indexes change nothing.
export function swapIdx(order, a, b) {
  const o = order.slice();
  if (!(a >= 0 && b >= 0 && a < o.length && b < o.length) || a === b) return o;
  [o[a], o[b]] = [o[b], o[a]];
  return o;
}
// A valid lineup order is a permutation of the squad's ids with at least min(11, squad) players on the pitch.
export const validOrder = (order, squadIds) => Array.isArray(order) && order.length === squadIds.length && [...order].sort().join() === [...squadIds].sort().join();

// ---------- team ratings ----------
export function chemistry(xi) {
  let pts = 0; const nat = {}, club = {};
  for (const p of xi) { if (!p) continue; nat[p.nation] = (nat[p.nation] || 0) + 1; if (!p.icon) club[p.club] = (club[p.club] || 0) + 1; }
  for (const v of [...Object.values(nat), ...Object.values(club)]) if (v >= 2) pts += v - 1;
  return Math.min(6, pts);   // at most +2.4% on every rating
}
// Role of each slot code: how much its player counts in the team's attack / control / defence, relative to a plain player of his line (a CDM shields, a CAM creates, wing-backs overlap...).
export const ROLE = { LB: [1.25, 1, 1], RB: [1.25, 1, 1], CB: [0.75, 0.9, 1.1], LWB: [1.7, 1.1, 0.9], RWB: [1.7, 1.1, 0.9], CDM: [0.6, 1.1, 1.25], CM: [1, 1, 1], CAM: [1.35, 1.2, 0.5], LM: [1.2, 0.9, 0.75], RM: [1.2, 0.9, 0.75], LW: [1.05, 0.9, 1], RW: [1.05, 0.9, 1], ST: [1.05, 0.8, 1], CF: [0.95, 1.4, 1.2] };
// How often each slot code takes the shot (on top of the line's weight: forwards 5, midfielders 2.2, defenders 0.5)
export const SHOOT = { CB: 0.9, LWB: 0.9, RWB: 0.9, CDM: 0.6, CAM: 1.25, LW: 0.95, RW: 0.95, ST: 1.1 };
const NEUTRAL = [1, 1, 1];
// Weight of a slot in the team's attack, control and defence: the weight of its line times the role of its code
const slotW = (sl) => {
  const rm = ROLE[sl.code] || NEUTRAL;
  const wa = sl.line === "FWD" ? 1 : sl.line === "MID" ? 0.7 : 0.25, wc = sl.line === "MID" ? 1 : sl.line === "FWD" ? 0.5 : 0.5, wd = sl.line === "DEF" ? 1 : sl.line === "MID" ? 0.7 : 0.15;
  return [wa * rm[0], wc * rm[1], wd * rm[2]];
};
// The SHAPE of a formation: how much attacking, controlling and defending weight its ten outfield slots carry, against the 4-3-3. Equal players in a back five defend more and attack less, in a 4-2-3-1 the opposite.
const shapeSum = (f) => slotsOf(f).reduce((t, sl) => { if (sl.line === "GK") return t; const w = slotW(sl); return [t[0] + w[0], t[1] + w[1], t[2] + w[2]]; }, [0, 0, 0]);
const SHAPE = {};
const shapeOf = (f) => {
  const id = normFormation(f);
  if (!SHAPE[id]) { const x = shapeSum(id), r = shapeSum(DEFAULT_FORMATION), pf = (v, w, g, lim) => Math.max(1 - lim, Math.min(1 + lim, 1 + g * (v / w - 1))); SHAPE[id] = { att: pf(x[0], r[0], 0.4, 0.07), ctl: pf(x[1], r[1], 0.25, 0.05), def: pf(x[2], r[2], 0.4, 0.07) }; }
  return SHAPE[id];
};
// xi: players in slot order; formation id; minute (fatigue after 60'); fresh: ids that came on as subs (no fatigue)
export function ratings(xi, formation, { chem = false, minute = 0, fresh = new Set(), form = null } = {}) {
  const slots = slotsOf(formation);
  const acc = { att: [], ctl: [], def: [] }; let gk = 25, atkW = 0, ctlW = 0, defW = 0;
  const cm = chem ? 1 + chemistry(xi) * 0.004 : 1;
  xi.forEach((p, i) => {
    const sl = slots[i];
    const [wa, wc, wd] = slotW(sl);
    if (!p) { if (sl.line !== "GK") { acc.att.push(0); atkW += wa; acc.ctl.push(0); ctlW += wc; acc.def.push(0); defW += wd; } return; }   // an empty slot (squad smaller than 11) counts as a zero
    const f = fit(p, sl), o = outfield(p);
    const tired = minute > 60 && !fresh.has(p.id) ? tireOf(p, minute) : 1;
    const k = f * tired * cm * (form && form[p.id] ? form[p.id] : 1);
    if (sl.line === "GK") { gk = gkRating(p) * f * tired * cm; return; }
    const att = sl.line === "FWD" ? 0.45 * o.sho + 0.25 * o.dri + 0.2 * o.pac + 0.1 * o.pas : sl.line === "MID" ? 0.3 * o.pas + 0.25 * o.dri + 0.25 * o.sho + 0.2 * o.pac : 0.5 * o.pas + 0.3 * o.dri + 0.2 * o.pac;
    const ctl = sl.line === "MID" ? 0.4 * o.pas + 0.3 * o.dri + 0.2 * o.def + 0.1 * o.phy : sl.line === "FWD" ? 0.5 * o.dri + 0.5 * o.pas : 0.6 * o.pas + 0.4 * o.dri;
    const def = sl.line === "DEF" ? 0.55 * o.def + 0.25 * o.phy + 0.2 * o.pac : sl.line === "MID" ? 0.5 * o.def + 0.3 * o.phy + 0.2 * o.pas : 0.6 * o.def + 0.4 * o.phy;
    const wk = 1 + (hs(p).wrd - 2) * 0.006;   // defensive work rate: pressing and tracking back help control and defence
    acc.att.push(att * k * wa); atkW += wa; acc.ctl.push(ctl * k * wc * wk); ctlW += wc; acc.def.push(def * k * wd * wk); defW += wd;
  });
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const sh = shapeOf(formation);
  return { att: (sum(acc.att) / (atkW || 1)) * sh.att, ctl: (sum(acc.ctl) / (ctlW || 1)) * sh.ctl, def: (sum(acc.def) / (defW || 1)) * sh.def, gk, chem: chem ? chemistry(xi) : 0 };
}
// The pre-match comparison (display only: the match itself is decided by the seeded simulation)
export function compare(A, B) {
  const ra = ratings(A.xi, A.formation, { chem: true }), rb = ratings(B.xi, B.formation, { chem: true });
  const rows = [["Attack", ra.att, rb.att], ["Midfield", ra.ctl, rb.ctl], ["Defence", ra.def, rb.def], ["Goalkeeper", ra.gk, rb.gk]];
  return { rows: rows.map(([label, a, b]) => ({ label, a: Math.round(a), b: Math.round(b) })), chem: [ra.chem, rb.chem] };
}

// ---------- match simulation ----------
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lastName = (p) => { const w = String(p.name).trim().split(/\s+/); return w.length > 1 && /^(de|van|von|ter|di|da|dos|el|al)$/i.test(w[w.length - 2]) ? w.slice(-2).join(" ") : w[w.length - 1]; };
export const surname = lastName;

// team = { name, formation, xi: [entities in slot order], bench: [entities] }. Returns { score:[a,b], events, scorers:[[...],[...]], winner:"A"|"B"|"draw", stats }.
// Optional discipline (cards, injuries, forced substitutions) draws from its OWN random stream: with discipline off the simulation is bit-for-bit what it always was.
export function simulateMatch({ teams, seed, discipline = false }) {
  const rng = mulberry32((seed >>> 0) ^ 0x9e3779b9), rd = discipline ? mulberry32((seed >>> 0) ^ 0x7f4a7c15) : null, yellows = new Set();
  const T = teams.map((t) => ({ ...t, formation: normFormation(t.formation), xi: t.xi.slice(), bench: t.bench.slice(), fresh: new Set(), subs: 0 }));
  const score = [0, 0], shots = [0, 0], onTarget = [0, 0], events = [], scorers = [[], []];
  const ev = (m, e, o) => events.push({ m, e, ...o, score: score.slice() });
  // match-day form: every player has a multiplier near 1; the less consistent he is, the further it can wander. Own random stream, drawn in a fixed order.
  const rf = mulberry32((seed >>> 0) ^ 0x1f2e3d4c);
  for (const t of T) { t.form = {}; for (const p of t.xi.concat(t.bench)) { if (!p) continue; const sd = clamp((100 - hs(p).con) * 0.0013, 0.01, 0.055); t.form[p.id] = 1 + sd * ((rf() + rf() + rf() - 1.5) * 2); } }
  const leaderOf = (t) => t.xi.reduce((b, p) => (p ? Math.max(b, hs(p).ldr) : b), 0);
  ev(0, "kick", {});
  const SUB_AT = [58, 68, 78];
  for (let m = 1; m <= 90; m++) {
    if (m === 46) ev(45, "ht", {});
    for (const side of [0, 1]) {   // substitutions: replace the most tired starter when a bench player of the right line is clearly fresher
      const t = T[side];
      if (SUB_AT.includes(m) && t.subs < 3 && t.bench.length) {
        const slots = slotsOf(t.formation);
        let bi = -1, bj = -1, bgain = 3;
        t.xi.forEach((p, i) => {
          if (!p || slots[i].line === "GK") return;
          const tire = tireOf(p, m), cur = (p.ovr || 50) * fit(p, slots[i]) * (t.fresh.has(p.id) ? 1 : tire);
          t.bench.forEach((b, j) => { if (isKeeper(b)) return; const g = (b.ovr || 50) * fit(b, slots[i]) - cur; if (g > bgain) { bgain = g; bi = i; bj = j; } });
        });
        if (bi >= 0) { const out = t.xi[bi], inn = t.bench.splice(bj, 1)[0]; t.xi[bi] = inn; t.fresh.add(inn.id); t.subs++; ev(m, "sub", { s: side, out: out.id, in: inn.id, on: inn.name, off: out.name }); }
      }
    }
    if (rd) for (const side of [0, 1]) {   // yellow ~1.5 / straight red ~0.04 (plus the odd second yellow) / injury ~0.15 per team per match; goalkeepers are never booked or hurt (keeps the simulation sane)
      const t = T[side], x = rd(), kind = x < 0.0004 ? "red" : x < 0.0174 ? "yellow" : x < 0.019 ? "injury" : null;
      if (!kind) continue;
      const sl = slotsOf(t.formation), cand = [];
      t.xi.forEach((p, i) => { if (p && sl[i].line !== "GK") cand.push({ i, w: (sl[i].line === "DEF" ? 1.3 : sl[i].line === "MID" ? 1.2 : 0.8) * (yellows.has(p.id) ? 0.2 : 1) * (kind === "injury" ? hs(p).inj / 40 : Math.max(0.25, hs(p).crd / 50)) }); });   // a player already on a yellow is booked less often (referees are lenient)
      if (!cand.length) continue;
      let rr = rd() * cand.reduce((a, c) => a + c.w, 0), ch = cand[cand.length - 1];
      for (const c of cand) { rr -= c.w; if (rr <= 0) { ch = c; break; } }
      const p = t.xi[ch.i], base = { s: side, p: p.id, pn: lastName(p) };
      if (kind === "yellow") { if (yellows.has(p.id)) { t.xi[ch.i] = null; ev(m, "red", { ...base, second: true }); } else { yellows.add(p.id); ev(m, "yellow", base); } }
      else if (kind === "red") { t.xi[ch.i] = null; ev(m, "red", base); }
      else {
        ev(m, "injury", base);
        let bj = -1, bs = -1; t.bench.forEach((b, j) => { if (isKeeper(b)) return; const sc = (b.ovr || 50) * fit(b, sl[ch.i]); if (sc > bs) { bs = sc; bj = j; } });
        if (t.subs < 3 && bj >= 0) { const inn = t.bench.splice(bj, 1)[0]; t.xi[ch.i] = inn; t.fresh.add(inn.id); t.subs++; ev(m, "sub", { s: side, out: p.id, in: inn.id, on: inn.name, off: p.name, forced: true }); }
        else t.xi[ch.i] = null;   // nobody left on the bench (or the changes are used up): play a man down
      }
    }
    if (rng() > 0.31) continue;   // roughly 28 attacking moves per match
    const ra = ratings(T[0].xi, T[0].formation, { chem: true, minute: m, fresh: T[0].fresh, form: T[0].form }), rb = ratings(T[1].xi, T[1].formation, { chem: true, minute: m, fresh: T[1].fresh, form: T[1].form });
    const R = [ra, rb];
    if (m >= 70) for (const sd of [0, 1]) if (score[sd] <= score[1 - sd]) R[sd].att *= 1 + (leaderOf(T[sd]) - 60) / 1200;   // late and not winning: a leader drags the team forward
    const pa = Math.pow(ra.ctl, 3) / (Math.pow(ra.ctl, 3) + Math.pow(rb.ctl, 3)), s = rng() < pa ? 0 : 1, o = 1 - s;   // possession decides who attacks
    const atk = R[s], dfn = R[o];
    const pShot = clamp(0.46 + (atk.att - dfn.def) / 120, 0.2, 0.78);
    if (rng() > pShot) { if (rng() < 0.18) ev(m, "chance", { s, text: "block" }); continue; }
    // the shooter: a forward most often, then a midfielder, rarely a defender
    const slots = slotsOf(T[s].formation), cand = [];
    T[s].xi.forEach((p, i) => { if (!p || slots[i].line === "GK") return; const w = slots[i].line === "FWD" ? 5 : slots[i].line === "MID" ? 2.2 : 0.5; cand.push({ p, w: w * (SHOOT[slots[i].code] || 1) * Math.pow(Math.max(5, outfield(p).sho) / 70, 2.2) * Math.pow(Math.max(5, hs(p).off) / 70, 1.2) * (0.92 + 0.04 * hs(p).wra) }); });
    let tw = cand.reduce((x, c) => x + c.w, 0), r = rng() * tw, shooter = cand[cand.length - 1].p;
    for (const c of cand) { r -= c.w; if (r <= 0) { shooter = c.p; break; } }
    const helpers = cand.filter((c) => c.p.id !== shooter.id).sort((a, b) => outfield(b.p).pas * (0.5 + rng()) - outfield(a.p).pas * (0.5 + rng())), assist = helpers.length && rng() < 0.7 ? helpers[0].p : null;
    shots[s]++;
    // how the chance came: a header (the crosser's delivery and his heading), a shot from distance (long shots, free-kick technique), or open play (finishing and composure)
    const hsh = hs(shooter), sLine = slots[T[s].xi.indexOf(shooter)].line, crossQ = assist ? hs(assist).cro : 55;
    const wHead = 0.22 * Math.pow(hsh.hea / 70, 2.5) * (0.6 + 0.4 * crossQ / 70) * (sLine === "DEF" ? 1.3 : sLine === "MID" ? 0.4 : 1);
    const lskill = 0.75 * hsh.lsh + 0.25 * hsh.fk, wLong = 0.16 * Math.pow(lskill / 70, 2.5) * (sLine === "MID" ? 1.4 : sLine === "FWD" ? 0.5 : 0.4);
    const rt = rng() * (wHead + wLong + 0.75), how = rt < wHead ? "head" : rt < wHead + wLong ? "long" : "open";
    const sk = how === "head" ? hsh.hea : how === "long" ? lskill : outfield(shooter).sho * 0.5 + (0.7 * hsh.fin + 0.3 * hsh.com) * 0.5;
    const q = clamp(0.43 + (sk - 70) / 160 + (atk.att - dfn.def) / 400, 0.22, 0.8) * (how === "long" ? 0.78 : how === "head" ? 0.9 : 1) * (1 + (hsh.wf - 3) * 0.012);
    if (rng() > q) { ev(m, "miss", { s, p: shooter.id, pn: lastName(shooter), how }); continue; }
    onTarget[s]++;
    const kp = T[o].xi.find((x, i) => x && slotsOf(T[o].formation)[i].line === "GK"), hk = kp && isKeeper(kp) ? hs(kp) : null;
    const keeper = hk ? dfn.gk * 0.7 + 0.3 * (how === "head" ? hk.aer : how === "long" ? hk.pos : hk.oo) : dfn.gk, pGoal = clamp(0.36 * (1 + (sk - keeper) / 120) * (1 + (atk.att - dfn.def) / 280) * (how === "long" ? 0.7 : how === "head" ? 1 : 1.1), 0.07, 0.72);
    if (rng() < pGoal) {
      score[s]++; scorers[s].push({ id: shooter.id, name: lastName(shooter), m });
      ev(m, "goal", { s, p: shooter.id, pn: lastName(shooter), a: assist ? assist.id : null, an: assist ? lastName(assist) : null, how });
    } else ev(m, "save", { s, p: shooter.id, pn: lastName(shooter), how });
  }
  ev(90, "ft", {});
  return { score: score.slice(), events, scorers, winner: score[0] > score[1] ? "A" : score[1] > score[0] ? "B" : "draw", stats: { shots, onTarget }, onPitch: T.map((t) => t.xi.filter(Boolean).map((p) => p.id)) };
}

// a penalty taker's skill: his penalty stat and his composure (a player without hidden stats: his shooting and overall)
const penSkill = (p) => 0.7 * hs(p).pen + 0.3 * hs(p).com;
// Penalty shoot-out for knockout draws. Own random stream (never touches the match outcome). Takers = the best finishers on the pitch at full time (outfielders first, the keeper last); five kicks each, then sudden death.
export function shootout({ teams, seed, onPitch }) {
  const rng = mulberry32((seed >>> 0) ^ 0x5eed5eed);
  const side = teams.map((t, s) => {
    const m = new Map(t.xi.concat(t.bench).filter(Boolean).map((p) => [p.id, p])), ids = onPitch && onPitch[s] ? onPitch[s] : t.xi.filter(Boolean).map((p) => p.id);
    const pl = ids.map((id) => m.get(id)).filter(Boolean), gk = pl.find(isKeeper) || null, takers = pl.filter((p) => !isKeeper(p)).sort((a, b) => penSkill(b) - penSkill(a));
    if (gk) takers.push(gk);
    return { takers: takers.length ? takers : t.xi.filter(Boolean), gk };
  });
  const kicks = [], pts = [0, 0], taken = [0, 0];
  const done = (coin) => ({ kicks, score: pts.slice(), winner: pts[0] > pts[1] ? 0 : pts[1] > pts[0] ? 1 : (rng() < 0.5 ? 0 : 1), coin: !!coin });
  for (let round = 0; round < 40; round++) {
    for (const s of [0, 1]) {
      const tk = side[s].takers, p = tk[taken[s] % tk.length], gkR = side[1 - s].gk ? gkRating(side[1 - s].gk) * 0.7 + hs(side[1 - s].gk).pks * 0.3 : 25;
      const pGoal = clamp(0.76 + (penSkill(p) - 70) / 250 + (hs(p).big - 70) / 900 - (gkR - 70) / 300, 0.5, 0.92);
      const res = rng() < pGoal ? "goal" : rng() < clamp(0.45 + (gkR - 70) / 200, 0.25, 0.7) ? "save" : "miss";
      taken[s]++; if (res === "goal") pts[s]++;
      kicks.push({ s, p: p.id, pn: lastName(p), res, score: pts.slice() });
      if (round < 5) { const left = [5 - taken[0], 5 - taken[1]]; if (pts[0] > pts[1] + left[1] || pts[1] > pts[0] + left[0]) return done(); }
    }
    if (round >= 4 && pts[0] !== pts[1]) return done();
  }
  return done(true);
}

// ---------- league table ----------
export const POINTS = { win: 3, draw: 1, loss: 0 };
export function leagueTable(keys, fights) {
  const row = {}; keys.forEach((k) => { row[k] = { k, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, h2h: {} }; });
  for (const f of Object.values(fights || {})) {
    if (!f.final || !row[f.a] || !row[f.b]) continue;
    const [ga, gb] = f.final.score, A = row[f.a], B = row[f.b];
    A.p++; B.p++; A.gf += ga; A.ga += gb; B.gf += gb; B.ga += ga;
    if (ga > gb) { A.w++; B.l++; A.pts += POINTS.win; B.pts += POINTS.loss; A.h2h[f.b] = (A.h2h[f.b] || 0) + 3; }
    else if (gb > ga) { B.w++; A.l++; B.pts += POINTS.win; A.pts += POINTS.loss; B.h2h[f.a] = (B.h2h[f.a] || 0) + 3; }
    else { A.d++; B.d++; A.pts += 1; B.pts += 1; A.h2h[f.b] = (A.h2h[f.b] || 0) + 1; B.h2h[f.a] = (B.h2h[f.a] || 0) + 1; }
  }
  const order = keys.slice().sort((a, b) => row[b].pts - row[a].pts || (row[b].gf - row[b].ga) - (row[a].gf - row[a].ga) || row[b].gf - row[a].gf || ((row[b].h2h[a] || 0) - (row[a].h2h[b] || 0)) || keys.indexOf(a) - keys.indexOf(b));
  return { order, rows: row };
}
