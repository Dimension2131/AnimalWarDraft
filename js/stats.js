// js/stats.js: what the leaderboard knows about a player. Pure functions (no network, no DOM), shared by the hosts (they build a record when a game ends),
// js/net.js (it merges the record into stats/<name> inside one transaction) and js/leaderboard.js (it reads the totals back).
//
// stats/<nameKey> = {
//   name, updated,
//   all:    <agg>,                 every game
//   worlds: { animals|pokemon|football|basketball: <agg> },
//   h2h:    { <opponentKey>: { n: name, w, l, d } },        results against people
//   bots:   { <preset>: { w, l, d } }                       results against bots, by personality
// }
// <agg> = { games, titles, podiums, mw, ml, md (match wins / losses / draws), picks, spent, gradeSum, gradeN, perfect, snipes, wars, bigSpends,
//           thrifty, flawless, underdog, streak, bestStreak, form: ["W"|"L", ...last 10], rec: { steal, overpay, topPrice, grade, blowout } }
import * as B from "./bots.js";

export const WORLDS = [
  { id: "animals", label: "Animals", emoji: "🦁" },
  { id: "pokemon", label: "Pokémon", emoji: "🔴" },
  { id: "football", label: "Football", emoji: "⚽" },
  { id: "basketball", label: "Basketball", emoji: "🏀" }
];
export const WORLD_IDS = WORLDS.map((w) => w.id);
export const FORM_KEEP = 10, WAR_BIDS = 6, SNIPE_MS = 2000;

const num = (v) => (Number.isFinite(+v) ? +v : 0);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

// ---------- draft grade ----------
// pool: the entities in the draw pool (for quality percentiles). picks: [{ id, price }]. Returns per-pick values and the squad's grade (0-100).
export function gradeDraft({ picks, pool, map, startBalance, size }) {
  const q = B.qualityTable(pool), avg = startBalance / Math.max(1, size);
  const rows = picks.map((p) => { const e = map.get(p.id); if (!e) return null; const qq = q(e), fair = B.fairPrice(qq, avg); return { id: p.id, name: e.name || p.id, price: num(p.price), fair: Math.round(fair * 10) / 10, q: qq, late: !!p.late, bids: num(p.bids) }; }).filter(Boolean);
  if (!rows.length) return { grade: 0, rows, meanQ: 0 };
  const fairSum = rows.reduce((s, r) => s + r.fair, 0) || 1, paid = rows.reduce((s, r) => s + r.price, 0), meanQ = rows.reduce((s, r) => s + r.q, 0) / rows.length;
  const value = clamp(0.5 + 0.5 * (fairSum - paid) / fairSum, 0, 1), quality = clamp((meanQ - 0.3) / 0.6, 0, 1);
  return { grade: Math.round(100 * (0.5 * quality + 0.5 * value)), rows, meanQ, paid };
}
export const gradeLetter = (g) => (g >= 80 ? "A" : g >= 65 ? "B" : g >= 50 ? "C" : g >= 35 ? "D" : "F");

