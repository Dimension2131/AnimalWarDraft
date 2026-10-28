// modes/basketball/engine.js: pure basketball logic (no DOM, no network).
// Position modes, line-up helpers, team ratings and a seeded possession-by-possession game simulation.
// One seeded simulation per game: "instant" and "live" replays show the same outcome because every device re-runs the same events.
import { mulberry32 } from "../../js/sim.js";
import { MAINS, SUBS, mainsOf } from "../../basketball/ratings.js";
export { MAINS, SUBS, mainsOf };

export const STARTERS = 5, BENCH_MAX = 10;
export const QUARTER_SECS = 720, OT_SECS = 300, MAX_OT = 8, REG_SECS = QUARTER_SECS * 4;

// ---------- position modes ----------
// strict: five positions (PG SG SF PF C). groups: Guard / Wing / Big (G G W W B). open: positionless (no position penalty; the stats decide).
export const POS_MODES = ["strict", "groups", "open"];
export const POS_LABEL = { strict: "Five positions", groups: "Guard / Wing / Big", open: "Positionless" };
export const DEFAULT_POS_MODE = "strict";
export const normPosMode = (m) => (POS_MODES.includes(m) ? m : DEFAULT_POS_MODE);
const SLOT_CODES = { strict: ["PG", "SG", "SF", "PF", "C"], groups: ["G", "G", "W", "W", "B"], open: ["ANY", "ANY", "ANY", "ANY", "ANY"] };
export const slotsOf = (mode) => SLOT_CODES[normPosMode(mode)].map((code, i) => ({ i, code }));

// ---------- coach tactics (saved with the line-up) ----------
export const PACES = ["slow", "normal", "fast"], FOCUSES = ["inside", "balanced", "outside"];
export const PACE_LABEL = { slow: "Slow: fewer possessions, less fatigue", normal: "Normal", fast: "Fast: more possessions, more turnovers, more fatigue" };
export const FOCUS_LABEL = { inside: "Inside: feed the paint", balanced: "Balanced", outside: "Outside: more threes" };
export const DEFAULT_TACTICS = { pace: "normal", focus: "balanced" };
export const normTactics = (t) => ({ pace: PACES.includes(t && t.pace) ? t.pace : "normal", focus: FOCUSES.includes(t && t.focus) ? t.focus : "balanced" });

const ORD = { PG: 0, SG: 1, SF: 2, PF: 3, C: 4 }, GRP = { PG: "G", SG: "G", SF: "W", PF: "B", C: "B" }, GORD = { G: 0, W: 1, B: 2 };
const DIST = [1, 0.94, 0.86, 0.78, 0.7];
const S = (p, k) => (p && typeof p[k] === "number" ? p[k] : 40);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// How well a player fits a slot: 1 = natural spot, 0.97 a secondary position, then 0.94 / 0.86 / 0.78 / 0.70 for one to four positions away (strict);
// groups: 1 same group, 0.92 next group, 0.80 guard-at-big or big-at-guard. Positionless: always 1.
export function fit(p, slot, mode) {
  if (!p) return 0;
  mode = normPosMode(mode); if (mode === "open" || !slot) return 1;
  const poss = p.positions && p.positions.length ? p.positions : [p.pos];
  let best = 0;
  poss.forEach((q, k) => {
    let f = mode === "strict" ? DIST[Math.abs((ORD[q] ?? 2) - (ORD[slot.code] ?? 2))] : [1, 0.92, 0.8][Math.abs((GORD[GRP[q]] ?? 1) - (GORD[slot.code] ?? 1))];
    if (k > 0) f = f === 1 ? 0.97 : f - 0.01;
    best = Math.max(best, f);
  });
  return best;
}
export const surname = (p) => { const w = String(p.name).trim().split(/\s+/); return w.length > 1 && /^(jr\.?|sr\.?|ii|iii)$/i.test(w[w.length - 1]) ? w.slice(-2).join(" ") : w.length > 1 && /^(de|van|von|el|al|abdul)$/i.test(w[w.length - 2]) ? w.slice(-2).join(" ") : w[w.length - 1]; };

// ---------- composites (card strips and the pre-game comparison) ----------
export const offOf = (p) => 0.45 * Math.max(S(p, "ins"), S(p, "mid"), S(p, "thr")) + 0.25 * (S(p, "ins") + S(p, "mid") + S(p, "thr")) / 3 + 0.15 * S(p, "ft") + 0.15 * S(p, "iq");
export const plyOf = (p) => 0.45 * S(p, "pas") + 0.35 * S(p, "han") + 0.2 * S(p, "iq");
export const defOf = (p) => 0.35 * S(p, "per") + 0.25 * S(p, "int") + 0.15 * S(p, "stl") + 0.15 * S(p, "blk") + 0.1 * S(p, "iq");
export const rimOf = (p) => 0.55 * S(p, "int") + 0.45 * S(p, "blk");
export const athOf = (p) => (S(p, "spd") + S(p, "ath") + S(p, "str") + S(p, "sta")) / 4;
export const composites = (p) => Object.fromEntries(MAINS.map((m) => [m.abbr, typeof p[m.key] === "number" ? p[m.key] : mainsOf(p)[m.key]]));   // the 7 main ratings by abbreviation

