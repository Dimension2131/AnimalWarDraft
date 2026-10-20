// =====================================================================
// animals.js — loads and merges a pack's entity files (pack-aware).
// To add animals later, add a file name to `entityFiles` in packs/animals/pack.js. That is the ONLY edit needed.
// To add a whole category, see docs/PACK_FORMAT.md.
// Back-compat: ANIMALS / ANIMAL_MAP still export the DEFAULT pack's entities exactly as before.
// All paths are resolved against the repo root from this module's own URL, so GitHub project pages work (no leading "/").
// =====================================================================
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

// Optional per-entity traits (strength + weakness): pack.traitsFile default-exports { [id]: { up, down, why } }. Merged onto a COPY of the entity as entity.traits.
async function attachTraits(pack, list) {
  if (!pack.traitsFile) return list;
  try {
    const T = (await import(at(pack.traitsFile))).default || {};
    return list.map((a) => (!a.traits && T[a.id] ? { ...a, traits: T[a.id] } : a));
  } catch (err) { console.warn(`[${pack.id}] traits file not loaded, playing without traits:`, err); return list; }
}

// Optional silhouettes. Missing or broken file = emoji everywhere, nothing else changes.
async function attachSilhouettes(pack, list) {
  if (!pack.silhouetteMap) return list;
  try {
    const sil = (await import(at(pack.silhouetteMap))).default || {};
    for (const a of list) if (!a.silhouette && sil[a.id] && typeof sil[a.id].url === "string") a.silhouette = sil[a.id].url;
  } catch (err) { console.warn(`[${pack.id}] silhouette map not loaded, using emoji:`, err); }
  return list;
}

// -> { pack, list, map }. Cached per pack id; unknown id = default pack.
export async function loadPackData(id) {
  const pack = await getPack(id);
  if (!cache.has(pack.id)) cache.set(pack.id, (async () => {
    const list = await attachSilhouettes(pack, await attachTraits(pack, await loadList(pack)));
    return { pack, list, map: new Map(list.map((a) => [a.id, a])) };
  })());
  return cache.get(pack.id);
}

const DEFAULT = await loadPackData(await defaultPackId());
export const ANIMALS = DEFAULT.list;
export const ANIMAL_MAP = DEFAULT.map;