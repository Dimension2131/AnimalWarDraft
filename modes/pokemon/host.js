// modes/pokemon/host.js — host logic of the Pokémon War Draft: tournament (reuses the classic pairing code), auto battles (deterministic, every
// device re-simulates them) and manual battles (the host resolves each turn from the two players' choices; state lives in pkb/<fightId>).
import * as R from "../../js/rules.js";
import * as N from "../../js/net.js";
import { arr } from "../../js/util.js";
import { makeTour, advance as tourAdvance, computeStandings } from "../classic/host.js";
import * as E from "./engine.js";
import * as Dt from "./data.js";

export const EVENT_MS = 520, END_PAD_MS = 4000, NEXT_IDLE_MS = 20000, MANUAL_END_MS = 7000;
export const revealMs = (n) => Math.min(150000, n * EVENT_MS + END_PAD_MS);
export const seedOf = (f) => f.seed | 0;

// the teams of a fight with their movesets, built from the fight record + the tournament's resolved sets
export function teamsOfFight(d, map, T, f) {
  const mk = (k) => arr(T.lineups[k]).map((id) => map.get(id)).filter(Boolean).map((e) => Dt.monFor(d, e, ((T.sets || {})[k] || {})[e.id]));
  return [mk(f.a), mk(f.b)];
}
export const resultOf = (S) => ({ winner: S.over.w === 0 ? "A" : S.over.w === 1 ? "B" : "draw", survivors: { A: E.survivors(S)[0], B: E.survivors(S)[1] }, turns: S.turn });

