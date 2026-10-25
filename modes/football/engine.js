// modes/football/engine.js: pure football logic (no DOM, no network). Formations, position fit, auto line-up, team ratings and a seeded match simulation.
// One seeded simulation per fixture: "quick result" and "watch" show the same outcome because every device re-runs the same events.
import { mulberry32 } from "../../js/sim.js";

export const FORMATIONS = {
  "4-3-3": { label: "4-3-3", slots: [["GK", "GK"], ["DEF", "LB"], ["DEF", "CB"], ["DEF", "CB"], ["DEF", "RB"], ["MID", "CM"], ["MID", "CM"], ["MID", "CM"], ["FWD", "LW"], ["FWD", "ST"], ["FWD", "RW"]] },
  "4-4-2": { label: "4-4-2", slots: [["GK", "GK"], ["DEF", "LB"], ["DEF", "CB"], ["DEF", "CB"], ["DEF", "RB"], ["MID", "LM"], ["MID", "CM"], ["MID", "CM"], ["MID", "RM"], ["FWD", "ST"], ["FWD", "ST"]] },
  "3-5-2": { label: "3-5-2", slots: [["GK", "GK"], ["DEF", "CB"], ["DEF", "CB"], ["DEF", "CB"], ["MID", "LM"], ["MID", "CM"], ["MID", "CM"], ["MID", "CM"], ["MID", "RM"], ["FWD", "ST"], ["FWD", "ST"]] }
};
export const FORMATION_IDS = Object.keys(FORMATIONS);
export const XI = 11, BENCH_MAX = 7;
export const DEFAULT_FORMATION = "4-3-3";
export const normFormation = (f) => (FORMATIONS[f] ? f : DEFAULT_FORMATION);
export const slotsOf = (f) => FORMATIONS[normFormation(f)].slots.map(([line, code], i) => ({ i, line, code }));

const LINE = { goalkeeper: "GK", defender: "DEF", midfielder: "MID", forward: "FWD" };
const LINE_ORD = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
export const lineOf = (p) => LINE[p.position] || "MID";

// How well a player fits a slot: 1 = natural spot, 0.95 same line, 0.85 / 0.72 one / two lines away, 0.35 a keeper outfield or an outfielder in goal.
export function fit(p, slot) {
  if (!p) return 0;
  const pl = lineOf(p);
  if (pl === slot.line) return (p.positions || [p.pos]).includes(slot.code) ? 1 : 0.95;
  if (pl === "GK" || slot.line === "GK") return 0.35;
  return Math.abs(LINE_ORD[pl] - LINE_ORD[slot.line]) === 1 ? 0.85 : 0.72;
}
export const isKeeper = (p) => !!p && p.position === "goalkeeper";
const S = (p, k) => (typeof p[k] === "number" ? p[k] : 40);
// Stat view of a player used by the simulation (keepers have goalkeeping stats, everyone else the six outfield stats)
const outfield = (p) => (isKeeper(p) ? { pac: S(p, "spd") * 0.7, sho: 25, pas: S(p, "kic") * 0.8, dri: 30, def: 20, phy: 55 } : { pac: S(p, "pac"), sho: S(p, "sho"), pas: S(p, "pas"), dri: S(p, "dri"), def: S(p, "def"), phy: S(p, "phy") });
const gkRating = (p) => (isKeeper(p) ? (S(p, "div") + S(p, "han") + S(p, "ref") + S(p, "gkp") * 0.8 + S(p, "kic") * 0.2) / 3.99 : 25);

