const cap = (s) => String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);
const TYPES = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];

export default {
  id: "pokemon",
  name: "Pokémon",
  title: "Pokémon War Draft",
  tagline: "Bid on Pokémon, build a team, then battle with real moves.",
  icon: "⚡",
  blurb: "1,081 Pokémon with their real stats, types and moves.",
  // Images are self-hosted (pokemon/img/art/<pid>.webp 256px, pokemon/img/sprite/<pid>.png 96px, made by tools/fetch-pokemon-images.py). The PokeAPI GitHub URLs stay as a fallback.
  imageUrl: (a) => "pokemon/img/art/" + a.pid + ".webp",
  iconUrl: (a) => "pokemon/img/sprite/" + a.pid + ".png",
  iconAlt: (a) => "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/" + a.pid + ".png",
  heroIds: ["pikachu", "charizard", "mewtwo", "lucario", "gengar", "garchomp", "greninja", "eevee", "dragonite", "gyarados", "umbreon", "rayquaza", "blaziken", "snorlax", "mimikyu", "tyranitar"],
  nouns: { singular: "Pokémon", plural: "Pokémon" },
  engine: "pokemon",          // not the animal fight engine: the Worker/appeal flow does not apply, and the battle modes read this
  noArenas: true,             // no arena bonus tiles / toughness row on the draft card
  iconField: "image",         // draft cards show the colour artwork (animals show silhouettes)
  silhouetteFromImage: true,  // the quiz silhouette is the artwork turned black by the ink filter: no hand-made silhouettes needed
  statMax: 200,               // bar scale on the draft card (base stats go up to 255)
  workerExclude: true,        // too big for the Cloudflare Worker and the Worker has nothing to judge here

  stats: [
    { key: "hp", label: "HP", abbr: "HP", description: "Base HP. In battle (Lv 50) max HP = base + 86. Run out and the Pokémon faints." },
    { key: "atk", label: "Attack", abbr: "ATK", description: "Base Attack. In battle (Lv 50) = base + 31. Powers physical moves (Earthquake, Close Combat...)." },
    { key: "def", label: "Defense", abbr: "DEF", description: "Base Defense. In battle = base + 31. Reduces damage from physical moves." },
    { key: "spa", label: "Sp. Atk", abbr: "SPA", description: "Base Special Attack. In battle = base + 31. Powers special moves (Flamethrower, Psychic...)." },
    { key: "spd", label: "Sp. Def", abbr: "SPD", description: "Base Special Defense. In battle = base + 31. Reduces damage from special moves." },
    { key: "spe", label: "Speed", abbr: "SPE", description: "Base Speed. In battle = base + 31. Decides who moves first (after move priority); paralysis halves it." }
  ],
  arenas: [],

  filters: [
    { id: "regions", type: "chips", label: "Region", field: "region", options: ["Kanto", "Johto", "Hoenn", "Sinnoh", "Unova", "Kalos", "Alola", "Galar", "Paldea", "Hisui"] },
    { id: "types", type: "chips", label: "Type (any of)", field: "types", options: TYPES, format: cap, typeChips: true },
    { id: "classes", type: "chips", label: "Rarity", field: "cls", options: ["Regular", "Baby", "Legendary", "Mythical"] },
    { id: "evo", type: "chips", label: "Evolution stage", field: "evo", options: ["No evolutions", "First stage", "Middle stage", "Fully evolved"] },
    { id: "forms", type: "chips", label: "Forms", field: "form", options: ["Standard", "Regional"] },
    { id: "bst", type: "range", label: "Base stat total", field: "bst", scale: "linear", min: 175, max: 780, ticks: [300, 400, 500, 600, 700], format: (v) => String(Math.round(v)), formatTick: (v) => String(v) },
    { id: "excluded", type: "exclude" }
  ],

  entityFiles: ["pokemon/pokemon_gen1.js", "pokemon/pokemon_gen2.js", "pokemon/pokemon_gen3.js", "pokemon/pokemon_gen4.js", "pokemon/pokemon_gen5.js", "pokemon/pokemon_gen6.js", "pokemon/pokemon_gen7.js", "pokemon/pokemon_gen8.js", "pokemon/pokemon_gen9.js", "pokemon/pokemon_forms.js"],

  cardChips: (a) => ["#" + String(a.dex).padStart(4, "0"), a.region, a.height_m + " m", a.weight_kg + " kg", "BST " + a.bst],

  validate(a) {
    const out = [], T = TYPES;
    if (!Array.isArray(a.types) || a.types.length < 1 || a.types.length > 2 || a.types.some((t) => !T.includes(t))) out.push("types invalid");
    for (const k of ["hp", "atk", "def", "spa", "spd", "spe"]) if (!Number.isInteger(a[k]) || a[k] < 1 || a[k] > 255) out.push(k + " must be 1-255");
    if (a.bst !== a.hp + a.atk + a.def + a.spa + a.spd + a.spe) out.push("bst does not match the stats");
    if (!(a.height_m > 0) || !(a.weight_kg > 0)) out.push("height/weight must be > 0");
    if (!Number.isInteger(a.pid) || !a.image) out.push("pid/image missing");
    if (!Array.isArray(a.abilities) || !a.abilities.length) out.push("no abilities");
    return out;
  },

  theme: { "--blue": "#4d7cff", "--blue-deep": "#2b3fbf", "--pink": "#ff3b4e", "--yellow": "#ffcb05", "--teal": "#3dd9c0" },

  quiz: {
    modeTitle: "Who's That Pokémon?",
    plate: "round", kindTitle: "Which type?", speciesTitle: "Which Pokémon exactly?", kindName: "Type", speciesName: "Pokémon",
    kindFallbackField: "type1", groupField: "type1", skipKinds: [],
    kindPrompt: "What is its main type?", speciesPrompt: "Who's that Pokémon?",
    numeric: [
      { key: "weight_kg", source: "entity", scale: "log", label: "Weight", unit: "kg", prompt: "How much does {name} weigh?", hint: "Pokédex weight.", src: "Pokédex data (PokeAPI)", min: 0.1, max: 1000 },
      { key: "height_m", source: "entity", scale: "log", label: "Height", unit: "m", prompt: "How tall is {name}?", hint: "Pokédex height.", src: "Pokédex data (PokeAPI)", min: 0.1, max: 30 },
      { key: "bst", source: "entity", scale: "linear", integer: true, label: "Base stat total", unit: "total", prompt: "What is {name}'s base stat total?", hint: "HP + Attack + Defense + Sp. Atk + Sp. Def + Speed.", src: "Base stats (PokeAPI)", min: 150, max: 800 },
      { key: "spe", source: "entity", scale: "linear", integer: true, label: "Base Speed", unit: "base stat", prompt: "What is {name}'s base Speed?", hint: "Base stat, 5 to 200.", src: "Base stats (PokeAPI)", min: 5, max: 255 },
      { key: "hp", source: "entity", scale: "linear", integer: true, label: "Base HP", unit: "base stat", prompt: "What is {name}'s base HP?", hint: "Base stat, 1 to 255.", src: "Base stats (PokeAPI)", min: 1, max: 255 },
      { key: "atk", source: "entity", scale: "linear", integer: true, label: "Base Attack", unit: "base stat", prompt: "What is {name}'s base Attack?", hint: "Base stat, 5 to 190.", src: "Base stats (PokeAPI)", min: 5, max: 255 }
    ]
  }
};
