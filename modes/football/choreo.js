// modes/football/choreo.js: the CHOREOGRAPHY layer of the match viewer (pure logic: no DOM, no network, no Math.random).
// Two layers. The OUTCOME layer is engine.simulateMatch (authoritative: score, scorers, minutes). This layer only decorates it: it invents the passes, tackles, dribbles,
// throw-ins, corners, fouls and commentary around every outcome event, with its OWN random stream (seed-derived), and every device that runs it from the same seed gets the same film.
// Time model: the film is a list of segments. Each has a "natural" length (ms of animation) and a class: "key" (the build-up to an outcome event), "fixed" (celebrations, cards, half-time)
// or "quiet" (filler play between events). Real length = natural x a class scale; the quiet scale is solved so the whole match lands on the preset's target duration, so the clock
// slows for goals and chances and rushes through quiet spells. frameAt(M, r) is a pure function of the real time r since kick-off, so late joiners and reconnects need no replay.
import { mulberry32 } from "../../js/sim.js";
import * as E from "./engine.js";
import { W, makePicker, traitOf } from "./words.js";

export const PITCH = { L: 105, W: 68 };
export const INSTANT_MS = 2500;
export const SPEEDS = {
  instant: { id: "instant", label: "Instant", animated: false, note: "final score and the highlights, a few seconds" },
  fast: { id: "fast", label: "Fast", animated: true, targetMs: 240000, minMs: 210000, maxMs: 270000, key: 0.5, fixed: 0.55, quiet: 0.45, pens: 0.55, build0: 1, buildN: 2, say: 0.28, span: 0.5, note: "the whole match at high speed, about 4 minutes" },
  full: { id: "full", label: "Full", animated: true, targetMs: 480000, minMs: 420000, maxMs: 540000, key: 1, fixed: 1, quiet: 1, pens: 1, build0: 2, buildN: 3, say: 0.5, span: 0.5, note: "the whole match at a normal pace, about 8 minutes" }
};
export const SPEED_IDS = ["instant", "fast", "full"];
// Old rooms stored matchStyle "watch" / "quick": watch = Full, quick = Instant. matchSpeed wins when it is set.
export const normSpeed = (v) => (SPEEDS[v] ? v : v === "quick" ? "instant" : "full");
export const speedOfSettings = (st) => normSpeed(st && (st.matchSpeed != null ? st.matchSpeed : st.matchStyle));

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a || 1), 0, 1); return t * t * (3 - 2 * t); };
const dist = (p, q) => Math.hypot((p[0] - q[0]) * PITCH.L, (p[1] - q[1]) * PITCH.W);
const seedMix = (seed, tag, idx) => { let h = Math.imul(((seed >>> 0) ^ 0xc0ffee11) | 0, 0x85ebca6b); h = Math.imul(h ^ Math.imul(tag + 1, 0x9e3779b1), 0xc2b2ae35); h = Math.imul(h ^ Math.imul(idx + 1, 0x27d4eb2f), 0x165667b1); return (h ^ (h >>> 15)) >>> 0; };

// ---------- pitch geometry ----------
// Pitch coordinates: x 0..1 along the length, y 0..1 across. Team 0 defends x = 0 and attacks +x; team 1 is the same picture turned 180 degrees (its "left" is y large).
export const toAbs = (s, d, y) => (s === 0 ? [d, y] : [1 - d, 1 - y]);   // team frame (d = depth from its own goal line, y = its left-right) -> pitch
export const toTeam = (s, x, y) => (s === 0 ? [x, y] : [1 - x, 1 - y]);
const DEPTH = { GK: 0.035, DEF: 0.2, MID: 0.43, FWD: 0.63 };
const latOf = (j, n, line) => { if (n === 1) return 0.5; if (n === 2) return j ? 0.65 : 0.35; const [lo, hi] = n >= 4 || (n === 3 && line === "FWD") ? [0.1, 0.9] : [0.22, 0.78]; return lo + ((hi - lo) * j) / (n - 1); };
export function baseLayout(formation) {   // one entry per slot, in slotsOf order (slot 0 = keeper); LB/LM/LW get the small y (their left)
  const sl = E.slotsOf(formation), cnt = {}, seen = {};
  sl.forEach((s) => { cnt[s.line] = (cnt[s.line] || 0) + 1; });
  return sl.map((s) => { const j = (seen[s.line] = (seen[s.line] === undefined ? -1 : seen[s.line]) + 1); return { i: s.i, line: s.line, code: s.code, d: DEPTH[s.line], y: latOf(j, cnt[s.line], s.line) }; });
}
const K = { GK: 0.04, DEF: 0.55, MID: 0.85, FWD: 0.95 };
// Where slot i of team s should stand when the ball is at `ball` and `poss` has it: the formation shape, pushed up or back with the ball and leaning towards its side. flip = second half (teams have changed ends).
export function restPos(B, s, i, ball, poss, flip) {
  const g = flip ? 1 - s : s, b = B[s][i], [bd, by] = toTeam(g, clamp(ball[0], 0, 1), clamp(ball[1], 0, 1)), k = K[b.line];
  let d = b.d + (bd - 0.5) * 0.42 * k + (poss === s ? 0.06 : -0.04) * k;
  d = b.line === "GK" ? clamp(d, 0.02, 0.09) : clamp(d, 0.07, 0.95);
  return toAbs(g, d, clamp(b.y + (by - b.y) * (b.line === "GK" ? 0.3 : 0.22), 0.03, 0.97));
}

// ---------- text ----------
const pickOf = (rnd, a) => a[Math.floor(rnd() * a.length) % a.length];
// One line per outcome event (used by the Instant highlights and as the baseline wording of the feed). names = the two team names.
export function eventText(e, names) {
  const tn = e.s != null ? names[e.s] : "";
  switch (e.e) {
    case "kick": return [`Kick-off! ${names[0]} v ${names[1]}.`, "mark"];
    case "ht": return [`Half-time: ${names[0]} ${e.score[0]}-${e.score[1]} ${names[1]}`, "mark"];
    case "ft": return [`Full-time: ${names[0]} ${e.score[0]}-${e.score[1]} ${names[1]}`, "mark"];
    case "goal": return [`${e.m}' GOAL! ${e.pn} scores for ${tn}${e.an ? ` (assist ${e.an})` : ""}. ${e.score[0]}-${e.score[1]}`, "goal"];
    case "save": return [`${e.m}' ${e.pn} shoots… saved!`, ""];
    case "miss": return [`${e.m}' ${e.pn} fires wide.`, ""];
    case "chance": return [`${e.m}' ${tn} attack is blocked.`, ""];
    case "sub": return [`${e.m}' ${e.forced ? "Injury change" : "Substitution"} for ${tn}: ${e.on} comes on for ${e.off}.`, "sub"];
    case "yellow": return [`${e.m}' Yellow card for ${e.pn} (${tn}).`, "yellow"];
    case "red": return [`${e.m}' ${e.second ? "Second yellow: " : "Red card! "}${e.pn} (${tn}) is sent off.`, "red"];
    case "injury": return [`${e.m}' ${e.pn} (${tn}) is down injured.`, "sub"];
    case "pen": return [e.res === "goal" ? `Penalty: ${e.pn} (${tn}) scores. ${e.score[0]}-${e.score[1]}` : e.res === "save" ? `Penalty: ${e.pn} (${tn}) is saved! ${e.score[0]}-${e.score[1]}` : `Penalty: ${e.pn} (${tn}) misses. ${e.score[0]}-${e.score[1]}`, e.res === "goal" ? "goal" : ""];
    default: return [`${e.m}'`, ""];
  }
}
// Highlights for the Instant preset: only what matters.
export const highlightsOf = (events, names, pens) => events.filter((e) => ["goal", "yellow", "red", "injury"].includes(e.e) || (e.e === "sub" && e.forced)).map((e) => ({ m: e.m, e: e.e, text: eventText(e, names)[0], cls: eventText(e, names)[1] }))
  .concat(pens ? pens.kicks.map((k) => { const t = eventText({ e: "pen", ...k }, names); return { m: 120, e: "pen", text: t[0], cls: t[1] }; }) : []);

// ---------- the film ----------
// The film is built by a small movement SIMULATION driven by a script of "legs" (carry, pass, tackle, fetch, setup...). Players have speed limits and acceleration, run to where a pass is going before the ball arrives,
// chase the carrier before a tackle, jog back to their kickoff spots after a goal; the ball sits at the carrier's feet or flies towards the receiver. The simulation is sampled every DT ms of "natural" time into arrays,
// so frameAt() stays a pure lookup (late joiners need no replay) and every device that runs it from the same seed gets the same film. All randomness comes from the choreography's own seeded streams.
const NAT = { penIntro: 3200, pen: 5200, penEnd: 5200 };
const DT = 100;
const SPD = 1.35;   // the film runs at broadcast tempo: physics runs 1.35x faster than real life (speeds, passes, durations), so a build-up takes ~12 s instead of ~17
const legDur = (kind, d) => (kind === "pass" ? 420 + d * 32 : kind === "cross" ? 550 + d * 30 : kind === "shot" ? 480 + d * 20 : kind === "out" ? 500 + d * 34 : 500);
const FLIGHT = { pass: 1, cross: 1, shot: 1, out: 1 };
const phaseOf = (id) => { let x = 11; for (const c of String(id)) x = (Math.imul(x, 33) + c.charCodeAt(0)) | 0; return (Math.abs(x) % 628) / 100; };
const dM = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

