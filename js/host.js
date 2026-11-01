import * as R from "./rules.js";
import * as N from "./net.js";
import { simulate, mulberry32 } from "./sim.js";
import { arr, hash, shuffleSeeded } from "./util.js";
import { filterPool as packFilterPool, arenaOf, defaultFilters } from "./pack.js";
import { nextPhase } from "./modes.js";
import * as B from "./bots.js";

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
  const cand = Object.entries(players || {}).filter(([k, p]) => p.online && !p.bot && k !== (host && host.key)).sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0));
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

// ---------- giving up ----------
// Any client may call this for its own player (js/app.js). During the draft the player is removed and everything they bought goes back to the end of the pool, to be bid on again.
// In later phases (lineup, matches) the running bracket cannot be edited, so the player is only marked as gone and their team plays on by itself. In both cases, when fewer than two
// teams are left, or no human is, the game ends ("ended" phase) and the last team standing wins by forfeit.
export async function giveUp(code, key) {
  const meta = await N.getVal(code, "meta");
  if (!meta || !meta.started || ["lobby", "results", "ended"].includes(meta.phase)) return "not-running";
  const players = (await N.getVal(code, "players")) || {}, me = players[key]; if (!me) return "gone";
  const G = (await N.getVal(code, "game")) || {};
  if (meta.phase === "draft") {
    let back = [], extra = [];
    const L0 = (await N.getVal(code, "ledger")) || {};
    await N.tx(code, "ledger", (L) => { if (!L) return undefined; back = arr((L.rosters || {})[key]).map((x) => x.id); if (L.rosters) delete L.rosters[key]; if (L.balances) delete L.balances[key]; return L; });
    await N.tx(code, "auction", (A) => {
      extra = []; if (!A) return undefined;
      if (!A.resolved) {
        for (const f of ["participants", "eligible", "limits", "skips"]) if (A[f]) delete A[f][key];
        if (A.top && A.top.key === key) A.top = null;   // their bid is gone: the lot goes on without it
        if (A.claim && A.claim.key === key) A.claim = { ...A.claim, declined: true };
        return A;
      }
      if (A.outcome && A.outcome.winner === key && !(L0.applied && L0.applied[A.id])) { extra = [A.animalId]; A.outcome = { ...A.outcome, winner: null, price: 0, kind: "discard" }; return A; }   // sold to them a moment ago: back in the pool too
      return undefined;
    });
    await N.tx(code, "game", (g) => { if (!g) return undefined; g.keys = arr(g.keys).filter((k) => k !== key); g.pool = arr(g.pool).concat(back, extra); return g; });
    await N.del(code, `lineups/${key}`); await N.del(code, `players/${key}`);
    try { await N.sendChat(code, "Game", `${me.name} gave up. ${back.length ? `Their ${back.length} ${back.length === 1 ? "pick is" : "picks are"} back in the pool.` : ""}`.trim(), false); } catch (e) { /* ignore */ }
  } else {
    await N.patch(code, `players/${key}`, { gaveUp: true, online: false });
    try { await N.sendChat(code, "Game", `${me.name} gave up. Their team plays on by itself.`, false); } catch (e) { /* ignore */ }
  }
  await N.put(code, `meta/gaveUp/${key}`, me.name);
  const now = (await N.getVal(code, "players")) || {};
  const left = arr(G.keys).filter((k) => k !== key && now[k] && !now[k].gaveUp), humans = left.filter((k) => !now[k].bot);
  if (left.length < 2 || !humans.length) {
    const winner = left.length === 1 ? left[0] : null;
    await N.patch(code, "", { "meta/phase": "ended", "meta/ended": { reason: winner ? "forfeit" : "empty", winner, winnerName: winner ? now[winner].name : null, by: me.name, t: N.now() } });
    return "ended";
  }
  return "ok";
}

