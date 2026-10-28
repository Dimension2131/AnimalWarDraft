import LOADERS from "../modes/index.js";

let list = null;
let listP = null;   // one shared promise: concurrent callers must all wait for the same complete list
export function listModes() {
  if (!listP) listP = Promise.all(LOADERS.map((load) => load().then((x) => x.default, (err) => { console.warn("[modes] could not load a mode:", err); return null; }))).then((all) => {
    list = [];
    for (const m of all) { if (!m) continue; if (typeof m.id === "string" && !list.some((x) => x.id === m.id)) list.push(m); else console.warn("[modes] bad or duplicate mode skipped"); }
    return list;
  });
  return listP;
}
export async function getMode(id) { const all = await listModes(); return all.find((m) => m.id === id) || all[0]; }

export const nextPhase = (mode, phase) => { const i = mode.phases.indexOf(phase); return i >= 0 && i + 1 < mode.phases.length ? mode.phases[i + 1] : null; };

// A mode may declare which packs it works with: supports(pack) -> boolean (default: every pack). titleFor(pack) lets a pack rename the mode (Pokémon: "Who's That Pokémon?").
export const supports = (mode, pack) => (typeof mode.supports === "function" ? !!mode.supports(pack) : true);
export const modesFor = (modes, pack) => modes.filter((m) => supports(m, pack));
export const titleOf = (mode, pack) => (typeof mode.titleFor === "function" && pack && mode.titleFor(pack)) || mode.title;

// A mode's lobby blurb. descriptionFor(pack) lets a mode word it with the pack's own nouns; otherwise the static description is used.
export const descOf = (mode, pack) => (typeof mode.descriptionFor === "function" && pack && mode.descriptionFor(pack)) || mode.description || "";
