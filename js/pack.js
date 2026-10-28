import LOADERS from "../packs/index.js";
import { arr } from "./util.js";
import * as R from "./rules.js";

const cache = new Map();
let manifests = null;


let manifestsP = null;   // one shared promise: concurrent callers must all wait for the same complete list
export function listPacks() {
  if (!manifestsP) manifestsP = Promise.all(LOADERS.map((load) => load().then((x) => x.default, (err) => { console.warn("[packs] could not load a pack manifest:", err); return null; }))).then((all) => {
    manifests = [];
    for (const m of all) { if (!m) continue; if (typeof m.id === "string" && !manifests.some((x) => x.id === m.id)) manifests.push(m); else console.warn("[packs] bad or duplicate pack skipped"); }
    return manifests;
  });
  return manifestsP;
}
export async function defaultPackId() { return (await listPacks())[0].id; }

export async function getPack(id) {
  const all = await listPacks();
  return all.find((p) => p.id === id) || all[0];
}

export const arenaIds = (pack) => pack.arenas.map((a) => a.id);
export const arenaOf = (pack, id) => pack.arenas.find((a) => a.id === id) || { id, label: id, icon: "", art: "plains" };
export const statOf = (pack, key) => pack.stats.find((s) => s.key === key);
export const engineStats = (pack) => pack.stats.filter((s) => s.key !== "size");
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

export const arenaMeta = (pack) => Object.fromEntries(pack.arenas.map((a) => [a.id, { label: a.label, art: a.art }]));

export function defaultFilters(pack) {
  const f = {};
  for (const d of pack.filters) {
    if (d.type === "chips") f[d.id] = d.options.slice();
    else if (d.type === "range") { f[d.id + "Min"] = d.min; f[d.id + "Max"] = d.max; }
    else if (d.type === "exclude") f.excluded = [];
  }
  return f;
}

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

let applied = [];
const prefersReduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

// Switches the "world" (look) of the whole page. The world is the data-world attribute on <html>: styles/worlds/<id>.css holds the colours,
// fonts, shapes and textures for it (and sets --w-id: <id>). A pack WITHOUT such a stylesheet falls back to pack.theme (CSS variables set inline).
// opts.animate  : cross-fade + circular wipe from opts.origin {x,y} (View Transitions API; browsers without it get the CSS colour transitions).
//                 Never animates on first paint, when the world is unchanged, or with prefers-reduced-motion.
// opts.update   : DOM changes that belong to the switch (hero art, tagline...). Runs INSIDE the transition, so old and new are cross-faded.
// Returns a promise that resolves when the switch (and its animation) is over.
export function applyPack(pack, opts = {}) {
  if (typeof document === "undefined") return Promise.resolve();
  document.title = pack.title;
  const root = document.documentElement, world = pack.world || pack.id, prev = root.dataset ? root.dataset.world : "";
  const swap = () => {
    root.setAttribute("data-world", world);
    let own = false;   // true when styles/worlds/<id>.css is loaded: it already carries the colours, so pack.theme must not override them inline
    try { own = typeof getComputedStyle === "function" && getComputedStyle(root).getPropertyValue("--w-id").trim() === world; } catch { own = false; }
    const theme = own ? {} : (pack.theme || {});
    for (const k of applied) if (!(k in theme)) root.style.removeProperty(k);
    applied = Object.keys(theme);
    for (const k of applied) root.style.setProperty(k, theme[k]);
    try { sessionStorage.setItem("adw_world", world); } catch { /* private mode: the first paint just uses the default world */ }
    if (typeof opts.update === "function") opts.update();
  };
  if (!(opts.animate && prev && prev !== world && !prefersReduced())) { swap(); return Promise.resolve(); }
  if (typeof document.startViewTransition !== "function") { swap(); return Promise.resolve(); }   // colours still fade via @property transitions
  const o = opts.origin || {};
  root.style.setProperty("--vt-x", (o.x != null ? o.x : innerWidth / 2) + "px");
  root.style.setProperty("--vt-y", (o.y != null ? o.y : innerHeight / 3) + "px");
  root.setAttribute("data-vt", "1");
  const t = document.startViewTransition(swap), done = () => root.removeAttribute("data-vt");
  t.finished.then(done, done);
  return t.finished.catch(() => { });
}
