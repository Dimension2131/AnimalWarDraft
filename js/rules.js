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
export const AI_PROXY_URL = "https://adw-judge.rukshanyashitha1.workers.dev";
export const AI_JUDGE_TIMEOUT_MS = 20000;
export const AI_STAGE_MS = 30000;

export const MAX_PLAYERS = 10;   // was 6: the Basketball War Draft is built for up to 10 coaches
export const MAX_CONNECTIONS = 16;   // players + spectators (was 10)
export const HEARTBEAT_MS = 3000;
export const HOST_STALE_MS = 10000;
export const CHAT_MIN_GAP_MS = 1000;
export const CHAT_KEEP = 100;

export const EXTEND_WINDOW_MS = 10000;
export const EXTEND_SMALL_MS = 3000;
export const LAST_MOMENT_MS = 2000;
export const EXTEND_LAST_MS = 10000;
export const CLAIM_WINDOW_MS = 10000;
export const STALL_LIMIT = 8, STALL_MIN = 1, STALL_MAX = 30;
export const MIN_BID = 1;
export const POOL_MARGIN = 20;

export const LINEUP_MS = 30000;
export const FIGHT_PRESTART_MS = 4000;
export const NEXT_FIGHT_IDLE_MS = 30000;
export const REBUTTAL_MS = 60000;
export const VOTE_MS = 45000;
export const REMATCH_MS = 60000;
export const APPEAL_TEXT_MAX = 300;

export const DEFAULT_SETTINGS = {
  startBalance: 100,
  rosterSize: 5,
  auctionSeconds: 20,
  stallLimit: 8,          // after this many unsold lots in a row the next lot is dealt for free (to whoever has the fewest)
  mysteryTraits: false
};
export const ROSTER_MIN = 3, ROSTER_MAX = 8;

export const STAT_KEYS = ["speed", "offense", "defense", "stamina", "instinct"];
export const STAT_SUM_MIN = 230, STAT_SUM_MAX = 270;
export const ARENA_BONUS_MIN = -10, ARENA_BONUS_MAX = 10;
export const SPECIAL_MAX_WORDS = 8;

export const MAX_TICKS = 200;
export const VENOM_WINDOW = 6;
export const SYNERGY_CAP = 0.30;
export const HP_BASE = 40, HP_SIZE_K = 0.45, HP_STAMINA_K = 1.0;
export const DMG_MIN = 0.7, DMG_MAX = 1.3;
export const DMG_SCALE = 0.42;
export const DEF_K = 100;
export const SPEED_JITTER = 15;
export const FRONT_HIT = 0.7;
export const FRONT_SLOTS = 2;
export const LIMP_FRAC = 0.25, LIMP_SPEED = 0.7;
export const MORALE_LOSS_COUNT = 2;
export const MORALE_FLEE_BASE = 0.25;
export const MISS_BASE = 0.08;
export const CRIT_CHANCE = 0.04, CRIT_INSTINCT_K = 0.12, CRIT_MULT = 1.5;
export const SPEED_DODGE_K = 0.004, SPEED_DODGE_CAP = 0.25;
export const SIZE_DODGE_K = 0.002, SIZE_DODGE_CAP = 0.15;
export const DEATH_CHANCE = 0.5;
export const SMART_TARGET_WEAKEST = 0.5;

export const TAGS = {
  pack:    { perMate: 0.10 },
  herd:    { share: 0.25 },
  ambush:  { bonus: 0.18, ticks: 1 },
  venom:   { dotFrac: 0.045 },
  armored: { reduction: 0.12 },
  flier:   { evasion: 0.15 }
};
export const TAG_LIST = Object.keys(TAGS);

export const TOUGHNESS = {
  label: "Toughness", abbr: "TGH",
  description: "Effective hit points: how much raw damage it can soak. HP (40 + size×0.45 + stamina) divided by the defense damage multiplier 100/(100+defense). The bar and rank compare it with the whole pool, so a high-HP animal with modest defense can still rank as a tank."
};
export const toughnessOf = (a) => (HP_BASE + a.size * HP_SIZE_K + a.stamina * HP_STAMINA_K) * (DEF_K + a.defense) / DEF_K;

