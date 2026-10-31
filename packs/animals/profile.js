// packs/animals/profile.js: the "i" profile of an animal (Animal War world).
// A separate file on purpose: packs/animals/pack.js is inlined into the Worker and must stay import-free.
// Every number below comes from js/rules.js (the same constants js/sim.js uses), so a tuning change shows up here by itself.
// The text of each rule follows js/sim.js; tools/test-infocard.mjs fails when a constant changes and this text does not.
import * as R from "../../js/rules.js";
import { hpOf } from "../../js/sim.js";
import * as P from "../../js/pack.js";
import { registerProfile, kit } from "../../js/infocard.js";

const { el, section, kv, bar, chips, chip, formula, note, list } = kit;
const pc = (x) => Math.round(x * 100);
const r1 = (x) => Math.round(x * 10) / 10;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const avg = (l, k) => (l.length ? l.reduce((s, a) => s + (a[k] || 0), 0) / l.length : 0);
const fmtMass = (m) => (m >= 1000 ? +(m / 1000).toPrecision(3) + " t" : (m >= 100 ? Math.round(m) : m >= 1 ? +m.toFixed(1) : +m.toPrecision(2)) + " kg");
const TAG_TEXT = {
  pack: (d) => `Pack: +${pc(d.perMate)}% damage for each other pack animal still standing on your team (capped with all other bonuses at +${pc(R.SYNERGY_CAP)}%).`,
  herd: (d) => `Herd: when a herd animal is hit, ${pc(d.share)}% of the blow is shared among its standing herd mates.`,
  ambush: (d) => `Ambush: +${pc(d.bonus)}% damage during the first ${d.ticks} round${d.ticks === 1 ? "" : "s"}.`,
  venom: (d) => `Venom: a landed hit poisons the target for ${R.VENOM_WINDOW} rounds, ${+(d.dotFrac * 100).toFixed(1)}% of the animal's Offense per round (a new bite replaces the old one from the same animal).`,
  armored: (d) => `Armored: every hit taken is cut by ${pc(d.reduction)}%.`,
  flier: (d) => `Flier: +${pc(d.evasion)}% miss chance for attackers that cannot fly.`
};

export function tagText(tag) { const d = R.TAGS[tag]; return d && TAG_TEXT[tag] ? TAG_TEXT[tag](d) : null; }

// ---- how a fight works: the generic rules, generated from the constants (shared by every animal) ----
export function fightRules(fleeing) {
  return [
    `Order: each round every standing animal acts by Speed (limping animals count ${pc(R.LIMP_SPEED)}%) plus a random 0 to ${R.SPEED_JITTER}.`,
    `Targeting: while the enemy has both rows, ${pc(R.FRONT_HIT)}% of attacks go to the front ${R.FRONT_SLOTS} slots. Inside a row an animal is "smart" with a chance equal to its Instinct %: then it hits the weakest (${pc(R.SMART_TARGET_WEAKEST)}%) or the highest-Offense enemy, otherwise the nearest.`,
    `Miss chance = ${pc(R.MISS_BASE)}% + (target Speed − attacker Speed) × ${R.SPEED_DODGE_K} (max ${pc(R.SPEED_DODGE_CAP)}%) + (attacker size − target size) × ${R.SIZE_DODGE_K} (max ${pc(R.SIZE_DODGE_CAP)}%) + ${pc(R.TAGS.flier.evasion)}% against a flier.`,
    `Damage = Offense × ${R.DEF_K}/(${R.DEF_K} + target Defense) × random ${R.DMG_MIN}–${R.DMG_MAX} × ${R.DMG_SCALE} × (1 + synergy + arena bonus) × crit × armor × trait multipliers.`,
    `Crit chance = ${pc(R.CRIT_CHANCE)}% + Instinct/100 × ${pc(R.CRIT_INSTINCT_K)}%; a crit multiplies damage by ${R.CRIT_MULT}.`,
    `Venom damage over time lasts ${R.VENOM_WINDOW} rounds; herd damage is split ${pc(R.TAGS.herd.share)}% among herd mates.`,
    `Synergy (pack, ambush) is capped at +${pc(R.SYNERGY_CAP)}% damage in total.`,
    `Limp: below ${pc(R.LIMP_FRAC)}% of max HP an animal acts and dodges at ${pc(R.LIMP_SPEED)}% Speed.`,
    fleeing
      ? `Morale (Animal Fleeing is ON in this room): once ${R.MORALE_LOSS_COUNT} teammates are down or gone, each standing animal flees with ${pc(R.MORALE_FLEE_BASE)}% × (1 − Instinct/100) each round.`
      : `Morale: Animal Fleeing is OFF in this room, so nobody flees; fights run until one side is down. (When it is on, once ${R.MORALE_LOSS_COUNT} teammates have fallen each animal flees with ${pc(R.MORALE_FLEE_BASE)}% × (1 − Instinct/100) per round.)`,
    `A downed animal dies with ${pc(R.DEATH_CHANCE)}% chance, otherwise it collapses. After ${R.MAX_TICKS} rounds the fight is a draw.`
  ];
}

