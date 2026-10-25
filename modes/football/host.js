// modes/football/host.js: host logic of the Football War Draft. Draft and lineup are the shared phases; this adds the "match" phase:
// a knockout bracket (see bracket.js; matches of one round run at the same time), one seeded simulation per match that every device re-runs, plus a choreography layer (choreo.js) that only decorates it.
import * as R from "../../js/rules.js";
import * as N from "../../js/net.js";
import { arr } from "../../js/util.js";
import * as E from "./engine.js";
import * as B from "./bracket.js";
import * as C from "./choreo.js";

export const EVENT_MS = 1400, END_PAD_MS = 6000, QUICK_MS = 2500, PRESTART_WATCH_MS = 10000, PRESTART_QUICK_MS = 6000, NEXT_IDLE_MS = 15000;
export const revealMs = (n, style) => (style === "quick" ? QUICK_MS : Math.min(150000, n * EVENT_MS + END_PAD_MS));   // legacy: kept for old callers; the cinematic viewer uses endMs(M)
export const endMs = (M) => (M.animated ? M.end + END_PAD_MS : C.INSTANT_MS);
export const seedOf = (f) => f.seed | 0;

// the two teams of a fixture, built from the tournament record (lineup order = XI in slot order, then the bench)
export function teamsOfFight(map, T, f, names) {
  return [f.a, f.b].map((k, i) => {
    const ids = arr(T.lineups[k]), pl = ids.map((id) => map.get(id)).filter(Boolean);
    return { key: k, name: names ? names[i] : k, formation: E.normFormation((T.formations || {})[k]), xi: pl.slice(0, E.XI), bench: pl.slice(E.XI) };
  });
}
export const simOf = (map, T, f, names) => E.simulateMatch({ teams: teamsOfFight(map, T, f, names), seed: seedOf(f), discipline: !!f.disc });
// The whole plan of a match: outcome (simulation), the penalty shoot-out when a knockout match is level, and the choreography. Every device builds the same one from the same record.
export function planOf(map, T, f, names) {
  const teams = teamsOfFight(map, T, f, names), sim = E.simulateMatch({ teams, seed: seedOf(f), discipline: !!f.disc });
  const pens = f.ko && sim.winner === "draw" ? E.shootout({ teams, seed: seedOf(f), onPitch: sim.onPitch }) : null;
  return { teams, sim, pens, M: C.buildMatch({ teams, sim, seed: seedOf(f), speed: f.speed, pens }) };
}