// ---------- line-up helpers ----------
// Chemistry: team-mates who share the franchise they are known for (+1 per extra player, at most 6 = +1.8% on every rating).
export function chemistry(xi) {
  const c = {}; for (const p of xi) if (p) c[p.team] = (c[p.team] || 0) + 1;
  let pts = 0; for (const v of Object.values(c)) if (v >= 2) pts += v - 1;
  return Math.min(6, pts);
}
// A small bonus for a balanced five (a ball handler, a rim protector, shooting). Used only to choose between near-equal line-ups.
export function balance(xi) {
  const pl = xi.filter(Boolean); if (!pl.length) return 0;
  const hnd = Math.max(...pl.map((p) => S(p, "han"))), rim = Math.max(...pl.map(rimOf)), sh = pl.filter((p) => S(p, "thr") >= 80).length, reb = Math.max(...pl.map((p) => S(p, "reb")));
  return (hnd >= 85 ? 3 : hnd >= 72 ? 1.5 : 0) + (rim >= 80 ? 3 : rim >= 66 ? 1.5 : 0) + Math.min(2, sh) * 1.2 + (reb >= 80 ? 1.5 : 0);
}
// Best assignment of exactly these players to the slots of the mode. Returns players in slot order.
export function arrange(players, mode) {
  const slots = slotsOf(mode), pl = players.filter(Boolean).slice(0, slots.length), want = pl.length;
  let best = null, bs = -1; const used = new Array(want).fill(false), cur = new Array(want).fill(null);
  (function rec(i, sc) {
    if (i === want) { const tot = sc + balance(cur); if (tot > bs) { bs = tot; best = cur.slice(); } return; }
    for (let j = 0; j < want; j++) { if (used[j]) continue; used[j] = true; cur[i] = pl[j]; rec(i + 1, sc + (pl[j].ovr || 50) * fit(pl[j], slots[i], mode)); used[j] = false; cur[i] = null; }
  })(0, 0);
  const out = (best || []).slice(); while (out.length < slots.length) out.push(null);
  return out;
}
// Starting five = the best five for the mode out of the whole roster (searches the best 9 by overall); the rest, strongest first, form the bench.
// Returns ids: first 5 in slot order, then the bench.
export function autoLineup(squad, mode) {
  const slots = slotsOf(mode), sorted = squad.slice().sort((a, b) => (b.ovr || 0) - (a.ovr || 0) || String(a.id).localeCompare(String(b.id)));
  const cand = sorted.slice(0, Math.min(sorted.length, 9)), want = Math.min(slots.length, cand.length);
  let best = null, bs = -1; const used = new Array(cand.length).fill(false), cur = new Array(want).fill(null);
  (function rec(i, sc) {
    if (i === want) { const tot = sc + balance(cur); if (tot > bs) { bs = tot; best = cur.slice(); } return; }
    for (let j = 0; j < cand.length; j++) { if (used[j]) continue; used[j] = true; cur[i] = cand[j]; rec(i + 1, sc + (cand[j].ovr || 50) * fit(cand[j], slots[i], mode)); used[j] = false; cur[i] = null; }
  })(0, 0);
  const xi = best || [], ids = new Set(xi.map((p) => p.id));
  return xi.map((p) => p.id).concat(sorted.filter((p) => !ids.has(p.id)).map((p) => p.id));
}
// Swap two positions in a line-up order (indexes 0..4 = starters in slot order, 5+ = bench in rotation order). Returns a NEW array.
export function swapIdx(order, a, b) {
  const o = order.slice();
  if (!(a >= 0 && b >= 0 && a < o.length && b < o.length) || a === b) return o;
  [o[a], o[b]] = [o[b], o[a]];
  return o;
}
export const validOrder = (order, squadIds) => Array.isArray(order) && order.length === squadIds.length && [...order].sort().join() === [...squadIds].sort().join();

// ---------- team ratings (the pre-game comparison is display only: the game itself is the simulation) ----------
export function ratings(xi, mode, { chem = false } = {}) {
  const slots = slotsOf(mode), cm = chem ? 1 + chemistry(xi) * 0.003 : 1, rows = [];
  xi.forEach((p, i) => { if (p) rows.push({ p, k: fit(p, slots[i], mode) * cm }); });
  const top = (arr, w) => { const s = arr.slice().sort((a, b) => b - a); let t = 0, ws = 0; w.forEach((x, i) => { if (i < s.length) { t += s[i] * x; ws += x; } }); return ws ? t / ws : 0; };
  const miss = (STARTERS - rows.length) * 0.06;   // an empty spot counts against the whole team
  return {
    off: top(rows.map((r) => offOf(r.p) * r.k), [0.32, 0.24, 0.18, 0.14, 0.12]) * (1 - miss),
    ply: top(rows.map((r) => plyOf(r.p) * r.k), [0.45, 0.3, 0.15, 0.1]) * (1 - miss),
    per: top(rows.map((r) => (0.6 * S(r.p, "per") + 0.2 * S(r.p, "stl") + 0.2 * S(r.p, "spd")) * r.k), [0.3, 0.25, 0.2, 0.15, 0.1]) * (1 - miss),
    rim: top(rows.map((r) => rimOf(r.p) * r.k), [0.62, 0.38]) * (1 - miss),
    reb: top(rows.map((r) => S(r.p, "reb") * r.k), [0.4, 0.3, 0.2, 0.1]) * (1 - miss),
    ath: top(rows.map((r) => athOf(r.p) * r.k), [0.2, 0.2, 0.2, 0.2, 0.2]) * (1 - miss),
    chem: chem ? chemistry(xi) : 0
  };
}
export function compare(A, B) {
  const ra = ratings(A.xi, A.mode, { chem: true }), rb = ratings(B.xi, B.mode, { chem: true });
  const rows = [["Scoring", ra.off, rb.off], ["Playmaking", ra.ply, rb.ply], ["Perimeter defense", ra.per, rb.per], ["Rim protection", ra.rim, rb.rim], ["Rebounding", ra.reb, rb.reb], ["Athleticism", ra.ath, rb.ath]];
  const depth = (T) => { const b = (T.bench || []).slice().sort((x, y) => (y.ovr || 0) - (x.ovr || 0)).slice(0, 5); return b.length ? b.reduce((a, p) => a + (p.ovr || 0), 0) / 5 : 0; };
  rows.push(["Bench depth", depth(A), depth(B)]);
  return { rows: rows.map(([label, a, b]) => ({ label, a: Math.round(a), b: Math.round(b) })), chem: [ra.chem, rb.chem] };
}

