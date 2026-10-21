import * as R from "./rules.js";
const { TAGS } = R;
const TU = R.TRAIT_UP, TD = R.TRAIT_DOWN;

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = (x) => Math.round(x * 10) / 10;
const has = (u, tag) => (u.a.tags || []).includes(tag);

export function sizeFromMass(m) {
  return Math.round(clamp(((Math.log10(m) + 3) / 8) * 99 + 1, 1, 100));
}
export function hpOf(a) { return R.HP_BASE + a.size * R.HP_SIZE_K + a.stamina * R.HP_STAMINA_K; }

export function simulate(teamA, teamB, arena, seed, opts = {}) {
  const rng = mulberry32(seed >>> 0);
  const rr = (a, b) => a + (b - a) * rng();
  const events = [];
  let eid = 0, result = null;
  const emit = (tick, type, actor, target, value, text, sub) => {
    const e = { id: ++eid, tick, type, actor, target, value, text };
    if (sub) e.sub = sub;
    events.push(e); return e.id;
  };

  const units = [];
  const mk = (side, team) => team.map((a, i) => {
    const hp = hpOf(a);
    const u = { key: side + i, side, idx: i, a, hp, maxHp: hp, state: "active", limp: false, dots: [], synergy: 0,
      taken: {}, dealt: 0, misses: 0, arenaEffect: 0, synGain: [], synLost: [], targetedBecause: null,
      outcome: "survived", tick: null, killEventId: null, fledEventId: null, big: { v: 0, id: null },
      up: a.traits && TU[a.traits.up] ? a.traits.up : null, down: a.traits && TD[a.traits.down] ? a.traits.down : null,
      tr: { up: { n: 0, amt: 0 }, down: { n: 0, amt: 0 } }, stoicLeft: a.traits && a.traits.up === "stoic" ? TU.stoic.hits : 0, fleeWhy: null };
    units.push(u); return u;
  });
  const T = { A: mk("A", teamA), B: mk("B", teamB) };
  const foeOf = (s) => (s === "A" ? "B" : "A");
  const active = (s) => T[s].filter((u) => u.state === "active");
  const byKey = (k) => units.find((u) => u.key === k);

  function refresh(tick) {
    for (const u of units) {
      if (u.state !== "active") continue;
      let s = 0;
      if (has(u, "pack")) s += TAGS.pack.perMate * active(u.side).filter((m) => m !== u && has(m, "pack")).length;
      if (has(u, "ambush") && tick <= TAGS.ambush.ticks) s += TAGS.ambush.bonus;
      s = Math.min(s, R.SYNERGY_CAP);
      if (Math.abs(s - u.synergy) > 1e-9) {
        const delta = s - u.synergy;
        const id = emit(tick, "synergy", u.key, null, Math.round(s * 100),
          `${u.a.name} synergy ${delta > 0 ? "up" : "down"} to +${Math.round(s * 100)}%`);
        (delta > 0 ? u.synGain : u.synLost).push({ eventId: id, delta: r1(delta * 100) });
        u.synergy = s;
      }
    }
  }

  function checkEnd(tick) {
    const a = active("A").length, b = active("B").length;
    if (a && b) return false;
    const winner = !a && !b ? "draw" : !a ? "B" : "A";
    emit(tick, "end", null, null, 0, winner === "draw" ? "Both teams are spent: draw" : `Team ${winner} wins`);
    result = winner; return true;
  }

  function afterHp(t, tick, killEv, rule) {
    if (t.state !== "active") return;
    if (t.hp <= 1e-9) {
      t.hp = 0; t.state = "down"; t.tick = tick; t.killEventId = killEv;
      if (rule) t.targetedBecause = rule;
      emit(tick, "down", t.key, null, 0, `${t.a.name} is down`);
      if (rng() < R.DEATH_CHANCE) { t.outcome = "death"; emit(tick, "death", t.key, null, 0, `${t.a.name} dies`); }
      else { t.outcome = "collapse"; emit(tick, "status", t.key, null, 0, `${t.a.name} collapses`, "collapse"); }
      refresh(tick);
    } else if (!t.limp && t.hp < R.LIMP_FRAC * t.maxHp) {
      t.limp = true; emit(tick, "limp", t.key, null, 0, `${t.a.name} is limping`);
    }
  }

  function hurt(t, amt, srcKey, evId) {
    const ap = Math.min(amt, t.hp);
    t.hp -= ap;
    const src = byKey(srcKey.replace(/^(venom|herd):/, ""));
    t.taken[srcKey] = (t.taken[srcKey] || 0) + ap;
    if (ap > t.big.v) t.big = { v: ap, id: evId };
    if (src) src.dealt += ap;
    return ap;
  }

  function pickTarget(u) {
    const foes = active(foeOf(u.side));
    const front = foes.filter((f) => f.idx < R.FRONT_SLOTS), back = foes.filter((f) => f.idx >= R.FRONT_SLOTS);
    let pool;
    if (front.length && back.length) pool = rng() < R.FRONT_HIT ? front : back;
    else pool = front.length ? front : back;
    if (pool.length === 1) { rng(); return { t: pool[0], rule: "only_target" }; }
    const roll = rng() * 100, keen = u.up === "keen_senses" ? TU.keen_senses.bonus : 0;
    const smart = roll < u.a.instinct + keen;
    if (smart && u.down === "overconfident") { u.tr.down.n++; rng(); return { t: pool.reduce((m, x) => (x.idx < m.idx ? x : m)), rule: "nearest", note: "Overconfident: nearest target" }; }
    if (smart) {
      const note = roll >= u.a.instinct ? "Keen senses: spotted a weak point" : null;
      if (note) u.tr.up.n++;
      if (rng() < R.SMART_TARGET_WEAKEST)
        return { t: pool.reduce((m, x) => (x.hp < m.hp ? x : m)), rule: "weakest", note };
      return { t: pool.reduce((m, x) => (x.a.offense > m.a.offense ? x : m)), rule: "most_dangerous", note };
    }
    rng();
    return { t: pool.reduce((m, x) => (x.idx < m.idx ? x : m)), rule: "nearest" };
  }

  function attack(u, tick) {
    const pk = pickTarget(u), t = pk.t, rule = pk.rule;
    t.targetedBecause = rule;
    const notes = [], mods = [];
    if (pk.note) notes.push(pk.note);
    const use = (x, kind, label, f) => { x.tr[kind].n++; notes.push(label); if (f) mods.push({ x, kind, f }); };
    const tag = () => (notes.length ? ` [${notes.join("; ")}]` : "");
    const slow = (x) => (x.down === "slow_start" && tick <= TD.slow_start.ticks ? TD.slow_start.mult : 1);
    const spd = (x) => x.a.speed * (x.limp ? R.LIMP_SPEED : 1) * slow(x);
    if (slow(u) < 1) { u.tr.down.n++; notes.push("Slow start"); }
    const speedDodge = clamp((spd(t) - spd(u)) * R.SPEED_DODGE_K, 0, R.SPEED_DODGE_CAP);
    const sizeDodge = clamp((u.a.size - t.a.size) * R.SIZE_DODGE_K, 0, R.SIZE_DODGE_CAP);
    let missP = R.MISS_BASE + speedDodge + sizeDodge + (has(t, "flier") && !has(u, "flier") ? TAGS.flier.evasion : 0);
    if (t.down === "conspicuous") { missP *= TD.conspicuous.missMult; use(t, "down", "Conspicuous: easy to hit"); }
    if (u.down === "poor_eyesight") { missP += TD.poor_eyesight.miss; use(u, "down", "Poor eyesight"); }
    if (t.up === "camouflage" && tick <= TU.camouflage.ticks) { missP += TU.camouflage.miss; use(t, "up", "Camouflage"); }
    const intim = active(foeOf(u.side)).find((x) => x.up === "intimidating");
    if (intim) { missP += TU.intimidating.miss; intim.tr.up.n++; notes.push(`Intimidating ${intim.a.name}`); }
    if (rng() < missP) {
      u.misses++;
      emit(tick, "miss", u.key, t.key, 0, `${u.a.name} misses ${t.a.name}${tag()}`);
      return;
    }
    const crit = rng() < R.CRIT_CHANCE + (u.a.instinct / 100) * R.CRIT_INSTINCT_K + (u.up === "precise" ? TU.precise.crit : 0);
    if (crit && u.up === "precise") use(u, "up", "Precise");
    const off = u.a.offense;
    let def = t.a.defense;
    if (u.up === "piercing") { const d2 = def * (1 - TU.piercing.ignore); use(u, "up", "Piercing", (R.DEF_K + def) / (R.DEF_K + d2) ); def = d2; }
    const base = off * (R.DEF_K / (R.DEF_K + def)) * rr(u.down === "clumsy" ? TD.clumsy.min : R.DMG_MIN, R.DMG_MAX) * R.DMG_SCALE;
    if (u.down === "clumsy") u.tr.down.n++;
    const arenaB = ((u.a.arena_bonus && u.a.arena_bonus[arena]) || 0) / 100;
    let tm = 1;
    const mul = (x, kind, label, f) => { tm *= f; use(x, kind, label, f); };
    if (u.up === "second_wind" && u.hp < TU.second_wind.frac * u.maxHp) mul(u, "up", "Second wind", TU.second_wind.mult);
    if (u.up === "opportunist" && t.hp < TU.opportunist.frac * t.maxHp) mul(u, "up", "Opportunist", TU.opportunist.mult);
    if (u.up === "giant_slayer" && t.a.size >= u.a.size + TU.giant_slayer.gap) mul(u, "up", "Giant slayer", TU.giant_slayer.mult);
    if (u.up === "avenger") { const fallen = Math.min(TU.avenger.cap, T[u.side].length - active(u.side).length); if (fallen) mul(u, "up", `Avenger x${fallen}`, 1 + TU.avenger.per * fallen); }
    if (u.down === "tires_fast" && tick > TD.tires_fast.after) mul(u, "down", "Tires fast", 1 - Math.min(TD.tires_fast.cap, TD.tires_fast.rate * (tick - TD.tires_fast.after)));
    if (u.down === "winded" && u.hp < TD.winded.frac * u.maxHp) mul(u, "down", "Winded", TD.winded.mult);
    if (u.down === "solitary" && active(u.side).length - 1 >= TD.solitary.mates) mul(u, "down", "Solitary", TD.solitary.mult);
    if (t.up === "stoic" && t.stoicLeft > 0) { t.stoicLeft--; mul(t, "up", "Stoic: shrugs off the blow", TU.stoic.mult); }
    const post = (crit ? R.CRIT_MULT : 1) * (has(t, "armored") ? 1 - TAGS.armored.reduction : 1) * tm;
    let dmg = base * (1 + u.synergy + arenaB) * post;
    if (t.down === "brittle" && dmg >= TD.brittle.frac * t.maxHp) { dmg *= TD.brittle.mult; use(t, "down", "Brittle: heavy blow", TD.brittle.mult); }
    u.arenaEffect += base * arenaB * post;
    for (const m of mods) m.x.tr[m.kind].amt += Math.abs(dmg - dmg / m.f);

    let main = dmg, mates = [];
    if (has(t, "herd")) mates = active(t.side).filter((m) => m !== t && has(m, "herd"));
    if (mates.length) main = dmg * (1 - TAGS.herd.share);
    const applied = Math.min(main, t.hp);
    const evId = emit(tick, crit ? "crit" : "attack", u.key, t.key, r1(applied),
      `${u.a.name} ${crit ? "crits" : "hits"} ${t.a.name} for ${r1(applied)}${tag()}`);
    hurt(t, main, u.key, evId);
    const landedAlive = t.hp > 1e-9;
    afterHp(t, tick, evId, rule);
    if (checkEnd(tick)) return;

    if (mates.length) {
      const per = (dmg * TAGS.herd.share) / mates.length;
      for (const m of mates) {
        if (m.state !== "active") continue;
        const ap = Math.min(per, m.hp);
        const sid = emit(tick, "status", t.key, m.key, r1(ap), `${m.a.name} shares the blow (-${r1(ap)})`, "herd");
        hurt(m, per, "herd:" + u.key, sid);
        afterHp(m, tick, sid, "herd");
        if (checkEnd(tick)) return;
      }
    }
    if (landedAlive && t.state === "active" && has(u, "venom")) {
      t.dots = t.dots.filter((d) => d.src !== u.key);
      const dd = u.a.offense * TAGS.venom.dotFrac;
      t.dots.push({ src: u.key, until: tick + R.VENOM_WINDOW, dmg: dd, bite: evId });
      emit(tick, "status", u.key, t.key, r1(dd), `${t.a.name} is poisoned by ${u.a.name}`, "venom");
    }
  }

  emit(0, "arena_effect", null, null, 0, `Arena: ${opts.arenaLabel || arena.charAt(0).toUpperCase() + arena.slice(1)}`);
  for (const u of units) {
    const b = (u.a.arena_bonus && u.a.arena_bonus[arena]) || 0;
    if (Math.abs(b) >= 5) emit(0, "arena_effect", u.key, null, b, `${u.a.name} ${b > 0 ? "gains" : "loses"} ${Math.abs(b)}% damage here`);
  }

  let lastTick = 0;
  for (let tick = 1; tick <= R.MAX_TICKS && !result; tick++) {
    lastTick = tick;
    refresh(tick);
    for (const s of ["A", "B"]) {
      if (result) break;
      const lost = T[s].length - active(s).length;
      for (const u of active(s)) {
        if (u.state !== "active") continue;
        const std = lost >= R.MORALE_LOSS_COUNT;
        if (u.up === "tenacious") { if (std) u.tr.up.n++; continue; }
        const skit = u.down === "skittish" && lost >= TD.skittish.lost, faint = u.down === "faint_hearted" && u.limp;
        if (!std && !skit && !faint) continue;
        let chance = std || skit ? R.MORALE_FLEE_BASE : 0;
        if (faint) chance = Math.max(chance, TD.faint_hearted.flee);
        if (rng() < chance * (1 - u.a.instinct / 100)) {
          const why = !std ? (skit ? "skittish" : "faint_hearted") : null;
          u.state = "fled"; u.outcome = "fled"; u.tick = tick; u.fleeWhy = why;
          if (why) u.tr.down.n++;
          u.fledEventId = emit(tick, "flee", u.key, null, 0, why === "skittish" ? `${u.a.name} is spooked by a fallen friend and flees [Skittish]` : why === "faint_hearted" ? `${u.a.name} is too hurt to carry on and flees [Faint-hearted]` : `${u.a.name} loses nerve and flees`);
          refresh(tick);
          if (checkEnd(tick)) break;
        }
      }
    }
    if (result) break;
    for (const u of units) {
      if (result) break;
      if (u.state !== "active" || !u.dots.length) continue;
      u.dots = u.dots.filter((d) => tick <= d.until);
      if (!u.dots.length) continue;
      const total = u.dots.reduce((s, d) => s + d.dmg, 0);
      const ap = Math.min(total, u.hp);
      const sid = emit(tick, "status", u.dots[0].src, u.key, r1(ap), `${u.a.name} suffers venom (-${r1(ap)})`, "venom_tick");
      for (const d of u.dots) hurt(u, Math.min(d.dmg, u.hp), "venom:" + d.src, sid);
      afterHp(u, tick, sid, "venom");
      checkEnd(tick);
    }
    if (result) break;
    for (const u of units) {
      if (u.state !== "active" || u.up !== "regenerating" || u.hp >= u.maxHp - 1e-9) continue;
      const heal = Math.min(u.maxHp - u.hp, u.maxHp * TU.regenerating.frac);
      u.hp += heal; u.tr.up.n++; u.tr.up.amt += heal;
      emit(tick, "status", u.key, u.key, r1(heal), `${u.a.name} regenerates ${r1(heal)} HP [Regenerating]`, "regen");
    }
    const order = units.filter((u) => u.state === "active")
      .map((u) => ({ u, k: u.a.speed * (u.limp ? R.LIMP_SPEED : 1) * (u.down === "slow_start" && tick <= TD.slow_start.ticks ? TD.slow_start.mult : 1) + rng() * R.SPEED_JITTER }))
      .sort((x, y) => y.k - x.k || (x.u.key < y.u.key ? -1 : 1));
    for (const { u } of order) {
      if (result) break;
      if (u.state !== "active") continue;
      attack(u, tick);
    }
  }
  if (!result) {
    result = "draw";
    emit(R.MAX_TICKS, "end", null, null, 0, "Tick cap reached: draw");
  }

  const nameOf = (k) => (byKey(k) ? byKey(k).a.name : k);
  const autopsy = units.map((u) => {
    const dt = Object.entries(u.taken).map(([k, amount]) => {
      const kind = k.startsWith("venom:") ? "venom" : k.startsWith("herd:") ? "herd" : "attack";
      const base = k.replace(/^(venom|herd):/, "");
      return { key: k, kind, source: kind === "attack" ? nameOf(base) : kind === "venom" ? `${nameOf(base)}'s venom` : "shared herd damage", amount: r1(amount) };
    }).sort((a, b) => b.amount - a.amount);
    return {
      unit: u.key, side: u.side, animalId: u.a.id, name: u.a.name,
      outcome: u.state === "active" ? "survived" : u.outcome,
      tick: u.tick, killEventId: u.killEventId,
      damageTaken: dt, damageTakenTotal: r1(dt.reduce((s, d) => s + d.amount, 0)),
      damageDealt: r1(u.dealt), misses: u.misses, arenaEffect: r1(u.arenaEffect),
      synergy: { gained: u.synGain, lost: u.synLost },
      targetedBecause: u.targetedBecause,
      traits: { up: u.up, down: u.down, upN: u.tr.up.n, upAmt: r1(u.tr.up.amt), downN: u.tr.down.n, downAmt: r1(u.tr.down.amt), fleeWhy: u.fleeWhy },
      turningPoint: u.big.id !== null ? u.big.id : u.fledEventId
    };
  });
  return {
    winner: result, events, autopsy, ticks: lastTick,
    survivors: { A: active("A").length, B: active("B").length }
  };
}

