import * as N from "../../js/net.js";
import { recordGame } from "../../js/gamestats.js";
import { arr } from "../../js/util.js";
import { simulateRace, playbackOf, courseFor, RACE_PRESTART_MS, RACE_END_PAD_MS } from "./race.js";

export function createHost(ctx) {
  const { code, S, settings, nm, log, map, pack } = ctx;
  const tourTx = (fn) => N.tx(code, "tour", (c) => (c && c.kind === "race" ? fn(c) : undefined));
  const committed = (r) => !!(r && r.committed);

  async function begin(phase, { keys, lineups }) {
    if (phase !== "race") return false;
    const race = pack.race;
    if (!race) { log("this category pack has no race section: the Relay Race mode cannot start"); return false; }
    if (S.tour && S.tour.kind === "race") return true;
    const s = settings(), G = S.game || {};
    const teams = keys.map((k) => ({ key: k, name: nm(k), animals: arr(lineups[k]).map((id) => map.get(id)).filter(Boolean) })).filter((t) => t.animals.length > 0);
    if (!teams.length) { log("race: nobody has an animal to race"); return false; }
    const full = courseFor(race, s, G.poolSeed ?? 1);
    const course = full.slice(0, Math.min(full.length, ...teams.map((t) => t.animals.length)));
    const seed = Math.floor(Math.random() * 4294967296), difficulty = s.raceDifficulty;
    const res = simulateRace({ race, course, teams, seed, difficulty });
    const pb = playbackOf(res), startAt = N.now() + RACE_PRESTART_MS;
    const tour = {
      kind: "race", state: "racing", seed, difficulty, keys: teams.map((t) => t.key),
      lineups: Object.fromEntries(teams.map((t) => [t.key, t.animals.map((a) => a.id)])), course,
      startAt, playMs: pb.playMs, durationMs: pb.durationMs, endAt: startAt + pb.playMs + RACE_END_PAD_MS,
      result: { order: res.order, totals: Object.fromEntries(res.teams.map((r) => [r.key, r.total])), best: Object.fromEntries(res.teams.map((r) => [r.key, r.best])), digest: res.digest }
    };
    await N.tx(code, "tour", (c) => (c ? undefined : tour));
    log("race created:", course.map((l) => l.type).join(" > "), "winner", res.order[0]);
    return true;
  }

  async function finish(T) {
    const r = await tourTx((c) => (c.state === "racing" ? { ...c, state: "done" } : undefined));
    if (!committed(r)) return;
    await recordGame({ S, settings, pack, map, nm, keys: T.keys, order: T.result.order, champion: [T.result.order[0]], pairs: [] });
    await N.put(code, "game/results", { order: T.result.order, scores: Object.fromEntries(Object.entries(T.result.totals).map(([k, ms]) => [k, Math.round(ms) / 1000])) });
    await N.put(code, "meta/phase", "results");
    log("race finished, winner", win);
  }

  async function step(phase) {
    if (phase !== "race") return;
    const T = S.tour; if (!T || T.kind !== "race") return;
    if (T.state === "done") return N.put(code, "meta/phase", "results");
    if (T.state === "racing" && N.now() >= T.endAt) return finish(T);
  }

  return { step, begin, api: { finishRace: () => tourTx((c) => (c.state === "racing" ? { ...c, endAt: Math.min(c.endAt, N.now()) } : undefined)) } };
}