// ---------- game simulation ----------
// Tunable constants (calibrated by tools/test-basketball.mjs against typical box-score averages).
const K = {
  pace: 14.8, tov: 0.15, nsFoul: 0.1, oreb: 0.265,
  insBase: 0.5, midBase: 0.37, thrBase: 0.33, fbBase: 0.6,
  foulIns: 0.17, foulMid: 0.07, foulThr: 0.04, foulFb: 0.15,
  blkIns: 0.115, blkMid: 0.03, blkThr: 0.012, blkFb: 0.05,
  drain: 3.4, rec: 4.2
};
const ef = (e) => 0.8 + 0.2 * (e / 100);
const emptyBox = () => ({ pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0, pm: 0, secs: 0 });

// Minutes plan (seconds of a 48-minute game): the five starters carry the most, then the bench in rotation order; nobody is planned beyond his stamina.
function minutesPlan(states) {
  const n = states.length, total = REG_SECS * Math.min(5, n), w = states.map((s, i) => (i < 5 ? 1 : 0.62 * Math.pow(0.8, i - 5)) * Math.pow(Math.max(40, S(s.p, "ovr")) / 90, 3));
  const cap = states.map((s) => (n <= 5 ? REG_SECS : Math.min(REG_SECS, (30 + S(s.p, "sta") * 0.14) * 60))), alloc = new Array(n).fill(0), capped = new Array(n).fill(false);
  for (let it = 0; it < 8; it++) {
    let rem = total, sw = 0; for (let i = 0; i < n; i++) { if (capped[i]) rem -= alloc[i]; else sw += w[i]; }
    if (sw <= 0) break; let again = false;
    for (let i = 0; i < n; i++) { if (capped[i]) continue; alloc[i] = (rem * w[i]) / sw; if (alloc[i] > cap[i]) { alloc[i] = cap[i]; capped[i] = true; again = true; } }
    if (!again) break;
  }
  return alloc;
}

