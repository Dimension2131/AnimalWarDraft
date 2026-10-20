// =====================================================================
// animals_facts.js - real-world facts for the silhouette quiz (data only).
// Keyed by animal id (same ids as animals/animals_*.js). Default export.
//   kind         what a layperson would call it from a black silhouette
//   look_alikes  0-3 OTHER animal ids easily confused by silhouette (quiz distractors)
//   facts        only facts that could be stated with reasonable confidence.
//                A missing fact is deliberate: it means "not verified".
//   v/lo/hi      commonly cited value / plausible published range
//   conf         "high" | "medium" | "low"
//   src          where the figure is normally published. Text ending in
//                "(recalled from memory, not opened)" was NOT checked online.
// Units are fixed by the key names. mass_kg lives on the animal, not here.
// =====================================================================
export default {
  snowy_owl: {
    kind: "owl",
    look_alikes: ["great_horned_owl","great_gray_owl"],
    facts: {
      body_length_cm: { v: 60, lo: 52, hi: 71, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" },
      wingspan_cm: { v: 140, lo: 125, hi: 150, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)" }
    }
  },
  honey_bee: {
    kind: "insect",
    look_alikes: ["european_hornet"],
    facts: {
      top_speed_kmh: { v: 24, lo: 20, hi: 30, medium: "fly", conf: "medium", src: "Animal Diversity Web; Wikipedia species articles (recalled from memory, not opened)", note: "worker in level flight" },
      body_length_cm: { v: 1.3, lo: 1, hi: 1.5, conf: "medium", src: "Animal Diversity Web; Wikipedia species articles (recalled from memory, not opened)", note: "worker body length" }
    }
  },
  common_raven: {
    kind: "songbird or small bird",
    look_alikes: [],
    facts: {
      body_length_cm: { v: 63, lo: 54, hi: 67, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" },
      wingspan_cm: { v: 130, lo: 115, hi: 150, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)" }
    }
  },
  mute_swan: {
    kind: "waterbird",
    look_alikes: ["canada_goose"],
    facts: {
      body_length_cm: { v: 150, lo: 125, hi: 170, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" },
      wingspan_cm: { v: 220, lo: 200, hi: 240, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)" }
    }
  },
  vampire_bat: {
    kind: "bat",
    look_alikes: [],
    facts: {
      body_length_cm: { v: 8, lo: 7, hi: 9.5, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body" }
    }
  },
  ruby_throated_hummingbird: {
    kind: "songbird or small bird",
    look_alikes: [],
    facts: {
      body_length_cm: { v: 8, lo: 7, hi: 9, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" },
      wingspan_cm: { v: 10, lo: 8, hi: 11, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)" }
    }
  },
  scarlet_macaw: {
    kind: "parrot",
    look_alikes: [],
    facts: {
      body_length_cm: { v: 85, lo: 78, hi: 96, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip (long tail included)" }
    }
  },
  canada_goose: {
    kind: "waterbird",
    look_alikes: ["mute_swan"],
    facts: {
      body_length_cm: { v: 95, lo: 75, hi: 110, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" },
      wingspan_cm: { v: 160, lo: 127, hi: 185, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)" }
    }
  },
  golden_eagle: {
    kind: "big bird of prey",
    look_alikes: ["bald_eagle","red_tailed_hawk"],
    facts: {
      body_length_cm: { v: 85, lo: 66, hi: 102, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" },
      wingspan_cm: { v: 205, lo: 180, hi: 234, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)" }
    }
  },
  great_horned_owl: {
    kind: "owl",
    look_alikes: ["great_gray_owl","snowy_owl"],
    facts: {
      body_length_cm: { v: 55, lo: 46, hi: 63, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" },
      wingspan_cm: { v: 120, lo: 91, hi: 153, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)" }
    }
  },
  andean_condor: {
    kind: "big bird of prey",
    look_alikes: ["turkey_vulture","bearded_vulture"],
    facts: {
      body_length_cm: { v: 110, lo: 100, hi: 130, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" },
      wingspan_cm: { v: 300, lo: 270, hi: 330, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)" }
    }
  },
  wandering_albatross: {
    kind: "waterbird",
    look_alikes: ["magnificent_frigatebird"],
    facts: {
      body_length_cm: { v: 120, lo: 107, hi: 135, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" },
      wingspan_cm: { v: 300, lo: 250, hi: 350, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "largest wingspan of any living bird (up to ~3.5 m)" }
    }
  },
  osprey: {
    kind: "big bird of prey",
    look_alikes: ["red_tailed_hawk","bald_eagle"],
    facts: {
      body_length_cm: { v: 57, lo: 50, hi: 66, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" },
      wingspan_cm: { v: 160, lo: 127, hi: 180, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)" }
    }
  },
  red_tailed_hawk: {
    kind: "big bird of prey",
    look_alikes: ["golden_eagle","osprey"],
    facts: {
      body_length_cm: { v: 55, lo: 45, hi: 65, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" },
      wingspan_cm: { v: 125, lo: 110, hi: 145, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)" }
    }
  },
  secretary_bird: {
    kind: "big bird of prey",
    look_alikes: [],
    facts: {
      body_length_cm: { v: 125, lo: 100, hi: 150, conf: "low", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip; long legs make it stand ~1.2-1.4 m" },
      wingspan_cm: { v: 200, lo: 190, hi: 215, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)" }
    }
  },
  european_hornet: {
    kind: "insect",
    look_alikes: ["honey_bee","giant_hornet"],
    facts: {
      body_length_cm: { v: 2.5, lo: 1.8, hi: 3.5, conf: "medium", src: "Animal Diversity Web; Wikipedia species articles (recalled from memory, not opened)", note: "workers ~2 cm, queens up to ~3.5 cm" }
    }
  },
  emperor_dragonfly: {
    kind: "insect",
    look_alikes: [],
    facts: {
      body_length_cm: { v: 7.8, lo: 7, hi: 8.4, conf: "medium", src: "Animal Diversity Web; Wikipedia species articles (recalled from memory, not opened)", note: "body length, Anax imperator" }
    }
  },
  northern_goshawk: {
    kind: "big bird of prey",
    look_alikes: ["red_tailed_hawk","osprey"],
    facts: {
      body_length_cm: { v: 58, lo: 46, hi: 69, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" },
      wingspan_cm: { v: 105, lo: 89, hi: 122, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)" }
    }
  },
  magnificent_frigatebird: {
    kind: "waterbird",
    look_alikes: ["wandering_albatross"],
    facts: {
      body_length_cm: { v: 100, lo: 89, hi: 114, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" },
      wingspan_cm: { v: 230, lo: 215, hi: 245, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)" }
    }
  },
  turkey_vulture: {
    kind: "big bird of prey",
    look_alikes: ["andean_condor","bearded_vulture"],
    facts: {
      body_length_cm: { v: 70, lo: 62, hi: 81, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" },
      wingspan_cm: { v: 170, lo: 160, hi: 183, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)" }
    }
  },
  steller_sea_eagle: {
    kind: "big bird of prey",
    look_alikes: ["bald_eagle","golden_eagle"],
    facts: {
      body_length_cm: { v: 95, lo: 85, hi: 105, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" },
      wingspan_cm: { v: 220, lo: 195, hi: 250, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)" }
    }
  },
  bearded_vulture: {
    kind: "big bird of prey",
    look_alikes: ["andean_condor","golden_eagle"],
    facts: {
      body_length_cm: { v: 110, lo: 94, hi: 125, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" },
      wingspan_cm: { v: 265, lo: 231, hi: 283, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)" }
    }
  },
  great_gray_owl: {
    kind: "owl",
    look_alikes: ["great_horned_owl","snowy_owl"],
    facts: {
      body_length_cm: { v: 70, lo: 61, hi: 84, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" },
      wingspan_cm: { v: 145, lo: 135, hi: 152, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)" }
    }
  },
  tarantula_hawk: {
    kind: "insect",
    look_alikes: ["honey_bee","european_hornet"],
    facts: {
      body_length_cm: { v: 4.5, lo: 3, hi: 5.5, conf: "low", src: "Animal Diversity Web; Wikipedia species articles (recalled from memory, not opened)", note: "body length; genus Pepsis, species vary" }
    }
  },
  philippine_eagle: {
    kind: "big bird of prey",
    look_alikes: ["harpy_eagle","bald_eagle"],
    facts: {
      body_length_cm: { v: 95, lo: 86, hi: 102, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" },
      wingspan_cm: { v: 195, lo: 184, hi: 202, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)" }
    }
  },
  tiger: {
    kind: "big cat",
    look_alikes: ["lion","leopard","jaguar"],
    facts: {
      top_speed_kmh: { v: 60, lo: 49, hi: 65, medium: "run", conf: "low", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "short burst; sources vary 49-65" },
      lifespan_years_wild: { v: 12, lo: 10, hi: 15, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)" },
      body_length_cm: { v: 200, lo: 140, hi: 280, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  leopard: {
    kind: "big cat",
    look_alikes: ["jaguar","cheetah","cougar"],
    facts: {
      top_speed_kmh: { v: 58, lo: 50, hi: 60, medium: "run", conf: "low", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "commonly cited ~58 km/h; weakly sourced" },
      lifespan_years_wild: { v: 12, lo: 10, hi: 15, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)" },
      body_length_cm: { v: 130, lo: 92, hi: 190, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  jaguar: {
    kind: "big cat",
    look_alikes: ["leopard","cougar"],
    facts: {
      body_length_cm: { v: 150, lo: 112, hi: 185, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  black_bear: {
    kind: "bear",
    look_alikes: ["grizzly_bear","asiatic_black_bear"],
    facts: {
      top_speed_kmh: { v: 50, lo: 40, hi: 56, medium: "run", conf: "low", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "short burst; sources vary 40-56" },
      body_length_cm: { v: 150, lo: 120, hi: 200, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  giant_panda: {
    kind: "bear",
    look_alikes: ["black_bear","sun_bear"],
    facts: {
      body_length_cm: { v: 150, lo: 120, hi: 190, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  spotted_hyena: {
    kind: "hyena",
    look_alikes: ["striped_hyena","brown_hyena"],
    facts: {
      top_speed_kmh: { v: 60, lo: 50, hi: 65, medium: "run", conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "commonly cited ~60 km/h" },
      body_length_cm: { v: 130, lo: 95, hi: 165, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  coyote: {
    kind: "wild dog or wolf",
    look_alikes: ["gray_wolf","red_fox"],
    facts: {
      top_speed_kmh: { v: 65, lo: 55, hi: 69, medium: "run", conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "commonly cited ~65 km/h (40 mph)" },
      body_length_cm: { v: 90, lo: 75, hi: 100, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  red_fox: {
    kind: "fox",
    look_alikes: ["arctic_fox","coyote"],
    facts: {
      top_speed_kmh: { v: 50, lo: 45, hi: 50, medium: "run", conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "commonly cited ~48-50 km/h" },
      body_length_cm: { v: 65, lo: 45, hi: 90, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  cougar: {
    kind: "big cat",
    look_alikes: ["jaguar","leopard"],
    facts: {
      lifespan_years_wild: { v: 10, lo: 8, hi: 13, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)" },
      body_length_cm: { v: 130, lo: 86, hi: 155, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  snow_leopard: {
    kind: "big cat",
    look_alikes: ["leopard","clouded_leopard"],
    facts: {
      body_length_cm: { v: 105, lo: 75, hi: 130, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  african_wild_dog: {
    kind: "wild dog or wolf",
    look_alikes: ["dhole","spotted_hyena"],
    facts: {
      top_speed_kmh: { v: 66, lo: 56, hi: 71, medium: "run", conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "sources 56-71" },
      lifespan_years_wild: { v: 10, lo: 8, hi: 12, conf: "low", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)" },
      body_length_cm: { v: 100, lo: 71, hi: 112, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  asiatic_black_bear: {
    kind: "bear",
    look_alikes: ["black_bear","sun_bear"],
    facts: {
      body_length_cm: { v: 150, lo: 120, hi: 190, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  sloth_bear: {
    kind: "bear",
    look_alikes: ["black_bear","asiatic_black_bear"],
    facts: {
      body_length_cm: { v: 160, lo: 140, hi: 190, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  striped_hyena: {
    kind: "hyena",
    look_alikes: ["brown_hyena","spotted_hyena"],
    facts: {
      body_length_cm: { v: 105, lo: 85, hi: 130, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  eurasian_lynx: {
    kind: "small cat",
    look_alikes: ["bobcat","caracal"],
    facts: {
      body_length_cm: { v: 100, lo: 76, hi: 130, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  bobcat: {
    kind: "small cat",
    look_alikes: ["eurasian_lynx","caracal"],
    facts: {
      body_length_cm: { v: 80, lo: 65, hi: 105, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  caracal: {
    kind: "small cat",
    look_alikes: ["serval","bobcat"],
    facts: {
      body_length_cm: { v: 75, lo: 62, hi: 91, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  serval: {
    kind: "small cat",
    look_alikes: ["caracal","cheetah"],
    facts: {
      body_length_cm: { v: 85, lo: 67, hi: 100, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  arctic_fox: {
    kind: "fox",
    look_alikes: ["red_fox"],
    facts: {
      body_length_cm: { v: 55, lo: 46, hi: 68, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  maned_wolf: {
    kind: "wild dog or wolf",
    look_alikes: ["red_fox","coyote"],
    facts: {
      body_length_cm: { v: 115, lo: 100, hi: 130, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  dhole: {
    kind: "wild dog or wolf",
    look_alikes: ["african_wild_dog","coyote","red_fox"],
    facts: {
      body_length_cm: { v: 100, lo: 88, hi: 113, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  sun_bear: {
    kind: "bear",
    look_alikes: ["sloth_bear","black_bear"],
    facts: {
      body_length_cm: { v: 120, lo: 100, hi: 140, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  brown_hyena: {
    kind: "hyena",
    look_alikes: ["striped_hyena","spotted_hyena"],
    facts: {}
  },
  aardwolf: {
    kind: "hyena",
    look_alikes: ["striped_hyena"],
    facts: {
      body_length_cm: { v: 68, lo: 55, hi: 80, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  clouded_leopard: {
    kind: "big cat",
    look_alikes: ["leopard","snow_leopard"],
    facts: {
      body_length_cm: { v: 90, lo: 68, hi: 108, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  giraffe: {
    kind: "giraffe or okapi",
    look_alikes: ["okapi"],
    facts: {
      top_speed_kmh: { v: 55, lo: 50, hi: 60, medium: "run", conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "short burst" },
      lifespan_years_wild: { v: 25, lo: 20, hi: 25, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)" }
    }
  },
  plains_zebra: {
    kind: "horse or zebra",
    look_alikes: [],
    facts: {
      top_speed_kmh: { v: 65, lo: 55, hi: 65, medium: "run", conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "commonly cited ~65 km/h" },
      body_length_cm: { v: 230, lo: 210, hi: 250, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  red_kangaroo: {
    kind: "marsupial",
    look_alikes: [],
    facts: {
      top_speed_kmh: { v: 70, lo: 56, hi: 70, medium: "run", conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "hopping, short bursts; ~25 km/h sustained" },
      body_length_cm: { v: 130, lo: 93, hi: 160, conf: "low", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded; males larger" }
    }
  },
  american_bison: {
    kind: "wild cattle",
    look_alikes: ["musk_ox","wild_yak"],
    facts: {
      top_speed_kmh: { v: 56, lo: 50, hi: 65, medium: "run", conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "short burst" },
      body_length_cm: { v: 300, lo: 210, hi: 380, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  moose: {
    kind: "deer or antelope",
    look_alikes: [],
    facts: {
      top_speed_kmh: { v: 56, lo: 50, hi: 56, medium: "run", conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "short burst" },
      body_length_cm: { v: 270, lo: 240, hi: 310, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  white_rhinoceros: {
    kind: "rhino or hippo",
    look_alikes: ["black_rhinoceros","indian_rhinoceros","hippopotamus"],
    facts: {
      top_speed_kmh: { v: 50, lo: 40, hi: 50, medium: "run", conf: "low", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "short charge" },
      lifespan_years_wild: { v: 40, lo: 35, hi: 50, conf: "low", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)" },
      body_length_cm: { v: 380, lo: 340, hi: 420, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  koala: {
    kind: "marsupial",
    look_alikes: ["three_toed_sloth","common_wombat"],
    facts: {
      body_length_cm: { v: 75, lo: 60, hi: 85, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  wild_boar: {
    kind: "wild pig",
    look_alikes: ["warthog"],
    facts: {
      top_speed_kmh: { v: 48, lo: 40, hi: 48, medium: "run", conf: "low", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "short burst" },
      body_length_cm: { v: 150, lo: 90, hi: 200, conf: "low", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  african_buffalo: {
    kind: "wild cattle",
    look_alikes: ["american_bison","gaur","wild_yak"],
    facts: {
      top_speed_kmh: { v: 56, lo: 50, hi: 57, medium: "run", conf: "low", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "commonly cited ~57 km/h" },
      body_length_cm: { v: 280, lo: 210, hi: 340, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  black_rhinoceros: {
    kind: "rhino or hippo",
    look_alikes: ["white_rhinoceros","indian_rhinoceros"],
    facts: {
      top_speed_kmh: { v: 55, lo: 45, hi: 56, medium: "run", conf: "low", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "commonly cited ~55 km/h" },
      lifespan_years_wild: { v: 40, lo: 35, hi: 50, conf: "low", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)" },
      body_length_cm: { v: 330, lo: 286, hi: 375, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  indian_rhinoceros: {
    kind: "rhino or hippo",
    look_alikes: ["white_rhinoceros","black_rhinoceros"],
    facts: {
      body_length_cm: { v: 350, lo: 310, hi: 380, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded; males larger" }
    }
  },
  asian_elephant: {
    kind: "elephant",
    look_alikes: ["african_elephant"],
    facts: {
      top_speed_kmh: { v: 25, lo: 24, hi: 40, medium: "run", conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "measured max ~24.5 km/h (Hutchinson et al. 2003, Nature, Asian elephants); popular sources say up to 40" },
      body_length_cm: { v: 600, lo: 550, hi: 640, conf: "low", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  musk_ox: {
    kind: "wild cattle",
    look_alikes: ["american_bison","wild_yak"],
    facts: {
      body_length_cm: { v: 220, lo: 190, hi: 250, conf: "low", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  bighorn_sheep: {
    kind: "sheep or goat",
    look_alikes: [],
    facts: {
      body_length_cm: { v: 160, lo: 130, hi: 185, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  wild_yak: {
    kind: "wild cattle",
    look_alikes: ["american_bison","musk_ox"],
    facts: {}
  },
  capybara: {
    kind: "rodent",
    look_alikes: [],
    facts: {
      top_speed_kmh: { v: 35, lo: 30, hi: 35, medium: "run", conf: "low", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "commonly cited ~35 km/h" },
      body_length_cm: { v: 120, lo: 106, hi: 134, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  warthog: {
    kind: "wild pig",
    look_alikes: ["wild_boar"],
    facts: {
      top_speed_kmh: { v: 48, lo: 40, hi: 50, medium: "run", conf: "low", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "commonly cited ~48 km/h" },
      body_length_cm: { v: 120, lo: 90, hi: 150, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  north_american_porcupine: {
    kind: "rodent",
    look_alikes: [],
    facts: {
      body_length_cm: { v: 75, lo: 60, hi: 93, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  three_toed_sloth: {
    kind: "other",
    look_alikes: ["koala"],
    facts: {
      body_length_cm: { v: 60, lo: 42, hi: 80, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  gaur: {
    kind: "wild cattle",
    look_alikes: ["african_buffalo","american_bison","wild_yak"],
    facts: {
      body_length_cm: { v: 290, lo: 250, hi: 330, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  malayan_tapir: {
    kind: "other",
    look_alikes: ["wild_boar","capybara"],
    facts: {
      body_length_cm: { v: 220, lo: 180, hi: 250, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  common_wombat: {
    kind: "marsupial",
    look_alikes: ["capybara","koala"],
    facts: {
      top_speed_kmh: { v: 40, lo: 35, hi: 40, medium: "run", conf: "low", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "commonly cited ~40 km/h over short distances" },
      body_length_cm: { v: 100, lo: 70, hi: 120, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  indian_pangolin: {
    kind: "anteater or armadillo",
    look_alikes: [],
    facts: {}
  },
  okapi: {
    kind: "giraffe or okapi",
    look_alikes: ["giraffe","plains_zebra"],
    facts: {
      body_length_cm: { v: 215, lo: 190, hi: 250, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  green_anaconda: {
    kind: "snake",
    look_alikes: ["reticulated_python","boa_constrictor"],
    facts: {
      body_length_cm: { v: 400, lo: 300, hi: 600, conf: "low", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip; typical adults, record claims larger" }
    }
  },
  galapagos_tortoise: {
    kind: "turtle or tortoise",
    look_alikes: [],
    facts: {
      top_speed_kmh: { v: 0.3, lo: 0.2, hi: 0.4, medium: "crawl", conf: "low", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "walking pace ~0.3 km/h" },
      lifespan_years_wild: { v: 100, lo: 90, hi: 150, conf: "low", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "more than 100 years is commonly cited" },
      body_length_cm: { v: 120, lo: 90, hi: 130, conf: "low", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "straight carapace length of large males" }
    }
  },
  american_bullfrog: {
    kind: "frog or salamander",
    look_alikes: ["cane_toad","goliath_frog"],
    facts: {
      body_length_cm: { v: 14, lo: 9, hi: 20, conf: "low", src: "AmphibiaWeb; IUCN Red List species accounts (recalled from memory, not opened)", note: "snout-vent length (tail excluded)" }
    }
  },
  axolotl: {
    kind: "frog or salamander",
    look_alikes: ["chinese_giant_salamander","eastern_hellbender"],
    facts: {
      body_length_cm: { v: 25, lo: 15, hi: 45, conf: "low", src: "AmphibiaWeb; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" }
    }
  },
  cane_toad: {
    kind: "frog or salamander",
    look_alikes: ["american_bullfrog"],
    facts: {
      body_length_cm: { v: 12, lo: 10, hi: 15, conf: "medium", src: "AmphibiaWeb; IUCN Red List species accounts (recalled from memory, not opened)", note: "snout-vent length (tail excluded), typical adult; max ~24 cm" }
    }
  },
  reticulated_python: {
    kind: "snake",
    look_alikes: ["green_anaconda","boa_constrictor"],
    facts: {
      body_length_cm: { v: 450, lo: 300, hi: 700, conf: "low", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip; typical adults, record claims larger" }
    }
  },
  boa_constrictor: {
    kind: "snake",
    look_alikes: ["green_anaconda","reticulated_python"],
    facts: {
      body_length_cm: { v: 250, lo: 180, hi: 400, conf: "low", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" }
    }
  },
  inland_taipan: {
    kind: "snake",
    look_alikes: ["king_cobra"],
    facts: {
      body_length_cm: { v: 180, lo: 150, hi: 250, conf: "medium", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip, average adult" }
    }
  },
  gila_monster: {
    kind: "lizard",
    look_alikes: [],
    facts: {
      body_length_cm: { v: 45, lo: 35, hi: 60, conf: "medium", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" }
    }
  },
  frilled_lizard: {
    kind: "lizard",
    look_alikes: ["marine_iguana","nile_monitor"],
    facts: {
      body_length_cm: { v: 80, lo: 60, hi: 100, conf: "low", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" }
    }
  },
  marine_iguana: {
    kind: "lizard",
    look_alikes: ["frilled_lizard","nile_monitor"],
    facts: {
      max_depth_m: { v: 30, lo: 20, hi: 30, conf: "low", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "deepest dives reported ~30 m; usually much shallower" }
    }
  },
  black_caiman: {
    kind: "crocodilian",
    look_alikes: ["american_alligator","american_crocodile"],
    facts: {
      body_length_cm: { v: 400, lo: 300, hi: 500, conf: "medium", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip, typical adults; rare larger" }
    }
  },
  american_crocodile: {
    kind: "crocodilian",
    look_alikes: ["saltwater_crocodile","american_alligator"],
    facts: {
      body_length_cm: { v: 410, lo: 300, hi: 500, conf: "medium", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip, adult males" }
    }
  },
  leatherback_turtle: {
    kind: "turtle or tortoise",
    look_alikes: ["green_sea_turtle"],
    facts: {
      top_speed_kmh: { v: 35, lo: 30, hi: 35, medium: "swim", conf: "low", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "commonly cited burst; weakly sourced" },
      body_length_cm: { v: 160, lo: 130, hi: 185, conf: "medium", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "curved carapace length" },
      max_depth_m: { v: 1280, lo: 1000, hi: 1280, conf: "medium", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "deepest recorded dive ~1,280 m" }
    }
  },
  chinese_giant_salamander: {
    kind: "frog or salamander",
    look_alikes: ["axolotl","eastern_hellbender"],
    facts: {
      body_length_cm: { v: 100, lo: 80, hi: 180, conf: "low", src: "AmphibiaWeb; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip; up to ~1.8 m reported" }
    }
  },
  red_eyed_tree_frog: {
    kind: "frog or salamander",
    look_alikes: ["poison_dart_frog"],
    facts: {
      body_length_cm: { v: 5.5, lo: 4, hi: 7.5, conf: "medium", src: "AmphibiaWeb; IUCN Red List species accounts (recalled from memory, not opened)", note: "snout-vent length (tail excluded); females larger" }
    }
  },
  nile_monitor: {
    kind: "lizard",
    look_alikes: ["perentie","komodo_dragon"],
    facts: {
      body_length_cm: { v: 150, lo: 120, hi: 240, conf: "low", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" }
    }
  },
  gaboon_viper: {
    kind: "snake",
    look_alikes: [],
    facts: {
      body_length_cm: { v: 130, lo: 100, hi: 200, conf: "medium", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" }
    }
  },
  tuatara: {
    kind: "lizard",
    look_alikes: ["marine_iguana"],
    facts: {
      body_length_cm: { v: 60, lo: 50, hi: 80, conf: "medium", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" }
    }
  },
  eastern_hellbender: {
    kind: "frog or salamander",
    look_alikes: ["chinese_giant_salamander","axolotl"],
    facts: {
      body_length_cm: { v: 45, lo: 30, hi: 74, conf: "medium", src: "AmphibiaWeb; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" }
    }
  },
  goliath_frog: {
    kind: "frog or salamander",
    look_alikes: ["american_bullfrog","cane_toad"],
    facts: {
      body_length_cm: { v: 25, lo: 17, hi: 32, conf: "medium", src: "AmphibiaWeb; IUCN Red List species accounts (recalled from memory, not opened)", note: "snout-vent length (tail excluded)" }
    }
  },
  perentie: {
    kind: "lizard",
    look_alikes: ["komodo_dragon","nile_monitor"],
    facts: {
      body_length_cm: { v: 200, lo: 150, hi: 250, conf: "medium", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" }
    }
  },
  black_widow: {
    kind: "spider",
    look_alikes: ["goliath_birdeater"],
    facts: {
      body_length_cm: { v: 1, lo: 0.8, hi: 1.3, conf: "low", src: "Animal Diversity Web; Wikipedia species articles (recalled from memory, not opened)", note: "female body length, legs excluded" }
    }
  },
  fire_ant: {
    kind: "insect",
    look_alikes: ["army_ant","bullet_ant"],
    facts: {
      body_length_cm: { v: 0.4, lo: 0.2, hi: 0.6, conf: "medium", src: "Animal Diversity Web; Wikipedia species articles (recalled from memory, not opened)", note: "worker body length (2-6 mm)" }
    }
  },
  emperor_scorpion: {
    kind: "scorpion",
    look_alikes: ["deathstalker_scorpion"],
    facts: {
      body_length_cm: { v: 15, lo: 12, hi: 20, conf: "medium", src: "Animal Diversity Web; Wikipedia species articles (recalled from memory, not opened)", note: "total length" }
    }
  },
  american_lobster: {
    kind: "crab or lobster",
    look_alikes: ["coconut_crab"],
    facts: {
      body_length_cm: { v: 40, lo: 20, hi: 61, conf: "medium", src: "Animal Diversity Web; Wikipedia species articles (recalled from memory, not opened)", note: "body length; typical 20-60 cm" }
    }
  },
  portuguese_man_o_war: {
    kind: "jellyfish",
    look_alikes: ["box_jellyfish"],
    facts: {
      body_length_cm: { v: 20, lo: 9, hi: 30, conf: "medium", src: "Animal Diversity Web; Wikipedia species articles (recalled from memory, not opened)", note: "gas-filled float only; tentacles trail ~10 m or more" }
    }
  },
  goliath_birdeater: {
    kind: "spider",
    look_alikes: ["black_widow"],
    facts: {
      body_length_cm: { v: 11, lo: 8, hi: 13, conf: "medium", src: "Animal Diversity Web; Wikipedia species articles (recalled from memory, not opened)", note: "body length, legs excluded; leg span up to ~30 cm" }
    }
  },
  praying_mantis: {
    kind: "insect",
    look_alikes: [],
    facts: {
      body_length_cm: { v: 6.5, lo: 5, hi: 7.5, conf: "medium", src: "Animal Diversity Web; Wikipedia species articles (recalled from memory, not opened)", note: "body length" }
    }
  },
  monarch_butterfly: {
    kind: "insect",
    look_alikes: [],
    facts: {
      wingspan_cm: { v: 10, lo: 8.9, hi: 10.2, conf: "medium", src: "Animal Diversity Web; Wikipedia species articles (recalled from memory, not opened)", note: "published range 8.9-10.2 cm" }
    }
  },
  bullet_ant: {
    kind: "insect",
    look_alikes: ["fire_ant","army_ant"],
    facts: {
      body_length_cm: { v: 2.4, lo: 1.8, hi: 3, conf: "medium", src: "Animal Diversity Web; Wikipedia species articles (recalled from memory, not opened)", note: "worker body length" }
    }
  },
  army_ant: {
    kind: "insect",
    look_alikes: ["fire_ant","bullet_ant"],
    facts: {}
  },
  coconut_crab: {
    kind: "crab or lobster",
    look_alikes: ["american_lobster"],
    facts: {
      body_length_cm: { v: 30, lo: 20, hi: 40, conf: "medium", src: "Animal Diversity Web; Wikipedia species articles (recalled from memory, not opened)", note: "body length; leg span up to ~1 m" }
    }
  },
  deathstalker_scorpion: {
    kind: "scorpion",
    look_alikes: ["emperor_scorpion"],
    facts: {
      body_length_cm: { v: 9, lo: 8, hi: 10, conf: "medium", src: "Animal Diversity Web; Wikipedia species articles (recalled from memory, not opened)", note: "total length" }
    }
  },
  horseshoe_crab: {
    kind: "crab or lobster",
    look_alikes: [],
    facts: {}
  },
  giant_cuttlefish: {
    kind: "octopus or squid",
    look_alikes: ["giant_squid","giant_pacific_octopus"],
    facts: {
      body_length_cm: { v: 50, lo: 45, hi: 50, conf: "medium", src: "Animal Diversity Web; Wikipedia species articles (recalled from memory, not opened)", note: "mantle length; total length with arms up to ~1.5 m" }
    }
  },
  desert_locust: {
    kind: "insect",
    look_alikes: [],
    facts: {
      body_length_cm: { v: 6.5, lo: 5, hi: 8, conf: "medium", src: "Animal Diversity Web; Wikipedia species articles (recalled from memory, not opened)", note: "adult body length" }
    }
  },
  geographer_cone_snail: {
    kind: "other",
    look_alikes: [],
    facts: {}
  },
  giant_isopod: {
    kind: "other",
    look_alikes: [],
    facts: {
      body_length_cm: { v: 30, lo: 19, hi: 36, conf: "medium", src: "Animal Diversity Web; Wikipedia species articles (recalled from memory, not opened)", note: "body length" }
    }
  },
  bombardier_beetle: {
    kind: "insect",
    look_alikes: [],
    facts: {}
  },
  chambered_nautilus: {
    kind: "other",
    look_alikes: ["giant_cuttlefish"],
    facts: {
      body_length_cm: { v: 18, lo: 15, hi: 22, conf: "medium", src: "Animal Diversity Web; Wikipedia species articles (recalled from memory, not opened)", note: "shell diameter" }
    }
  },
  giant_water_bug: {
    kind: "insect",
    look_alikes: ["bombardier_beetle"],
    facts: {}
  },
  bottlenose_dolphin: {
    kind: "whale or dolphin",
    look_alikes: ["orca"],
    facts: {
      top_speed_kmh: { v: 35, lo: 27, hi: 40, medium: "swim", conf: "medium", src: "ReefQuest Centre for Shark Research: 'How Fast Can a Shark Swim?' and 'Haulin' Bass' (opened online 2026-10-19)", note: "ReefQuest lists 27 km/h as the best verified figure; ~35 km/h is commonly quoted" },
      body_length_cm: { v: 300, lo: 200, hi: 400, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" }
    }
  },
  blue_whale: {
    kind: "whale or dolphin",
    look_alikes: ["sperm_whale","orca"],
    facts: {
      lifespan_years_wild: { v: 80, lo: 70, hi: 90, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)" },
      body_length_cm: { v: 2700, lo: 2400, hi: 3300, conf: "high", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip, snout to fluke notch" }
    }
  },
  walrus: {
    kind: "seal or sea lion",
    look_alikes: ["elephant_seal","leopard_seal"],
    facts: {
      body_length_cm: { v: 300, lo: 220, hi: 360, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" }
    }
  },
  green_sea_turtle: {
    kind: "turtle or tortoise",
    look_alikes: ["leatherback_turtle"],
    facts: {
      body_length_cm: { v: 100, lo: 80, hi: 120, conf: "medium", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "curved carapace length" }
    }
  },
  clownfish: {
    kind: "bony fish",
    look_alikes: [],
    facts: {
      lifespan_years_wild: { v: 8, lo: 6, hi: 10, conf: "low", src: "FishBase; IUCN Red List species accounts (recalled from memory, not opened)" },
      body_length_cm: { v: 9, lo: 8, hi: 11, conf: "medium", src: "FishBase; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip; species-dependent" }
    }
  },
  red_bellied_piranha: {
    kind: "bony fish",
    look_alikes: [],
    facts: {
      body_length_cm: { v: 25, lo: 20, hi: 33, conf: "medium", src: "FishBase; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" }
    }
  },
  tiger_shark: {
    kind: "shark or ray",
    look_alikes: ["great_white_shark","bull_shark"],
    facts: {
      body_length_cm: { v: 375, lo: 325, hi: 425, conf: "medium", src: "FishBase; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip, typical adults; max ~5.5 m" }
    }
  },
  sea_otter: {
    kind: "mustelid (weasel family)",
    look_alikes: [],
    facts: {
      body_length_cm: { v: 125, lo: 100, hi: 150, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  sperm_whale: {
    kind: "whale or dolphin",
    look_alikes: ["blue_whale","orca"],
    facts: {
      body_length_cm: { v: 1600, lo: 1400, hi: 2000, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip, adult males" }
    }
  },
  leopard_seal: {
    kind: "seal or sea lion",
    look_alikes: ["walrus","elephant_seal"],
    facts: {
      body_length_cm: { v: 300, lo: 240, hi: 350, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" }
    }
  },
  elephant_seal: {
    kind: "seal or sea lion",
    look_alikes: ["walrus","leopard_seal"],
    facts: {
      body_length_cm: { v: 380, lo: 300, hi: 420, conf: "low", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip, adult males" }
    }
  },
  great_hammerhead: {
    kind: "shark or ray",
    look_alikes: [],
    facts: {
      body_length_cm: { v: 400, lo: 350, hi: 450, conf: "medium", src: "FishBase; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip, typical; max ~6 m" }
    }
  },
  bull_shark: {
    kind: "shark or ray",
    look_alikes: ["great_white_shark","tiger_shark"],
    facts: {
      body_length_cm: { v: 250, lo: 200, hi: 330, conf: "medium", src: "FishBase; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip; females larger" }
    }
  },
  manta_ray: {
    kind: "shark or ray",
    look_alikes: [],
    facts: {
      disc_width_cm: { v: 450, lo: 400, hi: 700, conf: "medium", src: "FishBase; IUCN Red List species accounts (recalled from memory, not opened)", note: "disc width, wingtip to wingtip; max ~7 m" }
    }
  },
  tiger_pufferfish: {
    kind: "bony fish",
    look_alikes: [],
    facts: {}
  },
  great_barracuda: {
    kind: "bony fish",
    look_alikes: [],
    facts: {
      body_length_cm: { v: 100, lo: 80, hi: 170, conf: "medium", src: "FishBase; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip; max ~1.7-2 m" }
    }
  },
  giant_moray: {
    kind: "eel",
    look_alikes: [],
    facts: {
      body_length_cm: { v: 200, lo: 150, hi: 300, conf: "medium", src: "FishBase; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" }
    }
  },
  nile_crocodile: {
    kind: "crocodilian",
    look_alikes: ["saltwater_crocodile","american_crocodile"],
    facts: {
      body_length_cm: { v: 410, lo: 350, hi: 500, conf: "medium", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip, adult males" }
    }
  },
  american_alligator: {
    kind: "crocodilian",
    look_alikes: ["black_caiman","american_crocodile"],
    facts: {
      body_length_cm: { v: 340, lo: 260, hi: 440, conf: "medium", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip, adult males" }
    }
  },
  box_jellyfish: {
    kind: "jellyfish",
    look_alikes: ["portuguese_man_o_war"],
    facts: {
      body_length_cm: { v: 20, lo: 15, hi: 30, conf: "medium", src: "Animal Diversity Web; Wikipedia species articles (recalled from memory, not opened)", note: "bell diameter; tentacles to ~3 m" }
    }
  },
  stonefish: {
    kind: "bony fish",
    look_alikes: [],
    facts: {}
  },
  blue_ringed_octopus: {
    kind: "octopus or squid",
    look_alikes: ["giant_pacific_octopus"],
    facts: {
      body_length_cm: { v: 15, lo: 12, hi: 20, conf: "medium", src: "Animal Diversity Web; Wikipedia species articles (recalled from memory, not opened)", note: "total length including arms" }
    }
  },
  mantis_shrimp: {
    kind: "crab or lobster",
    look_alikes: ["american_lobster"],
    facts: {
      body_length_cm: { v: 15, lo: 10, hi: 18, conf: "medium", src: "Animal Diversity Web; Wikipedia species articles (recalled from memory, not opened)", note: "body length; some species larger" }
    }
  },
  gharial: {
    kind: "crocodilian",
    look_alikes: ["american_crocodile"],
    facts: {
      body_length_cm: { v: 400, lo: 300, hi: 600, conf: "low", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip, adult males" }
    }
  },
  goliath_grouper: {
    kind: "bony fish",
    look_alikes: [],
    facts: {
      body_length_cm: { v: 200, lo: 150, hi: 250, conf: "medium", src: "FishBase; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" }
    }
  },
  lion: {
    kind: "big cat",
    look_alikes: ["tiger","cougar"],
    facts: {
      top_speed_kmh: { v: 80, lo: 65, hi: 80, medium: "run", conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "short burst; commonly cited ~80 km/h" },
      lifespan_years_wild: { v: 12, lo: 8, hi: 16, conf: "low", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "males ~8-10, females up to ~16" },
      body_length_cm: { v: 200, lo: 140, hi: 250, conf: "high", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded; males 170-250, females 140-175" }
    }
  },
  african_elephant: {
    kind: "elephant",
    look_alikes: ["asian_elephant"],
    facts: {
      top_speed_kmh: { v: 25, lo: 24, hi: 40, medium: "run", conf: "low", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "only Asian elephants were measured (~24.5 km/h); popular sources say up to 40" },
      lifespan_years_wild: { v: 65, lo: 60, hi: 70, conf: "low", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)" },
      body_length_cm: { v: 650, lo: 600, hi: 750, conf: "low", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  gray_wolf: {
    kind: "wild dog or wolf",
    look_alikes: ["coyote","african_wild_dog"],
    facts: {
      top_speed_kmh: { v: 60, lo: 56, hi: 64, medium: "run", conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "short burst" },
      lifespan_years_wild: { v: 7, lo: 5, hi: 13, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)" },
      body_length_cm: { v: 130, lo: 100, hi: 160, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  grizzly_bear: {
    kind: "bear",
    look_alikes: ["black_bear","polar_bear"],
    facts: {
      top_speed_kmh: { v: 56, lo: 48, hi: 56, medium: "run", conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "short burst, commonly cited ~56 km/h (35 mph)" },
      lifespan_years_wild: { v: 22, lo: 20, hi: 30, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)" },
      body_length_cm: { v: 200, lo: 150, hi: 280, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  cheetah: {
    kind: "big cat",
    look_alikes: ["leopard","jaguar"],
    facts: {
      top_speed_kmh: { v: 104, lo: 93, hi: 112, medium: "run", conf: "high", src: "Wikipedia 'Fastest animals' (opened online 2026-10-19)", note: "short burst; 93-104 per Wikipedia list, up to 112 in other popular sources" },
      lifespan_years_wild: { v: 10, lo: 8, hi: 14, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)" },
      body_length_cm: { v: 130, lo: 110, hi: 150, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded" }
    }
  },
  komodo_dragon: {
    kind: "lizard",
    look_alikes: ["perentie","nile_monitor"],
    facts: {
      top_speed_kmh: { v: 20, lo: 18, hi: 20, medium: "run", conf: "medium", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "short bursts" },
      body_length_cm: { v: 260, lo: 200, hi: 310, conf: "medium", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip, including tail" }
    }
  },
  king_cobra: {
    kind: "snake",
    look_alikes: ["inland_taipan"],
    facts: {
      body_length_cm: { v: 350, lo: 300, hi: 400, conf: "medium", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip, typical adults; record ~5.8 m" }
    }
  },
  saltwater_crocodile: {
    kind: "crocodilian",
    look_alikes: ["nile_crocodile","american_crocodile"],
    facts: {
      body_length_cm: { v: 470, lo: 400, hi: 520, conf: "medium", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip, adult males" }
    }
  },
  great_white_shark: {
    kind: "shark or ray",
    look_alikes: ["tiger_shark","bull_shark"],
    facts: {
      top_speed_kmh: { v: 40, lo: 35, hi: 56, medium: "swim", conf: "medium", src: "ReefQuest Centre for Shark Research: 'How Fast Can a Shark Swim?' and 'Haulin' Bass' (opened online 2026-10-19)", note: "ReefQuest: consensus of at least ~40 km/h; no flat-out measurement exists; some popular sources say 56" },
      lifespan_years_wild: { v: 70, lo: 60, hi: 73, conf: "medium", src: "FishBase; IUCN Red List species accounts (recalled from memory, not opened)", note: "Hamady et al. 2014 age estimates up to ~73 years" },
      body_length_cm: { v: 450, lo: 340, hi: 600, conf: "medium", src: "FishBase; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip; females larger" }
    }
  },
  orca: {
    kind: "whale or dolphin",
    look_alikes: ["bottlenose_dolphin","sperm_whale"],
    facts: {
      top_speed_kmh: { v: 56, lo: 48, hi: 56, medium: "swim", conf: "medium", src: "ReefQuest Centre for Shark Research: 'How Fast Can a Shark Swim?' and 'Haulin' Bass' (opened online 2026-10-19)", note: "ReefQuest lists 34.5 mph (~55 km/h); other sources ~48-56" },
      body_length_cm: { v: 650, lo: 500, hi: 800, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip; males 6-8 m, females 5-7 m" }
    }
  },
  bald_eagle: {
    kind: "big bird of prey",
    look_alikes: ["golden_eagle","steller_sea_eagle"],
    facts: {
      body_length_cm: { v: 85, lo: 70, hi: 102, conf: "high", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" },
      wingspan_cm: { v: 200, lo: 180, hi: 230, conf: "high", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)" }
    }
  },
  peregrine_falcon: {
    kind: "big bird of prey",
    look_alikes: ["northern_goshawk","osprey"],
    facts: {
      dive_speed_kmh: { v: 320, lo: 300, hi: 390, conf: "medium", src: "Wikipedia 'Fastest animals' (opened online 2026-10-19)", note: "hunting stoop only, not level flight; up to ~389 km/h claimed" },
      body_length_cm: { v: 45, lo: 34, hi: 58, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" },
      wingspan_cm: { v: 100, lo: 74, hi: 120, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)" }
    }
  },
  harpy_eagle: {
    kind: "big bird of prey",
    look_alikes: ["philippine_eagle","golden_eagle"],
    facts: {
      body_length_cm: { v: 95, lo: 86, hi: 107, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip" },
      wingspan_cm: { v: 185, lo: 176, hi: 201, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)" }
    }
  },
  emperor_penguin: {
    kind: "flightless bird",
    look_alikes: [],
    facts: {
      body_length_cm: { v: 115, lo: 100, hi: 130, conf: "high", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "standing height" },
      max_depth_m: { v: 564, lo: 450, hi: 564, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "deepest recorded dive ~564 m" }
    }
  },
  poison_dart_frog: {
    kind: "frog or salamander",
    look_alikes: ["red_eyed_tree_frog"],
    facts: {}
  },
  giant_pacific_octopus: {
    kind: "octopus or squid",
    look_alikes: ["giant_squid","blue_ringed_octopus"],
    facts: {
      lifespan_years_wild: { v: 4, lo: 3, hi: 5, conf: "medium", src: "Animal Diversity Web; Wikipedia species articles (recalled from memory, not opened)" }
    }
  },
  giant_squid: {
    kind: "octopus or squid",
    look_alikes: ["giant_cuttlefish","giant_pacific_octopus"],
    facts: {
      body_length_cm: { v: 1000, lo: 800, hi: 1300, conf: "low", src: "Animal Diversity Web; Wikipedia species articles (recalled from memory, not opened)", note: "total length including tentacles; females up to ~13 m" }
    }
  },
  giant_hornet: {
    kind: "insect",
    look_alikes: ["european_hornet","honey_bee"],
    facts: {
      body_length_cm: { v: 4, lo: 3.5, hi: 5, conf: "medium", src: "Animal Diversity Web; Wikipedia species articles (recalled from memory, not opened)", note: "workers ~3.5-4 cm, queens up to ~5 cm" }
    }
  },
  hippopotamus: {
    kind: "rhino or hippo",
    look_alikes: ["white_rhinoceros"],
    facts: {
      top_speed_kmh: { v: 30, lo: 25, hi: 35, medium: "run", conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "short distances" },
      lifespan_years_wild: { v: 40, lo: 35, hi: 50, conf: "low", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)" }
    }
  },
  mountain_gorilla: {
    kind: "great ape",
    look_alikes: ["black_bear"],
    facts: {
      body_length_cm: { v: 165, lo: 150, hi: 175, conf: "low", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "standing height of adult males" }
    }
  },
  polar_bear: {
    kind: "bear",
    look_alikes: ["grizzly_bear","black_bear"],
    facts: {
      top_speed_kmh: { v: 40, lo: 35, hi: 40, medium: "run", conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "short burst" },
      body_length_cm: { v: 250, lo: 180, hi: 300, conf: "medium", src: "Animal Diversity Web; IUCN Red List species accounts (recalled from memory, not opened)", note: "head and body, tail excluded; males 2.4-3 m, females 1.8-2.4 m" }
    }
  },
  cassowary: {
    kind: "flightless bird",
    look_alikes: [],
    facts: {
      top_speed_kmh: { v: 50, lo: 48, hi: 50, medium: "run", conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "commonly cited ~50 km/h" },
      body_length_cm: { v: 165, lo: 130, hi: 200, conf: "medium", src: "Cornell Lab All About Birds; BirdLife/IUCN species accounts (recalled from memory, not opened)", note: "standing height" }
    }
  },
  electric_eel: {
    kind: "eel",
    look_alikes: ["giant_moray"],
    facts: {
      body_length_cm: { v: 150, lo: 100, hi: 250, conf: "low", src: "FishBase; IUCN Red List species accounts (recalled from memory, not opened)", note: "total length, nose/bill to tail tip; not a true eel (a knifefish)" }
    }
  },
  snapping_turtle: {
    kind: "turtle or tortoise",
    look_alikes: [],
    facts: {
      body_length_cm: { v: 55, lo: 40, hi: 80, conf: "medium", src: "Reptile Database; IUCN Red List species accounts (recalled from memory, not opened)", note: "straight carapace length; large adults" }
    }
  },
};
