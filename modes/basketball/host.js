// modes/basketball/host.js: host logic of the Basketball War Draft. Draft and line-up are the shared phases; this adds the "match" phase:
// a knockout bracket (see bracket.js; the games of one round run at the same time), one seeded simulation per game that every device re-runs, shown by a replay timeline (replay.js).
import * as R from "../../js/rules.js";
import * as N from "../../js/net.js";
import { arr } from "../../js/util.js";
import * as E from "./engine.js";
import * as B from "./bracket.js";
import * as P from "./replay.js";

export const PRESTART_WATCH_MS = 10000, PRESTART_QUICK_MS = 6000, NEXT_IDLE_MS = 15000;
export const seedOf = (f) => f.seed | 0;

// the two teams of a fixture, built from the tournament record (line-up order = starting five in slot order, then the bench in rotation order)
export function teamsOfFight(map, T, f, names) {
  return [f.a, f.b].map((k, i) => {
    const ids = arr(T.lineups[k]), pl = ids.map((id) => map.get(id)).filter(Boolean);
    return { key: k, name: names ? names[i] : k, mode: E.normPosMode(T.posMode), tactics: E.normTactics((T.tactics || {})[k]), xi: pl.slice(0, E.STARTERS), bench: pl.slice(E.STARTERS) };
  });
}
export const simOf = (map, T, f, names) => E.simulateGame({ teams: teamsOfFight(map, T, f, names), seed: seedOf(f), mode: E.normPosMode(T.posMode), injuries: !!f.inj });
// The whole plan of a game: teams, outcome, and how it is replayed. Every device builds the same one from the same record.
export function planOf(map, T, f, names, speed) {   // speed overrides the game's own preset (the box score always reads the full simulation)
  const teams = teamsOfFight(map, T, f, names), sim = E.simulateGame({ teams, seed: seedOf(f), mode: E.normPosMode(T.posMode), injuries: !!f.inj });
  return { teams, sim, speed: P.normSpeed(speed || f.speed), durMs: P.durationMs(sim, speed || f.speed), endMs: P.endMs(sim, speed || f.speed) };
}

