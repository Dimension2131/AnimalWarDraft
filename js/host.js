import * as R from "./rules.js";
import * as N from "./net.js";
import { simulate, mulberry32 } from "./sim.js";
import { arr, hash, shuffleSeeded } from "./util.js";
import { filterPool as packFilterPool, arenaOf, defaultFilters } from "./pack.js";
import { nextPhase } from "./modes.js";

export { shuffleSeeded };
export { digestOf, fingerprint, aiNarrate, aiJudgeAppeal, roundRobin, computeStandings, advance, makeTour } from "../modes/classic/host.js";
export function filterPool(animals, f, pack) {
  if (!pack) throw new Error("filterPool needs the pack (js/pack.js getPack)");
  return packFilterPool(animals, f, pack);
}
export const minPool = (players, roster) => players * roster + R.POOL_MARGIN;

export function shouldClaimHost({ players, host, myKey }) {
  const t = N.now();
  if (host && host.hb && t - host.hb < R.HOST_STALE_MS) return false;
  const cand = Object.entries(players || {}).filter(([k, p]) => p.online && k !== (host && host.key)).sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0));
  return cand.length > 0 && cand[0][0] === myKey;
}

export function decideAuction(A, online, t) {
  if (!A || A.resolved) return null;
  const skips = A.skips || {}, part = Object.keys(A.participants || {});
  const live = part.filter((k) => !skips[k] && online[k]);
  const discard = { id: A.id, animalId: A.animalId, winner: null, price: 0, kind: "discard" };
  if (A.status === "bidding") {
    if (A.top) {
      const others = live.filter((k) => k !== A.top.key);
      if (!others.length || t >= A.deadline) return { type: "finish", outcome: { id: A.id, animalId: A.animalId, winner: A.top.key, price: A.top.amt, kind: "win" } };
      return null;
    }
    if (live.length === 0) return { type: "finish", outcome: discard };
    if (live.length === 1) return { type: "claim", key: live[0] };
    if (t >= A.deadline) return { type: "finish", outcome: discard };
    return null;
  }
  if (A.status === "claim" && A.claim) {
    if (A.claim.taken) return { type: "finish", outcome: { id: A.id, animalId: A.animalId, winner: A.claim.key, price: 0, kind: "claim" } };
    if (A.claim.declined || t >= A.claim.deadline) return { type: "finish", outcome: discard };
  }
  return null;
}

