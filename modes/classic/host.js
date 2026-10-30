import * as R from "../../js/rules.js";
import * as N from "../../js/net.js";
import { arr, hash, shuffleSeeded } from "../../js/util.js";
import { digestOf, fingerprint as fingerprintOf } from "../../js/fingerprint.js";
import { simulate } from "../../js/sim.js";

export { digestOf };

export async function aiNarrate({ fightId, teams, events, autopsy }) { return null; }

export function fingerprint(entityMap, pack) {
  const ids = pack ? pack.arenas.map((a) => a.id) : [...new Set([...entityMap.values()].flatMap((a) => Object.keys(a.arena_bonus || {})))];
  return fingerprintOf(entityMap, ids, pack && pack.fingerprintIds, simulate);
}

export async function aiJudgeAppeal({ appeal, fight, pack, entityMap }) {
  if (!R.AI_PROXY_URL) return { error: "no judge is configured" };
  const text = (v) => arr(v).map((c) => (c && c.text) || "").join(" ").trim();
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), R.AI_JUDGE_TIMEOUT_MS);
  try {
    const r = await fetch(R.AI_PROXY_URL, { method: "POST", signal: ctl.signal, headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pack: pack.id, teamA: arr(fight.teamA).map((a) => a.id), teamB: arr(fight.teamB).map((a) => a.id), arena: fight.arena, seed: fight.seed, fleeing: fight.fleeing !== false,
        appellant: fight.final.winner === "A" ? "B" : "A", claimedDigest: fight.result.digest, fingerprint: fingerprint(entityMap, pack),
        appeal: text(appeal.claims), rebuttal: text(appeal.rebuttal)
      }) });
    const j = await r.json().catch(() => null);
    if (!j || !j.ok) return { error: (j && j.error) || `the judge answered ${r.status}` };
    return j;
  } catch (e) { return { error: e && e.name === "AbortError" ? "the judge took too long" : "the judge could not be reached" }; }
  finally { clearTimeout(timer); }
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
    const a = pool.shift(); let j = pool.findIndex((x) => !played.has(a + "|" + x)); if (j < 0) j = 0;
    matches.push({ a, b: pool.splice(j, 1)[0] });
  }
  return matches;
}

