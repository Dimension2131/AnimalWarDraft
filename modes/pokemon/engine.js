// =====================================================================
// modes/pokemon/engine.js — turn-based Pokémon battle engine (singles, switching, Lv 50). Pure JS, no DOM, no network.
// One engine for both battle styles: "auto" = runAuto() lets the AI choose for both sides; "manual" = players choose, the host calls advance().
// The state is a plain JSON object (rng state included), so the same seed + same choices give the same battle on every device.
//
// Mechanics (honest list, see docs/POKEMON_MODE.md): stats Lv50 / IV31 / 84 EV / neutral nature, damage formula of gens 5+, STAB, type chart (gen 6+),
// crits, accuracy/evasion stages, priority, speed order (+Trick Room), burn/paralysis/poison/toxic/sleep/freeze/confusion/flinch/leech seed/binding,
// stat stages, drain/recoil/heal, multi-hit, two-turn and recharge moves, weather, screens, entry hazards, Protect, Substitute, Rest, ~40 abilities.
// NOT modelled: held items, Z/Max/Tera/Mega, doubles, most "unique" moves (see isPlayable), pivoting (U-turn only deals damage).
// =====================================================================
export const LEVEL = 50, MAX_TURNS = 300;
let D = null;                       // { moves, abilities, chart }  injected by setData()
export const setData = (d) => { D = d; };
export const getData = () => D;
const mvOf = (id) => (id === -1 || id === "struggle" ? STRUGGLE : D.moves[id]);
const STRUGGLE = { k: "struggle", n: "Struggle", t: "typeless", c: "physical", p: 50, a: null, pp: 1, pr: 0, tg: 10, dr: -25, f: ["contact"] };