// ---------- building one game's records ----------
// pairs: [{ w, l, d, margin, score }] one per finished match between two managers (d: a draw, w and l are then just the two sides).
// Returns { [humanKey]: record }. Bots never get a record, but results against them are kept in the human's record.
export function buildRecords({ world, keys, players, ledger, game, settings, order, champion, pairs, map, now = Date.now() }) {
  const out = {}, humans = keys.filter((k) => players[k] && !players[k].bot), L = ledger || {}, start = num((settings || {}).startBalance) || 100;
  const size = num((settings || {}).rosterSize) || 5, pool = ((game || {}).pool || []).map((id) => map.get(id)).filter(Boolean), champs = new Set(champion || []);
  const info = {};
  for (const k of keys) { const picks = Object.values((L.rosters || {})[k] || {}); info[k] = { picks, ...gradeDraft({ picks, pool, map, startBalance: start, size }) }; }
  const lowestQ = keys.length > 2 ? keys.reduce((a, b) => (info[b].meanQ < info[a].meanQ ? b : a)) : null;
  for (const k of humans) {
    const me = info[k], title = champs.has(k), r = { world, t: now, title, place: Math.max(1, (order || []).indexOf(k) + 1), of: keys.length, w: 0, l: 0, d: 0, h2h: {}, bots: {}, vsBots: 0 };
    r.picks = me.picks.length; r.spent = me.picks.reduce((s, p) => s + num(p.price), 0); r.grade = me.grade; r.graded = me.rows.length > 0;
    r.snipes = me.picks.filter((p) => p.late).length; r.wars = me.picks.filter((p) => num(p.bids) >= WAR_BIDS).length;
    r.bigSpends = me.picks.filter((p) => num(p.price) >= 0.4 * start).length;
    for (const row of me.rows) {
      const save = row.fair - row.price, over = row.price - row.fair;
      if (!r.steal || save > r.steal.saved) r.steal = { ent: row.name, price: row.price, fair: row.fair, saved: Math.round(save * 10) / 10 };
      if (!r.overpay || over > r.overpay.over) r.overpay = { ent: row.name, price: row.price, fair: row.fair, over: Math.round(over * 10) / 10 };
      if (!r.topPrice || row.price > r.topPrice.price) r.topPrice = { ent: row.name, price: row.price };
    }
    for (const m of pairs || []) {
      const a = m.d ? m.w : m.w, b = m.l, mine = a === k || b === k; if (!mine) continue;
      const opp = a === k ? b : a, res = m.d ? "d" : m.w === k ? "w" : "l"; r[res]++;
      const margin = num(m.margin);
      if (res === "w" && margin > 0 && (!r.blowout || margin > r.blowout.margin)) r.blowout = { margin, score: m.score || null, vs: players[opp] ? players[opp].name : opp };
      if (players[opp] && players[opp].bot) { const arch = (players[opp].bot || {}).arch || "balanced"; (r.bots[arch] ||= { w: 0, l: 0, d: 0 })[res]++; r.vsBots++; }
      else if (players[opp]) { const o = (r.h2h[opp] ||= { n: players[opp].name, w: 0, l: 0, d: 0 }); o[res]++; }
    }
    r.thrifty = title && r.spent < 0.5 * start; r.flawless = title && r.l === 0 && r.w > 0; r.underdog = title && lowestQ === k;
    out[k] = r;
  }
  return out;
}

// ---------- merging a record into a player's stats ----------
export const emptyAgg = () => ({ games: 0, titles: 0, podiums: 0, mw: 0, ml: 0, md: 0, picks: 0, spent: 0, gradeSum: 0, gradeN: 0, perfect: 0, snipes: 0, wars: 0, bigSpends: 0, thrifty: 0, flawless: 0, underdog: 0, streak: 0, bestStreak: 0, form: [], rec: {} });
function addTo(a, r) {
  a.games++; if (r.title) a.titles++; if (r.place <= Math.min(3, r.of - 1 || 1) && r.of > 1) a.podiums++;
  a.mw += r.w; a.ml += r.l; a.md += r.d; a.picks += r.picks; a.spent += r.spent;
  if (r.graded) { a.gradeSum += r.grade; a.gradeN++; if (r.grade >= 90) a.perfect++; }
  a.snipes += r.snipes; a.wars += r.wars; a.bigSpends += r.bigSpends; if (r.thrifty) a.thrifty++; if (r.flawless) a.flawless++; if (r.underdog) a.underdog++;
  a.streak = r.title ? (a.streak > 0 ? a.streak + 1 : 1) : (a.streak < 0 ? a.streak - 1 : -1); a.bestStreak = Math.max(a.bestStreak, a.streak);
  a.form = [...(a.form || []), r.title ? "W" : "L"].slice(-FORM_KEEP);
  const rec = (a.rec ||= {});
  if (r.steal && (!rec.steal || r.steal.saved > rec.steal.saved)) rec.steal = { ...r.steal, world: r.world };
  if (r.overpay && (!rec.overpay || r.overpay.over > rec.overpay.over)) rec.overpay = { ...r.overpay, world: r.world };
  if (r.topPrice && (!rec.topPrice || r.topPrice.price > rec.topPrice.price)) rec.topPrice = { ...r.topPrice, world: r.world };
  if (r.graded && (!rec.grade || r.grade > rec.grade.score)) rec.grade = { score: r.grade, world: r.world };
  if (r.blowout && (!rec.blowout || r.blowout.margin > rec.blowout.margin)) rec.blowout = { ...r.blowout, world: r.world };
}
// cur: the stored node (or null). Returns the new node. Used inside a database transaction, so it must not depend on anything outside its arguments.
export function applyRecord(cur, name, r) {
  const n = cur && cur.all ? cur : { name, all: emptyAgg(), worlds: {} };   // an old-format node (no "all") is started afresh
  n.name = name; n.updated = r.t; n.worlds = n.worlds || {};
  n.all = { ...emptyAgg(), ...n.all }; addTo(n.all, r);
  const w = (n.worlds[r.world] = { ...emptyAgg(), ...(n.worlds[r.world] || {}) }); addTo(w, r);
  n.h2h = n.h2h || {}; for (const [k, v] of Object.entries(r.h2h || {})) { const o = (n.h2h[k] ||= { n: v.n, w: 0, l: 0, d: 0 }); o.n = v.n; o.w += v.w; o.l += v.l; o.d += v.d; }
  n.bots = n.bots || {}; for (const [k, v] of Object.entries(r.bots || {})) { const o = (n.bots[k] ||= { w: 0, l: 0, d: 0 }); o.w += v.w; o.l += v.l; o.d += v.d; }
  return n;
}

