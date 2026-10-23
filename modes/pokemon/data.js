// modes/pokemon/data.js — loads the battle data (moves, learnsets, abilities, type chart) once, lazily, and builds default movesets.
import * as E from "./engine.js";

const ROOT = new URL("../../", import.meta.url);
const at = (rel) => new URL(rel, ROOT).href;
let P = null;
export function loadBattleData() {
  if (!P) P = Promise.all(["pokemon/moves.js", "pokemon/learnsets.js", "pokemon/abilities.js", "pokemon/types.js"].map((f) => import(at(f)).then((m) => m.default))).then(([moves, learn, abilities, types]) => {
    const learnsets = {};
    for (const [pid, s] of Object.entries(learn)) learnsets[pid] = s.split(",").filter(Boolean).map((x) => parseInt(x, 36));
    const d = { moves, learnsets, abilities, chart: types.chart, typeNames: types.names };
    E.setData(d); return d;
  });
  return P;
}
export const learnsetOf = (d, e) => (d.learnsets[e.pid] || []).filter((id) => d.moves[id] && E.isPlayable(d.moves[id]));

const SETUP = new Set(["swords-dance", "nasty-plot", "calm-mind", "dragon-dance", "bulk-up", "quiver-dance", "shell-smash", "agility", "iron-defense", "amnesia", "curse", "work-up", "coil", "shift-gear", "tail-glow", "hone-claws", "cosmic-power", "growth", "rock-polish", "autotomize", "belly-drum", "acid-armor", "barrier", "cotton-guard"]);
const UTIL = new Set(["recover", "roost", "soft-boiled", "slack-off", "milk-drink", "synthesis", "moonlight", "morning-sun", "rest", "shore-up", "heal-order"]);
const STATUS = new Set(["toxic", "will-o-wisp", "thunder-wave", "spore", "sleep-powder", "hypnosis", "stun-spore", "leech-seed", "glare", "yawn", "poison-powder", "sing", "lovely-kiss", "confuse-ray", "swagger"]);
const PRIV = new Set(["protect", "substitute", "stealth-rock", "spikes", "toxic-spikes"]);

export function autoMoveset(d, e) {
  const ids = learnsetOf(d, e), phys = e.atk >= e.spa;
  const sc = (id) => {
    const m = d.moves[id]; if (m.c === "status" || m.p == null && !m.mc) return -1;
    let p = m.p == null ? ({ "low-kick": 70, "grass-knot": 70, "heavy-slam": 70, "heat-crash": 70, "gyro-ball": 60, "electro-ball": 70, "return": 102, "frustration": 40, "eruption": 100, "water-spout": 100, "dragon-energy": 100, "flail": 60, "reversal": 60, "stored-power": 40, "power-trip": 40, "punishment": 60 })[m.k] || 0 : m.p;
    if (m.mc === 9) p = 40;
    if (m.hmax) p *= (m.hmin + m.hmax) / 2;
    if (m.k === "seismic-toss" || m.k === "night-shade") p = 50; if (m.k === "dragon-rage" || m.k === "sonic-boom" || m.k === "super-fang") p = 35;
    p *= (m.a == null ? 1 : m.a / 100);
    if (e.types.includes(m.t)) p *= 1.5;
    if ((m.c === "physical") !== phys && !["psyshock", "psystrike", "body-press"].includes(m.k)) p *= Math.abs(e.atk - e.spa) > 15 ? 0.35 : 0.8;
    if (m.f && (m.f.includes("charge") || m.f.includes("recharge"))) p *= 0.6;
    if (["self-destruct", "explosion", "misty-explosion", "memento"].includes(m.k)) p *= 0.3;
    if (m.dr && m.dr < 0) p *= 0.85;
    if (m.pr > 0) p *= 1.1;
    return p;
  };
  const dmg = ids.map((id) => ({ id, s: sc(id), t: d.moves[id].t })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  const pick = [], types = new Set(), has = (id) => pick.includes(id);
  for (const t of e.types) { const x = dmg.find((y) => y.t === t && !has(y.id)); if (x && x.s > 30) { pick.push(x.id); types.add(t); } }
  const cover = dmg.find((y) => !types.has(y.t) && !has(y.id) && y.s > 25); if (cover && pick.length < 4) { pick.push(cover.id); types.add(cover.t); }
  const kOf = (id) => d.moves[id].k, byK = (set) => ids.find((id) => set.has(kOf(id)) && !has(id));
  const bulky = e.hp + e.def + e.spd > 250, setup = byK(SETUP), util = byK(UTIL), stat = byK(STATUS);
  if (pick.length < 4 && setup && (bulky || e.spe > 90 || e.atk > 110 || e.spa > 110)) { const best = ids.filter((id) => SETUP.has(kOf(id))); const rel = best.find((id) => { const m = d.moves[id]; return (m.st || []).some(([s, c]) => c > 0 && (s === 2 ? phys : s === 4 ? !phys : s === 6)); }); if (rel) pick.push(rel); }
  if (pick.length < 4 && util && bulky) pick.push(util);
  if (pick.length < 4 && stat && e.bst < 560) pick.push(stat);
  for (const x of dmg) { if (pick.length >= 4) break; if (!has(x.id) && !types.has(x.t)) { pick.push(x.id); types.add(x.t); } }
  for (const x of dmg) { if (pick.length >= 4) break; if (!has(x.id)) pick.push(x.id); }
  for (const id of ids) { if (pick.length >= 4) break; if (!has(id) && !PRIV.has(kOf(id)) && d.moves[id].c !== "status") pick.push(id); }
  for (const id of ids) { if (pick.length >= 4) break; if (!has(id)) pick.push(id); }
  return pick.slice(0, 4);
}
export function bestAbility(d, e) {
  const list = e.abilities; if (!list.length) return "";
  const good = list.filter((a) => E.ABILITIES.has(a.id)); const first = list.find((a) => !a.hidden) || list[0];
  return first.id || (good[0] || list[0]).id;
}
export const defaultSet = (d, e) => ({ moves: autoMoveset(d, e), ability: bestAbility(d, e) });
export function monFor(d, e, set) {
  const s = set && set.moves && set.moves.length ? set : defaultSet(d, e);
  return E.buildMon(e, { moves: s.moves.map(Number), ability: s.ability || bestAbility(d, e) });
}
