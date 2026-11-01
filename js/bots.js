// js/bots.js: bot bidders for the draft modes. Pure data and decision logic (no network, no DOM), so tools/test-bots.mjs can test it.
// A bot is an entry in players/<bot~N> with { bot: {personality}, online: true, name }. js/host.js (the host's device only) runs them: it plans each lot once, then bids / skips / claims like a person would.
// The lobby panel that edits them is js/bots-ui.js.
import * as R from "./rules.js";

export const BOT_PREFIX = "bot~";
export const isBotKey = (k) => String(k || "").startsWith(BOT_PREFIX);

// ---------- personalities ----------
export const STYLES = [
  { id: "steady", label: "Steady", blurb: "Raises by the minimum, again and again." },
  { id: "jump", label: "Jumper", blurb: "Bids in big leaps to scare people off." },
  { id: "sniper", label: "Sniper", blurb: "Waits, then strikes in the last seconds." },
  { id: "mixed", label: "Mixed", blurb: "Picks a different style for every lot." }
];
export const STYLE_IDS = STYLES.map((s) => s.id);

// the six dials, 0 to 100. text(v) is the one-line plain-language meaning shown under the slider
const tier = (v, a, b, c) => (v < 34 ? a : v < 67 ? b : c);
export const DIALS = [
  { key: "aggr", label: "Aggression", lo: "Cautious", hi: "Relentless", text: (v) => tier(v, "Bids rarely and slowly, and gives up early.", "Joins in when a player looks good.", "Bids fast, raises often and pays extra to win.") },
  { key: "patience", label: "Patience", lo: "Impulsive", hi: "Patient", text: (v) => tier(v, "Jumps in straight away.", "Takes a moment to think.", "Waits for the last seconds of the timer.") },
  { key: "disc", label: "Discipline", lo: "Reckless", hi: "Frugal", text: (v) => tier(v, "Will spend almost everything on one player.", "Keeps some money back for later.", "Saves cash for every empty spot and never splurges.") },
  { key: "hunger", label: "Star hunger", lo: "Any will do", hi: "Stars only", text: (v) => tier(v, "Happy with ordinary players.", "Likes good players, pays more for the best.", "Chases the top players and ignores the rest.") },
  { key: "need", label: "Squad planner", lo: "Ignores gaps", hi: "Fills gaps", text: (v) => tier(v, "Does not care about positions or roles.", "Likes a balanced squad.", "Pays extra for whatever the squad is missing.") },
  { key: "wild", label: "Wildcard", lo: "Predictable", hi: "Chaotic", text: (v) => tier(v, "Always values a player the same way.", "A little random.", "Wild swings: random overbids and random skips.") }
];
export const DIAL_KEYS = DIALS.map((d) => d.key);

export const ARCH = {
  balanced: { id: "balanced", label: "All-rounder", emoji: "⚖️", color: "#4aa3ff", blurb: "Plays it straight.", style: "steady", dials: { aggr: 50, patience: 50, disc: 60, hunger: 50, need: 50, wild: 15 }, chat: 30,
    names: ["Atlas", "Orion", "Sage", "Maple"], lines: ["Solid pick.", "That will do nicely.", "Good fit for my squad."] },
  sniper: { id: "sniper", label: "Sniper", emoji: "🎯", color: "#ff3d57", blurb: "Waits, then strikes at the buzzer.", style: "sniper", dials: { aggr: 55, patience: 90, disc: 65, hunger: 60, need: 35, wild: 10 }, chat: 25,
    names: ["Viper", "Ghost", "Talon", "Echo"], lines: ["Too slow.", "Right on the buzzer.", "Patience pays."] },
  whale: { id: "whale", label: "Big spender", emoji: "🐋", color: "#b987ff", blurb: "Throws cash at the stars.", style: "jump", dials: { aggr: 90, patience: 20, disc: 15, hunger: 90, need: 25, wild: 25 }, chat: 60,
    names: ["Midas", "Rich", "Baron", "Goldie"], lines: ["Money talks.", "Add it to the collection.", "Price is no object."] },
  bargain: { id: "bargain", label: "Bargain hunter", emoji: "🪙", color: "#ffe14d", blurb: "Never pays a cent too much.", style: "steady", dials: { aggr: 35, patience: 70, disc: 95, hunger: 30, need: 60, wild: 10 }, chat: 30,
    names: ["Penny", "Nickel", "Dime", "Clover"], lines: ["Great value.", "Cheap and cheerful.", "Not a cent more."] },
  planner: { id: "planner", label: "Squad builder", emoji: "🧭", color: "#35e07f", blurb: "Builds a complete team, gap by gap.", style: "steady", dials: { aggr: 45, patience: 55, disc: 70, hunger: 35, need: 95, wild: 10 }, chat: 25,
    names: ["Curator", "Scout", "Mason", "Compass"], lines: ["Exactly what the squad needed.", "Another piece of the puzzle.", "Fills a gap nicely."] },
  gremlin: { id: "gremlin", label: "Gremlin", emoji: "🎲", color: "#ff9a3d", blurb: "Pure vibes. Anything can happen.", style: "mixed", dials: { aggr: 60, patience: 30, disc: 30, hunger: 50, need: 20, wild: 95 }, chat: 80,
    names: ["Gremlin", "Chaos", "Wildcard", "Pixel"], lines: ["lol ok", "did not even mean to", "vibes."] }
};
export const ARCH_IDS = Object.keys(ARCH);