// ---- the worked example: this animal against the average animal of the pool ----
export function workedExample(a, pool) {
  const ref = { speed: avg(pool, "speed"), defense: avg(pool, "defense"), size: avg(pool, "size"), offense: avg(pool, "offense"), hp: pool.length ? pool.reduce((s, x) => s + hpOf(x), 0) / pool.length : hpOf(a) };
  const mitig = R.DEF_K / (R.DEF_K + ref.defense);
  const mid = a.offense * mitig * ((R.DMG_MIN + R.DMG_MAX) / 2) * R.DMG_SCALE;
  const speedDodge = clamp((ref.speed - a.speed) * R.SPEED_DODGE_K, 0, R.SPEED_DODGE_CAP), sizeDodge = clamp((a.size - ref.size) * R.SIZE_DODGE_K, 0, R.SIZE_DODGE_CAP);
  const miss = R.MISS_BASE + speedDodge + sizeDodge;
  const crit = R.CRIT_CHANCE + (a.instinct / 100) * R.CRIT_INSTINCT_K;
  const perAttack = mid * (1 - miss) * (1 + crit * (R.CRIT_MULT - 1));
  const hitDodge = clamp((a.speed - ref.speed) * R.SPEED_DODGE_K, 0, R.SPEED_DODGE_CAP), hitSize = clamp((ref.size - a.size) * R.SIZE_DODGE_K, 0, R.SIZE_DODGE_CAP);
  const missAgainst = R.MISS_BASE + hitDodge + hitSize + ((a.tags || []).includes("flier") ? R.TAGS.flier.evasion : 0);
  return { ref, mitig, mid, miss, crit, perAttack, rounds: perAttack > 0 ? ref.hp / perAttack : Infinity, missAgainst };
}

const FACT_UNITS = { kmh: "km/h", cm: "cm", m: "m", kg: "kg", g: "g", years: "years", year: "years", mm: "mm" };
function factLabel(k) { const parts = k.split("_"), u = FACT_UNITS[parts[parts.length - 1]]; return { name: (u ? parts.slice(0, -1) : parts).join(" "), unit: u || "" }; }
// the quiz fact file is large, so it is only loaded when a profile is opened (and only a few rows are shown)
async function loadFacts(id, host) {
  try {
    const m = await import("../../animals/animals_facts.js");
    const f = m.default && m.default[id] && m.default[id].facts;
    const rows = f ? Object.entries(f).slice(0, 6) : [];
    if (!rows.length) { host.hidden = true; return; }
    host.append(...rows.map(([k, x]) => { const { name, unit } = factLabel(k); return kv(name[0].toUpperCase() + name.slice(1), `${x.v}${unit ? " " + unit : ""}${x.lo != null && x.hi != null ? ` (${x.lo}–${x.hi})` : ""}`, `Confidence: ${x.conf || "?"}. ${x.note || ""} Source: ${x.src || "n/a"}`); }), note("Rough real-world figures from the quiz fact file; ranges are the plausible spread."));
  } catch (e) { host.hidden = true; }
}