// ---------- reading ----------
export const aggOf = (node, world) => ({ ...emptyAgg(), ...((world ? (node.worlds || {})[world] : node.all) || {}) });
export const hasStats = (node, world) => !!(node && node.all && aggOf(node, world).games > 0);
export const winRate = (a) => { const t = a.mw + a.ml + a.md; return t ? (a.mw + a.md * 0.5) / t : 0; };
export const titleRate = (a) => (a.games ? a.titles / a.games : 0);
export const avgGrade = (a) => (a.gradeN ? a.gradeSum / a.gradeN : 0);
export const avgPrice = (a) => (a.picks ? a.spent / a.picks : 0);
export const SORTS = [
  { id: "titles", label: "Titles", value: (a) => a.titles, tie: (a) => [titleRate(a), a.games], show: (a) => String(a.titles), min: () => true },
  { id: "winrate", label: "Win rate", value: (a) => winRate(a), tie: (a) => [a.mw + a.ml + a.md], show: (a) => Math.round(winRate(a) * 100) + "%", min: (a) => a.mw + a.ml + a.md >= 3 },
  { id: "grade", label: "Draft grade", value: (a) => avgGrade(a), tie: (a) => [a.gradeN], show: (a) => gradeLetter(avgGrade(a)) + " · " + Math.round(avgGrade(a)), min: (a) => a.gradeN >= 2 },
  { id: "streak", label: "Best streak", value: (a) => a.bestStreak, tie: (a) => [a.titles], show: (a) => String(a.bestStreak), min: (a) => a.bestStreak > 0 },
  { id: "games", label: "Games", value: (a) => a.games, tie: (a) => [a.titles], show: (a) => String(a.games), min: () => true }
];
export function rank(nodes, world, sortId) {
  const s = SORTS.find((x) => x.id === sortId) || SORTS[0];
  const rows = nodes.filter((n) => hasStats(n, world)).map((n) => ({ node: n, a: aggOf(n, world) })).filter((r) => s.min(r.a));
  rows.sort((x, y) => s.value(y.a) - s.value(x.a) || s.tie(y.a).reduce((d, v, i) => d || v - s.tie(x.a)[i], 0) || String(x.node.name).localeCompare(String(y.node.name)));
  return rows.map((r, i) => ({ ...r, rank: i + 1, shown: s.show(r.a) }));
}

// Hall of fame: the best of each record across everybody (for one world or all of them)
export function hallOfFame(nodes, world) {
  const picks = (n) => aggOf(n, world), best = [];
  const top = (get, better) => { let win = null; for (const n of nodes) { const v = get(picks(n)); if (v != null && (!win || better(v, win.v))) win = { node: n, v }; } return win; };
  const add = (id, emoji, title, win, text) => { if (win) best.push({ id, emoji, title, name: win.node.name, key: win.node.key, text: text(win.v), world: win.v.world || null }); };
  add("steal", "🕵️", "Best steal", top((a) => a.rec.steal, (v, w) => v.saved > w.saved), (v) => `${v.ent} for $${v.price} (worth about $${Math.round(v.fair)})`);
  add("overpay", "💸", "Biggest overpay", top((a) => a.rec.overpay, (v, w) => v.over > w.over), (v) => `${v.ent} for $${v.price} (worth about $${Math.round(v.fair)})`);
  add("price", "💎", "Most expensive pick", top((a) => a.rec.topPrice, (v, w) => v.price > w.price), (v) => `${v.ent} for $${v.price}`);
  add("grade", "🎓", "Best draft", top((a) => a.rec.grade, (v, w) => v.score > w.score), (v) => `Grade ${gradeLetter(v.score)} (${v.score})`);
  add("blowout", "💥", "Biggest win", top((a) => a.rec.blowout, (v, w) => v.margin > w.margin), (v) => `By ${v.margin}${v.score ? ` (${v.score.join("-")})` : ""} vs ${v.vs}`);
  const st = top((a) => (a.bestStreak > 0 ? { n: a.bestStreak } : null), (v, w) => v.n > w.n);
  if (st) best.push({ id: "streak", emoji: "🔥", title: "Longest streak", name: st.node.name, key: st.node.key, text: `${st.v.n} titles in a row`, world: null });
  const sn = top((a) => (a.snipes > 0 ? { n: a.snipes } : null), (v, w) => v.n > w.n);
  if (sn) best.push({ id: "sniper", emoji: "🎯", title: "Top sniper", name: sn.node.name, key: sn.node.key, text: `${sn.v.n} players won in the last seconds`, world: null });
  return best;
}

