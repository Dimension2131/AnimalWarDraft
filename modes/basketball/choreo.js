// modes/basketball/choreo.js: the CHOREOGRAPHY layer of the basketball match viewer (pure logic: no DOM, no network, no Math.random).
// Two layers. The OUTCOME layer is engine.simulateGame (authoritative: score, scorers, assists, blocks, steals, rebounds, fouls, substitutions, clock). This layer only decorates it: it invents the
// bring-up, passes, cuts, screens, drives, rebounds and fast breaks around every logged event, with its OWN random stream (seedMix(seed, tag, index)), and every segment ends in exactly its event at that
// event's game time. Every device that runs it from the same seed gets the same film.
// Time model: the film is a list of segments with a natural length and a class: "key" (a featured possession, shown at a readable pace), "quiet" (every other possession: the whole game is shown, but
// as a time-lapse) and "fixed" (free throws, fouls, timeouts, substitutions, quarter breaks, tip-off, buzzer). Real length = natural x class scale; the scales are solved so the whole film lands EXACTLY
// on the preset duration (replay.durationMs). frameAt(M, r) is a pure lookup of a track that the movement simulation sampled once in buildMatch(): late joiners and reconnects need no replay.
// Movement is a small SIMULATION (steering with top speed, acceleration and arrive-and-brake per player, man-to-man defence, spacing spots, cuts, screens), never a formula of the ball.
import { mulberry32 } from "../../js/sim.js";
import * as E from "./engine.js";
import * as R from "./replay.js";
import { W, makePicker, traitOf } from "./words.js";

export const COURT = { L: 94, W: 50 };
export const HOOPS = [5.25, 88.75];   // x of the left and right basket (y = 25)
export const MARGIN = 10;             // players may walk to the benches, a little outside the lines
export const INSTANT_MS = R.INSTANT_MS;
const HD = 88.75;                     // depth of the basket we attack, from our own baseline
// where each slot stands in the half court (percent of the half court, basket at the top): the same picture as the line-up screen
export const SPOTS = { strict: [[50, 83], [83, 62], [17, 62], [69, 36], [38, 20]], groups: [[32, 80], [68, 80], [14, 50], [86, 50], [50, 22]], open: [[50, 83], [82, 62], [18, 62], [68, 34], [34, 34]] };
// How each speed is filmed. feat = share of possessions shown at the "key" pace; ks / fs = first guess of the key / fixed scale; dead = how short dead-ball moments are made (they are played faster);
// say* = how many of the commentary lines of quiet play are kept. The quiet scale is solved so the film ends exactly on the target.
export const PRESETS = {
  quick: { feat: 0.07, ks: 0.34, fs: 0.07, dead: 0.4, qmin: 0.035, sayPass: 0, sayOut: 0.45, sayMiss: 0.2, colour: 0.04 },
  full: { feat: 0.2, ks: 0.6, fs: 0.2, dead: 0.6, qmin: 0.07, sayPass: 0.15, sayOut: 0.85, sayMiss: 0.5, colour: 0.12 },
  detailed: { feat: 0.3, ks: 0.7, fs: 0.5, dead: 0.8, qmin: 0.12, sayPass: 0.35, sayOut: 0.95, sayMiss: 0.8, colour: 0.18 },
  broadcast: { feat: 1, ks: 0.7, fs: 1, dead: 1, qmin: 0.3, sayPass: 0.55, sayOut: 1, sayMiss: 1, colour: 0.25 }
};
const DT = 100;        // ms of natural time per sample
const SPD = 1.3;       // broadcast tempo: the physics runs 1.3x faster than real life, so a possession takes ~9 s of film instead of ~14
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a || 1), 0, 1); return t * t * (3 - 2 * t); };
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const seedMix = (seed, tag, idx) => { let h = Math.imul(((seed >>> 0) ^ 0xb5ad4ece) | 0, 0x85ebca6b); h = Math.imul(h ^ Math.imul(tag + 1, 0x9e3779b1), 0xc2b2ae35); h = Math.imul(h ^ Math.imul(idx + 1, 0x27d4eb2f), 0x165667b1); return (h ^ (h >>> 15)) >>> 0; };
const hn = (id, k) => { let x = k * 7919 + 17; for (const c of String(id)) x = (Math.imul(x, 31) + c.charCodeAt(0)) | 0; return (Math.abs(x) % 1000) / 1000; };   // a stable 0..1 number per player and trait
const dirOf = (s, half) => ((s === 0) !== (half === 1) ? 1 : -1);   // team 0 attacks +x until half-time; the ends swap after it (overtime keeps the second-half ends)
export const halfOf = (q) => (q >= 3 ? 1 : 0);
const PERIOD = (q) => (q <= 4 ? E.QUARTER_SECS : E.OT_SECS);
const BENCH_X = [28, 66], BENCH_Y = 52.2;

// ---------- the event log -> plays ----------
// A play ends in exactly one outcome: a shot (with its free throws and rebound), a turnover, a foul (with its free throws) or a dead-ball cluster (timeouts, substitutions, injuries).
export function parsePlays(ev) {
  const items = [], n = ev.length; let i = 0;
  const takeFts = (eis, j) => { while (j < n && ev[j].e === "ft") { eis.push(j); j++; } const last = ev[eis[eis.length - 1]]; if (last && last.e === "ft" && !last.made && j < n && ev[j].e === "reb") { eis.push(j); j++; } return j; };
  while (i < n) {
    const e = ev[i];
    if (["start", "period", "overtime", "qend", "end", "coin"].includes(e.e)) { items.push({ k: e.e, ei: i }); i++; }
    else if (["sub", "timeout", "injury"].includes(e.e)) { const eis = []; while (i < n && ["sub", "timeout", "injury"].includes(ev[i].e)) { eis.push(i); i++; } items.push({ k: "dead", eis }); }
    else if (e.e === "foul") {
      const eis = [i]; let j = i + 1, type;
      if (e.kind === "shooting") { if (j < n && ev[j].e === "shot") { eis.push(j); j++; type = "shot"; } else type = "shootfoul"; }
      else type = e.kind === "intentional" ? "intfoul" : "foul";
      j = takeFts(eis, j); items.push({ k: "play", type, eis, O: 1 - e.s }); i = j;
    } else if (e.e === "shot") {
      const eis = [i]; let j = i + 1; if (!e.made && j < n && ev[j].e === "reb") { eis.push(j); j++; }
      items.push({ k: "play", type: "shot", eis, O: e.s }); i = j;
    } else if (e.e === "tov") { items.push({ k: "play", type: "tov", eis: [i], O: e.s }); i++; }
    else if (e.e === "ft") { const eis = []; const j = takeFts(eis, i); items.push({ k: "play", type: "intfoul", eis, O: e.s }); i = j; }   // free throws whose foul was not logged
    else { items.push({ k: "stray", ei: i }); i++; }   // a rebound with no shot in front of it: only its moment is kept
  }
  return items;
}

// per-event facts that need the whole log: running points, scoring runs, lead changes, milestones, the crowd's excitement (all from the log, never from the choreography)
export function analyse(ev) {
  const meta = ev.map(() => ({})), run = [0, 0], pts = {}; let score = [0, 0], leader = -1, ex = 0, lastGt = 0;
  ev.forEach((e, i) => {
    const m = meta[i]; m.before = score.slice(); ex *= Math.exp(-(e.gt - lastGt) / 75); lastGt = e.gt;
    const pt = e.e === "shot" && e.made ? e.pts : e.e === "ft" && e.made ? 1 : 0;
    if (pt) {
      const was = run[e.s]; run[e.s] += pt; run[1 - e.s] = 0; pts[e.p] = (pts[e.p] || 0) + pt; m.pts = pts[e.p];
      for (const th of [8, 12, 16, 20]) if (was < th && run[e.s] >= th) m.runCross = th;
      for (const th of [20, 30, 40, 50]) if (m.pts - pt < th && m.pts >= th) m.mile = th;
      if (e.e === "shot") ex += e.kind === "thr" ? 0.3 : 0.12;
    }
    if (e.e === "shot" && e.blk) ex += 0.3; if (e.e === "tov" && e.stl) ex += 0.2; if (m.runCross) ex += 0.4;
    m.run = [run[0], run[1]]; score = e.score;
    const ld = score[0] > score[1] ? 0 : score[1] > score[0] ? 1 : -1;
    if (pt) { if (ld !== -1 && leader !== -1 && ld !== leader) m.leadChange = true; if (ld === -1 && leader !== -1) m.tie = true; }
    if (ld !== -1) leader = ld;
    const diff = Math.abs(score[0] - score[1]), c = clamp(1 - diff / 15, 0, 1), late = e.q >= 4 ? 0.35 + 0.65 * (1 - Math.min(e.clk, 600) / 600) : 0.1 + 0.05 * e.q;
    m.clutch = e.q >= 4 && e.clk <= 120 && diff <= 8; m.heat = clamp(c * late * 0.8 + ex * 0.7, 0, 1);
  });
  return meta;
}

const interestOf = (it, ev, meta) => {
  let v = 0.2;
  for (const i of it.eis) {
    const e = ev[i], m = meta[i];
    if (e.e === "shot") { v += e.made ? 1 + (e.pts === 3 ? 1.5 : 0) + (e.a ? 0.5 : 0) + (e.andOne ? 3 : 0) + (e.kind === "fb" ? 1.5 : 0) : 0.3; if (e.blk) v += 4; }
    else if (e.e === "tov") v += e.stl ? 2.5 : 0.8;
    else if (e.e === "foul") v += e.kind === "shooting" ? 1 : 0.5;
    else if (e.e === "reb" && e.off) v += 0.8;
    if (m.leadChange) v += 2; if (m.tie) v += 1; if (m.runCross) v += 2; if (m.mile) v += 2;
    if (m.clutch) v += 3; if (e.q >= 5) v += 2; if (e.e === "shot" && e.made && e.clk <= 2) v += 4;
  }
  return v;
};

const instantFilm = (teams, sim, names, ev, meta, items) => {   // Instant: no film, the final score and the best plays
  const hl = items.filter((it) => it.k === "play").map((it) => ({ it, v: interestOf(it, ev, meta) })).sort((a, b) => b.v - a.v).slice(0, 10).sort((a, b) => a.it.eis[0] - b.it.eis[0]);
  const highlights = hl.map(({ it }) => { const e = ev[it.eis.find((i) => ev[i].e === "shot" || ev[i].e === "tov") ?? it.eis[0]]; return { q: e.q, clk: e.clk, text: R.lineOf(e, names) || "", cls: e.e === "shot" && e.made ? (e.kind === "thr" ? "three" : "made") : "" }; }).filter((h) => h.text);
  return { speed: "instant", animated: false, names, finalScore: sim.score.slice(), ot: sim.ot, highlights, total: 0, endAnim: 0, end: INSTANT_MS, segs: [], moments: [], lines: [], cards: [], anchors: [] };
};