export function createHost(ctx) {
  const { code, S, settings, nm, log, map } = ctx;
  const cache = {};
  const tourTx = (fn) => N.tx(code, "tour", (c) => (c ? fn(c) : undefined));

  async function begin(phase, { keys, lineups }) {
    if (phase !== "match") return false;
    const posMode = E.normPosMode(settings().posMode), tactics = {}, final = {};
    for (const k of keys) {
      const sub = (S.lineups || {})[k] || {}, squad = arr(lineups[k]).map((id) => map.get(id)).filter(Boolean);
      tactics[k] = E.normTactics(sub.tactics);
      final[k] = sub.done ? arr(lineups[k]) : E.autoLineup(squad, posMode);   // a coach who never pressed Ready gets the best five for the position mode
    }
    const seed = Math.floor(Math.random() * 4294967296) | 0, bracket = B.buildBracket(keys, seed), has = bracket.rounds.length > 0;
    const tour = { format: "bracket", keys, lineups: final, tactics, posMode, seed, bracket, res: {}, fights: {}, seq: 0, round: 0, byes: [], labels: {}, current: [], state: has ? "awaitNext" : "finishing", nextAt: N.now() + 3000, done: !has };
    const ok = await N.tx(code, "tour", (c) => (c ? undefined : tour));
    log("basketball bracket created:", keys.length, "coaches"); return ok;
  }

  // one round = every game that is ready, all started together (they are watched side by side)
  async function startRound() {
    const T = S.tour; if (!T || T.state !== "awaitNext" || !T.bracket) return;
    const st = settings(), speed = P.speedOfSettings(st), inj = !!st.injuries, startAt = N.now() + (speed === "instant" ? PRESTART_QUICK_MS : PRESTART_WATCH_MS);
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
          if (ms === "play") { const [a, b] = B.sidesOf(m, c.res), id = "f" + (++c.seq), seed = Math.floor(Math.random() * 4294967296) | 0; c.fights[id] = { id, mid: m.id, a, b, label: m.label, round: ri, seed, startAt, status: "playing", speed, inj, ko: true }; cur.push(id); }
          else if (ms === "bye") c.res[m.id] = B.byeResult(m, c.res);
          else if (ms === "void") c.res[m.id] = { w: null, l: null, a: null, b: null, bye: true, score: [0, 0], ot: 0 };
        }
        if (cur.length) { c.state = "playing"; c.current = cur; c.currentFight = cur[0]; return c; }
      }
      return c;
    });
  }
  const finishFight = (f, plan) => tourTx((c) => {
    if (c.state !== "playing" || !arr(c.current).includes(f.id)) return undefined;
    const cf = c.fights[f.id]; if (!cf || cf.final) return undefined;
    const side = plan.sim.winner === "A" ? 0 : 1, w = side === 0 ? f.a : f.b, l = side === 0 ? f.b : f.a;
    cf.result = { score: plan.sim.score, winner: plan.sim.winner, ot: plan.sim.ot, w }; cf.final = { score: plan.sim.score, winner: plan.sim.winner, ot: plan.sim.ot, w }; cf.status = "done";
    c.res = c.res || {}; c.res[cf.mid] = { w, l, a: f.a, b: f.b, score: plan.sim.score, ot: plan.sim.ot };
    if (arr(c.current).every((id) => c.fights[id] && c.fights[id].final)) { c.state = "awaitNext"; c.nextAt = N.now() + NEXT_IDLE_MS; c.current = []; c.currentFight = null; }
    return c;
  });
  async function playStep(T) {
    for (const id of arr(T.current)) {
      const f = T.fights[id]; if (!f || f.final) continue;
      if (!cache[f.id]) cache[f.id] = planOf(map, T, f, [nm(f.a), nm(f.b)]);
      const plan = cache[f.id];
      // the game ends at its natural end, or as soon as both coaches have skipped to the final buzzer (an offline coach does not hold it up). The skip flag lives in the coach's own lineups node: lineups/<key>/skip = "<fight id>:<fight seed>" (the seed makes a skip left over from an earlier tournament harmless).
      const token = `${f.id}:${f.seed}`, done = (k) => ((S.lineups || {})[k] || {}).skip === token || !((S.players || {})[k] || {}).online;
      if (N.now() >= f.startAt + plan.endMs || (N.now() >= f.startAt && plan.durMs > 0 && done(f.a) && done(f.b))) return finishFight(f, plan);
    }
  }

  async function finishTournament() {
    const T = S.tour; if (!T || T.state !== "finishing") return;
    const order = B.placings(T.bracket || { rounds: [] }, T.res || {}, T.keys), pts = Object.fromEntries(order.map((k, i) => [k, order.length - i])), champion = order.slice(0, 1);
    const ok = await tourTx((c) => (c.state === "finishing" ? { ...c, state: "done", results: { order, pts, champion } } : undefined));
    if (!ok) return;
    const L = S.ledger || {}, rec = {}; T.keys.forEach((k) => { rec[k] = { w: 0, l: 0 }; });
    for (const r of Object.values(T.res || {})) { if (r.bye || !r.w || !r.l || !rec[r.w] || !rec[r.l]) continue; rec[r.w].w++; rec[r.l].l++; }
    for (const k of T.keys) {
      const dd = { games_played: 1, fights_won: rec[k].w, fights_lost: rec[k].l, fights_drawn: 0, tournaments_won: champion.includes(k) ? 1 : 0, animals_drafted: arr((L.rosters || {})[k]).length };
      try { await N.bumpStats(k, nm(k), dd); } catch (e) { console.warn("stats", e); }
    }
    await N.patch(code, "", { "game/results": { order, scores: pts, champion }, "meta/phase": "results" }); log("basketball bracket finished");
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
