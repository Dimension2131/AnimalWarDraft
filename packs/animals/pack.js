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
  title: "Animal Draft War",             // page header + browser tab (the home wordmark is this title split into words)
  tagline: "Bid on animals, set your lineup, then watch them fight.",
  nouns: { singular: "animal", plural: "animals" },

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
  quiz: undefined,   // { facts: "animals/animals_facts.js", ... } for the silhouette quiz mode
  race: undefined    // { ... } for the relay race mode
};