// ---------- the film ----------
// teams: [{ name, mode, xi: [entities in slot order], bench: [entities in rotation order] }] as given to simulateGame; sim: its result; seed: the game's seed; speed: instant | quick | full | broadcast
export function buildMatch({ teams, sim, seed, speed }) {
  const sp = R.normSpeed(speed), names = teams.map((t) => t.name), ev = sim.events, items = parsePlays(ev), meta = analyse(ev);
  if (!R.SPEEDS[sp].ms) return instantFilm(teams, sim, names, ev, meta, items);
  const P = PRESETS[sp] || PRESETS.quick, TARGET = R.durationMs(sim, sp), mode = E.normPosMode(teams[0].mode), SS = SPOTS[mode], deadSp = clamp(1 / P.dead, 1, 2.6);
  const ents = new Map(); teams.forEach((t) => t.xi.concat(t.bench || []).forEach((p) => p && ents.set(p.id, p)));
  const num = {}; teams.forEach((t) => { t.xi.forEach((p, i) => { if (p) num[p.id] = i + 1; }); (t.bench || []).forEach((p, j) => { if (p) num[p.id] = 6 + j; }); });
  const nameOfId = (id) => (ents.get(id) ? E.surname(ents.get(id)) : "");
  const rt = (e, k, d = 55) => (e && typeof e[k] === "number" ? e[k] : d);
  const htOf = (id) => rt(ents.get(id), "height_cm", 195);

  // Every player moves like himself: top speed and acceleration from speed/athleticism, how tight he guards (on-ball defence), how much he helps (interior defence, IQ), how hard he cuts,
  // how fast his dribble is (ball handling), how late he reacts, how much he roams. All from his own ratings and id, so he behaves the same way in every game.
  const trCache = new Map();
  const trOf = (id) => {
    let t = trCache.get(id); if (t) return t;
    const e = ents.get(id) || {}, h = (k) => hn(id, k), big = /^(PF|C)$/.test(e.pos || "") || htOf(id) >= 205;
    t = {
      vmax: 14 + rt(e, "spd") * 0.08 + (h(1) - 0.5) * 1.0, acc: 19 + rt(e, "ath") * 0.12 + (h(2) - 0.5) * 3, dribV: Math.min(14 + rt(e, "spd") * 0.08, 12.5 + rt(e, "han") * 0.075),
      tight: 2.0 + (1 - rt(e, "per") / 100) * 3.5 + h(3) * 0.9, help: clamp(0.2 + rt(e, "int") / 100 * 0.45 + rt(e, "iq") / 100 * 0.25, 0.2, 0.9), lat: rt(e, "lat"),
      rove: 0.6 + h(4) * 1.1, per: 1400 + h(5) * 2200, ph: (hn(id, 77) * 6.28), cut: clamp(0.08 + rt(e, "ath") / 100 * 0.25 + (big ? -0.05 : 0.05) + h(6) * 0.2, 0.05, 0.5),
      big, han: rt(e, "han"), pas: rt(e, "pas"), dunk: rt(e, "dunk"), post: rt(e, "post"), ht: htOf(id), lag: 1 + Math.floor((1 - rt(e, "iq") / 100) * 4 + h(7) * 2)
    };
    trCache.set(id, t); return t;
  };

  function generate() {
    let on = teams.map((t) => [0, 1, 2, 3, 4].map((i) => (t.xi[i] ? t.xi[i].id : null))), half = 0;
    const st = { O: 0, h: null, live: false, inb: null, set: null, anchor: { gt: 0, q: 1, clk: E.QUARTER_SECS }, sc0: null };
    const pk = makePicker(), gs = { q: 1, clk: E.QUARTER_SECS, score: [0, 0], run: [0, 0], idx: 0 }, segs = [], legsAll = [];
    const dirS = (s) => dirOf(s, half), A = (s, d, l) => (dirS(s) > 0 ? [d, l] : [COURT.L - d, COURT.W - l]);
    const depthOf = (s, x) => (dirS(s) > 0 ? x : COURT.L - x), hoopOf = (s) => [dirS(s) > 0 ? HOOPS[1] : HOOPS[0], 25];
    const spotTF = (i) => { const [l, t] = SS[i] || SS[0]; return [HD - (10 + ((t - 20) / 63) * 21), 25 + ((l - 50) / 50) * 21]; };   // [depth, lat] in the team frame
    const slotsOn = (s) => [0, 1, 2, 3, 4].filter((i) => on[s][i]), slotOf = (s, id) => on[s].indexOf(id);
    const anySlot = (s, id) => { const i = slotOf(s, id); return i >= 0 ? i : slotsOn(s)[0] ?? 0; };
    const nm = (s, i) => (on[s][i] ? nameOfId(on[s][i]) : "");
    const handlerOf = (s) => slotsOn(s).sort((a, b) => trOf(on[s][b]).han - trOf(on[s][a]).han || a - b)[0] ?? 0;
    const bigOf = (s, ex) => slotsOn(s).filter((i) => !ex.includes(i)).sort((a, b) => trOf(on[s][b]).ht - trOf(on[s][a]).ht || a - b)[0] ?? slotsOn(s)[0] ?? 0;

    // ---------- the movement simulation (feet; x along the length 0..94, y across 0..50) ----------
    const pl = [0, 1].map(() => [0, 1, 2, 3, 4].map(() => ({ x: 47, y: 25, vx: 0, vy: 0, fx: 1, fy: 0 }))), ball = { x: 47, y: 25, z: 0 }, PS = [], BS = [], HS = [], CUT = [];
    let simU = 0;
    const hands = (s, i) => { const p = pl[s][i]; return [p.x + p.fx * 1.3, p.y + p.fy * 1.3]; };
    const pushSample = (code) => { for (let s = 0; s < 2; s++) for (let i = 0; i < 5; i++) { const q = pl[s][i]; PS.push(on[s][i] ? q.x : 0, on[s][i] ? q.y : -30); } BS.push(ball.x, ball.y, ball.z); HS.push(code); CUT.push(0); };
    const wander = (s, i, k) => { const id = on[s][i], t = trOf(id); return (Math.sin(simU / t.per + t.ph + k) * 0.55 + Math.sin(simU / (t.per * 0.43) + k * 2 + t.ph * 2) * 0.45) * t.rove; };
    function computeMarks(att) {   // tallest guards tallest, as the engine matches them up; extra defenders have no man and sit in the paint
      const def = 1 - att, mk = {}, byH = (s) => slotsOn(s).sort((a, b) => trOf(on[s][b]).ht - trOf(on[s][a]).ht || a - b), a = byH(att), d = byH(def);
      d.forEach((di, k) => { if (a.length) mk[def + ":" + di] = a[Math.min(k, a.length - 1)]; });
      return mk;
    }
    const markerOf = (att, ai, L) => { for (const k of Object.keys(L.mark)) if (L.mark[k] === ai) return +k.split(":")[1]; return -1; };
    function offTarget(s, i, L) {
      const id = on[s][i], t = trOf(id), [sd, sl] = spotTF(i), h = st.h && st.h.s === s ? pl[s][st.h.i] : null, bd = depthOf(s, h ? h.x : ball.x);
      const w = L.dead ? 0 : 1;
      if (bd < 58 && !L.dead) {   // transition: run the lanes ahead of the ball, then settle into the half-court spot
        const lane = [25, 11, 39, 18, 32][i] ?? 25, depth = clamp(Math.max(bd + 9 + 3 * i, 18), 18, Math.max(sd, 20)), lat = lerp(lane, sl, smooth(bd, 34, 58));
        const q = A(s, depth, lat); return [q[0] + wander(s, i, 0) * 0.5, q[1] + wander(s, i, 2) * 0.5, t.vmax * 0.96];
      }
      const q = A(s, sd, sl); return [q[0] + wander(s, i, 0) * w, q[1] + wander(s, i, 2) * w, t.vmax * 0.55];
    }
    function defTarget(s, i, L) {
      const id = on[s][i], t = trOf(id), att = L.side, mi = L.mark[s + ":" + i], hoop = hoopOf(att), vc = t.vmax * (0.84 + 0.14 * t.lat / 100);
      if (mi === undefined) { const q = [hoop[0] - dirS(att) * 7, 25 + (i - 2) * 3]; return [q[0], q[1], vc * 0.8]; }
      const a = pl[att][mi], isBall = st.h && st.h.s === att && st.h.i === mi;
      let dx = hoop[0] - a.x, dy = hoop[1] - a.y; const dd = Math.hypot(dx, dy) || 1; dx /= dd; dy /= dd;
      const cont = L.contest && L.contest.s === att && L.contest.i === mi, gap = cont ? 1.7 : isBall ? t.tight * 0.85 : t.tight + 1.5;
      const dBall = dist(a.x, a.y, ball.x, ball.y), sag = isBall || cont ? 0 : t.help * clamp((dBall - 14) / 24, 0, 1) * 0.5;
      const px = hoop[0] - dirS(att) * 6, py = 25 + (a.y - 25) * 0.25;
      return [lerp(a.x + dx * gap, px, sag) + wander(s, i, 1) * 0.35, lerp(a.y + dy * gap, py, sag) + wander(s, i, 3) * 0.35, vc];
    }
    function targetOf(s, i, L) {
      const t = trOf(on[s][i]), vm = t.vmax;
      for (const p of L.pulls) if (p.s === s && p.i === i) return [p.tx, p.ty, p.v ? Math.min(p.v, vm) : vm];
      if (L.targets) { const q = L.targets[s][i]; if (q) return [q[0], q[1], Math.min(vm, 9.5)]; }
      const hf = L.hf, isH = hf && hf.s === s && hf.i === i, isR = L.rc && L.rc.s === s && L.rc.i === i;
      if (L.kind === "carry" && isH) return [L.tx, L.ty, Math.min(vm, t.dribV)];
      if ((L.kind === "pass" || L.kind === "toss" || L.kind === "bounce" || L.kind === "return") && isR) return [L.tx, L.ty, vm];
      if (L.kind === "fetch" && isR) return [L.src.x, L.src.y, vm * 0.95];
      if (L.kind === "swipe") { if (isR) { const q = hands(hf.s, hf.i); return [q[0], q[1], vm]; } if (isH) { const d = dirS(hf.s); return [pl[s][i].x + d * 6, pl[s][i].y, t.dribV]; } }
      if (L.dead) return s === L.side ? offTarget(s, i, L) : defTarget(s, i, L);
      return s === L.side ? offTarget(s, i, L) : defTarget(s, i, L);
    }
    function move(p, tx, ty, vcap, dt, acc) {
      const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), sp2 = Math.min(vcap, d / 0.4), dvx = d > 0.01 ? (dx / d) * sp2 : 0, dvy = d > 0.01 ? (dy / d) * sp2 : 0;
      let ax = dvx - p.vx, ay = dvy - p.vy; const am = Math.hypot(ax, ay), mx = acc * dt;
      if (am > mx) { ax *= mx / am; ay *= mx / am; }
      p.vx += ax; p.vy += ay; p.x = clamp(p.x + p.vx * dt, -MARGIN + 1, COURT.L + MARGIN - 1); p.y = clamp(p.y + p.vy * dt, -MARGIN + 1, COURT.W + MARGIN - 1);
      const v = Math.hypot(p.vx, p.vy); if (v > 0.6) { p.fx = p.vx / v; p.fy = p.vy / v; }
    }
    function separate() {   // players are bodies: they do not stand inside each other
      const all = []; for (let s = 0; s < 2; s++) for (let i = 0; i < 5; i++) if (on[s][i]) all.push(pl[s][i]);
      for (let a = 0; a < all.length; a++) for (let b = a + 1; b < all.length; b++) {
        const p = all[a], q = all[b], d = dist(p.x, p.y, q.x, q.y);
        if (d < 2.3 && d > 0.001) { const k = (2.3 - d) * 0.25 / d, dx = (p.x - q.x) * k, dy = (p.y - q.y) * k; p.x += dx; p.y += dy; q.x -= dx; q.y -= dy; }
      }
    }
    const HOLD = (r) => (r ? r.s * 5 + r.i : -1);
    function stepLeg(L, k, n) {
      const f = (k + 1) / n, t = f * L.dur, dtp = (DT / 1000) * SPD * L.sp; simU += DT;
      for (let s = 0; s < 2; s++) for (let i = 0; i < 5; i++) { if (!on[s][i]) continue; const tg = targetOf(s, i, L), tr = trOf(on[s][i]); move(pl[s][i], tg[0], tg[1], tg[2], dtp, tr.acc * (s === L.side ? 1 : 0.7 + tr.lat / 200)); }
      separate();
      let code = -1; const h = L.hf, r = L.rc;
      switch (L.kind) {
        case "carry": if (h) { const q = hands(h.s, h.i); ball.x = q[0]; ball.y = q[1]; ball.z = 1.8 + 1.7 * Math.abs(Math.sin((simU / 190) * Math.PI)); code = HOLD(h); } break;
        case "hold": case "setup": if (h) { const q = hands(h.s, h.i); ball.x = q[0]; ball.y = q[1]; ball.z = L.drib ? 1.8 + 1.7 * Math.abs(Math.sin((simU / 190) * Math.PI)) : 3.2; code = HOLD(h); } break;
        case "pass": case "toss": case "return": case "bounce": {
          if (t <= L.wind && h) { const q = hands(h.s, h.i); ball.x = q[0]; ball.y = q[1]; ball.z = 4.2; code = HOLD(h); }
          else {
            const bf = clamp((t - L.wind) / (L.dur - L.wind || 1), 0, 1), dst = r ? hands(r.s, r.i) : [L.tx, L.ty];
            ball.x = lerp(L.src.x, dst[0], bf); ball.y = lerp(L.src.y, dst[1], bf); ball.z = lerp(L.z0, L.z1, bf) + L.zp * Math.sin(Math.PI * bf); if (bf > 0.92 && r) code = HOLD(r);
          }
          break;
        }
        case "out": { const bf = f; ball.x = lerp(L.src.x, L.tx, bf); ball.y = lerp(L.src.y, L.ty, bf); ball.z = lerp(L.z0, L.z1, bf) + L.zp * Math.sin(Math.PI * bf); break; }
        case "shot": {
          if (t <= L.wind) { const q = hands(h.s, h.i); ball.x = q[0]; ball.y = q[1]; ball.z = lerp(3.2, 7.2, smooth(t, 0, L.wind || 1)); code = HOLD(h); }
          else {
            if (!L.rel) L.rel = { x: ball.x, y: ball.y };
            const bf = clamp((t - L.wind) / (L.dur - L.wind || 1), 0, 1);
            if (L.res === "block") {
              const fb = 0.35, p1 = [lerp(L.rel.x, L.tx, 0.28), lerp(L.rel.y, L.ty, 0.28)];
              if (bf < fb) { ball.x = lerp(L.rel.x, p1[0], bf / fb); ball.y = lerp(L.rel.y, p1[1], bf / fb); ball.z = lerp(7.2, 9.3, bf / fb); }
              else { const g = (bf - fb) / (1 - fb); ball.x = lerp(p1[0], L.bx, g); ball.y = lerp(p1[1], L.by, g); ball.z = lerp(9.3, 4, g) + 1.5 * Math.sin(Math.PI * g); }
            } else { ball.x = lerp(L.rel.x, L.tx, bf); ball.y = lerp(L.rel.y, L.ty, bf); ball.z = lerp(L.dunk ? 10.8 : 7.2, 10, bf) + L.zp * Math.sin(Math.PI * bf); }
          }
          break;
        }
        case "netfall": ball.x = L.src.x - L.nd * 0.6 * f; ball.y = L.src.y; ball.z = 10 * (1 - f) * (1 - f); break;
        case "fetch": { const q = r ? hands(r.s, r.i) : null; if (r && (L.got || dist(q[0], q[1], L.src.x, L.src.y) < 1.8)) { L.got = true; ball.x = q[0]; ball.y = q[1]; ball.z = 3; code = HOLD(r); } else { ball.x = L.src.x; ball.y = L.src.y; ball.z = 0.4; } break; }
        case "swipe": { const a = hands(h.s, h.i), c = hands(r.s, r.i), w = smooth(f, 0.6, 1); ball.x = lerp(a[0], c[0], w); ball.y = lerp(a[1], c[1], w); ball.z = 3; code = f < 0.6 ? HOLD(h) : HOLD(r); break; }
        default: break;
      }
      pushSample(code);
    }

    // a builder collects the legs, commentary lines, event marks and cards of one segment; leg() runs the simulation for it
    function builder(rnd) {
      const b = { legs: [], lines: [], marks: [], cards: [], rnd, t: 0, fx: [] };
      b.say = (text, cls, prob, hype) => { const kind = pk.key; pk.key = ""; if (text && (prob === undefined || rnd() < prob)) b.lines.push({ t: b.t, text, cls: cls || "", hype: hype || 0, kind }); return b; };
      b.mark = (ei, extra) => { b.marks.push({ ei, t: b.t, ...(extra || {}) }); return b; };
      b.card = (type, data, o = {}) => { b.cards.push({ type, t: o.at != null ? o.at : b.t, data, dur: o.dur || 2600, cover: !!o.cover, pr: o.pr || 1 }); return b; };
      return b;
    }
    const dead = (o) => ({ ...o, dead: true });
    function leg(b, kind, o = {}) {
      const O = o.side != null ? o.side : st.O, hf = o.hf !== undefined ? o.hf : st.h;
      const L = { kind, side: O, hf, rc: o.rc || null, tx: o.to ? o.to[0] : ball.x, ty: o.to ? o.to[1] : ball.y, z0: o.z0 != null ? o.z0 : ball.z, z1: o.z1 != null ? o.z1 : 0, zp: o.zp || 0, wind: 0, src: { x: ball.x, y: ball.y }, pulls: [], sp: o.dead ? deadSp : 1, dead: !!o.dead, drib: !!o.drib, targets: o.targets || null, res: o.res || null, contest: o.contest || null, mark: computeMarks(O), got: false, dunk: !!o.dunk, nd: o.nd || 0, bx: o.bx, by: o.by, rel: null };
      L.pulls = (o.pulls || []).concat(st.set || []).map((p) => ({ s: p.s, i: p.i, tx: p.to[0], ty: p.to[1], v: p.v }));
      const K = SPD * L.sp, phys = (ms) => ms / K, vm = (r) => trOf(on[r.s][r.i]).vmax;
      if ((kind === "carry" || kind === "pass") && !L.dead && depthOf(O, ball.x) > 52) {   // off-ball cuts: a few players dash to the rim and drift back to their spots
        const cand = slotsOn(O).filter((i) => !(hf && hf.s === O && hf.i === i) && !(L.rc && L.rc.s === O && L.rc.i === i) && !L.pulls.some((p) => p.s === O && p.i === i)); let n = 0;
        for (const i of cand) { const t = trOf(on[O][i]); if (n < 2 && b.rnd() < t.cut * 0.55) { n++; const [, sl] = spotTF(i), q = A(O, HD - 3 - b.rnd() * 4, clamp(sl + (b.rnd() - 0.5) * 10, 8, 42)); L.pulls.push({ s: O, i, tx: q[0], ty: q[1], v: t.vmax * 0.92 }); } }
      }
      let dur = o.dur != null ? o.dur * (o.dead ? P.dead : 1) : null;
      if (dur == null) {
        switch (kind) {
          case "carry": { const p = pl[hf.s][hf.i], d = dist(p.x, p.y, L.tx, L.ty); dur = phys((d / trOf(on[hf.s][hf.i]).dribV) * 1000); break; }
          case "pass": case "toss": case "return": { const d = dist(ball.x, ball.y, L.tx, L.ty); L.wind = phys(o.wind != null ? o.wind : 220); const rcT = L.rc ? phys((dist(pl[L.rc.s][L.rc.i].x, pl[L.rc.s][L.rc.i].y, L.tx, L.ty) / (vm(L.rc) * 0.9)) * 1000) : 0; dur = L.wind + Math.max(phys((d / (o.lob ? 34 : kind === "toss" ? 12 : 48)) * 1000), rcT, phys(kind === "toss" ? 900 : 160)); break; }
          case "bounce": { const rcT = phys((dist(pl[L.rc.s][L.rc.i].x, pl[L.rc.s][L.rc.i].y, L.tx, L.ty) / (vm(L.rc) * 0.85)) * 1000 + 220); dur = Math.max(phys(850), rcT); break; }
          case "shot": { const d = dist(ball.x, ball.y, L.tx, L.ty); L.wind = phys(o.wind != null ? o.wind : 350); dur = L.wind + phys(clamp(300 + d * 32, 450, 1300)); break; }
          case "netfall": dur = phys(420); break;
          case "fetch": { const r = L.rc, d = dist(pl[r.s][r.i].x, pl[r.s][r.i].y, L.src.x, L.src.y); dur = Math.max(phys(500), phys((d / (vm(r) * 0.8)) * 1000 + 250)); break; }
          case "swipe": { const a = hands(hf.s, hf.i), r = L.rc, d = dist(pl[r.s][r.i].x, pl[r.s][r.i].y, a[0], a[1]); dur = clamp(phys((d / Math.max(4, vm(r) - 3)) * 1000 + 280), phys(500), phys(2600)); break; }
          case "out": { const d = dist(ball.x, ball.y, L.tx, L.ty); dur = phys((d / 30) * 1000 + 200); break; }
          case "setup": { let mx = 0; for (let s = 0; s < 2; s++) for (let i = 0; i < 5; i++) { const q = L.targets && L.targets[s][i]; if (q && on[s][i]) mx = Math.max(mx, dist(pl[s][i].x, pl[s][i].y, q[0], q[1]) / Math.min(trOf(on[s][i]).vmax, 9.5)); } dur = Math.max(phys(900), phys(mx * 1000 + 250)); break; }
          default: dur = phys(600);
        }
        if (o.dead) dur *= 1;
      }
      dur = Math.max(DT, Math.ceil(dur / DT) * DT); L.dur = dur;
      if (L.wind > dur) L.wind = dur * 0.5;
      const n = dur / DT; for (let k = 0; k < n; k++) stepLeg(L, k, n);
      legsAll.push({ b, kind, t0: b.t, t1: b.t + dur, side: O, hf: hf ? { ...hf } : null, from: [L.src.x, L.src.y], to: [ball.x, ball.y], res: L.res });
      b.legs.push(legsAll[legsAll.length - 1]); b.t += dur;
      const catches = ["pass", "toss", "bounce", "return", "swipe", "fetch"].includes(kind) && L.rc;
      if (catches) { st.h = { s: L.rc.s, i: L.rc.i }; st.live = kind !== "return"; }
      else if (["shot", "out", "netfall"].includes(kind)) { st.h = null; st.live = false; }
      else if (o.hf !== undefined && (kind === "hold" || kind === "setup")) st.h = o.hf;
      return L;
    }

    // ---------- script helpers ----------
    const sayX = (s, extra = {}) => ({ team: names[s], opp: names[1 - s], nameA: names[0], nameB: names[1], q: gs.q, clk: gs.clk, score: gs.score, diff: gs.score[s] - gs.score[1 - s], run: gs.run, ...extra });
    const H = (n, x) => Math.min(3, n + ((x && x.late) ? 1 : 0));
    const lateGame = () => gs.q >= 4 && gs.clk <= 150 && Math.abs(gs.score[0] - gs.score[1]) <= 8;
    const holderPos = () => (st.h ? pl[st.h.s][st.h.i] : null);
    function passTo(b, rcv, to, o = {}) {
      const O = st.h.s, from = st.h.i; if (rcv === from) return;
      if (o.say !== false) { const kind = o.how || "swing"; b.say(W[kind === "entry" ? "entry" : kind === "kick" ? "kick" : "swing"](pk, b.rnd, sayX(O, { a: nm(O, from), b: nm(O, rcv) })), "", o.prob != null ? o.prob : P.sayPass, 0); }
      leg(b, "pass", { rc: { s: O, i: rcv }, to, wind: o.wind, lob: o.lob, z0: 4.4, z1: 4.4, zp: o.lob ? 4 : 1.1, side: O, ...(o.dead ? { dead: true } : {}) });
    }
    const carryTo = (b, to, o = {}) => leg(b, "carry", { to, hf: st.h, drib: true, side: st.h.s, ...o });
    const spotAbs = (s, i) => { const [d, l] = spotTF(i); return A(s, d, l); };
    const inboundPoint = (O) => { const hx = dirS(O) > 0 ? HOOPS[0] : HOOPS[1]; return [hx < 47 ? -1.8 : COURT.L + 1.8, 25 + (hn(on[O][0] || "x", 3) - 0.5) * 12]; };
    function ensureHolder(b, s) {   // somebody must have the ball before a dead-ball moment: a loose ball is fetched by the nearest player of side s
      if (st.h) return;
      const c = slotsOn(s).sort((a, c2) => dist(pl[s][a].x, pl[s][a].y, ball.x, ball.y) - dist(pl[s][c2].x, pl[s][c2].y, ball.x, ball.y))[0];
      if (c != null) leg(b, "fetch", { rc: { s, i: c }, side: s });
    }
    function ensureInbound(b, O) {   // the other team's made basket or a dead ball: a taker fetches the ball, steps behind the line and the handler comes to receive it
      if (st.h && st.h.s === O && (st.live || st.inb)) return;
      if (st.h && st.h.s !== O) { st.h = null; }
      const spot = st.inb || inboundPoint(O), hnd = handlerOf(O), cands = slotsOn(O).filter((i) => i !== hnd);
      const pool = cands.length ? cands : [hnd], taker = pool.sort((a, c) => dist(pl[O][a].x, pl[O][a].y, spot[0], spot[1]) - dist(pl[O][c].x, pl[O][c].y, spot[0], spot[1]))[0];
      st.set = null;
      if (!(st.h && st.h.s === O && st.h.i === taker)) { if (st.h) st.h = null; leg(b, "fetch", { rc: { s: O, i: taker }, side: O }); }
      carryTo(b, spot, { side: O, drib: false });
      leg(b, "hold", { hf: { s: O, i: taker }, dur: 350, side: O });
      st.inb = spot; st.live = false;
    }
    function bringUp(b, rnd, fast) {
      const O = st.O; ensureInbound(b, O);
      const hnd = handlerOf(O);
      if (st.inb) {
        const sp = st.inb, lat = sp[1] < 25 ? 36 : 14, rp = Math.abs(sp[0] - 47) > 30 ? A(O, 12 + rnd() * 3, lat) : [sp[0] + dirS(O) * 9, sp[1] < 0 ? 7 : 43];
        b.say(W.inbound(pk, rnd, sayX(O, { a: nm(O, st.h.i), b: nm(O, hnd) })), "", P.sayPass * 0.6, 0);
        if (st.h.i === hnd) { /* taker is the handler: he walks it up himself */ } else passTo(b, hnd, rp, { say: false, wind: 260 });
        st.inb = null; st.live = true;
      } else if (st.h && st.h.i !== hnd && depthOf(O, pl[O][st.h.i].x) < 54 && (trOf(on[O][st.h.i]).han < trOf(on[O][hnd]).han - 10 || trOf(on[O][st.h.i]).ht > 203) && rnd() < 0.8 && slotsOn(O).length > 1) {
        const hp = pl[O][st.h.i]; b.say(W.outlet(pk, rnd, sayX(O, { a: nm(O, st.h.i), b: nm(O, hnd) })), "", P.sayPass, 0);
        passTo(b, hnd, A(O, clamp(depthOf(O, hp.x) + 14, 20, 50), hp.y < 25 ? 40 : 10), { say: false });
      }
      const hi = st.h.i, hd = depthOf(O, pl[O][hi].x), td = fast ? 72 + rnd() * 3 : 57 + rnd() * 6;
      if (hd < td - 3) { if (fast) b.say(W.push(pk, rnd, sayX(O, { a: nm(O, hi) })), "", P.sayOut, 1); else b.say(W.bring(pk, rnd, sayX(O, { a: nm(O, hi) })), "", P.sayPass * 0.7, 0); carryTo(b, A(O, td, clamp(25 + (rnd() - 0.5) * 16, 8, 42))); }
    }
    function holderTo(b, target, to) { if (!st.h || st.h.i === target) return; passTo(b, target, to || spotAbs(st.h.s, target)); }
    const pickRcv = (rnd, O, ex) => { const c = slotsOn(O).filter((i) => i !== st.h.i && !ex.includes(i)); return c.length ? c[Math.floor(rnd() * c.length)] : -1; };
    function pnr(b, rnd, c) {   // the screener sets a pick on the handler's defender, the handler comes off it and the screener rolls (or pops)
      const O = st.h.s, h = st.h.i; if (c === h || c < 0 || !on[O][c]) return false;
      const L0 = { mark: computeMarks(O) }, di = markerOf(O, h, L0); if (di < 0) return false;
      const hp = pl[O][h], dp = pl[1 - O][di], hoop = hoopOf(O); let dx = hoop[0] - hp.x, dy = hoop[1] - hp.y; const dd = Math.hypot(dx, dy) || 1; dx /= dd; dy /= dd;
      const sgn = hp.y < 25 ? 1 : -1, S = [dp.x + dx * 1.6 - dy * sgn * 2.4, dp.y + dy * 1.6 + dx * sgn * 2.4];
      b.say(W.screen(pk, rnd, sayX(O, { a: nm(O, h), b: nm(O, c) })), "", P.sayPass + 0.1, 0);
      carryTo(b, [S[0] + dx * 4, S[1] + dy * 4 + sgn * 1.5], { pulls: [{ s: O, i: c, to: S, v: trOf(on[O][c]).vmax * 0.9 }] });
      return true;
    }

    // ---------- shots ----------
    const arcSpot = (s, i, rnd) => {
      const [, lat] = spotTF(i), dl = lat - 25, Rr = 24.3 + rnd() * 0.8;
      if (Math.abs(dl) > 15 && rnd() < 0.85) return A(s, 86 + rnd() * 2, 25 + Math.sign(dl) * (21.4 + rnd() * 0.6));
      let ang = clamp(dl / Rr, -0.95, 0.95) + (rnd() - 0.5) * 0.3; if (Math.abs(ang) < 0.12) ang = rnd() < 0.5 ? 0.18 : -0.18;
      return A(s, HD - Rr * Math.cos(ang), 25 + Rr * Math.sin(ang));
    };
    const midSpot = (s, i, rnd) => { const [, lat] = spotTF(i), sg = lat >= 25 ? 1 : -1, Rr = 13 + rnd() * 5, ang = 0.35 + rnd() * 0.6; return A(s, HD - Rr * Math.cos(ang), 25 + sg * Rr * Math.sin(ang)); };
    const rimSpot = (s, rnd) => A(s, HD - 3.1, 25 + (rnd() - 0.5) * 4), postSpot = (s, sg) => A(s, HD - 8, 25 + sg * 6);
    function crashPulls(O, shooter, land, rcb, rnd) {   // everybody goes to the boards; the rebounder arrives first
      const out = [];
      for (const s of [0, 1]) for (const i of slotsOn(s)) {
        if (s === O && i === shooter) continue;
        const t = trOf(on[s][i]);
        if (rcb && rcb.s === s && rcb.i === i) { out.push({ s, i, to: land, v: t.vmax }); continue; }
        const a = hn(on[s][i], 21) * 6.28, rr = 2.6 + hn(on[s][i], 22) * 3.2, tight = s === O ? 0.62 : 0.7;
        if (dist(pl[s][i].x, pl[s][i].y, land[0], land[1]) < 30 && (s !== O || hn(on[s][i], 23) < 0.55 + t.cut)) out.push({ s, i, to: [land[0] + Math.cos(a) * rr, land[1] + Math.sin(a) * rr], v: t.vmax * tight });
      }
      return out;
    }
    function rebound(b, rnd, rebEv, O, shooter, pulls0) {   // the ball comes off the rim to the logged rebounder
      const hoop = hoopOf(O);
      if (!rebEv) { const L = [hoop[0] - dirS(O) * (4 + rnd() * 4), 25 + (rnd() - 0.5) * 12]; leg(b, "out", { to: L, z0: 10, z1: 0, zp: 4, side: O }); return null; }
      const rs = rebEv.s, ri = anySlot(rs, rebEv.p), rp = pl[rs][ri], d0 = Math.max(1, dist(rp.x, rp.y, hoop[0], hoop[1])), dr = clamp(4.5 + rnd() * 4, 3, 13), land = [clamp(hoop[0] + ((rp.x - hoop[0]) / d0) * dr, 2, 92), clamp(hoop[1] + ((rp.y - hoop[1]) / d0) * dr, 2, 48)];
      leg(b, "bounce", { rc: { s: rs, i: ri }, to: land, z0: 10, z1: 3.4, zp: 4.5, side: rs, pulls: crashPulls(O, shooter, land, { s: rs, i: ri }, rnd).concat(pulls0 || []) });
      const x = sayX(rs, { a: nm(rs, ri), off: !!rebEv.off, team: names[rs] });
      b.mark(rebEv._i); b.say(W.reb(pk, rnd, x), "", P.sayMiss, rebEv.off ? 1 : 0);
      st.O = rs; st.live = true; return ri;
    }
    function shotLeg(b, rnd, O, sh, res, kind, o = {}) {
      const hoop = hoopOf(O), p = pl[O][sh], dd = dist(p.x, p.y, hoop[0], hoop[1]), tgt = res === "made" ? hoop : [hoop[0] - dirS(O) * 0.9, hoop[1] + (rnd() - 0.5) * 0.8];
      const L0 = { mark: computeMarks(O) }, mi = markerOf(O, sh, L0), pulls = [{ s: O, i: sh, to: kind === "ins" || kind === "fb" ? [hoop[0] - dirS(O) * 2, hoop[1]] : [p.x, p.y], v: trOf(on[O][sh]).vmax * 0.5 }];
      let bx, by; if (res === "block") { const sg = rnd() < 0.5 ? -1 : 1; bx = clamp(hoop[0] - dirS(O) * (7 + rnd() * 5), 2, 92); by = clamp(hoop[1] + sg * (7 + rnd() * 6), 1, 49); }
      const dunk = !!o.dunk;
      return leg(b, "shot", { hf: { s: O, i: sh }, to: tgt, z0: 7.2, z1: 10, zp: dunk ? 0 : clamp(dd * 0.18, 0.6, 5), wind: o.wind != null ? o.wind : dunk ? 0 : kind === "ins" || kind === "fb" ? 140 : 340, res, dunk, bx, by, side: O, pulls, contest: { s: O, i: sh } });
    }
    const dunkOf = (e, rnd) => { const t = trOf(e.p); return (e.kind === "ins" || e.kind === "fb") && t.dunk >= 74 && rnd() < clamp((t.dunk - 55) / 55, 0.1, 0.8); };

    // the build-up of an attempt: ends with the shooter holding the ball where he shoots from
    function buildUp(b, rnd, a) {   // a: { O, sh, as, kind, dur, fast, featuredShot }
      const O = a.O, kind = a.kind;
      if (kind === "fb") return fastBreak(b, rnd, a);
      bringUp(b, rnd, false);
      let nsw = clamp(Math.round((a.dur - 8) / 4.3 + (rnd() - 0.5) * 1.2), 0, 3);
      if (slotsOn(O).length < 3) nsw = 0;
      const exs = [a.sh, a.as].filter((x) => x >= 0);
      for (let k = 0; k < nsw; k++) { const r = pickRcv(rnd, O, exs); if (r < 0) break; passTo(b, r, spotAbs(O, r)); }
      const useP = (kind === "ins" || kind === "mid") && slotsOn(O).length >= 3 && rnd() < 0.45, driver = a.as >= 0 ? a.as : a.sh;
      if (a.as >= 0) {
        holderTo(b, a.as);
        if (useP && a.sh !== a.as) {   // pick and roll / pop: the shooter is the screener and catches the ball off it
          pnr(b, rnd, a.sh);
          const pop = kind === "mid", spot = pop ? midSpot(O, a.sh, rnd) : rimSpot(O, rnd);
          b.say(W.assistPass(pk, rnd, sayX(O, { a: nm(O, a.as), b: nm(O, a.sh), kind })), "", P.sayOut * 0.7, 1);
          passTo(b, a.sh, spot, { say: false, lob: !pop && a.dunk, pulls: [] });
        } else {
          const spot = kind === "thr" ? arcSpot(O, a.sh, rnd) : kind === "mid" ? midSpot(O, a.sh, rnd) : rimSpot(O, rnd);
          if (kind === "thr" && rnd() < 0.35 && st.h.i === a.as) { const hoop = hoopOf(O); carryTo(b, [lerp(pl[O][a.as].x, hoop[0], 0.35), lerp(pl[O][a.as].y, hoop[1], 0.3)]); b.say(W.kick(pk, rnd, sayX(O, { a: nm(O, a.as), b: nm(O, a.sh) })), "", P.sayOut * 0.7, 1); }
          else if (kind === "ins" && st.h.i !== a.as) holderTo(b, a.as);
          else b.say(W.assistPass(pk, rnd, sayX(O, { a: nm(O, a.as), b: nm(O, a.sh), kind })), "", P.sayOut * 0.7, 1);
          passTo(b, a.sh, spot, { say: false, lob: kind === "ins" && a.dunk, wind: 200 });
        }
      } else {
        holderTo(b, a.sh);
        const hoop = hoopOf(O), p = pl[O][a.sh];
        if (useP && pnr(b, rnd, bigOf(O, [a.sh]))) { /* he comes off the screen */ }
        if (kind === "thr") { const sp = arcSpot(O, a.sh, rnd); b.say(W.stepback(pk, rnd, sayX(O, { a: nm(O, a.sh) })), "", P.sayOut * 0.5, 1); carryTo(b, [lerp(p.x, sp[0], 0.9), lerp(p.y, sp[1], 0.9)]); }
        else if (kind === "mid") { const sp = midSpot(O, a.sh, rnd); b.say(W.pullup(pk, rnd, sayX(O, { a: nm(O, a.sh) })), "", P.sayOut * 0.5, 0); carryTo(b, sp); }
        else if (trOf(on[O][a.sh]).big && trOf(on[O][a.sh]).post >= 62 && rnd() < 0.6) {   // post up: entry pass to the block, a couple of dribbles
          const sg = pl[O][a.sh].y < 25 ? -1 : 1, bl = postSpot(O, sg), ent = pickRcv(rnd, O, [a.sh]);
          if (ent >= 0) { passTo(b, ent, spotAbs(O, ent)); passTo(b, a.sh, bl, { how: "entry" }); }
          else carryTo(b, bl);
          b.say(W.postup(pk, rnd, sayX(O, { a: nm(O, a.sh) })), "", P.sayOut * 0.6, 0);
          carryTo(b, A(O, HD - 5.5, 25 + sg * 3));
        } else { b.say(W.drive(pk, rnd, sayX(O, { a: nm(O, a.sh) })), "", P.sayOut * 0.6, 1); carryTo(b, [hoop[0] - dirS(O) * 4.2, hoop[1] + (rnd() - 0.5) * 6]); }
      }
    }
    function fastBreak(b, rnd, a) {   // the ball is already in somebody's hands; the shooter runs the lane and gets the ball in stride
      const O = a.O; ensureInbound(b, O); st.inb = null;
      const hoop = hoopOf(O), run = { s: O, i: a.sh, to: [hoop[0] - dirS(O) * 6, 25 + (rnd() - 0.5) * 10], v: trOf(on[O][a.sh]).vmax };
      b.say(W.push(pk, rnd, sayX(O, { a: nm(O, st.h.i) })), "", P.sayOut, 1);
      const passer = a.as >= 0 ? a.as : st.h.i;
      if (st.h.i !== passer) passTo(b, passer, A(O, 52, 25 + (rnd() - 0.5) * 12), { say: false });
      if (st.h.i === a.sh) { carryTo(b, [hoop[0] - dirS(O) * 4.5, hoop[1] + (rnd() - 0.5) * 4]); return; }
      carryTo(b, A(O, 70, 25 + (rnd() - 0.5) * 12), { pulls: [run] });
      b.say(W.assistPass(pk, rnd, sayX(O, { a: nm(O, st.h.i), b: nm(O, a.sh), kind: "fb" })), "", P.sayOut, 1);
      passTo(b, a.sh, [hoop[0] - dirS(O) * 4.5, hoop[1] + (rnd() - 0.5) * 3], { say: false, lob: true, pulls: [run], wind: 180 });
    }
    function contactLeg(b, rnd, O, sh, foulerId) {   // the defender hits the shooter: both stop for a moment
      const fs = 1 - O, fi = anySlot(fs, foulerId), p = pl[O][sh];
      leg(b, "hold", { hf: { s: O, i: sh }, dur: 450, side: O, pulls: [{ s: fs, i: fi, to: [p.x + (hoopOf(O)[0] - p.x) * 0.06, p.y], v: trOf(on[fs][fi]).vmax }, { s: O, i: sh, to: [p.x, p.y], v: 2 }] });
    }

    // ---------- segments ----------
    function finish(b, o) {
      const nat = Math.max(DT, b.t), a0 = { t: 0, ...st.anchor }, anchors = [a0];
      let cur = { ...st.anchor };
      for (const m of b.marks.slice().sort((x, y) => x.t - y.t)) { const e = ev[m.ei]; const a = { t: m.t, gt: Math.max(cur.gt, e.gt), q: e.q, clk: e.clk }; anchors.push(a); cur = { gt: a.gt, q: a.q, clk: a.clk }; }
      if (o.anchor) { const a = { t: nat, ...o.anchor }; anchors.push(a); cur = { gt: a.gt, q: a.q, clk: a.clk }; } else anchors.push({ t: nat, ...cur });
      st.anchor = cur;
      const sc0 = o.sc0 !== undefined ? o.sc0 : "keep";
      segs.push({ id: segs.length, cls: o.cls, kind: o.kind, nat, w: o.w || 1, legs: b.legs, lines: b.lines, marks: b.marks, cards: b.cards, anchors, sc0, shotClock: !!o.shotClock, on0: o.on0 || on.map((a) => a.slice()), on1: o.on1 || on.map((a) => a.slice()), fl: o.fl != null ? o.fl : null, half });
    }
    const classOf = (idx) => (featured.has(idx) ? "key" : "quiet");
    const cloneOn = () => on.map((a) => a.slice());
    const eAt = (i) => { const e = ev[i]; e._i = i; return e; };
    const setCtx = (e) => { gs.q = e.q; gs.clk = e.clk; gs.score = e.score.slice(); const m = meta[ev.indexOf(e)]; if (m) gs.run = m.run; };
    const nextO = (k) => { for (let j = k + 1; j < items.length; j++) if (items[j].k === "play") return items[j].O; return 0; };

    // ---- the plays ----
    function shotPlay(it, k, rnd) {
      const cls = classOf(k), evs = it.eis.map(eAt), shotEv = evs.find((e) => e.e === "shot"), foulEv = evs.find((e) => e.e === "foul"), fts = evs.filter((e) => e.e === "ft"), rebEv = evs.find((e) => e.e === "reb");
      const O = it.O, b = builder(rnd), first = ev[it.eis[0]], g0 = st.anchor.gt;
      st.O = O; const dur = clamp(((shotEv || fts[0] || first).gt) - g0, 0.6, 30);
      if (shotEv || it.type === "shootfoul") {
        const shooterId = shotEv ? shotEv.p : fts[0].p, sh = anySlot(O, shooterId), as = shotEv && shotEv.a ? anySlot(O, shotEv.a) : -1;
        const kind = shotEv ? shotEv.kind : fts.length >= 3 ? "thr" : rnd() < 0.7 ? "ins" : "mid", dunk = shotEv ? dunkOf(shotEv, rnd) : false;
        setCtx(first); st.sc0 = g0;
        buildUp(b, rnd, { O, sh, as, kind, dur, dunk });
        const pz = pl[O][sh]; const late = lateGame();
        if (shotEv) {
          const res = shotEv.blk ? "block" : shotEv.made ? "made" : "miss";
          if (foulEv) { contactLeg(b, rnd, O, sh, foulEv.p); b.mark(it.eis[0]); b.say(W.foul(pk, rnd, sayX(O, { a: foulEv.pn, b: shotEv.pn, kind: "shooting", n: foulEv.n })), "foul", 1, 1); }
          if (res === "block") { const bs = 1 - O, bi = anySlot(bs, shotEv.blk); const L0 = shotLeg(b, rnd, O, sh, res, kind, { dunk }); b.mark(eAt(it.eis[foulEv ? 1 : 0])._i, { fx: "block" }); b.say(W.block(pk, rnd, sayX(O, { a: shotEv.pn, b: shotEv.bn, kind })), "block", 1, H(2, { late })); void L0; void bi; }
          else {
            const L0 = shotLeg(b, rnd, O, sh, res, kind, { dunk }); const se = shotEv, x = sayX(O, { a: se.pn, b: se.an || "", kind: dunk ? "dunk" : kind, andOne: !!se.andOne, buzzer: se.clk <= 1.5, late, m: meta[ev.indexOf(se)], pts: (meta[ev.indexOf(se)] || {}).pts });
            b.mark(ev.indexOf(se), { fx: res === "made" ? (dunk ? "dunk" : kind === "thr" ? "three" : "swish") : "rim" });
            if (res === "made") { b.say(W.made(pk, rnd, x), se.kind === "thr" ? "three" : "made", 1, H(1 + (se.kind === "thr" ? 1 : 0) + (dunk ? 1 : 0) + (x.buzzer ? 1 : 0), { late })); void L0; }
            else b.say(W.missed(pk, rnd, x), "", P.sayMiss, 0);
          }
          const after = it.eis.map((i) => ev[i]);
          if (res === "made") { st.O = 1 - O; leg(b, "netfall", { side: 1 - O, nd: dirS(O), to: hoopOf(O) }); st.inb = null; }
          else if (!fts.length) { const ri = rebound(b, rnd, rebEv ? eAt(it.eis[it.eis.length - 1]) : null, O, sh); void ri; }
          void after;
          const cardsTo = shotEv; addPlayCards(b, cardsTo, ev.indexOf(shotEv), dunk, foulEv);
        } else {   // fouled in the act of shooting and the shot did not count: contact, whistle, free throws
          contactLeg(b, rnd, O, sh, foulEv.p); b.mark(it.eis[0], { fx: "whistle" }); b.say(W.foul(pk, rnd, sayX(O, { a: foulEv.pn, b: nm(O, sh), kind: "shooting", n: foulEv.n })), "foul", 1, 1); addPlayCards(b, foulEv, it.eis[0], false, foulEv);
        }
        finish(b, { cls, kind: "shot", w: 1, shotClock: true, sc0: g0 });
      }
      freeThrows(it, k, rnd, evs, fts, rebEv);
    }
    // the second voice: colour lines, rarer in the short films (the preset's `colour` is the base chance; k says how much the moment deserves)
    const colour = (b, rnd, kind, s, extra, k) => { const p = Math.min(1, P.colour * k); if (rnd() < p) b.say(W[kind](pk, rnd, sayX(s, extra)), "colour", 1, 0); };
    function addPlayCards(b, e, ei, dunk, foulEv) {
      const m = meta[ei] || {}; const crnd = b.rnd;
      if (e.e === "shot" && e.made) {
        if (e.clk <= 1.5 && e.q >= 1) b.card("buzzer", { id: e.p, name: e.pn, s: e.s }, { pr: 3, dur: 2800 });
        else if (m.runCross) { b.card("run", { s: e.s, n: m.runCross, name: names[e.s] }, { pr: 2, dur: 2200 }); colour(b, crnd, "run", e.s, { n: m.runCross }, 8); }
        else if (m.mile) b.card("milestone", { id: e.p, name: e.pn, pts: m.pts, s: e.s }, { pr: 2, dur: 2600 });
        else if ((e.kind === "thr" && m.clutch) || (dunk && cls0())) b.card("play", { id: e.p, name: e.pn, s: e.s, text: dunk ? "Throws it down" : "Clutch three" }, { pr: 2, dur: 2400 });
      }
      if (foulEv && foulEv.n >= 4) b.card("trouble", { id: foulEv.p, name: foulEv.pn, s: foulEv.s, n: foulEv.n }, { pr: 2, dur: 2600 });
      if (foulEv && foulEv.n >= 3 && foulEv.n <= 5) colour(b, crnd, "foulTrouble", foulEv.s, { a: foulEv.pn, n: foulEv.n }, 8);
      if (e.e === "shot" && e.made) {
        if (m.clutch && gs.q >= 4) colour(b, crnd, "clutch", e.s, {}, 6);
        else { const t = traitOf(ents.get(e.p)); if (t) colour(b, crnd, "trait", e.s, { a: e.pn, t }, 1.2); }
      }
    }
    const cls0 = () => true;
    function freeThrows(it, k, rnd, evs, fts, rebEv) {
      const foulEv = evs.find((e) => e.e === "foul"), oneAnd = fts.length === 1 && fts[0].tag === "and-one";
      if (!fts.length) { if (foulEv && it.type === "foul") foulStop(it, k, rnd, foulEv, evs); return; }
      const O = fts[0].s, sh = anySlot(O, fts[0].p), b = builder(rnd), hoop = hoopOf(O), d = dirS(O);
      const line = A(O, HD - 13.75, 25), lane = [[HD - 12.4 + 0, 20.4], [HD - 12.4, 29.6], [HD - 8.4, 20.4], [HD - 8.4, 29.6], [HD - 15.6, 20.4]];   // [depth, lat]: the lane spaces (the nearest two belong to the defence)
      const targets = [[], []]; const D = 1 - O;
      const don = slotsOn(D), oon = slotsOn(O).filter((i) => i !== sh);
      const dsp = [[HD - 4.6, 20.2], [HD - 4.6, 29.8], [HD - 8.6, 20.2]], osp = [[HD - 8.6, 29.8], [HD - 12.6, 20.2]], back = [[HD - 25, 17], [HD - 25, 33], [HD - 27, 25], [HD - 22, 25]];
      let bi = 0; don.forEach((i, j) => { const q = j < 3 ? dsp[j] : back[bi++ % 4]; targets[D][i] = A(O, q[0], q[1]); });
      let oi = 0; oon.forEach((i, j) => { const q = j < 2 ? osp[j] : back[bi++ % 4]; targets[O][i] = A(O, q[0], q[1]); void oi; });
      targets[O][sh] = line; void lane;
      if (!oneAnd) b.card("ft", { id: fts[0].p, name: fts[0].pn, s: O, n: fts.length }, { pr: 1, dur: 1800 });
      // the shooter gets the ball from the player who has it (or from the official), everybody lines up
      if (!st.h) { const q = slotsOn(O).sort((a, c) => dist(pl[O][a].x, pl[O][a].y, ball.x, ball.y) - dist(pl[O][c].x, pl[O][c].y, ball.x, ball.y))[0]; leg(b, "fetch", dead({ rc: { s: O, i: q }, side: O })); }
      leg(b, "setup", dead({ targets, hf: st.h, dur: 1800, side: O }));
      if (st.h.s !== O || st.h.i !== sh) { const from = st.h; leg(b, "pass", dead({ rc: { s: O, i: sh }, to: line, side: O, wind: 150, z0: 4, z1: 4, zp: 1 })); void from; }
      fts.forEach((e, n) => {
        const last = n === fts.length - 1, ei = it.eis[evs.indexOf(e)];
        b.say(W.ftUp(pk, rnd, sayX(O, { a: e.pn, i: e.i, n: e.n })), "", n === 0 ? 0.7 : 0.3, 0);
        leg(b, "hold", dead({ hf: { s: O, i: sh }, dur: 1000, drib: true, side: O, pulls: [{ s: O, i: sh, to: line, v: 2 }] }));
        const res = e.made ? "made" : "miss";
        leg(b, "shot", { hf: { s: O, i: sh }, to: res === "made" ? hoop : [hoop[0] - d * 0.9, hoop[1] + (n % 2 ? -0.5 : 0.5)], z0: 6, z1: 10, zp: 2.6, wind: 400 * P.dead * (P.dead < 1 ? 1 : 1), res, side: O, sp: deadSp, dead: true, pulls: [{ s: O, i: sh, to: line, v: 2 }] });
        b.mark(ei, { fx: res === "made" ? "swish" : "rim" }); b.say(W.ft(pk, rnd, sayX(O, { a: e.pn, made: e.made, i: e.i, n: e.n })), "", e.made ? 1 : P.sayMiss, 0);
        if (!last) { leg(b, "netfall", dead({ side: O, nd: d, to: hoop })); leg(b, "return", dead({ rc: { s: O, i: sh }, to: line, side: O, z0: 1, z1: 4, zp: 1 })); }
        else if (e.made) { st.O = D; leg(b, "netfall", dead({ side: D, nd: d, to: hoop })); st.inb = null; }
        else if (rebEv) { st.O = O; rebound(b, rnd, eAt(it.eis[it.eis.length - 1]), O, sh); }
        else { leg(b, "out", dead({ to: [hoop[0] - d * 5, 25], z0: 10, z1: 0, zp: 3, side: O })); }
      });
      st.set = null; finish(b, { cls: "fixed", kind: "ft", w: 1, shotClock: false });
    }
    function foulStop(it, k, rnd, foulEv, evs) {   // a foul away from the ball with no free throws: whistle, a short stop, play on
      const b = builder(rnd), O = it.O; st.O = O; setCtx(foulEv);
      const cls = classOf(k); b.t = 0;
      const first = builder(rnd); void first;
      leg(b, "hold", dead({ dur: 900, hf: st.h && st.h.s === O ? st.h : undefined, side: O, pulls: [] }));   // the whistle, the mark and the line were already given by foulPlay
      st.sc0 = st.anchor.gt - 10; void cls;
      finish(b, { cls: "fixed", kind: "foulstop", w: 1 });
    }
    function foulPlay(it, k, rnd) {   // loose and intentional fouls: the build-up, the contact, then the free throws if there are any
      const evs = it.eis.map(eAt), foulEv = evs[0], fts = evs.filter((e) => e.e === "ft"), rebEv = evs.find((e) => e.e === "reb"), O = it.O, b = builder(rnd), g0 = st.anchor.gt;
      st.O = O; setCtx(foulEv); st.sc0 = g0;
      const dur = clamp(foulEv.gt - g0, 0.6, 30);
      if (foulEv.kind === "intentional") {
        const target = fts.length ? anySlot(O, fts[0].p) : handlerOf(O);
        bringUp(b, rnd, false); holderTo(b, target, spotAbs(O, target));
        const fs = 1 - O, fi = anySlot(fs, foulEv.p), p = pl[O][target];
        leg(b, "hold", { hf: { s: O, i: target }, dur: 600, side: O, pulls: [{ s: fs, i: fi, to: [p.x, p.y], v: trOf(on[fs][fi]).vmax }] });
      } else {
        bringUp(b, rnd, false);
        const nsw = clamp(Math.round((dur - 8) / 4.5), 0, 2); for (let q = 0; q < nsw; q++) { const r = pickRcv(rnd, O, []); if (r < 0) break; passTo(b, r, spotAbs(O, r)); }
        const fs = 1 - O, fi = anySlot(fs, foulEv.p), p = pl[O][st.h.i];
        leg(b, "hold", { hf: st.h, dur: 500, side: O, pulls: [{ s: fs, i: fi, to: [p.x, p.y], v: trOf(on[fs][fi]).vmax }] });
      }
      b.mark(it.eis[0], { fx: "whistle" }); b.say(W.foul(pk, rnd, sayX(O, { a: foulEv.pn, b: st.h ? nm(O, st.h.i) : "", kind: foulEv.kind, n: foulEv.n })), "foul", 1, 1); addPlayCards(b, foulEv, it.eis[0], false, foulEv);
      finish(b, { cls: classOf(k), kind: "foul", w: 1, shotClock: true, sc0: g0 });
      if (fts.length) freeThrows(it, k, rnd, evs, fts, rebEv); else foulStop(it, k, rnd, foulEv, evs);
    }
    function tovPlay(it, k, rnd) {
      const e = eAt(it.eis[0]), O = it.O, b = builder(rnd), g0 = st.anchor.gt, tv = anySlot(O, e.p), D = 1 - O;
      st.O = O; setCtx(e); st.sc0 = g0; const dur = clamp(e.gt - g0, 0.6, 30);
      bringUp(b, rnd, false);
      let nsw = clamp(Math.round((dur - 8) / 4.3), 0, 2); if (slotsOn(O).length < 3) nsw = 0;
      for (let q = 0; q < nsw; q++) { const r = pickRcv(rnd, O, [tv]); if (r < 0) break; passTo(b, r, spotAbs(O, r)); }
      holderTo(b, tv);
      const late = lateGame(), x = sayX(O, { a: e.pn, b: e.stn || "" });
      if (e.stl) {
        const si = anySlot(D, e.stl);
        if (rnd() < 0.55 && slotsOn(O).length > 1) {   // a pass is picked off
          const r = pickRcv(rnd, O, [tv]), rp = pl[O][r], tp = pl[O][tv], ip = [lerp(tp.x, rp.x, 0.55) + (rnd() - 0.5) * 2, lerp(tp.y, rp.y, 0.55) + (rnd() - 0.5) * 2];
          leg(b, "pass", { rc: { s: D, i: si }, to: ip, wind: 200, z0: 4.4, z1: 4.4, zp: 1, side: O, pulls: [{ s: D, i: si, to: ip, v: trOf(on[D][si]).vmax }, { s: O, i: r, to: spotAbs(O, r), v: 6 }] });
          b.mark(it.eis[0], { fx: "steal" }); b.say(W.steal(pk, rnd, { ...x, how: "pick", team: names[D], opp: names[O], a: e.stn, b: e.pn }), "steal", 1, H(2, { late }));
        } else {
          const hp = pl[O][tv]; carryTo(b, [hp.x + dirS(O) * 6, hp.y + (rnd() - 0.5) * 6]);
          leg(b, "swipe", { rc: { s: D, i: si }, side: O }); b.mark(it.eis[0], { fx: "steal" }); b.say(W.steal(pk, rnd, { ...x, how: "strip", team: names[D], opp: names[O], a: e.stn, b: e.pn }), "steal", 1, H(2, { late }));
        }
        st.O = D; st.live = true; st.inb = null;
      } else if (rnd() < 0.6 && slotsOn(O).length > 1) {   // an errant pass sails out of bounds
        const r = pickRcv(rnd, O, [tv]), rp = pl[O][r], oy = rp.y < 25 ? -2.2 : 52.2;
        leg(b, "out", { to: [clamp(rp.x + dirS(O) * 4, 3, 91), oy], z0: 4.4, z1: 0, zp: 3, side: O, pulls: [{ s: O, i: r, to: [rp.x, rp.y < 25 ? 3 : 47], v: 8 }] });
        b.mark(it.eis[0], { fx: "whistle" }); b.say(W.tov(pk, rnd, { ...x, how: "pass" }), "", 1, 1);
        st.O = D; st.inb = [ball.x, oy]; st.h = null; st.live = false;
      } else {   // the ball gets away from the handler and the nearest defender picks it up
        const hp = pl[O][tv], lp = [clamp(hp.x + dirS(O) * (5 + rnd() * 3), 3, 91), clamp(hp.y + (rnd() - 0.5) * 10, 3, 47)];
        leg(b, "out", { to: lp, z0: 3, z1: 0, zp: 1.5, side: O });
        const nr = slotsOn(D).sort((a, c) => dist(pl[D][a].x, pl[D][a].y, lp[0], lp[1]) - dist(pl[D][c].x, pl[D][c].y, lp[0], lp[1]))[0];
        b.mark(it.eis[0], { fx: "whistle" }); b.say(W.tov(pk, rnd, { ...x, how: "loose" }), "", 1, 1);
        st.O = D; leg(b, "fetch", { rc: { s: D, i: nr }, side: D }); st.live = true; st.inb = null;
      }
      finish(b, { cls: classOf(k), kind: "tov", w: 1, shotClock: true, sc0: g0 });
    }

    // ---- breaks, subs, timeouts ----
    const huddle = (s, i) => [BENCH_X[s] + Math.cos((i / 5) * 6.283) * 3, 55.2 + Math.sin((i / 5) * 6.283) * 1.9];
    const tipFormation = (s, tw) => { const out = [], dsrt = [[34, 18], [34, 32], [40, 25], [28, 25], [37, 10]]; const tall = slotsOn(s).sort((a, c) => trOf(on[s][c]).ht - trOf(on[s][a]).ht)[0]; let j = 0;
      for (let i = 0; i < 5; i++) { if (!on[s][i]) continue; if (i === tall) { out[i] = [47 + (dirS(s) > 0 ? -1.3 : 1.3), 25]; continue; } const q = dsrt[j++ % 5], x = dirS(s) > 0 ? q[0] : COURT.L - q[0]; out[i] = [x, q[1]]; } void tw; return out; };
    function startItem(it, k, rnd) {
      const b = builder(rnd); setCtx(ev[it.ei]);
      for (let s = 0; s < 2; s++) { const f = tipFormation(s); for (let i = 0; i < 5; i++) { const p = pl[s][i]; if (f[i]) { p.x = f[i][0]; p.y = f[i][1]; } p.fx = dirS(s); p.fy = 0; p.vx = p.vy = 0; } }
      ball.x = 47; ball.y = 25; ball.z = 4; st.h = null; pushSample(-1); CUT[CUT.length - 1] = 1;
      b.card("tip", { names }, { cover: true, pr: 2, dur: 3000 }); b.mark(it.ei);
      leg(b, "hold", dead({ dur: 1800, hf: undefined, side: 0 }));
      finish(b, { cls: "fixed", kind: "start", w: 1 });
    }
    const tallSlot = (s) => slotsOn(s).sort((a, c) => trOf(on[s][c]).ht - trOf(on[s][a]).ht)[0] ?? 0;
    function periodItem(it, k, rnd) {
      const e = eAt(it.ei), b = builder(rnd), q = e.n; setCtx(e); const no = nextO(k);
      if (q === 3) half = 1; gs.q = q;
      if (q === 1 || q >= 5) {   // jump ball: the two tallest meet at the centre, the ball goes up
        if (q >= 5) { b.card("ot", { n: q - 4 }, { cover: false, pr: 3, dur: 2600 }); }
        const f = [tipFormation(0), tipFormation(1)];
        if (q >= 5) { ensureHolder(b, no); const tk = st.h.i; f[st.h.s][tk] = [47, 29]; }
        const hs = st.h ? { ...st.h } : null;
        leg(b, "setup", dead({ targets: f, hf: hs, side: no, dur: 2200 }));
        const tallO = tallSlot(no), tallD = tallSlot(1 - no), guard = slotsOn(no).filter((i) => i !== tallO).sort((a, c) => trOf(on[no][c]).han - trOf(on[no][a]).han)[0] ?? tallO, gp = [47 + dirS(no) * -7, 25 + (guard % 2 ? 6 : -6)];
        b.say(W.tipoff(pk, rnd, sayX(no, { a: nm(no, tallO), b: nm(1 - no, tallD), tip: no })), "mark", 1, 1);
        leg(b, "toss", { rc: { s: no, i: guard }, to: gp, hf: hs && hs.s === no ? hs : null, z0: 4, z1: 4, zp: 9, side: no, pulls: [{ s: no, i: tallO, to: [47, 25], v: trOf(on[no][tallO]).vmax }, { s: 1 - no, i: tallD, to: [47, 25], v: trOf(on[1 - no][tallD]).vmax }] });
        b.mark(it.ei, { fx: "tip" }); st.O = no; st.live = true; st.inb = null; st.sc0 = e.gt;
      } else {   // the other quarters start with a sideline throw-in at half court
        const f = [[], []];
        for (let s = 0; s < 2; s++) for (const i of slotsOn(s)) { const [sd, sl] = spotTF(i); f[s][i] = s === no ? A(s, clamp(sd - 24, 26, 40), sl) : A(s, clamp(sd - 8, 18, 40), sl); }
        const tk = slotsOn(no).filter((i) => i !== handlerOf(no)).sort((a, c) => dist(pl[no][a].x, pl[no][a].y, 47, 52) - dist(pl[no][c].x, pl[no][c].y, 47, 52))[0] ?? handlerOf(no);
        ensureHolder(b, no); f[no][tk] = [47, 52.2];
        const hs = st.h ? { ...st.h } : null;
        b.mark(it.ei); b.card("period", { n: q }, { pr: 1, dur: 1800 });
        leg(b, "setup", dead({ targets: f, hf: hs, side: no, dur: 3000 }));
        if (hs && (hs.s !== no || hs.i !== tk)) { leg(b, "pass", dead({ rc: { s: no, i: tk }, to: [47, 52.2], side: no, wind: 150, z0: 4, z1: 4, zp: 1 })); }
        st.O = no; st.inb = [47, 52.2]; st.live = false; st.h = { s: no, i: tk }; st.sc0 = null;
      }
      finish(b, { cls: "fixed", kind: "period", w: 1, anchor: { gt: e.gt, q: e.q, clk: e.clk } });
    }
    function overtimeItem(it, k, rnd) {
      const e = eAt(it.ei), b = builder(rnd); setCtx(e); const no = nextO(k);
      b.mark(it.ei); b.say(W.overtime(pk, rnd, sayX(0, { n: e.n })), "mark", 1, 3);
      const f = [tipFormation(0), tipFormation(1)]; ensureHolder(b, no);
      leg(b, "setup", dead({ targets: f, hf: st.h, side: no, dur: 2200 }));
      finish(b, { cls: "fixed", kind: "overtime", w: 1 });
    }
    function qendItem(it, k, rnd) {
      const e = eAt(it.ei), b = builder(rnd); setCtx(e); const no = nextO(k);
      ensureHolder(b, no);
      b.mark(it.ei, { fx: "buzzer" }); const half2 = e.n === 2, last = e.n >= 4 && false;
      b.card(half2 ? "half" : "qend", { n: e.n, score: e.score.slice() }, { cover: true, pr: 3, dur: 3000 });
      b.say(W.qend(pk, rnd, sayX(0, { n: e.n, half: half2, score: e.score.slice() })), "mark", 1, 1);
      { const lead0 = e.score[0] - e.score[1], ls = lead0 >= 0 ? 0 : 1; colour(b, rnd, "state", ls, { diff: Math.abs(lead0) * (lead0 === 0 ? 0 : 1) }, 12); }
      const t = [[], []]; for (let s = 0; s < 2; s++) for (const i of slotsOn(s)) t[s][i] = huddle(s, i);
      leg(b, "setup", dead({ targets: t, hf: st.h, side: no, dur: half2 ? 3600 : 2600 })); void last;
      st.sc0 = null; finish(b, { cls: "fixed", kind: "qend", w: 1 });
    }
    function deadItem(it, k, rnd) {
      const evs = it.eis.map(eAt), b = builder(rnd), no = nextO(k), tos = evs.filter((e) => e.e === "timeout"), subs = evs.filter((e) => e.e === "sub"), injs = evs.filter((e) => e.e === "injury");
      setCtx(evs[0]); ensureHolder(b, st.h ? st.h.s : no);
      const on0 = cloneOn(), outs = [], removes = [];
      subs.forEach((e) => { const i = e.out ? slotOf(e.s, e.out) : on[e.s].findIndex((x) => !x); if (i >= 0) outs.push({ s: e.s, i, e }); });
      injs.forEach((e) => { const i = slotOf(e.s, e.p); if (i >= 0 && !subs.some((u) => u.out === e.p)) removes.push({ s: e.s, i, e }); });
      const pulls = [];
      for (const o of outs.concat(removes)) { const inj = injs.some((x) => x.p === o.e.p || (o.e.out && x.p === o.e.out)); pulls.push({ s: o.s, i: o.i, to: [BENCH_X[o.s] + (o.i - 2) * 2.4, BENCH_Y], v: inj ? 4.5 : 9 }); }
      let mi = 0;
      if (tos.length) {
        tos.forEach((e) => { b.mark(it.eis[evs.indexOf(e)], { fx: "whistle" }); b.card("timeout", { s: e.s, left: e.left, name: names[e.s] }, { cover: true, pr: 3, dur: 3200 }); b.say(W.timeout(pk, rnd, sayX(e.s, { left: e.left, run: gs.run })), "sub", 1, H(1, { late: lateGame() })); });
        const t = [[], []]; for (let s = 0; s < 2; s++) for (const i of slotsOn(s)) t[s][i] = huddle(s, i);
        leg(b, "setup", dead({ targets: t, hf: st.h, side: st.O, dur: 2800 }));
        mi = 1;
      }
      injs.forEach((e) => { b.mark(it.eis[evs.indexOf(e)]); b.card("injury", { id: e.p, name: e.pn, s: e.s }, { pr: 3, dur: 2800 }); b.say(W.injury(pk, rnd, sayX(e.s, { a: e.pn })), "sub", 1, 2); });
      if (!tos.length && pulls.length) leg(b, "hold", dead({ dur: 2600, hf: st.h, side: st.O, pulls }));
      // identities change at the sideline (or in the huddle): the same body, a new player
      subs.forEach((e) => { const o = outs.find((x) => x.e === e); if (o) { on[o.s][o.i] = e.in; } b.mark(it.eis[evs.indexOf(e)]); });
      removes.forEach((o) => { on[o.s][o.i] = null; });
      const flipAt = b.t / Math.max(1, b.t + 1);
      subs.forEach((e) => { const o = outs.find((x) => x.e === e); if (!o) return; b.say(W.sub(pk, rnd, sayX(e.s, { a: e.on, b: e.off, why: e.why })), "sub", P.sayOut * 0.5 + (e.why !== "rotation" ? 0.4 : 0), e.why === "fouls" || e.why === "injury" ? 1 : 0); if (e.why === "rotation") colour(b, rnd, "fatigue", e.s, { a: e.off }, 1.5); if (e.why === "fouls") b.card("foulout", { id: e.out, name: e.off, s: e.s }, { pr: 2, dur: 2400 }); });
      if (subs.length || tos.length) leg(b, "hold", dead({ dur: tos.length ? 1900 : 1400, hf: st.h, side: st.O }));
      void mi;
      const fl = b.t ? clamp(flipAt, 0.05, 0.95) : null;
      finish(b, { cls: "fixed", kind: tos.length ? "timeout" : injs.length ? "injury" : "sub", w: 1, on0, on1: cloneOn(), fl: fl });
      // the flip must happen when the leg that moves them has finished: store the natural time
      segs[segs.length - 1].flipT = b.t * flipAtFrac(b, pulls.length || tos.length);
      void flipAt;
    }
    const flipAtFrac = () => 0.55;
    function endItem(it, k, rnd) {
      const e = eAt(it.ei), b = builder(rnd); setCtx(e);
      b.mark(it.ei, { fx: "buzzer" }); b.card("final", { score: e.score.slice() }, { cover: true, pr: 4, dur: 6000 });
      const w = e.score[0] > e.score[1] ? 0 : 1, wn = names[w];
      b.say(W.final(pk, rnd, sayX(w, { score: e.score.slice(), win: wn, lose: names[1 - w], ot: sim.ot })), "mark", 1, 3);
      const t = [[], []]; for (let s = 0; s < 2; s++) for (const i of slotsOn(s)) t[s][i] = [47 + (s ? 1 : -1) * (2 + i * 0.9), 20 + i * 2.5];
      ensureHolder(b, w); leg(b, "setup", dead({ targets: t, hf: st.h, side: w, dur: 5000 }));
      finish(b, { cls: "fixed", kind: "end", w: 1 });
    }
    function coinItem(it, k, rnd) { const e = eAt(it.ei), b = builder(rnd); b.mark(it.ei); b.card("coin", { s: e.s, name: names[e.s] }, { cover: true, pr: 3, dur: 3000 }); b.say(W.coin(pk, rnd, sayX(e.s, {})), "mark", 1, 2); leg(b, "hold", dead({ dur: 1500, side: st.O })); finish(b, { cls: "fixed", kind: "coin", w: 1 }); }
    function strayItem(it, k, rnd) { const b = builder(rnd); b.mark(it.ei); leg(b, "hold", dead({ dur: 300, side: st.O })); finish(b, { cls: "fixed", kind: "stray", w: 0.2 }); }

    items.forEach((it, k) => {
      const rnd = mulberry32(seedMix(seed, 1, k));
      switch (it.k) {
        case "start": startItem(it, k, rnd); break;
        case "period": periodItem(it, k, rnd); break;
        case "overtime": overtimeItem(it, k, rnd); break;
        case "qend": qendItem(it, k, rnd); break;
        case "end": endItem(it, k, rnd); break;
        case "coin": coinItem(it, k, rnd); break;
        case "dead": deadItem(it, k, rnd); break;
        case "stray": strayItem(it, k, rnd); break;
        case "play": if (it.type === "shot" || it.type === "shootfoul") shotPlay(it, k, rnd); else if (it.type === "tov") tovPlay(it, k, rnd); else foulPlay(it, k, rnd); break;
        default: break;
      }
      // keep the commentary's idea of the score and clock current after the play
      const lastE = ev[it.eis ? it.eis[it.eis.length - 1] : it.ei]; if (lastE) { gs.q = lastE.q; gs.clk = lastE.clk; gs.score = lastE.score.slice(); }
    });
    return { segs, trk: { dt: DT, n: HS.length, PS: Float32Array.from(PS), BS: Float32Array.from(BS), HS: Int8Array.from(HS), CUT: Uint8Array.from(CUT) }, finalOn: on };
  }

  // which possessions are shown at the key pace
  const playIdx = items.map((it, k) => (it.k === "play" ? k : -1)).filter((k) => k >= 0), nFeat = P.feat >= 1 ? playIdx.length : Math.max(3, Math.round(P.feat * playIdx.length));
  items.forEach((it) => { if (it.k === "play") it.interest = interestOf(it, ev, meta); });
  const featured = new Set(playIdx.slice().sort((a, b) => items[b].interest - items[a].interest || a - b).slice(0, nFeat));

  const G = generate(), segs = G.segs;
  // ---- scales: the quiet scale is solved so the whole film lands exactly on the preset duration ----
  const sums = { fixed: 0, key: 0, quiet: 0 }; segs.forEach((g) => { sums[g.cls] += g.nat * g.w; });
  const solve = () => {
    let fs = P.fs, ks = P.ks, q = 1;
    if (sums.quiet > 0) {
      q = (TARGET - sums.fixed * fs - sums.key * ks) / sums.quiet;
      if (q < P.qmin) { q = P.qmin; const rest = TARGET - sums.quiet * q, base = sums.fixed * fs + sums.key * ks, f = rest / base; fs *= f; ks *= f; }
      else if (q > 1) { q = 1; if (sums.key > 0) ks = (TARGET - sums.fixed * fs - sums.quiet * q) / sums.key; }
    } else if (sums.key > 0) ks = (TARGET - sums.fixed * fs) / sums.key;
    const tot = sums.fixed * fs + sums.key * ks + sums.quiet * q, f = TARGET / tot;   // the last step makes the sum exact
    return { fs: fs * f, ks: ks * f, q: q * f };
  };
  const sc = solve();
  let r = 0, u = 0; const legs = [];
  segs.forEach((g) => {
    g.r0 = r; g.u0 = u; g.real = g.nat * g.w * (g.cls === "fixed" ? sc.fs : g.cls === "key" ? sc.ks : sc.q); if (g.w !== 1) g.real = g.nat * (g.cls === "fixed" ? sc.fs : g.cls === "key" ? sc.ks : sc.q) * g.w;
    g.r1 = r + g.real; g.u1 = u + g.nat; g.l0 = legs.length; g.legs.forEach((L) => legs.push({ ...L, b: undefined, u0: g.u0 + L.t0, u1: g.u0 + L.t1, seg: g.id })); g.l1 = legs.length; r = g.r1; u = g.u1;
  });
  const total = TARGET; if (segs.length) segs[segs.length - 1].r1 = total;
  const rOf = (g, t) => g.r0 + (g.r1 - g.r0) * clamp(t / g.nat, 0, 1);

  // ---- moments (the outcome events at their real times), commentary, clock anchors, cards ----
  const moments = [], lines = [], anchors = [], cards = [];
  segs.forEach((g) => {
    g.marks.forEach((m) => { const e = ev[m.ei], me = meta[m.ei] || {}; moments.push({ ei: m.ei, e: e.e, s: e.s, p: e.p, pn: e.pn, made: e.made, kind: e.kind, off: e.off, score: e.score.slice(), gt: e.gt, q: e.q, clk: e.clk, r: rOf(g, m.t), fx: m.fx || "", heat: me.heat || 0, cheer: cheerOf(e, me, m.fx) }); });
    g.lines.forEach((L) => lines.push({ r: rOf(g, L.t), text: L.text, cls: L.cls, hype: L.hype, kind: L.kind }));
    g.anchors.forEach((a, i) => { if (i === 0 || a.gt !== g.anchors[i - 1].gt || a.clk !== g.anchors[i - 1].clk || a.q !== g.anchors[i - 1].q || i === g.anchors.length - 1) anchors.push({ r: rOf(g, a.t), gt: a.gt, q: a.q, clk: a.clk, seg: g.id, sc0: g.sc0 === "keep" ? undefined : g.sc0, live: g.shotClock }); });
    g.cards.forEach((c) => { const r0 = rOf(g, c.t); cards.push({ type: c.type, data: c.data, r0, r1: c.cover ? Math.max(r0 + c.dur, g.r1) : r0 + c.dur, pr: c.pr }); });
    if (g.flipT != null) g.fl = clamp(g.flipT / g.nat, 0.05, 0.95);
  });
  function cheerOf(e, me, fx) {
    if (e.e === "shot" && e.made) { if (e.clk <= 1.5 || (me.clutch && e.kind === "thr")) return 3; if (fx === "dunk" || e.andOne || me.runCross || me.leadChange && e.q >= 4) return 2; return e.kind === "thr" ? 1 : 0; }
    if (e.e === "shot" && e.blk) return 2; if (e.e === "tov" && e.stl) return me.clutch ? 2 : 1; if (e.e === "end") return 3; return 0;
  }
  moments.sort((a, b) => a.r - b.r || a.ei - b.ei); lines.sort((a, b) => a.r - b.r); cards.sort((a, b) => a.r0 - b.r0); anchors.sort((a, b) => a.r - b.r);
  const trk = G.trk; let hash = trk.n | 0; for (let q = 0; q < trk.PS.length; q += 7) hash = (Math.imul(hash, 31) + Math.round(trk.PS[q] * 10)) | 0;
  return { speed: sp, animated: true, names, preset: P, seed, segs, legs, moments, lines, cards, anchors, trk, hash, num, total, endAnim: total, end: total, finalScore: sim.score.slice(), ot: sim.ot, scales: sc, sums, lineups: teams.map((t) => t.xi.filter(Boolean).map((p) => p.id)), events: ev, featured: [...featured].length };
}