export const clampDial = (v) => Math.max(0, Math.min(100, Math.round(+v) || 0));
export function botFromArch(arch) {
  const a = ARCH[arch] || ARCH.balanced;
  return { arch: a.id, emoji: a.emoji, style: a.style, chat: a.chat, ...a.dials };
}
// a stored bot config, repaired: unknown keys are dropped, missing or wrong values fall back to the archetype's
export function normBot(b) {
  const base = botFromArch(b && b.arch), out = { ...base };
  if (!b) return out;
  for (const k of DIAL_KEYS) if (b[k] !== undefined) out[k] = clampDial(b[k]);
  out.chat = b.chat !== undefined ? clampDial(b.chat) : base.chat;
  if (STYLE_IDS.includes(b.style)) out.style = b.style;
  if (typeof b.emoji === "string" && b.emoji && b.emoji.length <= 8) out.emoji = b.emoji;
  return out;
}
export function botName(arch, taken) {
  const a = ARCH[arch] || ARCH.balanced, used = new Set([...taken].map((n) => String(n).toLowerCase()));
  for (const n of a.names) if (!used.has(n.toLowerCase())) return n;
  for (let i = 2; i < 99; i++) { const n = `${a.names[0]} ${i}`; if (!used.has(n.toLowerCase())) return n; }
  return a.names[0];
}
// the next free key and an archetype for it: each new bot differs from the ones already there while there are archetypes left
export function nextBot(players, rnd = Math.random) {
  const bots = Object.entries(players || {}).filter(([, p]) => p && p.bot), taken = Object.values(players || {}).map((p) => (p && p.name) || "");
  const usedArch = new Set(bots.map(([, p]) => p.bot.arch));
  const pool = ARCH_IDS.filter((a) => !usedArch.has(a)), pick = (pool.length ? pool : ARCH_IDS)[Math.floor(rnd() * (pool.length ? pool.length : ARCH_IDS.length))];
  let n = 1; while ((players || {})[BOT_PREFIX + n]) n++;
  return { key: BOT_PREFIX + n, arch: pick, name: botName(pick, taken), bot: botFromArch(pick) };
}
// chat after winning a lot: the line (or null). `rnd` is injectable for tests
export function winLine(bot, rnd = Math.random) {
  const a = ARCH[bot.arch] || ARCH.balanced; if (rnd() * 100 >= (bot.chat || 0) * 0.6) return null;
  return a.lines[Math.floor(rnd() * a.lines.length)];
}

// ---------- valuing a player ----------
// One number per entity, whatever the world: football and basketball have an overall rating, Pokémon a base stat total, animals the toughness formula.
export const valueOf = (a) => (a && typeof a.ovr === "number" ? a.ovr : a && typeof a.bst === "number" ? a.bst : a ? R.toughnessOf(a) : 0);
// q = where a player sits in the draw pool, 0 (weakest) to 1 (best)
export function qualityTable(ents) {
  const vals = ents.map(valueOf).sort((x, y) => x - y), n = vals.length || 1;
  const lower = (v) => { let lo = 0, hi = vals.length; while (lo < hi) { const m = (lo + hi) >> 1; if (vals[m] < v) lo = m + 1; else hi = m; } return lo; };
  const upper = (v) => { let lo = 0, hi = vals.length; while (lo < hi) { const m = (lo + hi) >> 1; if (vals[m] <= v) lo = m + 1; else hi = m; } return lo; };
  return (a) => { const v = valueOf(a); return Math.max(0, Math.min(1, (lower(v) + upper(v)) / 2 / n)); };
}
// how the draw pool splits into groups (football positions, ...): share per group, for "what is my squad missing"
export function groupShares(ents, groupOf) {
  const c = {}; let n = 0; for (const a of ents) { const g = groupOf(a); if (g == null) continue; c[g] = (c[g] || 0) + 1; n++; }
  const out = {}; for (const g in c) out[g] = c[g] / (n || 1); return out;
}
// how much the squad still needs this player's group: 1 = nothing of it yet, 0 = exactly enough, negative = more than enough
export function needScore(a, roster, shares, groupOf, size) {
  const g = groupOf(a); if (g == null || !(shares[g] > 0)) return 0;
  const want = Math.max(1, shares[g] * size), have = roster.filter((r) => groupOf(r) === g).length;
  return Math.max(-1, Math.min(1, (want - have) / want));
}