// teams: [{ name, mode?, tactics?, xi: [players in slot order], bench: [players in rotation order] }, ...]
// Returns { score, quarters, ot, events, box, team, winner: "A"|"B", totalSecs, coin }.
export function simulateGame({ teams, seed, mode = DEFAULT_POS_MODE, injuries = false }) {
  mode = normPosMode(mode);
  const rng = mulberry32((seed >>> 0) ^ 0x9e3779b9), rd = injuries ? mulberry32((seed >>> 0) ^ 0x7f4a7c15) : null;
  const slots = slotsOf(mode);
  const T = teams.map((t, side) => {
    const roster = t.xi.filter(Boolean).concat(t.bench || []);
    const states = roster.map((p, i) => ({ p, i, side, e: 100, fouls: 0, stint: 0, rest: 0, out: false, inj: false, waived: false, on: false, slot: -1, fit: 1, tpf: 0, box: emptyBox() }));
    const on = new Array(STARTERS).fill(null);
    t.xi.forEach((p, i) => { if (!p || i >= STARTERS) return; const st = states.find((s) => s.p.id === p.id); st.on = true; st.slot = i; st.fit = fit(p, slots[i], mode); on[i] = st; });
    // a short xi (fewer than 5 players) leaves empty slots; bench players never fill them on their own
    const plan = minutesPlan(states), tac = normTactics(t.tactics);
    return { name: t.name, states, on, tac, plan, to: 7, lastSub: -999, pf: 0, tfq: 0, heat: 0, run: 0, tf: 0, timeouts: 0, ex: { paint: 0, fb: 0, second: 0, offTov: 0, runMax: 0 }, qs: [] };
  });
  const score = [0, 0], events = [], quarters = [];
  let gt = 0, q = 1, clk = QUARTER_SECS, leadChanges = 0, ties = 0, maxLead = [0, 0], lastLeader = -1;
  const ev = (e, o) => events.push({ gt: Math.round(gt * 10) / 10, q, clk: Math.round(clk * 10) / 10, e, ...o, score: score.slice() });
  const pickW = (list, wf) => { let tw = 0; const ws = list.map((x) => { const w = Math.max(0.0001, wf(x)); tw += w; return w; }); let r = rng() * tw; for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i]; } return list[list.length - 1]; };
  const onList = (side) => T[side].on.filter(Boolean);
  const E = (st, k, cm) => S(st.p, k) * st.fit * ef(st.e) * cm;
  const cmOf = (side) => 1 + chemistry(onList(side).map((s) => s.p)) * 0.003;
  const nameOf = (st) => surname(st.p);

  // time passes: everyone on the floor tires, everyone on the bench recovers
  function advance(sec) {
    sec = Math.min(sec, clk); if (sec <= 0) return 0;
    clk -= sec; gt += sec;
    for (const t of T) {
      const fastK = t.tac.pace === "fast" ? 1.1 : t.tac.pace === "slow" ? 0.92 : 1;
      for (const st of t.states) {
        if (st.on) { st.box.secs += sec; st.stint += sec; st.e = Math.max(0, st.e - ((K.drain - 0.014 * S(st.p, "sta")) * fastK * sec) / 60); }
        else { st.rest += sec; st.e = Math.min(100, st.e + (K.rec * (st.out ? 0.5 : 1) * sec) / 60); }
      }
    }
    return sec;
  }
  function addPts(side, pts, st, flags) {
    score[side] += pts; if (st) st.box.pts += pts;
    for (const p of onList(side)) p.box.pm += pts; for (const p of onList(1 - side)) p.box.pm -= pts;
    const t = T[side], o = T[1 - side]; t.run += pts; o.run = 0; t.ex.runMax = Math.max(t.ex.runMax, t.run);
    t.heat = clamp(t.heat + 0.05 * pts, -1, 1); o.heat = clamp(o.heat - 0.035 * pts, -1, 1);
    if (flags && flags.paint) t.ex.paint += pts; if (flags && flags.fb) t.ex.fb += pts; if (flags && flags.second) t.ex.second += pts; if (flags && flags.offTov) t.ex.offTov += pts;
    const lead = score[side] - score[1 - side]; if (lead > maxLead[side]) maxLead[side] = lead;
    const ld = score[0] > score[1] ? 0 : score[1] > score[0] ? 1 : -1;
    if (ld === -1 && lastLeader !== -1) ties++; if (ld !== -1 && lastLeader !== -1 && ld !== lastLeader) leadChanges++; if (ld !== -1) lastLeader = ld; else if (lastLeader === -1) lastLeader = -1;
  }

  // ---- substitutions ----
  const available = (t) => t.states.filter((s) => !s.on && !s.out);
  function putIn(t, slot, inn, why) {
    const out = t.on[slot]; if (out) { out.on = false; out.rest = 0; out.stint = 0; out.slot = -1; }
    inn.on = true; inn.stint = 0; inn.rest = 0; inn.slot = slot; inn.fit = fit(inn.p, slots[slot], mode); t.on[slot] = inn; t.lastSub = gt;
    ev("sub", { s: t === T[0] ? 0 : 1, out: out ? out.p.id : null, in: inn.p.id, off: out ? nameOf(out) : "", on: nameOf(inn), why });
  }
  const periodFoulLimit = () => (q === 1 ? 2 : q === 2 ? 3 : q === 3 ? 4 : 5);
  const garbage = () => { const d = Math.abs(score[0] - score[1]); return q >= 4 && ((d >= 22 && clk <= 480) || (d >= 32 && clk <= 720)); };
  function rotate(side, force) {
    const t = T[side], clutch = q >= 4 && clk <= 300 && Math.abs(score[0] - score[1]) <= 8, regPlayed = Math.min(gt, REG_SECS * 1.2);
    // 1. forced: a fouled-out or injured player leaves
    for (let i = 0; i < STARTERS; i++) {
      const st = t.on[i]; if (!st || !st.out) continue;
      const pool = available(t); if (!pool.length) { st.on = false; t.on[i] = null; continue; }   // nobody left: play short-handed
      let bj = null, bs = -1; for (const b of pool) { const v = b.p.ovr * fit(b.p, slots[i], mode) * ef(b.e); if (v > bs) { bs = v; bj = b; } }
      putIn(t, i, bj, st.inj ? "injury" : "fouls");
    }
    // empty slot and somebody available (after an injury elsewhere): fill it
    for (let i = 0; i < STARTERS; i++) if (!t.on[i]) { const pool = available(t); if (!pool.length) break; const b = pool.slice().sort((x, y) => y.p.ovr * ef(y.e) - x.p.ovr * ef(x.e))[0]; putIn(t, i, b, "short"); }
    if (!force && gt - t.lastSub < 60) return;
    const want = (st) => (t.plan[st.i] * regPlayed) / (REG_SECS * 1.0), mw = clutch ? 0.45 : 1;
    if (garbage()) {   // the game is decided: starters sit
      for (let i = 0; i < STARTERS; i++) { const st = t.on[i]; if (!st || st.i >= STARTERS) continue; const pool = available(t).filter((b) => b.i >= STARTERS && b.e > 55); if (!pool.length) continue; putIn(t, i, pool.sort((a, b) => a.i - b.i)[0], "rest"); }
      return;
    }
    for (let swaps = 0; swaps < 2; swaps++) {
      const pool = available(t).filter((b) => b.rest >= 60 || b.box.secs === 0); if (!pool.length) return;
      let bi = -1, bj = null, bgain = 1;
      for (let i = 0; i < STARTERS; i++) {
        const st = t.on[i]; if (!st || st.stint < 150) continue;
        const over = (st.box.secs - want(st)) / 60;
        const trouble = st.fouls >= periodFoulLimit() && !clutch ? 14 : st.fouls >= 5 ? 10 : 0;
        const cur = st.p.ovr * st.fit * ef(st.e) - 3.5 * mw * Math.max(0, over) + 1.2 * mw * Math.max(0, -over) - trouble;
        for (const b of pool) {
          const under = (want(b) - b.box.secs) / 60, rank = b.i >= STARTERS ? Math.max(0, 1.5 - 0.5 * (b.i - STARTERS)) : 0;
          const tr = b.fouls >= periodFoulLimit() && !clutch ? 14 : b.fouls >= 5 ? 10 : 0;
          const v = b.p.ovr * fit(b.p, slots[i], mode) * ef(b.e) + 3.5 * mw * Math.max(0, under) - 1.2 * mw * Math.max(0, -under) + rank - tr;
          if (v - cur > bgain) { bgain = v - cur; bi = i; bj = b; }
        }
      }
      if (bi < 0) return;
      putIn(t, bi, bj, "rotation"); pool.splice(pool.indexOf(bj), 1);
    }
  }

  // ---- free throws, fouls, rebounds ----
  const ftMake = (st, cm, clutch) => clamp(0.06 + E(st, "ft", cm) * 0.0093 + (clutch ? (S(st.p, "clu") - 70) / 900 : 0), 0.3, 0.97);
  function foulBy(side, pick) {   // a foul charged to the defence; returns the player (or null)
    const t = T[side], pl = onList(side); if (!pl.length) return null;
    const st = pick || pickW(pl, (x) => Math.pow((135 - S(x.p, "iq")) / 60, 2) * (x.fouls >= 5 ? 0.35 : 1));
    st.fouls++; st.box.pf++; t.pf++; t.tfq++;
    if (st.fouls >= 6) { if (available(t).length) st.out = true; else st.waived = true; }
    return st;
  }
  function shootFts(O, st, n, cm, flags, tag) {
    let made = 0, last = false; const clutch = q >= 4 && clk <= 300 && Math.abs(score[0] - score[1]) <= 5;
    for (let i = 1; i <= n; i++) {
      const ok = rng() < ftMake(st, cm, clutch); st.box.fta++; if (ok) { st.box.ftm++; made++; addPts(O, 1, st, flags); }
      ev("ft", { s: O, p: st.p.id, pn: nameOf(st), made: ok, i, n, tag }); last = ok;
    }
    return { made, lastMade: last };
  }
  function rebound(O, pLast) {   // after a miss; returns { off: bool, st }
    const D = 1 - O, cmO = cmOf(O), cmD = cmOf(D), ol = onList(O), dl = onList(D);
    const rs = (st, cm, k) => Math.pow((0.7 * E(st, k, cm) + 0.15 * E(st, "str", cm) + 0.15 * E(st, "ath", cm)) / 70, 1.8) * (1 + (S(st.p, "height_cm") - 195) / 140);   // k: "oreb" for the team that missed, "dreb" for the other
    const RO = ol.reduce((a, s) => a + rs(s, cmO, "oreb"), 0), RD = dl.reduce((a, s) => a + rs(s, cmD, "dreb"), 0);
    let pO = clamp(K.oreb * Math.pow((RO + 1e-9) / (RD + 1e-9), 0.5), 0.1, 0.42); if (!ol.length) pO = 0; if (!dl.length) pO = 1; if (pLast) pO *= 0.7;
    const off = rng() < pO, side = off ? O : D, list = off ? ol : dl, cm = off ? cmO : cmD;
    if (!list.length) return { off, st: null };
    const st = pickW(list, (s) => rs(s, cm, off ? "oreb" : "dreb"));
    if (off) st.box.oreb++; else st.box.dreb++;
    ev("reb", { s: side, p: st.p.id, pn: nameOf(st), off });
    return { off, st };
  }

  // ---- one possession ----
  function maybeTimeout(side) {   // side = the team that may call it
    const t = T[side]; if (t.to <= 0 || clk <= 1) return;
    const o = T[1 - side], lead = score[side] - score[1 - side];
    let p = 0; if (o.run >= 10) p = 0.9; else if (o.run >= 7) p = 0.45; else if (q >= 4 && clk <= 180 && lead < 0 && lead >= -8 && o.run >= 4) p = 0.3; else if (q >= 4 && clk <= 30 && lead < 0 && lead >= -3) p = 0.5;
    if (p > 0 && rng() < p) { t.to--; t.timeouts++; o.run = 0; t.heat = 0; o.heat *= 0.4; for (const st of onList(side)) st.e = Math.min(100, st.e + 5); ev("timeout", { s: side, left: t.to }); rotate(side, true); }
  }
  // returns { next: side with the ball, kind: "normal" | "fast", tov: bool }
  function possession(O, kind, afterTov) {
    const D = 1 - O, tO = T[O], tD = T[D];
    rotate(O, false); rotate(D, false);
    let ol = onList(O), dl = onList(D);
    const flags = { offTov: afterTov, paint: false, fb: kind === "fast", second: false };
    const cmO = cmOf(O), cmD = cmOf(D);
    if (!ol.length) { advance(Math.min(clk, 12)); return { next: D, kind: "normal", tov: false }; }
    const lead = score[O] - score[D], late = q >= 4 || q >= 5;
    // base time of the possession
    const avgSpd = ol.reduce((a, s) => a + E(s, "spd", cmO), 0) / ol.length;
    const pace = (tO.tac.pace === "fast" ? 0.9 : tO.tac.pace === "slow" ? 1.1 : 1) * (tD.tac.pace === "fast" ? 0.97 : tD.tac.pace === "slow" ? 1.03 : 1) * (1 - (avgSpd - 70) / 520);
    let dur = kind === "fast" ? 5 + rng() * 5 : K.pace * pace * (0.55 + 0.9 * ((rng() + rng()) / 2));
    if (late && clk <= 150) { if (lead < 0) dur *= 0.62; else if (lead > 0 && lead <= 12) dur *= 1.3; }
    // intentional fouling by a trailing defence late in the game
    if (late && clk > 3 && clk <= 45 && score[D] < score[O] && score[O] - score[D] <= 9 && kind !== "fast" && rng() < 0.85) {
      const sec = advance(Math.min(clk, 2 + rng() * 2)), shooter = pickW(ol, (s) => Math.pow(E(s, "ft", cmO) / 70, 4) * (0.5 + E(s, "han", cmO) / 100));
      const f = foulBy(D, pickW(dl.filter((x) => x.fouls < 5).length ? dl.filter((x) => x.fouls < 5) : dl, (x) => 1 + (100 - S(x.p, "ath")) / 50));
      if (f) ev("foul", { s: D, p: f.p.id, pn: nameOf(f), kind: "intentional", n: f.fouls });
      const r = shootFts(O, shooter, 2, cmO, flags, "intentional");
      if (f && f.out) { /* leaves at the next dead ball */ }
      if (!r.lastMade) { const rb = rebound(O, true); if (rb.off) return { next: O, kind: "oreb", tov: false, cont: true }; return { next: D, kind: "normal", tov: false }; }
      return { next: D, kind: "normal", tov: false };
    }
    // running out the clock when leading in the closing seconds
    if (late && dur >= clk && lead > 0 && rng() < 0.9) { advance(clk); return { next: D, kind: "normal", tov: false }; }
    let afterOreb = false, loops = 0;
    for (;;) {
      loops++; ol = onList(O); dl = onList(D);
      if (!ol.length) return { next: D, kind: "normal", tov: false };
      const isFirst = loops === 1, d = isFirst ? dur : 3 + rng() * 4;
      const used = advance(Math.min(d, clk)); const buzzer = clk <= 0.0001;
      // the matching defender of every attacker: tallest guards tallest
      const oBy = ol.slice().sort((a, b) => S(b.p, "height_cm") - S(a.p, "height_cm") || a.i - b.i), dBy = dl.slice().sort((a, b) => S(b.p, "height_cm") - S(a.p, "height_cm") || a.i - b.i);
      const matchOf = (st) => (dBy.length ? dBy[Math.min(oBy.indexOf(st), dBy.length - 1)] : null);
      const clutch = q >= 4 && clk <= 300 && Math.abs(score[0] - score[1]) <= 5;
      const mo = clamp(tO.heat - tD.heat, -1, 1) * 0.016, man = 0.035 * (ol.length - 5) + 0.035 * (5 - dl.length);
      const tempoT = tO.tac.pace === "fast" ? 0.012 : tO.tac.pace === "slow" ? -0.01 : 0;
      // turnover (not when the possession goes on after a rebound within a few seconds, which is rare)
      const hnd = ol.map((s) => E(s, "han", cmO)).sort((a, b) => b - a), sec = 0.58 * ((hnd[0] + (hnd[1] ?? hnd[0])) / 2) + 0.42 * (ol.reduce((a, s) => a + E(s, "iq", cmO), 0) / ol.length);
      const press = dl.map((s) => E(s, "stl", cmD)).sort((a, b) => b - a).slice(0, 3).reduce((a, x, _, arr) => a + x / arr.length, 0);
      const pTov = clamp(K.tov + ((dl.length ? press : 50) - sec) / 380 + tempoT + (afterOreb ? -0.06 : 0) + (kind === "fast" ? -0.1 : 0), 0.02, 0.24);
      if (rng() < pTov) {
        const tv = pickW(ol, (s) => Math.pow((0.5 * E(s, "han", cmO) + 0.25 * E(s, "pas", cmO) + 0.25 * offOf(s.p)) / 70, 3)), pSteal = clamp(0.55 + (press - 65) / 300, 0.3, 0.8);
        let stl = null; if (dl.length && rng() < pSteal) stl = pickW(dl, (s) => Math.pow(E(s, "stl", cmD) / 70, 3));
        tv.box.tov++; if (stl) stl.box.stl++;
        ev("tov", { s: O, p: tv.p.id, pn: nameOf(tv), stl: stl ? stl.p.id : null, stn: stl ? nameOf(stl) : null });
        return { next: D, kind: stl && rng() < 0.55 ? "fast" : "normal", tov: true };
      }
      // a foul away from the ball
      if (!buzzer && rng() < K.nsFoul) {
        const f = foulBy(D); if (f) ev("foul", { s: D, p: f.p.id, pn: nameOf(f), kind: "loose", n: f.fouls });
        if (tD.tfq >= 5 && ol.length) {
          const sh = pickW(ol, (s) => Math.pow(E(s, "ft", cmO) / 70, 3) * (0.4 + E(s, "han", cmO) / 100));
          const r = shootFts(O, sh, 2, cmO, flags, "bonus");
          if (!r.lastMade) { const rb = rebound(O, true); if (rb.off) { afterOreb = true; flags.second = true; if (clk <= 0) return { next: D, kind: "normal", tov: false }; continue; } return { next: D, kind: "normal", tov: false }; }
          return { next: D, kind: "normal", tov: false };
        }
      }
      // who shoots, from where
      const usage = (s) => { const sa = 0.45 * Math.max(E(s, "ins", cmO), E(s, "mid", cmO), E(s, "thr", cmO)) + 0.2 * (E(s, "ins", cmO) + E(s, "mid", cmO) + E(s, "thr", cmO)) / 3 + 0.35 * s.p.ovr * s.fit * ef(s.e); return Math.pow(sa / 70, 4.2) * (clutch ? Math.pow(E(s, "clu", cmO) / 75, 3) : 1); };
      let shooter, shotKind;
      if (kind === "fast" && isFirst) { shooter = pickW(ol, (s) => Math.pow((0.4 * E(s, "spd", cmO) + 0.3 * E(s, "ath", cmO) + 0.3 * E(s, "ins", cmO)) / 70, 4)); shotKind = "fb"; }
      else {
        shooter = pickW(ol, usage);
        const sz = clamp((S(shooter.p, "height_cm") - 190) / 30, 0, 1), fI = tO.tac.focus === "inside" ? 1.28 : tO.tac.focus === "outside" ? 0.85 : 1, fT = tO.tac.focus === "outside" ? 1.28 : tO.tac.focus === "inside" ? 0.8 : 1;
        const w = [["ins", Math.pow(E(shooter, "ins", cmO) / 100, 2.2) * (0.8 + 0.45 * sz) * fI], ["mid", Math.pow(E(shooter, "mid", cmO) / 100, 2.4) * 0.75], ["thr", Math.pow(E(shooter, "thr", cmO) / 100, 2.8) * 1.5 * fT]];
        shotKind = pickW(w, (x) => x[1])[0];
      }
      const md = matchOf(shooter), pd = md ? (0.4 * E(md, "per", cmD) + 0.15 * E(md, "lat", cmD) + 0.2 * E(md, "stl", cmD) * 0.75 + 0.1 * E(md, "int", cmD)) : 55;   // the matching defender
      const rimR = dl.map((s) => 0.55 * E(s, "int", cmD) + 0.45 * E(s, "blk", cmD)).sort((a, b) => b - a), rim = dl.length ? 0.62 * rimR[0] + 0.38 * (rimR[1] ?? rimR[0]) : 40;
      const perD = dl.length ? dl.reduce((a, s) => a + E(s, "per", cmD), 0) / dl.length : 40;
      const spacing = ol.length > 1 ? ol.filter((s) => s !== shooter).reduce((a, s) => a + E(s, "thr", cmO), 0) / (ol.length - 1) : 50;
      // assisted?
      let passer = null; const others = ol.filter((s) => s !== shooter);
      if (others.length) {
        const pas = others.map((s) => E(s, "pas", cmO)).sort((a, b) => b - a), tp = 0.88 + 0.24 * clamp(((pas[0] + (pas[1] ?? pas[0])) / 2 - 55) / 40, 0, 1);
        const base = { ins: 0.44, mid: 0.38, thr: 0.74, fb: 0.4 }[shotKind] * tp * clamp(1.18 - (E(shooter, "han", cmO) - 60) / 220, 0.8, 1.15);
        if (rng() < base) passer = pickW(others, (s) => Math.pow(E(s, "pas", cmO) / 70, 3.5) * (0.6 + E(s, "iq", cmO) / 175));
      }
      const as = passer ? (shotKind === "thr" ? 0.04 : 0.03) : 0, cl = clutch ? (E(shooter, "clu", cmO) - 70) / 700 : 0, hurried = buzzer && lead <= 0 ? -0.05 : 0;
      let pm;
      const fin = 0.62 * E(shooter, "ins", cmO) + 0.19 * E(shooter, "dunk", cmO) + 0.19 * E(shooter, "post", cmO);   // finishing at the rim: close shots, dunks and post moves
      if (shotKind === "fb") pm = K.fbBase + (0.5 * E(shooter, "ins", cmO) + 0.5 * E(shooter, "dunk", cmO) - 72) / 260 - (rim - 62) / 900;
      else if (shotKind === "ins") pm = K.insBase + (fin - 72) / 170 + (E(shooter, "ath", cmO) - 70) / 700 - (rim - 62) / 340 - (pd - 62) / 700 + (spacing - 55) / 700;
      else if (shotKind === "mid") pm = K.midBase + (E(shooter, "mid", cmO) - 72) / 190 - (pd - 62) / 360 - (perD - 65) / 800;
      else pm = K.thrBase + (E(shooter, "thr", cmO) - 72) / 210 - (pd - 62) / 440 - (perD - 65) / 900;
      pm = clamp(pm + as + cl + mo + hurried + man + form[O], 0.18, shotKind === "ins" || shotKind === "fb" ? 0.82 : shotKind === "mid" ? 0.62 : 0.54);
      const pts = shotKind === "thr" ? 3 : 2, three = shotKind === "thr", base = { ins: K.foulIns, mid: K.foulMid, thr: K.foulThr, fb: K.foulFb }[shotKind];
      const draw = E(shooter, "drawf", cmO);
      // block?
      const blkW = dl.reduce((a, s) => a + Math.pow(E(s, "blk", cmD) / 70, 3), 0), pBlk = clamp({ ins: K.blkIns, mid: K.blkMid, thr: K.blkThr, fb: K.blkFb }[shotKind] * (blkW / 2.6) * clamp(1.2 - (E(shooter, "ath", cmO) - 70) / 150, 0.6, 1.3), 0, 0.22);
      if (dl.length && rng() < pBlk) {
        const b = pickW(dl, (s) => Math.pow(E(s, "blk", cmD) / 70, 3)); b.box.blk++; shooter.box.fga++; if (three) shooter.box.tpa++;
        ev("shot", { s: O, p: shooter.p.id, pn: nameOf(shooter), kind: shotKind, made: false, pts: 0, blk: b.p.id, bn: nameOf(b) });
        const rb = rebound(O, false); if (rb.off && clk > 0) { afterOreb = true; flags.second = true; continue; }
        return { next: D, kind: !rb.off && rng() < 0.07 ? "fast" : "normal", tov: false };
      }
      // fouled on the shot?
      const pF = clamp(base * (1 + (draw - 70) / 160), 0.005, 0.3);
      if (rng() < pF) {
        const f = foulBy(D, dl.length ? pickW(dl, (x) => Math.pow((135 - S(x.p, "iq")) / 60, 2) * (shotKind === "ins" || shotKind === "fb" ? E(x, "int", cmD) / 70 : E(x, "per", cmD) / 70) * (x.fouls >= 5 ? 0.35 : 1)) : null);
        const made = rng() < pm * 0.92;
        if (f) ev("foul", { s: D, p: f.p.id, pn: nameOf(f), kind: "shooting", n: f.fouls });
        if (made) {
          shooter.box.fga++; shooter.box.fgm++; if (three) { shooter.box.tpa++; shooter.box.tpm++; }
          if (passer) passer.box.ast++;
          const fl = { ...flags, paint: shotKind === "ins" || shotKind === "fb", second: afterOreb }; addPts(O, pts, shooter, fl);
          ev("shot", { s: O, p: shooter.p.id, pn: nameOf(shooter), kind: shotKind, made: true, pts, a: passer ? passer.p.id : null, an: passer ? nameOf(passer) : null, andOne: true });
          const r = shootFts(O, shooter, 1, cmO, fl, "and-one");
          if (!r.lastMade) { const rb = rebound(O, true); if (rb.off && clk > 0) { afterOreb = true; flags.second = true; continue; } return { next: D, kind: "normal", tov: false }; }
          maybeTimeout(D); return { next: D, kind: "normal", tov: false };
        }
        const n = three ? 3 : 2, r = shootFts(O, shooter, n, cmO, { ...flags, second: afterOreb }, "shooting");
        if (!r.lastMade) { const rb = rebound(O, true); if (rb.off && clk > 0) { afterOreb = true; flags.second = true; continue; } return { next: D, kind: "normal", tov: false }; }
        return { next: D, kind: "normal", tov: false };
      }
      // the shot
      shooter.box.fga++; if (three) shooter.box.tpa++;
      if (rng() < pm) {
        shooter.box.fgm++; if (three) shooter.box.tpm++; if (passer) passer.box.ast++;
        addPts(O, pts, shooter, { ...flags, paint: shotKind === "ins" || shotKind === "fb", second: afterOreb });
        ev("shot", { s: O, p: shooter.p.id, pn: nameOf(shooter), kind: shotKind, made: true, pts, a: passer ? passer.p.id : null, an: passer ? nameOf(passer) : null });
        maybeTimeout(D);
        return { next: D, kind: "normal", tov: false };
      }
      ev("shot", { s: O, p: shooter.p.id, pn: nameOf(shooter), kind: shotKind, made: false, pts: 0 });
      if (clk <= 0) return { next: D, kind: "normal", tov: false };
      const rb = rebound(O, false);
      if (rb.off) { afterOreb = true; flags.second = true; continue; }
      return { next: D, kind: rng() < 0.07 ? "fast" : "normal", tov: false };
    }
  }

  // ---- the game ----
  const tip = () => { const f = (side) => { const pl = onList(side); const c = pl.slice().sort((a, b) => S(b.p, "height_cm") - S(a.p, "height_cm"))[0]; return c ? S(c.p, "height_cm") * 0.35 + S(c.p, "ath") * 0.5 : 0; }; return f(0) + (rng() - 0.5) * 30 >= f(1) ? 0 : 1; };
  let tipWinner = tip();
  const form = [(rng() - 0.5) * 0.06, (rng() - 0.5) * 0.06];   // a hot or cold night for the whole team (shooting only)
  ev("start", { tip: tipWinner });
  const periods = [];
  function playPeriod(len, startSide) {
    clk = len; for (const t of T) { t.tfq = 0; t.run = 0; }
    rotate(0, true); rotate(1, true);
    ev("period", { n: q });
    let O = startSide, kind = "normal", afterTov = false, guard = 0;
    const startScore = score.slice();
    while (clk > 0.0001 && guard++ < 400) {
      for (const t of T) t.heat *= 0.93;
      if (rd) for (const side of [0, 1]) {   // injuries (optional): about 0.4 per team per game, the player is out for the rest of the game
        const pl = onList(side); if (pl.length && rd() < 0.00085) { const st = pl[Math.floor(rd() * pl.length)]; st.out = true; st.inj = true; ev("injury", { s: side, p: st.p.id, pn: nameOf(st) }); rotate(side, true); }
      }
      const r = possession(O, kind, afterTov);
      if (r.cont) { kind = "normal"; afterTov = false; continue; }   // an offensive rebound after a free throw: the same team keeps the ball
      O = r.next; kind = r.kind === "oreb" ? "normal" : r.kind; afterTov = !!r.tov;
    }
    quarters.push([score[0] - startScore[0], score[1] - startScore[1]]);
    ev("qend", { n: q });
    // breaks: everybody recovers a little, a lot at half-time
    const rest = q === 2 ? 16 : 6; for (const t of T) for (const st of t.states) st.e = Math.min(100, st.e + rest);
  }
  for (q = 1; q <= 4; q++) { const first = q === 1 || q === 4 ? tipWinner : 1 - tipWinner; playPeriod(QUARTER_SECS, first); }
  let ot = 0, coin = false;
  while (score[0] === score[1] && ot < MAX_OT) { ot++; q = 4 + ot; for (const t of T) t.to = Math.min(7, t.to + 2); tipWinner = tip(); ev("overtime", { n: ot }); playPeriod(OT_SECS, tipWinner); }
  if (score[0] === score[1]) { coin = true; const w = rng() < 0.5 ? 0 : 1; score[w] += 1; ev("coin", { s: w }); }
  ev("end", {});
  const totalSecs = REG_SECS + ot * OT_SECS;
  const box = T.map((t) => t.states.map((st) => ({ id: st.p.id, name: st.p.name, pn: nameOf(st), pos: st.p.pos, starter: st.i < STARTERS, ...st.box, min: Math.round((st.box.secs / 60) * 10) / 10, fouledOut: st.fouls >= 6, injured: st.inj })));
  const team = T.map((t, s) => {
    const b = box[s], sum = (k) => b.reduce((a, x) => a + x[k], 0), o = box[1 - s];
    return { pts: score[s], fgm: sum("fgm"), fga: sum("fga"), tpm: sum("tpm"), tpa: sum("tpa"), ftm: sum("ftm"), fta: sum("fta"), oreb: sum("oreb"), dreb: sum("dreb"), reb: sum("oreb") + sum("dreb"), ast: sum("ast"), stl: sum("stl"), blk: sum("blk"), tov: sum("tov"), pf: sum("pf"), paint: t.ex.paint, fastbreak: t.ex.fb, second: t.ex.second, offTov: t.ex.offTov, bench: b.filter((x) => !x.starter).reduce((a, x) => a + x.pts, 0), maxLead: maxLead[s], run: t.ex.runMax, timeouts: t.timeouts, oppTov: o.reduce((a, x) => a + x.tov, 0) };
  });
  team[0].leadChanges = team[1].leadChanges = leadChanges; team[0].ties = team[1].ties = ties;
  return { score: score.slice(), quarters, ot, events, box, team, winner: score[0] > score[1] ? "A" : "B", totalSecs, coin, tipWinner: events[0].tip };
}
