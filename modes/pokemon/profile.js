// modes/pokemon/profile.js: the "i" profile of a Pokémon (Pokémon War Draft world), registered with js/infocard.js.
// Stats use the engine's own exported functions (hpStat, otherStat, typeEff, calcDamage), so they cannot drift. The damage formula's literals live inside the
// private rawDamage(), so they are written once below (RULES) and every quoted expression is listed in ENGINE_SNIPPETS; tools/test-infocard.mjs checks each one
// still appears verbatim in modes/pokemon/engine.js.
//
// HIDDEN INFORMATION (manual battles): opts.reveal is "full" or "used".
//   "full": the viewer may know the chosen moves and ability (their own Pokémon, any Pokémon in an auto battle, any Pokémon once the battle is over).
//   "used": an opponent's Pokémon in a manual battle that is still running: only species facts, plus the moves it has ALREADY USED (opts.used, names). Its chosen
//           moves, its ability (only the list of possible ones) and its unseen team-mates are never shown. The worked example then uses a generic move.
import * as E from "./engine.js";
import * as Dt from "./data.js";
import { registerProfile, kit } from "../../js/infocard.js";

const { el, section, kv, bar, chip, formula, note, list } = kit;
const cap = (s) => String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);
const nice = (id) => cap(String(id).replace(/-/g, " "));
const avg = (l, k) => (l.length ? Math.round(l.reduce((s, x) => s + x[k], 0) / l.length) : 0);
const TYPE_COLOR = { normal: "#c3c3a8", fire: "#ff9a55", water: "#6fa8ff", electric: "#ffe04a", grass: "#7fdc6a", ice: "#9ae8ee", fighting: "#e0645c", poison: "#c27ad8", ground: "#e2c06a", flying: "#b4a8f5", psychic: "#ff7fa8", bug: "#b5d84a", rock: "#c9b26a", ghost: "#9c84c4", dragon: "#8a6cff", dark: "#9a8274", steel: "#b9c2d4", fairy: "#f5a8d8" };
const STAT_COLOR = { hp: "#ff5d73", atk: "#ff9a3d", def: "#ffe14d", spa: "#4aa3ff", spd: "#35e0c0", spe: "#b987ff" };

// numbers of rawDamage() that the engine does not export
export const RULES = { roll: [85, 100], stab: 1.5, adaptability: 2, crit: 1.5, critChance: [100 / 24, 12.5, 50, 100], burn: 2 };
export const ADD_HP = E.hpStat({ id: "x", hp: 0 }), ADD_OTHER = E.otherStat(0);   // what the engine adds to a base stat at level 50
export const ENGINE_SNIPPETS = [
  `e.hp + ${ADD_HP}`, `(b) => b + ${ADD_OTHER}`,
  `fl(fl(fl(2 * LEVEL / 5 + 2) * power * aSt / dSt) / 50) + 2`,
  `${RULES.roll[0]} + ri(S, ${RULES.roll[1] - RULES.roll[0] + 1})`,
  `A.ab === "adaptability" ? ${RULES.adaptability} : ${RULES.stab}`,
  `if (crit) d = fl(d * ${RULES.crit});`,
  `[${RULES.critChance.map((x) => (x === 100 / 24 ? "100 / 24" : x)).join(", ")}]`,
  `A.st === "brn" && phys && A.ab !== "guts" && mv.k !== "facade") d = fl(d / ${RULES.burn});`,
  `if (eff > 0) d = Math.max(1, d);`
];

// DOM replaceChildren() turns null into the text "null": filter first
const put = (node, ...kids) => node.replaceChildren(...kids.flat(Infinity).filter((k) => k != null && k !== false));
const baseMon = (e, set) => E.buildMon(e, set);
// the average Pokémon of the pool: the reference defender of the worked example
export function referenceMon(pool) {
  const ref = { id: "average", pid: 0, name: "an average Pokémon", types: ["normal"], weight_kg: 50, abilities: [], hp: avg(pool, "hp"), atk: avg(pool, "atk"), def: avg(pool, "def"), spa: avg(pool, "spa"), spd: avg(pool, "spd"), spe: avg(pool, "spe") };
  return { ent: ref, mon: baseMon(ref, { moves: [], ability: "" }) };
}
// damage range of one move from `e` against the reference, using the engine's own calcDamage (dry: no random numbers are drawn)
export function damageRange(e, set, move, ref) {
  const A = baseMon(e, set), Dm = ref.mon, S = E.createBattle({ teams: [[A], [Dm]], names: ["a", "b"], seed: 1 }), a = S.sides[0].team[0], d = S.sides[1].team[0];
  const lo = E.calcDamage(S, a, d, move, { roll: RULES.roll[0], crit: false, dry: true }), hi = E.calcDamage(S, a, d, move, { roll: RULES.roll[1], crit: false, dry: true }), cr = E.calcDamage(S, a, d, move, { roll: RULES.roll[1], crit: true, dry: true });
  return { lo: lo.d, hi: hi.d, crit: cr.d, eff: lo.eff, max: d.max };
}

