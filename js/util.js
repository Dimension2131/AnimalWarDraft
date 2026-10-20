// =====================================================================
// util.js — tiny pure helpers shared by host.js and the mode host modules. No imports besides sim.js's RNG.
// =====================================================================
import { mulberry32 } from "./sim.js";

export const arr = (v) => (Array.isArray(v) ? v : v ? Object.values(v) : []);
export const hash = (s, seed) => { let h = (seed >>> 0) ^ 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
export function shuffleSeeded(list, seed) {
  const r = mulberry32(seed >>> 0), a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