export function createHost(ctx) {
  const { code, S, settings, nm, log, map } = ctx;
  const M = {}; const subs = []; const autoCache = {};
  subs.push(N.watch(code, "pkb", (v) => { M.pkb = v; if (window.__isHost === false) { subs.forEach((u) => u()); subs.length = 0; } }));
  const tourTx = (fn) => N.tx(code, "tour", (c) => (c ? fn(c) : undefined));
  const names = (T, f) => [nm(f.a), nm(f.b)];

  async function begin(phase, { keys, lineups }) {
    if (phase !== "battle") return false;
    const d = await Dt.loadBattleData();
    const sets = {};
    for (const k of keys) {
      sets[k] = {};
      const sub = ((S.lineups || {})[k] || {}).sets || {};
      for (const id of lineups[k]) {
        const e = map.get(id), want = sub[id] || {}, def = Dt.defaultSet(d, e), legal = new Set(Dt.learnsetOf(d, e));
        const mv = arr(want.moves).map(Number).filter((x) => legal.has(x)).filter((x, i, a) => a.indexOf(x) === i).slice(0, 4);
        const abOk = e.abilities.some((a) => a.id === want.ability);
        sets[k][id] = { moves: mv.length ? mv : def.moves, ability: abOk ? want.ability : def.ability };
      }
    }
    const tour = { ...makeTour(keys, lineups, Math.floor(Math.random() * 4294967296)), sets };
    const ok = await N.tx(code, "tour", (c) => (c ? undefined : tour));
    log("pokemon tournament created:", tour.format); return ok;
  }

  async function startNextFight() {
    const T = S.tour; if (!T || T.state !== "awaitNext") return;
    const seed = Math.floor(Math.random() * 4294967296) | 0, startAt = N.now() + R.FIGHT_PRESTART_MS, style = settings().battleMode === "manual" ? "manual" : "auto";
    await tourTx((c) => {
      if (c.state !== "awaitNext") return undefined;
      const { tour, pick } = tourAdvance(c);
      if (!pick) { tour.state = "finishing"; return tour; }
      const m = tour.rounds[pick.ri][pick.mi], id = "f" + (++tour.seq);
      tour.fights[id] = { id, a: m.a, b: m.b, label: tour.labels[pick.ri] || "Battle", round: pick.ri, seed, startAt, status: "playing", style };
      m.fightId = id; tour.state = "playing"; tour.currentFight = id; return tour;
    });
  }
  const finishFight = (f, res) => tourTx((c) => {
    if (c.state !== "playing" || c.currentFight !== f.id) return undefined;
    const cf = c.fights[f.id]; cf.result = res; cf.final = { winner: res.winner, survivors: res.survivors }; cf.status = "done";
    c.state = "awaitNext"; c.nextAt = N.now() + NEXT_IDLE_MS; c.currentFight = null; return c;
  });

  async function autoStep(T, f) {
    const d = await Dt.loadBattleData();
    if (!autoCache[f.id]) { const [A, B] = teamsOfFight(d, map, T, f); autoCache[f.id] = E.runAuto({ teams: [A, B], names: names(T, f), seed: seedOf(f) }); }
    const r = autoCache[f.id];
    if (N.now() < f.startAt + revealMs(r.events.length)) return;
    return finishFight(f, resultOf(r.state));
  }

  const clean = (v) => JSON.parse(JSON.stringify(v));
  async function manualStep(T, f) {
    const d = await Dt.loadBattleData(), s = settings(), turnMs = Math.max(10, Math.min(180, s.turnSeconds || 45)) * 1000;
    let B = (M.pkb || {})[f.id];
    if (!B) {
      if (N.now() < f.startAt) return;
      const [A, Bt] = teamsOfFight(d, map, T, f), st = E.createBattle({ teams: [A, Bt], names: names(T, f), seed: seedOf(f) }), ev = E.start(st);
      return N.tx(code, `pkb/${f.id}`, (c) => (c ? undefined : { n: 1, st: JSON.stringify(st), log: { 0: JSON.stringify(ev) }, dl: N.now() + turnMs + 3000 }));
    }
    const st = JSON.parse(B.st);
    if (st.over) {
      if (!B.overAt) return N.put(code, `pkb/${f.id}/overAt`, N.now());
      if (N.now() - B.overAt < MANUAL_END_MS) return;
      return finishFight(f, resultOf(st));
    }
    const need = E.needsChoice(st), online = (k) => !!((S.players || {})[k] || {}).online, keys = [f.a, f.b];
    const chs = ((B.ch || {})[B.n]) || {}, got = [0, 1].map((si) => (need[si] ? (chs[si === 0 ? "a" : "b"] || null) : null));
    const late = N.now() >= B.dl;
    const ready = [0, 1].every((si) => !need[si] || got[si] || late || !online(keys[si]));
    if (!ready) return;
    const final = [0, 1].map((si) => (!need[si] ? null : got[si] || E.aiChoose(st, si)));
    const ev = E.advance(st, final), n = B.n + 1;
    const log0 = {}; for (const [k, v] of Object.entries(B.log || {})) if (+k > n - 4) log0[k] = v; log0[B.n] = JSON.stringify(ev);
    await N.tx(code, `pkb/${f.id}`, (c) => (c && c.n === B.n ? clean({ n, st: JSON.stringify(st), log: log0, dl: N.now() + turnMs + 2500, overAt: st.over ? N.now() : null }) : undefined));
  }

  async function finishTournament() {
    const T = S.tour; if (!T || T.state !== "finishing") return;
    const stt = T.format === "none" ? { order: [], pts: {}, surv: {} } : computeStandings(T.keys, T);
    let champion = [];
    if (T.format === "single") { const f = Object.values(T.fights)[0]; champion = !f || !f.final ? [] : f.final.winner === "A" ? [f.a] : f.final.winner === "B" ? [f.b] : [f.a, f.b]; }
    else if (T.format === "swiss") { const f = Object.values(T.fights).filter((x) => x.label === "Final")[0]; champion = f && f.final ? (f.final.winner === "A" ? [f.a] : f.final.winner === "B" ? [f.b] : [f.a, f.b]) : stt.order.slice(0, 1); }
    else champion = stt.order.slice(0, 1);
    const ok = await tourTx((c) => (c.state === "finishing" ? { ...c, state: "done", results: { order: stt.order, pts: stt.pts, surv: stt.surv, champion } } : undefined));
    if (!ok) return;
    const L = S.ledger || {};
    for (const k of T.keys) {
      const dd = { games_played: 1, fights_won: 0, fights_lost: 0, fights_drawn: 0, tournaments_won: champion.includes(k) ? 1 : 0, animals_drafted: arr((L.rosters || {})[k]).length };
      for (const f of Object.values(T.fights)) { if (!f.final || (f.a !== k && f.b !== k)) continue; const me = f.a === k ? "A" : "B"; if (f.final.winner === "draw") dd.fights_drawn++; else if (f.final.winner === me) dd.fights_won++; else dd.fights_lost++; }
      try { await N.bumpStats(k, nm(k), dd); } catch (e) { console.warn("stats", e); }
    }
    await N.patch(code, "", { "game/results": { order: stt.order, scores: stt.pts, champion }, "meta/phase": "results" }); log("pokemon tournament finished");
  }

  async function step(phase) {
    if (phase !== "battle") return;
    const T = S.tour; if (!T) return;
    if (T.state === "awaitNext") { if (N.now() >= (T.nextAt || 0)) return startNextFight(); return; }
    if (T.state === "playing") { const f = T.fights[T.currentFight]; if (!f) return; return f.style === "manual" ? manualStep(T, f) : autoStep(T, f); }
    if (T.state === "finishing") return finishTournament();
  }
  return { step, begin, api: { nextFight: () => tourTx((c) => (c.state === "awaitNext" ? { ...c, nextAt: 0 } : undefined)) } };
}
