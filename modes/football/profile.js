// modes/football/profile.js: the "i" profile of a footballer (Football War Draft world), registered with js/infocard.js.
// engine.js keeps its tuning numbers inline and must not change, so the numbers used here are written ONCE below (ENGINE, WEIGHTS) and every quoted expression
// is rebuilt from them (ENGINE_SNIPPETS). tools/test-infocard.mjs checks each snippet still appears verbatim in modes/football/engine.js:
// change a number in the engine and that test fails until this file follows.
import * as E from "./engine.js";
import { registerProfile, kit } from "../../js/infocard.js";

const { el, section, kv, bar, note, formula } = kit;
const r1 = (x) => Math.round(x * 10) / 10;
const pct = (x) => Math.round(x * 100) + "%";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const S = (p, k) => (typeof p[k] === "number" ? p[k] : 40);   // same default as the engine's S()

export const ENGINE = {
  fit: { kin: 0.97, line: 0.95, near: 0.85, far: 0.72, gk: 0.35 },
  shape: { att: { g: 0.4, lim: 0.07 }, ctl: { g: 0.25, lim: 0.05 }, def: { g: 0.4, lim: 0.07 } },
  keeperAsOutfield: { pac: 0.7, sho: 25, pas: 0.8, dri: 30, def: 20, phy: 55 }, notKeeperGk: 25,
  gk: { gkp: 0.8, kic: 0.2, div: 3.99 },
  chem: 0.004, chemCap: 6,
  tire: { from: 60, k: 0.0016, base: 1.4 },
  subAt: [58, 68, 78], maxSubs: 3,
  move: 0.31, poss: 3, shot: { base: 0.46, div: 120, lo: 0.2, hi: 0.78 },
  shooterW: { FWD: 5, MID: 2.2, DEF: 0.5, pow: 2.2 },
  onTarget: { base: 0.43, c: 70, d: 160, att: 400, lo: 0.22, hi: 0.8 },
  goal: { base: 0.36, d: 120, att: 280, lo: 0.07, hi: 0.72, how: { open: 1.1, head: 1, long: 0.7 } },
  pen: { base: 0.76, d: 250, gk: 300, lo: 0.5, hi: 0.92, save: { base: 0.45, d: 200, lo: 0.25, hi: 0.7 } },
  disc: { red: 0.0004, yellow: 0.0174, injury: 0.019 }
};
// per line: weight of a player's score in the team's attack / control / defence (the "wa, wc, wd" of ratings())
const W = { att: { FWD: 1, MID: 0.7, DEF: 0.25 }, ctl: { MID: 1, FWD: 0.5, DEF: 0.5 }, def: { DEF: 1, MID: 0.7, FWD: 0.15 } };
// [weight, stat] mixes per line (engine.js ratings(): att, ctl, def)
const MIX = {
  att: { FWD: [[0.45, "sho"], [0.25, "dri"], [0.2, "pac"], [0.1, "pas"]], MID: [[0.3, "pas"], [0.25, "dri"], [0.25, "sho"], [0.2, "pac"]], DEF: [[0.5, "pas"], [0.3, "dri"], [0.2, "pac"]] },
  ctl: { MID: [[0.4, "pas"], [0.3, "dri"], [0.2, "def"], [0.1, "phy"]], FWD: [[0.5, "dri"], [0.5, "pas"]], DEF: [[0.6, "pas"], [0.4, "dri"]] },
  def: { DEF: [[0.55, "def"], [0.25, "phy"], [0.2, "pac"]], MID: [[0.5, "def"], [0.3, "phy"], [0.2, "pas"]], FWD: [[0.6, "def"], [0.4, "phy"]] }
};
const mixSrc = (rows) => rows.map(([w, k]) => `${w} * o.${k}`).join(" + ");
const mixTxt = (rows) => rows.map(([w, k]) => `${w} × ${k}`).join(" + ");
const K = ENGINE;

