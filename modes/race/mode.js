import createScreens, { lineupHooks } from "./screens.js";
import { createHost } from "./host.js";
import { terrainsOf } from "./race.js";

export default {
  id: "race",
  title: "Relay Race",
  description: "Draft animals, then race them in a relay. Each lineup slot runs one leg (sprint, distance, swim, climb, rough terrain); lowest total team time wins. No appeals.",
  supports: (pack) => !pack.engine && !!pack.race,
  phases: ["lobby", "draft", "lineup", "race", "results"],
  defaultSettings: { raceLegs: 4, raceDifficulty: "mixed" },

  settingsPanel({ h, edit, pack }) {
    const race = pack && pack.race;
    const inLegs = h("input", { type: "number", min: 2, max: 8, onchange: (e) => edit((s) => { s.raceLegs = Math.max(2, Math.min(8, Math.floor(+e.target.value) || 4)); }) });
    const ids = race ? Object.keys(race.difficulties) : ["easy", "mixed", "brutal"];
    const selDiff = h("select", { onchange: (e) => edit((s) => { s.raceDifficulty = e.target.value; }) }, ids.map((x) => h("option", { value: x }, race ? race.difficulties[x].label : x)));
    const note = h("p", { class: "muted small" });
    const types = race ? race.legTypes : [], chips = {};
    const onSet = (L) => { const t = terrainsOf(L); return new Set(t || types.map((x) => x.id)); };
    const terrRow = h("div", { class: "row wrap" }, types.map((t) => (chips[t.id] = h("button", { type: "button", class: "chip", "aria-pressed": "true", title: t.blurb || t.label,
      onclick: () => edit((s) => { const on = onSet(s); if (on.has(t.id)) { if (on.size > 1) on.delete(t.id); } else on.add(t.id); s.raceTerrains = types.map((x) => x.id).filter((id) => on.has(id)); }) }, `${t.icon} ${t.label}`))));
    return {
      nodes: [h("div", { class: "grid2" }, h("label", {}, "Relay legs (2-8, at most the roster size)", inLegs), h("label", {}, "Course difficulty", selDiff)), h("label", {}, "Terrains on the course (tap to turn off)"), terrRow, note],
      refresh(L, host) {
        if (document.activeElement !== inLegs) inLegs.value = L.raceLegs; inLegs.disabled = !host;
        selDiff.value = race && race.difficulties[L.raceDifficulty] ? L.raceDifficulty : (race ? race.defaultDifficulty : "mixed"); selDiff.disabled = !host;
        const on = onSet(L); for (const t of types) { chips[t.id].classList.toggle("on", on.has(t.id)); chips[t.id].setAttribute("aria-pressed", String(on.has(t.id))); chips[t.id].disabled = !host; }
        note.textContent = race ? `${Math.min(L.raceLegs, L.rosterSize)} legs will run (roster size ${L.rosterSize}). Easy: mostly running legs, shorter. Mixed: every leg type equally likely. Brutal: more swim/climb/terrain, longer, more mishaps.`
          : "This category does not support the Relay Race mode (its pack has no race section).";
      }
    };
  },

  lineup: lineupHooks,
  screens: createScreens,
  createHost
};