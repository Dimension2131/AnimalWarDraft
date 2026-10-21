import { mulberry32 } from "../../js/sim.js";
import { hash } from "../../js/util.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const cap = (s) => String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);

export const RACE_PRESTART_MS = 6000;
export const RACE_END_PAD_MS = 9000;
export const RACE_PLAY_MIN_MS = 25000, RACE_PLAY_MAX_MS = 50000;
export const TICK_MS = 100;

export function playbackOf(result) {
  const durationMs = result.durationMs, playMs = clamp(Math.round(durationMs * 0.35), RACE_PLAY_MIN_MS, RACE_PLAY_MAX_MS);
  return { durationMs, playMs, scale: durationMs / playMs };
}

export function fmtTime(ms) {
  const s = ms / 1000;
  if (s < 60) return s.toFixed(2) + "s";
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(2).padStart(5, "0")}`;
}
const subSeed = (seed, ...parts) => Math.floor(hash(parts.join("|"), seed) * 4294967296) >>> 0;
const range = (r, lo, hi) => lo + (hi - lo) * r;

export function habitatGroup(a) {
  const h = Array.isArray(a.habitats) ? a.habitats : [];
  if (h.includes("aerial")) return "aerial";
  if (h.length === 1) return h[0];
  return h.length ? "amphibious" : "land";
}

export const maxLegsFor = (race, rosterSize) => clamp(Math.floor(rosterSize), 1, race.maxLegs || 8);
export const terrainsOf = (settings) => { const t = settings && settings.raceTerrains; const a = Array.isArray(t) ? t : t && typeof t === "object" ? Object.values(t) : []; return a.length ? a : null; };
export function difficultyOf(race, id) { return race.difficulties[id] ? id : race.defaultDifficulty; }

export function makeCourse(race, { legs, difficulty, terrains }, seed) {
  const diff = race.difficulties[difficulty] || race.difficulties[race.defaultDifficulty];
  const rng = mulberry32(subSeed(seed, "course"));
  const n = clamp(Math.floor(legs) || race.defaultLegs, 1, race.maxLegs || 8);
  const allowed = Array.isArray(terrains) ? race.legTypes.filter((t) => terrains.includes(t.id)) : [];
  const types = allowed.length ? allowed : race.legTypes; let bag = [], prev = null; const out = [];
  for (let i = 0; i < n; i++) {
    if (!bag.length) bag = types.slice();
    let cand = bag.filter((t) => t.id !== prev); if (!cand.length) cand = bag;
    const wOf = (t) => Math.max(0, +(diff.weights || {})[t.id] || 0) + 0.001;
    let total = 0; for (const t of cand) total += wOf(t);
    let x = rng() * total, pick = cand[cand.length - 1];
    for (const t of cand) { x -= wOf(t); if (x < 0) { pick = t; break; } }
    const lenR = rng();
    bag = bag.filter((t) => t !== pick); prev = pick.id;
    const step = pick.step || 5, raw = range(lenR, pick.len[0], pick.len[1]) * (diff.lengthMul || 1);
    out.push({ i, type: pick.id, label: pick.label, icon: pick.icon, arena: pick.arena, len: Math.max(step, Math.round(raw / step) * step) });
  }
  return out;
}

export function courseFor(race, settings, poolSeed) {
  const legs = Math.min(+settings.raceLegs || race.defaultLegs, maxLegsFor(race, settings.rosterSize || race.defaultLegs));
  return makeCourse(race, { legs: Math.max(race.minLegs || 1, legs), difficulty: difficultyOf(race, settings.raceDifficulty), terrains: terrainsOf(settings) }, subSeed(poolSeed, "relay-course"));
}

const typeOf = (race, id) => race.legTypes.find((t) => t.id === id);
function statVal(a, k) { return k === "lean" ? clamp(100 - (+a.size || 0), 0, 100) : +a[k] || 0; }

export function habitatFit(race, a, legType) {
  const hs = Array.isArray(a.habitats) && a.habitats.length ? a.habitats : ["land"], tbl = race.fit.byHabitat;
  let best = 0;
  hs.forEach((h, i) => { const row = tbl[h]; if (!row) return; const v = (row[legType] ?? 1) * (i === 0 ? 1 : race.fit.secondary); if (v > best) best = v; });
  return best || 1;
}
export function legPace(race, a, leg) {
  const t = typeOf(race, leg.type);
  let wSum = 0, core = 0;
  for (const [k, w] of Object.entries(t.weights)) { core += w * statVal(a, k); wSum += w; }
  core = wSum ? core / wSum : 50;
  const fit = habitatFit(race, a, leg.type);
  let massMul = 1; const m = t.mass, kg = +a.mass_kg;
  if (m && kg > m.softKg) massMul = 1 / (1 + (kg - m.softKg) / m.divisor);
  let tagMul = 1; const tm = (race.tagMods || {})[leg.type] || {};
  for (const tag of a.tags || []) if (tm[tag]) tagMul *= tm[tag];
  const trm = (race.traitMods || {})[leg.type] || {};
  if (a.traits) for (const id of [a.traits.up, a.traits.down]) if (id && trm[id]) tagMul *= trm[id];
  const arenaMul = 1 + race.arenaK * clamp(+((a.arena_bonus || {})[t.arena]) || 0, -10, 10);
  const mult = fit * massMul * tagMul * arenaMul;
  const v = t.v50 * (race.paceFloor + race.paceSlope * core) * mult;        // metres per second
  return { core, fit, massMul, tagMul, arenaMul, mult, v, ms: leg.len / v * 1000 };
}

export function simulateRace({ race, course, teams, seed, difficulty }) {
  const diff = race.difficulties[difficulty] || race.difficulties[race.defaultDifficulty], chaos = diff.chaos ?? 1, ev = race.events;
  const nLegs = Math.min(course.length, ...teams.map((t) => t.animals.length));
  const legs = course.slice(0, nLegs);
  const raw = [];
  let seq = 0;
  const push = (ms, type, fields) => raw.push({ ms: Math.round(ms), seq: seq++, type, ...fields });

  const rows = teams.map((team, ti) => {
    const key = team.key, name = team.name || key, out = { key, name, idx: ti, legs: [], order: team.animals.slice(0, nLegs).map((a) => a.id) };
    let clock = 0;
    for (let i = 0; i < nLegs; i++) {
      const a = team.animals[i], leg = legs[i], t = typeOf(race, leg.type), pace = legPace(race, a, leg);
      const rng = mulberry32(subSeed(seed, "leg", key, i));
      const rJit = rng(), rSt = rng(), rStAmt = rng(), rStAt = rng(), rPa = rng(), rPaAmt = rng(), rPaAt = rng(), rBu = rng(), rBuAmt = rng(), rBuAt = rng(),
        rSw = rng(), rSwAmt = rng(), rSwAt = rng(), rGu = rng(), rGuDir = rng(), rGuAmt = rng(), rGuAt = rng(), rFu = rng(), rFuAmt = rng();
      const fx = [];
      const ins = +a.instinct || 0, sta = +a.stamina || 0;
      let handoff = 0;
      if (i > 0) {
        handoff = ev.handoffMs;
        const pF = clamp(ev.fumble.chance * chaos * (1.5 - ins / 100), 0, 0.5);
        push(clock, "baton", { team: key, leg: i, animal: a.id, from: team.animals[i - 1].id, text: `${name}: ${team.animals[i - 1].name} hands the baton to ${a.name} for leg ${i + 1} (${t.label.toLowerCase()}, ${leg.len} m).` });
        if (rFu < pF) { const d = Math.round(range(rFuAmt, ev.fumble.delayMs[0], ev.fumble.delayMs[1])); handoff += d; push(clock + ev.handoffMs, "fumble", { team: key, leg: i, animal: a.id, value: d, text: `${name}: ${a.name} fumbles the baton and loses ${(d / 1000).toFixed(1)}s!` }); }
      } else push(0, "baton", { team: key, leg: 0, animal: a.id, text: `${name}: ${a.name} is off on leg 1 (${t.label.toLowerCase()}, ${leg.len} m).` });
      const start = clock + handoff;
      const jit = 1 + (rJit * 2 - 1) * ev.jitter * chaos;
      const pSt = clamp(((ev.stumble.chance[leg.type] ?? 0.05)) * chaos * (1.4 - 0.8 * ins / 100), 0, 0.6);
      if (rSt < pSt) fx.push({ f: 0.15 + rStAt * 0.7, type: "stumble", m: 1 + range(rStAmt, ev.stumble.penalty[0], ev.stumble.penalty[1]), text: (p) => `${a.name} stumbles on the ${t.label.toLowerCase()} leg and loses ${p}s.` });
      const pPa = clamp(ev.panic.chance * chaos * (100 - ins) / 50, 0, 0.5);
      if (rPa < pPa) fx.push({ f: 0.1 + rPaAt * 0.6, type: "panic", m: 1 + range(rPaAmt, ev.panic.penalty[0], ev.panic.penalty[1]), text: (p) => `${a.name} panics and freezes for ${p}s!` });
      const pBu = clamp(ev.burst.chance * chaos * ins / 50, 0, 0.5);
      if (rBu < pBu) fx.push({ f: 0.2 + rBuAt * 0.6, type: "burst", m: 1 - range(rBuAmt, ev.burst.bonus[0], ev.burst.bonus[1]), text: (p) => `${a.name} finds a burst of speed and gains ${p}s!` });
      if (ev.secondWind.legs.includes(leg.type) && rSw < clamp(ev.secondWind.chance * chaos * sta / 50, 0, 0.5))
        fx.push({ f: 0.45 + rSwAt * 0.4, type: "secondwind", m: 1 - range(rSwAmt, ev.secondWind.bonus[0], ev.secondWind.bonus[1]), text: (p) => `${a.name} gets a second wind and gains ${p}s.` });
      if ((a.tags || []).includes(ev.gust.tag) && rGu < ev.gust.chance * chaos) {
        const tail = rGuDir < 0.5, amt = tail ? range(rGuAmt, ev.gust.tail[0], ev.gust.tail[1]) : range(rGuAmt, ev.gust.head[0], ev.gust.head[1]);
        fx.push({ f: 0.2 + rGuAt * 0.6, type: tail ? "tailwind" : "headwind", m: tail ? 1 - amt : 1 + amt, text: (p) => (tail ? `${a.name} catches a tailwind and gains ${p}s.` : `${a.name} runs into a headwind and loses ${p}s.`) });
      }
      let mult = jit; for (const f of fx) mult *= f.m;
      const baseMs = pace.ms, ms = Math.max(1, Math.round(baseMs * mult)), end = start + ms;
      for (const f of fx) {
        const delta = Math.abs(f.m - 1) * baseMs * jit;
        push(start + f.f * ms, f.type, { team: key, leg: i, animal: a.id, value: Math.round(delta), text: f.text((delta / 1000).toFixed(1)) });
      }
      out.legs.push({ i, animal: a.id, start, end, ms, baseMs: Math.round(baseMs), handoff, mult: Math.round(mult * 1000) / 1000, fit: Math.round(pace.fit * 1000) / 1000 });
      clock = end;
    }
    out.total = clock; out.best = Math.min(...out.legs.map((l) => l.ms));
    return out;
  });

  const order = rankTeams(rows.map((r) => ({ key: r.key, total: r.total, best: r.best })), seed);
  rows.forEach((r) => { r.rank = order.indexOf(r.key) + 1; });
  const legStandings = [];
  for (let i = 0; i < nLegs; i++) {
    const s = rows.map((r) => ({ key: r.key, cum: r.legs[i].end, legMs: r.legs[i].ms, best: Math.min(...r.legs.slice(0, i + 1).map((l) => l.ms)) }));
    const keys = rankTeams(s.map((x) => ({ key: x.key, total: x.cum, best: x.best })), subSeed(seed, "leg", i));
    legStandings.push(keys.map((k, p) => ({ ...s.find((x) => x.key === k), rank: p + 1 })));
    push(Math.max(...s.map((x) => x.cum)), "standings", { leg: i, text: `After leg ${i + 1} (${legs[i].label.toLowerCase()}): ` + legStandings[i].map((x) => `${x.rank}. ${rows.find((r) => r.key === x.key).name} ${fmtTime(x.cum)}`).join(", ") });
  }

  const distAt = (r, ms) => { let d = 0; for (const l of r.legs) { const len = legs[l.i].len; if (ms >= l.end) d += len; else if (ms > l.start) d += len * (ms - l.start) / (l.end - l.start); } return d; };
  const marks = [...new Set(rows.flatMap((r) => r.legs.map((l) => l.end)))].sort((a, b) => a - b);
  let leader = null;
  for (const ms of marks) {
    let best = null, bd = -1;
    for (const r of rows) { const d = distAt(r, ms); if (d > bd + 1e-9) { bd = d; best = r; } }
    if (!leader) leader = best;
    else if (best !== leader && bd > distAt(leader, ms) + 1e-9) { push(ms, "lead", { team: best.key, text: `${best.name} takes the lead!` }); leader = best; }
  }
  const arrivals = rows.slice().sort((a, b) => a.total - b.total || a.idx - b.idx);
  arrivals.forEach((r, p) => push(r.total, "finish", { team: r.key, value: p + 1, text: `${r.name} crosses the line ${cap(["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"][p] || p + 1 + "th")} in ${fmtTime(r.total)}.` }));
  const durationMs = Math.max(...rows.map((r) => r.total)), win = rows.find((r) => r.rank === 1);
  push(durationMs, "end", { team: win ? win.key : null, text: win ? `${win.name} wins the relay in ${fmtTime(win.total)}${rows.length > 1 && rows.filter((r) => r.total === win.total).length > 1 ? " (decided by best single leg)" : ""}!` : "No race." });

  const typeRank = { baton: 0, fumble: 1, stumble: 2, panic: 2, burst: 2, secondwind: 2, tailwind: 2, headwind: 2, lead: 3, finish: 4, standings: 5, end: 6 };
  raw.sort((a, b) => a.ms - b.ms || (typeRank[a.type] ?? 9) - (typeRank[b.type] ?? 9) || a.seq - b.seq);
  const events = raw.map((e, k) => { const { seq, ms, ...rest } = e; return { id: k + 1, tick: Math.round(ms / TICK_MS), ms, ...rest }; });
  const result = { nLegs, course: legs, teams: rows, order, legStandings, events, durationMs };
  result.digest = raceDigest(result);
  return result;
}

export function rankTeams(rows, seed) {
  return rows.slice().sort((a, b) => a.total - b.total || a.best - b.best || hash(a.key, seed >>> 0) - hash(b.key, seed >>> 0) || (a.key < b.key ? -1 : 1)).map((r) => r.key);
}

export function raceDigest(result) {
  let h = 2166136261; const feed = (s) => { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } };
  for (const r of result.teams) { feed(r.key + ":"); for (const l of r.legs) feed(l.animal + "/" + l.ms + "/" + l.handoff + ";"); }
  feed(result.events.length + ":" + result.events.map((e) => e.type[0]).join(""));
  return result.order.join(">") + "#" + (h >>> 0).toString(16);
}
export function positionAt(result, ti, ms) {
  const r = result.teams[ti]; let dist = 0, leg = 0, frac = 0;
  for (const l of r.legs) {
    const len = result.course[l.i].len;
    if (ms >= l.end) { dist += len; leg = l.i; frac = 1; }
    else { leg = l.i; if (ms > l.start) { frac = (ms - l.start) / (l.end - l.start); dist += len * frac; } else frac = 0; return { leg, frac, dist, finished: false }; }
  }
  return { leg: r.legs.length - 1, frac: 1, dist, finished: true };
}
export const courseLength = (course) => course.reduce((s, l) => s + l.len, 0);

export function slotRating(race, a, leg) {
  const p = legPace(race, a, leg), rel = p.v / typeOf(race, leg.type).v50;
  return { rel, word: rel >= 1.2 ? "great" : rel >= 0.95 ? "good" : rel >= 0.75 ? "ok" : rel >= 0.5 ? "poor" : "awful", ms: p.ms };
}
export function bestOrder(race, animals, course) {
  const n = Math.min(course.length, animals.length), est = animals.map((a) => course.slice(0, n).map((l) => legPace(race, a, l).ms));
  let best = null, bt = Infinity; const used = new Array(animals.length).fill(false), cur = [];
  (function rec(i, t) {
    if (t >= bt) return;
    if (i === n) { bt = t; best = cur.slice(); return; }
    for (let k = 0; k < animals.length; k++) if (!used[k]) { used[k] = true; cur.push(k); rec(i + 1, t + est[k][i]); cur.pop(); used[k] = false; }
  })(0, 0);
  const rest = animals.map((_, k) => k).filter((k) => !best.includes(k));
  return best.concat(rest).map((k) => animals[k]);
}