export const ENGINE_SNIPPETS = [
  `if (pl === "GK" || slot.line === "GK") return pl === slot.line ? 1 : ${K.fit.gk};`, `if (pos.includes(slot.code)) return 1;`,
  `if ((KIN[slot.code] || []).some((c) => pos.includes(c))) return ${K.fit.kin};`, `if (pl === slot.line) return ${K.fit.line};`,
  `pf = (v, w, g, lim) => Math.max(1 - lim, Math.min(1 + lim, 1 + g * (v / w - 1)))`,
  `att: pf(x[0], r[0], ${K.shape.att.g}, ${K.shape.att.lim}), ctl: pf(x[1], r[1], ${K.shape.ctl.g}, ${K.shape.ctl.lim}), def: pf(x[2], r[2], ${K.shape.def.g}, ${K.shape.def.lim})`,
  `=== 1 ? ${K.fit.near} : ${K.fit.far};`,
  `pac: S(p, "spd") * ${K.keeperAsOutfield.pac}, sho: ${K.keeperAsOutfield.sho}, pas: S(p, "kic") * ${K.keeperAsOutfield.pas}, dri: ${K.keeperAsOutfield.dri}, def: ${K.keeperAsOutfield.def}, phy: ${K.keeperAsOutfield.phy}`,
  `(S(p, "div") + S(p, "han") + S(p, "ref") + S(p, "gkp") * ${K.gk.gkp} + S(p, "kic") * ${K.gk.kic}) / ${K.gk.div} : ${K.notKeeperGk});`,
  `return Math.min(${K.chemCap}, pts);`, `chemistry(xi) * ${K.chem}`,
  `1 - (minute - ${K.tire.from}) * ${K.tire.k} * (${K.tire.base} - Math.min(1, hs(p).sta / 100))`,
  `const SUB_AT = [${K.subAt.join(", ")}];`, `t.subs < ${K.maxSubs}`,
  `const wa = sl.line === "FWD" ? ${W.att.FWD} : sl.line === "MID" ? ${W.att.MID} : ${W.att.DEF}, wc = sl.line === "MID" ? ${W.ctl.MID} : sl.line === "FWD" ? ${W.ctl.FWD} : ${W.ctl.DEF}, wd = sl.line === "DEF" ? ${W.def.DEF} : sl.line === "MID" ? ${W.def.MID} : ${W.def.FWD};`,
  ...Object.values(MIX).flatMap((m) => Object.values(m).map(mixSrc)),
  `if (rng() > ${K.move}) continue;`, `Math.pow(ra.ctl, ${K.poss}) / (Math.pow(ra.ctl, ${K.poss}) + Math.pow(rb.ctl, ${K.poss}))`,
  `clamp(${K.shot.base} + (atk.att - dfn.def) / ${K.shot.div}, ${K.shot.lo}, ${K.shot.hi})`,
  `slots[i].line === "FWD" ? ${K.shooterW.FWD} : slots[i].line === "MID" ? ${K.shooterW.MID} : ${K.shooterW.DEF}`, `Math.pow(Math.max(5, outfield(p).sho) / 70, ${K.shooterW.pow})`,
  `clamp(${K.onTarget.base} + (sk - ${K.onTarget.c}) / ${K.onTarget.d} + (atk.att - dfn.def) / ${K.onTarget.att}, ${K.onTarget.lo}, ${K.onTarget.hi})`,
  `clamp(${K.goal.base} * (1 + (sk - keeper) / ${K.goal.d}) * (1 + (atk.att - dfn.def) / ${K.goal.att}) * (how === "long" ? ${K.goal.how.long} : how === "head" ? ${K.goal.how.head} : ${K.goal.how.open}), ${K.goal.lo}, ${K.goal.hi})`,
  `const wHead = 0.22 * Math.pow(hsh.hea / 70, 2.5)`, `wLong = 0.16 * Math.pow(lskill / 70, 2.5)`, `* (how === "long" ? 0.78 : how === "head" ? 0.9 : 1) * (1 + (hsh.wf - 3) * 0.012)`,
  `(100 - hs(p).con) * 0.0013, 0.01, 0.055`, `R[sd].att *= 1 + (leaderOf(T[sd]) - 60) / 1200`, `const wk = 1 + (hs(p).wrd - 2) * 0.006;`,
  `dfn.gk * 0.7 + 0.3 * (how === "head" ? hk.aer : how === "long" ? hk.pos : hk.oo)`, `const penSkill = (p) => 0.7 * hs(p).pen + 0.3 * hs(p).com;`,
  `hs(side[1 - s].gk).pks * 0.3`, `Math.pow(Math.max(5, hs(p).off) / 70, 1.2) * (0.92 + 0.04 * hs(p).wra)`,,
  `clamp(${K.pen.base} + (penSkill(p) - 70) / ${K.pen.d} + (hs(p).big - 70) / 900 - (gkR - 70) / ${K.pen.gk}, ${K.pen.lo}, ${K.pen.hi})`,
  `clamp(${K.pen.save.base} + (gkR - 70) / ${K.pen.save.d}, ${K.pen.save.lo}, ${K.pen.save.hi})`,
  `x < ${K.disc.red} ? "red" : x < ${K.disc.yellow} ? "yellow" : x < ${K.disc.injury} ? "injury"`
];

