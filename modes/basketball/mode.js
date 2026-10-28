import createScreens from "./screens.js";
import { createHost } from "./host.js";
import { STARTERS, BENCH_MAX, POS_MODES, POS_LABEL, DEFAULT_POS_MODE, normPosMode } from "./engine.js";
import { SPEEDS, SPEED_IDS, speedOfSettings } from "./replay.js";

export default {
  id: "basketball_war",
  title: "War Draft",
  titleFor: (pack) => (pack.engine === "basketball" ? "Basketball War Draft" : null),
  description: "Bid on players in a live auction, set your starting five and your bench rotation (drag players around the court), then play a knockout bracket: one game per round, games of a round run at the same time. Every game is a possession-by-possession simulation with fouls, fatigue, substitutions, timeouts and overtime, replayed at a speed the host picks.",
  supports: (pack) => pack.engine === "basketball",
  phases: ["lobby", "draft", "lineup", "match", "results"],
  lineupMs: 120000,
  rosterRange: { min: STARTERS, max: STARTERS + BENCH_MAX },   // the lobby's roster-size box: 5 starters + 0 to 10 on the bench
  defaultSettings: { rosterSize: STARTERS + 3, posMode: DEFAULT_POS_MODE, injuries: false },   // no matchSpeed default on purpose: replay.speedOfSettings() falls back to Quick

  settingsPanel({ h, edit }) {
    const inBench = h("input", { type: "number", min: 0, max: BENCH_MAX, onchange: (e) => edit((s) => { s.rosterSize = STARTERS + Math.max(0, Math.min(BENCH_MAX, Math.floor(+e.target.value) || 0)); }) });
    const selPos = h("select", { "aria-label": "Positions", onchange: (e) => edit((s) => { s.posMode = normPosMode(e.target.value); }) }, POS_MODES.map((id) => h("option", { value: id }, POS_LABEL[id])));
    const selSpeed = h("select", { "aria-label": "Game speed", onchange: (e) => edit((s) => { s.matchSpeed = e.target.value; delete s.matchStyle; }) }, SPEED_IDS.map((id) => h("option", { value: id }, `${SPEEDS[id].label}: ${SPEEDS[id].note}`)));
    const inj = h("input", { type: "checkbox", "aria-label": "Injuries", onchange: (e) => edit((s) => { s.injuries = !!e.target.checked; }) });
    const note = h("p", { class: "muted small" });
    return {
      nodes: [h("h4", {}, "Basketball games"), h("div", { class: "grid2" }, h("label", {}, "Bench players (0-10)", inBench), h("label", {}, "Positions", selPos), h("label", {}, "Game speed", selSpeed)), h("label", { class: "row" }, inj, " Injuries (a hurt player is out for the rest of the game; with no bench the team plays short-handed)"), note],
      refresh(L, host) {
        if (host && !(L.rosterSize >= STARTERS)) edit((s) => { s.rosterSize = STARTERS + 3; });   // a room that came from another mode still has a smaller roster: the starting five needs 5
        const bench = Math.max(0, Math.min(BENCH_MAX, (L.rosterSize || STARTERS) - STARTERS));
        if (typeof document === "undefined" || document.activeElement !== inBench) inBench.value = bench; inBench.disabled = !host;
        selPos.value = normPosMode(L.posMode); selPos.disabled = !host; selSpeed.value = speedOfSettings(L); selSpeed.disabled = !host; inj.checked = !!L.injuries; inj.disabled = !host;
        const pm = normPosMode(L.posMode);
        note.textContent = `Each coach drafts ${STARTERS + bench} players: a starting five and ${bench} on the bench. ${pm === "strict" ? "Five strict positions (PG, SG, SF, PF, C): a player out of position loses up to 30% of his ratings." : pm === "groups" ? "Guard, Guard, Wing, Wing, Big: a player one group away loses a little, a guard at big loses a lot." : "Positionless: no position penalty, so the stats and the balance of the five decide."} Every game is one seeded simulation, so Instant, Quick and Full replays always show the same score and the same box score. Knockout: a tie goes to overtime; 2 coaches play one final, 3 play A v B, then the loser plays C, then the final; 4 or more play a bracket with byes and a third-place game. The pool needs enough players for every roster (the lobby shows the count).`;
      }
    };
  },

  screens: createScreens,
  createHost
};
