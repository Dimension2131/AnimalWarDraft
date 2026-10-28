import createScreens from "./screens.js";
import { createHost } from "./host.js";
import { DEFAULTS, DIFFICULTIES } from "./logic.js";

export default {
  id: "quiz",
  title: "Silhouette Quiz",
  description: "Name the kind from its black silhouette (bonus: the exact species), then guess its real numbers. The closest guesses win. No draft, no fights.",
  supports: (pack) => !!pack.quiz,
  titleFor: (pack) => (pack.quiz && pack.quiz.modeTitle) || null,
  descriptionFor: (pack) => (pack.quiz && pack.quiz.modeDescription) || null,   // falls back to the description above (written for animals)
  phases: ["lobby", "quiz", "results"],
  noDraft: true,
  defaultSettings: { ...DEFAULTS },

  settingsPanel({ h, edit, pack }) {
    const N1 = (pack && pack.nouns && pack.nouns.plural) || "items", N0 = (pack && pack.nouns && pack.nouns.singular) || "item", Cn = N1.charAt(0).toUpperCase() + N1.slice(1);
    const QN = (pack && pack.quiz) || {}, KN = QN.kindName || "Kind", SP = QN.speciesName || "Exact answer", sp = SP.toLowerCase();   // each world words the two questions its own way (nation / player, type / Pokémon, kind / species)
    const num = (key, min, max) => h("input", { type: "number", min, max, onchange: (e) => edit((s) => { s[key] = Math.max(min, Math.min(max, Math.floor(+e.target.value) || min)); }) });
    const inAnimals = num("quizAnimals", 1, 30), inSecs = num("quizSeconds", 5, 120), inNum = num("quizNumeric", 0, 6), inPen = num("quizPenalty", 0, 400);
    const cbSpecies = h("input", { type: "checkbox", onchange: (e) => edit((s) => { s.quizSpecies = e.target.checked; }) });
    const cbLow = h("input", { type: "checkbox", onchange: (e) => edit((s) => { s.quizLowConf = e.target.checked; }) });
    const selReveal = h("select", { onchange: (e) => edit((s) => { s.quizReveal = e.target.value; }) },
      h("option", { value: "question" }, "After each question"), h("option", { value: "each" }, `After each ${N0}`), h("option", { value: "end" }, "Only at the end"));
    const selLevel = h("select", { onchange: (e) => edit((s) => { s.quizDifficulty = e.target.value; }) },
      h("option", { value: "easy" }, "Easy: wrong options clearly different"), h("option", { value: "medium" }, "Medium: a mix of look-alikes and others"),
      h("option", { value: "hard" }, "Hard: mostly look-alikes"), h("option", { value: "expert" }, "Expert: 5 options, all look-alikes"), h("option", { value: "escalating" }, "Escalating: easy at first, expert at the end"));
    const inputs = [[inAnimals, "quizAnimals"], [inSecs, "quizSeconds"], [inNum, "quizNumeric"], [inPen, "quizPenalty"]];
    return {
      nodes: [
        h("h4", {}, "Silhouette Quiz"),
        h("div", { class: "grid2" }, h("label", {}, `${Cn} per game (1-30)`, inAnimals), h("label", {}, "Seconds per question (5-120)", inSecs), h("label", {}, `Numeric questions per ${N0} (0-6)`, inNum), h("label", {}, "Results reveal", selReveal)),
        h("label", {}, "Difficulty", selLevel),
        h("label", { class: "row" }, cbSpecies, ` ${SP} bonus question (optional for players)`),
        h("label", {}, `Wrong ${sp} answer costs (points)`, inPen),
        h("label", { class: "row" }, cbLow, " Also use low-confidence facts"),
        h("p", { class: "muted small" }, `${KN}: 200 points. ${SP}: 400 if right, minus the penalty if wrong, 0 if skipped (both are multiplied by the level: Easy x1, Medium x1.5, Hard x2, Expert x3). Numeric: 1000 inside the published range, then falling to 0 at a factor of 2 off; further off, you lose points, up to the penalty at a factor of 5 or more. Some ${N1} have fewer numeric facts than requested; they just get fewer questions. ${Cn} without a silhouette are never drawn. Players who do not answer score 0.`)
      ],
      refresh(L, host) {
        for (const [el, k] of inputs) { if (typeof document === "undefined" || document.activeElement !== el) el.value = L[k] ?? DEFAULTS[k]; el.disabled = !host; }
        cbSpecies.checked = L.quizSpecies !== false; cbSpecies.disabled = !host;
        cbLow.checked = !!L.quizLowConf; cbLow.disabled = !host;
        selReveal.value = L.quizReveal === "end" ? "end" : L.quizReveal === "each" ? "each" : "question"; selReveal.disabled = !host;
        selLevel.value = DIFFICULTIES.includes(L.quizDifficulty) ? L.quizDifficulty : DEFAULTS.quizDifficulty; selLevel.disabled = !host;
      }
    };
  },

  screens: createScreens,
  createHost
};
