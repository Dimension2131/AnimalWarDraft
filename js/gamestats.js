// js/gamestats.js: called by a mode's host when a game finishes. Builds the leaderboard records (js/stats.js) for every human and writes them.
// pairs: one entry per finished match between two managers: { w, l, d (a draw), margin, score }. Modes without matches (the race) pass none.
import * as N from "./net.js";
import * as ST from "./stats.js";
import { arr } from "./util.js";

export function worldOf(pack) { const id = (pack && (pack.world || pack.id)) || "animals"; return ST.WORLD_IDS.includes(id) ? id : "animals"; }

export async function recordGame({ S, settings, pack, map, nm, keys, order, champion, pairs }) {
  let recs = {};
  try {
    const meta = S.meta || {}, G = S.game || {};
    recs = ST.buildRecords({ world: worldOf(pack), keys: arr(keys), players: S.players || {}, ledger: S.ledger || {}, game: G,
      settings: settings ? settings() : meta.settings || {}, order: arr(order), champion: arr(champion), pairs: arr(pairs), map, now: N.now() });
  } catch (e) { console.warn("stats: could not build the records", e); return; }
  for (const [k, r] of Object.entries(recs)) { try { await N.recordGame(k, nm(k), r); } catch (e) { console.warn("stats", e); } }
}
