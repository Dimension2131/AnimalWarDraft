import createScreens from "./screens.js";
import { createHost } from "./host.js";

export default {
  id: "pokemon_war",
  title: "War Draft",
  titleFor: (pack) => (pack.engine === "pokemon" ? "Pokémon War Draft" : null),
  description: "Bid on Pokémon in a live auction, set your lineup and moves, then play a tournament of real turn-based battles. Auto: the AI plays every battle for you. Manual: you pick the moves.",
  supports: (pack) => pack.engine === "pokemon",
  phases: ["lobby", "draft", "lineup", "battle", "results"],
  lineupMs: 150000,
  defaultSettings: { battleMode: "auto", turnSeconds: 45 },
  createOptions: [{ id: "battleMode", label: "Battles", default: "auto", options: [{ v: "auto", l: "Auto: simulated with the real moves" }, { v: "manual", l: "Manual: players pick moves each turn" }] }],

  settingsPanel({ h, edit }) {
    const selStyle = h("select", { onchange: (e) => edit((s) => { s.battleMode = e.target.value; }) }, h("option", { value: "auto" }, "Auto: simulated, you only watch"), h("option", { value: "manual" }, "Manual: players pick moves each turn"));
    const inSec = h("input", { type: "number", min: 10, max: 180, onchange: (e) => edit((s) => { s.turnSeconds = Math.max(10, Math.min(180, Math.floor(+e.target.value) || 45)); }) });
    const note = h("p", { class: "muted small" });
    return {
      nodes: [h("h4", {}, "Pokémon battles"), h("div", { class: "grid2" }, h("label", {}, "Battle style", selStyle), h("label", {}, "Seconds per turn (manual)", inSec)), note],
      refresh(L, host) {
        selStyle.value = L.battleMode === "manual" ? "manual" : "auto"; selStyle.disabled = !host;
        if (document.activeElement !== inSec) inSec.value = L.turnSeconds ?? 45; inSec.disabled = !host;
        note.textContent = "Level 50, singles, switching allowed, team size = roster size. In manual battles a player who runs out of time or goes offline is played by the AI. Both styles use the same engine and the same moves; you can edit each Pokémon's four moves and ability in the lineup step.";
      }
    };
  },
  screens: createScreens,
  createHost
};
