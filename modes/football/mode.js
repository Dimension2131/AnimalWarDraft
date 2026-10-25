import createScreens from "./screens.js";
import { createHost } from "./host.js";
import { XI, BENCH_MAX } from "./engine.js";
import { SPEEDS, SPEED_IDS, speedOfSettings } from "./choreo.js";

export default {
  id: "football_war",
  title: "War Draft",
  titleFor: (pack) => (pack.engine === "football" ? "Football War Draft" : null),
  description: "Bid on players in a live auction, pick a formation and your starting XI (drag players between the pitch and the bench), then play a knockout bracket (matches of a round run at the same time). Every match is simulated and watched live in a cinematic viewer, at a speed the host picks.",
  supports: (pack) => pack.engine === "football",
  phases: ["lobby", "draft", "lineup", "match", "results"],
  lineupMs: 120000,
  rosterRange: { min: XI, max: XI + BENCH_MAX },   // the lobby's squad-size box: 11 starters + 0 to 7 on the bench
  defaultSettings: { rosterSize: XI + 3, discipline: false },   // no matchSpeed default on purpose: the shared code merges defaults UNDER stored settings, which would hide an old room's matchStyle. choreo.speedOfSettings() falls back to Full.

  settingsPanel({ h, edit }) {
    const inBench = h("input", { type: "number", min: 0, max: BENCH_MAX, onchange: (e) => edit((s) => { s.rosterSize = XI + Math.max(0, Math.min(BENCH_MAX, Math.floor(+e.target.value) || 0)); }) });
    const selStyle = h("select", { "aria-label": "Match speed", onchange: (e) => edit((s) => { s.matchSpeed = e.target.value; delete s.matchStyle; }) }, SPEED_IDS.map((id) => h("option", { value: id }, `${SPEEDS[id].label}: ${SPEEDS[id].note}`)));
    const cards = h("input", { type: "checkbox", "aria-label": "Cards and injuries", onchange: (e) => edit((s) => { s.discipline = !!e.target.checked; }) });
    const note = h("p", { class: "muted small" });
    return {
      nodes: [h("h4", {}, "Football matches"), h("div", { class: "grid2" }, h("label", {}, "Bench players (0-7)", inBench), h("label", {}, "Match speed", selStyle)), h("label", { class: "row" }, cards, " Cards and injuries (changes the results; a red card or an injury without a sub leaves a team a man down)"), note],
      refresh(L, host) {
        if (host && !(L.rosterSize >= XI)) edit((s) => { s.rosterSize = XI + 3; });   // a room that came from another mode still has a 5-player roster: the XI needs 11
        const bench = Math.max(0, Math.min(BENCH_MAX, (L.rosterSize || XI) - XI));
        if (typeof document === "undefined" || document.activeElement !== inBench) inBench.value = bench; inBench.disabled = !host;
        selStyle.value = speedOfSettings(L); selStyle.disabled = !host; cards.checked = !!L.discipline; cards.disabled = !host;   // old rooms: matchStyle watch = Full, quick = Instant
        note.textContent = `Each manager drafts ${XI + bench} players: a starting XI of 11 and ${bench} on the bench. Formations: 4-3-3, 4-4-2, 3-5-2. Every match is one seeded simulation, so Instant, Fast and Full always show the same score and scorers. Knockout: a draw goes to a penalty shoot-out; 2 managers play one final, 3 play A v B then the loser plays C then the final, 4+ play a bracket with a third-place match. Players out of position play worse; bench players come on when starters tire (up to 3 subs). Small chemistry bonus for team-mates from the same nation or club.`;
      }
    };
  },

  screens: createScreens,
  createHost
};
