// =====================================================================
// host.js — host-authoritative game logic. Only the current host's device runs startHost().
// Every state change is a guarded transaction, so a host handover can never double-apply anything:
//   * auctions resolve in two idempotent steps: (1) auction.resolved+outcome (tx on auction),
//     (2) apply to ledger keyed by auction id (tx on ledger, ledger.applied[id]).
//   * tournament changes are transactions on the tour node, guarded by tour.state.
// =====================================================================
import * as R from "./rules.js";
import * as N from "./net.js";
import { simulate, mulberry32 } from "./sim.js";
import { ANIMAL_MAP } from "./animals.js";

// ---------- AI hooks (STUBS: implemented later by a separate prompt) ----------
export async function aiNarrate({ fightId, teams, events, autopsy }) { return null; }
// Rule for later: the loser wins the appeal only with a strictly higher score.
export async function aiJudgeAppeal({ appeal, fight, animals }) { return null; }

// ---------- pure helpers (also used by the lobby UI) ----------
export function filterPool(animals, f) {
  const hab = new Set(f.habitats || []), cls = new Set(f.classes || []), ex = new Set(f.excluded || []);
  const lo = f.massMin ?? 0, hi = f.massMax ?? Infinity;
  return animals.filter((a) => !ex.has(a.id) && cls.has(a.class) && (a.habitats || []).some((h) => hab.has(h)) && a.mass_kg >= lo && a.mass_kg <= hi);
}
export const minPool = (players, roster) => players * roster + R.POOL_MARGIN;
export function shuffleSeeded(arr, seed) {
  const r = mulberry32(seed >>> 0), a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const hash = (s, seed) => { let h = (seed >>> 0) ^ 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
const arr = (v) => (Array.isArray(v) ? v : v ? Object.values(v) : []);

// Should this device try to claim host? (lowest joinedAt among online players, never the stale host, never spectators)
export function shouldClaimHost({ players, host, myKey }) {
  const t = N.now();
  if (host && host.hb && t - host.hb < R.HOST_STALE_MS) return false;
  const cand = Object.entries(players || {}).filter(([k, p]) => p.online && k !== (host && host.key)).sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0));
  return cand.length > 0 && cand[0][0] === myKey;
}

// Pure auction decision from a snapshot. Used both to decide and inside the transaction to re-validate.
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

export function roundRobin(keys) {
  const k = keys.slice(); if (k.length % 2) k.push(null);
  const n = k.length, rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const m = [];
    for (let i = 0; i < n / 2; i++) { const a = k[i], b = k[n - 1 - i]; if (a && b) m.push({ a, b }); else m.push({ a: a || b, bye: true }); }
    rounds.push(m); k.splice(1, 0, k.pop());
  }
  return rounds;
}

// points / survivors / head-to-head / seeded random
export function computeStandings(keys, tour) {
  const pts = {}, surv = {}, h2h = {};
  keys.forEach((k) => { pts[k] = 0; surv[k] = 0; h2h[k] = {}; });
  for (const k of arr(tour.byes)) if (pts[k] !== undefined) pts[k] += R.POINTS.win;
  for (const f of Object.values(tour.fights || {})) {
    if (!f.final || f.replayOf) continue;
    const w = f.final.winner, s = f.final.survivors || { A: 0, B: 0 };
    const pa = w === "A" ? R.POINTS.win : w === "draw" ? R.POINTS.draw : R.POINTS.loss;
    const pb = w === "B" ? R.POINTS.win : w === "draw" ? R.POINTS.draw : R.POINTS.loss;
    pts[f.a] += pa; pts[f.b] += pb; surv[f.a] += s.A; surv[f.b] += s.B;
    h2h[f.a][f.b] = (h2h[f.a][f.b] || 0) + pa; h2h[f.b][f.a] = (h2h[f.b][f.a] || 0) + pb;
  }
  const order = keys.slice().sort((a, b) =>
    pts[b] - pts[a] || surv[b] - surv[a] || ((h2h[b][a] || 0) - (h2h[a][b] || 0)) || hash(b, tour.seed) - hash(a, tour.seed));
  return { order, pts, surv };
}

