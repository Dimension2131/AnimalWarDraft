import { mulberry32 } from "./sim.js";

export const arr = (v) => (Array.isArray(v) ? v : v ? Object.values(v) : []);
export const hash = (s, seed) => { let h = (seed >>> 0) ^ 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
export function shuffleSeeded(list, seed) {
  const r = mulberry32(seed >>> 0), a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Public lobby index check (pure; used by js/net.js and the test fake). `meta` = the REAL room's meta, `entry` = its publicRooms signpost.
// "show" = open public lobby with a fresh heartbeat; "stale" = open but heartbeat too old (hide, keep); "dead" = not an open public lobby (hide AND delete the signpost).
export function publicRoomState(meta, entry, nowMs, ttlMs) {
  if (!meta || meta.visibility !== "public" || meta.phase !== "lobby" || meta.started) return "dead";
  if (!entry || typeof entry !== "object" || typeof entry.t !== "number" || nowMs - entry.t >= ttlMs) return "stale";
  return "show";
}
