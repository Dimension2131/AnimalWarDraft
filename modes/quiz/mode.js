import createScreens from "./screens.js";
import { createHost } from "./host.js";
import { DEFAULTS } from "./logic.js";

export default {
  id: "quiz",
  title: "Silhouette Quiz",
  description: "Name the kind of animal from its black silhouette (bonus: the exact species), then guess its real-world numbers: speed, size, lifespan. The closest guesses win. No draft, no fights.",
  phases: ["lobby", "quiz", "results"],
  noDraft: true,
  defaultSettings: { ...DEFAULTS },

  settingsPanel({ h, edit }) {
    const num = (key, min, max) => h("input", { type: "number", min, max, onchange: (e) => edit((s) => { s[key] = Math.max(min, Math.min(max, Math.floor(+e.target.value) || min)); }) });
    const inAnimals = num("quizAnimals", 1, 30), inSecs = num("quizSeconds", 5, 120), inNum = num("quizNumeric", 0, 6), inPen = num("quizPenalty", 0, 400);
    const cbSpecies = h("input", { type: "checkbox", onchange: (e) => edit((s) => { s.quizSpecies = e.target.checked; }) });
    const cbLow = h("input", { type: "checkbox", onchange: (e) => edit((s) => { s.quizLowConf = e.target.checked; }) });
    const selReveal = h("select", { onchange: (e) => edit((s) => { s.quizReveal = e.target.value; }) },
      h("option", { value: "each" }, "After each animal"), h("option", { value: "end" }, "Only at the end"));
    const inputs = [[inAnimals, "quizAnimals"], [inSecs, "quizSeconds"], [inNum, "quizNumeric"], [inPen, "quizPenalty"]];
    return {
      nodes: [
        h("h4", {}, "Silhouette Quiz"),
        h("div", { class: "grid2" }, h("label", {}, "Animals per game (1-30)", inAnimals), h("label", {}, "Seconds per question (5-120)", inSecs), h("label", {}, "Numeric questions per animal (0-6)", inNum), h("label", {}, "Results reveal", selReveal)),
        h("label", { class: "row" }, cbSpecies, " Species bonus question (optional for players)"),
        h("label", {}, "Wrong species answer costs (points)", inPen),
        h("label", { class: "row" }, cbLow, " Also use low-confidence facts"),
        h("p", { class: "muted small" }, "Kind: 200 points. Species: 400 if right, minus the penalty if wrong, 0 if skipped. Numeric: 1000 inside the published range, then falling to 0 at a factor of 10 off. Some animals have fewer numeric facts than requested; they just get fewer questions. Animals without a silhouette are never drawn. Players who do not answer score 0.")
      ],
      refresh(L, host) {
        for (const [el, k] of inputs) { if (typeof document === "undefined" || document.activeElement !== el) el.value = L[k] ?? DEFAULTS[k]; el.disabled = !host; }
        cbSpecies.checked = L.quizSpecies !== false; cbSpecies.disabled = !host;
        cbLow.checked = !!L.quizLowConf; cbLow.disabled = !host;
        selReveal.value = L.quizReveal === "end" ? "end" : "each"; selReveal.disabled = !host;
      }
    };
  },

  screens: createScreens,
  createHost
};