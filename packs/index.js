// =====================================================================
// packs/index.js — the category-pack registry.
// To add a category: create packs/<id>/pack.js (see docs/PACK_FORMAT.md) and add ONE line below.
// Each entry is a loader, so a pack's manifest is only fetched when the lobby needs it.
// The first entry is the default pack (used by old rooms that have no `meta.pack`).
// =====================================================================
export default [
  () => import("./animals/pack.js"),
];