// ---------- frames ----------
const segAt = (M, r) => { const S = M.segs; let lo = 0, hi = S.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (S[mid].r0 <= r) lo = mid; else hi = mid - 1; } return lo; };
const bsearch = (arr, key, v) => { let lo = 0, hi = arr.length - 1, ans = -1; while (lo <= hi) { const mid = (lo + hi) >> 1; if (arr[mid][key] <= v) { ans = mid; lo = mid + 1; } else hi = mid - 1; } return ans; };
export function scoreAt(M, r) { const k = bsearch(M.moments, "r", r); return k < 0 ? [0, 0] : M.moments[k].score; }
export const momentsUntil = (M, r) => M.moments.slice(0, bsearch(M.moments, "r", r) + 1);
export const linesUntil = (M, r) => M.lines.slice(0, bsearch(M.lines, "r", r) + 1);
export const eventsUntil = (M, r) => M.events.slice(0, momentsUntil(M, r).reduce((m, x) => Math.max(m, x.ei + 1), 0));   // the log entries that have happened by real time r
// game clock at real time r: game seconds, period, seconds left in the period, and the shot clock (cosmetic: it counts the game time since the possession began; the engine itself has no 24-second rule)
export function clockAt(M, r) {
  const k = bsearch(M.anchors, "r", r), a = M.anchors[Math.max(0, k)], b = M.anchors[Math.min(M.anchors.length - 1, k + 1)];
  if (!a) return { gt: 0, q: 1, clk: E.QUARTER_SECS, sc: null };
  let gt = a.gt, clk = a.clk; const same = b && b.q === a.q && b.r > a.r;
  if (same && k >= 0) { const f = clamp((r - a.r) / (b.r - a.r), 0, 1); gt = lerp(a.gt, b.gt, f); clk = lerp(a.clk, b.clk, f); }
  const sg = M.segs[segAt(M, r)], sc0 = sg && sg.sc0 !== "keep" ? sg.sc0 : undefined;
  return { gt, q: a.q, clk, sc: sg && sg.shotClock && typeof sg.sc0 === "number" ? clamp(24 - (gt - sg.sc0), 0, 24) : null };
}
export const cardAt = (M, r) => { let best = null; for (const c of M.cards) { if (c.r0 > r) break; if (r < c.r1 && (!best || c.pr > best.pr || (c.pr === best.pr && c.r0 >= best.r0))) best = c; } return best; };
export const heatAt = (M, r) => { const k = bsearch(M.moments, "r", r); return k < 0 ? 0 : M.moments[k].heat; };