function pairSwiss(tour, roundIdx) {
  let order;
  if (roundIdx === 0) order = shuffleSeeded(tour.keys, tour.seed + 1);
  else { const s = computeStandings(tour.keys, tour); order = s.order; }
  const played = new Set();
  for (const f of Object.values(tour.fights || {})) if (!f.replayOf) { played.add(f.a + "|" + f.b); played.add(f.b + "|" + f.a); }
  const byes = new Set(arr(tour.byes)), pool = order.slice(), matches = [];
  if (pool.length % 2) {
    let i = pool.length - 1; while (i > 0 && byes.has(pool[i])) i--;
    const [b] = pool.splice(i, 1); matches.push({ a: b, bye: true });
  }
  while (pool.length) {
    const a = pool.shift(); let j = pool.findIndex((x) => !played.has(a + "|" + x)); if (j < 0) j = 0; // fallback: rematch if unavoidable
    matches.push({ a, b: pool.splice(j, 1)[0] });
  }
  return matches;
}

// advance the schedule to the next unplayed match; returns {tour, pick:{ri,mi}|null}; pick null + tour.done when over
export function advance(tour) {
  tour = JSON.parse(JSON.stringify(tour));
  // Firebase RTDB drops empty objects/arrays, so these come back undefined until first used
  tour.fights = tour.fights || {}; tour.labels = tour.labels || {}; tour.byes = tour.byes || [];
  for (let guard = 0; guard < 10; guard++) {
    const ms = arr(tour.rounds[tour.round]);
    // register byes of the current round once
    ms.forEach((m) => { if (m.bye && !m.counted) { m.counted = true; tour.byes = arr(tour.byes).concat([m.a]); } });
    tour.rounds[tour.round] = ms;
    const mi = ms.findIndex((m) => !m.bye && !m.fightId);
    if (mi >= 0) return { tour, pick: { ri: tour.round, mi } };
    if (tour.format === "single") { tour.done = true; return { tour, pick: null }; }
    if (tour.format === "roundrobin") {
      if (tour.round + 1 >= tour.rr.length) { tour.done = true; return { tour, pick: null }; }
      tour.round++; tour.rounds[tour.round] = tour.rr[tour.round]; tour.labels[tour.round] = `Round ${tour.round + 1}`; continue;
    }
    // swiss
    if (tour.round < R.SWISS_ROUNDS - 1) { tour.round++; tour.rounds[tour.round] = pairSwiss(tour, tour.round); tour.labels[tour.round] = `Swiss round ${tour.round + 1}`; continue; }
    if (tour.round === R.SWISS_ROUNDS - 1) {
      const top = computeStandings(tour.keys, tour).order.slice(0, 2);
      tour.round++; tour.rounds[tour.round] = [{ a: top[0], b: top[1] }]; tour.labels[tour.round] = "Final"; continue;
    }
    tour.done = true; return { tour, pick: null };
  }
  tour.done = true; return { tour, pick: null };
}

export function makeTour(keys, lineups, seed) {
  const n = keys.length;
  const base = { keys, lineups, seed, byes: [], fights: {}, seq: 0, round: 0, labels: {}, state: "awaitNext", nextAt: N.now() + 3000 /* first fight starts on its own */ };
  if (n < 2) return { ...base, format: "none", rounds: { 0: [] }, done: true, state: "finishing" };
  if (n === 2) return { ...base, format: "single", rounds: { 0: [{ a: keys[0], b: keys[1] }] }, labels: { 0: "Final" } };
  if (n <= 4) { const rr = roundRobin(keys); return { ...base, format: "roundrobin", rr, rounds: { 0: rr[0] }, labels: { 0: "Round 1" } }; }
  const t = { ...base, format: "swiss", rounds: {}, labels: { 0: "Swiss round 1" } };
  t.rounds[0] = pairSwiss(t, 0); return t;
}

export const flipFinal = (r) => ({ winner: r.winner === "A" ? "B" : r.winner === "B" ? "A" : "draw", survivors: { A: r.survivors.B, B: r.survivors.A } });
export const digestOf = (res) => `${res.winner}:${res.events.length}:${res.events[res.events.length - 1].id}:${res.survivors.A}-${res.survivors.B}`;

