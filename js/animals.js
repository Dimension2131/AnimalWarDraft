import { getPack, defaultPackId } from "./pack.js";

const ROOT = new URL("../", import.meta.url);
const at = (rel) => new URL(rel, ROOT).href;
const cache = new Map();

// Every data file a pack needs is requested at once (they used to be fetched one after another, so load time was the SUM of all round trips).
// import() is memoised by the browser, so starting them early below and awaiting them later costs nothing extra.
const tryImport = (file) => import(at(file)).then((m) => ({ ok: true, m }), (err) => ({ ok: false, err }));
function warm(pack) {
  const jobs = new Map(), get = (f) => { if (!jobs.has(f)) jobs.set(f, tryImport(f)); return jobs.get(f); };
  for (const f of pack.entityFiles || []) get(f);
  if (pack.traitsFile) get(pack.traitsFile);
  if (pack.silhouetteMap) get(pack.silhouetteMap);
  for (const f of [].concat(pack.imageMap || [])) get(f);
  return get;
}

async function loadList(pack, get) {
  const byId = new Map();
  const files = pack.entityFiles || [], results = await Promise.all(files.map((f) => get(f)));
  files.forEach((f, i) => {
    const r = results[i];
    if (!r.ok) { console.warn(`[${pack.id}] could not load ${f}, skipping:`, r.err); return; }
    const list = Array.isArray(r.m.default) ? r.m.default : [];
    for (const a of list) {
      if (!a || typeof a.id !== "string") { console.warn(`[${pack.id}] ${f}: entry without id skipped`); continue; }
      if (byId.has(a.id)) { console.warn(`[${pack.id}] duplicate id "${a.id}" in ${f} ignored (first one wins)`); continue; }
      byId.set(a.id, a);
    }
  });
  return [...byId.values()];
}

async function attachTraits(pack, list, get) {
  if (!pack.traitsFile) return list;
  try {
    const r = await get(pack.traitsFile); if (!r.ok) throw r.err;
    const T = r.m.default || {};
    return list.map((a) => (!a.traits && T[a.id] ? { ...a, traits: T[a.id] } : a));
  } catch (err) { console.warn(`[${pack.id}] traits file not loaded, playing without traits:`, err); return list; }
}

async function attachSilhouettes(pack, list, get) {
  if (typeof pack.imageUrl === "function") for (const a of list) { a.imageAlt = a.image; a.image = pack.imageUrl(a); }               // self-hosted artwork first, original URL kept as fallback
  if (typeof pack.iconAlt === "function") for (const a of list) a.iconAlt = pack.iconAlt(a);
  if (pack.silhouetteFromImage) for (const a of list) { if (!a.silhouette && a.image) a.silhouette = a.image; }   // the ink filter turns any transparent artwork into a silhouette
  if (typeof pack.iconUrl === "function") for (const a of list) a.iconUrl = pack.iconUrl(a);                         // small colour sprite for lists, medals and the lineup
  if (!pack.silhouetteMap) return list;
  try {
    const r = await get(pack.silhouetteMap); if (!r.ok) throw r.err;
    const sil = r.m.default || {};
    for (const a of list) if (!a.silhouette && sil[a.id] && typeof sil[a.id].url === "string") a.silhouette = sil[a.id].url;
  } catch (err) { console.warn(`[${pack.id}] silhouette map not loaded, using emoji:`, err); }
  return list;
}

export async function attachImages(pack, list, get = (f) => tryImport(f)) {
  if (!pack.imageMap) return list;
  for (const file of [].concat(pack.imageMap)) {   // a string or a list: the first file that exists is used
    try {
      const r = await get(file); if (!r.ok) throw r.err;
      const m = r.m.default || {};
      for (const a of list) if (!a.image && m[a.id] && typeof m[a.id].url === "string") a.image = m[a.id].url;
      break;
    } catch (err) { /* this file does not exist: try the next one, or attach nothing */ }
  }
  return list;
}
export async function loadPackData(id) {
  const pack = await getPack(id);
  if (!cache.has(pack.id)) cache.set(pack.id, (async () => {
    const get = warm(pack);
    const list = await attachImages(pack, await attachSilhouettes(pack, await attachTraits(pack, await loadList(pack, get), get), get), get);
    return { pack, list, map: new Map(list.map((a) => [a.id, a])) };
  })());
  return cache.get(pack.id);
}

// (No top-level await any more: it blocked every importer of this module until the default pack had fully loaded.)