// Everything the renderer needs at real time rr (ms since tip-off): the clock, the score, the ball and the ten players. Pure and cheap.
export function frameAt(M, rr) {
  const r = clamp(rr, 0, M.endAnim), si = segAt(M, r), g = M.segs[si], f = g.r1 > g.r0 ? (r - g.r0) / (g.r1 - g.r0) : 1, u = g.u0 + f * (g.u1 - g.u0);
  let li = g.l0; while (li < g.l1 - 1 && M.legs[li].u1 <= u) li++;
  const L = M.legs[li], T = M.trk, kf = u / T.dt, k0 = clamp(Math.floor(kf), 0, T.n - 1), k1 = Math.min(k0 + 1, T.n - 1), al = T.CUT[k1] ? 0 : clamp(kf - k0, 0, 1);
  const bx = lerp(T.BS[k0 * 3], T.BS[k1 * 3], al), by = lerp(T.BS[k0 * 3 + 1], T.BS[k1 * 3 + 1], al), bz = lerp(T.BS[k0 * 3 + 2], T.BS[k1 * 3 + 2], al), code = T.HS[al < 0.5 ? k0 : k1];
  const on = g.fl != null && f >= g.fl ? g.on1 : g.on0, players = [];
  for (let s = 0; s < 2; s++) for (let i = 0; i < 5; i++) {
    const id = on[s][i]; if (!id) { players.push({ s, i, id: null, on: false }); continue; }
    const q = (s * 5 + i) * 2;
    players.push({ s, i, id, num: M.num[id] || 0, on: true, x: lerp(T.PS[k0 * 20 + q], T.PS[k1 * 20 + q], al), y: lerp(T.PS[k0 * 20 + q + 1], T.PS[k1 * 20 + q + 1], al), hold: code === s * 5 + i });
  }
  const ck = clockAt(M, r);
  return { r, seg: g, segIndex: si, gt: ck.gt, q: ck.q, clk: ck.clk, sc: ck.sc, score: scoreAt(M, r), ball: { x: bx, y: by, z: bz }, players, holder: code >= 0 ? { s: Math.floor(code / 5), i: code % 5 } : null, leg: L, f, over: rr >= M.endAnim, half: g.half, heat: heatAt(M, r), card: cardAt(M, r) };
}
