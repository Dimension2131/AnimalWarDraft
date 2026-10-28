// Basketball: 170 well-known players and legends, ratings are the author's peak-form estimates (no cap on the sub-rating total). 7 main ratings summarise 23 sub ratings. Data: basketball/players.js, built by tools/build-basketball-data.mjs.
// Playable with the Basketball War Draft mode (modes/basketball) and the Silhouette Quiz.
const POSITIONS = ["PG", "SG", "SF", "PF", "C"];
const DECADES = ["1950s", "1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"];
const TIERS = ["Legend", "Superstar", "Star", "Pro"];
import { MAINS, SUBS, SUB_KEYS, MAIN_KEYS } from "../../basketball/ratings.js";
const KEYS = SUB_KEYS;   // every SUB rating must exist on every player, 1-99; the MAIN ratings are computed from them (basketball/ratings.js)

// The 7 MAIN ratings are what the draft card, the strips and the filters show; the SUB ratings (what the simulation reads) are under "More details".
const STATS = MAINS.map((m) => ({ key: m.key, label: m.label, abbr: m.abbr, description: m.description }));
const SUB_STATS = SUBS.map((x) => ({ ...x }));

export default {
  id: "basketball",
  name: "Basketball",
  title: "Basketball War Draft",
  tagline: "Bid on players, set your five, win the bracket.",
  icon: "🏀",
  blurb: "170 stars and legends. Draft a roster, pick your starting five and play a knockout bracket.",
  nouns: { singular: "player", plural: "players" },
  engine: "basketball",       // the Basketball War Draft mode reads this
  noArenas: true,
  workerExclude: true,        // nothing for the Worker to judge here
  statMax: 100,

  // Photos: basketball/img/<id>.png (a missing one falls back to the emoji). Silhouettes for the quiz: basketball/silhouettes/<id>.png (listed in basketball/silhouettes.js).
  imageUrl: (a) => "basketball/img/" + a.id + ".png",
  iconUrl: (a) => "basketball/img/" + a.id + ".png",
  silhouetteMap: "basketball/silhouettes.js",
  heroIds: ["michael_jordan", "lebron_james", "kobe_bryant", "magic_johnson", "stephen_curry", "shaquille_o_neal", "larry_bird", "kareem_abdul_jabbar"],

  stats: STATS,          // the 7 main ratings
  subStats: SUB_STATS,   // the sub ratings, grouped by their "main" (shown under "More details")
  statsFor: () => STATS,
  arenas: [],

  filters: [
    { id: "positions", type: "chips", label: "Position", field: "pos", options: POSITIONS },
    { id: "decades", type: "chips", label: "Peak decade", field: "decade", options: DECADES },
    { id: "tiers", type: "chips", label: "Tier", field: "tier", options: TIERS },
    { id: "ovr", type: "range", label: "Overall", field: "ovr", scale: "linear", min: 75, max: 99, ticks: [80, 85, 90, 95], format: (v) => String(Math.round(v)), formatTick: (v) => String(v) },
    { id: "excluded", type: "exclude" }
  ],

  entityFiles: ["basketball/players.js"],

  rosterTag: (p) => p.pos,   // the draft screen's roster list shows each player's position code

  // One line under the draft header: a balanced five has a ball handler, shooters, a rim protector and a rebounder; the position mode is set in the lobby.
  draftTip(roster, size) {
    const n = (pos) => roster.filter((p) => p.pos === pos).length, mix = POSITIONS.map((c) => `${n(c)} ${c}`).join(" · ");
    const big = roster.filter((p) => (p.int || 0) >= 80 || (p.blk || 0) >= 80).length, hand = roster.filter((p) => (p.han || 0) >= 85).length, shoot = roster.filter((p) => (p.thr || 0) >= 82).length;
    const need = []; if (roster.length >= 3) { if (!big) need.push("a rim protector"); if (!hand) need.push("a ball handler"); if (!shoot) need.push("a shooter"); }
    return `Your roster: ${mix}. Starting five first, then the bench: bench players come on when starters tire or get into foul trouble.${need.length ? " Still missing: " + need.join(", ") + "." : ""}${size < 8 ? " With a small bench your starters play most of the game and tire." : ""}`;
  },

  cardChips: (p) => [p.pos + (p.positions && p.positions.length > 1 ? " / " + p.positions.slice(1).join(" / ") : ""), p.team, p.era, p.height_cm + " cm", "OVR " + p.ovr],

  validate(p) {
    const out = [];
    if (!POSITIONS.includes(p.pos)) out.push(`pos invalid (${p.pos})`);
    if (!Number.isInteger(p.ovr) || p.ovr < 1 || p.ovr > 99) out.push("ovr must be 1-99");
    for (const k of KEYS.concat(MAIN_KEYS)) if (!Number.isInteger(p[k]) || p[k] < 1 || p[k] > 99) out.push(k + " must be 1-99");   // no cap on the TOTAL: legends may be stacked
    if (!p.team) out.push("team missing");
    if (!Array.isArray(p.positions) || !p.positions.length) out.push("positions missing");
    if (!(p.height_cm > 150 && p.height_cm < 240)) out.push("height_cm invalid");
    return out;
  },

  theme: { "--blue": "#4aa3ff", "--blue-deep": "#1b4f9a", "--pink": "#e4452c", "--yellow": "#ffb347", "--teal": "#35e0c0" },   // fallback only: styles/worlds/basketball.css carries the real look

  // Silhouette Quiz: kind = the franchise he is best known for, species = the exact player (distractors share his position), numeric = real numbers.
  // The numbers are the author's best recollection (height, listed weight, NBA titles as a player, best scoring average in a season): check them before a public release.
  quiz: {
    modeTitle: "Who's That Player?",
    plate: "round", kindTitle: "Which team?", speciesTitle: "Which player exactly?", kindName: "Team", speciesName: "Player",
    kindFallbackField: "team", groupField: "pos", skipKinds: [],
    kindPrompt: "Which team is he best known for?", speciesPrompt: "Who is this player?",
    numeric: [
      { key: "height_cm", source: "entity", scale: "linear", integer: true, label: "Height", unit: "cm", prompt: "How tall is {name}?", hint: "In centimetres.", src: "listed NBA heights", min: 170, max: 230 },
      { key: "weight_kg", source: "entity", scale: "linear", integer: true, label: "Weight", unit: "kg", prompt: "How much does {name} weigh?", hint: "Listed playing weight, in kilograms.", src: "listed NBA weights", min: 70, max: 150 },
      { key: "titles", source: "entity", scale: "log", integer: true, label: "NBA titles", unit: "titles", prompt: "How many NBA championships did {name} win as a player?", hint: "Championships as a player (players with none are skipped).", src: "NBA records", min: 1, max: 12 },
      { key: "peak_ppg", source: "entity", scale: "linear", label: "Best scoring season", unit: "points per game", prompt: "What was {name}'s best points-per-game average in a season?", hint: "Regular season, his best year.", src: "NBA records", min: 15, max: 55 }
    ]
  }
};
