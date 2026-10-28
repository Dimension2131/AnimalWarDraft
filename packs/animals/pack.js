// =====================================================================
// packs/animals/pack.js — the "Animals" category pack. Pure data + small pure functions.
// RULES FOR EVERY pack.js (docs/PACK_FORMAT.md):
//   * default-export one plain object; NO imports (tools/build-worker.mjs inlines this file into the Cloudflare Worker),
//     NO DOM, NO browser or Node APIs.
//   * every path is relative to the REPO ROOT (never starts with "/"), so it works on a GitHub project page.
// =====================================================================
const fmtMass = (m) => (m >= 1000 ? +(m / 1000).toPrecision(3) + " t" : (m >= 100 ? Math.round(m) : m >= 1 ? +m.toFixed(1) : +m.toPrecision(2)) + " kg");

export default {
  id: "animals",
  name: "Animals",                       // category name shown in the "Category" dropdown
  title: "Animal War Draft",             // page header + browser tab (the home wordmark is this title split into words)
  icon: "🦁",
  blurb: "Real animals, five stats, one brutal tournament.",
  tagline: "Bid on animals, set your lineup, then watch them fight.",
  nouns: { singular: "animal", plural: "animals", roster: "roster", rosters: "rosters" },

  // The five engine stats (speed, offense, defense, stamina, instinct) + size. Order = display order on cards.
  // `description` is shown as a tooltip / tap popover wherever the stat appears. Written from js/sim.js and js/rules.js.
  stats: [
    { key: "offense", label: "Offense", abbr: "OFF", description: "Base damage of every hit, before the target's defense, crits, tags and arena bonus. It counts once per hit. Venom damage over time also scales with it." },
    { key: "defense", label: "Defense", abbr: "DEF", description: "Cuts every hit you take by a factor of 100/(100+defense). Defense 100 halves incoming damage; it never makes you immune." },
    { key: "speed", label: "Speed", abbr: "SPD", description: "Decides who acts first each round (plus a little random jitter) and makes you harder to hit: a faster target adds up to +25% miss chance against slower attackers. Limping animals act and dodge at 70% speed." },
    { key: "stamina", label: "Stamina", abbr: "STA", description: "Adds straight to your hit points: HP = 40 + size×0.45 + stamina. More stamina means you survive more hits before you start limping (below 25% HP)." },
    { key: "instinct", label: "Instinct", abbr: "INS", description: "Instinct does three things. 1) Smarter targeting: a chance to pick the weakest or most dangerous enemy instead of the nearest. 2) Crits: higher instinct lands critical hits more often. 3) Nerve: after your team loses 2 animals, low-instinct animals are much more likely to lose their nerve and flee." },
    { key: "size", label: "Size", abbr: "SIZE", description: "Derived from mass on a 1-100 log scale. Adds 0.45 HP per point (HP = 40 + size×0.45 + stamina), and a bigger attacker misses a much smaller target more often (up to +15% miss chance)." }
  ],

  // Arena list. `id` is the key of arena_bonus on every entity. `art` picks one of the renderer's built-in scenes
  // (water | forest | desert | plains | mountain); a pack with its own arena ids can reuse them or fall back to plains.
  arenas: [
    { id: "water",    label: "Water",    icon: "🌊", art: "water",    bg: ["#0b2a4a", "#0e4c7a"], particle: "#9fd8ff" },
    { id: "forest",   label: "Forest",   icon: "🌲", art: "forest",   bg: ["#10301a", "#1d5a2c"], particle: "#a6e08a" },
    { id: "desert",   label: "Desert",   icon: "🏜️", art: "desert",   bg: ["#4a3418", "#8a6a30"], particle: "#f0d9a0" },
    { id: "plains",   label: "Plains",   icon: "🌾", art: "plains",   bg: ["#3a4a1c", "#6f8a35"], particle: "#e6f0a0" },
    { id: "mountain", label: "Mountain", icon: "⛰️", art: "mountain", bg: ["#2a2f3a", "#555d6e"], particle: "#e8eef7" }
  ],

  // Lobby filters. Generic types: chips | range | exclude. The saved room settings use EXACTLY these keys:
  //   chips  -> settings.filters[id] = [selected values]
  //   range  -> settings.filters[id + "Min"], settings.filters[id + "Max"]
  //   exclude-> settings.filters.excluded = [entity ids]
  filters: [
    { id: "habitats", type: "chips", label: "Habitat", field: "habitats", options: ["land", "marine", "aerial"] },
    { id: "classes", type: "chips", label: "Class", field: "class", options: ["mammal", "bird", "reptile", "amphibian", "fish", "invertebrate"] },
    { id: "mass", type: "range", label: "Mass", field: "mass_kg", scale: "log", min: 0.0001, max: 200000,
      ticks: [0.01, 1, 100, 10000], format: fmtMass, formatTick: (m) => (m >= 1000 ? m / 1000 + " t" : m + " kg") },
    { id: "excluded", type: "exclude" }
  ],

  // Entity data: files whose default export is an ARRAY of entities. Loaded in this order, first id wins.
  entityFiles: [
    "animals/animals_seed.js", "animals/animals_aerial.js", "animals/animals_big_land_carnivores.js", "animals/animals_herbivores.js",
    "animals/animals_herps.js", "animals/animals_invertebrates.js", "animals/animals_marine.js"
  ],

  // Optional: per-entity strength/weakness. Default export = object keyed by entity id: { up, down, why } (ids from R.TRAIT_UP / R.TRAIT_DOWN in js/rules.js).
  // js/animals.js merges it onto each entity as entity.traits; tools/build-worker.mjs inlines it into the Worker. Omit it and the pack simply has no traits.
  traitsFile: "animals/traits.js",

  // Images. `silhouetteMap` is a module whose default export is { [entityId]: { url } } (url relative to the page).
  // The loader copies url onto entity.silhouette. Entities may also carry their own `image` url and always carry `emoji`.
  silhouetteMap: "js/silhouettes.js",
  imageMap: ["animals/images.js", "animals/animals_images.js"],   // optional photos for the battle discs (tools/fetch-images.mjs); the first file that exists is used. Missing = silhouettes.
  // (images.js, not animals_images.js: tools/validate_facts.mjs treats every animals/animals_*.js file as animal data. The old name is still read so an existing file keeps working.)

  // Extra chips on the draft card (after the tags are drawn above them). Pure function of the entity.
  cardChips: (a) => [a.class, ...(Array.isArray(a.habitats) ? a.habitats : []), fmtMass(a.mass_kg), "size " + a.size],

  // Pack-specific validation of the fields the engine does not know about. Return a list of problems.
  validate(a) {
    const out = [];
    if (!["mammal", "bird", "reptile", "amphibian", "fish", "invertebrate"].includes(a.class)) out.push(`class invalid (${a.class})`);
    if (!Array.isArray(a.habitats) || !a.habitats.length || a.habitats.some((h) => !["land", "marine", "aerial"].includes(h))) out.push("habitats invalid");
    if (typeof a.mass_kg !== "number" || !(a.mass_kg > 0)) out.push("mass_kg must be > 0");
    else if (Number.isInteger(a.size) && Math.abs(a.size - Math.round(Math.max(1, Math.min(100, ((Math.log10(a.mass_kg) + 3) / 8) * 99 + 1)))) > 1)
      out.push(`size ${a.size} does not match mass_kg ${a.mass_kg} (+/-1)`);
    return out;
  },

  // Ten entity ids for the Worker/game fingerprint (two sample fights are simulated from them). Optional.
  fingerprintIds: ["lion", "african_elephant", "gray_wolf", "grizzly_bear", "cheetah", "komodo_dragon", "king_cobra", "saltwater_crocodile", "great_white_shark", "orca"],

  // Theme tokens = CSS custom properties set on <html> while this pack is active. Same values as styles/style.css today.
  theme: { "--blue": "#5f84ff", "--blue-deep": "#2a46b8", "--pink": "#ff5c95", "--yellow": "#ffd23a", "--teal": "#33d6c0" },

  // Later game modes read these. NOT used yet (see docs/PACK_FORMAT.md "Where quiz and race go"). Leave undefined.
  // Silhouette Quiz (modes/quiz, see docs/QUIZ_MODE.md). PLAIN DATA ONLY (this file is inlined into the Worker).
  //   facts: repo-root-relative module; default export keyed by entity id: { kind, look_alikes:[ids], facts:{ key:{v,lo,hi,conf,medium,src,note} } }. Optional: without it the quiz uses entity fields only.
  //   hint (per numeric entry): the ONLY text shown under a question before the answer. Never put numbers or superlatives in it.
  //   images: optional photo map shown on the reveal card after the guesses.
  //   kindGroups / sizeField / factsExtra: see the comments on those fields below.
  //   kindFallbackField: entity field used as the "kind" when there is no facts entry. groupField: entity field used to fill species options. skipKinds: kinds that are never asked or offered.
  //   numeric[]: one entry per numeric question type. source "entity" reads entity[key]; source "facts" reads facts[id].facts[key] (medium/high confidence only unless the lobby allows low).
  //   prompt placeholders: {a} (a/an), {name}, {medium} (the fact's run/fly/swim/crawl, else def.medium). min/max = slider range (log scale), unit = label.
  quiz: {
    kindTitle: "What kind?", speciesTitle: "Which species exactly?", kindName: "Kind", speciesName: "Species",   // the animals world says "species"; no other world does
    facts: "animals/animals_facts.js",
    images: ["animals/images.js", "animals/animals_images.js"],   // optional photo map { id: { url, credit?, page? } } made by tools/fetch-images.mjs; missing file = emoji fallback, no error
    kindFallbackField: "class", groupField: "class", skipKinds: ["other"],
    sizeField: "mass_kg",   // species options: the ones closest in size to the right animal come first
    factsExtra: "animals/facts_web.js",   // optional: facts WITH sources (names, URLs, access date), merged over `facts`; the same fact key here wins. Missing file = nothing changes.
    // Kinds that look alike as black silhouettes. The KIND question takes its wrong options from the same group first (harder levels) or from other groups (easier levels).
    // This is my editorial judgement of what is easy to confuse, NOT researched fact. Every kind of the facts file must appear in at least one group (tools/test-quiz.mjs checks it).
    kindGroups: [
      ["big cat", "small cat", "hyena", "wild dog or wolf", "fox", "mustelid (weasel family)"],         // cat- and dog-shaped hunters
      ["bear", "great ape", "wild pig", "anteater or armadillo", "rodent", "marsupial"],              // stocky, low-slung mammals
      ["rhino or hippo", "wild cattle", "elephant", "wild pig", "giraffe or okapi"],                  // heavy hoofed giants
      ["deer or antelope", "wild cattle", "sheep or goat", "horse or zebra", "giraffe or okapi", "wild pig"],   // hoofed grazers
      ["rodent", "bat", "marsupial", "anteater or armadillo", "mustelid (weasel family)", "fox"],     // small mammals
      ["whale or dolphin", "shark or ray", "seal or sea lion", "bony fish", "mustelid (weasel family)"],   // things in the sea with a streamlined outline
      ["shark or ray", "bony fish", "eel"],
      ["eel", "snake", "lizard", "crocodilian"],                                                      // long bodies
      ["lizard", "snake", "crocodilian", "turtle or tortoise"],
      ["frog or salamander", "lizard", "crocodilian"],
      ["big bird of prey", "owl", "parrot", "waterbird", "songbird or small bird", "flightless bird"],
      ["bat", "songbird or small bird", "insect", "big bird of prey"],                                // things in the air
      ["insect", "spider", "scorpion", "crab or lobster"],                                            // jointed legs
      ["octopus or squid", "jellyfish", "crab or lobster"]                                            // soft or shelled sea animals
    ],
    kindPrompt: "What kind of animal is this?", speciesPrompt: "Which one exactly?",
    numeric: [
      { key: "mass_kg", source: "entity", label: "Mass", unit: "kg", prompt: "How much does {a} {name} weigh?", hint: "Typical adult.", src: "Animal data of this game (mass_kg)", min: 0.0001, max: 200000 },
      { key: "top_speed_kmh", source: "facts", label: "Top speed", unit: "km/h", prompt: "How fast can {a} {name} {medium}?", hint: "Short-burst top speed.", medium: "move", min: 0.1, max: 400 },
      { key: "lifespan_years_wild", source: "facts", label: "Lifespan in the wild", unit: "years", prompt: "How long does {a} {name} live in the wild?", hint: "Typical lifespan in the wild, not in a zoo.", min: 0.01, max: 250 },
      { key: "body_length_cm", source: "facts", label: "Body length", unit: "cm", prompt: "How long is {a} {name}?", hint: "Adult length. The results card says exactly what was measured.", min: 0.05, max: 4500 },
      { key: "wingspan_cm", source: "facts", label: "Wingspan", unit: "cm", prompt: "What is the wingspan of {a} {name}?", hint: "Tip of one wing to tip of the other.", min: 1, max: 450 }
    ]
  },
  // Relay Race mode (modes/race/). PLAIN DATA ONLY (no functions: it is inlined into the Worker bundle as text). Shape and maths: modes/race/README.md.
  // A pack without this section simply does not support the Relay Race mode. Every number here is a tuning knob; balance report: tools/balance-race.mjs.
  race: {
    // Leg types. weights: how much each stat counts towards the animal's pace on that leg (stat keys, plus "lean" = 100 - size). arena: whose arena_bonus applies.
    // v50: speed (m/s) of an animal with pace 50 and no multipliers. len: [min, max] metres (rounded to `step`). mass: optional heavy-body rule (1/(1+(kg-softKg)/divisor)).
    legTypes: [
      { id: "sprint",   label: "Sprint",         icon: "⚡", arena: "plains",   v50: 8.5, len: [200, 300], step: 5, weights: { speed: 0.5, stamina: 0.2, size: 0.15, instinct: 0.15 },
        blurb: "All-out dash. Speed and nerve decide it." },
      { id: "distance", label: "Distance",       icon: "🏃", arena: "desert",   v50: 10,  len: [300, 450], step: 10, weights: { speed: 0.35, stamina: 0.5, size: 0.15 },
        blurb: "A long grind. Stamina matters as much as speed." },
      { id: "swim",     label: "Swim",           icon: "🌊", arena: "water",    v50: 2.0, len: [50, 70],   step: 5, weights: { speed: 0.5, stamina: 0.3, size: 0.1, instinct: 0.1 },
        blurb: "Open water. Sea animals fly, land animals struggle." },
      { id: "climb",    label: "Climb",          icon: "⛰️", arena: "mountain", v50: 0.8, len: [20, 30],   step: 1, weights: { speed: 0.3, stamina: 0.25, offense: 0.25, lean: 0.2 },
        mass: { softKg: 150, divisor: 1200 }, blurb: "Up a cliff. Light, strong animals climb; heavy ones stall." },
      { id: "rough",    label: "Rough terrain",  icon: "🌲", arena: "forest",   v50: 5,   len: [125, 175], step: 5, weights: { speed: 0.35, stamina: 0.25, instinct: 0.15, size: 0.25 },
        mass: { softKg: 1000, divisor: 6000 }, blurb: "Logs, rocks and bog. Instinct finds the line, bulk clears the obstacles." }
    ],
    // pace -> speed: v = v50 * (paceFloor + paceSlope * core), so core 50 gives exactly v50 (0.5 + 0.01*50 = 1). Linear on purpose (no pow/log: identical on every browser).
    paceFloor: 0.5, paceSlope: 0.01,
    arenaK: 0.006,   // speed multiplier = 1 + arenaK * arena_bonus[leg arena]  (bonus -10..10 -> -6%..+6%)

    // Habitat fit = speed multiplier by leg type. An animal's FIRST habitat is its home (full value); every other habitat counts `secondary` of its value.
    fit: {
      secondary: 0.7,
      byHabitat: {
        land:   { sprint: 1.0,  distance: 1.0,  swim: 0.5, climb: 1.0, rough: 1.0 },
        marine: { sprint: 0.45, distance: 0.45, swim: 1.2, climb: 0.3, rough: 0.4 },
        aerial: { sprint: 0.9,  distance: 0.95, swim: 0.8, climb: 1.0, rough: 0.95 }
      }
    },
    // Tag effects: multiplier on speed, per leg type.
    tagMods: {
      sprint:   { ambush: 1.04 },
      distance: { pack: 1.03, herd: 1.03, ambush: 0.97 },
      swim:     { armored: 0.92 },
      climb:    { armored: 0.9 },
      rough:    { armored: 1.04 }
    },
    // Trait effects (animals/traits.js, entity.traits.up / .down): speed multiplier per leg type, by trait id. Unknown ids are ignored.
    traitMods: {
      sprint:   { slow_start: 0.95, winded: 0.98, intimidating: 1.0 },
      distance: { second_wind: 1.04, tenacious: 1.03, tires_fast: 0.95, winded: 0.96 },
      swim:     { skittish: 0.98 },
      climb:    { tenacious: 1.03, clumsy: 0.95, brittle: 0.97 },
      rough:    { keen_senses: 1.03, clumsy: 0.95, poor_eyesight: 0.97 }
    },
    // Seeded randomness (all probabilities per animal per leg, before the difficulty's `chaos` factor).
    events: {
      jitter: 0.04,                                                   // every leg time x (1 +- 4%)
      stumble: { chance: { sprint: 0.05, distance: 0.03, swim: 0.04, climb: 0.10, rough: 0.14 }, penalty: [0.06, 0.16] },   // chance x (1.4 - 0.8*instinct/100)
      panic:   { chance: 0.05, penalty: [0.18, 0.35] },               // chance x (100 - instinct)/50: rare freeze, likelier for low instinct
      burst:   { chance: 0.07, bonus: [0.08, 0.16] },                 // chance x instinct/50: rare surge, likelier for high instinct
      secondWind: { legs: ["distance", "climb", "rough", "swim"], chance: 0.15, bonus: [0.05, 0.10] },   // chance x stamina/50
      gust:    { tag: "flier", chance: 0.3, tail: [0.05, 0.10], head: [0.06, 0.12] },   // fliers only: wind helps or hurts, 50/50
      fumble:  { chance: 0.07, delayMs: [800, 2200] },                // baton drop at a hand-off, chance x (1.5 - instinct/100) of the RECEIVING runner
      handoffMs: 300                                                  // every clean hand-off costs this long
    },
    // Course difficulty = the mix of leg types (weights for drawing legs), a length factor, and how chaotic the legs are.
    difficulties: {
      easy:   { label: "Easy",   weights: { sprint: 2, distance: 2, rough: 2, swim: 1, climb: 1 }, lengthMul: 0.85, chaos: 1.0 },
      mixed:  { label: "Mixed",  weights: { sprint: 1, distance: 1, rough: 1, swim: 1, climb: 1 }, lengthMul: 1.0,  chaos: 1.0 },
      brutal: { label: "Brutal", weights: { sprint: 1, distance: 2, rough: 2, swim: 2, climb: 2 }, lengthMul: 1.15, chaos: 1.4 }
    },
    defaultDifficulty: "mixed",
    defaultLegs: 4, minLegs: 2, maxLegs: 8
  }
};
