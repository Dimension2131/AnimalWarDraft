// =====================================================================
// modes/index.js — the game-mode registry. To add a mode: create modes/<id>/mode.js (see docs/MODE_FORMAT.md)
// and add ONE line below. The first entry is the default mode (rooms without `meta.mode` use it).
// =====================================================================
export default [
  () => import("./classic/mode.js"),
  () => import("./quiz/mode.js"),
];