export function startHost({ code, key, animals, pack, mode, onLog = () => {} }) {
  const S = {}; const unsubs = []; let busy = false, stopped = false, loopT, beatT, pruneT, botT;
  const map = new Map(animals.map((a) => [a.id, a]));
  const log = (...a) => { console.log("[host]", ...a); onLog(a.join(" ")); };
  for (const p of ["meta", "players", "spectators", "ledger", "game", "auction", "lineups", "tour", "appeals"]) unsubs.push(N.watch(code, p, (v) => { S[p] = v; }));
  window.__isHost = true; N.keepAwake();
  const settings = () => ({ ...R.DEFAULT_SETTINGS, ...(mode.defaultSettings || {}), filters: defaultFilters(pack), ...((S.meta && S.meta.settings) || {}) });
  const online = () => Object.fromEntries(Object.entries(S.players || {}).map(([k, p]) => [k, !!p.online]));
  const nm = (k) => ((S.players || {})[k] || {}).name || k;
  const an = (id) => (map.get(id) || { name: id }).name;
  const fightSim = (A, B, arena, seed, fleeing) => simulate(A, B, arena, seed, { arenaLabel: arenaOf(pack, arena).label, fleeing });
  const modeHost = mode.createHost ? mode.createHost({ code, S, settings, nm, an, log, map, pack, simulate: fightSim }) : {};

  // ---------- bots (see js/bots.js; the lobby panel is js/bots-ui.js) ----------
  const bots = { plans: new Map(), lot: -1, qt: null, qFor: "", shares: {}, groupOf: null, lastWin: undefined, busy: false, lastSync: 0 };
  const draftMode = !!(mode.phases && mode.phases.includes("draft")) && !mode.noDraft;
  const botEntries = () => Object.entries(S.players || {}).filter(([, p]) => p && p.bot).sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0));
  const isBot = (k) => !!((S.players || {})[k] || {}).bot;
  // Lobby: keep the bots in line with the two lobby switches (Solo mode, Add bots) and with the room's seats. People always come first: when the room is over capacity the newest bot leaves.
  async function botSync() {
    const m = S.meta; if (!m || m.phase !== "lobby" || m.started || !S.players || N.now() - bots.lastSync < 1500) return;
    const s = settings(), have = botEntries(), want = draftMode && (s.solo || s.addBots), humans = Object.values(S.players).filter((p) => p && !p.bot).length;
    const mark = () => { bots.lastSync = N.now(); };
    if (!want) { if (have.length) { mark(); for (const [k] of have) await N.del(code, `players/${k}`); } return; }
    if (!have.length) { const nb = B.nextBot(S.players); mark(); return N.put(code, `players/${nb.key}`, { name: nb.name, joinedAt: N.now(), sid: "bot", appealTokens: 1, online: true, role: "player", bot: nb.bot }); }
    const room = Math.max(0, R.MAX_PLAYERS - humans), keep = s.addBots ? room : Math.min(1, room);
    if (have.length > keep) { mark(); return N.del(code, `players/${have[have.length - 1][0]}`); }
  }
  function botTables(G) {
    if (bots.qFor === G.poolSeed && bots.qt) return;
    const ents = arr(G.pool).map((id) => map.get(id)).filter(Boolean), field = pack.quiz && pack.quiz.groupField;
    bots.groupOf = field ? (a) => (a ? a[field] : null) : null; bots.qt = B.qualityTable(ents); bots.shares = bots.groupOf ? B.groupShares(ents, bots.groupOf) : {}; bots.qFor = G.poolSeed;
  }
  // Draft: every 250 ms each bot looks at the lot on the block and bids, skips or claims according to its plan for it.
  async function botTick() {
    if (stopped || bots.busy) return;
    const m = S.meta; if (!m || m.phase !== "draft") return;
    const A = S.auction, G = S.game, L = S.ledger; if (!A || A.resolved || !G || !L) return;
    const list = botEntries().filter(([k, p]) => p.online && arr(G.keys).includes(k)); if (!list.length) return;
    bots.busy = true;
    try {
      const s = settings(), t = N.now(), ent = map.get(A.animalId); if (!ent) return;
      if (bots.lot !== A.id) { bots.lot = A.id; bots.plans.clear(); }
      botTables(G);
      for (const [k, p] of list) {
        let plan = bots.plans.get(k);
        if (!plan) {
          const ros = rosterOf(k), size = s.rosterSize, bal = A.limits && A.limits[k] !== undefined ? A.limits[k] : (L.balances || {})[k] || 0;
          const need = bots.groupOf ? B.needScore(ent, ros.map((x) => map.get(x.id)).filter(Boolean), bots.shares, bots.groupOf, size) : 0;
          plan = B.planLot({ bot: p.bot, q: bots.qt(ent), need, bal, slotsLeft: Math.max(1, size - ros.length), avg: s.startBalance / size }); bots.plans.set(k, plan);
        }
        const d = B.decide(plan, A, k, t);
        if (!d) continue;
        if (d.type === "bid") await N.bid(code, k, d.amt); else if (d.type === "skip") await N.skip(code, k); else await N.claimFree(code, k);
      }
    } catch (e) { console.warn("[host] bot", e); } finally { bots.busy = false; }
  }
  // a bot that just won a lot sometimes says something in the chat
  function botTalk() {
    const l = (S.ledger || {}).last; if (!l) return;
    if (bots.lastWin === undefined) { bots.lastWin = l.id; return; }   // the first look only learns where the draft is (a new host must not repeat old lines)
    if (l.id === bots.lastWin) return; bots.lastWin = l.id;
    if (l.kind === "win" && l.winner && isBot(l.winner)) { const line = B.winLine(S.players[l.winner].bot); if (line) N.sendChat(code, nm(l.winner), line, false).catch(() => {}); }
  }

  // startGame(): the lobby's Start button. With { rematch: true } (results screen, "Play again: re-draft") only the players who are still online take part.
  async function startGame(opts = {}) {
    if (modeHost.start) return modeHost.start();
    const s = settings(), all = Object.entries(S.players || {}).filter(([, p]) => p.role !== "x").sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0));
    const players = (opts.rematch ? all.filter(([, p]) => p.online) : all).map(([k]) => k);
    if (players.length < 2) throw new Error(opts.rematch ? "Need at least 2 players online to play again" : "Need at least 2 players");
    const f = s.filters || defaultFilters(pack);
    const pool = filterPool(animals, f, pack);
    if (pool.length < minPool(players.length, s.rosterSize)) throw new Error(`Pool too small: ${pool.length} < ${minPool(players.length, s.rosterSize)}`);
    const poolSeed = Math.floor(Math.random() * 4294967296);
    const ids = shuffleSeeded(pool.map((a) => a.id), poolSeed);
    const balances = {}; players.forEach((k) => { balances[k] = s.startBalance; });
    const up = {
      game: { pool: ids, poolSeed, keys: players }, ledger: { balances, drawIndex: 0, stall: 0 },
      auction: null, lineups: null, tour: null, appeals: null, pkb: null, fights: null, "meta/started": true, "meta/phase": nextPhase(mode, "lobby") || "draft"
    };
    if (opts.rematch) for (const k of players) up[`players/${k}/appealTokens`] = 1;   // a fresh game: every player has their appeal again
    await N.patch(code, "", up);
    log(opts.rematch ? "rematch (new draft)" : "game started", ids.length, pack.nouns.plural, "in pool");
  }

  // playAgain("redraft"): a new draft with the same settings. playAgain("same"): keep every manager's drafted roster and submitted lineup and go straight to the mode's game again (new seeds).
  async function playAgain(kind = "redraft") {
    if (stopped) return;
    if (modeHost.start && !modeHost.begin) return modeHost.start();   // quiz: there is no team, "play again" is a fresh plan
    if (!S.meta || S.meta.phase !== "results") throw new Error("A new game can only be started from the results screen.");
    if (kind !== "same") return startGame({ rematch: true });
    const G = S.game || {}, L = S.ledger || {};
    const keys = arr(G.keys).filter((k) => rosterOf(k).length > 0 && ((S.players || {})[k] || {}).online);
    if (keys.length < 2) throw new Error("Need at least 2 players online to play again");
    const lineups = {};
    for (const k of keys) {
      const draft = rosterOf(k).map((x) => x.id), sub = arr(((S.lineups || {})[k] || {}).order);
      lineups[k] = sub.length === draft.length && [...sub].sort().join() === [...draft].sort().join() ? sub : draft;
    }
    const next = nextPhase(mode, "lineup"); if (!next) throw new Error("This mode has no game to repeat.");
    const reset = { tour: null, appeals: null, pkb: null, fights: null, "game/results": null };
    for (const k of keys) reset[`players/${k}/appealTokens`] = 1;
    await N.patch(code, "", reset);
    S.tour = null; S.appeals = null;   // the mirror catches up on its own; modes' begin() must not see the finished game's record
    const ok = modeHost.begin ? await modeHost.begin(next, { keys, lineups }) : true;
    if (!ok) throw new Error("The game could not be restarted.");
    await N.put(code, "meta/phase", next);
    log("rematch (same teams)", keys.length, "players");
  }

  const rosterOf = (k) => arr(((S.ledger || {}).rosters || {})[k]);
  async function applyOutcome(o) {
    const text = o.kind === "win" ? `${nm(o.winner)} won ${an(o.animalId)} for $${o.price}`
      : o.kind === "claim" ? `${nm(o.winner)} claimed ${an(o.animalId)} for free`
      : o.kind === "deal" ? `${an(o.animalId)} dealt to broke player ${nm(o.winner)}`
      : o.kind === "stall" ? `Too many unsold lots in a row: ${an(o.animalId)} goes straight to ${nm(o.winner)} (fewest ${pack.nouns.plural})`
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
    const subs = S.lineups || {}, auto = (k) => { const p = (S.players || {})[k] || {}; return !!(p.bot || p.gaveUp); };   // bots and people who gave up never hold the lineup phase up
    const allIn = keys.every((k) => auto(k) || (subs[k] && subs[k].done));
    if (!allIn && N.now() < G.lineupDeadline) return;
    const lineups = {};
    for (const k of keys) {
      const draft = rosterOf(k).map((x) => x.id), sub = arr((subs[k] || {}).order);
      lineups[k] = sub.length === draft.length && [...sub].sort().join() === [...draft].sort().join() ? sub : isBot(k) ? [...draft].sort((x, y) => B.valueOf(map.get(y)) - B.valueOf(map.get(x))) : draft;   // a bot's team: best first
    }
    const next = nextPhase(mode, "lineup") || "results";
    const ok = modeHost.begin ? await modeHost.begin(next, { keys, lineups }) : true;   // the mode prepares its own state for the next phase
    if (ok) await N.put(code, "meta/phase", next);
  }

  async function step() {
    const phase = S.meta && S.meta.phase; if (!phase) return;
    if (phase === "lobby") return botSync();
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
  botT = setInterval(() => { botTick(); botTalk(); }, 250);

  return {
    startGame,
    ...(modeHost.api || {}),
    playAgain,
    stop() { stopped = true; clearInterval(loopT); clearInterval(beatT); clearInterval(pruneT); clearInterval(botT); unsubs.forEach((u) => u()); window.__isHost = false; }
  };
}