const keeper = (p) => p.position === "goalkeeper";
export const outfieldView = (p) => E.outfield(p);   // the engine's own view: visible stats blended with his hidden ones
export const gkView = (p) => (keeper(p) ? (S(p, "div") + S(p, "han") + S(p, "ref") + S(p, "gkp") * K.gk.gkp + S(p, "kic") * K.gk.kic) / K.gk.div : K.notKeeperGk);
const mixVal = (rows, o) => rows.reduce((s, [w, k]) => s + w * o[k], 0);
// hidden stats: label, key, what the match does with it (null = shown for information, not used by the match yet)
const HID_OUT = [["Finishing", "fin", "Open-play scoring: 35% of his shooting in the match, and 70% of his open-play shot skill."], ["Long shots", "lsh", "20% of his shooting; 75% of his skill when he shoots from distance."], ["Free kicks", "fk", "25% of his long-shot skill. Free kicks are not played as separate events yet."], ["Heading", "hea", "How often a chance is a header, and how well he scores it."], ["Crossing", "cro", "The quality of his delivery when he sets up a header."], ["Vision", "vis", "25% of his passing in the match."], ["Ball control", "bc", "25% of his dribbling in the match."], ["Long passing", "lp", "20% of his passing in the match."], ["Off the ball", "off", "How often he gets the shot (weight (stat / 70)^1.2)."], ["Tackling", "tkl", "20% of his defence in the match."], ["Interceptions", "int", "20% of his defence in the match."], ["Marking", "mrk", "15% of his defence in the match."], ["Aggression", "agg", null], ["Stamina", "sta", "How fast he fades after minute 60, and when he is substituted."], ["Acceleration", "acc", "30% of his pace in the match."], ["Sprint speed", "spr", "30% of his pace in the match."], ["Agility", "agi", "15% of his dribbling in the match."], ["Balance", "bal", "10% of his dribbling in the match."], ["Strength", "str", "25% of his physical stat in the match."], ["Jumping", "jmp", "20% of his physical stat in the match."], ["Reactions", "rea", null], ["Composure", "com", "30% of his open-play shot skill; 30% of his penalty skill."], ["Leadership", "ldr", "The team's best leader pushes the side forward late in a match when it is not winning."], ["Big game", "big", "Small bonus on his penalties in a shoot-out."], ["Consistency", "con", "The lower it is, the further his match-day form can wander."], ["Injury proneness", "inj", "Higher = more likely to be the one injured (when injuries are on)."], ["Card proneness", "crd", "Higher = more likely to be booked or sent off (when cards are on)."], ["Penalties", "pen", "70% of his penalty skill in a shoot-out; picks the order of takers."]];
const HID_GK = [["Aerial command", "aer", "30% of his save rating against headers."], ["One on one", "oo", "30% of his save rating against open-play shots."], ["Penalty saving", "pks", "30% of his rating in a penalty shoot-out."], ["Sweeping", "swp", null], ["Positioning", "pos", "30% of his save rating against long shots."], ["Reactions", "rea", null], ["Composure", "com", null], ["Leadership", "ldr", "The team's best leader pushes the side forward late in a match when it is not winning."], ["Consistency", "con", "The lower it is, the further his match-day form can wander."], ["Injury proneness", "inj", null]];
const WR = ["", "low", "medium", "high"], FOOT = ["right", "left", "both"];
function hiddenSection(p, gk) {
  const h = E.hs(p);
  if (!h.has) return section("Hidden stats", note("No hidden stats are recorded for this player: the match uses his visible stats only."));
  const rows = (gk ? HID_GK : HID_OUT).map(([label, k, use]) => bar(label, h[k], 100, use || "Recorded for information: the match does not use it yet.", "sub hidden-stat"));
  const extra = [kv("Preferred foot", FOOT[h.foot] || "right"), kv("Weak foot", h.wf + " / 5", "Tiny effect on his chance of hitting the target."), kv("Skill moves", h.sm + " / 5", "Adds a little to his dribbling in the match.")];
  if (!gk) extra.push(kv("Work rate", `${WR[h.wra]} attack / ${WR[h.wrd]} defence`, "Attacking work rate: how often he gets the shot. Defensive work rate: control and defence."));
  return section("Hidden stats (used by the match; never shown while bidding)", ...rows, ...extra);
}
const SLOT_CODES = (() => { const m = new Map(); for (const f of E.FORMATION_IDS) for (const s of E.slotsOf(f)) if (!m.has(s.code)) m.set(s.code, s.line); return [...m].map(([code, line]) => ({ code, line })); })();
const STAT_COLOR = { pac: "#ffe14d", sho: "#ff5d73", pas: "#4aa3ff", dri: "#b987ff", def: "#35e0c0", phy: "#ff9a3d", div: "#4aa3ff", han: "#35e07f", kic: "#ffe14d", ref: "#ff5d73", spd: "#ff9a3d", gkp: "#b987ff" };