export function createHost(ctx) {
  const { code, S, settings, nm, log, map } = ctx;
  const cache = {};
  const tourTx = (fn) => N.tx(code, "tour", (c) => (c ? fn(c) : undefined));

  async function begin(phase, { keys, lineups }) {
    if (phase !== "match") return false;
    const formations = {}, final = {};
    for (const k of keys) {
      const sub = (S.lineups || {})[k] || {}, squad = arr(lineups[k]).map((id) => map.get(id)).filter(Boolean), form = E.normFormation(sub.formation);
      formations[k] = form;
      final[k] = sub.done ? arr(lineups[k]) : E.autoLineup(squad, form);   // a manager who never pressed Ready gets the best XI for 4-3-3
    }
    const seed = Math.floor(Math.random() * 4294967296) | 0, bracket = B.buildBracket(keys, seed), has = bracket.rounds.length > 0;
    const tour = { format: "bracket", keys, lineups: final, formations, seed, bracket, res: {}, fights: {}, seq: 0, round: 0, byes: [], labels: {}, current: [], state: has ? "awaitNext" : "finishing", nextAt: N.now() + 3000, done: !has };
    const ok = await N.tx(code, "tour", (c) => (c ? undefined : tour));
    log("football bracket created:", keys.length, "managers"); return ok;
  }

  // one round = every match that is ready, all started together (they are watched side by side)
  async function startRound() {
    const T = S.tour; if (!T || T.state !== "awaitNext" || !T.bracket) return;
    const st = settings(), speed = C.speedOfSettings(st), disc = !!st.discipline, startAt = N.now() + (speed === "instant" ? PRESTART_QUICK_MS : PRESTART_WATCH_MS);
    await tourTx((c) => {
      if (c.state !== "awaitNext") return undefined;
      c.res = c.res || {}; c.fights = c.fights || {}; c.seq = c.seq || 0;
      for (let guard = 0; guard < 10; guard++) {
        const ri = B.nextRound(c.bracket, c.res);
        if (ri < 0) { c.state = "finishing"; c.current = []; c.currentFight = null; return c; }
        c.round = ri; const cur = [];
        for (const m of c.bracket.rounds[ri]) {
          if (c.res[m.id]) continue;
          const ms = B.matchState(m, c.res);
          if (ms === "play") { const [a, b] = B.sidesOf(m, c.res), id = "f" + (++c.seq), seed = Math.floor(Math.random() * 4294967296) | 0; c.fights[id] = { id, mid: m.id, a, b, label: m.label, round: ri, seed, startAt, status: "playing", speed, disc, ko: true, style: speed === "instant" ? "quick" : "watch" }; cur.push(id); }
          else if (ms === "bye") c.res[m.id] = B.byeResult(m, c.res);
          else if (ms === "void") c.res[m.id] = { w: null, l: null, a: null, b: null, bye: true, score: [0, 0], pens: null };
        }
        if (cur.length) { c.state = "playing"; c.current = cur; c.currentFight = cur[0]; return c; }
      }
      return c;
    });
  }
  const finishFight = (f, plan) => tourTx((c) => {
    if (c.state !== "playing" || !arr(c.current).includes(f.id)) return undefined;
    const cf = c.fights[f.id]; if (!cf || cf.final) return undefined;
    const side = plan.sim.winner === "A" ? 0 : plan.sim.winner === "B" ? 1 : plan.pens ? plan.pens.winner : 0, w = side === 0 ? f.a : f.b, l = side === 0 ? f.b : f.a, pp = plan.pens ? plan.pens.score : null;
    cf.result = { score: plan.sim.score, winner: plan.sim.winner, pens: pp, w }; cf.final = { score: plan.sim.score, winner: plan.sim.winner, pens: pp, w }; cf.status = "done";
    c.res = c.res || {}; c.res[cf.mid] = { w, l, a: f.a, b: f.b, score: plan.sim.score, pens: pp };
    if (arr(c.current).every((id) => c.fights[id] && c.fights[id].final)) { c.state = "awaitNext"; c.nextAt = N.now() + NEXT_IDLE_MS; c.current = []; c.currentFight = null; }
    return c;
  });
  async function playStep(T) {
    for (const id of arr(T.current)) {
      const f = T.fights[id]; if (!f || f.final) continue;
      if (!cache[f.id]) cache[f.id] = planOf(map, T, f, [nm(f.a), nm(f.b)]);
      const plan = cache[f.id];
      // the match ends at its natural end, or as soon as both managers have skipped to full time (an offline manager does not hold it up). The skip flag lives in the manager's own lineups node: lineups/<key>/skip = fight id.
      const done = (k) => ((S.lineups || {})[k] || {}).skip === f.id || !((S.players || {})[k] || {}).online;
      if (N.now() >= f.startAt + endMs(plan.M) || (N.now() >= f.startAt && plan.M.animated && done(f.a) && done(f.b))) return finishFight(f, plan);
    }
  }

  async function finishTournament() {
    const T = S.tour; if (!T || T.state !== "finishing") return;
    const order = B.placings(T.bracket || { rounds: [] }, T.res || {}, T.keys), pts = Object.fromEntries(order.map((k, i) => [k, order.length - i])), champion = order.slice(0, 1);
    const ok = await tourTx((c) => (c.state === "finishing" ? { ...c, state: "done", results: { order, pts, champion } } : undefined));
    if (!ok) return;
    const L = S.ledger || {}, rec = {}; T.keys.forEach((k) => { rec[k] = { w: 0, l: 0, d: 0 }; });
    for (const r of Object.values(T.res || {})) { if (r.bye || !r.w || !r.l || !rec[r.w] || !rec[r.l]) continue; rec[r.w].w++; rec[r.l].l++; if (r.score && r.score[0] === r.score[1]) { rec[r.w].d++; rec[r.l].d++; } }
    for (const k of T.keys) {
      const dd = { games_played: 1, fights_won: rec[k].w, fights_lost: rec[k].l, fights_drawn: 0, tournaments_won: champion.includes(k) ? 1 : 0, animals_drafted: arr((L.rosters || {})[k]).length };
      try { await N.bumpStats(k, nm(k), dd); } catch (e) { console.warn("stats", e); }
    }
    await N.patch(code, "", { "game/results": { order, scores: pts, champion }, "meta/phase": "results" }); log("football bracket finished");
  }

  async function step(phase) {
    if (phase !== "match") return;
    const T = S.tour; if (!T) return;
    if (T.state === "awaitNext") { if (N.now() >= (T.nextAt || 0)) return startRound(); return; }
    if (T.state === "playing") return playStep(T);
    if (T.state === "finishing") return finishTournament();
  }
  return { step, begin, api: { nextFight: () => tourTx((c) => (c.state === "awaitNext" ? { ...c, nextAt: 0 } : undefined)) } };
}