const RULE_TEXT = {
  only_target: "It was the only enemy left in reach.",
  nearest: "Enemies picked it as the nearest target.",
  weakest: "Smart enemies went after it because it was the weakest.",
  most_dangerous: "Smart enemies targeted it as the most dangerous threat.",
  venom: "Venom finished it off.",
  herd: "Damage shared through its herd finished it off."
};
function traitText(e) {
  const tr = e.traits; if (!tr) return "";
  const one = (kind, id, n, amt) => {
    const d = id && (kind === "up" ? TU : TD)[id]; if (!d) return "";
    const lead = `${kind === "up" ? "Strength" : "Weakness"} ${d.name} (${d.desc})`;
    return ` ${lead}: ${n ? `applied ${n} time${n === 1 ? "" : "s"}${d.amt && amt >= 1 ? `, ${Math.round(amt)} ${d.amt}` : ""}` : "never came into play"}.`;
  };
  return one("up", tr.up, tr.upN, tr.upAmt) + one("down", tr.down, tr.downN, tr.downAmt);
}
export function describeAutopsy(e) {
  return describeBase(e) + traitText(e);
}
function describeBase(e) {
  const top = e.damageTaken && e.damageTaken[0];
  const taken = `${Math.round(e.damageTakenTotal || 0)} damage taken`;
  if (e.outcome === "survived")
    return `${e.name} survived with ${taken} and ${Math.round(e.damageDealt)} dealt${e.arenaEffect ? (e.arenaEffect > 0 ? `, helped by the arena (+${Math.round(e.arenaEffect)})` : `, hurt by the arena (${Math.round(e.arenaEffect)})`) : ""}.`;
  if (e.outcome === "fled")
    return `${e.name} fled at tick ${e.tick} ${e.traits && e.traits.fleeWhy === "skittish" ? "because it is skittish and one teammate had already fallen" : e.traits && e.traits.fleeWhy === "faint_hearted" ? "because it was limping and faint-hearted" : "after its team lost too many animals"}, having taken ${taken}.`;
  const verb = e.outcome === "collapse" ? "collapsed" : "died";
  return `${e.name} ${verb} at tick ${e.tick}${top ? `, mostly from ${top.source} (${Math.round(top.amount)})` : ""}. ${RULE_TEXT[e.targetedBecause] || ""}`.trim();
}

