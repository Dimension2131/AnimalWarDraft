// =====================================================================
// fingerprint.js — fingerprint of one pack's entity data + the engine. The game (classic mode host) and the Cloudflare Worker
// both call this SAME function (tools/build-worker.mjs inlines this file into the Worker), so they cannot drift apart.
// A mismatch means the Worker is out of date, so it refuses to judge instead of wrongly calling every fight "tampered".
// Pure: no imports (the build tool strips them), the caller passes simulate in.
// =====================================================================
export const digestOf = (res) => `${res.winner}:${res.events.length}:${res.events[res.events.length - 1].id}:${res.survivors.A}-${res.survivors.B}`;

// entityMap: Map(id -> entity). arenaIds: the pack's arena ids in manifest order. fpIds: pack.fingerprintIds (may be empty).
export function fingerprint(entityMap, arenaIds, fpIds, simulate) {
  const all = [...entityMap.values()].sort((a, b) => (a.id < b.id ? -1 : 1))
    .map((a) => [a.id, a.speed, a.offense, a.defense, a.stamina, a.instinct, a.size, a.mass_kg, (a.tags || []).join(","), a.traits ? a.traits.up + ">" + a.traits.down : "", arenaIds.map((r) => (a.arena_bonus || {})[r]).join(",")].join("|")).join(";");
  let h = 2166136261; for (let i = 0; i < all.length; i++) { h ^= all.charCodeAt(i); h = Math.imul(h, 16777619); }
  const pick = (fpIds || []).map((id) => entityMap.get(id)); let samples = "";
  if (pick.length >= 10 && pick.every(Boolean)) ["forest", "water"].forEach((ar, i) => { samples += digestOf(simulate(pick.slice(0, 5), pick.slice(5), arenaIds.includes(ar) ? ar : arenaIds[0], 1000 + i)) + ","; });
  return `${entityMap.size}:${(h >>> 0).toString(16)}:${samples}`;
}