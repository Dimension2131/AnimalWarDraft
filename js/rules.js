// =====================================================================
// rules.js — constants shared by every module. No imports, no side effects.
// =====================================================================

// ===== FIREBASE CONFIG — EDIT THESE PLACEHOLDERS (BEGIN) =====
export const firebaseConfig = {
  apiKey: "AIzaSyD6OC36Q8Wd7YEpwlUT_WbYfV8yL-ygYdo",
  authDomain: "animal-war-draft.firebaseapp.com",
  databaseURL: "https://animal-war-draft-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "animal-war-draft",
  storageBucket: "animal-war-draft.firebasestorage.app",
  messagingSenderId: "842865001027",
  appId: "1:842865001027:web:595b86787472cd47810af6"
};
export const FIREBASE_VERSION = "10.12.2";
// ===== FIREBASE CONFIG (END) =====

// ---- AI hooks (empty string disables everything AI) ----
export const AI_PROXY_URL = "https://adw-judge.rukshanyashitha1.workers.dev/";

// ---- Rooms / connections ----
export const MAX_PLAYERS = 6;
export const MAX_CONNECTIONS = 10;
export const HEARTBEAT_MS = 3000;
export const HOST_STALE_MS = 10000;
export const CHAT_MIN_GAP_MS = 1000;
export const CHAT_KEEP = 100;

// ---- Draft timing ----
export const EXTEND_WINDOW_MS = 10000;
export const EXTEND_SMALL_MS = 3000;
export const LAST_MOMENT_MS = 2000;
export const EXTEND_LAST_MS = 10000;
export const CLAIM_WINDOW_MS = 10000;
export const STALL_LIMIT = 8;
export const MIN_BID = 1;
export const POOL_MARGIN = 20; // pool must be >= players*roster + POOL_MARGIN

// ---- Phase timing ----
export const LINEUP_MS = 30000;
export const FIGHT_PRESTART_MS = 4000;     // shared start delay for fight playback
export const NEXT_FIGHT_IDLE_MS = 30000;   // host idle -> auto advance
export const REBUTTAL_MS = 60000;
export const VOTE_MS = 45000;
export const REMATCH_MS = 60000;
export const APPEAL_TEXT_MAX = 300;   // one appeal message (and one rebuttal message)

// ---- Lobby defaults / limits ----
export const DEFAULT_SETTINGS = {
  startBalance: 100,
  rosterSize: 5,
  auctionSeconds: 20,
  spectatorVoting: true,
  judgeMode: "auto",        // vote | ai | auto
  appealOutcome: "rematch", // rematch | flip
  filters: {
    habitats: ["land", "marine", "aerial"],
    classes: ["mammal", "bird", "reptile", "amphibian", "fish", "invertebrate"],
    massMin: 0.0001, massMax: 200000,
    excluded: []
  }
};
export const ROSTER_MIN = 3, ROSTER_MAX = 8;

// ---- Animal schema vocab ----
export const CLASSES = ["mammal", "bird", "reptile", "amphibian", "fish", "invertebrate"];
export const HABITATS = ["land", "marine", "aerial"];
export const ARENAS = ["water", "forest", "desert", "plains", "mountain"];
export const STAT_KEYS = ["speed", "offense", "defense", "stamina", "instinct"];
export const STAT_SUM_MIN = 230, STAT_SUM_MAX = 270;
export const ARENA_BONUS_MIN = -10, ARENA_BONUS_MAX = 10;
export const SPECIAL_MAX_WORDS = 8;
export const MASS_SLIDER_MIN = 0.0001, MASS_SLIDER_MAX = 200000; // kg, log scale

export const ARENA_INFO = {
  water:    { label: "Water",    emoji: "🌊", bg: ["#0b2a4a", "#0e4c7a"], particle: "#9fd8ff" },
  forest:   { label: "Forest",   emoji: "🌲", bg: ["#10301a", "#1d5a2c"], particle: "#a6e08a" },
  desert:   { label: "Desert",   emoji: "🏜️", bg: ["#4a3418", "#8a6a30"], particle: "#f0d9a0" },
  plains:   { label: "Plains",   emoji: "🌾", bg: ["#3a4a1c", "#6f8a35"], particle: "#e6f0a0" },
  mountain: { label: "Mountain", emoji: "⛰️", bg: ["#2a2f3a", "#555d6e"], particle: "#e8eef7" }
};

// ---- Fight engine constants (sim.js reads only these) ----
export const MAX_TICKS = 200;
export const VENOM_WINDOW = 6;
export const SYNERGY_CAP = 0.30;
export const HP_BASE = 40, HP_SIZE_K = 0.45, HP_STAMINA_K = 1.0;
export const DMG_MIN = 0.7, DMG_MAX = 1.3;
export const DMG_SCALE = 0.42;       // global tuning knob: longer, more watchable fights
export const DEF_K = 100;            // damage = offense * DEF_K/(DEF_K+defense) * ... (offense counts once, defense is a multiplier)
export const SPEED_JITTER = 15;
export const FRONT_HIT = 0.7;
export const FRONT_SLOTS = 2;
export const LIMP_FRAC = 0.25, LIMP_SPEED = 0.7;
export const MORALE_LOSS_COUNT = 2;
export const MORALE_FLEE_BASE = 0.25; // flee chance per tick = base * (1 - instinct/100)
export const MISS_BASE = 0.08;
export const CRIT_CHANCE = 0.04, CRIT_INSTINCT_K = 0.12, CRIT_MULT = 1.5; // crit = CRIT_CHANCE + instinct/100 * CRIT_INSTINCT_K
export const SPEED_DODGE_K = 0.004, SPEED_DODGE_CAP = 0.25;  // extra miss chance = (target speed - attacker speed) * K, capped
export const SIZE_DODGE_K = 0.002, SIZE_DODGE_CAP = 0.15;   // extra miss chance when target is smaller: (attacker size - target size) * K, capped
export const DEATH_CHANCE = 0.5;      // cosmetic death vs collapse
export const SMART_TARGET_WEAKEST = 0.5; // smart targeters: weakest vs most dangerous

// ---- Tag vocabulary (ONLY these) ----
export const TAGS = {
  pack:    { perMate: 0.10 },            // +10% damage per living packmate
  herd:    { share: 0.25 },              // fraction of damage shared with living herdmates
  ambush:  { bonus: 0.18, ticks: 1 },    // first-strike bonus in round 1
  venom:   { dotFrac: 0.045 },            // DoT per tick = offense * dotFrac, for VENOM_WINDOW ticks
  armored: { reduction: 0.12 },          // flat damage reduction
  flier:   { evasion: 0.15 }             // extra miss chance for non-fliers attacking a flier
};
export const TAG_LIST = Object.keys(TAGS);

// ---- Tournament / scoring ----
export const POINTS = { win: 3, draw: 1, loss: 0 };
export const SWISS_ROUNDS = 3;

// ---- Playback pacing (shared by host and every client so fights reveal in sync) ----
export const EVENT_MS = 350;               // renderer plays one event per EVENT_MS at 1x
export const REVEAL_PAD_MS = 2500;
export const revealDelay = (nEvents) => Math.min(120000, nEvents * EVENT_MS + REVEAL_PAD_MS);
export const APPEAL_DECIDE_MS = 20000;     // loser's window to appeal or waive after the reveal