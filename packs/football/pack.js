// Football: 253 real players (each at the EA FC / FIFA 15-24 edition where his overall peaked) + 30 hand-estimated legends (icon: true).
// Playable with the Football War Draft mode (modes/football) and the Silhouette Quiz. Data: football/players.js, built by tools/build-football-data.py.
const POSITIONS = ["goalkeeper", "defender", "midfielder", "forward"];
const LEAGUES = ["Premier League", "La Liga", "Bundesliga", "Serie A", "Ligue 1", "Other", "Icon"];
const TIERS = ["Legend", "Superstar", "Star", "Pro"];
const OUT = ["pac", "sho", "pas", "dri", "def", "phy"], GK = ["div", "han", "kic", "ref", "spd", "gkp"];

const STATS = [
  { key: "pac", label: "Pace", abbr: "PAC", description: "Sprint speed and acceleration. Helps attackers beat the line and defenders recover." },
  { key: "sho", label: "Shooting", abbr: "SHO", description: "Finishing and shot power. Decides who takes the shots and how likely they are to score." },
  { key: "pas", label: "Passing", abbr: "PAS", description: "Vision and passing accuracy. Midfield control and chance creation." },
  { key: "dri", label: "Dribbling", abbr: "DRI", description: "Ball control and agility. Keeps possession and beats defenders." },
  { key: "def", label: "Defending", abbr: "DEF", description: "Tackling and marking. Stops attacks before they become shots." },
  { key: "phy", label: "Physical", abbr: "PHY", description: "Strength and stamina. Wins duels and fades less after the 60th minute." }
];
const GK_STATS = [
  { key: "div", label: "Diving", abbr: "DIV", description: "Reach and athleticism on shots to the corners." },
  { key: "han", label: "Handling", abbr: "HAN", description: "Catching and holding the ball safely." },
  { key: "kic", label: "Kicking", abbr: "KIC", description: "Distribution: goal kicks and throws that start attacks." },
  { key: "ref", label: "Reflexes", abbr: "REF", description: "Reaction speed on close-range shots." },
  { key: "spd", label: "Speed", abbr: "SPD", description: "How fast the keeper gets off the line and out of the box." },
  { key: "gkp", label: "Positioning", abbr: "POS", description: "Reading the game and being in the right place." }
];

// How many of each position a formation asks for: [DEF, MID, FWD] (plus one GK). Kept here because a pack file cannot import the engine; the test suite compares it with the engine.
const FORMATION_NEEDS = {
  "4-3-3": [4, 3, 3], "4-4-2": [4, 4, 2], "3-5-2": [3, 5, 2], "4-2-3-1": [4, 5, 1], "4-1-4-1": [4, 5, 1], "4-5-1": [4, 5, 1], "4-3-2-1": [4, 5, 1], "4-4-1-1": [4, 4, 2], "4-2-2-2": [4, 4, 2], "4-1-2-1-2": [4, 4, 2],
  "4-3-1-2": [4, 4, 2], "4-1-2-3": [4, 3, 3], "3-4-3": [3, 4, 3], "3-4-1-2": [3, 5, 2], "3-4-2-1": [3, 6, 1], "3-1-4-2": [3, 5, 2], "5-3-2": [5, 3, 2], "5-4-1": [5, 4, 1], "5-2-1-2": [5, 3, 2], "5-2-3": [5, 2, 3]
};
const FORMATION_IDS = Object.keys(FORMATION_NEEDS);
const needText = (id) => { const [d, m, f] = FORMATION_NEEDS[id]; return `1 GK, ${d} DEF, ${m} MID, ${f} FWD`; };
const haveOf = (roster) => { const n = (pos) => roster.filter((p) => p.position === pos).length; return { GK: n("goalkeeper"), DEF: n("defender"), MID: n("midfielder"), FWD: n("forward") }; };
const gapsOf = (id, have) => { const [d, m, f] = FORMATION_NEEDS[id], want = { GK: 1, DEF: d, MID: m, FWD: f }; return Object.entries(want).filter(([k, v]) => have[k] < v).map(([k, v]) => `${v - have[k]} ${k}`); };

