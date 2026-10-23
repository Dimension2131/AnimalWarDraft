import { getPack, defaultPackId } from "./pack.js";

const ROOT = new URL("../", import.meta.url);
const at = (rel) => new URL(rel, ROOT).href;
const cache = new Map();

async function loadList(pack) {
  const byId = new Map();
  for (const f of pack.entityFiles || []) {
    try {
      const mod = await import(at(f));
      const list = Array.isArray(mod.default) ? mod.default : [];
      for (const a of list) {
        if (!a || typeof a.id !== "string") { console.warn(`[${pack.id}] ${f}: entry without id skipped`); continue; }
        if (byId.has(a.id)) { console.warn(`[${pack.id}] duplicate id "${a.id}" in ${f} ignored (first one wins)`); continue; }
        byId.set(a.id, a);
      }
    } catch (err) {
      console.warn(`[${pack.id}] could not load ${f}, skipping:`, err);
    }
  }
  return [...byId.values()];
}

async function attachTraits(pack, list) {
  if (!pack.traitsFile) return list;
  try {
    const T = (await import(at(pack.traitsFile))).default || {};
    return list.map((a) => (!a.traits && T[a.id] ? { ...a, traits: T[a.id] } : a));
  } catch (err) { console.warn(`[${pack.id}] traits file not loaded, playing without traits:`, err); return list; }
}

async function attachSilhouettes(pack, list) {
  if (typeof pack.imageUrl === "function") for (const a of list) { a.imageAlt = a.image; a.image = pack.imageUrl(a); }               // self-hosted artwork first, original URL kept as fallback
  if (typeof pack.iconAlt === "function") for (const a of list) a.iconAlt = pack.iconAlt(a);
  if (pack.silhouetteFromImage) for (const a of list) { if (!a.silhouette && a.image) a.silhouette = a.image; }   // the ink filter turns any transparent artwork into a silhouette
  if (typeof pack.iconUrl === "function") for (const a of list) a.iconUrl = pack.iconUrl(a);                         // small colour sprite for lists, medals and the lineup
  if (!pack.silhouetteMap) return list;
  try {
    const sil = (await import(at(pack.silhouetteMap))).default || {};
    for (const a of list) if (!a.silhouette && sil[a.id] && typeof sil[a.id].url === "string") a.silhouette = sil[a.id].url;
  } catch (err) { console.warn(`[${pack.id}] silhouette map not loaded, using emoji:`, err); }
  return list;
}

export async function attachImages(pack, list) {
  if (!pack.imageMap) return list;
  try {
    const m = (await import(at(pack.imageMap))).default || {};
    for (const a of list) if (!a.image && m[a.id] && typeof m[a.id].url === "string") a.image = m[a.id].url;
  } catch (err) { /* no photo map yet */ }
  return list;
}
export async function loadPackData(id) {
  const pack = await getPack(id);
  if (!cache.has(pack.id)) cache.set(pack.id, (async () => {
    const list = await attachImages(pack, await attachSilhouettes(pack, await attachTraits(pack, await loadList(pack))));
    return { pack, list, map: new Map(list.map((a) => [a.id, a])) };
  })());
  return cache.get(pack.id);
}

const DEFAULT = await loadPackData(await defaultPackId());
export const ANIMALS = DEFAULT.list;
export const ANIMAL_MAP = DEFAULT.map;