export function validateAnimals(list, pack) {
  const out = [], seen = new Set();
  const int = (v) => Number.isInteger(v);
  const bad = (a, m) => out.push(`${a && a.id !== undefined ? a.id : "(no id)"}: ${m}`);
  const arenas = pack && pack.arenas ? pack.arenas.map((x) => x.id) : [...new Set(list.flatMap((a) => (a && a.arena_bonus && typeof a.arena_bonus === "object" ? Object.keys(a.arena_bonus) : [])))];
  for (const a of list) {
    if (!a || typeof a !== "object") { out.push("(non-object entry)"); continue; }
    if (typeof a.id !== "string" || !/^[a-z0-9]+(_[a-z0-9]+)*$/.test(a.id)) bad(a, "id must be unique snake_case");
    else if (seen.has(a.id)) bad(a, "duplicate id"); else seen.add(a.id);
    if (typeof a.name !== "string" || !a.name) bad(a, "name missing");
    if (typeof a.emoji !== "string" || !a.emoji) bad(a, "emoji missing");
    if (a.image !== undefined && typeof a.image !== "string") bad(a, "image must be a string url");
    if (pack && typeof pack.validate === "function") for (const m of pack.validate(a)) bad(a, m);
    if (!Array.isArray(a.tags) || a.tags.some((t) => !R.TAG_LIST.includes(t))) bad(a, "tags invalid");
    if (!int(a.size) || a.size < 1 || a.size > 100) bad(a, "size must be integer 1-100");
    let sum = 0, statsOk = true;
    for (const k of R.STAT_KEYS) {
      if (!int(a[k]) || a[k] < 1 || a[k] > 100) { bad(a, `${k} must be integer 1-100`); statsOk = false; } else sum += a[k];
    }
    if (statsOk && (sum < R.STAT_SUM_MIN || sum > R.STAT_SUM_MAX)) bad(a, `stat sum ${sum} outside ${R.STAT_SUM_MIN}-${R.STAT_SUM_MAX}`);
    if (typeof a.special !== "string" || a.special.trim().split(/\s+/).length > R.SPECIAL_MAX_WORDS) bad(a, `special missing or > ${R.SPECIAL_MAX_WORDS} words`);
    if (a.traits !== undefined || (pack && pack.traitsFile)) {
      const tr = a.traits;
      if (!tr || typeof tr !== "object") bad(a, "traits missing");
      else {
        if (!R.TRAIT_UP_LIST.includes(tr.up)) bad(a, `traits.up "${tr.up}" is not a known strength`);
        if (!R.TRAIT_DOWN_LIST.includes(tr.down)) bad(a, `traits.down "${tr.down}" is not a known weakness`);
        if (typeof tr.why !== "string" || !tr.why.trim()) bad(a, "traits.why missing");
      }
    }
    if (!a.arena_bonus || typeof a.arena_bonus !== "object") bad(a, "arena_bonus missing");
    else for (const ar of arenas) {
      const v = a.arena_bonus[ar];
      if (typeof v !== "number" || v < R.ARENA_BONUS_MIN || v > R.ARENA_BONUS_MAX) bad(a, `arena_bonus.${ar} must be ${R.ARENA_BONUS_MIN}..${R.ARENA_BONUS_MAX}`);
    }
  }
  return out;
}