export default {
  id: "football",
  name: "Football",
  title: "Football War Draft",
  tagline: "Bid on players, build a squad, settle it on the pitch.",
  icon: "⚽",
  blurb: "253 real players and legends. Draft a squad, pick a formation, play a league.",
  nouns: { singular: "player", plural: "players" },
  engine: "football",       // not the animal fight engine: the Football War Draft mode reads this
  noArenas: true,
  workerExclude: true,      // nothing for the Worker to judge here
  statMax: 100,

  // Photos: football/img/<id>.png (a missing one falls back to the emoji). Silhouettes for the quiz: football/silhouettes/<id>.png (listed in football/silhouettes.js).
  imageUrl: (a) => "football/img/" + a.id + ".png",
  iconUrl: (a) => "football/img/" + a.id + ".png",
  silhouetteMap: "football/silhouettes.js",
  heroIds: ["lionel_messi", "cristiano_ronaldo", "kylian_mbappe", "pele", "diego_maradona", "zinedine_zidane", "thierry_henry", "ronaldinho"],

  stats: STATS,
  gkStats: GK_STATS,
  statsFor: (p) => (p && p.position === "goalkeeper" ? GK_STATS : STATS),   // keepers show their own six labels
  arenas: [],

  filters: [
    { id: "positions", type: "chips", label: "Position", field: "position", options: POSITIONS },
    { id: "leagues", type: "chips", label: "League", field: "league", options: LEAGUES },
    { id: "tiers", type: "chips", label: "Tier", field: "tier", options: TIERS },
    { id: "ovr", type: "range", label: "Overall", field: "ovr", scale: "linear", min: 75, max: 99, ticks: [80, 85, 90, 95], format: (v) => String(Math.round(v)), formatTick: (v) => String(v) },
    { id: "excluded", type: "exclude" }
  ],

  entityFiles: ["football/players.js"],

  rosterTag: (p) => p.pos,   // the draft screen's roster list shows each player's position code

  // One line under the draft header: the position count of the squad so far. What each formation needs is the guide at the bottom of the draft screen (draftFormationTips).
  draftTip(roster, size) {
    const n = (pos) => roster.filter((p) => p.position === pos).length;
    return `Your squad: ${n("goalkeeper")} GK · ${n("defender")} DEF · ${n("midfielder")} MID · ${n("forward")} FWD`;
  },

  // The guide at the very bottom of the draft screen (js/app.js builds it): one line per formation with what it needs (a tick = your squad already covers it), and the details of the formation picked in its dropdown.
  // Packs are inlined into the Worker, so this file cannot import the engine: FORMATION_NEEDS repeats the engine's formations as [DEF, MID, FWD] and tools/test-football.mjs checks it against modes/football/engine.js.
  draftFormationTips: {
    title: "Formation guide",
    options: FORMATION_IDS.map((id) => ({ id, label: id })),
    list(roster, size) {
      const have = haveOf(roster);
      return FORMATION_IDS.map((id) => ({ id, text: `${id} · ${needText(id)}`, ok: gapsOf(id, have).length === 0 }));
    },
    detail(roster, size, id) {
      const f = FORMATION_NEEDS[id] ? id : FORMATION_IDS[0], bench = Math.max(0, (size || 11) - 11), gaps = gapsOf(f, haveOf(roster));
      return `${f} needs ${needText(f)}. Best mix with ${size || 11} spots: ${needText(f)}${bench ? `, plus ${bench} on the bench (a second keeper never plays)` : ""}.${gaps.length ? " Still needed: " + gaps.join(", ") + "." : " Core is complete: spend the rest on quality and bench depth."}`;
    }
  },

  cardChips: (p) => [p.pos, p.club, p.nation, "OVR " + p.ovr, p.icon ? "Icon · " + p.era : p.edition],

  validate(p) {
    const out = [];
    if (!POSITIONS.includes(p.position)) out.push(`position invalid (${p.position})`);
    if (!Number.isInteger(p.ovr) || p.ovr < 1 || p.ovr > 99) out.push("ovr must be 1-99");
    for (const k of (p.position === "goalkeeper" ? GK : OUT)) if (!Number.isInteger(p[k]) || p[k] < 1 || p[k] > 99) out.push(k + " must be 1-99");   // no cap on the TOTAL: legends may be stacked
    if (!p.nation || !p.club) out.push("nation/club missing");
    if (!Array.isArray(p.positions) || !p.positions.length) out.push("positions missing");
    return out;
  },

  theme: { "--blue": "#4aa3ff", "--blue-deep": "#1b4f9a", "--pink": "#ff3d57", "--yellow": "#ffe14d", "--teal": "#35e07f" },   // fallback only: styles/worlds/football.css carries the real look

  // Silhouette Quiz: kind = nationality, species = the exact player (distractors are players in the same position), numeric = real numbers.
  // Position / club multiple-choice and trivia facts (World Cups won...) need a new quiz step type and facts data: not built yet.
  quiz: {
    modeTitle: "Who's That Player?",
    plate: "round", kindTitle: "Which nation?", speciesTitle: "Which player exactly?", kindName: "Nation", speciesName: "Player",
    kindFallbackField: "nation", groupField: "position", skipKinds: [],
    kindPrompt: "Which country does he play for?", speciesPrompt: "Who is this player?",
    numeric: [
      { key: "ovr", source: "entity", scale: "linear", integer: true, label: "Overall rating", unit: "OVR", prompt: "What was {name}'s overall rating at his peak?", hint: "EA FC / FIFA overall at his best edition (legends: estimated).", src: "EA FC / FIFA ratings", min: 60, max: 99 },
      { key: "age", source: "entity", scale: "linear", integer: true, label: "Age at his peak", unit: "years", prompt: "How old was {name} in his peak-rated season?", hint: "Age in the edition where his overall was highest.", src: "EA FC / FIFA data", min: 17, max: 40 },
      { key: "value_m", source: "entity", scale: "log", label: "Market value at his peak", unit: "M €", prompt: "What was {name}'s market value at his peak?", hint: "In millions of euros, as listed in that edition.", src: "EA FC / FIFA data", min: 0.5, max: 250 },
      { key: "height_cm", source: "entity", scale: "linear", integer: true, label: "Height", unit: "cm", prompt: "How tall is {name}?", hint: "In centimetres.", src: "EA FC / FIFA data", min: 150, max: 205 },
      { key: "weight_kg", source: "entity", scale: "linear", integer: true, label: "Weight", unit: "kg", prompt: "How much does {name} weigh?", hint: "In kilograms.", src: "EA FC / FIFA data", min: 55, max: 100 }
    ]
  }
};
