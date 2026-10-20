// =====================================================================
// pack.js — category-pack runtime: registry access, filters, theme. See docs/PACK_FORMAT.md.
// No Firebase, no DOM except applyPack(). Safe to import from Node tests.
// =====================================================================
import LOADERS from "../packs/index.js";
import { arr } from "./util.js";
import * as R from "./rules.js";

const cache = new Map();
let manifests = null;

// All registered pack manifests (loads each manifest once). Order = packs/index.js order; the first one is the default.
export async function listPacks() {
  if (!manifests) {
    manifests = [];
    for (const load of LOADERS) {
      try { const m = (await load()).default; if (m && typeof m.id === "string" && !manifests.some((x) => x.id === m.id)) manifests.push(m); else console.warn("[packs] bad or duplicate pack skipped"); }
      catch (err) { console.warn("[packs] could not load a pack manifest:", err); }
    }
  }
  return manifests;
}
export async function defaultPackId() { return (await listPacks())[0].id; }
// Unknown id falls back to the default pack (a room made by a newer version must not brick this client).
export async function getPack(id) {
  const all = await listPacks();
  return all.find((p) => p.id === id) || all[0];
}

export const arenaIds = (pack) => pack.arenas.map((a) => a.id);
export const arenaOf = (pack, id) => pack.arenas.find((a) => a.id === id) || { id, label: id, icon: "", art: "plains" };
export const statOf = (pack, key) => pack.stats.find((s) => s.key === key);
export const engineStats = (pack) => pack.stats.filter((s) => s.key !== "size");
// Toughness table for a list of entities: id -> { v: rounded effective HP, pct: 0-100 relative to the toughest in the list, rank: 1 = toughest, of: list size }.
// Display only (R.toughnessOf); the fight never reads it. Cached per list.
const toughCache = new WeakMap();
export function toughnessTable(list) {
  if (toughCache.has(list)) return toughCache.get(list);
  const vals = list.map((a) => ({ id: a.id, raw: R.toughnessOf(a) })).sort((x, y) => y.raw - x.raw);
  const top = vals.length ? vals[0].raw : 1, m = new Map();
  vals.forEach((x, i) => m.set(x.id, { v: Math.round(x.raw), pct: Math.max(4, Math.round((x.raw / top) * 100)), rank: i + 1, of: vals.length }));
  toughCache.set(list, m);
  return m;
}
export const cap = (s) => String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);
// {id: {label, art}} handed to the renderer so it can draw and name arenas of any pack.
export const arenaMeta = (pack) => Object.fromEntries(pack.arenas.map((a) => [a.id, { label: a.label, art: a.art }]));

// ---- filters ----
// Defaults identical to the old R.DEFAULT_SETTINGS.filters for the animals pack.
export function defaultFilters(pack) {
  const f = {};
  for (const d of pack.filters) {
    if (d.type === "chips") f[d.id] = d.options.slice();
    else if (d.type === "range") { f[d.id + "Min"] = d.min; f[d.id + "Max"] = d.max; }
    else if (d.type === "exclude") f.excluded = [];
  }
  return f;
}
// Fills holes (Firebase drops empty arrays) so the UI and host never see undefined.
export function normFilters(pack, f) {
  const out = { ...(f || {}) };
  for (const d of pack.filters) {
    if (d.type === "chips") out[d.id] = arr(out[d.id]);
    else if (d.type === "range") { if (out[d.id + "Min"] == null) out[d.id + "Min"] = d.min; if (out[d.id + "Max"] == null) out[d.id + "Max"] = d.max; }
    else if (d.type === "exclude") out.excluded = arr(out.excluded);
  }
  return out;
}
export function filterPool(entities, f, pack) {
  f = f || {};
  const defs = pack.filters, ex = new Set(arr(f.excluded));
  return entities.filter((e) => {
    if (ex.has(e.id)) return false;
    for (const d of defs) {
      if (d.type === "chips") {
        const sel = new Set(arr(f[d.id])), v = e[d.field];
        if (!(Array.isArray(v) ? v.some((x) => sel.has(x)) : sel.has(v))) return false;
      } else if (d.type === "range") {
        const lo = f[d.id + "Min"] ?? 0, hi = f[d.id + "Max"] ?? Infinity, v = e[d.field];
        if (!(v >= lo && v <= hi)) return false;
      }
    }
    return true;
  });
}

// ---- theme / title (browser only) ----
let applied = [];
export function applyPack(pack) {
  if (typeof document === "undefined") return;
  document.title = pack.title;
  const root = document.documentElement;
  for (const k of applied) if (!(pack.theme && k in pack.theme)) root.style.removeProperty(k);
  applied = Object.keys(pack.theme || {});
  for (const k of applied) root.style.setProperty(k, pack.theme[k]);
}