// per-shot chances against a reference side: equal attack and defence ratings, the pool-average keeper
export function shotOdds(p, refKeeper) {
  const sho = outfieldView(p).sho;
  const onT = clamp(K.onTarget.base + (sho - K.onTarget.c) / K.onTarget.d, K.onTarget.lo, K.onTarget.hi);
  const goal = clamp(K.goal.base * (1 + (sho - refKeeper) / K.goal.d) * K.goal.how.open, K.goal.lo, K.goal.hi);
  return { onT, goal, both: onT * goal };
}
export const referenceKeeper = (pool) => { const g = pool.filter(keeper).map(gkView); return g.length ? g.reduce((a, b) => a + b, 0) / g.length : 60; };

registerProfile("football", (ctx, p, opts) => {
  const pool = (ctx.entities && ctx.entities.list) || [], max = (ctx.pack && ctx.pack.statMax) || 100, gk = keeper(p);
  const shown = ctx.pack.statsFor ? ctx.pack.statsFor(p) : ctx.pack.stats, other = gk ? ctx.pack.stats : ctx.pack.gkStats || [];
  const o = outfieldView(p), line = E.lineOf(p), gkR = gkView(p), refK = referenceKeeper(pool);
  const fitRows = SLOT_CODES.map((s) => { const f = E.fit(p, s); return kv(`${s.code} (${s.line})`, pct(f), `Playing at ${s.code} multiplies every one of his contributions by ${pct(f)}.`); });
  const odds = gk ? null : shotOdds(p, refK);
  const ownMix = (m) => MIX[m][line] || MIX[m].DEF;
  const score = (m) => (line === "GK" ? null : mixVal(ownMix(m), o));
  const keeperRows = gk ? [
    kv("Goalkeeping rating", r1(gkR), "The one number the match uses for a keeper."),
    formula(`GK = (diving + handling + reflexes + positioning × ${K.gk.gkp} + kicking × ${K.gk.kic}) / ${K.gk.div}\n   = ${r1(gkR)}`),
    kv("Chance a pool-average shooter scores", pct(clamp(K.goal.base * (1 + (70 - gkR) / K.goal.d) * K.goal.how.open, K.goal.lo, K.goal.hi)), "Goal chance of an on-target shot, with the average shooter at 70 and equal attack and defence ratings."),
  ] : [
    kv("In goal", `${gkR} × fit ${pct(K.fit.gk)} = ${r1(gkR * K.fit.gk)}`, "An outfielder in goal has a goalkeeping rating of 25, and the 0.35 fit applies on top.")
  ];
  return el("div", { class: "ic-prof" },
    section("Identity", kv("Overall", p.ovr, "Overall rating: a summary used for sorting, drafting and the auto line-up."), kv("Positions", (p.positions || [p.pos]).join(" / ") + ` (${P(p.position)})`), kv("Nation", p.nation || "?", "Team-mates of the same nation give chemistry."), kv("Club", p.club || "?", p.icon ? "Icons carry no club chemistry." : "Team-mates from the same club give chemistry."),
      kv("League", p.league || "?"), p.tier ? kv("Tier", p.tier) : null, kv(p.icon ? "Era" : "Edition", p.icon ? p.era : p.edition || "?"), p.icon ? kv("Icon", "yes", "Icons do not count towards club chemistry.") : null),
    section(gk ? "Goalkeeper stats (shown on his card)" : "Outfield stats (shown on his card)", ...shown.map((s) => bar(s.label, p[s.key], max, s.description, "", STAT_COLOR[s.key]))),
    section(gk ? "Hidden: how the engine sees him as an outfielder" : "Hidden: how the engine sees him in goal", gk
      ? [...Object.entries(o).map(([k, v]) => bar(k.toUpperCase(), r1(v), max, `Derived from his keeper stats: ${k === "pac" ? `speed × ${K.keeperAsOutfield.pac}` : k === "pas" ? `kicking × ${K.keeperAsOutfield.pas}` : "a fixed value"}.`, "sub hidden-stat", STAT_COLOR[k])),
        formula(`pac = speed × ${K.keeperAsOutfield.pac}   sho = ${K.keeperAsOutfield.sho}   pas = kicking × ${K.keeperAsOutfield.pas}\ndri = ${K.keeperAsOutfield.dri}   def = ${K.keeperAsOutfield.def}   phy = ${K.keeperAsOutfield.phy}`)]
      : [...other.map((s) => kv(s.label, "n/a", `Outfielders have no ${s.label} rating: if one plays in goal he counts as ${K.notKeeperGk}.`)), formula(`GK rating of an outfielder = ${K.notKeeperGk}`)]),
    section(`Position fit by slot (his line: ${line})`, note("A listed position 1, a close relative of the slot (left-back at wing-back, CM at CDM, CF at ST...) 0.97, same line 0.95, one line away 0.85, two lines 0.72, keeper or outfielder in goal 0.35."), ...fitRows,
      formula(`fit = 1 at a listed position, ${K.fit.kin} at a close relative of the slot, ${K.fit.line} elsewhere in his line, ${K.fit.near} one line away, ${K.fit.far} two lines away, ${K.fit.gk} between goal and the pitch`)),
    section("What he adds to his team", ...(line === "GK" ? [kv("Goalkeeping", r1(gkR)), note("A keeper only counts through his goalkeeping rating, in the keeper slot.")] : [
      kv("Attack", r1(score("att")), "His attack score, weighted by his line in the team's attack."), formula(`att (${line}) = ${mixTxt(ownMix("att"))}  (team weight ${W.att[line]})`),
      kv("Control", r1(score("ctl")), "Drives possession: who gets the attacking moves."), formula(`control (${line}) = ${mixTxt(ownMix("ctl"))}  (team weight ${W.ctl[line]})`),
      kv("Defence", r1(score("def")), "His contribution to stopping shots from being created."), formula(`defence (${line}) = ${mixTxt(ownMix("def"))}  (team weight ${W.def[line]})`)])),
    ...((opts && opts.bidding) ? [] : [hiddenSection(p, gk)]),
    section("Team rules that touch him",
      formula(`Role of the slot he plays (attack / control / defence weight, against a plain player of his line):\n${Object.entries(E.ROLE).map(([c, r]) => `${c} ${r.join(" / ")}`).join("   ")}\nShooting role (how often the slot takes the shot): ${Object.entries(E.SHOOT).map(([c, v]) => `${c} ×${v}`).join("   ")}`, "A CDM shields the back line, a CAM creates, wing-backs overlap: the same player counts differently in each slot."),
      formula(`Formation shape: the ten outfield slots of a formation carry a total attack, control and defence weight. Compared with a 4-3-3, ratings are scaled by 1 + factor × (weight ÷ 4-3-3 weight − 1)\nattack: factor ${K.shape.att.g}, at most ±${pct(K.shape.att.lim)}   control: factor ${K.shape.ctl.g}, at most ±${pct(K.shape.ctl.lim)}   defence: factor ${K.shape.def.g}, at most ±${pct(K.shape.def.lim)}`, "Equal players in a back five attack less and defend more; a five-man midfield wins more of the ball."),
      formula(`Chemistry: +1 for each extra team-mate of the same nation, plus +1 for each extra team-mate of the same club (Icons excluded), at most ${K.chemCap}.\nEvery rating × (1 + points × ${K.chem})`, `Six points is +${r1(K.chemCap * K.chem * 100)}%.`),
      formula(`Fatigue after minute ${K.tire.from}: × (1 − (minute − ${K.tire.from}) × ${K.tire.k} × (${K.tire.base} − min(1, stamina/100)))\nHis factor at minute 90: ${Math.round((1 - (90 - K.tire.from) * K.tire.k * (K.tire.base - Math.min(1, E.hs(p).sta / 100))) * 1000) / 1000}`, "Substitutes arrive fresh."),
      note(`Substitutions at minutes ${K.subAt.join(", ")} (at most ${K.maxSubs}): the most tired outfielder is replaced when a bench player of that line is clearly fresher.`),
      formula(`Cards and injuries (only when switched on in the room), per team per minute: red ${+(K.disc.red * 100).toFixed(2)}%, yellow ${+((K.disc.yellow - K.disc.red) * 100).toFixed(2)}%, injury ${+((K.disc.injury - K.disc.yellow) * 100).toFixed(2)}%. Goalkeepers are never booked or hurt.`)),
    section("How a match works",
      formula(`Each minute has an attacking move with chance ${K.move} (about 28 per match).\nWho attacks: control³ / (control³ + control³ of the other side)\nA shot happens with chance ${K.shot.base} + (attack − their defence) / ${K.shot.div}, kept between ${pct(K.shot.lo)} and ${pct(K.shot.hi)}\nShooter weight: forward ${K.shooterW.FWD}, midfielder ${K.shooterW.MID}, defender ${K.shooterW.DEF}, times the slot's shooting role, times (shooting / 70)^${K.shooterW.pow}\nOn target: ${K.onTarget.base} + (shooting − ${K.onTarget.c}) / ${K.onTarget.d} + (attack − defence) / ${K.onTarget.att}, kept between ${pct(K.onTarget.lo)} and ${pct(K.onTarget.hi)}\nGoal: ${K.goal.base} × (1 + (shooting − keeper) / ${K.goal.d}) × (1 + (attack − defence) / ${K.goal.att}), kept between ${pct(K.goal.lo)} and ${pct(K.goal.hi)}`),
      formula(`Hidden stats at work:\nShot type: header (weight 0.22 × (heading / 70)^2.5, scaled by the crosser's delivery) | long shot (0.16 × (long-shot skill / 70)^2.5, skill = 0.75 long shots + 0.25 free kicks) | open play (0.75)\nOn target × 0.9 for a header, × 0.78 for a long shot, × (1 + (weak foot − 3) × 0.012). Shot skill: heading, long-shot skill, or open play (shooting blend, finishing 70% + composure 30%).\nGoal chance × ${K.goal.how.open} open play, × ${K.goal.how.head} header, × ${K.goal.how.long} long shot. The keeper counts 70% his rating + 30% aerial (headers), positioning (long shots) or one-on-one (open play).\nMatch-day form: every player's multiplier wanders by up to (100 − consistency) × 0.13% (at least 1%, at most 5.5%).\nLate in a match (70' on) a side that is not winning attacks × (1 + (best leadership − 60) / 1200).\nCards use card proneness, injuries use injury proneness; defensive work rate moves control and defence by 0.6% per step.`),
      note("Penalty shoot-outs (knockout draws): " + `goal chance = ${K.pen.base} + (penalty skill − 70) / ${K.pen.d} + (big game − 70) / 900 − (keeper − 70) / ${K.pen.gk}; penalty skill = 0.7 × penalties + 0.3 × composure; the keeper counts 70% his rating + 30% his penalty saving, kept between ${pct(K.pen.lo)} and ${pct(K.pen.hi)}; a keeper saves a non-scored kick with chance ${K.pen.save.base} + (keeper − 70) / ${K.pen.save.d}, between ${pct(K.pen.save.lo)} and ${pct(K.pen.save.hi)}.`)),
    section(gk ? `Worked example: ${p.name} in goal` : `Worked example: ${p.name} taking a shot`, ...(gk ? keeperRows : [
      note(`Against a side of equal strength and the pool-average keeper (${r1(refK)}).`),
      kv("Shooting", r1(o.sho)), kv("Shot on target", pct(odds.onT), `${K.onTarget.base} + (${r1(o.sho)} − ${K.onTarget.c}) / ${K.onTarget.d}`), kv("Goal if on target", pct(odds.goal), `${K.goal.base} × (1 + (${r1(o.sho)} − ${r1(refK)}) / ${K.goal.d})`),
      kv("Goal per shot he takes", pct(odds.both), "On-target chance × goal chance."), ...keeperRows])));
});
function P(s) { return s ? s[0].toUpperCase() + s.slice(1) : "?"; }
