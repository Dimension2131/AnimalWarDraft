// modes/football/bracket.js: knockout bracket for the Football War Draft (pure logic, no DOM, no network).
// 2 managers: one final. 3 managers: A v B, the loser plays C, the winner of that plays the winner of A v B.
// 4 managers: two semi-finals at the same time, then the final and the third-place match at the same time.
// 5+ managers: single elimination padded with byes to 8, 16... plus a third-place match. Matches reference earlier results ({w: id} winner, {l: id} loser), so the whole bracket is one plain object.
import { shuffleSeeded } from "../../js/util.js";

const labelOf = (m) => (m === 1 ? "Final" : m === 2 ? "Semi-final" : m === 4 ? "Quarter-final" : `Round of ${m * 2}`);

export function buildBracket(keys, seed) {
  const k = shuffleSeeded(keys, seed >>> 0), n = k.length;
  if (n < 2) return { rounds: [] };
  if (n === 2) return { rounds: [[{ id: "m1", a: k[0], b: k[1], label: "Final" }]] };
  if (n === 3) return { rounds: [[{ id: "m1", a: k[0], b: k[1], label: "Opening match" }], [{ id: "m2", a: { l: "m1" }, b: k[2], label: "Semi-final" }], [{ id: "m3", a: { w: "m2" }, b: { w: "m1" }, label: "Final" }]] };
  let p = 4; while (p < n) p *= 2;
  let cur = []; for (let j = 0; j < p / 2; j++) { const b = p - 1 - j; cur.push({ id: `r1m${j + 1}`, a: k[j], b: b < n ? k[b] : null, label: labelOf(p / 2) }); }
  const rounds = [cur];
  for (let ri = 2; cur.length > 1; ri++) {
    const next = []; for (let j = 0; j < cur.length / 2; j++) next.push({ id: `r${ri}m${j + 1}`, a: { w: cur[2 * j].id }, b: { w: cur[2 * j + 1].id }, label: labelOf(cur.length / 2) });
    if (next.length === 1 && cur.length === 2) next.push({ id: `r${ri}third`, a: { l: cur[0].id }, b: { l: cur[1].id }, label: "Third place", third: true });
    rounds.push(next); cur = next.filter((m) => !m.third);
  }
  return { rounds };
}

// One side of a match: a manager key, null (a bye / nobody), or undefined (waiting for an earlier match to finish).
export function refKey(ref, res) {
  if (ref == null) return null;
  if (typeof ref === "string") return ref;
  const id = ref.w || ref.l, r = (res || {})[id];
  if (!r) return undefined;
  return (ref.w ? r.w : r.l) || null;
}
export const sidesOf = (m, res) => [refKey(m.a, res), refKey(m.b, res)];
// The first round that still has an unplayed match, or -1 when everything is decided.
export function nextRound(bracket, res) { return bracket.rounds.findIndex((rd) => rd.some((m) => !(res || {})[m.id])); }
// What to do with a match: "play" (two managers), "bye" (one manager moves on), "void" (nobody, e.g. the third-place match when a semi-final was a bye) or "wait".
export function matchState(m, res) {
  const [a, b] = sidesOf(m, res);
  if (a === undefined || b === undefined) return "wait";
  return a && b ? "play" : a || b ? "bye" : "void";
}
export const byeResult = (m, res) => { const [a, b] = sidesOf(m, res); return { w: a || b || null, l: null, a, b, bye: true, score: [0, 0], pens: null }; };

// Final order: champion, runner-up, third and fourth (third-place match), then the losers of each earlier round (later round = better, then the smaller defeat).
export function placings(bracket, res, keys) {
  const out = [], seen = new Set(), add = (k) => { if (k && !seen.has(k)) { seen.add(k); out.push(k); } };
  const R = bracket.rounds, last = R[R.length - 1] || [], fin = last.find((m) => !m.third), third = last.find((m) => m.third);
  if (fin && res[fin.id]) { add(res[fin.id].w); add(res[fin.id].l); }
  if (third && res[third.id]) { add(res[third.id].w); add(res[third.id].l); }
  const gd = (r) => (r.l === r.a ? (r.score[0] - r.score[1]) : (r.score[1] - r.score[0]));
  for (let ri = R.length - 2; ri >= 0; ri--) R[ri].map((m) => res[m.id]).filter((r) => r && r.l && !r.bye && !seen.has(r.l)).sort((x, y) => gd(y) - gd(x)).forEach((r) => add(r.l));
  (keys || []).forEach(add);
  return out;
}
