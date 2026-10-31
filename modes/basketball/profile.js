// modes/basketball/profile.js: the "i" profile of a basketball player (Basketball War Draft world), registered with js/infocard.js.
// The engine (modes/basketball/engine.js) keeps most tuning numbers private or inline and must not change, so the numbers used here are written ONCE below
// (ENGINE) and every quoted expression is rebuilt from them (ENGINE_SNIPPETS). tools/test-infocard.mjs checks that each snippet still appears verbatim in the
// engine source: change a number in the engine and that test fails until this file follows.
import * as E from "./engine.js";
import { MAINS, SUBS } from "../../basketball/ratings.js";
import { registerProfile, kit } from "../../js/infocard.js";

const { el, section, kv, bar, chips, chip, formula, note, list } = kit;
const r1 = (x) => Math.round(x * 10) / 10;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const avg = (l, f) => (l.length ? l.reduce((s, x) => s + f(x), 0) / l.length : 0);
const val = (p, k) => (p && typeof p[k] === "number" ? p[k] : 40);   // same default as the engine's S()
const COLOR = { scoring: "#ffb347", playmaking: "#4aa3ff", perimeter: "#35e0c0", interior: "#2fb8e8", rebounding: "#9bd13c", athleticism: "#b987ff", mindset: "#ff7a5c" };

// ---- the engine numbers this profile explains (mirrors of private constants in engine.js; see ENGINE_SNIPPETS) ----
export const ENGINE = {
  dist: [1, 0.94, 0.86, 0.78, 0.7], groups: [1, 0.92, 0.8], second: 0.97,
  chem: 0.003, chemCap: 6,
  efBase: 0.8, efSlope: 0.2,
  drain: 3.4, rec: 4.2, staDrain: 0.014, fastDrain: 1.1, slowDrain: 0.92,
  staCapBase: 30, staCapK: 0.14,
  ftBase: 0.06, ftK: 0.0093, ftLo: 0.3, ftHi: 0.97,
  tov: 0.15, oreb: 0.265, nsFoul: 0.1, pace: 14.8,
  base: { ins: 0.5, mid: 0.37, thr: 0.33 }, floor: 0.18, ceil: { ins: 0.82, mid: 0.62, thr: 0.54 },
  foul: { ins: 0.17, mid: 0.07, thr: 0.04 }, blk: { ins: 0.115, mid: 0.03, thr: 0.012 }
};
// [stat, centre, divisor] terms of the shooter's own rating and of the defence in each shot's make chance (engine.js, "const pm")
const PM = {
  ins: { own: [["fin", 72, 170], ["ath", 70, 700]], def: [["rim", 62, 340, "-"], ["pd", 62, 700, "-"], ["spacing", 55, 700, "+"]] },
  mid: { own: [["mid", 72, 190]], def: [["pd", 62, 360, "-"], ["perD", 65, 800, "-"]] },
  thr: { own: [["thr", 72, 210]], def: [["pd", 62, 440, "-"], ["perD", 65, 900, "-"]] }
};
const ownSrc = (t) => (t[0] === "fin" ? `(fin - ${t[1]}) / ${t[2]}` : `(E(shooter, "${t[0]}", cmO) - ${t[1]}) / ${t[2]}`);
const COMP = { ply: [[0.45, "pas"], [0.35, "han"], [0.2, "iq"]], def: [[0.35, "per"], [0.25, "int"], [0.15, "stl"], [0.15, "blk"], [0.1, "iq"]], rim: [[0.55, "int"], [0.45, "blk"]] };
const compSrc = (rows) => rows.map(([w, k]) => `${w} * S(p, "${k}")`).join(" + ");
const OFF_SRC = '0.45 * Math.max(S(p, "ins"), S(p, "mid"), S(p, "thr")) + 0.25 * (S(p, "ins") + S(p, "mid") + S(p, "thr")) / 3 + 0.15 * S(p, "ft") + 0.15 * S(p, "iq")';