export const TRAIT_UP = {
  second_wind:  { name: "Second wind",  frac: 0.40, mult: 1.25, amt: "extra damage dealt" },
  tenacious:    { name: "Tenacious" },
  camouflage:   { name: "Camouflage",   ticks: 2, miss: 0.25 },
  intimidating: { name: "Intimidating", miss: 0.04 },
  keen_senses:  { name: "Keen senses",  bonus: 35 },
  opportunist:  { name: "Opportunist",  frac: 0.40, mult: 1.20, amt: "extra damage dealt" },
  regenerating: { name: "Regenerating", frac: 0.02, amt: "HP healed" },
  stoic:        { name: "Stoic",        hits: 2, mult: 0.5, amt: "damage prevented" },
  precise:      { name: "Precise",      crit: 0.10 },
  piercing:     { name: "Piercing",     ignore: 0.20, amt: "extra damage dealt" },
  avenger:      { name: "Avenger",      per: 0.08, cap: 3, amt: "extra damage dealt" },
  giant_slayer: { name: "Giant slayer", gap: 10, mult: 1.20, amt: "extra damage dealt" }
};
export const TRAIT_DOWN = {
  slow_start:    { name: "Slow start",    ticks: 4, mult: 0.5 },
  tires_fast:    { name: "Tires fast",    after: 3, rate: 0.04, cap: 0.28, amt: "damage lost" },
  skittish:      { name: "Skittish",      lost: 1 },
  brittle:       { name: "Brittle",       frac: 0.20, mult: 1.20, amt: "extra damage taken" },
  poor_eyesight: { name: "Poor eyesight", miss: 0.08 },
  overconfident: { name: "Overconfident" },
  winded:        { name: "Winded",        frac: 0.50, mult: 0.80, amt: "damage lost" },
  conspicuous:   { name: "Conspicuous",   missMult: 0.6 },
  clumsy:        { name: "Clumsy",        min: 0.4 },
  faint_hearted: { name: "Faint-hearted", flee: 0.5 },
  solitary:      { name: "Solitary",      mates: 2, mult: 0.90, amt: "damage lost" }
};
const pc = (x) => Math.round(x * 100);
const TRAIT_TEXT = {
  second_wind:  (d) => `Below ${pc(d.frac)}% HP it hits ${pc(d.mult - 1)}% harder.`,
  tenacious:    () => "Never loses nerve: ignores morale and never flees. Only matters when Animal Fleeing is on.",
  camouflage:   (d) => `Hard to spot early: enemies miss it ${pc(d.miss)}% more in the first ${d.ticks} rounds.`,
  intimidating: (d) => `While it stands, every enemy attack misses ${pc(d.miss)}% more.`,
  keen_senses:  (d) => `Spots weak points: +${d.bonus} instinct when picking targets.`,
  opportunist:  (d) => `Hits ${pc(d.mult - 1)}% harder against enemies below ${pc(d.frac)}% HP.`,
  regenerating: (d) => `Heals ${(d.frac * 100).toFixed(1).replace(/\.0$/, "")}% of its max HP every round.`,
  stoic:        (d) => `Shrugs off its first ${d.hits} blows: they do only ${pc(d.mult)}% damage.`,
  precise:      (d) => `+${pc(d.crit)}% crit chance.`,
  piercing:     (d) => `Its hits ignore ${pc(d.ignore)}% of the target's defense.`,
  avenger:      (d) => `+${pc(d.per)}% damage for each fallen teammate (up to ${d.cap}).`,
  giant_slayer: (d) => `Hits ${pc(d.mult - 1)}% harder against enemies ${d.gap}+ size points bigger.`,
  slow_start:   (d) => `Sluggish at first: speed ×${d.mult} for the first ${d.ticks} rounds.`,
  tires_fast:   (d) => `Runs out of steam: damage falls ${pc(d.rate)}% per round after round ${d.after} (max −${pc(d.cap)}%).`,
  skittish:     () => "Easily spooked: may flee after ONE fallen teammate instead of two. Only matters when Animal Fleeing is on.",
  brittle:      (d) => `Heavy blows (${pc(d.frac)}%+ of its max HP) hurt it ${pc(d.mult - 1)}% more.`,
  poor_eyesight:(d) => `Its attacks miss ${pc(d.miss)}% more often.`,
  overconfident:() => "Ignores smart targeting: always attacks the nearest enemy.",
  winded:       (d) => `Below ${pc(d.frac)}% HP its damage drops ${pc(1 - d.mult)}%.`,
  conspicuous:  (d) => `Easy to hit: enemies miss it only ${pc(d.missMult)}% as often as normal.`,
  clumsy:       (d) => `Wild swings: damage rolls ${d.min}x-${DMG_MAX}x instead of ${DMG_MIN}x-${DMG_MAX}x.`,
  faint_hearted:() => "Once limping (below 25% HP) it may flee on any round. Only matters when Animal Fleeing is on.",
  solitary:     (d) => `Dislikes company: −${pc(1 - d.mult)}% damage while ${d.mates}+ teammates stand with it.`
};
for (const [k, d] of Object.entries(TRAIT_UP)) d.desc = TRAIT_TEXT[k](d);
for (const [k, d] of Object.entries(TRAIT_DOWN)) d.desc = TRAIT_TEXT[k](d);
export const TRAIT_UP_LIST = Object.keys(TRAIT_UP), TRAIT_DOWN_LIST = Object.keys(TRAIT_DOWN);
export const POINTS = { win: 3, draw: 1, loss: 0 };
export const SWISS_ROUNDS = 3;
export const EVENT_MS = 350;
export const REVEAL_PAD_MS = 2500;
export const revealDelay = (nEvents) => Math.min(120000, nEvents * EVENT_MS + REVEAL_PAD_MS);
export const APPEAL_DECIDE_MS = 20000;