// ---------- badges ----------
export const BADGES = [
  { id: "champ", emoji: "🏆", label: "Champion", desc: "Win a title.", ok: (a) => a.titles >= 1 },
  { id: "dynasty", emoji: "👑", label: "Dynasty", desc: "Win 3 titles.", ok: (a) => a.titles >= 3 },
  { id: "streak", emoji: "🔥", label: "On fire", desc: "Win 3 titles in a row.", ok: (a) => a.bestStreak >= 3 },
  { id: "flawless", emoji: "🛡️", label: "Flawless", desc: "Win a title without losing a match.", ok: (a) => a.flawless >= 1 },
  { id: "thrifty", emoji: "🪙", label: "Penny pincher", desc: "Win a title spending less than half your money.", ok: (a) => a.thrifty >= 1 },
  { id: "underdog", emoji: "🐕", label: "Underdog", desc: "Win a title with the weakest squad in the room.", ok: (a) => a.underdog >= 1 },
  { id: "perfect", emoji: "🎓", label: "Perfect draft", desc: "Get a draft grade of 90 or more.", ok: (a) => a.perfect >= 1 },
  { id: "sniper", emoji: "🎯", label: "Sniper", desc: "Win 10 players in the last 2 seconds of a lot.", ok: (a) => a.snipes >= 10 },
  { id: "war", emoji: "⚔️", label: "War machine", desc: "Win 5 bidding wars (6 or more bids on one lot).", ok: (a) => a.wars >= 5 },
  { id: "whale", emoji: "🐋", label: "Big spender", desc: "Spend 40% of your money on a single player.", ok: (a) => a.bigSpends >= 1 },
  { id: "regular", emoji: "📅", label: "Regular", desc: "Play 10 games.", ok: (a) => a.games >= 10 },
  { id: "veteran", emoji: "🎖️", label: "Veteran", desc: "Play 25 games.", ok: (a) => a.games >= 25 }
];
export function badgesOf(node) {
  const a = aggOf(node, null), titledWorlds = Object.values(node.worlds || {}).filter((w) => w.titles > 0).length, bots = Object.values(node.bots || {}).reduce((s, b) => s + b.w, 0);
  return [...BADGES.map((b) => ({ ...b, earned: !!b.ok(a) })),
    { id: "allround", emoji: "🌍", label: "All-rounder", desc: "Win a title in 2 different games.", earned: titledWorlds >= 2 },
    { id: "botslayer", emoji: "🤖", label: "Bot slayer", desc: "Beat bots in 10 matches.", earned: bots >= 10 }].map(({ ok, ...b }) => b);
}

// ---------- rivals ----------
export function rivals(node) {
  const list = Object.entries(node.h2h || {}).map(([key, v]) => ({ key, name: v.n || key, w: v.w, l: v.l, d: v.d, n: v.w + v.l + v.d }));
  const nem = list.filter((r) => r.l > r.w && r.n >= 2).sort((a, b) => (b.l - b.w) - (a.l - a.w) || b.n - a.n)[0] || null;
  const vic = list.filter((r) => r.w > r.l && r.n >= 2).sort((a, b) => (b.w - b.l) - (a.w - a.l) || b.n - a.n)[0] || null;
  return { list: list.sort((a, b) => b.n - a.n), nemesis: nem, victim: vic };
}
// a friendly avatar for a name (stable): an emoji and a hue
const FACES = ["🦊", "🐼", "🦁", "🐯", "🐸", "🐙", "🦉", "🐺", "🦄", "🐲", "🐧", "🦈", "🦅", "🐢", "🦋", "🐝"];
export function avatarOf(name) { let h = 2166136261; for (const c of String(name || "")) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } h >>>= 0; return { emoji: FACES[h % FACES.length], hue: (h >>> 8) % 360 }; }