// every expression that must appear verbatim in modes/basketball/engine.js (checked by tools/test-infocard.mjs)
export const ENGINE_SNIPPETS = [
  `const DIST = [${ENGINE.dist.join(", ")}];`,
  `[${ENGINE.groups.join(", ")}][Math.abs(`,
  `if (k > 0) f = f === 1 ? ${ENGINE.second} : f - 0.01;`,
  `chemistry(onList(side).map((s) => s.p)) * ${ENGINE.chem}`,
  `return Math.min(${ENGINE.chemCap}, pts);`,
  `const ef = (e) => ${ENGINE.efBase} + ${ENGINE.efSlope} * (e / 100);`,
  `drain: ${ENGINE.drain}, rec: ${ENGINE.rec}`,
  `(K.drain - ${ENGINE.staDrain} * S(st.p, "sta"))`,
  `t.tac.pace === "fast" ? ${ENGINE.fastDrain} : t.tac.pace === "slow" ? ${ENGINE.slowDrain} : 1`,
  `(${ENGINE.staCapBase} + S(s.p, "sta") * ${ENGINE.staCapK}) * 60`,
  `${ENGINE.ftBase} + E(st, "ft", cm) * ${ENGINE.ftK}`, `${ENGINE.ftLo}, ${ENGINE.ftHi})`,
  `tov: ${ENGINE.tov}`, `oreb: ${ENGINE.oreb}`, `nsFoul: ${ENGINE.nsFoul}`, `pace: ${ENGINE.pace}`,
  ...Object.entries(ENGINE.base).map(([k, v]) => `${k}Base: ${v}`),
  ...Object.entries(ENGINE.foul).map(([k, v]) => `foul${k[0].toUpperCase() + k.slice(1)}: ${v}`),
  ...Object.entries(ENGINE.blk).map(([k, v]) => `blk${k[0].toUpperCase() + k.slice(1)}: ${v}`),
  `pm = clamp(pm + as + cl + mo + hurried + man + form[O], ${ENGINE.floor}, shotKind === "ins" || shotKind === "fb" ? ${ENGINE.ceil.ins} : shotKind === "mid" ? ${ENGINE.ceil.mid} : ${ENGINE.ceil.thr});`,
  ...Object.values(PM).flatMap((m) => [...m.own.map(ownSrc), ...m.def.map((t) => `(${t[0]} - ${t[1]}) / ${t[2]}`)]),
  compSrc(COMP.ply), compSrc(COMP.def), compSrc(COMP.rim), OFF_SRC,
  "const fin = 0.62 * E(shooter, \"ins\", cmO) + 0.19 * E(shooter, \"dunk\", cmO) + 0.19 * E(shooter, \"post\", cmO);"
];

const pct = (x) => Math.round(x * 100) + "%";
const ef = (e) => ENGINE.efBase + ENGINE.efSlope * (e / 100);
const LABEL = Object.fromEntries(SUBS.map((s) => [s.key, s.label]));
const SPECIAL = { _best: "best of Close / Mid-range / Three-point", _avg: "average of Close / Mid-range / Three-point", _fin: "best of Dunking / Post moves" };
const weightText = (m) => Object.entries(m.w).map(([k, w]) => `${SPECIAL[k] || LABEL[k] || k} ${Math.round(w * 100)}%`).join(", ");

// make chance of one shot kind against a reference defence (full energy, natural position, no chemistry, no momentum, unassisted)
export function shotChance(kind, p, ref) {
  const own = { fin: 0.62 * val(p, "ins") + 0.19 * val(p, "dunk") + 0.19 * val(p, "post"), ath: val(p, "ath"), mid: val(p, "mid"), thr: val(p, "thr") };
  let pm = ENGINE.base[kind];
  for (const [s, c, d] of PM[kind].own) pm += (own[s] - c) / d;
  for (const [s, c, d, sg] of PM[kind].def) pm += (sg === "+" ? 1 : -1) * ((ref[s] - c) / d);
  return clamp(pm, ENGINE.floor, ENGINE.ceil[kind]);
}
export function referenceDefence(pool) {
  const a = (k) => avg(pool, (x) => val(x, k));
  const pd = 0.4 * a("per") + 0.15 * a("lat") + 0.2 * a("stl") * 0.75 + 0.1 * a("int");
  return { pd, perD: a("per"), rim: 0.55 * a("int") + 0.45 * a("blk"), spacing: a("thr") };
}