// ---------- line-up helpers ----------
// Best assignment of a set of players to the slots of a formation (greedy by "value above the field", then fixes duplicates). Returns an array of 11 ids.
export function arrange(players, formation) {
  const slots = slotsOf(formation), left = players.slice(), out = new Array(slots.length).fill(null);
  const order = slots.slice().sort((a, b) => (a.line === "GK" ? -1 : b.line === "GK" ? 1 : 0));   // the keeper slot first, it is the most position-bound
  for (const sl of order) {
    let best = -1, bs = -1;
    left.forEach((p, i) => { const sc = (p.ovr || 50) * fit(p, sl); if (sc > bs) { bs = sc; best = i; } });
    if (best >= 0) out[sl.i] = left.splice(best, 1)[0];
  }
  return out;
}
// Starting XI = the best 11 for the formation out of the whole squad; the rest, strongest first, form the bench. Returns ids: first 11 in slot order, then the bench.
export function autoLineup(squad, formation) {
  const slots = slotsOf(formation), left = squad.slice(), xi = new Array(slots.length).fill(null);
  const need = { GK: 1, DEF: 0, MID: 0, FWD: 0 }; slots.forEach((s) => { need[s.line]++; });
  const pick = (sl) => {
    let best = -1, bs = -1;
    left.forEach((p, i) => { const sc = (p.ovr || 50) * fit(p, sl) + (lineOf(p) === sl.line ? 3 : 0); if (sc > bs) { bs = sc; best = i; } });
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
// xi: players in slot order; formation id; minute (fatigue after 60'); fresh: ids that came on as subs (no fatigue)
export function ratings(xi, formation, { chem = false, minute = 0, fresh = new Set() } = {}) {
  const slots = slotsOf(formation);
  const acc = { att: [], ctl: [], def: [] }; let gk = 25, atkW = 0, ctlW = 0, defW = 0;
  const cm = chem ? 1 + chemistry(xi) * 0.004 : 1;
  xi.forEach((p, i) => {
    const sl = slots[i];
    const wa = sl.line === "FWD" ? 1 : sl.line === "MID" ? 0.7 : 0.25, wc = sl.line === "MID" ? 1 : sl.line === "FWD" ? 0.5 : 0.5, wd = sl.line === "DEF" ? 1 : sl.line === "MID" ? 0.7 : 0.15;
    if (!p) { if (sl.line !== "GK") { acc.att.push(0); atkW += wa; acc.ctl.push(0); ctlW += wc; acc.def.push(0); defW += wd; } return; }   // an empty slot (squad smaller than 11) counts as a zero
    const f = fit(p, sl), o = outfield(p);
    const tired = minute > 60 && !fresh.has(p.id) ? 1 - (minute - 60) * 0.0016 * (1.4 - Math.min(1, S(p, "phy") / 100)) : 1;
    const k = f * tired * cm;
    if (sl.line === "GK") { gk = gkRating(p) * f * tired * cm; return; }
    const att = sl.line === "FWD" ? 0.45 * o.sho + 0.25 * o.dri + 0.2 * o.pac + 0.1 * o.pas : sl.line === "MID" ? 0.3 * o.pas + 0.25 * o.dri + 0.25 * o.sho + 0.2 * o.pac : 0.5 * o.pas + 0.3 * o.dri + 0.2 * o.pac;
    const ctl = sl.line === "MID" ? 0.4 * o.pas + 0.3 * o.dri + 0.2 * o.def + 0.1 * o.phy : sl.line === "FWD" ? 0.5 * o.dri + 0.5 * o.pas : 0.6 * o.pas + 0.4 * o.dri;
    const def = sl.line === "DEF" ? 0.55 * o.def + 0.25 * o.phy + 0.2 * o.pac : sl.line === "MID" ? 0.5 * o.def + 0.3 * o.phy + 0.2 * o.pas : 0.6 * o.def + 0.4 * o.phy;
    acc.att.push(att * k * wa); atkW += wa; acc.ctl.push(ctl * k * wc); ctlW += wc; acc.def.push(def * k * wd); defW += wd;
  });
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  return { att: sum(acc.att) / (atkW || 1), ctl: sum(acc.ctl) / (ctlW || 1), def: sum(acc.def) / (defW || 1), gk, chem: chem ? chemistry(xi) : 0 };
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
          const tire = 1 - (m - 60) * 0.0016 * (1.4 - Math.min(1, S(p, "phy") / 100)), cur = (p.ovr || 50) * fit(p, slots[i]) * (t.fresh.has(p.id) ? 1 : tire);
          t.bench.forEach((b, j) => { if (isKeeper(b)) return; const g = (b.ovr || 50) * fit(b, slots[i]) - cur; if (g > bgain) { bgain = g; bi = i; bj = j; } });
        });
        if (bi >= 0) { const out = t.xi[bi], inn = t.bench.splice(bj, 1)[0]; t.xi[bi] = inn; t.fresh.add(inn.id); t.subs++; ev(m, "sub", { s: side, out: out.id, in: inn.id, on: inn.name, off: out.name }); }
      }
    }
    if (rd) for (const side of [0, 1]) {   // yellow ~1.5 / straight red ~0.04 (plus the odd second yellow) / injury ~0.15 per team per match; goalkeepers are never booked or hurt (keeps the simulation sane)
      const t = T[side], x = rd(), kind = x < 0.0004 ? "red" : x < 0.0174 ? "yellow" : x < 0.019 ? "injury" : null;
      if (!kind) continue;
      const sl = slotsOf(t.formation), cand = [];
      t.xi.forEach((p, i) => { if (p && sl[i].line !== "GK") cand.push({ i, w: (sl[i].line === "DEF" ? 1.3 : sl[i].line === "MID" ? 1.2 : 0.8) * (yellows.has(p.id) ? 0.2 : 1) }); });   // a player already on a yellow is booked less often (referees are lenient)
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
    const ra = ratings(T[0].xi, T[0].formation, { chem: true, minute: m, fresh: T[0].fresh }), rb = ratings(T[1].xi, T[1].formation, { chem: true, minute: m, fresh: T[1].fresh });
    const R = [ra, rb];
    const pa = Math.pow(ra.ctl, 3) / (Math.pow(ra.ctl, 3) + Math.pow(rb.ctl, 3)), s = rng() < pa ? 0 : 1, o = 1 - s;   // possession decides who attacks
    const atk = R[s], dfn = R[o];
    const pShot = clamp(0.46 + (atk.att - dfn.def) / 170, 0.2, 0.78);
    if (rng() > pShot) { if (rng() < 0.18) ev(m, "chance", { s, text: "block" }); continue; }
    // the shooter: a forward most often, then a midfielder, rarely a defender
    const slots = slotsOf(T[s].formation), cand = [];
    T[s].xi.forEach((p, i) => { if (!p || slots[i].line === "GK") return; const w = slots[i].line === "FWD" ? 5 : slots[i].line === "MID" ? 2.2 : 0.5; cand.push({ p, w: w * Math.pow(Math.max(5, outfield(p).sho) / 70, 2.2) }); });
    let tw = cand.reduce((x, c) => x + c.w, 0), r = rng() * tw, shooter = cand[cand.length - 1].p;
    for (const c of cand) { r -= c.w; if (r <= 0) { shooter = c.p; break; } }
    const helpers = cand.filter((c) => c.p.id !== shooter.id).sort((a, b) => outfield(b.p).pas * (0.5 + rng()) - outfield(a.p).pas * (0.5 + rng())), assist = helpers.length && rng() < 0.7 ? helpers[0].p : null;
    shots[s]++;
    const q = clamp(0.5 + (outfield(shooter).sho - 70) / 160 + (atk.att - dfn.def) / 400, 0.25, 0.8);
    if (rng() > q) { ev(m, "miss", { s, p: shooter.id, pn: lastName(shooter) }); continue; }
    onTarget[s]++;
    const keeper = dfn.gk, pGoal = clamp(0.31 * (1 + (outfield(shooter).sho - keeper) / 120) * (1 + (atk.att - dfn.def) / 350), 0.07, 0.72);
    if (rng() < pGoal) {
      score[s]++; scorers[s].push({ id: shooter.id, name: lastName(shooter), m });
      ev(m, "goal", { s, p: shooter.id, pn: lastName(shooter), a: assist ? assist.id : null, an: assist ? lastName(assist) : null });
    } else ev(m, "save", { s, p: shooter.id, pn: lastName(shooter) });
  }
  ev(90, "ft", {});
  return { score: score.slice(), events, scorers, winner: score[0] > score[1] ? "A" : score[1] > score[0] ? "B" : "draw", stats: { shots, onTarget }, onPitch: T.map((t) => t.xi.filter(Boolean).map((p) => p.id)) };
}