// ---------- rng (state lives in the battle) ----------
function rnd(S) { S.rng = (S.rng + 0x6D2B79F5) | 0; let t = S.rng; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const ri = (S, n) => Math.floor(rnd(S) * n);
const pct = (S, p) => rnd(S) * 100 < p;
const fl = Math.floor, clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- what is implemented ----------
const LOCK = new Set(["outrage", "thrash", "petal-dance", "raging-fury"]);
export const STAT_IDS = { 2: "atk", 3: "def", 4: "spa", 5: "spd", 6: "spe", 7: "acc", 8: "eva" };
const STAT_NAME = { atk: "Attack", def: "Defense", spa: "Sp. Atk", spd: "Sp. Def", spe: "Speed", acc: "accuracy", eva: "evasiveness" };
const SUP_AIL = new Set(["paralysis", "sleep", "freeze", "burn", "poison", "confusion", "leech-seed", "trap", "yawn"]);
const CURATED = new Set(["protect", "detect", "spiky-shield", "kings-shield", "baneful-bunker", "obstruct", "silk-trap", "burning-bulwark", "substitute", "rain-dance", "sunny-day", "sandstorm", "hail", "snowscape",
  "reflect", "light-screen", "aurora-veil", "stealth-rock", "spikes", "toxic-spikes", "sticky-web", "trick-room", "rest", "haze", "belly-drum", "focus-energy", "toxic", "metronome", "taunt", "tailwind"]);
const VARPOW = new Set(["low-kick", "grass-knot", "heavy-slam", "heat-crash", "gyro-ball", "electro-ball", "return", "frustration", "eruption", "water-spout", "dragon-energy", "flail", "reversal", "stored-power", "power-trip", "punishment"]);
const FIXED = { "seismic-toss": () => LEVEL, "night-shade": () => LEVEL, "dragon-rage": () => 40, "sonic-boom": () => 20, "super-fang": (t) => Math.max(1, fl(t.hp / 2)), "natures-madness": (t) => Math.max(1, fl(t.hp / 2)) };
const BAD = new Set(["focus-punch", "counter", "mirror-coat", "metal-burst", "bide", "endeavor", "final-gambit", "fling", "natural-gift", "belch", "spit-up", "beat-up", "present", "magnitude", "psywave", "trump-card", "wring-out", "crush-grip", "guardian-of-alola", "pika-papow", "veevee-volley",
  "pursuit", "last-resort", "dream-eater", "snore", "sleep-talk", "future-sight", "doom-desire", "rollout", "ice-ball", "fury-cutter", "uproar", "round", "echoed-voice", "hidden-power", "thief", "covet", "trick", "switcheroo"]);
const HEAL_WEATHER = new Set(["synthesis", "moonlight", "morning-sun"]);
export function isPlayable(m) {
  if (!m || BAD.has(m.k)) return false;
  if (CURATED.has(m.k)) return true;
  if (m.c !== "status") { if (m.mc === 9) return true; if (m.p == null) return VARPOW.has(m.k) || !!FIXED[m.k]; return true; }
  if (m.mc === 1) return SUP_AIL.has(m.ai);
  if (m.mc === 2 || m.mc === 5) return !!m.st;
  if (m.st && m.st.length && m.tg === 7) return true;
  if (m.mc === 3) return !!m.hl;
  if (m.mc === 12) return true;
  return false;
}
export const ABILITIES = new Set(["intimidate", "drizzle", "drought", "sand-stream", "snow-warning", "technician", "adaptability", "huge-power", "pure-power", "guts", "thick-fat", "multiscale", "shadow-shield", "sturdy", "levitate",
  "flash-fire", "water-absorb", "dry-skin", "storm-drain", "volt-absorb", "lightning-rod", "motor-drive", "sap-sipper", "wonder-guard", "filter", "solid-rock", "prism-armor", "tinted-lens", "static", "flame-body", "poison-point",
  "rough-skin", "iron-barbs", "magic-guard", "speed-boost", "poison-heal", "regenerator", "natural-cure", "swift-swim", "chlorophyll", "sand-rush", "slush-rush", "marvel-scale", "clear-body", "white-smoke", "full-metal-body",
  "hyper-cutter", "keen-eye", "defiant", "competitive", "moxie", "limber", "insomnia", "vital-spirit", "water-veil", "magma-armor", "own-tempo", "compound-eyes", "no-guard", "rock-head", "mold-breaker", "teravolt", "turboblaze", "sand-veil", "snow-cloak", "overgrow", "blaze", "torrent", "swarm"]);

// ---------- stats / helpers ----------
export const hpStat = (e) => (e.id === "shedinja" ? 1 : e.hp + 86);
export const otherStat = (b) => b + 31;
export function buildMon(e, set) {
  const mvs = (set && set.moves) || [], ab = (set && set.ability) || (e.abilities.find((a) => !a.hidden) || e.abilities[0] || {}).id || "";
  const max = hpStat(e);
  return { id: e.id, pid: e.pid, name: e.name, types: e.types.slice(), wt: e.weight_kg, hp: max, max, atk: otherStat(e.atk), def: otherStat(e.def), spa: otherStat(e.spa), spd: otherStat(e.spd), spe: otherStat(e.spe),
    ab, moves: mvs.filter((id) => D.moves[id]).slice(0, 4).map((id) => ({ id, pp: D.moves[id].pp, max: D.moves[id].pp })), st: null, sl: 0, tx: 0, stg: {}, v: {}, fnt: false };
}
const side = (S, i) => S.sides[i], act = (S, i) => S.sides[i].team[S.sides[i].active];
const alive = (sd) => sd.team.filter((m) => !m.fnt).length;
const emit = (S, e) => S._ev.push(e);
const say = (S, t) => emit(S, { e: "text", t });
const mult = (n) => (n >= 0 ? (2 + n) / 2 : 2 / (2 - n)), amult = (n) => (n >= 0 ? (3 + n) / 3 : 3 / (3 - n));
const hasAb = (S, m, ab) => m.ab === ab && !m.v.noAb;
const grounded = (S, m) => !m.types.includes("flying") && !hasAb(S, m, "levitate");
const wxActive = (S, w) => S.weather === w || (w === "hail" && S.weather === "snow");
export function eStat(S, m, k, ignoreStage) {
  let v = m[k] * (ignoreStage ? 1 : mult(m.stg[k] || 0));
  if (k === "atk" && (m.ab === "huge-power" || m.ab === "pure-power")) v *= 2;
  if (k === "atk" && m.ab === "guts" && m.st) v *= 1.5;
  if (k === "def" && m.ab === "marvel-scale" && m.st) v *= 1.5;
  if (k === "spe") {
    if (m.st === "par") v *= 0.5;
    if (S.sides[sideOf(S, m)].tw > 0) v *= 2;
    if ((m.ab === "swift-swim" && S.weather === "rain") || (m.ab === "chlorophyll" && S.weather === "sun") || (m.ab === "sand-rush" && S.weather === "sand") || (m.ab === "slush-rush" && wxActive(S, "hail"))) v *= 2;
  }
  return Math.max(1, fl(v));
}
export function typeEff(type, defTypes, mv) {
  let f = 1; const row = D.chart[type] || {};
  for (const t of defTypes) { let x = row[t] ?? 1; if (mv && mv.k === "freeze-dry" && t === "water") x = 2; f *= x; }
  return f;
}
const hasType = (m, t) => m.types.includes(t);

// ---------- creating a battle ----------
export function createBattle({ teams, names, seed }) {
  const S = { turn: 1, phase: "choose", rng: seed | 0, weather: null, wt: 0, tr: 0, over: null, need: [true, true],
    sides: teams.map((t, i) => ({ name: (names && names[i]) || "Side " + (i + 1), team: t.map((m) => JSON.parse(JSON.stringify(m))), active: 0, hz: { rocks: 0, spikes: 0, tspikes: 0, web: 0 }, scr: { reflect: 0, light: 0, veil: 0 }, tw: 0 })), _ev: [] };
  return S;
}
export function start(S) {   // emits the lead send-outs; call once after createBattle
  S._ev = [];
  const order = [0, 1].sort((a, b) => eStat(S, act(S, b), "spe") - eStat(S, act(S, a), "spe") || rnd(S) - 0.5);
  for (const si of order) sendOut(S, si, S.sides[si].active, true);
  emit(S, { e: "turn", n: 1 }); faintCheck(S);
  const ev = S._ev; S._ev = []; return ev;
}

// ---------- choices ----------
export function legalChoices(S, si) {
  if (S.over) return [];
  const sd = side(S, si), m = act(S, si), out = [];
  const bench = sd.team.map((x, i) => ({ x, i })).filter(({ x, i }) => !x.fnt && i !== sd.active);
  if (S.phase === "replace") return S.need[si] ? bench.map(({ i }) => ({ t: "switch", i })) : [];
  if (m.v.recharge) return [{ t: "move", i: 0, forced: true }];
  if (m.v.lock) return [{ t: "move", i: m.v.lock.mi, forced: true }];
  if (m.v.charge) return [{ t: "move", i: m.v.charge.mi, forced: true }];
  m.moves.forEach((mv, i) => { if (mv.pp > 0 && !(m.v.taunt > 0 && D.moves[mv.id].c === "status")) out.push({ t: "move", i }); });
  if (!out.length) out.push({ t: "move", i: -1 });
  if (!m.v.trap && !m.v.seedTrap) bench.forEach(({ i }) => out.push({ t: "switch", i }));
  return out;
}
export const needsChoice = (S) => (S.over ? [false, false] : S.phase === "replace" ? S.need.slice() : [true, true]);
const sameChoice = (a, b) => a && b && a.t === b.t && a.i === b.i;
function fixChoice(S, si, c) {
  const L = legalChoices(S, si); if (!L.length) return null;
  const hit = c && L.find((x) => sameChoice(x, c));
  return hit || (S.phase === "replace" ? L[ri(S, L.length)] : L.find((x) => x.t === "move") || L[0]);
}

// ---------- main entry ----------
export function advance(S, choices) {
  S._ev = [];
  if (S.over) return [];
  const ch = [0, 1].map((si) => (needsChoice(S)[si] ? fixChoice(S, si, choices && choices[si]) : null));
  if (S.phase === "replace") doReplace(S, ch); else doTurn(S, ch);
  if (!S.over && S.turn > MAX_TURNS) { endByCap(S); }
  const ev = S._ev; S._ev = []; return ev;
}
function endByCap(S) {
  const sc = (sd) => [alive(sd), sd.team.reduce((a, m) => a + (m.fnt ? 0 : m.hp / m.max), 0)];
  const a = sc(side(S, 0)), b = sc(side(S, 1));
  const w = a[0] !== b[0] ? (a[0] > b[0] ? 0 : 1) : Math.abs(a[1] - b[1]) > 0.001 ? (a[1] > b[1] ? 0 : 1) : -1;
  say(S, "The battle took too long! It is decided on the remaining team."); S.over = { w }; emit(S, { e: "end", w });
}

function doTurn(S, ch) {
  const acts = [];
  for (const si of [0, 1]) {
    const m = act(S, si); m.v.moved = false;
    const c = ch[si];
    if (m.v.recharge) acts.push({ si, kind: "recharge", m, pr: 0 });
    else if (m.v.charge) acts.push({ si, kind: "move", mi: m.v.charge.mi, second: true, m, pr: mvOf(m.moves[m.v.charge.mi].id).pr });
    else if (m.v.lock) acts.push({ si, kind: "move", mi: m.v.lock.mi, second: true, lockTurn: true, m, pr: mvOf(m.moves[m.v.lock.mi].id).pr });
    else if (c.t === "switch") acts.push({ si, kind: "switch", i: c.i, m, pr: 9 });
    else acts.push({ si, kind: "move", mi: c.i, m, pr: mvOf(c.i === -1 ? -1 : m.moves[c.i].id).pr });
  }
  const tr = S.tr > 0 ? -1 : 1;
  acts.forEach((a) => { a.sp = eStat(S, a.m, "spe") * tr; a.tie = rnd(S); });
  acts.sort((x, y) => y.pr - x.pr || y.sp - x.sp || y.tie - x.tie);
  for (const a of acts) {
    if (S.over) break;
    if (act(S, a.si) !== a.m) continue;               // the mon that chose this action is gone (dragged out)
    if (a.kind === "switch") { doSwitch(S, a.si, a.i); continue; }
    if (a.m.fnt) continue;
    a.opp = acts.find((x) => x !== a);
    execMove(S, a);
    faintCheck(S);
  }
  if (!S.over) { residual(S); faintCheck(S); }
  if (S.over) return;
  const need = [0, 1].map((si) => act(S, si).fnt && alive(side(S, si)) > 0);
  if (need[0] || need[1]) { S.phase = "replace"; S.need = need; return; }
  S.turn++; S.phase = "choose"; emit(S, { e: "turn", n: S.turn });
}
function doReplace(S, ch) {
  const order = [0, 1].filter((si) => S.need[si]).sort((a, b) => eStat(S, act(S, b), "spe") - eStat(S, act(S, a), "spe"));
  for (const si of order) { if (ch[si] && ch[si].t === "switch") doSwitch(S, si, ch[si].i, true); }
  faintCheck(S);
  if (S.over) return;
  const need = [0, 1].map((si) => act(S, si).fnt && alive(side(S, si)) > 0);
  if (need[0] || need[1]) { S.need = need; return; }
  S.phase = "choose"; S.turn++; emit(S, { e: "turn", n: S.turn });
}

// ---------- fainting / winning ----------
function faintCheck(S) {
  for (const si of [0, 1]) {
    const m = act(S, si);
    if (!m.fnt && m.hp <= 0) { m.hp = 0; m.fnt = true; m.v = {}; m.st = null; say(S, `${m.name} fainted!`); emit(S, { e: "faint", s: si, i: side(S, si).active }); }
  }
  if (S.over) return;
  const a = alive(side(S, 0)), b = alive(side(S, 1));
  if (!a || !b) { const w = !a && !b ? -1 : !a ? 1 : 0; S.over = { w }; emit(S, { e: "end", w }); }
}

// ---------- switching ----------
function doSwitch(S, si, idx, forced) {
  const sd = side(S, si), old = act(S, si);
  if (!old.fnt) {
    say(S, `${sd.name} withdrew ${old.name}!`);
    if (old.ab === "natural-cure" && old.st) { old.st = null; emit(S, { e: "status", s: si, i: sd.active, st: null }); }
    if (old.ab === "regenerator" && old.hp > 0) { old.hp = Math.min(old.max, old.hp + fl(old.max / 3)); emit(S, { e: "hp", s: si, i: sd.active, hp: old.hp, max: old.max }); }
    old.stg = {}; old.v = {}; old.tx = 0;
  }
  sd.active = idx; sendOut(S, si, idx, false);
}
function sendOut(S, si, idx, lead) {
  const sd = side(S, si), m = sd.team[idx];
  m.v = { fresh: 0 }; m.stg = {}; m.tx = 0;
  say(S, `${sd.name} sent out ${m.name}!`); emit(S, { e: "send", s: si, i: idx });
  const hz = sd.hz;
  if (hz.rocks && !hasAb(S, m, "magic-guard")) { const f = typeEff("rock", m.types); hurt(S, si, m, Math.max(1, fl(m.max * f / 8)), `Pointed stones dug into ${m.name}!`); }
  if (grounded(S, m)) {
    if (hz.spikes && !hasAb(S, m, "magic-guard")) hurt(S, si, m, Math.max(1, fl(m.max / ([8, 6, 4][hz.spikes - 1] || 4))), `${m.name} was hurt by the spikes!`);
    if (hz.tspikes) { if (hasType(m, "poison")) { hz.tspikes = 0; say(S, `${m.name} absorbed the poison spikes!`); } else tryStatus(S, si, m, hz.tspikes > 1 ? "tox" : "psn", null, true); }
    if (hz.web) stage(S, si, m, "spe", -1, null);
  }
  if (!m.fnt && m.hp > 0) onEnter(S, si, m);
}
function onEnter(S, si, m) {
  const foe = act(S, 1 - si);
  if (m.ab === "intimidate" && !foe.fnt) { say(S, `${m.name}'s Intimidate cuts ${foe.name}'s Attack!`); stage(S, 1 - si, foe, "atk", -1, m, true); }
  const wx = { drizzle: "rain", drought: "sun", "sand-stream": "sand", "snow-warning": "snow" }[m.ab];
  if (wx && S.weather !== wx) setWeather(S, wx, `${m.name}'s ${D.abilities[m.ab] ? D.abilities[m.ab].n : m.ab}`);
}
function setWeather(S, w, by) {
  S.weather = w; S.wt = 5;
  say(S, { rain: "It started to rain!", sun: "The sunlight turned harsh!", sand: "A sandstorm kicked up!", hail: "It started to hail!", snow: "It started to snow!" }[w]); emit(S, { e: "weather", w });
}

// ---------- damage plumbing ----------
function setHp(S, si, m, hp) { m.hp = clamp(hp, 0, m.max); emit(S, { e: "hp", s: si, i: side(S, si).team.indexOf(m), hp: m.hp, max: m.max }); }
function hurt(S, si, m, n, text) { if (text) say(S, text); setHp(S, si, m, m.hp - n); }
function heal(S, si, m, n, text) { if (n <= 0 || m.hp >= m.max) return false; if (text) say(S, text); setHp(S, si, m, m.hp + n); return true; }
function stageText(d) { const a = Math.abs(d); return (d > 0 ? (a >= 3 ? "rose drastically!" : a === 2 ? "rose sharply!" : "rose!") : (a >= 3 ? "severely fell!" : a === 2 ? "harshly fell!" : "fell!")); }
function stage(S, si, m, k, d, src, fromAbility) {
  if (m.fnt) return false;
  const foeSrc = src && src !== m;
  if (d < 0 && foeSrc) {
    if (["clear-body", "white-smoke", "full-metal-body"].includes(m.ab) && !(src && ["mold-breaker", "teravolt", "turboblaze"].includes(src.ab))) { say(S, `${m.name}'s ${D.abilities[m.ab].n} prevents stat loss!`); return false; }
    if (m.ab === "hyper-cutter" && k === "atk") { say(S, `${m.name}'s Hyper Cutter prevents Attack loss!`); return false; }
    if (m.ab === "keen-eye" && k === "acc") { say(S, `${m.name}'s Keen Eye prevents accuracy loss!`); return false; }
    if (m.v.sub) return false;
  }
  const cur = m.stg[k] || 0, nx = clamp(cur + d, -6, 6);
  if (nx === cur) { say(S, `${m.name}'s ${STAT_NAME[k]} won't go ${d > 0 ? "higher" : "lower"}!`); return false; }
  m.stg[k] = nx; say(S, `${m.name}'s ${STAT_NAME[k]} ${stageText(nx - cur)}`); emit(S, { e: "stage", s: si, k, d: nx - cur });
  if (d < 0 && foeSrc && !m.fnt) {
    if (m.ab === "defiant") { say(S, `${m.name}'s Defiant sharply raises its Attack!`); stage(S, si, m, "atk", 2, m); }
    if (m.ab === "competitive") { say(S, `${m.name}'s Competitive sharply raises its Sp. Atk!`); stage(S, si, m, "spa", 2, m); }
  }
  return true;
}
const STATUS_TEXT = { par: "was paralyzed! It may be unable to move!", brn: "was burned!", frz: "was frozen solid!", psn: "was poisoned!", tox: "was badly poisoned!", slp: "fell asleep!" };
function tryStatus(S, si, m, st, src, quiet) {
  if (m.fnt || m.st) return false;
  const bypass = src && ["mold-breaker", "teravolt", "turboblaze"].includes(src.ab);
  const no = (t) => { if (!quiet) say(S, t); return false; };
  if (m.v.sub && src && src !== m) return no("But it failed!");
  if (st === "par" && (hasType(m, "electric") || (m.ab === "limber" && !bypass))) return no(`It doesn't affect ${m.name}...`);
  if (st === "brn" && (hasType(m, "fire") || (m.ab === "water-veil" && !bypass))) return no(`It doesn't affect ${m.name}...`);
  if (st === "frz" && (hasType(m, "ice") || (m.ab === "magma-armor" && !bypass) || S.weather === "sun")) return no(`It doesn't affect ${m.name}...`);
  if ((st === "psn" || st === "tox") && (hasType(m, "poison") || hasType(m, "steel")) && !(src && src.ab === "corrosion")) return no(`It doesn't affect ${m.name}...`);
  if (st === "slp" && ((m.ab === "insomnia" || m.ab === "vital-spirit") && !bypass)) return no(`${m.name} stays awake!`);
  m.st = st; m.sl = st === "slp" ? 1 + ri(S, 3) : 0; m.tx = st === "tox" ? 1 : 0;
  say(S, `${m.name} ${STATUS_TEXT[st]}`); emit(S, { e: "status", s: si, i: side(S, si).team.indexOf(m), st });
  return true;
}
function tryConfuse(S, m, src) {
  if (m.fnt || m.v.conf > 0) return false;
  if (m.ab === "own-tempo") { say(S, `${m.name}'s Own Tempo prevents confusion!`); return false; }
  if (m.v.sub && src !== m) return false;
  m.v.conf = 2 + ri(S, 4); say(S, `${m.name} became confused!`); return true;
}

// ---------- movement ----------
function canAct(S, si, m, mv) {
  if (m.st === "slp") { m.sl--; if (m.sl <= 0) { m.st = null; say(S, `${m.name} woke up!`); emit(S, { e: "status", s: si, i: side(S, si).active, st: null }); } else { say(S, `${m.name} is fast asleep.`); return false; } }
  if (m.st === "frz") { if (mv.t === "fire" || pct(S, 20)) { m.st = null; say(S, `${m.name} thawed out!`); emit(S, { e: "status", s: si, i: side(S, si).active, st: null }); } else { say(S, `${m.name} is frozen solid!`); return false; } }
  if (m.v.flinch) { m.v.flinch = false; say(S, `${m.name} flinched and couldn't move!`); return false; }
  if (m.v.conf > 0) {
    m.v.conf--;
    if (m.v.conf === 0) say(S, `${m.name} snapped out of its confusion!`);
    else { say(S, `${m.name} is confused!`); if (pct(S, 33)) { const d = rawDamage(S, m, m, { p: 40, c: "physical", t: "typeless", k: "confusion" }, { roll: 100 - ri(S, 16), crit: false, selfHit: true }).d; hurt(S, si, m, d, "It hurt itself in its confusion!"); return false; } }
  }
  if (m.st === "par" && pct(S, 25)) { say(S, `${m.name} is paralyzed! It can't move!`); return false; }
  return true;
}

function execMove(S, a) {
  const si = a.si, A = a.m, Dm = act(S, 1 - si);
  if (a.kind === "recharge") { A.v.recharge = false; say(S, `${A.name} must recharge!`); return; }
  const slot = a.mi === -1 ? null : A.moves[a.mi], mv = mvOf(a.mi === -1 ? -1 : slot.id);
  if (!canAct(S, si, A, mv)) { A.v.charge = null; A.v.lock = null; return; }
  if (A.v.taunt > 0 && mv.c === "status") { say(S, `${A.name} can't use ${mv.n} after the taunt!`); return; }
  if (slot && !a.second) slot.pp--;
  A.v.moved = true;
  say(S, `${A.name} used ${mv.n}!`); emit(S, { e: "move", s: si, m: mv.n, mt: mv.t, c: mv.c });
  if (mv.k !== "protect" && !PROTECTS.has(mv.k)) A.v.pc = 0;
  if (mv.f && mv.f.includes("charge") && !a.second) {
    const skip = (mv.k === "solar-beam" || mv.k === "solar-blade") && S.weather === "sun";
    if (!skip) { A.v.charge = { mi: a.mi }; say(S, chargeText(mv, A)); return; }
  }
  A.v.charge = null;
  if (mv.k === "metronome") { const pool = Object.values(D.moves).filter((x) => isPlayable(x) && x.k !== "metronome" && !PROTECTS.has(x.k)); const pick = pool[ri(S, pool.length)]; say(S, `Waggling a finger let it use ${pick.n}!`); return runMove(S, a, A, Dm, pick); }
  runMove(S, a, A, Dm, mv);
  if (LOCK.has(mv.k) && !A.fnt) {
    if (!a.lockTurn) A.v.lock = { mi: a.mi, n: 1 + ri(S, 2) };
    else if (--A.v.lock.n <= 0) { A.v.lock = null; say(S, `${A.name} became confused due to fatigue!`); tryConfuse(S, A, A); }
  }
}
const PROTECTS = new Set(["protect", "detect", "spiky-shield", "kings-shield", "baneful-bunker", "obstruct", "silk-trap", "burning-bulwark"]);
const chargeText = (mv, A) => ({ "solar-beam": "absorbed light", "solar-blade": "absorbed light", fly: "flew up high", dig: "burrowed underground", dive: "hid underwater", bounce: "sprang up", "skull-bash": "tucked in its head", "razor-wind": "whipped up a whirlwind", "sky-attack": "became cloaked in a harsh light", "freeze-shock": "became cloaked in a freezing light", "ice-burn": "became cloaked in freezing air", geomancy: "is absorbing power" }[mv.k] ? `${A.name} ${({ "solar-beam": "absorbed light", "solar-blade": "absorbed light", fly: "flew up high", dig: "burrowed underground", dive: "hid underwater", bounce: "sprang up", "skull-bash": "tucked in its head", "razor-wind": "whipped up a whirlwind", "sky-attack": "became cloaked in a harsh light", "freeze-shock": "became cloaked in a freezing light", "ice-burn": "became cloaked in freezing air", geomancy: "is absorbing power" })[mv.k]}!` : `${A.name} is charging up!`);

function runMove(S, a, A, Dm, mv) {
  const si = a.si;
  if (mv.c === "status") return statusMove(S, a, si, A, Dm, mv);
  attackMove(S, a, si, A, Dm, mv);
}

// ---------- accuracy / protection ----------
function accOk(S, A, Dm, mv) {
  if (mv.a == null || A.ab === "no-guard" || Dm.ab === "no-guard") return true;
  let acc = mv.a;
  if (mv.mc === 9) acc = 30;
  if (["thunder", "hurricane"].includes(mv.k)) { if (S.weather === "rain") return true; if (S.weather === "sun") acc = 50; }
  if (mv.k === "blizzard" && wxActive(S, "hail")) return true;
  const st = clamp((A.stg.acc || 0) - (Dm.stg.eva || 0), -6, 6);
  acc *= amult(st) * (A.ab === "compound-eyes" ? 1.3 : 1);
  if (Dm.ab === "sand-veil" && S.weather === "sand") acc *= 0.8;
  if (Dm.ab === "snow-cloak" && wxActive(S, "hail")) acc *= 0.8;
  return rnd(S) * 100 < acc;
}
function blockedByProtect(S, A, Dm, mv) {
  if (!Dm.v.prot || !(mv.f && mv.f.includes("protect"))) return false;
  say(S, `${Dm.name} protected itself!`);
  if (Dm.v.protKind === "spiky-shield" && mv.f.includes("contact")) hurt(S, 1 - sideOf(S, Dm), A, Math.max(1, fl(A.max / 8)), `${A.name} was hurt!`);
  if (Dm.v.protKind === "baneful-bunker" && mv.f.includes("contact")) tryStatus(S, sideOf(S, A), A, "psn", Dm);
  if (Dm.v.protKind === "kings-shield" && mv.f.includes("contact")) stage(S, sideOf(S, A), A, "atk", -1, Dm);
  if (Dm.v.protKind === "burning-bulwark" && mv.f.includes("contact")) tryStatus(S, sideOf(S, A), A, "brn", Dm);
  return true;
}
const sideOf = (S, m) => (side(S, 0).team.includes(m) ? 0 : 1);

// ---------- damage ----------
function movePower(S, A, Dm, mv) {
  let p = mv.p; const k = mv.k;
  if (p == null) {
    if (k === "low-kick" || k === "grass-knot") p = Dm.wt < 10 ? 20 : Dm.wt < 25 ? 40 : Dm.wt < 50 ? 60 : Dm.wt < 100 ? 80 : Dm.wt < 200 ? 100 : 120;
    else if (k === "heavy-slam" || k === "heat-crash") { const r = A.wt / Math.max(0.1, Dm.wt); p = r >= 5 ? 120 : r >= 4 ? 100 : r >= 3 ? 80 : r >= 2 ? 60 : 40; }
    else if (k === "gyro-ball") p = Math.min(150, 1 + fl(25 * eStat(S, Dm, "spe") / eStat(S, A, "spe")));
    else if (k === "electro-ball") { const r = eStat(S, A, "spe") / eStat(S, Dm, "spe"); p = r >= 4 ? 150 : r >= 3 ? 120 : r >= 2 ? 80 : r >= 1 ? 60 : 40; }
    else if (k === "return" || k === "frustration") p = 102;
    else if (k === "eruption" || k === "water-spout" || k === "dragon-energy") p = Math.max(1, fl(150 * A.hp / A.max));
    else if (k === "flail" || k === "reversal") { const r = fl(48 * A.hp / A.max); p = r <= 1 ? 200 : r <= 4 ? 150 : r <= 9 ? 100 : r <= 16 ? 80 : r <= 32 ? 40 : 20; }
    else if (k === "stored-power" || k === "power-trip") p = 20 + 20 * Object.values(A.stg).reduce((s, v) => s + Math.max(0, v), 0);
    else if (k === "punishment") p = Math.min(200, 60 + 20 * Object.values(Dm.stg).reduce((s, v) => s + Math.max(0, v), 0));
    else p = 1;
  }
  if (k === "facade" && A.st && A.st !== "slp" && A.st !== "frz") p *= 2;
  if (k === "hex" && Dm.st) p *= 2;
  if (k === "venoshock" && (Dm.st === "psn" || Dm.st === "tox")) p *= 2;
  if (k === "brine" && Dm.hp * 2 <= Dm.max) p *= 2;
  if (k === "acrobatics") p *= 2;
  if (k === "knock-off") p = 65;
  if (A.ab === "technician" && p <= 60) p = fl(p * 1.5);
  return p;
}
function rawDamage(S, A, Dm, mv, o) {
  o = o || {};
  const power = movePower(S, A, Dm, mv), phys = mv.c === "physical";
  let atkK = phys ? "atk" : "spa", defK = phys ? "def" : "spd";
  if (mv.k === "psyshock" || mv.k === "psystrike" || mv.k === "secret-sword") defK = "def";
  const critStage = (mv.cr || 0) + (A.v.focus ? 2 : 0);
  const crit = o.crit != null ? o.crit : (!o.dry && pct(S, [100 / 24, 12.5, 50, 100][Math.min(3, critStage)] * (mv.cr >= 6 ? 100 : 1)));
  const atkSrc = mv.k === "foul-play" ? Dm : A; if (mv.k === "body-press") atkK = "def";
  const aSt = eStat(S, atkSrc, atkK, crit && (atkSrc.stg[atkK] || 0) < 0), dSt = eStat(S, Dm, defK, crit && (Dm.stg[defK] || 0) > 0);
  let d = fl(fl(fl(2 * LEVEL / 5 + 2) * power * aSt / dSt) / 50) + 2;
  if (S.weather === "rain") { if (mv.t === "water") d = fl(d * 1.5); if (mv.t === "fire") d = fl(d * 0.5); }
  if (S.weather === "sun") { if (mv.t === "fire") d = fl(d * 1.5); if (mv.t === "water") d = fl(d * 0.5); }
  if (crit) d = fl(d * 1.5);
  d = fl(d * (o.roll != null ? o.roll : 85 + ri(S, 16)) / 100);
  if (A.types.includes(mv.t)) d = fl(d * (A.ab === "adaptability" ? 2 : 1.5));
  const eff = o.selfHit ? 1 : typeEff(mv.t, Dm.types, mv);
  d = fl(d * eff);
  if (A.st === "brn" && phys && A.ab !== "guts" && mv.k !== "facade") d = fl(d / 2);
  if (!o.selfHit) {
    const dsd = side(S, sideOf(S, Dm));
    if (!crit && ((phys && dsd.scr.reflect > 0) || (!phys && dsd.scr.light > 0) || dsd.scr.veil > 0)) d = fl(d / 2);
    if (Dm.ab === "multiscale" || Dm.ab === "shadow-shield") { if (Dm.hp === Dm.max) d = fl(d / 2); }
    if (Dm.ab === "thick-fat" && (mv.t === "fire" || mv.t === "ice")) d = fl(d / 2);
    if (["filter", "solid-rock", "prism-armor"].includes(Dm.ab) && eff > 1) d = fl(d * 0.75);
    if (A.ab === "tinted-lens" && eff < 1) d *= 2;
    if (A.v.ffBoost && mv.t === "fire") d = fl(d * 1.5);
  }
  if (eff > 0) d = Math.max(1, d);
  return { d, eff, crit };
}
export function expectedDamage(S, A, Dm, mv) { if (!mv || mv.c === "status") return 0; const f = FIXED[mv.k]; if (f) return f(Dm); return rawDamage(S, A, Dm, mv, { roll: 92, crit: false, dry: true }).d * (mv.hmax ? (mv.hmin + mv.hmax) / 2 : 1); }

function absorbImmunity(S, si, A, Dm, mv) {   // abilities that turn a move type into healing / a boost. returns true if the move was absorbed
  const bypass = ["mold-breaker", "teravolt", "turboblaze"].includes(A.ab), ab = Dm.ab, dsi = 1 - si;
  if (bypass) return false;
  const heal4 = (t) => { say(S, `${Dm.name}'s ${D.abilities[ab].n} absorbed the attack!`); heal(S, dsi, Dm, fl(Dm.max / 4)); };
  if (mv.t === "water" && (ab === "water-absorb" || ab === "dry-skin" || ab === "storm-drain")) { if (ab === "storm-drain") { say(S, `${Dm.name}'s Storm Drain absorbed the attack!`); stage(S, dsi, Dm, "spa", 1, Dm); } else heal4(); return true; }
  if (mv.t === "electric" && (ab === "volt-absorb" || ab === "lightning-rod" || ab === "motor-drive")) { if (ab === "volt-absorb") heal4(); else { say(S, `${Dm.name}'s ${D.abilities[ab].n} absorbed the attack!`); stage(S, dsi, Dm, ab === "motor-drive" ? "spe" : "spa", 1, Dm); } return true; }
  if (mv.t === "grass" && ab === "sap-sipper") { say(S, `${Dm.name}'s Sap Sipper absorbed the attack!`); stage(S, dsi, Dm, "atk", 1, Dm); return true; }
  if (mv.t === "fire" && ab === "flash-fire") { say(S, `${Dm.name}'s Flash Fire boosted its fire power!`); Dm.v.ffBoost = true; return true; }
  if (mv.t === "ground" && ab === "levitate") { say(S, `${Dm.name} is unaffected thanks to Levitate!`); return true; }
  return false;
}
function dealDamage(S, si, A, Dm, d, mv) {
  const dsi = 1 - si;
  if (Dm.v.sub > 0 && !(mv.f && mv.f.includes("sound"))) {
    const t = Math.min(Dm.v.sub, d); Dm.v.sub -= t; say(S, Dm.v.sub > 0 ? `The substitute took damage for ${Dm.name}!` : `${Dm.name}'s substitute faded!`);
    if (Dm.v.sub <= 0) { Dm.v.sub = 0; emit(S, { e: "sub", s: dsi, on: false }); }
    return { dealt: t, sub: true };
  }
  if (d >= Dm.hp && Dm.hp === Dm.max && Dm.ab === "sturdy" && !["mold-breaker", "teravolt", "turboblaze"].includes(A.ab)) { d = Dm.hp - 1; say(S, `${Dm.name} hung on using Sturdy!`); }
  d = Math.min(d, Dm.hp); setHp(S, dsi, Dm, Dm.hp - d);
  return { dealt: d, sub: false };
}

function attackMove(S, a, si, A, Dm, mv) {
  const dsi = 1 - si;
  if (mv.k === "sucker-punch" || mv.k === "thunderclap") { const o = a.opp; if (!o || o.kind !== "move" || o.m.v.moved || mvOf(o.m.moves[o.mi] ? o.m.moves[o.mi].id : -1).c === "status") return say(S, "But it failed!"); }
  if (mv.k === "fake-out" || mv.k === "first-impression") { if (A.v.fresh !== 0) return say(S, "But it failed!"); }
  if (blockedByProtect(S, A, Dm, mv)) return;
  if (!accOk(S, A, Dm, mv)) return say(S, `${A.name}'s attack missed!`);
  if (Dm.ab === "wonder-guard" && !["mold-breaker", "teravolt", "turboblaze"].includes(A.ab) && typeEff(mv.t, Dm.types, mv) <= 1) return say(S, `${Dm.name}'s Wonder Guard protects it!`);
  if (absorbImmunity(S, si, A, Dm, mv)) return;
  const eff0 = typeEff(mv.t, Dm.types, mv);
  if (eff0 === 0) return say(S, `It doesn't affect ${Dm.name}...`);
  if (mv.mc === 9) { if (Dm.ab === "sturdy") return say(S, `${Dm.name} is unaffected!`); setHp(S, dsi, Dm, 0); return say(S, "It's a one-hit KO!"); }
  let hits = 1;
  if (mv.hmin) { hits = mv.hmin === mv.hmax ? mv.hmin : (mv.hmin === 2 && mv.hmax === 5 ? (() => { const r = rnd(S); return r < 0.35 ? 2 : r < 0.7 ? 3 : r < 0.85 ? 4 : 5; })() : mv.hmin + ri(S, mv.hmax - mv.hmin + 1)); }
  if (mv.k === "triple-kick" || mv.k === "triple-axel") hits = 3;
  let total = 0, n = 0, anyCrit = false, subbed = false;
  for (let h = 0; h < hits && !Dm.fnt && Dm.hp > 0; h++) {
    let d, crit = false;
    if (FIXED[mv.k]) d = FIXED[mv.k](Dm);
    else { const r = rawDamage(S, A, Dm, (mv.k === "triple-kick" || mv.k === "triple-axel") ? { ...mv, p: (mv.p || 10) * (h + 1) } : mv, {}); d = r.d; crit = r.crit; }
    anyCrit = anyCrit || crit;
    const res = dealDamage(S, si, A, Dm, d, mv); total += res.dealt; n++; subbed = subbed || res.sub;
    if (!res.sub && mv.f && mv.f.includes("contact") && !A.fnt) contactEffects(S, si, A, Dm);
    if (A.fnt || A.hp <= 0) break;
  }
  if (hits > 1) say(S, `Hit ${n} time(s)!`);
  if (!FIXED[mv.k]) { if (eff0 > 1) say(S, "It's super effective!"); else if (eff0 < 1) say(S, "It's not very effective..."); }
  if (anyCrit) say(S, "A critical hit!");
  const sp = Dm.hp <= 0, onMon = !subbed && total > 0;
  if (mv.dr > 0 && total > 0 && !A.fnt) heal(S, si, A, Math.max(1, fl(total * mv.dr / 100)), `${A.name} had its energy drained!`);
  if (mv.dr < 0 && total > 0 && !A.fnt && !["rock-head", "magic-guard"].includes(A.ab)) hurt(S, si, A, Math.max(1, fl(total * -mv.dr / 100)), `${A.name} was damaged by the recoil!`);
  if (["self-destruct", "explosion", "misty-explosion"].includes(mv.k)) { A.hp = 0; setHp(S, si, A, 0); }
  if (mv.f && mv.f.includes("recharge") && !sp) A.v.recharge = true;
  if (onMon && !Dm.fnt) {
    if (mv.ai && SUP_AIL.has(mv.ai) && pct(S, mv.ac || 100)) applyAilment(S, dsi, Dm, mv, A);
    if (mv.fl && !Dm.v.moved && pct(S, mv.fl)) Dm.v.flinch = true;
    if (mv.st && mv.mc === 6 && pct(S, mv.sc || 100)) for (const [sid, ch] of mv.st) if (STAT_IDS[sid]) stage(S, dsi, Dm, STAT_IDS[sid], ch, A);
  }
  if (mv.st && mv.mc === 7 && !A.fnt && total > 0 && pct(S, mv.sc || 100)) for (const [sid, ch] of mv.st) if (STAT_IDS[sid]) stage(S, si, A, STAT_IDS[sid], ch, A);
  if (mv.mc === 12 && !subbed && !Dm.fnt) forceOut(S, dsi);
  if (Dm.hp <= 0 && !Dm.fnt && A.ab === "moxie" && !A.fnt) { say(S, `${A.name}'s Moxie raises its Attack!`); stage(S, si, A, "atk", 1, A); }
}
function contactEffects(S, si, A, Dm) {
  if (Dm.ab === "static" && pct(S, 30)) tryStatus(S, si, A, "par", Dm, true);
  if (Dm.ab === "flame-body" && pct(S, 30)) tryStatus(S, si, A, "brn", Dm, true);
  if (Dm.ab === "poison-point" && pct(S, 30)) tryStatus(S, si, A, "psn", Dm, true);
  if ((Dm.ab === "rough-skin" || Dm.ab === "iron-barbs") && A.ab !== "magic-guard") hurt(S, si, A, Math.max(1, fl(A.max / 8)), `${A.name} was hurt by ${Dm.name}'s ${D.abilities[Dm.ab].n}!`);
}
function forceOut(S, dsi) {
  const sd = side(S, dsi), opts = sd.team.map((m, i) => i).filter((i) => i !== sd.active && !sd.team[i].fnt);
  if (!opts.length) return;
  say(S, `${act(S, dsi).name} was blown away!`); doSwitch(S, dsi, opts[ri(S, opts.length)], true);
}
function applyAilment(S, dsi, Dm, mv, src) {
  const ai = mv.ai;
  if (ai === "paralysis") return tryStatus(S, dsi, Dm, "par", src);
  if (ai === "burn") return tryStatus(S, dsi, Dm, "brn", src);
  if (ai === "freeze") return tryStatus(S, dsi, Dm, "frz", src);
  if (ai === "sleep") return tryStatus(S, dsi, Dm, "slp", src);
  if (ai === "poison") return tryStatus(S, dsi, Dm, mv.k === "toxic" || mv.k === "poison-fang" ? "tox" : "psn", src);
  if (ai === "confusion") return tryConfuse(S, Dm, src);
  if (ai === "leech-seed") { if (Dm.v.seeded != null || hasType(Dm, "grass")) { say(S, `It doesn't affect ${Dm.name}...`); return false; } Dm.v.seeded = 1 - dsi; say(S, `${Dm.name} was seeded!`); return true; }
  if (ai === "trap") { if (Dm.v.trap) return false; Dm.v.trap = 4 + ri(S, 2); say(S, `${Dm.name} was trapped!`); return true; }
  if (ai === "yawn") { if (Dm.v.yawn || Dm.st) return say(S, "But it failed!"); Dm.v.yawn = 2; say(S, `${Dm.name} grew drowsy!`); return true; }
  return false;
}

// ---------- status moves ----------
function statusMove(S, a, si, A, Dm, mv) {
  const dsi = 1 - si, k = mv.k, fail = () => say(S, "But it failed!");
  if (PROTECTS.has(k)) { const p = A.v.pc || 0; if (p && !pct(S, 100 / Math.pow(3, p))) { A.v.pc = 0; return fail(); } A.v.pc = p + 1; A.v.prot = true; A.v.protKind = k; return say(S, `${A.name} protected itself!`); }
  if (k === "substitute") { const c = fl(A.max / 4); if (A.v.sub > 0 || A.hp <= c) return fail(); setHp(S, si, A, A.hp - c); A.v.sub = c; emit(S, { e: "sub", s: si, on: true }); return say(S, `${A.name} made a substitute!`); }
  if (k === "rain-dance") return S.weather === "rain" ? fail() : setWeather(S, "rain");
  if (k === "sunny-day") return S.weather === "sun" ? fail() : setWeather(S, "sun");
  if (k === "sandstorm") return S.weather === "sand" ? fail() : setWeather(S, "sand");
  if (k === "hail") return S.weather === "hail" ? fail() : setWeather(S, "hail");
  if (k === "snowscape") return S.weather === "snow" ? fail() : setWeather(S, "snow");
  const sd = side(S, si), fs = side(S, dsi);
  if (k === "reflect" || k === "light-screen") { const key = k === "reflect" ? "reflect" : "light"; if (sd.scr[key] > 0) return fail(); sd.scr[key] = 5; emit(S, { e: "screen", s: si, k: key, n: 5 }); return say(S, `${k === "reflect" ? "Reflect" : "Light Screen"} raised ${sd.name}'s defenses!`); }
  if (k === "aurora-veil") { if (!wxActive(S, "hail") || sd.scr.veil > 0) return fail(); sd.scr.veil = 5; emit(S, { e: "screen", s: si, k: "veil", n: 5 }); return say(S, `Aurora Veil made ${sd.name}'s team stronger!`); }
  if (k === "stealth-rock") { if (fs.hz.rocks) return fail(); fs.hz.rocks = 1; emit(S, { e: "hazard", s: dsi, k: "rocks", n: 1 }); return say(S, `Pointed stones float in the air around ${fs.name}'s team!`); }
  if (k === "spikes") { if (fs.hz.spikes >= 3) return fail(); fs.hz.spikes++; emit(S, { e: "hazard", s: dsi, k: "spikes", n: fs.hz.spikes }); return say(S, `Spikes were scattered around ${fs.name}'s team!`); }
  if (k === "toxic-spikes") { if (fs.hz.tspikes >= 2) return fail(); fs.hz.tspikes++; emit(S, { e: "hazard", s: dsi, k: "tspikes", n: fs.hz.tspikes }); return say(S, `Poison spikes were scattered around ${fs.name}'s team!`); }
  if (k === "sticky-web") { if (fs.hz.web) return fail(); fs.hz.web = 1; emit(S, { e: "hazard", s: dsi, k: "web", n: 1 }); return say(S, `A sticky web spreads around ${fs.name}'s team!`); }
  if (k === "trick-room") { if (S.tr > 0) { S.tr = 0; return say(S, "The twisted dimensions returned to normal!"); } S.tr = 5; return say(S, `${A.name} twisted the dimensions!`); }
  if (k === "haze") { for (const m of [A, Dm]) m.stg = {}; emit(S, { e: "haze" }); return say(S, "All stat changes were eliminated!"); }
  if (k === "belly-drum") { const c = fl(A.max / 2); if (A.hp <= c || (A.stg.atk || 0) >= 6) return fail(); setHp(S, si, A, A.hp - c); A.stg.atk = 6; emit(S, { e: "stage", s: si, k: "atk", d: 6 }); return say(S, `${A.name} cut its own HP and maximized its Attack!`); }
  if (k === "taunt") { if (Dm.v.taunt > 0 || Dm.v.sub > 0) return fail(); if (blockedByProtect(S, A, Dm, mv)) return; Dm.v.taunt = 3; return say(S, `${Dm.name} fell for the taunt!`); }
  if (k === "tailwind") { if (sd.tw > 0) return fail(); sd.tw = 4; emit(S, { e: "screen", s: si, k: "tailwind", n: 4 }); return say(S, `The tailwind blew from behind ${sd.name}'s team!`); }
  if (k === "focus-energy") { A.v.focus = true; return say(S, `${A.name} is getting pumped!`); }
  if (k === "rest") { if (A.hp >= A.max || A.st === "slp") return fail(); A.st = "slp"; A.sl = 2; emit(S, { e: "status", s: si, i: sd.active, st: "slp" }); setHp(S, si, A, A.max); return say(S, `${A.name} slept and became healthy!`); }
  // generic
  const self = [7, 13, 5, 3, 15, 4].includes(mv.tg), tgt = self ? A : Dm;
  if (!self) { if (blockedByProtect(S, A, Dm, mv)) return; if (!accOk(S, A, Dm, mv)) return say(S, `${A.name}'s attack missed!`); if (mv.ai === "paralysis" && mv.k === "thunder-wave" && typeEff(mv.t, Dm.types) === 0) return say(S, `It doesn't affect ${Dm.name}...`); if (Dm.v.sub > 0 && (mv.ai || mv.st)) return fail(); if (absorbImmunity(S, si, A, Dm, mv)) return; }
  let did = false;
  if (mv.st) for (const [sid, ch] of mv.st) if (STAT_IDS[sid]) did = stage(S, self ? si : dsi, tgt, STAT_IDS[sid], ch, A) || did;
  if (mv.ai && SUP_AIL.has(mv.ai)) did = !!applyAilment(S, self ? si : dsi, tgt, mv, A) || did;
  if (mv.hl) { const n = fl(A.max * (HEAL_WEATHER.has(k) ? (S.weather === "sun" ? 66.7 : S.weather ? 25 : 50) : mv.hl) / 100); if (A.hp >= A.max) say(S, `${A.name}'s HP is full!`); else did = heal(S, si, A, n, `${A.name} regained health!`) || did; if (A.hp >= A.max) did = true; }
  if (mv.mc === 12) { forceOut(S, dsi); did = true; }
  if (!did && !(mv.st || mv.ai || mv.hl)) fail();
  else if (!did && (mv.ai && !mv.st && !mv.hl)) { /* ailment refused: its own message was already printed */ }
}

// ---------- end of turn ----------
function residual(S) {
  if (S.weather) {
    if (S.weather === "sand" || S.weather === "hail") for (const si of [0, 1]) {
      const m = act(S, si); if (m.fnt || m.ab === "magic-guard") continue;
      const imm = S.weather === "sand" ? (["rock", "ground", "steel"].some((t) => hasType(m, t)) || m.ab === "sand-veil" || m.ab === "sand-rush") : (hasType(m, "ice") || m.ab === "snow-cloak" || m.ab === "slush-rush" || m.ab === "ice-body");
      if (!imm) hurt(S, si, m, Math.max(1, fl(m.max / 16)), `${m.name} is buffeted by the ${S.weather === "sand" ? "sandstorm" : "hail"}!`);
    }
    if (--S.wt <= 0) { say(S, { rain: "The rain stopped.", sun: "The harsh sunlight faded.", sand: "The sandstorm subsided.", hail: "The hail stopped.", snow: "The snow stopped." }[S.weather]); S.weather = null; emit(S, { e: "weather", w: null }); }
  }
  faintCheck(S); if (S.over) return;
  for (const si of [0, 1]) {
    const m = act(S, si); if (m.fnt) continue;
    const mg = m.ab === "magic-guard";
    if (m.v.seeded != null && !mg) { const n = Math.max(1, fl(m.max / 8)), o = act(S, m.v.seeded); hurt(S, si, m, n, `${m.name}'s health was sapped by Leech Seed!`); if (!o.fnt) heal(S, m.v.seeded, o, n); }
    if (m.st === "brn" && !mg) hurt(S, si, m, Math.max(1, fl(m.max / 16)), `${m.name} was hurt by its burn!`);
    if (m.st === "psn") { if (m.ab === "poison-heal") heal(S, si, m, fl(m.max / 8), `${m.name} was healed by Poison Heal!`); else if (!mg) hurt(S, si, m, Math.max(1, fl(m.max / 8)), `${m.name} was hurt by poison!`); }
    if (m.st === "tox") { if (m.ab === "poison-heal") heal(S, si, m, fl(m.max / 8), `${m.name} was healed by Poison Heal!`); else if (!mg) { hurt(S, si, m, Math.max(1, fl(m.max * Math.min(15, m.tx) / 16)), `${m.name} was hurt by poison!`); m.tx++; } }
    if (m.v.trap > 0 && !m.fnt) { if (!mg) hurt(S, si, m, Math.max(1, fl(m.max / 8)), `${m.name} is hurt by the binding!`); if (--m.v.trap <= 0) { m.v.trap = 0; say(S, `${m.name} was freed!`); } }
    if (m.v.yawn > 0 && --m.v.yawn === 0) tryStatus(S, si, m, "slp", null, true);
    if (m.ab === "speed-boost" && !m.fnt && m.v.moved !== undefined) stage(S, si, m, "spe", 1, m);
    m.v.fresh = (m.v.fresh || 0) + 1; if (m.v.taunt > 0 && --m.v.taunt === 0) say(S, `${m.name} is no longer taunted!`);
    if (!m.v.prot) m.v.pc = m.v.pc && m.v.last && PROTECTS.has(m.v.last) ? m.v.pc : 0;
    m.v.prot = false; m.v.flinch = false;
  }
  for (const si of [0, 1]) { const sd = side(S, si); if (sd.tw > 0 && --sd.tw === 0) { say(S, `${sd.name}'s tailwind petered out!`); emit(S, { e: "screen", s: si, k: "tailwind", n: 0 }); } for (const [k, nm] of [["reflect", "Reflect"], ["light", "Light Screen"], ["veil", "Aurora Veil"]]) if (sd.scr[k] > 0 && --sd.scr[k] === 0) { say(S, `${sd.name}'s ${nm} wore off!`); emit(S, { e: "screen", s: si, k, n: 0 }); } }
  if (S.tr > 0 && --S.tr === 0) say(S, "The twisted dimensions returned to normal!");
}

// ---------- AI ----------
const matchup = (S, m, foe) => {
  const best = (x, y) => Math.max(0, ...x.moves.filter((s) => s.pp > 0).map((s) => { const mv = D.moves[s.id]; return mv.c === "status" ? 0 : Math.min(1.3, expectedDamage(S, x, y, mv) * (mv.a == null ? 1 : mv.a / 100) / Math.max(1, y.hp)); }));
  const fast = eStat(S, m, "spe") >= eStat(S, foe, "spe");
  return best(m, foe) - 0.85 * best(foe, m) * Math.min(1, m.hp / Math.max(1, m.max) + 0.3) + (fast ? 0.1 : 0);
};
function scoreMove(S, si, A, Dm, mv, slot) {
  const k = mv.k;
  if (mv.c !== "status") {
    if (eff0Zero(S, Dm, mv)) return -1;
    let dmg = expectedDamage(S, A, Dm, mv); const acc = mv.a == null ? 1 : mv.a / 100;
    let s = Math.min(1.3, dmg / Math.max(1, Dm.hp)) * acc;
    if (dmg >= Dm.hp) s += 0.45 + (mv.pr > 0 ? 0.3 : 0);
    if (mv.f && (mv.f.includes("charge") || mv.f.includes("recharge"))) s *= 0.6;
    if (mv.dr < 0) s *= 0.92;
    if (["self-destruct", "explosion", "misty-explosion"].includes(k)) s *= A.hp / A.max < 0.3 ? 0.9 : 0.35;
    if (mv.ai && !Dm.st) s += 0.05;
    return s;
  }
  if (PROTECTS.has(k)) return (A.v.pc || 0) ? -1 : (A.st === "tox" || Dm.st ? 0.15 : 0.05);
  if (k === "substitute") return A.v.sub > 0 || A.hp / A.max < 0.5 ? -1 : 0.18;
  if (["rain-dance", "sunny-day", "sandstorm", "hail", "snowscape"].includes(k)) return S.weather ? -1 : 0.25;
  if (["reflect", "light-screen", "aurora-veil"].includes(k)) return side(S, si).scr[k === "reflect" ? "reflect" : k === "light-screen" ? "light" : "veil"] > 0 ? -1 : 0.35;
  if (["stealth-rock", "spikes", "toxic-spikes", "sticky-web"].includes(k)) { const hz = side(S, 1 - si).hz, key = { "stealth-rock": "rocks", spikes: "spikes", "toxic-spikes": "tspikes", "sticky-web": "web" }[k]; return hz[key] >= (k === "spikes" ? 3 : k === "toxic-spikes" ? 2 : 1) || alive(side(S, 1 - si)) < 2 ? -1 : 0.5 - 0.1 * hz[key]; }
  if (k === "trick-room") return S.tr > 0 ? (eStat(S, A, "spe") < eStat(S, Dm, "spe") ? -1 : 0.5) : (eStat(S, A, "spe") < eStat(S, Dm, "spe") ? 0.5 : -1);
  if (k === "haze") return Object.values(Dm.stg).some((v) => v > 1) ? 0.55 : -1;
  if (k === "rest") return A.hp / A.max < 0.4 && !A.st ? 0.7 : A.hp / A.max < 0.5 && A.st ? 0.6 : -1;
  if (k === "belly-drum") return A.hp / A.max > 0.7 && !(A.stg.atk > 0) ? 0.6 : -1;
  if (k === "focus-energy") return A.v.focus ? -1 : 0.1;
  if (k === "taunt") return Dm.v.taunt > 0 ? -1 : 0.2;
  if (k === "tailwind") return side(S, si).tw > 0 ? -1 : 0.4;
  if (k === "metronome") return 0.3;
  if (mv.mc === 12) return 0.2;
  let s = 0;
  if (mv.hl) s = A.hp / A.max < 0.45 ? 0.75 : A.hp / A.max < 0.7 ? 0.35 : A.hp >= A.max ? -1 : 0.05;
  if (mv.ai && SUP_AIL.has(mv.ai)) {
    const imm = Dm.st || (mv.ai === "paralysis" && (hasType(Dm, "electric") || typeEff(mv.t, Dm.types) === 0)) || (mv.ai === "burn" && hasType(Dm, "fire")) || ((mv.ai === "poison") && (hasType(Dm, "poison") || hasType(Dm, "steel"))) || (mv.ai === "leech-seed" && (Dm.v.seeded != null || hasType(Dm, "grass"))) || (mv.ai === "trap" && Dm.v.trap) || (mv.ai === "confusion" && Dm.v.conf > 0) || (mv.ai === "sleep" && Dm.st) || (mv.ai === "yawn" && Dm.v.yawn);
    if (imm) s = Math.max(s, -1); else s = Math.max(s, ({ sleep: 0.6, paralysis: 0.45, burn: eStat(S, Dm, "atk") > eStat(S, Dm, "spa") ? 0.5 : 0.25, poison: 0.4, confusion: 0.3, "leech-seed": 0.4, yawn: 0.35, trap: 0.2, freeze: 0.5 })[mv.ai] || 0.2) * (mv.a == null ? 1 : mv.a / 100);
  }
  if (mv.st) {
    const self = [7, 13, 5, 3, 15, 4].includes(mv.tg);
    let v = 0;
    for (const [sid, ch] of mv.st) { const key = STAT_IDS[sid]; if (!key) continue; const cur = (self ? A : Dm).stg[key] || 0; if (self ? ch > 0 : ch < 0) { if (cur * Math.sign(ch) >= 2 && Math.abs(cur) >= 2) continue; const use = key === "atk" ? (A.atk >= A.spa ? 1 : 0.1) : key === "spa" ? (A.spa >= A.atk ? 1 : 0.1) : 0.6; v += 0.22 * Math.abs(ch) * use; } else v -= 0.3; }
    s = Math.max(s, v - (self && A.hp / A.max < 0.4 ? 0.15 : 0));
  }
  return s;
}
const eff0Zero = (S, Dm, mv) => typeEff(mv.t, Dm.types, mv) === 0;
export function aiChoose(S, si) {
  const L = legalChoices(S, si); if (!L.length) return null;
  const sd = side(S, si), A = act(S, si), Dm = act(S, 1 - si);
  const bench = L.filter((c) => c.t === "switch");
  const bestSwitch = () => { let b = null, bv = -9; for (const c of bench) { const v = matchup(S, sd.team[c.i], Dm) + rnd(S) * 0.02; if (v > bv) { bv = v; b = c; } } return { c: b, v: bv }; };
  if (S.phase === "replace") return bestSwitch().c || L[0];
  if (L[0].forced) return L[0];
  let best = null, bs = -9;
  for (const c of L) { if (c.t !== "move") continue; const mv = c.i === -1 ? STRUGGLE : D.moves[A.moves[c.i].id]; const s = scoreMove(S, si, A, Dm, mv, A.moves[c.i]) + rnd(S) * 0.08; if (s > bs) { bs = s; best = c; } }
  if (bench.length && !Dm.fnt) {
    const stay = matchup(S, A, Dm), bsw = bestSwitch();
    if (bsw.c && bsw.v > stay + 0.45 && bs < 0.55 && pct(S, 70)) return bsw.c;
  }
  return best || L[0];
}
export function runAuto({ teams, names, seed, onTurn }) {
  const S = createBattle({ teams, names, seed }), events = start(S).slice();
  let guard = 0;
  while (!S.over && guard++ < MAX_TURNS * 3) {
    const need = needsChoice(S), ch = [need[0] ? aiChoose(S, 0) : null, need[1] ? aiChoose(S, 1) : null];
    events.push(...advance(S, ch));
  }
  return { state: S, events, winner: S.over ? S.over.w : -1 };
}
export const calcDamage = (S, A, Dm, mv, o) => rawDamage(S, A, Dm, mv, o);
export const survivors = (S) => [alive(side(S, 0)), alive(side(S, 1))];
export const digest = (S) => `${S.over ? S.over.w : "?"}:${S.turn}:${alive(side(S, 0))}-${alive(side(S, 1))}:${S.sides.map((s) => s.team.reduce((x, m) => x + m.hp, 0)).join("/")}`;
