// =====================================================================
// modes.js — game-mode runtime. The registry itself is modes/index.js (one line per mode). See docs/MODE_FORMAT.md.
// =====================================================================
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
// Unknown id falls back to the first mode (classic).
export async function getMode(id) { const all = await listModes(); return all.find((m) => m.id === id) || all[0]; }

// The phase that follows `phase` in the mode's pipeline (null at the end).
export const nextPhase = (mode, phase) => { const i = mode.phases.indexOf(phase); return i >= 0 && i + 1 < mode.phases.length ? mode.phases[i + 1] : null; };