// Penalty shoot-out for knockout draws. Own random stream (never touches the match outcome). Takers = the best finishers on the pitch at full time (outfielders first, the keeper last); five kicks each, then sudden death.
export function shootout({ teams, seed, onPitch }) {
  const rng = mulberry32((seed >>> 0) ^ 0x5eed5eed);
  const side = teams.map((t, s) => {
    const m = new Map(t.xi.concat(t.bench).filter(Boolean).map((p) => [p.id, p])), ids = onPitch && onPitch[s] ? onPitch[s] : t.xi.filter(Boolean).map((p) => p.id);
    const pl = ids.map((id) => m.get(id)).filter(Boolean), gk = pl.find(isKeeper) || null, takers = pl.filter((p) => !isKeeper(p)).sort((a, b) => S(b, "sho") - S(a, "sho"));
    if (gk) takers.push(gk);
    return { takers: takers.length ? takers : t.xi.filter(Boolean), gk };
  });
  const kicks = [], pts = [0, 0], taken = [0, 0];
  const done = (coin) => ({ kicks, score: pts.slice(), winner: pts[0] > pts[1] ? 0 : pts[1] > pts[0] ? 1 : (rng() < 0.5 ? 0 : 1), coin: !!coin });
  for (let round = 0; round < 40; round++) {
    for (const s of [0, 1]) {
      const tk = side[s].takers, p = tk[taken[s] % tk.length], gkR = side[1 - s].gk ? gkRating(side[1 - s].gk) : 25;
      const pGoal = clamp(0.76 + (S(p, "sho") - 70) / 250 - (gkR - 70) / 300, 0.5, 0.92);
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