// =====================================================================
export function startHost({ code, key, animals, onLog = () => {} }) {
  const S = {}; const unsubs = []; const sim = {}; let busy = false, stopped = false, loopT, beatT, pruneT, aiBusy = {};
  const log = (...a) => { console.log("[host]", ...a); onLog(a.join(" ")); };
  for (const p of ["meta", "players", "spectators", "ledger", "game", "auction", "lineups", "tour", "appeals"]) unsubs.push(N.watch(code, p, (v) => { S[p] = v; }));
  window.__isHost = true; N.keepAwake();
  const settings = () => ({ ...R.DEFAULT_SETTINGS, ...((S.meta && S.meta.settings) || {}) });
  const online = () => Object.fromEntries(Object.entries(S.players || {}).map(([k, p]) => [k, !!p.online]));

  // ---------- lobby -> draft ----------
  async function startGame() {
    const s = settings(), players = Object.entries(S.players || {}).filter(([, p]) => p.role !== "x").sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0)).map(([k]) => k);
    if (players.length < 2) throw new Error("Need at least 2 players");
    const f = s.filters || R.DEFAULT_SETTINGS.filters;
    const pool = filterPool(animals, f);
    if (pool.length < minPool(players.length, s.rosterSize)) throw new Error(`Pool too small: ${pool.length} < ${minPool(players.length, s.rosterSize)}`);
    const poolSeed = Math.floor(Math.random() * 4294967296);
    const ids = shuffleSeeded(pool.map((a) => a.id), poolSeed);
    const balances = {}; players.forEach((k) => { balances[k] = s.startBalance; });
    await N.patch(code, "", {
      game: { pool: ids, poolSeed, keys: players }, ledger: { balances, drawIndex: 0, stall: 0 },
      auction: null, lineups: null, tour: null, appeals: null, "meta/phase": "draft"
    });
    log("game started", ids.length, "animals in pool");
  }

  // ---------- draft ----------
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
  const nm = (k) => ((S.players || {})[k] || {}).name || k;
  const an = (id) => (ANIMAL_MAP.get(id) || { name: id }).name;

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
    if ((L.stall || 0) >= R.STALL_LIMIT) return applyOutcome({ id: idx, animalId, winner: fewest(part), price: 0, kind: "stall" });
    const t = N.now();
    await N.tx(code, "auction", (cur) => {
      if (cur && cur.id >= idx) return undefined;
      return { id: idx, animalId, status: "bidding", deadline: t + s.auctionSeconds * 1000, top: null, skips: {}, claim: null, resolved: false,
        participants: Object.fromEntries(part.map((k) => [k, true])), eligible: Object.fromEntries(nonBroke.map((k) => [k, true])),
        limits: Object.fromEntries(nonBroke.map((k) => [k, bal[k] || 0])) };
    });
  }
  async function endDraft() {
    const r = await N.tx(code, "meta/phase", (c) => (c === "draft" ? "lineup" : undefined));
    if (r) await N.put(code, "game/lineupDeadline", N.now() + R.LINEUP_MS);
    log("draft finished");
  }

  // ---------- lineup -> tournament ----------
  async function lineupStep() {
    const G = S.game; if (!G) return;
    if (!G.lineupDeadline) return N.tx(code, "game/lineupDeadline", (c) => c || N.now() + R.LINEUP_MS);
    const keys = G.keys.filter((k) => rosterOf(k).length > 0);
    const subs = S.lineups || {};
    const allIn = keys.every((k) => subs[k] && subs[k].done);
    if (!allIn && N.now() < G.lineupDeadline) return;
    const lineups = {};
    for (const k of keys) {
      const draft = rosterOf(k).map((x) => x.id), sub = arr((subs[k] || {}).order);
      lineups[k] = sub.length === draft.length && [...sub].sort().join() === [...draft].sort().join() ? sub : draft;
    }
    const tour = makeTour(keys, lineups, Math.floor(Math.random() * 4294967296));
    const ok = await N.tx(code, "tour", (c) => (c ? undefined : tour));
    if (ok) await N.put(code, "meta/phase", "tournament");
    log("tournament created:", tour.format);
  }

  // ---------- tournament ----------
  const tourTx = (fn) => N.tx(code, "tour", (c) => (c ? fn(c) : undefined));
  const teamOf = (tour, k) => arr(tour.lineups[k]).map((id) => ANIMAL_MAP.get(id)).filter(Boolean);

  async function startNextFight() {
    const T = S.tour; if (!T || T.state !== "awaitNext") return;
    const arena = R.ARENAS[Math.floor(Math.random() * R.ARENAS.length)], seed = Math.floor(Math.random() * 4294967296), startAt = N.now() + R.FIGHT_PRESTART_MS;
    await tourTx((c) => {
      if (c.state !== "awaitNext") return undefined;
      const { tour, pick } = advance(c);
      if (!pick) { tour.state = "finishing"; return tour; }
      const m = tour.rounds[pick.ri][pick.mi], id = "f" + (++tour.seq);
      tour.fights[id] = { id, a: m.a, b: m.b, label: tour.labels[pick.ri] || "Fight", round: pick.ri, arena, seed, startAt, status: "playing",
        teamA: teamOf(tour, m.a), teamB: teamOf(tour, m.b) };
      m.fightId = id; tour.state = "playing"; tour.currentFight = id; return tour;
    });
  }
  const fightDigest = (f) => {
    if (!sim[f.id]) sim[f.id] = simulate(f.teamA, f.teamB, f.arena, f.seed);
    return sim[f.id];
  };
  async function playingStep() {
    const T = S.tour, f = T.fights[T.currentFight]; if (!f) return;
    const res = fightDigest(f);
    if (!f.result) {
      await N.tx(code, `tour/fights/${f.id}/result`, (c) => c || { winner: res.winner, survivors: res.survivors, ticks: res.ticks, digest: digestOf(res) });
      if (R.AI_PROXY_URL && !aiBusy[f.id]) {
        aiBusy[f.id] = true;
        aiNarrate({ fightId: f.id, teams: { A: f.teamA, B: f.teamB }, events: res.events, autopsy: res.autopsy })
          .then((n) => n && N.put(code, `fights/${f.id}/narration`, n)).catch((e) => console.warn("narrate", e));
      }
      return;
    }
    if (N.now() < f.startAt + R.revealDelay(res.events.length)) return;
    const players = S.players || {};
    await tourTx((c) => {
      if (c.state !== "playing" || c.currentFight !== f.id) return undefined;
      const cf = c.fights[f.id];
      if (cf.replayOf) { // replay result replaces the original
        const o = c.fights[cf.replayOf]; o.final = { winner: cf.result.winner, survivors: cf.result.survivors }; o.replayed = true;
        cf.final = o.final; cf.status = "done"; c.state = "awaitNext"; c.nextAt = N.now() + R.NEXT_FIGHT_IDLE_MS; c.currentFight = null; return c;
      }
      cf.final = { winner: cf.result.winner, survivors: cf.result.survivors }; cf.status = "done";
      const loserKey = cf.result.winner === "A" ? cf.b : cf.result.winner === "B" ? cf.a : null;
      if (loserKey && ((players[loserKey] || {}).appealTokens || 0) > 0) { c.state = "appeal"; c.appealBy = loserKey; return c; }
      c.state = "awaitNext"; c.nextAt = N.now() + R.NEXT_FIGHT_IDLE_MS; c.currentFight = null; return c;
    }).then(async () => {
      const t2 = (await N.getVal(code, "tour"));
      if (t2 && t2.state === "appeal" && t2.currentFight === f.id) {
        await N.tx(code, `appeals/${f.id}`, (a) => a || { status: "open", by: t2.appealBy, deadline: N.now() + R.APPEAL_DECIDE_MS });
      }
    });
  }

  const settle = () => tourTx((c) => { if (c.state !== "appeal") return undefined; c.state = "awaitNext"; c.nextAt = N.now() + R.NEXT_FIGHT_IDLE_MS; c.currentFight = null; return c; });
  const setAppeal = (fid, fn) => N.tx(code, `appeals/${fid}`, (a) => (a ? fn(a) : undefined));

  async function appealStep() {
    const T = S.tour, fid = T.currentFight, f = T.fights[fid], a = (S.appeals || {})[fid]; if (!f) return;
    if (!a) return N.tx(code, `appeals/${fid}`, (c) => c || { status: "open", by: T.appealBy, deadline: N.now() + R.APPEAL_DECIDE_MS });
    const t = N.now(), s = settings();
    const winnerKey = f.final.winner === "A" ? f.a : f.b;
    if (a.status === "open") { if (t > a.deadline) { await setAppeal(fid, (c) => (c.status === "open" ? { ...c, status: "waived" } : undefined)); } return; }
    if (a.status === "waived") return settle();
    if (a.status === "submitted") {
      await N.put(code, `players/${a.by}/appealTokens`, 0);
      return setAppeal(fid, (c) => (c.status === "submitted" ? { ...c, status: "rebuttal", deadline: N.now() + R.REBUTTAL_MS } : undefined));
    }
    if (a.status === "rebuttal") {
      if (a.rebutDone || t > a.deadline) return judge(fid, f, a, s, winnerKey);
      return;
    }
    if (a.status === "voting") {
      const voters = Object.keys(a.voters || {}), votes = a.votes || {};
      if (t > a.deadline || voters.every((v) => votes[v] !== undefined)) {
        const yes = voters.filter((v) => votes[v] === true).length, no = voters.filter((v) => votes[v] === false).length;
        return finishAppeal(fid, yes > no, "vote");
      }
      return;
    }
    if (a.status === "rematch") {
      if (a.response === "accept") return finishAppeal(fid, true, "accepted");
      if (a.response === "decline" || t > a.deadline) return finishAppeal(fid, false, "declined");
      return;
    }
    if (a.status === "ai" ) return; // aiJudge in flight (handled in judge())
    if (a.status === "resolved") return a.applied ? settle() : applyAppealOutcome(fid, f, a, s);
  }

  async function judge(fid, f, a, s, winnerKey) {
    const mode = s.judgeMode;
    const inFight = new Set([f.a, f.b]);
    const voters = {};
    Object.entries(S.players || {}).forEach(([k, p]) => { if (!inFight.has(k) && p.online) voters[k] = true; });
    if (s.spectatorVoting) Object.keys(S.spectators || {}).forEach((id) => { voters[id] = true; });
    const nv = Object.keys(voters).length;
    const toVote = (mode === "vote" || mode === "auto") && nv >= 2;
    if (toVote) return setAppeal(fid, (c) => (c.status === "rebuttal" ? { ...c, status: "voting", voters, votes: {}, deadline: N.now() + R.VOTE_MS } : undefined));
    const toAi = mode === "ai" || mode === "auto";
    if (toAi && R.AI_PROXY_URL) {
      const ok = await setAppeal(fid, (c) => (c.status === "rebuttal" ? { ...c, status: "ai" } : undefined));
      if (!ok) return;
      let res = null; try { res = await aiJudgeAppeal({ appeal: a, fight: f, animals: [...f.teamA, ...f.teamB] }); } catch (e) { console.warn("aiJudge", e); }
      if (res && typeof res.winnerScore === "number") {
        await N.put(code, `appeals/${fid}/verdicts`, res.verdicts || []);
        return finishAppeal(fid, res.loserScore > res.winnerScore, "ai", "ai");
      }
    }
    return setAppeal(fid, (c) => (c.status === "rebuttal" || c.status === "ai" ? { ...c, status: "rematch", deadline: N.now() + R.REMATCH_MS, winner: winnerKey } : undefined));
  }

  const finishAppeal = (fid, upheld, via, from) => setAppeal(fid, (c) =>
    (["voting", "rematch", "ai", "rebuttal"].includes(c.status) ? { ...c, status: "resolved", upheld, via, outcome: upheld ? settings().appealOutcome : "rejected" } : undefined));

  async function applyAppealOutcome(fid, f, a, s) {
    if (!a.upheld) { await setAppeal(fid, (c) => ({ ...c, applied: true })); return settle(); }
    if (a.outcome === "flip") {
      await tourTx((c) => { if (c.state !== "appeal") return undefined; const o = c.fights[fid]; o.final = flipFinal(o.result); o.flipped = true; return c; });
      await setAppeal(fid, (c) => ({ ...c, applied: true })); return settle();
    }
    // rematch: replay with a new seed and the same lineups; the replay result replaces the original in standings
    const seed = Math.floor(Math.random() * 4294967296), startAt = N.now() + R.FIGHT_PRESTART_MS;
    await tourTx((c) => {
      if (c.state !== "appeal" || c.currentFight !== fid) return undefined;
      const o = c.fights[fid], id = "f" + (++c.seq);
      c.fights[id] = { id, a: o.a, b: o.b, label: "Rematch (appeal)", round: o.round, arena: o.arena, seed, startAt, status: "playing", replayOf: fid, teamA: o.teamA, teamB: o.teamB };
      c.state = "playing"; c.currentFight = id; return c;
    });
    await setAppeal(fid, (c) => ({ ...c, applied: true }));
  }

  async function finishTournament() {
    const T = S.tour; if (!T || T.state !== "finishing") return;
    const st = T.format === "none" ? { order: [], pts: {}, surv: {} } : computeStandings(T.keys, T);
    let champion = [];
    if (T.format === "single") { const f = Object.values(T.fights)[0]; champion = !f || !f.final ? [] : f.final.winner === "A" ? [f.a] : f.final.winner === "B" ? [f.b] : [f.a, f.b]; }
    else if (T.format === "swiss") { const f = Object.values(T.fights).filter((x) => !x.replayOf && x.label === "Final")[0]; champion = f && f.final ? (f.final.winner === "A" ? [f.a] : f.final.winner === "B" ? [f.b] : [f.a, f.b]) : st.order.slice(0, 1); }
    else champion = st.order.slice(0, 1);
    const ok = await tourTx((c) => (c.state === "finishing" ? { ...c, state: "done", results: { order: st.order, pts: st.pts, surv: st.surv, champion } } : undefined));
    if (!ok) return;
    const L = S.ledger || {};
    for (const k of T.keys) {
      const d = { games_played: 1, fights_won: 0, fights_lost: 0, fights_drawn: 0, tournaments_won: champion.includes(k) ? 1 : 0, animals_drafted: arr((L.rosters || {})[k]).length };
      for (const f of Object.values(T.fights)) {
        if (f.replayOf || !f.final || (f.a !== k && f.b !== k)) continue;
        const me = f.a === k ? "A" : "B"; if (f.final.winner === "draw") d.fights_drawn++; else if (f.final.winner === me) d.fights_won++; else d.fights_lost++;
      }
      try { await N.bumpStats(k, nm(k), d); } catch (e) { console.warn("stats", e); }
    }
    await N.put(code, "meta/phase", "results"); log("tournament finished");
  }

  // ---------- main loop ----------
  async function step() {
    const phase = S.meta && S.meta.phase; if (!phase) return;
    if (phase === "draft") return draftStep();
    if (phase === "lineup") return lineupStep();
    if (phase === "tournament") {
      const T = S.tour; if (!T) return;
      if (T.state === "awaitNext") { if (N.now() >= (T.nextAt || 0)) return startNextFight(); return; }
      if (T.state === "playing") return playingStep();
      if (T.state === "appeal") return appealStep();
      if (T.state === "finishing") return finishTournament();
    }
  }
  loopT = setInterval(async () => {
    if (busy || stopped) return; busy = true;
    try { await step(); } catch (e) { console.warn("[host] step failed", e); } finally { busy = false; }
  }, 600);
  beatT = setInterval(() => N.beat(code, key).catch(() => {}), R.HEARTBEAT_MS); N.beat(code, key).catch(() => {});
  pruneT = setInterval(() => N.pruneChat(code).catch(() => {}), 30000);

  return {
    startGame,
    nextFight: () => tourTx((c) => (c.state === "awaitNext" ? { ...c, nextAt: 0 } : undefined)),
    stop() { stopped = true; clearInterval(loopT); clearInterval(beatT); clearInterval(pruneT); unsubs.forEach((u) => u()); window.__isHost = false; }
  };
}