// teams: [{name, formation, xi:[entities in slot order], bench:[entities]}] as given to simulateMatch. sim: its result. pens: engine.shootout result or null. speed: "instant" | "fast" | "full".
export function buildMatch({ teams, sim, seed, speed, pens }) {
  const sp = normSpeed(speed), P = SPEEDS[sp], names = teams.map((t) => t.name);
  const ev = sim.events;
  if (!P.animated) return { speed: sp, animated: false, names, finalScore: sim.score.slice(), highlights: highlightsOf(ev, names, pens), total: 0, end: INSTANT_MS, segs: [], legs: [], moments: [], lines: [], kickoffs: [], pens: pens || null };
  const ents = new Map(); teams.forEach((t) => t.xi.concat(t.bench).forEach((p) => p && ents.set(p.id, p)));
  const nameOfId = (id) => (ents.get(id) ? E.surname(ents.get(id)) : "");
  const B = teams.map((t) => baseLayout(t.formation));
  const num = {}; teams.forEach((t) => { t.xi.forEach((p, i) => { if (p) num[p.id] = i + 1; }); t.bench.forEach((p, j) => { if (p) num[p.id] = 12 + j; }); });

  function generate(fillNat, record) {
    let on = teams.map((t) => t.xi.map((p) => (p ? p.id : null))), half = 0;
    const st = { poss: 0, hs: -1, set: null }, segs = [];
    // geometry: in the second half the teams have changed ends, so team s attacks the way team 1-s did in the first
    const G = (s) => (half ? 1 - s : s), A = (s, d, y) => toAbs(G(s), d, y);
    const slotOf = (s, id) => on[s].indexOf(id), nm = (s, i) => (on[s][i] ? nameOfId(on[s][i]) : "");
    const outfield = (s) => on[s].map((id, i) => (id && i > 0 ? i : -1)).filter((i) => i >= 0);
    const onLine = (s, line) => outfield(s).filter((i) => B[s][i].line === line);
    const cloneOn = () => on.map((a) => a.slice());
    const nearestSlot = (x, pt) => { let bi = -1, bd = 1e9; for (const i of outfield(x)) { const d = dist(posP(x, i), pt); if (d < bd) { bd = d; bi = i; } } return bi >= 0 ? bi : outfield(x)[0] || 1; };
    const holderRef = () => (st.hs >= 0 && on[st.poss][st.hs] ? { s: st.poss, i: st.hs } : null);
    // ---- commentary context: the clock, the score, shots and possession so far, who is speaking about whom ----
    const pk = makePicker(), gs = { m: 0, score: [0, 0], shots: [0, 0] }, posMs = [0, 0];
    const who = (s, i) => nm(s, i) || "the player", traitAt = (s, i) => traitOf(ents.get(on[s][i]));
    const poss = () => { const t = posMs[0] + posMs[1]; return t ? [(posMs[0] / t) * 100, (posMs[1] / t) * 100] : [50, 50]; };
    const X = (s, extra = {}) => ({ team: names[s], opp: names[1 - s], nameA: names[0], nameB: names[1], m: Math.floor(gs.m), score: gs.score, diff: gs.score[s] - gs.score[1 - s], shots: gs.shots, poss: poss(), ...extra });
    const H = (n) => Math.min(3, n + (gs.m >= 80 && Math.abs(gs.score[0] - gs.score[1]) <= 1 ? 1 : 0));   // the commentator gets more worked up late in a tight game
    const scorersTo = (ei) => [...new Set(ev.slice(0, ei).filter((q) => q.e === "goal").map((q) => q.pn))];

    // ---------- movement simulation (metres; x along the length 0..105, y across 0..68) ----------
    const pl = [0, 1].map((s) => B[s].map(() => ({ x: 52, y: 34, vx: 0, vy: 0, fx: 1, fy: 0 }))), ball = { x: 52.5, y: 34, z: 0 }, PS = [], BS = [], HS = [], CUT = [];
    let simU = 0;
    // Every player moves like himself: top speed and acceleration from pace/physique, how far he pushes up (attack vs defend stats), his own depth and width offset, how closely he roams,
    // how late he reacts to the ball, how hard he presses, how tightly he marks, how often he makes forward runs. All derived from his stats and id, so the same player behaves the same way every match.
    const hn = (id, k) => { let x = k * 7919 + 17; for (const c of String(id)) x = (Math.imul(x, 31) + c.charCodeAt(0)) | 0; return (Math.abs(x) % 1000) / 1000; };
    const traitCache = new Map();
    const trOf = (s, i) => {
      const id = on[s][i] || "x" + s + i; let t = traitCache.get(id + ":" + i); if (t) return t;
      const e = ents.get(id) || {}, line = B[s][i].line, gk = line === "GK", pac = gk ? e.spd || 60 : e.pac || 60, sho = e.sho || 50, pas = e.pas || 55, dri = e.dri || 55, def = e.def || 55, phy = e.phy || 55, h = (k) => hn(id, k);
      t = {
        vmax: Math.min(8.6, 5.4 + (pac / 100) * 3.2 + (h(1) - 0.5) * 0.5), acc: 5.5 + (pac / 100) * 4 + (phy / 100) * 1.5,
        adv: gk ? 0 : clamp((sho + dri - 2 * def) / 500, -0.07, 0.07) + (h(2) - 0.5) * 0.03, persD: (gk ? 0.2 : 1) * (h(3) - 0.5) * 0.04, persY: (gk ? 0.2 : 1) * (h(4) - 0.5) * 0.09,
        rove: gk ? 0.3 : 0.6 + ((dri + pas) / 200) * 1.8 * (line === "DEF" ? 0.7 : 1) + h(5) * 0.9, lag: 2 + Math.floor(h(6) * 8), prs: 0.25 + (def / 100) * 0.4 + h(7) * 0.15, prsR: 16 + h(8) * 14, sup: 0.5 + h(11) * 1.0,
        kScale: 0.82 + h(9) * 0.36, per: 1100 + h(10) * 1700, ph: phaseOf(id), carry: 4.4 + (dri / 100) * 2, shield: 2 + (dri / 100) * 1.6, jog: 4.2 + h(12) * 2.0, mark: 0.08 + (def / 100) * 0.2 + h(13) * 0.06,
        runner: (line === "FWD" ? 1 : line === "MID" ? 0.6 : line === "DEF" ? 0.18 : 0) * clamp((pac + sho + dri) / 240, 0.4, 1.1)
      };
      traitCache.set(id + ":" + i, t); return t;
    };
    const vmaxOf = (s, i) => trOf(s, i).vmax;
    const posP = (s, i) => [pl[s][i].x / 105, pl[s][i].y / 68], ballP = () => [ball.x / 105, ball.y / 68];
    const feet = (r) => { const p = pl[r.s][r.i]; return [p.x + p.fx * 0.8, p.y + p.fy * 0.8]; };
    const pushSample = (code) => { if (!record) return; for (let s = 0; s < 2; s++) for (let i = 0; i < 11; i++) PS.push(pl[s][i].x, pl[s][i].y); BS.push(ball.x, ball.y, ball.z); HS.push(code); CUT.push(0); };
    const kickoffTaker = (s) => { const fw = onLine(s, "FWD"); return fw.length ? fw[0] : outfield(s)[0] || 0; };
    const kickoffPos = (ks) => {   // own half only, the kicker on the centre spot
      const kt = kickoffTaker(ks), out = [[], []];
      for (const s of [0, 1]) B[s].forEach((b, i) => { let d = b.line === "GK" ? b.d : Math.min(0.46, b.d * 0.86), y = b.y; if (s === ks && i === kt) { d = 0.494; y = 0.5; } const p = A(s, d, y); out[s][i] = [p[0] * 105, p[1] * 68]; });
      return out;
    };
    function cut(ks) {   // instant reset (start, half-time): positions, ends and ball. Marked so the renderer does not glide across it.
      const kp = kickoffPos(ks);
      for (const s of [0, 1]) B[s].forEach((b, i) => { const p = pl[s][i]; p.x = kp[s][i][0]; p.y = kp[s][i][1]; p.vx = p.vy = 0; p.fx = G(s) === 0 ? 1 : -1; p.fy = 0; });
      ball.x = 52.5; ball.y = 34; ball.z = 0;
      if (!record) return;
      if (!HS.length) { pushSample(-1); return; }
      const j = HS.length - 1; let q = j * 44; for (let s = 0; s < 2; s++) for (let i = 0; i < 11; i++) { PS[q++] = pl[s][i].x; PS[q++] = pl[s][i].y; }
      BS[j * 3] = ball.x; BS[j * 3 + 1] = ball.y; BS[j * 3 + 2] = 0; HS[j] = -1; CUT[j] = 1;
    }
    const ballHist = [];   // the last ~1.4 s of ball positions: each player reacts to where the ball WAS a personal moment ago, so a line never moves as one block
    const wander = (s, i, k) => { const t = trOf(s, i); return (Math.sin(simU / t.per + t.ph + k) * 0.5 + Math.sin(simU / (t.per * 0.43) + k * 2 + t.ph * 2) * 0.5) * t.rove; };
    function shapeTarget(s, i, poss) {   // his own version of the formation: pushed up or back with the (delayed) ball, his own depth, width and compactness, pressing or supporting in his own way
      const t = trOf(s, i), bl = ballHist.length ? ballHist[Math.max(0, ballHist.length - 1 - t.lag)] : [ball.x, ball.y], g = half ? 1 - s : s, b = B[s][i];
      const rp = restPos(B, s, i, [bl[0] / 105, bl[1] / 68], poss, half === 1), tm = toTeam(g, rp[0], rp[1]);
      const d = clamp(b.d + (tm[0] - b.d) * t.kScale + t.persD + t.adv * (poss === s ? 1 : 0.4), 0.03, 0.95), yy = clamp(tm[1] + t.persY, 0.04, 0.96), ab = toAbs(g, d, yy);
      let tx = ab[0] * 105, ty = ab[1] * 68;
      if (i > 0) { const dd = dM(tx, ty, bl[0], bl[1]), w = (poss === s ? 0.2 * t.sup * Math.pow(clamp(1 - dd / 18, 0, 1), 2) : t.prs * Math.pow(clamp(1 - dd / t.prsR, 0, 1), 2)); tx = mix(tx, bl[0], w); ty = mix(ty, bl[1], w); }
      return [tx + wander(s, i, 0), ty + wander(s, i, 2)];
    }
    function target(s, i, L) {
      const vm = vmaxOf(s, i);
      for (const p of L.pulls) if (p.s === s && p.i === i) return [p.tx, p.ty, p.v || vm];
      const isH = L.hf && L.hf.s === s && L.hf.i === i, isR = L.rc && L.rc.s === s && L.rc.i === i;
      if (L.kind === "carry" && isH) return [L.tx, L.ty, Math.min(vm, trOf(s, i).carry)];
      if (FLIGHT[L.kind] && isR) return [L.tx, L.ty, vm];
      if (L.kind === "fetch" && isR) return [L.src.x, L.src.y, vm];
      if (L.kind === "tackle") { if (isR) { const q = feet(L.hf); return [q[0], q[1], vm]; } if (isH) { const dir = G(L.hf.s) === 0 ? 1 : -1; return [pl[s][i].x + dir * 6, pl[s][i].y, trOf(s, i).shield]; } }
      if (L.kind === "setup") return [L.kp[s][i][0], L.kp[s][i][1], Math.min(vm, trOf(s, i).jog)];
      const t = shapeTarget(s, i, L.side), mk = L.mark && L.mark[s + ":" + i];
      if (mk && i > 0) { const a = pl[mk.s][mk.i], dir = G(s) === 0 ? -1 : 1, w = trOf(s, i).mark, d = dM(t[0], t[1], a.x, a.y); if (d < 30) { return [mix(t[0], a.x + dir * 2.5, w), mix(t[1], a.y, w), Math.min(vm, 6.4)]; } }   // goal-side of the man he is picking up
      return [t[0], t[1], Math.min(vm, 6.4)];
    }
    function move(p, tx, ty, vcap, dt, acc) {
      const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), sp2 = Math.min(vcap, d / 0.45), dvx = d > 0.01 ? (dx / d) * sp2 : 0, dvy = d > 0.01 ? (dy / d) * sp2 : 0;
      let ax = dvx - p.vx, ay = dvy - p.vy; const am = Math.hypot(ax, ay), mx = (acc || 8) * dt; if (am > mx) { ax *= mx / am; ay *= mx / am; }
      p.vx += ax; p.vy += ay; p.x = clamp(p.x + p.vx * dt, -3, 108); p.y = clamp(p.y + p.vy * dt, -3, 71);
      const v = Math.hypot(p.vx, p.vy); if (v > 0.5) { p.fx = p.vx / v; p.fy = p.vy / v; }
    }
    function stepSim(L, k, n) {
      const f = (k + 1) / n, t = f * L.dur; simU += DT;
      for (const s of [0, 1]) for (let i = 0; i < 11; i++) { const tg = target(s, i, L); move(pl[s][i], tg[0], tg[1], tg[2], (DT / 1000) * SPD, trOf(s, i).acc); }
      let code = -1; const h = L.hf, r = L.rc;
      switch (L.kind) {
        case "carry": if (h) { const q = feet(h); ball.x = q[0]; ball.y = q[1]; code = h.s * 11 + h.i; } ball.z = 0; break;
        case "hold": { const o = h || L.ht; if (o) { const q = feet(o); ball.x = q[0]; ball.y = q[1]; code = o.s * 11 + o.i; } ball.z = 0; break; }
        case "pass": case "cross": case "shot": case "out": {
          if (t <= L.wind) { if (h) { const q = feet(h); ball.x = q[0]; ball.y = q[1]; code = h.s * 11 + h.i; } ball.z = 0; }
          else { const bf = clamp((t - L.wind) / (L.dur - L.wind), 0, 1), e = bf * (2 - bf), dst = r ? feet(r) : [L.tx, L.ty]; ball.x = mix(L.src.x, dst[0], e); ball.y = mix(L.src.y, dst[1], e); ball.z = L.z * Math.sin(Math.PI * bf); if (bf > 0.92 && r) code = r.s * 11 + r.i; }
          break;
        }
        case "fetch": { const q = r ? feet(r) : null; if (r && (L.got || dM(q[0], q[1], L.src.x, L.src.y) < 1.6)) { L.got = true; ball.x = q[0]; ball.y = q[1]; code = r.s * 11 + r.i; } else { ball.x = L.src.x; ball.y = L.src.y; } ball.z = 0; break; }   // the ball waits until the player has actually reached it
        case "tackle": {
          const a = feet(h), c = feet(r);
          if (L.gap == null && f >= 0.75) L.gap = dM(a[0], a[1], c[0], c[1]);
          const w = L.keep ? 0 : smooth(f, 0.75, 1); ball.x = mix(a[0], c[0], w); ball.y = mix(a[1], c[1], w); ball.z = 0; code = f < 0.75 || L.keep ? h.s * 11 + h.i : r.s * 11 + r.i; break;
        }
        case "setup": ball.x = 52.5; ball.y = 34; ball.z = 0; break;
        default: break;
      }
      ballHist.push([ball.x, ball.y]); if (ballHist.length > 14) ballHist.shift();
      pushSample(code);
    }

    // a builder collects the legs and commentary of one segment; leg() runs the simulation for it
    function builder(rnd) {
      const legs = [], lines = [], kicks = []; let t = 0, mark = -1;
      const b = {
        legs, lines, kicks, rnd,
        get t() { return t; }, get mark() { return mark; },
        leg(kind, to, o = {}) {
          const hf = o.hf !== undefined ? o.hf : holderRef(), ht = o.ht !== undefined ? o.ht : null;
          const L = { kind, z: o.z || 0, side: o.side != null ? o.side : st.poss, hf, ht, rc: o.rc || ht, keep: !!o.keep, tx: to[0] * 105, ty: to[1] * 68, wind: 0, src: { x: ball.x, y: ball.y }, gap: null };
          L.pulls = (o.pulls || []).concat(st.set || []).map((p) => ({ s: p.s, i: p.i, tx: p.to[0] * 105, ty: p.to[1] * 68, v: p.v }));
          if (kind !== "setup") {   // who picks up whom (greedy by distance), and who makes a forward run off the ball
            const att = L.side, def = 1 - att, pairs = [], used = new Set(), tk = new Set(); L.mark = {};
            for (const i of outfield(def)) for (const j of outfield(att)) pairs.push([dM(pl[def][i].x, pl[def][i].y, pl[att][j].x, pl[att][j].y), i, j]);
            pairs.sort((x, y) => x[0] - y[0]); for (const [, i, j] of pairs) { if (tk.has(i) || used.has(j)) continue; tk.add(i); used.add(j); L.mark[def + ":" + i] = { s: att, i: j }; }
            if (kind === "carry" || kind === "pass" || kind === "cross") {
              const cand = outfield(att).filter((i) => !(hf && hf.s === att && hf.i === i) && !(L.rc && L.rc.s === att && L.rc.i === i) && !(o.pulls || []).some((p) => p.s === att && p.i === i) && !(st.set || []).some((p) => p.s === att && p.i === i)), n0 = cand.length ? Math.floor(rnd() * cand.length) : 0; let runs = 0;
              for (let q = 0; q < cand.length && runs < 3; q++) {
                const i = cand[(n0 + q) % cand.length], t = trOf(att, i);
                if (rnd() < 0.08 + 0.42 * t.runner) { const g = G(att), tm = toTeam(g, pl[att][i].x / 105, pl[att][i].y / 68), ab = toAbs(g, clamp(tm[0] + 0.1 + rnd() * 0.12, 0.2, 0.92), clamp(tm[1] + (rnd() - 0.5) * 0.35, 0.06, 0.94)); L.pulls.push({ s: att, i, tx: ab[0] * 105, ty: ab[1] * 68, v: t.vmax * 0.92 }); runs++; }
              }
            }
          }
          if (kind === "setup") { L.kp = kickoffPos(o.kick); ball.x = 52.5; ball.y = 34; ball.z = 0; L.src = { x: 52.5, y: 34 }; }
          if (FLIGHT[kind]) { L.w0 = o.wind != null ? o.wind : kind === "out" ? 0 : kind === "shot" ? 250 : 350; L.wind = L.w0 / SPD; }
          let dur = o.dur;
          if (dur == null) {
            if (FLIGHT[kind]) { const d = dM(ball.x, ball.y, L.tx, L.ty), r = L.rc, rt = r ? (dM(pl[r.s][r.i].x, pl[r.s][r.i].y, L.tx, L.ty) / (vmaxOf(r.s, r.i) * 0.9)) * 1000 : 0; dur = Math.max(legDur(kind, d) + L.w0, rt + L.w0 + 150) / SPD; }
            else if (kind === "carry") dur = Math.max(500, (dM(pl[hf.s][hf.i].x, pl[hf.s][hf.i].y, L.tx, L.ty) / 5.2) * 1000 / SPD);
            else if (kind === "fetch") { const r = L.rc; dur = Math.max(500, (dM(pl[r.s][r.i].x, pl[r.s][r.i].y, L.src.x, L.src.y) / (vmaxOf(r.s, r.i) * 0.7)) * 1000 / SPD + 600); }
            else if (kind === "tackle") { const r = L.rc, q = feet(hf); dur = clamp(((dM(pl[r.s][r.i].x, pl[r.s][r.i].y, q[0], q[1]) / Math.max(2, vmaxOf(r.s, r.i) - 2.8)) * 1000) / SPD + 300, 700, 3500); }
            else if (kind === "setup") { let mx = 0; for (const s of [0, 1]) for (let i = 0; i < 11; i++) mx = Math.max(mx, dM(pl[s][i].x, pl[s][i].y, L.kp[s][i][0], L.kp[s][i][1]) / Math.min(vmaxOf(s, i), trOf(s, i).jog)); dur = Math.max(2200, (mx * 1000) / SPD + 600); }
            else dur = 600;
          }
          dur = Math.max(DT, Math.ceil(dur / DT) * DT); L.dur = dur;
          const n = dur / DT; for (let k = 0; k < n; k++) stepSim(L, k, n);
          legs.push({ t0: t, t1: t + dur, kind, z: L.z, side: L.side, hf, ht: kind === "tackle" && !L.keep ? L.rc : ht, from: [L.src.x / 105, L.src.y / 68], to: [ball.x / 105, ball.y / 68], gap: L.gap, pulls: [] });
          t += dur; posMs[L.side] += dur;
          if (kind === "tackle") { if (!L.keep) { st.poss = L.rc.s; st.hs = L.rc.i; } }
          else if (o.ht !== undefined) { if (o.ht) { st.poss = o.ht.s; st.hs = o.ht.i; } else st.hs = -1; }
          return b;
        },
        say(text, cls, prob, hype) { if (prob === undefined || rnd() < prob) lines.push({ t, text, cls: cls || "", hype: hype || 0 }); return b; },
        markNow() { mark = t; return b; }
      };
      return b;
    }

    // ---------- script helpers ----------
    const chooseRcv = (rnd, s, want, excl) => {
      let best = -1, bs = 1e9;
      for (const i of outfield(s)) { if (excl.includes(i) || i === st.hs) continue; const sc = dist(posP(s, i), want) + rnd() * 9; if (sc < bs) { bs = sc; best = i; } }
      return best >= 0 ? best : (outfield(s).find((i) => i !== st.hs) ?? 0);
    };
    const jit = (rnd, p, a) => [clamp(p[0] + (rnd() - 0.5) * a, 0.02, 0.98), clamp(p[1] + (rnd() - 0.5) * a * 1.4, 0.03, 0.97)];
    function passTo(b, idx, want, o = {}) {   // the receiver starts running into space (towards `want`) while the passer plants his foot; the ball follows the receiver
      const s = st.poss, r = idx >= 0 && on[s][idx] && idx !== st.hs ? idx : chooseRcv(b.rnd, s, want, o.excl || []), rp = posP(s, r), d0 = dist(rp, want), f = d0 > 0 ? Math.min(0.7, 18 / d0) : 0;
      const to = [clamp(rp[0] + (want[0] - rp[0]) * f, 0.02, 0.98), clamp(rp[1] + (want[1] - rp[1]) * f, 0.03, 0.97)], d = dist(ballP(), to);
      if (o.say && st.hs >= 0) {   // describe the pass the way a commentator would: wide, long, back, forward
        const t0 = toTeam(G(s), ballP()[0], ballP()[1]), t1 = toTeam(G(s), to[0], to[1]), kind = o.how || (t1[0] - t0[0] < -0.06 ? "back" : Math.abs(t1[1] - t0[1]) > 0.3 ? "wide" : d > 28 ? "long" : t1[0] - t0[0] > 0.12 ? "forward" : "short");
        b.say(W.pass(pk, b.rnd, X(s, { a: who(s, st.hs), b: who(s, r), kind, side: t1[1] < 0.5 ? "left" : "right" })), "", o.say, 0);
      }
      b.leg(o.kind || "pass", to, { ht: { s, i: r }, z: o.z != null ? o.z : d > 30 ? 0.55 : d > 17 ? 0.25 : 0 });
      return r;
    }
    function carry(b, want, how) { if (st.hs < 0) return; if (how) b.say(W[how === "dribble" ? "dribble" : how === "solo" ? "solo" : "carry"](pk, b.rnd, X(st.poss, { a: who(st.poss, st.hs), trait: traitAt(st.poss, st.hs) })), "", 1, how === "solo" ? 1 : 0); b.leg("carry", want, { ht: { s: st.poss, i: st.hs } }); }
    function winBall(b, s, why) {   // the nearest player of team s runs at the ball and takes it
      if (st.poss === s && st.hs >= 0) return;
      const bp = ballP(); let best = -1, bs = 1e9; for (const i of outfield(s)) { const d = dist(posP(s, i), bp); if (d < bs) { bs = d; best = i; } }
      if (best < 0) best = 0;
      b.say(W[why === "int" ? "intercept" : "tackle"](pk, b.rnd, X(s, { a: who(s, best) })), "", 1, 0);
      if (st.hs >= 0) b.leg("tackle", bp, { rc: { s, i: best } }); else b.leg("fetch", bp, { hf: null, ht: { s, i: best } });
    }
    function distribute(b, s) {   // the keeper gets the ball (he already has it after a save), walks it to his box and kicks long
      if (!(st.poss === s && st.hs === 0)) b.leg("fetch", ballP(), { hf: null, ht: { s, i: 0 } });
      const spot = A(s, 0.055, 0.5); if (dist(posP(s, 0), spot) > 4) b.leg("carry", spot, { hf: { s, i: 0 }, ht: { s, i: 0 } });
      b.leg("hold", ballP(), { dur: 600, hf: { s, i: 0 }, ht: { s, i: 0 } });
      b.say(W.gk(pk, b.rnd, X(s, { a: nm(s, 0) || "The keeper" })), "", 0.7, 0);
      const mids = onLine(s, "MID").concat(onLine(s, "DEF")); passTo(b, mids.length ? mids[Math.floor(b.rnd() * mids.length)] : -1, A(s, 0.44, 0.2 + b.rnd() * 0.6), { z: 0.6 });
    }
    function boxPulls(s, ex) {   // corner: attackers into the box (not the taker), defenders pick them up
      const o = 1 - s, out = [], att = onLine(s, "FWD").concat(onLine(s, "MID").slice(0, 3)).filter((i) => i !== ex).slice(0, 4), ys = [0.38, 0.5, 0.62, 0.45], dfs = onLine(o, "DEF").slice(0, 4);
      att.forEach((i, k) => out.push({ s, i, to: A(s, 0.92, ys[k]), v: 6.2 })); dfs.forEach((i, k) => out.push({ s: o, i, to: A(o, 0.07, ys[k] + 0.03), v: 6.2 }));
      return out;
    }
    function kickoffPlay(b, ks, setup, kind) {   // players in their own halves, whistle, a short pass from the centre spot
      if (setup) { st.hs = -1; b.leg("setup", [0.5, 0.5], { hf: null, ht: null, kick: ks }); }
      const kt = kickoffTaker(ks); st.poss = ks; st.hs = kt; b.kicks.push({ t: b.t, side: ks, half, kind });
      b.leg("hold", [0.5, 0.5], { dur: 1100, hf: { s: ks, i: kt }, ht: { s: ks, i: kt } });
      passTo(b, -1, A(ks, 0.4, clamp(0.5 + (b.rnd() - 0.5) * 0.5, 0.25, 0.75)), { excl: [] });
    }

    // ---- key play: the build-up to a goal, save, miss or block, ending in exactly the outcome event ----
    function keyPlay(e, rnd) {
      const b = builder(rnd), s = e.s, o = 1 - s, wide = rnd() < 0.5 ? 0.1 : 0.9, sh = slotOf(s, e.p), as = e.a ? slotOf(s, e.a) : -1, tn = names[s];
      winBall(b, s, "tackle");
      const nb = P.build0 + Math.floor(rnd() * P.buildN);
      for (let k = 0; k < nb; k++) {
        const want = A(s, mix(0.38, 0.66, (k + 1) / nb), clamp(0.5 + (rnd() - 0.5) * 0.8, 0.1, 0.9));
        if (rnd() < 0.25 && st.hs > 0 && st.hs !== sh && st.hs !== as) carry(b, want, rnd() < 0.5 ? "carry" : null);
        else passTo(b, -1, want, { excl: [sh, as], say: P.say });
      }
      if (e.e === "chance") {   // an attack that dies: a defender runs across and blocks
        passTo(b, -1, A(s, 0.8, 0.3 + rnd() * 0.4), { excl: [] });
        const defs = onLine(o, "DEF"); let di = defs.length ? defs[0] : 1, bd = 1e9; defs.forEach((i) => { const d = dist(posP(o, i), ballP()); if (d < bd) { bd = d; di = i; } });
        b.say(W.block(pk, rnd, X(s, { a: who(o, di) })), "", 1, H(1));
        b.leg("tackle", ballP(), { rc: { s: o, i: di } }).markNow();
        const mids = onLine(o, "MID"); passTo(b, mids.length ? mids[Math.floor(rnd() * mids.length)] : -1, A(o, 0.5, 0.2 + rnd() * 0.6), { z: 0.5 });
        return b;
      }
      const shootName = nm(s, sh) || e.pn; let fl = "shot";
      if (as >= 0 && as !== st.hs) {
        if (rnd() < 0.4) {   // down the wing, cross, header or volley
          passTo(b, as, A(s, 0.84, wide)); b.say(W.wing(pk, rnd, X(s, { a: who(s, as), side: wide < 0.5 ? "left" : "right" })), "", 0.8, 0);
          b.say(W.cross(pk, rnd, X(s, { a: who(s, as), b: who(s, sh) })), "", 1, H(1)); fl = "header"; passTo(b, sh, A(s, 0.9, clamp(0.5 + (rnd() - 0.5) * 0.14, 0.4, 0.6)), { kind: "cross", z: 0.9 });
        } else { passTo(b, as, A(s, 0.68, clamp(0.5 + (rnd() - 0.5) * 0.6, 0.15, 0.85))); b.say(W.breakthrough(pk, rnd, X(s, { a: who(s, as), b: who(s, sh) })), "", 0.9, H(1)); fl = "through"; passTo(b, sh, A(s, 0.84, clamp(0.5 + (rnd() - 0.5) * 0.3, 0.3, 0.7)), { z: 0 }); }
      } else {
        if (st.hs !== sh) passTo(b, sh, A(s, 0.62, clamp(0.5 + (rnd() - 0.5) * 0.5, 0.2, 0.8)));
        carry(b, A(s, 0.82 + rnd() * 0.06, clamp(0.5 + (rnd() - 0.5) * 0.3, 0.3, 0.7)), "solo"); fl = e.a ? "shot" : "solo";
      }
      b.say(W.shot(pk, rnd, X(s, { a: shootName })), "", 1, H(1));
      const lineX = G(s) === 0 ? 1 : 0, deep = G(s) === 0 ? 0.006 : -0.006, side = rnd() < 0.5 ? -1 : 1, yT = 0.5 + side * (0.015 + rnd() * 0.03), kx = G(s) === 0 ? 0.985 : 0.015;
      if (e.e === "goal") {
        b.leg("shot", [lineX + deep, yT], { ht: null, z: 0.3, pulls: [{ s: o, i: 0, to: [kx, 0.5 - side * 0.07], v: 7 }] }).markNow();
        b.say(W.goal(pk, rnd, X(s, { a: shootName, b: as >= 0 ? nm(s, as) : e.an || "", flavour: fl, diffBefore: gs.score[s] - gs.score[1 - s], first: gs.score[0] + gs.score[1] === 0, score: e.score, m: e.m })), "goal", 1, 3);
      } else if (e.e === "save") {
        b.leg("shot", [kx, yT], { ht: { s: o, i: 0 }, z: 0.2, pulls: [{ s: o, i: 0, to: [kx, yT], v: 7.5 }] }).markNow();
        b.say(W.save(pk, rnd, X(s, { a: shootName, gk: nm(o, 0) || "the keeper" })), "save", 1, H(2));
        if (rnd() < 0.4) {   // parried behind: corner
          const flag = [lineX, rnd() < 0.5 ? 0.02 : 0.98];
          b.leg("out", flag, { hf: { s: o, i: 0 }, ht: null, z: 0.2 }); b.say(W.corner(pk, rnd, X(s, { a: who(s, nearestSlot(s, flag)) })), "", 0.9, 1);
          let tk = 1, tkd = 1e9; outfield(s).forEach((i) => { const d = dist(posP(s, i), flag); if (d < tkd) { tkd = d; tk = i; } }); st.set = boxPulls(s, tk);
          b.leg("fetch", flag, { hf: null, ht: { s, i: tk } }); b.leg("hold", flag, { dur: 700, hf: { s, i: tk }, ht: { s, i: tk } });
          const fw = onLine(s, "FWD"), ai = fw.length ? fw[Math.floor(rnd() * fw.length)] : 1;
          passTo(b, ai, A(s, 0.93, 0.4 + rnd() * 0.2), { kind: "cross", z: 0.9 });
          const defs = onLine(o, "DEF"), di = defs.length ? defs[Math.floor(rnd() * defs.length)] : 1; b.say(W.cornerClear(pk, rnd, X(s, { a: who(o, di) })), "", 0.8, 1);
          b.leg("pass", A(o, 0.4, 0.2 + rnd() * 0.6), { ht: { s: o, i: di }, z: 0.8 }); st.set = null;
        } else { b.say(W.heldSafely(pk, rnd, X(s, { a: nm(o, 0) || "The keeper" })), "", 0.4, 0); distribute(b, o); }
      } else {
        const hi = rnd() < 0.4;
        b.leg("shot", [lineX + deep * 6, hi ? 0.5 + side * 0.03 : clamp(0.5 + side * (0.1 + rnd() * 0.06), 0.1, 0.9)], { ht: null, z: hi ? 0.95 : 0.2 }).markNow();
        b.say(W.miss(pk, rnd, X(s, { a: shootName, high: hi })), "miss", 1, H(1));
        distribute(b, o);
      }
      return b;
    }
    function celebrate(e, rnd) {   // run to the corner, team-mates join, then everybody jogs back and the other side kicks off
      const b = builder(rnd), s = e.s, o = 1 - s, sc = slotOf(s, e.p), flag = [G(s) === 0 ? 0.96 : 0.04, rnd() < 0.5 ? 0.06 : 0.94], pulls = [];
      if (sc >= 0) pulls.push({ s, i: sc, to: flag, v: 7.5 });
      outfield(s).filter((i) => i !== sc).sort((x, y) => dist(posP(s, x), flag) - dist(posP(s, y), flag)).slice(0, 3).forEach((i, k) => pulls.push({ s, i, to: [clamp(flag[0] + (G(s) === 0 ? -1 : 1) * 0.03 * (k + 1), 0.02, 0.98), clamp(flag[1] + (flag[1] < 0.5 ? 1 : -1) * 0.03 * (k + 1), 0.03, 0.97)], v: 7 }));
      st.hs = -1; b.leg("hold", ballP(), { hf: null, ht: null, dur: 3400, pulls }); const cel = b.t;
      kickoffPlay(b, o, true, "goal");
      return { b, ff: cel };
    }

    // ---- quiet play between events ----
    function filler(rnd) {
      const b = builder(rnd), fastP = sp === "fast";
      const roll = rnd(); let kind = roll < 0.5 ? "pass" : roll < 0.64 ? "counter" : roll < 0.8 ? "throw" : roll < 0.92 ? "foul" : "corner";
      if (st.hs < 0) kind = "pass";
      if (rnd() < 0.27) {   // the co-commentator chips in: possession, shots, the state of the game, a word about a player
        const q = rnd(), s0 = st.poss, hs0 = st.hs >= 0 ? st.hs : nearestSlot(s0, ballP()), tt = traitAt(s0, hs0);
        const line = q < 0.28 ? W.possession(pk, rnd, X(s0)) : q < 0.5 ? W.shots(pk, rnd, X(s0)) : q < 0.78 || !tt ? W.state(pk, rnd, X(s0)) : W.trait(pk, rnd, X(s0, { a: who(s0, hs0), t: tt }));
        b.say(line, "", 1, 0);
      }
      const nearest = (x, pt, pred) => { let bi = -1, bd = 1e9; for (const i of outfield(x)) { if (pred && !pred(i)) continue; const d = dist(posP(x, i), pt); if (d < bd) { bd = d; bi = i; } } return bi >= 0 ? bi : outfield(x)[0] || 1; };
      if (kind === "pass" || kind === "counter") {
        const s = rnd() < 0.62 ? st.poss : 1 - st.poss;
        if (s !== st.poss || st.hs < 0) winBall(b, s, rnd() < 0.5 ? "int" : "tackle");
        if (kind === "counter") {
          const want = A(s, clamp(toTeam(G(s), ballP()[0], ballP()[1])[0] + 0.28, 0.5, 0.72), clamp(0.5 + (rnd() - 0.5) * 0.7, 0.15, 0.85));
          b.say(W.counter(pk, rnd, X(s, { a: who(s, st.hs) })), "", 0.9, 1); carry(b, want);
          passTo(b, -1, A(s, 0.55, 0.5 + (rnd() - 0.5) * 0.5), { excl: [] });
        } else {
          const n = (fastP ? 3 : 3) + Math.floor(rnd() * (fastP ? 3 : 4));
          let dd = toTeam(G(s), ballP()[0], ballP()[1])[0];
          for (let k = 0; k < n; k++) {
            dd = clamp(dd + (rnd() - 0.46) * 0.22, 0.25, 0.7);
            const want = A(s, dd, clamp(0.5 + (rnd() - 0.5) * 0.9, 0.08, 0.92));
            if (rnd() < 0.18 && st.hs > 0) carry(b, want, rnd() < 0.5 ? "dribble" : null);
            else passTo(b, -1, want, { excl: [], say: P.say * 0.9 });
          }
          if (rnd() < 0.4) { const x = 1 - s, bi = nearest(x, ballP()); b.say(W.press(pk, rnd, X(x, { a: who(x, bi) })), "", 0.8, 0); b.leg("tackle", ballP(), { rc: { s: x, i: bi } }); }
        }
      } else if (kind === "throw") {
        const lost = st.poss, s = 1 - lost, y = ballP()[1] < 0.5 ? 0.0 : 1.0, bx = clamp(ballP()[0] + (rnd() - 0.5) * 0.08, 0.05, 0.95), spot = [bx, y];
        b.leg("out", spot, { ht: null, z: 0.15 }); b.say(W.throwin(pk, rnd, X(s, { a: who(s, nearest(s, spot)) })), "", 0.9, 0);
        const tk = nearest(s, spot); st.poss = s; st.hs = -1;
        b.leg("fetch", spot, { hf: null, ht: { s, i: tk } }); b.leg("hold", spot, { dur: 600, hf: { s, i: tk }, ht: { s, i: tk } });
        passTo(b, -1, [clamp(bx + (rnd() - 0.5) * 0.14, 0.05, 0.95), y === 0 ? 0.14 : 0.86], { z: 0.2, excl: [] });
      } else if (kind === "foul") {
        const s = st.poss, o = 1 - s, h = st.hs;
        carry(b, jit(rnd, A(s, clamp(toTeam(G(s), ballP()[0], ballP()[1])[0] + 0.1, 0.3, 0.75), ballP()[1]), 0.04), null);
        const df = nearest(o, ballP());
        b.say(W.foul(pk, rnd, X(s, { a: who(s, h), b: who(o, df) })), "", 1, 0);
        b.leg("tackle", ballP(), { rc: { s: o, i: df }, keep: true }); b.leg("hold", ballP(), { dur: 1100 });
        passTo(b, -1, A(s, clamp(toTeam(G(s), ballP()[0], ballP()[1])[0] + 0.12, 0.3, 0.8), 0.2 + rnd() * 0.6), { z: 0.5 });
      } else {   // corner
        const s = st.poss, o = 1 - s, flag = [G(s) === 0 ? 1 : 0, rnd() < 0.5 ? 0.02 : 0.98];
        if (toTeam(G(s), ballP()[0], ballP()[1])[0] < 0.78) passTo(b, -1, A(s, 0.84, flag[1] < 0.5 ? 0.18 : 0.82), { excl: [] });
        b.leg("out", flag, { ht: null, z: 0.2 }); b.say(W.corner(pk, rnd, X(s, { a: who(s, nearest(s, flag)) })), "", 1, 1);
        const tk = nearest(s, flag); st.set = boxPulls(s, tk);
        b.leg("fetch", flag, { hf: null, ht: { s, i: tk } }); b.leg("hold", flag, { dur: 700, hf: { s, i: tk }, ht: { s, i: tk } });
        const fw = onLine(s, "FWD").concat(onLine(s, "DEF")), ai = fw.length ? fw[Math.floor(rnd() * fw.length)] : 1;
        passTo(b, ai, A(s, 0.93, 0.4 + rnd() * 0.2), { kind: "cross", z: 0.9 });
        const defs = onLine(o, "DEF"), di = defs.length ? defs[Math.floor(rnd() * defs.length)] : 1; b.say(W.cornerClear(pk, rnd, X(s, { a: who(o, di) })), "", 0.8, 1);
        b.leg("pass", A(o, 0.42, 0.2 + rnd() * 0.6), { ht: { s: o, i: di }, z: 0.8 }); st.set = null;
      }
      return b;
    }

    let lastM = 0, lastEvM = 0;
    const finish = (b, o) => {   // turn a builder into a segment
      const nat = Math.max(1, b.t);
      segs.push({ id: segs.length, cls: o.cls, kind: o.kind, ei: o.ei != null ? o.ei : -1, nat, w: o.w || 1, legs: b.legs, lines: b.lines, kicks: b.kicks, m0: o.m0, m1: o.m1, fm: o.fm != null ? o.fm : b.mark >= 0 ? clamp(b.mark / nat, 0.05, 1) : 1, on0: o.on0 || cloneOn(), on1: o.on1 || cloneOn(), flip: o.flip != null ? o.flip : 0, card: o.card ? { ...o.card, ff: o.ff != null ? Math.min(1, o.ff / nat) : null } : null, pen: null });
    };
    function fillGap(toM, share, fillRng) {
      if (!fillNat || toM - lastM < 0.4) return;
      const budget = fillNat * share, made = []; let acc = 0, guard = 0;
      while (acc + (made.length ? acc / made.length : 9000) / 2 < budget && guard++ < 14) { const b = filler(mulberry32(seedMix(seed, 2, fillRng * 100 + made.length))); made.push(b); acc += Math.max(1, b.t); }
      let m = lastM; const span = toM - lastM;
      made.forEach((b) => { const m1 = m + (span * Math.max(1, b.t)) / acc; finish(b, { cls: "quiet", kind: "quiet", m0: m, m1 }); m = m1; });
      lastM = toM;
    }
    const exitTo = (s, i) => { const p = pl[s][i], y = p.y < 34 ? -1.8 : 69.8; return { to: [clamp(p.x / 105, 0.05, 0.95), y / 68], d: dM(p.x, p.y, p.x, y) }; };

    ev.forEach((e, ei) => {
      const share = (e.m - lastEvM) / 90, rnd = mulberry32(seedMix(seed, 1, ei)), isKey = ["goal", "save", "miss", "chance"].includes(e.e);
      gs.m = (lastM + (isKey ? Math.max(lastM, e.m - P.span) : e.m)) / 2; fillGap(isKey ? Math.max(lastM, e.m - P.span) : e.m, share, ei); gs.m = e.m;
      const m0 = lastM, m1 = e.m, base = { ei, m0, m1 };   // continuous clock: a segment starts where the previous one ended
      if (e.e === "kick") {
        cut(0); const b = builder(rnd); b.say(W.kickoff(pk, rnd, X(0)), "mark", 1, 1); kickoffPlay(b, 0, false, "start");
        finish(b, { ...base, cls: "fixed", kind: "kick", fm: 0.05 });
      } else if (e.e === "ht") {   // whistle, card, then the teams change ends and the other side kicks off
        const b = builder(rnd); b.say(W.halftime(pk, rnd, X(0, { score: e.score, scorers: scorersTo(ei) })), "mark", 1, 1);
        b.leg("hold", ballP(), { dur: 3200, hf: null, ht: null }); const cel = b.t;
        half = 1; st.set = null; st.hs = -1; cut(1); kickoffPlay(b, 1, false, "ht");
        finish(b, { ...base, cls: "fixed", kind: "ht", fm: 0.05, card: { type: "ht" }, ff: cel });
      } else if (e.e === "ft") {
        const b = builder(rnd); b.say(W.fulltime(pk, rnd, X(0, { score: e.score, scorers: scorersTo(ei) })), "mark", 1, 2); b.leg("hold", ballP(), { dur: 6500, hf: null, ht: null });
        finish(b, { ...base, cls: "fixed", kind: "ft", fm: 0.05, card: { type: "ft" } });
      } else if (isKey) {
        const on0 = cloneOn(), kb = keyPlay(e, rnd);
        finish(kb, { ...base, cls: "key", kind: e.e, w: e.e === "goal" ? 1.3 : e.e === "chance" ? 0.9 : 1.05, on0, on1: on0 });
        if (e.e === "goal") { const c = celebrate(e, mulberry32(seedMix(seed, 3, ei))), sc = ents.get(e.p), as = e.a ? ents.get(e.a) : null; finish(c.b, { cls: "fixed", kind: "celebrate", ei, m0: m1, m1, fm: 0.05, ff: c.ff, card: { type: "goal", s: e.s, id: e.p, name: e.pn, m: e.m, assist: e.an || "", num: num[e.p] || 0, photo: !!sc, assistId: as ? as.id : null } }); }
      } else if (e.e === "sub") {   // the player going off jogs to the touchline, the substitute takes his slot there and runs on
        const on0 = cloneOn(), i = slotOf(e.s, e.out), b = builder(rnd); b.say(W.sub(pk, rnd, X(e.s, { on: e.on, off: e.off, forced: !!e.forced })), "sub", 1, 0); st.hs = -1; let d1 = 0;
        if (i >= 0) { const x = exitTo(e.s, i); b.leg("hold", ballP(), { hf: null, ht: null, dur: clamp((x.d / 6.2) * 1000 + 400, 1500, 5000), pulls: [{ s: e.s, i, to: x.to, v: 6.2 }] }); d1 = b.t; on[e.s][i] = e.in; }
        b.leg("hold", ballP(), { hf: null, ht: null, dur: 1800 });
        finish(b, { ...base, cls: "fixed", kind: "sub", on0, on1: cloneOn(), flip: d1 ? d1 / b.t : 0, fm: d1 ? d1 / b.t : 0.1, card: { type: "sub", s: e.s, on: e.on, off: e.off, forced: !!e.forced, inId: e.in, outId: e.out }, ff: 3200 });
      } else if (e.e === "yellow") {
        const on0 = cloneOn(), i = slotOf(e.s, e.p), b = builder(rnd); b.say(W.yellow(pk, rnd, X(e.s, { a: e.pn })), "yellow", 1, 1); st.hs = -1;
        b.leg("hold", ballP(), { hf: null, ht: null, dur: 3400, pulls: i >= 0 ? [{ s: e.s, i, to: ballP(), v: 6.5 }] : [] });
        finish(b, { ...base, cls: "fixed", kind: "yellow", on0, on1: on0, fm: 0.1, card: { type: "yellow", s: e.s, name: e.pn, id: e.p, second: false }, ff: 3000 });
      } else if (e.e === "red" || e.e === "injury") {   // sent off or hurt: he walks to the touchline and the slot empties (an injury with a forced substitute is replaced by the next event instead)
        const on0 = cloneOn(), i = slotOf(e.s, e.p), b = builder(rnd), nxt = ev[ei + 1], replaced = e.e === "injury" && nxt && nxt.e === "sub" && nxt.forced && nxt.out === e.p; b.say(W[e.e](pk, rnd, X(e.s, { a: e.pn, second: !!e.second })), e.e === "injury" ? "sub" : e.e, 1, e.e === "red" ? 3 : 1); st.hs = -1;
        let d1 = 0;
        if (i >= 0 && !replaced) { const x = exitTo(e.s, i); b.leg("hold", ballP(), { hf: null, ht: null, dur: Math.max(2800, clamp((x.d / 5.2) * 1000 + 600, 1500, 6000)), pulls: [{ s: e.s, i, to: x.to, v: e.e === "red" ? 4.5 : 3.5 }] }); d1 = b.t; on[e.s][i] = null; }
        b.leg("hold", ballP(), { hf: null, ht: null, dur: d1 ? 1000 : 3200 });
        finish(b, { ...base, cls: "fixed", kind: e.e, on0, on1: cloneOn(), flip: d1 ? d1 / b.t : 0, fm: 0.1, card: { type: e.e, s: e.s, name: e.pn, id: e.p, second: !!e.second }, ff: 3000 });
      }
      lastM = Math.max(lastM, m1); lastEvM = e.m; gs.score = e.score.slice(); if (e.s != null && ["goal", "save", "miss", "chance"].includes(e.e)) gs.shots[e.s]++;
    });
    return { segs, finalOn: on, simU, trk: record ? { dt: DT, n: HS.length, PS: Float32Array.from(PS), BS: Float32Array.from(BS), HS: Int8Array.from(HS), CUT: Uint8Array.from(CUT) } : null };
  }

  // ---- pass 1 (no filler) measures the fixed and key time; pass 2 fills the quiet spells to the target and the final scale is solved exactly ----
  const classes = (segs) => { let fixed = 0, key = 0, quiet = 0; segs.forEach((g) => { if (g.cls === "fixed") fixed += g.nat; else if (g.cls === "key") key += g.nat * g.w; else quiet += g.nat; }); return { fixed, key, quiet }; };
  const scales = (c) => {
    let fs = P.fixed, ks = P.key; const T = P.targetMs, reserve = 0.12 * T;
    if (c.fixed * fs > 0.45 * T) fs = (0.45 * T) / c.fixed;
    if (c.fixed * fs + c.key * ks + reserve > T) ks = Math.max(0.12, (T - reserve - c.fixed * fs) / c.key);
    return { fs, ks, q: c.quiet > 0 ? Math.max(0.05, (T - c.fixed * fs - c.key * ks) / c.quiet) : P.quiet };
  };
  const g1 = generate(null, false), c1 = classes(g1.segs), s1 = scales(c1), quietReal = Math.max(0.12 * P.targetMs, P.targetMs - c1.fixed * s1.fs - c1.key * s1.ks);
  const g2 = generate(quietReal / P.quiet, true), segs = g2.segs, c2 = classes(segs), sc = scales(c2);

  // ---- assemble: real and natural time axes, legs, minutes ----
  const legs = []; let r = 0, u = 0;
  const addSeg = (g) => {
    g.r0 = r; g.u0 = u; g.real = g.cls === "fixed" ? g.nat * sc.fs : g.cls === "key" ? g.nat * g.w * sc.ks : g.cls === "pens" ? g.nat * P.pens : g.nat * sc.q;
    g.r1 = r + g.real; g.u1 = u + g.nat; g.l0 = legs.length;
    g.legs.forEach((L) => legs.push({ ...L, u0: g.u0 + L.t0, u1: g.u0 + L.t1, seg: g.id }));
    g.l1 = legs.length; r = g.r1; u = g.u1;
  };
  segs.forEach(addSeg);
  const total = r;
  const minuteAt = (g, f) => g.m0 + (g.m1 - g.m0) * clamp(f / (g.fm || 1), 0, 1);

  // ---- moments (the outcome events at their real times) and the commentary feed ----
  const moments = [], lines = [];
  segs.forEach((g) => { if (g.ei >= 0 && g.kind !== "celebrate") { const e = ev[g.ei]; moments.push({ ei: g.ei, e: e.e, m: e.m, s: e.s, p: e.p, pn: e.pn, an: e.an, score: e.score.slice(), r: g.r0 + g.real * g.fm }); } });
  segs.forEach((g) => g.lines.forEach((L) => { const f = L.t / g.nat; lines.push({ r: g.r0 + g.real * f, m: Math.floor(minuteAt(g, f)), text: L.text, cls: L.cls, hype: L.hype || 0 }); }));

  // ---- penalty shoot-out after full time ----
  let endAnim = total;
  if (pens) {
    const fin = g2.finalOn, mk = (kind, nat, extra) => ({ id: segs.length, cls: "pens", kind, ei: -1, nat, w: 1, legs: [], lines: [], m0: 90, m1: 90, fm: 1, on0: fin, on1: fin, flip: 0, card: null, pen: null, ...extra });
    const spotX = 1 - 11 / PITCH.L, intro = mk("penIntro", NAT.penIntro, { card: { type: "pens" } });
    intro.legs.push({ t0: 0, t1: NAT.penIntro, kind: "hold", from: [spotX, 0.5], to: [spotX, 0.5], z: 0, side: 0, hf: null, ht: null, pulls: [] }); intro.lines.push({ t: 100, text: "Penalty shoot-out!", cls: "mark" }); segs.push(intro); addSeg(intro);
    pens.kicks.forEach((k, ki) => {
      const s = k.s, i = fin[s].indexOf(k.p), gkS = 1 - s, ySide = k.res === "goal" ? (ki % 2 ? -1 : 1) * (0.02 + 0.02 * ((ki * 7) % 3)) : k.res === "save" ? (ki % 2 ? 1 : -1) * 0.035 : (ki % 2 ? -1 : 1) * 0.085;
      const target = k.res === "miss" ? [1.006, 0.5 + ySide] : [1.006, 0.5 + ySide], dive = k.res === "save" ? 0.5 + ySide : 0.5 - Math.sign(ySide || 1) * 0.04;
      const seg = mk("pen", NAT.pen, { ei: -2, pen: { s, i, kick: k, ki, gk: { s: gkS, i: 0 }, dive, spotX, target } });
      const legsRel = [["hold", 1700, [spotX, 0.5], [spotX, 0.5], 0], ["shot", 520, [spotX, 0.5], [k.res === "save" ? 0.99 : target[0], k.res === "save" ? 0.5 + ySide : target[1]], k.res === "miss" && ki % 3 === 0 ? 0.9 : 0.2], ["hold", NAT.pen - 2220, null, null, 0]];
      let t = 0, last = [spotX, 0.5]; legsRel.forEach(([kind, dur, from, to, z]) => { const f = from || last, tt = to || last; seg.legs.push({ t0: t, t1: t + dur, kind, from: f, to: tt, z, side: s, hf: null, ht: null, pulls: [] }); t += dur; last = tt; });
      const tn = names[s], gkn = nameOfId(fin[gkS][0]), txt = k.res === "goal" ? `${k.pn} scores! ${k.score[0]}-${k.score[1]}` : k.res === "save" ? `${gkn} saves from ${k.pn}! ${k.score[0]}-${k.score[1]}` : `${k.pn} misses! ${k.score[0]}-${k.score[1]}`;
      seg.lines.push({ t: 150, text: `${k.pn} (${tn}) steps up…`, cls: "" }, { t: 1800, text: txt, cls: k.res === "goal" ? "goal" : "" }); seg.fm = 1900 / NAT.pen; seg.card = { type: "penKick", s, name: k.pn, res: k.res, id: k.p };
      segs.push(seg); addSeg(seg); moments.push({ ei: -2, e: "pen", s, p: k.p, pn: k.pn, res: k.res, m: 120, score: sim.score.slice(), pens: k.score.slice(), r: seg.r0 + seg.real * seg.fm });
      lines.push({ r: seg.r0 + seg.real * (150 / NAT.pen), m: 120, text: seg.lines[0].text, cls: "" }, { r: seg.r0 + seg.real * (1800 / NAT.pen), m: 120, text: txt, cls: k.res === "goal" ? "goal" : "" });
    });
    const endSeg = mk("penEnd", NAT.penEnd, { card: { type: "penEnd", winner: pens.winner, score: pens.score.slice() } });
    endSeg.legs.push({ t0: 0, t1: NAT.penEnd, kind: "hold", from: [spotX, 0.5], to: [spotX, 0.5], z: 0, side: 0, hf: null, ht: null, pulls: [] }); segs.push(endSeg); addSeg(endSeg);
    lines.push({ r: endSeg.r0 + 200, m: 120, text: `${names[pens.winner]} win the shoot-out ${pens.score[0]}-${pens.score[1]}.`, cls: "mark" });
    endAnim = r;
  }
  moments.sort((a, b) => a.r - b.r); lines.sort((a, b) => a.r - b.r);
  const kickoffs = []; segs.forEach((g) => (g.kicks || []).forEach((k) => kickoffs.push({ r: g.r0 + g.real * (k.t / g.nat), side: k.side, half: k.half, kind: k.kind })));
  const trk = g2.trk; let hash = trk.n | 0; for (let q = 0; q < trk.PS.length; q += 7) hash = (Math.imul(hash, 31) + Math.round(trk.PS[q] * 10)) | 0;
  return { speed: sp, animated: true, names, preset: P, seed, segs, legs, moments, lines, kickoffs, trk, hash, simU: g2.simU, base: B, num, total, pensMs: endAnim - total, endAnim, end: endAnim, pens: pens || null, finalScore: sim.score.slice(), scales: sc, fixedNum: c2 };
}