registerProfile("basketball", (ctx, p, opts) => {
  const pool = (ctx.entities && ctx.entities.list) || [], max = (ctx.pack && ctx.pack.statMax) || 100;
  const mode = E.normPosMode((ctx.S && ctx.S.tour && ctx.S.tour.posMode) || (ctx.settings && ctx.settings().posMode));
  const slots = E.slotsOf(mode), fitRows = [...new Set(slots.map((s) => s.code))].map((code) => { const f = E.fit(p, { code }, mode); return kv(code === "ANY" ? "Any slot" : code, pct(f), `At ${code === "ANY" ? "any slot" : code} every one of his ratings is multiplied by ${pct(f)}.`); });
  const ref = referenceDefence(pool), cmChips = [0, ENGINE.chemCap];
  const natural = { code: p.pos }, fNat = mode === "open" ? 1 : E.fit(p, natural, mode);
  const eff = (k, e, chem) => val(p, k) * fNat * ef(e) * (1 + chem * ENGINE.chem);
  const tired = (e) => `${r1(eff("thr", e, 0))}`;
  const mains = MAINS.map((m) => el("div", { class: "ic-sec" },
    bar(m.label, p[m.key], max, `${m.description} Built from: ${weightText(m)}.`, "", COLOR[m.key]),
    ...SUBS.filter((s) => s.main === m.key).map((s) => bar(s.label, p[s.key], max, s.description, "sub hidden-stat", COLOR[m.key])),
    note(`${m.label} = ${weightText(m)}.`)));
  const kinds = [["ins", "close shot"], ["mid", "mid-range"], ["thr", "three"]];
  return el("div", { class: "ic-prof" },
    section("Identity", kv("Overall", p.ovr, "Overall rating (0-99): a summary used for sorting, drafting and the auto line-up."), kv("Positions", [p.pos, ...(p.positions || []).slice(1)].join(" / ") + (p.position ? ` (${p.position})` : "")), kv("Team", p.team || "?", "The franchise he is best known for. Team-mates from the same team give chemistry."), kv("Era", p.era || "?"), p.tier ? kv("Tier", p.tier) : null, p.legend ? kv("Legend", "yes") : null,
      kv("Height / weight", `${p.height_cm} cm / ${p.weight_kg} kg`, "Height matters in the game: taller players rebound better, bigger shooters take more inside shots, and the tallest defender guards the tallest attacker."), p.titles != null ? kv("Titles", p.titles) : null, p.peak_ppg != null ? kv("Peak points per game", p.peak_ppg) : null),
    section("Ratings: 7 mains (cards) and 23 hidden sub ratings (what the game really reads)", note("The simulation uses the sub ratings. A main rating is only their weighted summary."), ...mains),
    section(`Position fit (${E.POS_LABEL[mode]})`, note("The fit of his best-matching position to each slot of this room's position mode."), ...fitRows,
      formula(`strict: DIST = [${ENGINE.dist.join(", ")}] by positions away; a secondary position counts ${ENGINE.second} (or one point less than the distance fit)\ngroups: [${ENGINE.groups.join(", ")}]   positionless: always 1`)),
    section("Team rules that touch him",
      formula(`Chemistry: +1 for each extra team-mate on the floor from the same team, at most ${ENGINE.chemCap}.\nEvery rating × (1 + points × ${ENGINE.chem})`, "Six points is +1.8% on every rating."),
      formula(`Energy e (100 = fresh): every rating × ${ENGINE.efBase} + ${ENGINE.efSlope} × e/100`, "A fully tired player (0) plays at 80% of his ratings."),
      formula(`On court: e falls by (${ENGINE.drain} − ${ENGINE.staDrain} × stamina) per minute (× ${ENGINE.fastDrain} fast pace, × ${ENGINE.slowDrain} slow pace)\nOn the bench: e rises by ${ENGINE.rec} per minute (half that when out)`),
      formula(`Minutes cap = (${ENGINE.staCapBase} + stamina × ${ENGINE.staCapK}) minutes = ${r1(ENGINE.staCapBase + val(p, "sta") * ENGINE.staCapK)} for him (it applies whenever the roster has a bench)`),
      formula(`Free throw % = ${ENGINE.ftBase} + free throw × ${ENGINE.ftK}, kept between ${pct(ENGINE.ftLo)} and ${pct(ENGINE.ftHi)} = ${pct(clamp(ENGINE.ftBase + val(p, "ft") * ENGINE.ftK, ENGINE.ftLo, ENGINE.ftHi))} for him`)),
    section("Shots",
      note("Make chance = a base + his own rating against a pool-average defence and spacing, at full energy and natural position. Real shots also change with assists, momentum, clutch time and the exact defender."),
      ...kinds.map(([k, label]) => kv(`${label[0].toUpperCase() + label.slice(1)}`, pct(shotChance(k, p, ref)), `Base ${pct(ENGINE.base[k])}; foul chance ${pct(ENGINE.foul[k])} (more if he draws fouls); block chance ${pct(ENGINE.blk[k])} before the defence's blocking.`)),
      formula(`Close: ${ENGINE.base.ins} + (finishing − ${PM.ins.own[0][1]})/${PM.ins.own[0][2]} + (vertical − ${PM.ins.own[1][1]})/${PM.ins.own[1][2]} − (rim defence − ${PM.ins.def[0][1]})/${PM.ins.def[0][2]} − (matchup defender − ${PM.ins.def[1][1]})/${PM.ins.def[1][2]} + (spacing − ${PM.ins.def[2][1]})/${PM.ins.def[2][2]}\nMid: ${ENGINE.base.mid} + (mid − ${PM.mid.own[0][1]})/${PM.mid.own[0][2]} − (matchup − ${PM.mid.def[0][1]})/${PM.mid.def[0][2]} − (team perimeter D − ${PM.mid.def[1][1]})/${PM.mid.def[1][2]}\nThree: ${ENGINE.base.thr} + (three − ${PM.thr.own[0][1]})/${PM.thr.own[0][2]} − (matchup − ${PM.thr.def[0][1]})/${PM.thr.def[0][2]} − (team perimeter D − ${PM.thr.def[1][1]})/${PM.thr.def[1][2]}\nKept between ${pct(ENGINE.floor)} and ${pct(ENGINE.ceil.ins)} (close) / ${pct(ENGINE.ceil.mid)} (mid) / ${pct(ENGINE.ceil.thr)} (three).`),
      note(`Reference defence: matchup ${r1(ref.pd)}, rim ${r1(ref.rim)}, perimeter ${r1(ref.perD)}, spacing ${r1(ref.spacing)} (averages of every player in the pool).`)),
    section("Composite scores (team-strength display)",
      kv("Offense", r1(E.offOf(p))), formula(`off = ${OFF_SRC.replace(/S\(p, "(\w+)"\)/g, "$1")}`),
      kv("Playmaking", r1(E.plyOf(p))), formula(`ply = ${compSrc(COMP.ply).replace(/S\(p, "(\w+)"\)/g, "$1")}`),
      kv("Defense", r1(E.defOf(p))), formula(`def = ${compSrc(COMP.def).replace(/S\(p, "(\w+)"\)/g, "$1")}`),
      kv("Rim protection", r1(E.rimOf(p))), formula(`rim = ${compSrc(COMP.rim).replace(/S\(p, "(\w+)"\)/g, "$1")}`)),
    section(`Worked example: his three-point rating (${val(p, "thr")}) in a game`,
      note(`At his natural position (fit ${pct(fNat)}).`),
      ...[100, 60, 0].map((e) => kv(`Energy ${e}`, `${tired(e)}`, `${val(p, "thr")} × ${pct(fNat)} fit × ${r1(ef(e))} energy factor`)),
      kv(`Energy 100 with maximum chemistry`, r1(eff("thr", 100, ENGINE.chemCap)), `${val(p, "thr")} × ${pct(fNat)} × ${ef(100)} × ${1 + ENGINE.chemCap * ENGINE.chem}`)));
});
