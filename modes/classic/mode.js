// =====================================================================
// modes/classic/mode.js — the "classic" game mode: live auction draft, lineup, tournament of deterministic seeded fights
// (with appeals and the Worker judge), results. This is today's whole game. See docs/MODE_FORMAT.md.
// =====================================================================
import createScreens from "./screens.js";
import { createHost } from "./host.js";

export default {
  id: "classic",
  title: "Classic",
  description: "Bid on entities in a live auction, set your lineup, then play a tournament of fights. Losers may appeal for a rematch.",

  // Ordered phase names. lobby, draft, lineup are shared phases (js/app.js + js/host.js); tournament and results are this mode's.
  phases: ["lobby", "draft", "lineup", "tournament", "results"],

  // Settings this mode adds on top of the shared ones (startBalance, rosterSize, auctionSeconds, filters). Stored in meta/settings.
  defaultSettings: { spectatorVoting: true, judgeMode: "auto" },

  // Lobby settings panel. api = { h, edit(fn), isHost() }. Returns { nodes: [DOM nodes appended to the Settings card], refresh(L, host) }.
  settingsPanel({ h, edit }) {
    const cbVote = h("input", { type: "checkbox", onchange: (e) => edit((s) => { s.spectatorVoting = e.target.checked; }) });
    const selJudge = h("select", { onchange: (e) => edit((s) => { s.judgeMode = e.target.value; }) }, ["auto", "vote", "ai"].map((x) => h("option", { value: x }, x)));
    return {
      nodes: [
        h("label", { class: "row" }, cbVote, " Spectators can vote on appeals"),
        h("label", {}, "Appeal judge", selJudge),
        h("p", { class: "muted small" }, "auto: others vote when at least 2 can, otherwise the AI judge explains and the winner decides. vote: others vote. ai: the AI judge explains and the winner decides. In every mode a rematch is forced if the judge finds an objective problem with the result. Appeals only ever lead to a rematch.")
      ],
      refresh(L, host) { cbVote.checked = !!L.spectatorVoting; cbVote.disabled = !host; selJudge.value = L.judgeMode; selJudge.disabled = !host; }
    };
  },

  screens: createScreens,   // (ctx) => ({ tournament: () => screen, results: () => screen })
  createHost                // (hostCtx) => ({ step(phase), begin(phase, {keys, lineups}), api })
};