registerProfile("animals", (ctx, a, opts) => {
  const pack = ctx.pack, pool = (ctx.entities && ctx.entities.list) || [], hide = !!opts.hideTraits;
  const fleeing = !!(ctx.settings && ctx.settings().animalFleeing === true);
  const tough = P.toughnessTable(pool).get(a.id) || { v: Math.round(R.toughnessOf(a)), rank: 0, of: 0, pct: 50 };
  const hp = hpOf(a), ex = workedExample(a, pool);
  const stat = (s) => bar(s.label, a[s.key], 100, s.description, "s-" + s.key);
  const arenaRows = pack.arenas.map((ar) => { const v = (a.arena_bonus && a.arena_bonus[ar.id]) || 0; return kv(ar.label, `${v > 0 ? "+" : ""}${v}%`, `${ar.label}: ${v > 0 ? "+" : ""}${v}% damage dealt here (multiplies with synergy; added into (1 + synergy + arena bonus)).`); });
  const tags = (Array.isArray(a.tags) ? a.tags : []);
  const up = a.traits && R.TRAIT_UP[a.traits.up], down = a.traits && R.TRAIT_DOWN[a.traits.down];
  const trait = (kind, d) => hide ? kv(kind, "???", "Mystery traits are on: strengths and weaknesses are revealed once the lot is sold.")
    : d ? el("div", { class: "ic-sec" }, kv(kind, chip(d.name, d.desc, kind === "Strength" ? "up" : "down")), note(d.desc)) : kv(kind, "none");
  const why = !hide && a.traits && a.traits.why ? note("Why: " + a.traits.why) : null;
  const facts = el("section", { class: "ic-sec" }, el("h3", { class: "ic-h" }, "Real-world facts"));
  loadFacts(a.id, facts);
  return el("div", { class: "ic-prof" },
    section("Identity", kv("Class", P.cap(a.class || "?")), kv("Habitats", (a.habitats || []).join(", ") || "?"), kv("Mass", a.mass_kg != null ? fmtMass(a.mass_kg) : "?", "Real body mass. Size (below) is a log scale of mass from 1 to 100."), a.special ? note(a.special) : null),
    section("Stats (0 to 100)", ...pack.stats.map(stat)),
    section("Hit points and toughness",
      kv("HP", r1(hp), "Starting hit points. Nothing heals them except Regenerating."),
      formula(`HP = ${R.HP_BASE} + size × ${R.HP_SIZE_K} + stamina × ${R.HP_STAMINA_K}\n   = ${R.HP_BASE} + ${a.size} × ${R.HP_SIZE_K} + ${a.stamina} × ${R.HP_STAMINA_K} = ${r1(hp)}`),
      kv("Toughness", `${tough.v}${tough.of ? ` (rank ${tough.rank} of ${tough.of})` : ""}`, R.TOUGHNESS.description),
      formula(`Toughness = HP × (${R.DEF_K} + defense) / ${R.DEF_K}\n          = ${r1(hp)} × ${(R.DEF_K + a.defense) / R.DEF_K} = ${Math.round(R.toughnessOf(a))}`)),
    section("Tags", tags.length ? list(tags.map((t) => tagText(t) || t)) : note("No tags: this animal has no pack, herd, venom, armor, ambush or flight bonus.")),
    section("Strength and weakness", trait("Strength", up), trait("Weakness", down), why),
    section("Arena bonuses (% damage dealt)", ...arenaRows),
    section("How a fight works", note("Taken from the fight simulation; the numbers are the live game constants."), list(fightRules(fleeing))),
    section(`Worked example: ${a.name} vs the average ${pack.nouns.singular}`,
      note(`The pool average is Speed ${r1(ex.ref.speed)}, Defense ${r1(ex.ref.defense)}, size ${r1(ex.ref.size)}, HP ${r1(ex.ref.hp)}. Tags, traits and arena are ignored here.`),
      formula(`Damage per hit = ${a.offense} × ${R.DEF_K}/(${R.DEF_K} + ${r1(ex.ref.defense)}) × avg(${R.DMG_MIN},${R.DMG_MAX}) × ${R.DMG_SCALE}\n= ${r1(ex.mid)}`),
      formula(`Miss chance = ${pc(R.MISS_BASE)}% + ${pc(clamp((ex.ref.speed - a.speed) * R.SPEED_DODGE_K, 0, R.SPEED_DODGE_CAP))}% (speed) + ${pc(clamp((a.size - ex.ref.size) * R.SIZE_DODGE_K, 0, R.SIZE_DODGE_CAP))}% (size) = ${pc(ex.miss)}%`),
      formula(`Crit chance = ${pc(R.CRIT_CHANCE)}% + ${a.instinct}/100 × ${pc(R.CRIT_INSTINCT_K)}% = ${r1(ex.crit * 100)}%`),
      kv("Expected damage per attack", r1(ex.perAttack), "Damage × (1 − miss) × (1 + crit chance × (crit multiplier − 1))."),
      kv("Rounds to down the average animal", Number.isFinite(ex.rounds) ? r1(ex.rounds) : "never", "Average HP divided by expected damage per attack, if every attack hit this one animal."),
      kv("Chance an average attacker misses it", `${pc(ex.missAgainst)}%`, "Base miss + speed edge + size edge (+ flier bonus).")),
    facts);
});
