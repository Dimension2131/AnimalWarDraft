import createScreens from "./screens.js";
import { createHost } from "./host.js";
import { tip } from "../../js/tips.js";

const FLEE_TIP = "Animal Fleeing. OFF (default): animals never run away. Every fight is to the end: it only stops when one whole team is knocked down. ON: animals can lose their nerve and flee mid-fight. After a team loses 2 animals, the rest may bolt (low-instinct animals are most likely to), and the Skittish and Faint-hearted weaknesses can trigger too. Tenacious animals never flee. A fled animal leaves the fight and counts as out.";

export default {
  id: "classic",
  title: "Classic",
  description: "Bid on entities in a live auction, set your lineup, then play a tournament of fights. Losers may appeal for a rematch.",
  supports: (pack) => !pack.engine,
  phases: ["lobby", "draft", "lineup", "tournament", "results"],
  defaultSettings: { spectatorVoting: true, judgeMode: "auto", animalFleeing: false },
  settingsPanel({ h, edit }) {
    const cbVote = h("input", { type: "checkbox", onchange: (e) => edit((s) => { s.spectatorVoting = e.target.checked; }) });
    const cbFlee = h("input", { type: "checkbox", onchange: (e) => edit((s) => { s.animalFleeing = e.target.checked; }) });
    const selJudge = h("select", { onchange: (e) => edit((s) => { s.judgeMode = e.target.value; }) }, ["auto", "vote", "ai"].map((x) => h("option", { value: x }, x)));
    return {
      nodes: [
        h("label", { class: "row" }, cbVote, " Spectators can vote on appeals"),
        h("div", { class: "row" }, h("label", { class: "row" }, cbFlee, " Animal Fleeing"), tip(h("span", { class: "pill", "aria-label": "Animal Fleeing: explanation" }, "?"), FLEE_TIP)),
        h("label", {}, "Appeal judge", selJudge),
        h("p", { class: "muted small" }, "auto: others vote when at least 2 can, otherwise the AI judge explains and the winner decides. vote: others vote. ai: the AI judge explains and the winner decides. In every mode a rematch is forced if the judge finds an objective problem with the result. Appeals only ever lead to a rematch.")
      ],
      refresh(L, host) { cbFlee.checked = L.animalFleeing === true; cbFlee.disabled = !host; cbVote.checked = !!L.spectatorVoting; cbVote.disabled = !host; selJudge.value = L.judgeMode; selJudge.disabled = !host; }
    };
  },

  screens: createScreens,
  createHost
};
