// =====================================================================
// modes/quiz/host.js — host logic of the Silhouette Quiz. Runs only on the current host's device (see js/host.js).
// State (all under rooms/CODE/quiz, replaced as a whole when a game starts; docs/QUIZ_MODE.md has the full layout):
//   plan            the whole game, built once by start(): animals, options, question prompts, the step list
//   cur             { gid, i, start, deadline }: the current step. Server time (N.now()), so slow clients cannot stretch a timer
//   ans/{key}/s{i}  a player's answer { g, t, v?, done? }: written by that player's own client
//   scores/s{i}     frozen grading of question step i { closedAt, r:{key:{v?,p}} } (first writer wins)
//   ident/a{n}      { kind } shown on the "it was a ..." card
//   reveal/a{n}     everything the results card shows for animal n (all answers, real values, sources, running board)
//   final           { order, totals, per }
// Every write is idempotent or a guarded transaction, so a host handover can never double-apply a step.
// =====================================================================
import * as N from "../../js/net.js";
import { arr } from "../../js/util.js";
import * as L from "./logic.js";

const ROOT = new URL("../../", import.meta.url);   // repo root (works on a GitHub project page: relative to this module)

export function createHost(ctx) {
  const { code, S, settings, log, map, pack } = ctx;
  const M = {};   // live mirror of rooms/CODE/quiz/*
  const subs = [];
  for (const p of ["plan", "cur", "scores", "ans"]) {
    subs.push(N.watch(code, "quiz/" + p, (v) => {
      M[p] = v;
      if (window.__isHost === false) { subs.forEach((u) => u()); subs.length = 0; }   // this runner was stopped (startHost has no hook for modes): stop listening
    }));
  }

  // ---------- facts (host only: clients never need them, the host copies what they must see into reveal/) ----------
  let factsP = null, truthP = null;
  const loadFacts = () => factsP || (factsP = (async () => {
    const f = pack.quiz && pack.quiz.facts; if (!f) return null;
    try { const m = await import(new URL(f, ROOT).href); return m.default && typeof m.default === "object" ? m.default : null; }
    catch (e) { console.warn("[quiz] facts file not loaded, using entity data only:", e && e.message); return null; }
  })());
  const getTruth = () => truthP || (truthP = loadFacts().then((facts) => L.makeTruth(pack, map, facts)));

  const plan = () => L.normPlan(M.plan);
  const onlineKeys = () => Object.entries(S.players || {}).filter(([, p]) => p.online && p.role !== "x").sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0)).map(([k]) => k);

  // ---------- start (replaces the draft start; also "Play again") ----------
  async function start() {
    const phase = S.meta && S.meta.phase;
    if (phase && phase !== "lobby" && phase !== "results") return;   // a double click must not restart a running game
    const keys = onlineKeys();
    if (!keys.length) throw new Error("No players are online");
    const facts = await loadFacts();
    const seed = Math.floor(Math.random() * 4294967296), gid = Math.floor(Date.now()).toString(36) + Math.floor(Math.random() * 1e6).toString(36);
    const P = L.buildPlan({ pack, entities: [...map.values()], facts, settings: settings(), keys, seed, gid });
    const t = N.now();
    await N.patch(code, "", {
      quiz: L.clean({ plan: P, cur: { gid, i: 0, start: t, deadline: t + L.stepMs(P, P.steps[0], true) } }),   // replaces any previous game's answers and scores
      game: { keys }, "meta/phase": "quiz"
    });
    log("quiz started:", P.animals.length, pack.nouns.plural, P.steps.length, "steps,", keys.length, "players");
  }

  // ---------- one tick ----------
  const allDone = (P, i) => {
    const on = P.keys.filter((k) => (S.players || {})[k] && S.players[k].online);
    return on.length > 0 && on.every((k) => { const d = M.ans && M.ans[k] && M.ans[k][L.sk(i)]; return d && d.g === P.gid && d.done; });
  };
  async function step(phase) {
    if (phase !== "quiz") return;
    const P = plan(), cur = M.cur;
    if (!P || !cur || cur.gid !== P.gid) return;
    const i = cur.i, st = P.steps[i], t = N.now();
    if (!st) return finish(P);
    if (L.isQuestion(st)) {
      if (!(M.scores && M.scores[L.sk(i)])) {   // not graded yet
        if (t < cur.deadline + L.GRACE_MS && !allDone(P, i)) return;
        return closeStep(P, cur, i);            // the next tick moves on
      }
    } else if (t < cur.deadline) return;
    return advance(P, cur);
  }

  async function closeStep(P, cur, i) {
    const truth = await getTruth();
    const all = (await N.getVal(code, "quiz/ans")) || {};
    const row = {}; for (const k of P.keys) row[k] = all[k] && all[k][L.sk(i)];
    const r = L.gradeStep(P, i, row, truth, { gid: P.gid, cutoff: cur.deadline + L.GRACE_MS });
    const doc = L.clean({ closedAt: N.now(), r });
    await N.tx(code, `quiz/scores/${L.sk(i)}`, (c) => (c ? undefined : doc));
  }

  // Data a card needs is written BEFORE cur points at it, so a client never sees a card without its data.
  async function writeInfo(P, st) {
    const truth = await getTruth();
    if (st.t === "ident") await N.put(code, `quiz/ident/${L.ak(st.a)}`, L.clean({ kind: truth.kind(P.animals[st.a].id) || "" }));
    else if (st.t === "reveal") {
      const scores = (await N.getVal(code, "quiz/scores")) || {};
      await N.put(code, `quiz/reveal/${L.ak(st.a)}`, L.buildReveal(P, st.a, scores, truth));
    }
  }
  async function advance(P, cur) {
    const ni = cur.i + 1;
    if (ni >= P.steps.length) return finish(P);
    const nx = P.steps[ni];
    if (nx.t === "ident" || nx.t === "reveal") await writeInfo(P, nx);
    const dur = L.stepMs(P, nx, false);
    await N.tx(code, "quiz/cur", (c) => {
      if (!c || c.gid !== cur.gid || c.i !== cur.i) return undefined;   // someone else already advanced
      const t = N.now(); return { gid: c.gid, i: ni, start: t, deadline: t + dur };
    });
  }
  async function finish(P) {
    const scores = (await N.getVal(code, "quiz/scores")) || {};
    const fin = L.buildFinal(P, scores);
    await N.patch(code, "", { "quiz/final": fin, "game/results": { order: fin.order, scores: fin.totals } });   // game/results = the shared results contract
    await N.tx(code, "meta/phase", (c) => (c === "quiz" ? "results" : undefined));
    log("quiz finished");
  }

  // Host-only "Next" button on ident / reveal cards: pull the deadline to now (the next tick advances).
  async function skip() {
    const P = plan(), cur = M.cur; if (!P || !cur) return;
    await N.tx(code, "quiz/cur", (c) => {
      if (!c || c.gid !== cur.gid) return undefined;
      const st = P.steps[c.i]; if (!st || L.isQuestion(st)) return undefined;
      return { ...c, deadline: N.now() };
    });
  }

  return { step, start, api: { playAgain: start, skip } };
}