// ---------- frames ----------
const segAt = (M, r) => { const S = M.segs; let lo = 0, hi = S.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (S[mid].r0 <= r) lo = mid; else hi = mid - 1; } return lo; };
export const minuteOf = (M, r) => { const g = M.segs[segAt(M, clamp(r, 0, M.endAnim))], f = g.r1 > g.r0 ? (clamp(r, 0, M.endAnim) - g.r0) / (g.r1 - g.r0) : 1; return g.m0 + (g.m1 - g.m0) * clamp(f / (g.fm || 1), 0, 1); };
export function scoreAt(M, r) { let sc = [0, 0], pens = null; for (const m of M.moments) { if (m.r > r) break; sc = m.score; if (m.e === "pen") pens = m.pens; } return { score: sc, pens }; }
export const linesUntil = (M, r) => { const out = []; for (const L of M.lines) { if (L.r > r) break; out.push(L); } return out; };

// Everything the renderer needs at real time r (ms since kick-off): minute, score, ball, 22 players, card overlay. Pure and cheap: a late joiner just calls it with now - startAt.
export function frameAt(M, rr) {
  const r = clamp(rr, 0, M.endAnim), si = segAt(M, r), g = M.segs[si], f = g.r1 > g.r0 ? (r - g.r0) / (g.r1 - g.r0) : 1, u = g.u0 + f * (g.u1 - g.u0);
  let li = g.l0; while (li < g.l1 - 1 && M.legs[li].u1 <= u) li++;
  const L = M.legs[li], lt = clamp((u - L.u0) / (L.u1 - L.u0 || 1), 0, 1), e = L.kind === "carry" || L.kind === "hold" ? lt : L.kind === "reset" ? smooth(lt, 0, 1) : lt * (2 - lt);
  const ball = [mix(L.from[0], L.to[0], e), mix(L.from[1], L.to[1], e)], z = L.z * Math.sin(Math.PI * lt);
  const { score, pens } = scoreAt(M, r), on = f >= g.flip && g.flip > 0 || g.flip === 0 ? g.on1 : g.on0, players = [];
  const holder = null;
  if (g.pen) {   // shoot-out: everyone waits on the halfway line, one kicker, one keeper, one goal
    const p = g.pen, tk = clamp((u - g.u0) / 1700, 0, 1), tAfter = clamp((u - g.u0 - 1700) / 900, 0, 1);
    for (const s of [0, 1]) on[s].forEach((id, i) => {
      if (!id) { players.push({ s, i, id: null, on: false }); return; }
      let x, y;
      if (s === p.s && i === p.i) { x = mix(p.spotX - 0.1, p.spotX - 0.012, smooth(tk, 0.3, 1)); y = mix(0.62, 0.5, smooth(tk, 0.3, 1)); }
      else if (s === p.gk.s && i === 0) { x = 0.995 - 0.01 * smooth(tAfter, 0, 1); y = mix(0.5, p.dive, smooth(tAfter, 0, 1)); }
      else { x = 0.5 + (s ? 0.04 : -0.04); y = clamp(0.2 + 0.6 * ((i + (s ? 0.5 : 0)) / 11), 0.1, 0.9); }
      players.push({ s, i, id, num: M.num[id] || 0, on: true, x, y, hold: false });
    });
    const bx = L.kind === "hold" ? p.spotX : ball[0];
    return { r, seg: g, segIndex: si, minute: 90, shown: "pens", score, pens, ball: { x: bx, y: ball[1], z }, players, holder: null, card: g.card, f, pen: p, penStage: u - g.u0 };
  }
  const T = M.trk, kf = u / T.dt, k0 = clamp(Math.floor(kf), 0, T.n - 1), k1 = Math.min(k0 + 1, T.n - 1), al = T.CUT[k1] ? 0 : clamp(kf - k0, 0, 1);   // positions come from the movement simulation, sampled every T.dt ms of natural time
  const bx = mix(T.BS[k0 * 3], T.BS[k1 * 3], al), by = mix(T.BS[k0 * 3 + 1], T.BS[k1 * 3 + 1], al), bz = mix(T.BS[k0 * 3 + 2], T.BS[k1 * 3 + 2], al), code = T.HS[al < 0.5 ? k0 : k1], hold = code >= 0 ? { s: Math.floor(code / 11), i: code % 11 } : null;
  for (const s of [0, 1]) on[s].forEach((id, i) => {
    if (!id) { players.push({ s, i, id: null, on: false }); return; }
    const q = (s * 11 + i) * 2;
    players.push({ s, i, id, num: M.num[id] || 0, on: true, x: mix(T.PS[k0 * 44 + q], T.PS[k1 * 44 + q], al) / PITCH.L, y: mix(T.PS[k0 * 44 + q + 1], T.PS[k1 * 44 + q + 1], al) / PITCH.W, hold: !!(hold && hold.s === s && hold.i === i) });
  });
  return { r, seg: g, segIndex: si, minute: g.m0 + (g.m1 - g.m0) * clamp(f / (g.fm || 1), 0, 1), shown: "play", score, pens, ball: { x: bx / PITCH.L, y: by / PITCH.W, z: bz }, players, holder: hold, card: g.card, f, leg: L, lt };
}
