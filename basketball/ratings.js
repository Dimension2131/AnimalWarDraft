// basketball/ratings.js: the rating model of the Basketball world: 7 MAIN ratings (shown on cards and strips) built from SUB ratings (shown under "More details").
// The simulation reads the SUB ratings; the main ratings are only a summary of them, so adding or re-weighting a sub rating never changes how the mains are used.
// To add a sub rating: add it to SUBS (with the main it belongs to) and to MAINS[...].w, give every player a value (tools/build-basketball-data.mjs derives them), and use it in modes/basketball/engine.js if it should matter in a game.
export const MAINS = [
  { key: "scoring", abbr: "SCR", label: "Scoring", description: "Putting the ball in the basket: close shots, mid-range, threes, free throws, dunks, post moves and drawing fouls.",
    w: { _best: 0.34, _avg: 0.22, ft: 0.14, _fin: 0.12, drawf: 0.10, ins: 0.08 } },
  { key: "playmaking", abbr: "PLY", label: "Playmaking", description: "Creating for others and protecting the ball: passing and ball handling.", w: { pas: 0.55, han: 0.45 } },
  { key: "perimeter", abbr: "PRD", label: "Perimeter defense", description: "Guarding guards and wings: staying in front, lateral quickness, steals.", w: { per: 0.5, lat: 0.25, stl: 0.25 } },
  { key: "interior", abbr: "INT", label: "Interior defense", description: "Protecting the rim: interior defense, blocks and the strength to hold position.", w: { int: 0.45, blk: 0.35, str: 0.2 } },
  { key: "rebounding", abbr: "REB", label: "Rebounding", description: "Winning the ball off the glass at both ends.", w: { reb: 0.5, oreb: 0.25, dreb: 0.25 } },
  { key: "athleticism", abbr: "ATH", label: "Athleticism", description: "Speed, vertical, strength and stamina.", w: { spd: 0.3, ath: 0.3, str: 0.2, sta: 0.2 } },
  { key: "mindset", abbr: "MND", label: "Mindset", description: "Basketball IQ (decisions, shot selection, fewer mistakes) and clutch play in a close finish.", w: { iq: 0.5, clu: 0.5 } }
];

// main = the main rating it is listed under. used = how the simulation uses it today (shown in the details panel).
export const SUBS = [
  { key: "ins", main: "scoring", label: "Close shots", abbr: "CLS", description: "Layups and close-range shots. Drives how often and how well he scores near the rim." },
  { key: "mid", main: "scoring", label: "Mid-range", abbr: "MID", description: "Jumpers inside the arc." },
  { key: "thr", main: "scoring", label: "Three-point", abbr: "3PT", description: "Shooting from beyond the arc. A low rating means he rarely takes threes." },
  { key: "ft", main: "scoring", label: "Free throw", abbr: "FT", description: "Accuracy from the line: and-ones, fouls drawn and late-game free throws." },
  { key: "dunk", main: "scoring", label: "Dunking", abbr: "DNK", description: "Finishing above the rim. Improves his inside and fast-break shots." },
  { key: "post", main: "scoring", label: "Post moves", abbr: "PST", description: "Scoring with his back to the basket. Improves his inside shots." },
  { key: "drawf", main: "scoring", label: "Foul drawing", abbr: "DRW", description: "How often he gets to the line." },
  { key: "pas", main: "playmaking", label: "Passing", abbr: "PAS", description: "Vision and passing: creates assists and better shots for team-mates." },
  { key: "han", main: "playmaking", label: "Ball handling", abbr: "HAN", description: "Dribbling and ball security: fewer turnovers, easier creation against pressure." },
  { key: "per", main: "perimeter", label: "On-ball defense", abbr: "OBD", description: "Staying in front of his man and contesting jumpers." },
  { key: "lat", main: "perimeter", label: "Lateral quickness", abbr: "LAT", description: "Sliding with fast players. Improves his matchup defense." },
  { key: "stl", main: "perimeter", label: "Steals", abbr: "STL", description: "Hands and anticipation: forces turnovers and fast breaks." },
  { key: "int", main: "interior", label: "Interior defense", abbr: "IND", description: "Guarding in the paint and protecting the rim." },
  { key: "blk", main: "interior", label: "Blocks", abbr: "BLK", description: "Timing and length to block shots." },
  { key: "reb", main: "rebounding", label: "Rebounding", abbr: "REB", description: "Overall rebounding: positioning and hands." },
  { key: "oreb", main: "rebounding", label: "Offensive rebounding", abbr: "ORB", description: "Second chances: used when his team rebounds its own misses." },
  { key: "dreb", main: "rebounding", label: "Defensive rebounding", abbr: "DRB", description: "Ending the other team's possession: used when his team rebounds a miss." },
  { key: "spd", main: "athleticism", label: "Speed", abbr: "SPD", description: "Quickness and pace: transition scoring and recovering on defense." },
  { key: "ath", main: "athleticism", label: "Vertical / explosiveness", abbr: "VRT", description: "Dunks, blocks and contested finishes." },
  { key: "str", main: "athleticism", label: "Strength", abbr: "STR", description: "Power in the post, on screens and in rebounding battles." },
  { key: "sta", main: "athleticism", label: "Stamina", abbr: "STA", description: "How slowly he tires: high-stamina players carry heavy minutes." },
  { key: "iq", main: "mindset", label: "Basketball IQ", abbr: "IQ", description: "Decision making, shot selection, fewer fouls and mistakes." },
  { key: "clu", main: "mindset", label: "Clutch", abbr: "CLU", description: "Performance in the last five minutes of a close game: who gets the ball and how often it goes in." }
];
export const SUB_KEYS = SUBS.map((s) => s.key), MAIN_KEYS = MAINS.map((m) => m.key);

const val = (p, k) => (typeof p[k] === "number" ? p[k] : 50);
// the value of one main rating (0-99) from the SUB ratings of a player
export function mainValue(main, p) {
  const m = typeof main === "string" ? MAINS.find((x) => x.key === main) : main; let t = 0;
  for (const [k, w] of Object.entries(m.w)) {
    const v = k === "_best" ? Math.max(val(p, "ins"), val(p, "mid"), val(p, "thr")) : k === "_avg" ? (val(p, "ins") + val(p, "mid") + val(p, "thr")) / 3 : k === "_fin" ? Math.max(val(p, "dunk"), val(p, "post")) : val(p, k);
    t += v * w;
  }
  return Math.max(1, Math.min(99, Math.round(t)));
}
export const mainsOf = (p) => Object.fromEntries(MAINS.map((m) => [m.key, mainValue(m, p)]));
