import LOADERS from "../modes/index.js";

let list = null;
export async function listModes() {
  if (!list) {
    list = [];
    for (const load of LOADERS) {
      try { const m = (await load()).default; if (m && typeof m.id === "string" && !list.some((x) => x.id === m.id)) list.push(m); else console.warn("[modes] bad or duplicate mode skipped"); }
      catch (err) { console.warn("[modes] could not load a mode:", err); }
    }
  }
  return list;
}
export async function getMode(id) { const all = await listModes(); return all.find((m) => m.id === id) || all[0]; }

export const nextPhase = (mode, phase) => { const i = mode.phases.indexOf(phase); return i >= 0 && i + 1 < mode.phases.length ? mode.phases[i + 1] : null; };

// A mode may declare which packs it works with: supports(pack) -> boolean (default: every pack). titleFor(pack) lets a pack rename the mode (Pokémon: "Who's That Pokémon?").
export const supports = (mode, pack) => (typeof mode.supports === "function" ? !!mode.supports(pack) : true);
export const modesFor = (modes, pack) => modes.filter((m) => supports(m, pack));
export const titleOf = (mode, pack) => (typeof mode.titleFor === "function" && pack && mode.titleFor(pack)) || mode.title;
