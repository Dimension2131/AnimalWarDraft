const fmtMass = (m) => (m >= 1000 ? +(m / 1000).toPrecision(3) + " t" : (m >= 100 ? Math.round(m) : m >= 1 ? +m.toFixed(1) : +m.toPrecision(2)) + " kg");

export default {
  id: "animals",
  name: "Animals",
  title: "Animal War Draft",
  icon: "🦁",
  blurb: "Real animals, five stats, one brutal tournament.",
  tagline: "Bid on animals, set your lineup, then watch them fight.",
  nouns: { singular: "animal", plural: "animals" },

  stats: [
    { key: "offense", label: "Offense", abbr: "OFF", description: "Base damage of every hit, before the target's defense, crits, tags and arena bonus. It counts once per hit. Venom damage over time also scales with it." },
    { key: "defense", label: "Defense", abbr: "DEF", description: "Cuts every hit you take by a factor of 100/(100+defense). Defense 100 halves incoming damage; it never makes you immune." },
    { key: "speed", label: "Speed", abbr: "SPD", description: "Decides who acts first each round (plus a little random jitter) and makes you harder to hit: a faster target adds up to +25% miss chance against slower attackers. Limping animals act and dodge at 70% speed." },
    { key: "stamina", label: "Stamina", abbr: "STA", description: "Adds straight to your hit points: HP = 40 + size×0.45 + stamina. More stamina means you survive more hits before you start limping (below 25% HP)." },
    { key: "instinct", label: "Instinct", abbr: "INS", description: "Instinct does three things. 1) Smarter targeting: a chance to pick the weakest or most dangerous enemy instead of the nearest. 2) Crits: higher instinct lands critical hits more often. 3) Nerve: after your team loses 2 animals, low-instinct animals are much more likely to lose their nerve and flee." },
    { key: "size", label: "Size", abbr: "SIZE", description: "Derived from mass on a 1-100 log scale. Adds 0.45 HP per point (HP = 40 + size×0.45 + stamina), and a bigger attacker misses a much smaller target more often (up to +15% miss chance)." }
  ],

  arenas: [
    { id: "water", label: "Water", icon: "🌊", art: "water", bg: ["#0b2a4a", "#0e4c7a"], particle: "#9fd8ff" },
    { id: "forest", label: "Forest", icon: "🌲", art: "forest", bg: ["#10301a", "#1d5a2c"], particle: "#a6e08a" },
    { id: "desert", label: "Desert", icon: "🏜️", art: "desert", bg: ["#4a3418", "#8a6a30"], particle: "#f0d9a0" },
    { id: "plains", label: "Plains", icon: "🌾", art: "plains", bg: ["#3a4a1c", "#6f8a35"], particle: "#e6f0a0" },
    { id: "mountain", label: "Mountain", icon: "⛰️", art: "mountain", bg: ["#2a2f3a", "#555d6e"], particle: "#e8eef7" }
  ],

  filters: [
    { id: "habitats", type: "chips", label: "Habitat", field: "habitats", options: ["land", "marine", "aerial"] },
    { id: "classes", type: "chips", label: "Class", field: "class", options: ["mammal", "bird", "reptile", "amphibian", "fish", "invertebrate"] },
    {
      id: "mass", type: "range", label: "Mass", field: "mass_kg", scale: "log", min: 0.0001, max: 200000,
      ticks: [0.01, 1, 100, 10000], format: fmtMass, formatTick: (m) => (m >= 1000 ? m / 1000 + " t" : m + " kg")
    },
    { id: "excluded", type: "exclude" }
  ],

  entityFiles: [
    "animals/animals_seed.js", "animals/animals_aerial.js", "animals/animals_big_land_carnivores.js", "animals/animals_herbivores.js",
    "animals/animals_herps.js", "animals/animals_invertebrates.js", "animals/animals_marine.js"
  ],

  traitsFile: "animals/traits.js",

  silhouetteMap: "js/silhouettes.js",
  imageMap: "animals/animals_images.js",

  cardChips: (a) => [a.class, ...(Array.isArray(a.habitats) ? a.habitats : []), fmtMass(a.mass_kg), "size " + a.size],

  validate(a) {
    const out = [];
    if (!["mammal", "bird", "reptile", "amphibian", "fish", "invertebrate"].includes(a.class)) out.push(`class invalid (${a.class})`);
    if (!Array.isArray(a.habitats) || !a.habitats.length || a.habitats.some((h) => !["land", "marine", "aerial"].includes(h))) out.push("habitats invalid");
    if (typeof a.mass_kg !== "number" || !(a.mass_kg > 0)) out.push("mass_kg must be > 0");
    else if (Number.isInteger(a.size) && Math.abs(a.size - Math.round(Math.max(1, Math.min(100, ((Math.log10(a.mass_kg) + 3) / 8) * 99 + 1)))) > 1)
      out.push(`size ${a.size} does not match mass_kg ${a.mass_kg} (+/-1)`);
    return out;
  },

  fingerprintIds: ["lion", "african_elephant", "gray_wolf", "grizzly_bear", "cheetah", "komodo_dragon", "king_cobra", "saltwater_crocodile", "great_white_shark", "orca"],

  theme: { "--blue": "#5f84ff", "--blue-deep": "#2a46b8", "--pink": "#ff5c95", "--yellow": "#ffd23a", "--teal": "#33d6c0" },
  quiz: {
    facts: "animals/animals_facts.js",
    images: "animals/animals_images.js",
    kindFallbackField: "class", groupField: "class", skipKinds: ["other"],
    kindPrompt: "What kind of animal is this?", speciesPrompt: "Which one exactly?",
    numeric: [
      { key: "mass_kg", source: "entity", label: "Mass", unit: "kg", prompt: "How much does {a} {name} weigh?", hint: "Typical adult.", src: "Animal data of this game (mass_kg)", min: 0.0001, max: 200000 },
      { key: "top_speed_kmh", source: "facts", label: "Top speed", unit: "km/h", prompt: "How fast can {a} {name} {medium}?", hint: "Short-burst top speed.", medium: "move", min: 0.1, max: 400 },
      { key: "lifespan_years_wild", source: "facts", label: "Lifespan in the wild", unit: "years", prompt: "How long does {a} {name} live in the wild?", hint: "Typical lifespan in the wild, not in a zoo.", min: 0.01, max: 250 },
      { key: "body_length_cm", source: "facts", label: "Body length", unit: "cm", prompt: "How long is {a} {name}?", hint: "Adult length. The results card says exactly what was measured.", min: 0.05, max: 4500 },
      { key: "wingspan_cm", source: "facts", label: "Wingspan", unit: "cm", prompt: "What is the wingspan of {a} {name}?", hint: "Tip of one wing to tip of the other.", min: 1, max: 450 }
    ]
  },
  race: {
    legTypes: [
      {
        id: "sprint", label: "Sprint", icon: "⚡", arena: "plains", v50: 8.5, len: [200, 300], step: 5, weights: { speed: 0.5, stamina: 0.2, size: 0.15, instinct: 0.15 },
        blurb: "All-out dash. Speed and nerve decide it."
      },
      {
        id: "distance", label: "Distance", icon: "🏃", arena: "desert", v50: 10, len: [300, 450], step: 10, weights: { speed: 0.35, stamina: 0.5, size: 0.15 },
        blurb: "A long grind. Stamina matters as much as speed."
      },
      {
        id: "swim", label: "Swim", icon: "🌊", arena: "water", v50: 2.0, len: [50, 70], step: 5, weights: { speed: 0.5, stamina: 0.3, size: 0.1, instinct: 0.1 },
        blurb: "Open water. Sea animals fly, land animals struggle."
      },
      {
        id: "climb", label: "Climb", icon: "⛰️", arena: "mountain", v50: 0.8, len: [20, 30], step: 1, weights: { speed: 0.3, stamina: 0.25, offense: 0.25, lean: 0.2 },
        mass: { softKg: 150, divisor: 1200 }, blurb: "Up a cliff. Light, strong animals climb; heavy ones stall."
      },
      {
        id: "rough", label: "Rough terrain", icon: "🌲", arena: "forest", v50: 5, len: [125, 175], step: 5, weights: { speed: 0.35, stamina: 0.25, instinct: 0.15, size: 0.25 },
        mass: { softKg: 1000, divisor: 6000 }, blurb: "Logs, rocks and bog. Instinct finds the line, bulk clears the obstacles."
      }
    ],
    paceFloor: 0.5, paceSlope: 0.01,
    arenaK: 0.006,

    fit: {
      secondary: 0.7,
      byHabitat: {
        land: { sprint: 1.0, distance: 1.0, swim: 0.5, climb: 1.0, rough: 1.0 },
        marine: { sprint: 0.45, distance: 0.45, swim: 1.2, climb: 0.3, rough: 0.4 },
        aerial: { sprint: 0.9, distance: 0.95, swim: 0.8, climb: 1.0, rough: 0.95 }
      }
    },
    tagMods: {
      sprint: { ambush: 1.04 },
      distance: { pack: 1.03, herd: 1.03, ambush: 0.97 },
      swim: { armored: 0.92 },
      climb: { armored: 0.9 },
      rough: { armored: 1.04 }
    },
    traitMods: {
      sprint: { slow_start: 0.95, winded: 0.98, intimidating: 1.0 },
      distance: { second_wind: 1.04, tenacious: 1.03, tires_fast: 0.95, winded: 0.96 },
      swim: { skittish: 0.98 },
      climb: { tenacious: 1.03, clumsy: 0.95, brittle: 0.97 },
      rough: { keen_senses: 1.03, clumsy: 0.95, poor_eyesight: 0.97 }
    },
    events: {
      jitter: 0.04,
      stumble: { chance: { sprint: 0.05, distance: 0.03, swim: 0.04, climb: 0.10, rough: 0.14 }, penalty: [0.06, 0.16] },
      panic: { chance: 0.05, penalty: [0.18, 0.35] },
      burst: { chance: 0.07, bonus: [0.08, 0.16] },
      secondWind: { legs: ["distance", "climb", "rough", "swim"], chance: 0.15, bonus: [0.05, 0.10] },
      gust: { tag: "flier", chance: 0.3, tail: [0.05, 0.10], head: [0.06, 0.12] },
      fumble: { chance: 0.07, delayMs: [800, 2200] },
      handoffMs: 300
    },
    difficulties: {
      easy: { label: "Easy", weights: { sprint: 2, distance: 2, rough: 2, swim: 1, climb: 1 }, lengthMul: 0.85, chaos: 1.0 },
      mixed: { label: "Mixed", weights: { sprint: 1, distance: 1, rough: 1, swim: 1, climb: 1 }, lengthMul: 1.0, chaos: 1.0 },
      brutal: { label: "Brutal", weights: { sprint: 1, distance: 2, rough: 2, swim: 2, climb: 2 }, lengthMul: 1.15, chaos: 1.4 }
    },
    defaultDifficulty: "mixed",
    defaultLegs: 4, minLegs: 2, maxLegs: 8
  }
};