export function balanceTest(list, n = 2000, arenaIds) {
  const arenas = arenaIds || [...new Set(list.flatMap((a) => Object.keys(a.arena_bonus || {})))];
  const rng = mulberry32(12345);
  const pool = list.slice();
  const stat = new Map(list.map((a) => [a.id, { a, games: 0, wins: 0, draws: 0 }]));
  let draws = 0, ticks = 0, maxT = 0, caps = 0, aWins = 0;
  const pick10 = () => {
    const p = pool.slice(), out = [];
    for (let i = 0; i < 10 && p.length; i++) out.push(p.splice(Math.floor(rng() * p.length), 1)[0]);
    return out;
  };
  for (let i = 0; i < n; i++) {
    const t = pick10();
    if (t.length < 10) break;
    const A = t.slice(0, 5), B = t.slice(5);
    const arena = arenas[Math.floor(rng() * arenas.length)];
    const r = simulate(A, B, arena, Math.floor(rng() * 4294967296));
    ticks += r.ticks; maxT = Math.max(maxT, r.ticks);
    if (r.winner === "draw") { draws++; if (r.ticks >= R.MAX_TICKS) caps++; } else if (r.winner === "A") aWins++;
    for (const [team, side] of [[A, "A"], [B, "B"]]) for (const a of team) {
      const s = stat.get(a.id); s.games++;
      if (r.winner === "draw") s.draws++; else if (r.winner === side) s.wins++;
    }
  }
  const rows = [...stat.values()].filter((s) => s.games).map((s) => {
    const winRate = s.wins / s.games;
    return { id: s.a.id, name: s.a.name, games: s.games, wins: s.wins, draws: s.draws, winRate,
      flag: winRate > 0.65 ? "HIGH" : winRate < 0.35 ? "LOW" : "" };
  }).sort((a, b) => b.winRate - a.winRate);
  return { rows, fights: n, drawRate: draws / n, capDraws: caps, avgTicks: ticks / n, maxTicks: maxT, aWinRate: aWins / n };
}