// ---------- planning and acting on one lot ----------
export const fairPrice = (q, avg) => avg * (0.35 + 2.4 * Math.pow(q, 2.2));   // what a player of quality q usually costs when an average slot is worth `avg`
// ctx: { bot, q, need, bal, slotsLeft, avg, rnd }. Returns the plan for this lot: the most the bot will pay, how it bids and how fast it reacts.
export function planLot({ bot, q, need = 0, bal, slotsLeft, avg, rnd = Math.random }) {
  const b = normBot(bot), f = (k) => b[k] / 100, fair = fairPrice(q, avg);
  const noise = 1 + (rnd() - 0.5) * 0.7 * f("wild");
  const mult = (0.7 + 0.65 * f("aggr")) * (1 + f("hunger") * (q - 0.5) * 0.9) * (1 + f("need") * need * 0.6) * noise;
  const reserve = Math.max(0, slotsLeft - 1) * Math.max(R.MIN_BID, avg * 0.25 * f("disc"));   // money kept back for the empty spots after this one
  const share = slotsLeft <= 1 ? 1 : 0.3 + 0.65 * (1 - f("disc"));                            // a frugal bot never puts more than ~1/3 of its cash on one player
  const spend = Math.max(0, Math.min(bal - reserve, bal * share));
  let max = Math.floor(Math.min(spend, Math.max(R.MIN_BID, fair * mult)));
  if (b.wild >= 70 && rnd() < 0.08) max = 0;   // a gremlin sometimes just sits a lot out
  const style = b.style === "mixed" ? (rnd() < 0.5 ? "steady" : rnd() < 0.5 ? "jump" : "sniper") : b.style;
  return { max, fair, style, aggr: b.aggr, patience: b.patience, snipeAt: 2200 + 2600 * f("patience"), readyAt: 0, lastTop: "", born: 0 };
}
export const reactMs = (plan, rnd = Math.random) => Math.round(300 + rnd() * (500 + (1 - plan.aggr / 100) * 2600));
// What the bot does right now on auction A at time t: { type: "bid", amt } | { type: "skip" } | { type: "claim" } | null (wait). Mutates plan.readyAt / plan.lastTop only.
export function decide(plan, A, key, t, rnd = Math.random) {
  if (!A || A.resolved || !plan) return null;
  if (!plan.born) { plan.born = t; plan.readyAt = t + reactMs(plan, rnd); }
  if (A.status === "claim") return A.claim && A.claim.key === key && !A.claim.taken && !A.claim.declined && t >= plan.readyAt ? { type: "claim" } : null;
  if (A.status !== "bidding" || !(A.eligible && A.eligible[key]) || (A.skips && A.skips[key])) return null;
  const top = A.top, sig = top ? `${top.key}:${top.amt}` : "";
  if (sig !== plan.lastTop) { plan.lastTop = sig; if (top && top.key !== key) plan.readyAt = Math.max(plan.readyAt, t + reactMs(plan, rnd)); }   // somebody just bid: think for a moment
  if (top && top.key === key) return null;   // already winning
  if (t < plan.readyAt) return null;
  const minBid = (top ? top.amt : 0) + R.MIN_BID, lim = (A.limits && A.limits[key]) || 0, cap = Math.min(plan.max, lim);
  if (cap < minBid) return { type: "skip" };
  const left = A.deadline - t;
  if (plan.style === "sniper" && left > plan.snipeAt) return null;
  let amt = minBid;
  if (plan.style === "jump") amt = top ? minBid + Math.max(1, Math.round(plan.fair * 0.1 * (0.4 + rnd() * 0.8))) : Math.max(1, Math.round(plan.fair * 0.2));
  else if (!top) amt = Math.max(1, Math.round(plan.fair * 0.15 * (plan.aggr / 100) * rnd()));
  else if (rnd() < (plan.aggr / 100) * 0.35) amt = minBid + Math.floor(rnd() * 3);
  amt = Math.max(minBid, Math.min(cap, amt));
  plan.readyAt = t + reactMs(plan, rnd);
  return { type: "bid", amt };
}