registerProfile("pokemon", (ctx, e, opts) => {
  const pool = (ctx.entities && ctx.entities.list) || [], full = opts.reveal !== "used", set = opts.set || null;
  const root = el("div", { class: "ic-prof" });
  const stats = ctx.pack.stats, max = ctx.pack.statMax || 255;
  const lvl = (k) => (k === "hp" ? E.hpStat(e) : E.otherStat(e[k]));
  const abilities = el("section", { class: "ic-sec" }), moves = el("section", { class: "ic-sec" }), matchup = el("section", { class: "ic-sec" }), example = el("section", { class: "ic-sec" });
  root.append(
    section("Identity", kv("Types", e.types.map(cap).join(" / "), "Both types count for STAB and for the type chart."), kv("Dex", "#" + String(e.dex).padStart(4, "0")), kv("Region / generation", `${e.region || "?"} / ${e.gen || "?"}`), kv("Stage", `${e.evo || "?"}${e.stage ? ` (stage ${e.stage})` : ""}`), kv("Form", e.form || "Standard"), e.cls && e.cls !== "Regular" ? kv("Class", e.cls) : null,
      kv("Height / weight", `${e.height_m} m / ${e.weight_kg} kg`, "Weight only matters for a few moves (Low Kick, Grass Knot, Heavy Slam, Heat Crash)."), e.special ? note(e.special) : null),
    section("Base stats and Level 50 stats", note(`Every Pokémon fights at level ${E.LEVEL}, perfect IVs, 84 EVs and a neutral nature, so the battle stat is the base plus a fixed amount.`),
      ...stats.map((s) => bar(`${s.label}: ${e[s.key]} → ${lvl(s.key)}`, e[s.key], max, `${s.description || s.label} Base ${e[s.key]}, battle value ${lvl(s.key)}.`, "", STAT_COLOR[s.key])),
      kv("Base stat total", e.bst, "The sum of the six base stats."),
      formula(`HP = base + ${ADD_HP}${e.id === "shedinja" ? " (Shedinja always has 1)" : ""}\nother stat = base + ${ADD_OTHER}\n${e.name}: ${stats.map((s) => `${s.key} ${lvl(s.key)}`).join(", ")}`)),
    abilities, moves, matchup, example);

  // everything that needs the battle data (moves, abilities, type chart) is filled in once it is loaded
  const fill = (D) => {
    const real = D.abilities || {};
    put(abilities, el("h3", { class: "ic-h" }, full ? "Abilities" : "Possible abilities"),
      ...e.abilities.map((a) => { const d = real[a.id] || { n: nice(a.id), d: "" }, eff = E.ABILITIES.has(a.id); return kv(`${d.n}${a.hidden ? " (hidden)" : ""}`, full && set && set.ability === a.id ? "chosen" : eff ? "has an effect" : "no battle effect", `${d.d || ""} ${eff ? "Modelled in this game." : "Not modelled: it does nothing in this game."}`); }),
      full ? note(set && set.ability ? "Chosen ability is marked. Hidden abilities are allowed." : "No ability chosen yet: the default (first non-hidden) is used.") : note("The opponent's chosen ability is not shown."));
    const mv = (id) => D.moves[id];
    const used = (opts.used || []).slice();
    const shown = full ? ((set && set.moves) || []).map((id) => mv(Number(id))).filter(Boolean) : [];
    put(moves, el("h3", { class: "ic-h" }, full ? "Chosen moves" : "Moves seen so far"),
      ...(full ? shown.map((m) => kv(m.n, `${cap(m.t)} · ${cap(m.c)} · ${m.p == null ? "—" : m.p} power · ${m.a == null ? "—" : m.a + "%"} · ${m.pp} uses`, m.d || ""))
        : used.map((n) => kv(n, "used"))),
      full ? (shown.length ? null : note("No moves chosen yet: a sensible default set is used.")) : (used.length ? null : note("It has not used a move yet. Its chosen moves stay hidden until it does.")),
      kv("Playable moves", e.nmoves, "How many of its moves this game models (the rest are filtered out when you choose)."));
    // type matchup: defence per attacking type, and what its own types hit
    const eff = (t) => E.typeEff(t, e.types), groups = [[4, "4×"], [2, "2×"], [0.5, "½×"], [0.25, "¼×"], [0, "immune"]];
    put(matchup, el("h3", { class: "ic-h" }, "Type matchup"),
      ...groups.map(([v, label]) => { const ts = D.typeNames.filter((t) => eff(t) === v); return ts.length ? kv(v === 0 ? "Immune to" : `Takes ${label} from`, ts.map(cap).join(", "), v === 0 ? "These attacking types do nothing to it." : `${label} damage from these attacking types (both of its types multiplied together).`) : null; }),
      ...e.types.map((t) => { const row = D.chart[t] || {}, x2 = Object.keys(row).filter((k) => row[k] === 2), x5 = Object.keys(row).filter((k) => row[k] === 0.5), x0 = Object.keys(row).filter((k) => row[k] === 0); return kv(`${cap(t)} moves`, [x2.length ? "2× " + x2.map(cap).join(", ") : "", x5.length ? "½× " + x5.map(cap).join(", ") : "", x0.length ? "0× " + x0.map(cap).join(", ") : ""].filter(Boolean).join(" · ") || "neutral against everything", "What a move of this type does to each defending type."); }));
    // worked example against the average Pokémon of the pool, with the engine's own calcDamage
    const ref = referenceMon(pool), phys = e.atk >= e.spa, gen = { k: "example", n: "an 80-power move", t: e.types[0], c: phys ? "physical" : "special", p: 80, a: 100, pp: 15, pr: 0, tg: 10 };
    const gset = { moves: [], ability: full && set && set.ability ? set.ability : "" }, g = damageRange(e, gset, gen, ref);
    const rows = [];
    if (full) for (const m of shown.filter((x) => x.c !== "status" && x.p != null)) { const r = damageRange(e, set, m, ref); rows.push(kv(m.n, `${r.lo}–${r.hi} (${Math.round((r.lo / r.max) * 100)}–${Math.round((r.hi / r.max) * 100)}%)`, `Damage against ${ref.ent.name} (HP ${r.max}), no crit; a crit does up to ${r.crit}.`)); }
    put(example, el("h3", { class: "ic-h" }, `Worked example: damage vs ${ref.ent.name}`),
      note(`${ref.ent.name} has the pool's average Level-50 stats (HP ${g.max}); weather, screens and abilities of the target are ignored.`),
      formula(`damage = floor(floor(floor(2 × ${E.LEVEL} / 5 + 2) × power × attack / defense) / 50) + 2\n× random ${RULES.roll[0]}–${RULES.roll[1]}%  × STAB ${RULES.stab} (${RULES.adaptability} with Adaptability)  × type effect  (× ${RULES.crit} on a crit; halved by a burn on a physical move)\nminimum 1 unless the target is immune`),
      kv(`${gen.n} of type ${cap(gen.t)} (${gen.c})`, `${g.lo}–${g.hi}`, `With the ${phys ? "Attack vs Defense" : "Sp. Attack vs Sp. Defense"} he has. STAB applies, the target is a plain Normal type, ${g.crit} on a crit.`),
      kv("Crit chance", RULES.critChance.map((x) => Math.round(x * 10) / 10 + "%").join(" / "), "By crit stage 0 / 1 / 2 / 3+ (high-crit moves and Focus Energy raise the stage)."),
      ...rows);
  };
  const d0 = E.getData();
  if (d0) { fill(d0); root._ready = Promise.resolve(); } else root._ready = Dt.loadBattleData().then(fill).catch(() => abilities.append(note("Move data could not be loaded.")));
  return root;
});