export function startHost({ code, key, animals, pack, mode, onLog = () => {} }) {
  const S = {}; const unsubs = []; let busy = false, stopped = false, loopT, beatT, pruneT;
  const map = new Map(animals.map((a) => [a.id, a]));
  const log = (...a) => { console.log("[host]", ...a); onLog(a.join(" ")); };
  for (const p of ["meta", "players", "spectators", "ledger", "game", "auction", "lineups", "tour", "appeals"]) unsubs.push(N.watch(code, p, (v) => { S[p] = v; }));
  window.__isHost = true; N.keepAwake();
  const settings = () => ({ ...R.DEFAULT_SETTINGS, ...(mode.defaultSettings || {}), filters: defaultFilters(pack), ...((S.meta && S.meta.settings) || {}) });
  const online = () => Object.fromEntries(Object.entries(S.players || {}).map(([k, p]) => [k, !!p.online]));
  const nm = (k) => ((S.players || {})[k] || {}).name || k;
  const an = (id) => (map.get(id) || { name: id }).name;
  const fightSim = (A, B, arena, seed) => simulate(A, B, arena, seed, { arenaLabel: arenaOf(pack, arena).label });
  const modeHost = mode.createHost ? mode.createHost({ code, S, settings, nm, an, log, map, pack, simulate: fightSim }) : {};

  async function startGame() {
    if (modeHost.start) return modeHost.start();
    const s = settings(), players = Object.entries(S.players || {}).filter(([, p]) => p.role !== "x").sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0)).map(([k]) => k);
    if (players.length < 2) throw new Error("Need at least 2 players");
    const f = s.filters || defaultFilters(pack);
    const pool = filterPool(animals, f, pack);
    if (pool.length < minPool(players.length, s.rosterSize)) throw new Error(`Pool too small: ${pool.length} < ${minPool(players.length, s.rosterSize)}`);
    const poolSeed = Math.floor(Math.random() * 4294967296);
    const ids = shuffleSeeded(pool.map((a) => a.id), poolSeed);
    const balances = {}; players.forEach((k) => { balances[k] = s.startBalance; });
    await N.patch(code, "", {
      game: { pool: ids, poolSeed, keys: players }, ledger: { balances, drawIndex: 0, stall: 0 },
      auction: null, lineups: null, tour: null, appeals: null, "meta/started": true, "meta/phase": nextPhase(mode, "lobby") || "draft"
    });
    log("game started", ids.length, pack.nouns.plural, "in pool");
  }

  const rosterOf = (k) => arr(((S.ledger || {}).rosters || {})[k]);
  async function applyOutcome(o) {
    const text = o.kind === "win" ? `${nm(o.winner)} won ${an(o.animalId)} for $${o.price}`
      : o.kind === "claim" ? `${nm(o.winner)} claimed ${an(o.animalId)} for free`
      : o.kind === "deal" ? `${an(o.animalId)} dealt to broke player ${nm(o.winner)}`
      : o.kind === "stall" ? `STALL RULE: ${an(o.animalId)} goes straight to ${nm(o.winner)} (fewest animals)`
      : `${an(o.animalId)} was discarded`;
    await N.tx(code, "ledger", (L) => {
      L = L || {}; L.applied = L.applied || {}; if (L.applied[o.id]) return undefined;
      L.balances = L.balances || {}; L.rosters = L.rosters || {};
      if (o.winner) {
        L.balances[o.winner] = (L.balances[o.winner] || 0) - o.price;
        L.rosters[o.winner] = arr(L.rosters[o.winner]).concat([{ id: o.animalId, price: o.price }]);
        L.stall = 0;
      } else L.stall = (L.stall || 0) + 1;
      L.drawIndex = o.id + 1; L.applied[o.id] = true; L.last = { id: o.id, text, kind: o.kind, animalId: o.animalId, winner: o.winner || null, price: o.price };
      L.log = L.log || {}; L.log[o.id] = text; delete L.log[o.id - 30];
      return L;
    });
  }
    
  async function draftStep() {
    const L = S.ledger, G = S.game, A = S.auction, s = settings();
    if (!L || !G) return;
    if (A && A.resolved && A.outcome && !(L.applied && L.applied[A.id])) return applyOutcome(A.outcome);
    const idx = L.drawIndex || 0;
    if (A && !A.resolved && A.id === idx) {
      const d = decideAuction(A, online(), N.now());
      if (!d) return;
      await N.tx(code, "auction", (cur) => {
        if (!cur || cur.id !== A.id || cur.resolved) return undefined;
        const dd = decideAuction(cur, online(), N.now()); if (!dd) return undefined; // re-validated against the freshest bids
        if (dd.type === "claim") { if (cur.status !== "bidding") return undefined; cur.status = "claim"; cur.claim = { key: dd.key, deadline: N.now() + R.CLAIM_WINDOW_MS }; return cur; }
        cur.resolved = true; cur.outcome = dd.outcome; return cur;
      });
      return;
    }
    const keys = G.keys, bal = L.balances || {}, size = s.rosterSize, pool = arr(G.pool);
    const part = keys.filter((k) => rosterOf(k).length < size);
    if (!part.length || idx >= pool.length) return endDraft();
    const nonBroke = part.filter((k) => (bal[k] || 0) >= R.MIN_BID), animalId = pool[idx];
    const rng = mulberry32(((G.poolSeed ^ Math.imul(idx + 1, 2654435761)) >>> 0));
    const fewest = (a) => { const m = Math.min(...a.map((k) => rosterOf(k).length)); const c = a.filter((k) => rosterOf(k).length === m); return c[Math.floor(rng() * c.length)]; };
    if (!nonBroke.length) return applyOutcome({ id: idx, animalId, winner: fewest(part), price: 0, kind: "deal" });
    if ((L.stall || 0) >= Math.max(R.STALL_MIN, Math.min(R.STALL_MAX, Math.floor(+s.stallLimit) || R.STALL_LIMIT))) return applyOutcome({ id: idx, animalId, winner: fewest(part), price: 0, kind: "stall" });
    const t = N.now();
    await N.tx(code, "auction", (cur) => {
      if (cur && cur.id >= idx) return undefined;
      const liveNow = part.filter((k) => online()[k]);   // only one player can take this lot: skip the bidding screen and offer the free claim straight away
      const direct = liveNow.length === 1 ? { key: liveNow[0], deadline: t + R.CLAIM_WINDOW_MS } : null;
      return { id: idx, animalId, status: direct ? "claim" : "bidding", deadline: t + s.auctionSeconds * 1000, top: null, skips: {}, claim: direct, resolved: false,
        participants: Object.fromEntries(part.map((k) => [k, true])), eligible: Object.fromEntries(nonBroke.map((k) => [k, true])),
        limits: Object.fromEntries(nonBroke.map((k) => [k, bal[k] || 0])) };
    });
  }
  async function endDraft() {
    const next = nextPhase(mode, "draft") || "results";
    const r = await N.tx(code, "meta/phase", (c) => (c === "draft" ? next : undefined));
    if (r && next === "lineup") await N.put(code, "game/lineupDeadline", N.now() + (mode.lineupMs || R.LINEUP_MS));
    log("draft finished");
  }

  async function lineupStep() {
    const G = S.game; if (!G) return;
    if (!G.lineupDeadline) return N.tx(code, "game/lineupDeadline", (c) => c || N.now() + (mode.lineupMs || R.LINEUP_MS));
    const keys = G.keys.filter((k) => rosterOf(k).length > 0);
    const subs = S.lineups || {};
    const allIn = keys.every((k) => subs[k] && subs[k].done);
    if (!allIn && N.now() < G.lineupDeadline) return;
    const lineups = {};
    for (const k of keys) {
      const draft = rosterOf(k).map((x) => x.id), sub = arr((subs[k] || {}).order);
      lineups[k] = sub.length === draft.length && [...sub].sort().join() === [...draft].sort().join() ? sub : draft;
    }
    const next = nextPhase(mode, "lineup") || "results";
    const ok = modeHost.begin ? await modeHost.begin(next, { keys, lineups }) : true;   // the mode prepares its own state for the next phase
    if (ok) await N.put(code, "meta/phase", next);
  }

  async function step() {
    const phase = S.meta && S.meta.phase; if (!phase) return;
    if (phase === "draft") return draftStep();
    if (phase === "lineup") return lineupStep();
    if (modeHost.step) return modeHost.step(phase);
  }
  loopT = setInterval(async () => {
    if (busy || stopped) return; busy = true;
    try { await step(); } catch (e) { console.warn("[host] step failed", e); } finally { busy = false; }
  }, 600);
  beatT = setInterval(() => N.beat(code, key).catch(() => {}), R.HEARTBEAT_MS); N.beat(code, key).catch(() => {});
  pruneT = setInterval(() => N.pruneChat(code).catch(() => {}), 30000);

  return {
    startGame,
    ...(modeHost.api || {}),
    stop() { stopped = true; clearInterval(loopT); clearInterval(beatT); clearInterval(pruneT); unsubs.forEach((u) => u()); window.__isHost = false; }
  };
}