export function advance(tour) {
  tour = JSON.parse(JSON.stringify(tour));
  tour.fights = tour.fights || {}; tour.labels = tour.labels || {}; tour.byes = tour.byes || [];
  for (let guard = 0; guard < 10; guard++) {
    const ms = arr(tour.rounds[tour.round]);
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


export function createHost(ctx) {
  const { code, S, settings, nm, an, log, map, pack } = ctx;
  const sim = {}; let aiBusy = {};
  const arenaIds = pack.arenas.map((a) => a.id);
  const simulate = ctx.simulate;

  async function begin(phase, { keys, lineups }) {
    if (phase !== "tournament") return false;
    const tour = makeTour(keys, lineups, Math.floor(Math.random() * 4294967296));
    const ok = await N.tx(code, "tour", (c) => (c ? undefined : tour));
    log("tournament created:", tour.format);
    return ok;
  }

  const tourTx = (fn) => N.tx(code, "tour", (c) => (c ? fn(c) : undefined));
  const teamOf = (tour, k) => arr(tour.lineups[k]).map((id) => map.get(id)).filter(Boolean);

  async function startNextFight() {
    const T = S.tour; if (!T || T.state !== "awaitNext") return;
    const arena = arenaIds[Math.floor(Math.random() * arenaIds.length)], seed = Math.floor(Math.random() * 4294967296), startAt = N.now() + R.FIGHT_PRESTART_MS;
    await tourTx((c) => {
      if (c.state !== "awaitNext") return undefined;
      const { tour, pick } = advance(c);
      if (!pick) { tour.state = "finishing"; return tour; }
      const m = tour.rounds[pick.ri][pick.mi], id = "f" + (++tour.seq);
      tour.fights[id] = { id, a: m.a, b: m.b, label: tour.labels[pick.ri] || "Fight", round: pick.ri, arena, seed, startAt, status: "playing", fleeing: settings().animalFleeing === true,   // frozen per fight: every device simulates it with the same rule
        teamA: teamOf(tour, m.a), teamB: teamOf(tour, m.b) };
      m.fightId = id; tour.state = "playing"; tour.currentFight = id; return tour;
    });
  }
  const fightDigest = (f) => {
    if (!sim[f.id]) sim[f.id] = simulate(f.teamA, f.teamB, f.arena, f.seed, f.fleeing);
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
      if (cf.replayOf) {
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
    if (a.status === "ai") {
      if (t > (a.deadline || 0)) return afterCheck(fid, f, winnerKey, { error: "the judge did not answer in time" });
      return;
    }
    if (a.status === "resolved") return a.applied ? settle() : applyAppealOutcome(fid, f, a, s);
  }

  async function judge(fid, f, a, s, winnerKey) {
    if (R.AI_PROXY_URL) {
      const ok = await setAppeal(fid, (c) => (c.status === "rebuttal" ? { ...c, status: "ai", deadline: N.now() + R.AI_STAGE_MS } : undefined));
      if (!ok) return;
      let res; try { res = await aiJudgeAppeal({ appeal: a, fight: f, pack, entityMap: map }); } catch (e) { res = { error: "the judge failed" }; }
      return afterCheck(fid, f, winnerKey, res);
    }
    return nextStage(fid, winnerKey, null);
  }
  const OBJECTIVE = ["integrity_failure", "engine_violation"];
  function afterCheck(fid, f, winnerKey, res) {
    const good = res && res.ok;
    const verdict = good
      ? { ai: !!res.ai, grounds: res.grounds, summary: res.summary || "", claims: res.claims || [], violations: res.violations || [], aiError: res.aiError || null }
      : { ai: false, grounds: "unavailable", summary: "", claims: [], error: String((res && res.error) || "no answer") };
    if (good && OBJECTIVE.includes(res.grounds))
      return setAppeal(fid, (c) => (c.status === "ai" ? { ...c, status: "resolved", upheld: true, via: "judge", outcome: "rematch", forced: true, verdict } : undefined));
    return nextStage(fid, winnerKey, verdict);
  }

  function nextStage(fid, winnerKey, verdict) {
    const s = settings(), mode = s.judgeMode, f = ((S.tour || {}).fights || {})[fid] || {};
    const inFight = new Set([f.a, f.b]), voters = {};
    Object.entries(S.players || {}).forEach(([k, p]) => { if (!inFight.has(k) && p.online) voters[k] = true; });
    if (s.spectatorVoting) Object.keys(S.spectators || {}).forEach((id) => { voters[id] = true; });
    const toVote = (mode === "vote" || mode === "auto") && Object.keys(voters).length >= 2, from = ["rebuttal", "ai"], extra = verdict ? { verdict } : {};
    if (toVote) return setAppeal(fid, (c) => (from.includes(c.status) ? { ...c, ...extra, status: "voting", voters, votes: {}, deadline: N.now() + R.VOTE_MS } : undefined));
    return setAppeal(fid, (c) => (from.includes(c.status) ? { ...c, ...extra, status: "rematch", deadline: N.now() + R.REMATCH_MS, winner: winnerKey } : undefined));
  }

  const finishAppeal = (fid, upheld, via) => setAppeal(fid, (c) =>
    (["voting", "rematch", "ai", "rebuttal"].includes(c.status) ? { ...c, status: "resolved", upheld, via, outcome: upheld ? "rematch" : "rejected" } : undefined));

  async function applyAppealOutcome(fid, f, a, s) {
    if (!a.upheld) { await setAppeal(fid, (c) => ({ ...c, applied: true })); return settle(); }
    const seed = Math.floor(Math.random() * 4294967296), startAt = N.now() + R.FIGHT_PRESTART_MS;
    await tourTx((c) => {
      if (c.state !== "appeal" || c.currentFight !== fid) return undefined;
      const o = c.fights[fid], id = "f" + (++c.seq);
      c.fights[id] = { id, a: o.a, b: o.b, label: "Rematch (appeal)", round: o.round, arena: o.arena, seed, startAt, status: "playing", replayOf: fid, fleeing: o.fleeing, teamA: o.teamA, teamB: o.teamB };
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


  async function step(phase) {
    if (phase !== "tournament") return;
    const T = S.tour; if (!T) return;
    if (T.state === "awaitNext") { if (N.now() >= (T.nextAt || 0)) return startNextFight(); return; }
    if (T.state === "playing") return playingStep();
    if (T.state === "appeal") return appealStep();
    if (T.state === "finishing") return finishTournament();
  }
  return { step, begin, api: { nextFight: () => tourTx((c) => (c.state === "awaitNext" ? { ...c, nextAt: 0 } : undefined)) } };
}
