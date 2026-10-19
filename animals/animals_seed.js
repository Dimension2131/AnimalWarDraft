// =====================================================================
// animals_seed.js — 24 hand-written animals.
// SCHEMA (every animal is one object):
//   id          unique snake_case string
//   name        display name
//   emoji       emoji used on the token
//   image       (optional) image url
//   class       mammal | bird | reptile | amphibian | fish | invertebrate
//   habitats    array of "land" | "marine" | "aerial"   ("marine" = any water)
//   mass_kg     number > 0
//   tags        array from: pack, herd, ambush, venom, armored, flier
//   size        integer 1-100, must equal sizeFromMass(mass_kg) within +/-1
//   speed, offense, defense, stamina, instinct   integers 1-100
//               (offense+defense+speed+stamina+instinct must be 230-270)
//   special     max 8 words
//   arena_bonus { water, forest, desert, plains, mountain } each -10..10
// =====================================================================
export default [
  { id: "lion", name: "Lion", emoji: "🦁", class: "mammal", habitats: ["land"], mass_kg: 190, tags: ["pack"], size: 66,
    speed: 61, offense: 66, defense: 40, stamina: 43, instinct: 40, special: "Pride hunter, deadly on open ground",
    arena_bonus: { water: -5, forest: 0, desert: 4, plains: 8, mountain: -2 } },
  { id: "african_elephant", name: "African Elephant", emoji: "🐘", class: "mammal", habitats: ["land"], mass_kg: 5000, tags: ["herd","armored"], size: 84,
    speed: 15, offense: 63, defense: 57, stamina: 65, instinct: 50, special: "Living tank with thick hide",
    arena_bonus: { water: 2, forest: 3, desert: -2, plains: 6, mountain: -6 } },
  { id: "gray_wolf", name: "Gray Wolf", emoji: "🐺", class: "mammal", habitats: ["land"], mass_kg: 40, tags: ["pack"], size: 58,
    speed: 58, offense: 53, defense: 37, stamina: 51, instinct: 51, special: "Coordinated pack tactician",
    arena_bonus: { water: -6, forest: 8, desert: -4, plains: 2, mountain: 4 } },
  { id: "grizzly_bear", name: "Grizzly Bear", emoji: "🐻", class: "mammal", habitats: ["land"], mass_kg: 270, tags: [], size: 68,
    speed: 38, offense: 73, defense: 41, stamina: 55, instinct: 43, special: "Raw power and enormous claws",
    arena_bonus: { water: 0, forest: 8, desert: -6, plains: 0, mountain: 6 } },
  { id: "cheetah", name: "Cheetah", emoji: "🐆", class: "mammal", habitats: ["land"], mass_kg: 50, tags: [], size: 59,
    speed: 95, offense: 58, defense: 34, stamina: 31, instinct: 32, special: "Fastest land sprinter alive",
    arena_bonus: { water: -8, forest: -4, desert: 3, plains: 10, mountain: -4 } },
  { id: "komodo_dragon", name: "Komodo Dragon", emoji: "🦎", class: "reptile", habitats: ["land"], mass_kg: 80, tags: ["venom"], size: 62,
    speed: 35, offense: 59, defense: 43, stamina: 57, instinct: 56, special: "Venomous bite wears prey down",
    arena_bonus: { water: -2, forest: 2, desert: 8, plains: 3, mountain: -3 } },
  { id: "king_cobra", name: "King Cobra", emoji: "🐍", class: "reptile", habitats: ["land"], mass_kg: 6, tags: ["venom"], size: 48,
    speed: 60, offense: 54, defense: 35, stamina: 34, instinct: 67, special: "Strikes precisely with potent venom",
    arena_bonus: { water: -3, forest: 6, desert: 6, plains: 0, mountain: -4 } },
  { id: "saltwater_crocodile", name: "Saltwater Crocodile", emoji: "🐊", class: "reptile", habitats: ["marine","land"], mass_kg: 450, tags: ["armored","ambush"], size: 71,
    speed: 33, offense: 69, defense: 55, stamina: 46, instinct: 47, special: "Armored ambusher with crushing jaws",
    arena_bonus: { water: 10, forest: -2, desert: -6, plains: -2, mountain: -8 } },
  { id: "great_white_shark", name: "Great White Shark", emoji: "🦈", class: "fish", habitats: ["marine"], mass_kg: 1000, tags: ["ambush"], size: 75,
    speed: 71, offense: 71, defense: 33, stamina: 38, instinct: 37, special: "Explosive ambush from below",
    arena_bonus: { water: 10, forest: -10, desert: -10, plains: -8, mountain: -10 } },
  { id: "orca", name: "Orca", emoji: "🐋", class: "mammal", habitats: ["marine"], mass_kg: 4000, tags: ["pack"], size: 83,
    speed: 51, offense: 62, defense: 36, stamina: 60, instinct: 41, special: "Apex hunter working in pods",
    arena_bonus: { water: 10, forest: -10, desert: -10, plains: -8, mountain: -9 } },
  { id: "bald_eagle", name: "Bald Eagle", emoji: "🦅", class: "bird", habitats: ["aerial","land"], mass_kg: 4.5, tags: ["flier"], size: 46,
    speed: 80, offense: 59, defense: 31, stamina: 26, instinct: 54, special: "Sharp talons from above",
    arena_bonus: { water: 2, forest: -2, desert: 2, plains: 3, mountain: 8 } },
  { id: "peregrine_falcon", name: "Peregrine Falcon", emoji: "🪶", class: "bird", habitats: ["aerial"], mass_kg: 1, tags: ["flier","ambush"], size: 38,
    speed: 95, offense: 61, defense: 30, stamina: 15, instinct: 49, special: "Diving strike at extreme speed",
    arena_bonus: { water: 0, forest: -5, desert: 3, plains: 6, mountain: 7 } },
  { id: "harpy_eagle", name: "Harpy Eagle", emoji: "🦅", class: "bird", habitats: ["aerial","land"], mass_kg: 7, tags: ["flier"], size: 49,
    speed: 70, offense: 62, defense: 33, stamina: 27, instinct: 58, special: "Forest ambush raptor with huge talons",
    arena_bonus: { water: -4, forest: 10, desert: -4, plains: 0, mountain: 2 } },
  { id: "emperor_penguin", name: "Emperor Penguin", emoji: "🐧", class: "bird", habitats: ["land","marine"], mass_kg: 30, tags: ["herd"], size: 56,
    speed: 30, offense: 51, defense: 48, stamina: 67, instinct: 54, special: "Huddles together, endures anything",
    arena_bonus: { water: 8, forest: -6, desert: -10, plains: -4, mountain: 4 } },
  { id: "poison_dart_frog", name: "Poison Dart Frog", emoji: "🐸", class: "amphibian", habitats: ["land","marine"], mass_kg: 0.003, tags: ["venom"], size: 7,
    speed: 64, offense: 51, defense: 30, stamina: 35, instinct: 70, special: "Tiny but lethally toxic skin",
    arena_bonus: { water: 6, forest: 10, desert: -10, plains: -3, mountain: -5 } },
  { id: "giant_pacific_octopus", name: "Giant Pacific Octopus", emoji: "🐙", class: "invertebrate", habitats: ["marine"], mass_kg: 15, tags: [], size: 53,
    speed: 44, offense: 52, defense: 35, stamina: 33, instinct: 86, special: "Clever escape artist, eight arms",
    arena_bonus: { water: 10, forest: -8, desert: -10, plains: -8, mountain: -8 } },
  { id: "giant_squid", name: "Giant Squid", emoji: "🦑", class: "invertebrate", habitats: ["marine"], mass_kg: 275, tags: [], size: 68,
    speed: 46, offense: 57, defense: 39, stamina: 63, instinct: 45, special: "Deep sea grappler with huge tentacles",
    arena_bonus: { water: 10, forest: -10, desert: -10, plains: -9, mountain: -9 } },
  { id: "giant_hornet", name: "Japanese Giant Hornet", emoji: "🐝", class: "invertebrate", habitats: ["aerial","land"], mass_kg: 0.0007, tags: ["venom","pack","flier"], size: 1,
    speed: 79, offense: 45, defense: 25, stamina: 23, instinct: 78, special: "Swarming venomous flier",
    arena_bonus: { water: -6, forest: 6, desert: 0, plains: 4, mountain: -2 } },
  { id: "hippopotamus", name: "Hippopotamus", emoji: "🦛", class: "mammal", habitats: ["land","marine"], mass_kg: 1500, tags: ["armored"], size: 77,
    speed: 27, offense: 67, defense: 54, stamina: 64, instinct: 38, special: "Territorial and shockingly aggressive",
    arena_bonus: { water: 9, forest: 0, desert: -6, plains: 3, mountain: -6 } },
  { id: "mountain_gorilla", name: "Mountain Gorilla", emoji: "🦍", class: "mammal", habitats: ["land"], mass_kg: 160, tags: [], size: 65,
    speed: 36, offense: 56, defense: 40, stamina: 58, instinct: 60, special: "Immense strength with a calm mind",
    arena_bonus: { water: -4, forest: 9, desert: -6, plains: -1, mountain: 3 } },
  { id: "polar_bear", name: "Polar Bear", emoji: "🐻‍❄️", class: "mammal", habitats: ["land","marine"], mass_kg: 450, tags: [], size: 71,
    speed: 37, offense: 71, defense: 40, stamina: 59, instinct: 43, special: "Cold-proof hunter, strong swimmer",
    arena_bonus: { water: 7, forest: -4, desert: -10, plains: -2, mountain: 6 } },
  { id: "cassowary", name: "Southern Cassowary", emoji: "🐦", class: "bird", habitats: ["land"], mass_kg: 60, tags: [], size: 60,
    speed: 63, offense: 59, defense: 41, stamina: 45, instinct: 42, special: "Dagger claw kick can kill",
    arena_bonus: { water: -2, forest: 9, desert: -3, plains: 3, mountain: -3 } },
  { id: "electric_eel", name: "Electric Eel", emoji: "🐟", class: "fish", habitats: ["marine"], mass_kg: 20, tags: ["venom"], size: 54,
    speed: 58, offense: 53, defense: 36, stamina: 44, instinct: 59, special: "Stuns foes with electric shocks",
    arena_bonus: { water: 10, forest: -4, desert: -10, plains: -8, mountain: -8 } },
  { id: "snapping_turtle", name: "Alligator Snapping Turtle", emoji: "🐢", class: "reptile", habitats: ["land","marine"], mass_kg: 20, tags: ["armored"], size: 54,
    speed: 15, offense: 53, defense: 65, stamina: 56, instinct: 61, special: "Armored shell, bone-crushing bite",
    arena_bonus: { water: 7, forest: 2, desert: -5, plains: 2, mountain: -5 } },
];
