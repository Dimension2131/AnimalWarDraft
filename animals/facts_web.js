// =====================================================================
// animals/facts_web.js - facts for the Silhouette Quiz that were checked against real web sources (Round 1: the 32 animals that
// previously could only be asked about their mass). Merged OVER animals/animals_facts.js when the quiz starts (pack.quiz.factsExtra):
// the same fact key here wins, everything else in animals_facts.js is untouched. Validate with: node tools/validate_facts_web.mjs
//
// Entry shape: { v, lo?, hi?, conf, src, urls[], accessed, note?, medium? }
//   v         the value used when a guess is outside [lo, hi] (units: kg, years, cm, km/h)
//   lo, hi    the lowest and highest values found across the sources I read. Absent when the sources give a single figure.
//   conf      "high"   = two or more independent reputable sources agree (zoos, museums, conservation bodies, FishBase, Britannica, National Geographic)
//             "medium" = one reputable source, or sources that overlap only partly
//             "low"    = Wikipedia only, or the sources disagree about what is measured. LOW IS NOT ASKED by default (lobby switch "use low-confidence facts").
//   src       short source names shown on the results card; urls = the pages read; accessed = date they were read.
// Only numbers and short labels are stored, no copied text. Where a figure is missing the animal simply has no such fact: nothing is guessed.
// =====================================================================
export default {
 "african_elephant": {
  "facts": {
   "lifespan_years_wild": {
    "v": 65,
    "conf": "high",
    "src": "Animal Diversity Web; Britannica; National Geographic Kids",
    "urls": [
     "https://animaldiversity.org/accounts/Loxodonta_africana/",
     "https://www.britannica.com/animal/elephant-mammal",
     "https://kids.nationalgeographic.com/animals/mammals/facts/african-elephant",
     "https://www.nationalgeographic.com/animals/article/wild-elephants-live-longer-than-their-zoo-counterparts"
    ],
    "accessed": "2026-10-23",
    "lo": 56,
    "hi": 70,
    "note": "ADW: 60-70 average in the wild; Britannica: about 60; NatGeo Kids: up to 70; NatGeo: median 56 for Amboseli females"
   },
   "body_length_cm": {
    "v": 650,
    "conf": "medium",
    "src": "WWF",
    "urls": [
     "https://www.worldwildlife.org/species/elephant/"
    ],
    "accessed": "2026-10-23",
    "lo": 549,
    "hi": 732,
    "note": "WWF: 18-24 ft; the source does not say whether the tail is included"
   }
  }
 },
 "american_bullfrog": {
  "facts": {
   "lifespan_years_wild": {
    "v": 8,
    "conf": "high",
    "src": "National Geographic; Animal Diversity Web",
    "urls": [
     "https://www.nationalgeographic.com/animals/amphibians/facts/american-bullfrog",
     "https://animaldiversity.org/accounts/Lithobates_catesbeianus/"
    ],
    "accessed": "2026-10-23",
    "lo": 7,
    "hi": 9,
    "note": "average 7 to 9 years in the wild; Wikipedia mentions a maximum of 8 to 10"
   },
   "body_length_cm": {
    "v": 12,
    "conf": "high",
    "src": "Animal Diversity Web; National Geographic; Britannica",
    "urls": [
     "https://animaldiversity.org/accounts/Lithobates_catesbeianus/",
     "https://www.nationalgeographic.com/animals/amphibians/facts/american-bullfrog",
     "https://www.britannica.com/animal/bullfrog"
    ],
    "accessed": "2026-10-23",
    "lo": 9,
    "hi": 20,
    "note": "typical 9 to 15 cm; up to about 20 cm (head and body)"
   }
  }
 },
 "army_ant": {
  "facts": {
   "body_length_cm": {
    "v": 0.6,
    "conf": "medium",
    "src": "Animal Diversity Web; Britannica; Smithsonian Research Online",
    "urls": [
     "https://animaldiversity.org/accounts/Eciton_burchellii/",
     "https://www.britannica.com/animal/Eciton-army-ant",
     "https://repository.si.edu/bitstream/handle/10088/83071/theArmyAnt_Schneirla.pdf"
    ],
    "accessed": "2026-10-23",
    "lo": 0.3,
    "hi": 1.2,
    "note": "workers come in several sizes, 3 to 12 mm (Animal Diversity Web); the value is the middle of that range, not a measured average"
   }
  }
 },
 "axolotl": {
  "facts": {
   "body_length_cm": {
    "v": 23,
    "conf": "medium",
    "src": "Animal Diversity Web; San Diego Zoo; Britannica",
    "urls": [
     "https://animaldiversity.org/accounts/Ambystoma_mexicanum/",
     "https://animals.sandiegozoo.org/animals/axolotl",
     "https://www.britannica.com/animal/axolotl"
    ],
    "accessed": "2026-10-23",
    "lo": 20,
    "hi": 30,
    "note": "average about 20-25 cm; can grow to 30 cm or more"
   },
   "lifespan_years_wild": {
    "v": 10,
    "conf": "low",
    "src": "Animal Diversity Web; San Diego Zoo; Britannica",
    "urls": [
     "https://animaldiversity.org/accounts/Ambystoma_mexicanum/",
     "https://animals.sandiegozoo.org/animals/axolotl",
     "https://www.britannica.com/animal/axolotl"
    ],
    "accessed": "2026-10-23",
    "lo": 5,
    "hi": 15,
    "note": "disputed: Britannica says only 5-6 years in the wild, the others say 10-15 (probably in human care)"
   }
  }
 },
 "black_widow": {
  "facts": {
   "lifespan_years_wild": {
    "v": 2,
    "conf": "high",
    "src": "National Geographic; Animal Diversity Web",
    "urls": [
     "https://www.nationalgeographic.com/animals/invertebrates/facts/black-widow-spiders",
     "https://animaldiversity.org/accounts/Latrodectus_mactans/"
    ],
    "accessed": "2026-10-23",
    "lo": 1,
    "hi": 3,
    "note": "1 to 3 years in the wild (most live about one year)"
   },
   "body_length_cm": {
    "v": 3.8,
    "conf": "low",
    "src": "National Geographic; Wikipedia",
    "urls": [
     "https://www.nationalgeographic.com/animals/invertebrates/facts/black-widow-spiders",
     "https://en.wikipedia.org/wiki/Latrodectus_mactans"
    ],
    "accessed": "2026-10-23",
    "note": "sources measure different things: 1.5 inches (National Geographic, with legs) versus 8-13 mm body for a mature female (Wikipedia)"
   }
  }
 },
 "boa_constrictor": {
  "facts": {
   "lifespan_years_wild": {
    "v": 25,
    "conf": "high",
    "src": "National Geographic; Smithsonian's National Zoo; Animal Diversity Web",
    "urls": [
     "https://www.nationalgeographic.com/animals/reptiles/facts/boa-constrictor",
     "https://nationalzoo.si.edu/animals/boa-constrictor",
     "https://animaldiversity.org/accounts/Boa_constrictor/"
    ],
    "accessed": "2026-10-23",
    "lo": 20,
    "hi": 30,
    "note": "20 to 30 years (Animal Diversity Web: perhaps averaging around 20)"
   },
   "body_length_cm": {
    "v": 396,
    "conf": "medium",
    "src": "Smithsonian's National Zoo; National Geographic",
    "urls": [
     "https://nationalzoo.si.edu/animals/boa-constrictor",
     "https://www.nationalgeographic.com/animals/reptiles/facts/boa-constrictor"
    ],
    "accessed": "2026-10-23",
    "lo": 183,
    "hi": 396,
    "note": "both sources give 13 feet as the adult length (the upper end); Wikipedia puts typical adults at 6-10 ft"
   }
  }
 },
 "bombardier_beetle": {
  "facts": {
   "body_length_cm": {
    "v": 1.0,
    "conf": "medium",
    "src": "BugGuide; National Geographic; Australian Museum",
    "urls": [
     "https://www.bugguide.net/node/view/16725",
     "https://www.nationalgeographic.com/animals/invertebrates/facts/bombardier-beetle",
     "https://australian.museum/learn/animals/insects/bombardier-beetle/"
    ],
    "accessed": "2026-10-23",
    "lo": 0.5,
    "hi": 2.5,
    "note": "Brachinus 5 to 13 mm (BugGuide); up to one inch (National Geographic); 1.2 to 1.8 cm for Australian species"
   }
  }
 },
 "brown_hyena": {
  "facts": {
   "body_length_cm": {
    "v": 144,
    "conf": "medium",
    "src": "Animal Diversity Web",
    "urls": [
     "https://animaldiversity.org/accounts/Hyaena_brunnea/"
    ],
    "accessed": "2026-10-23",
    "lo": 130,
    "hi": 160,
    "note": "head and body, tail excluded (Britannica's 'almost 2 metres' includes the tail)"
   }
  }
 },
 "chinese_giant_salamander": {
  "facts": {
   "body_length_cm": {
    "v": 180,
    "conf": "medium",
    "src": "San Diego Zoo",
    "urls": [
     "https://animals.sandiegozoo.org/animals/chinese-giant-salamander"
    ],
    "accessed": "2026-10-23",
    "lo": 130,
    "hi": 180,
    "note": "San Diego Zoo: nearly 6 feet (1.8 m); Wikipedia puts a typical adult at about 1.3 m"
   }
  }
 },
 "electric_eel": {
  "facts": {
   "body_length_cm": {
    "v": 213,
    "conf": "high",
    "src": "Smithsonian's National Zoo; National Geographic",
    "urls": [
     "https://nationalzoo.si.edu/animals/electric-eel",
     "https://www.nationalgeographic.com/animals/fish/facts/electric-eel"
    ],
    "accessed": "2026-10-23",
    "lo": 183,
    "hi": 244,
    "note": "6 to 8 feet"
   },
   "lifespan_years_wild": {
    "v": 15,
    "conf": "low",
    "src": "National Geographic; Smithsonian's National Zoo; Animal Diversity Web",
    "urls": [
     "https://www.nationalgeographic.com/animals/fish/facts/electric-eel",
     "https://nationalzoo.si.edu/animals/electric-eel",
     "https://animaldiversity.org/accounts/Electrophorus_electricus/"
    ],
    "accessed": "2026-10-23",
    "note": "disputed: NatGeo says 15 years in the wild, the Smithsonian and Animal Diversity Web say the wild lifespan is unknown (10 to 22 years in human care)"
   }
  }
 },
 "elephant_seal": {
  "facts": {
   "body_length_cm": {
    "v": 450,
    "conf": "high",
    "src": "Animal Diversity Web; Marine Mammal Center",
    "urls": [
     "https://animaldiversity.org/accounts/Mirounga_angustirostris/",
     "https://www.marinemammalcenter.org/animal-care/learn-about-marine-mammals/pinnipeds/northern-elephant-seal"
    ],
    "accessed": "2026-10-23",
    "lo": 400,
    "hi": 500,
    "note": "adult males: 4.0 to 5.0 m (Animal Diversity Web); over 13 feet (Marine Mammal Center). Females are much smaller"
   },
   "lifespan_years_wild": {
    "v": 15,
    "conf": "medium",
    "src": "Animal Diversity Web; Marine Mammal Center",
    "urls": [
     "https://animaldiversity.org/accounts/Mirounga_angustirostris/",
     "https://www.marinemammalcenter.org/news/some-ocean-optimism-ep-3-elephant-seals"
    ],
    "accessed": "2026-10-23",
    "lo": 11,
    "hi": 19,
    "note": "males about 11-13 years, females about 19 years"
   }
  }
 },
 "frilled_lizard": {
  "facts": {
   "body_length_cm": {
    "v": 85,
    "conf": "high",
    "src": "Animal Diversity Web; Britannica; National Geographic",
    "urls": [
     "https://animaldiversity.org/accounts/Chlamydosaurus_kingii/",
     "https://www.britannica.com/animal/frilled-lizard",
     "https://www.nationalgeographic.com/animals/reptiles/facts/frilled-lizard"
    ],
    "accessed": "2026-10-23",
    "lo": 85,
    "hi": 91,
    "note": "total length, about 85 cm on average (3 feet per National Geographic)"
   },
   "lifespan_years_wild": {
    "v": 20,
    "conf": "medium",
    "src": "National Geographic",
    "urls": [
     "https://www.nationalgeographic.com/animals/reptiles/facts/frilled-lizard"
    ],
    "accessed": "2026-10-23",
    "note": "up to 20 years in the wild"
   }
  }
 },
 "galapagos_tortoise": {
  "facts": {
   "lifespan_years_wild": {
    "v": 100,
    "conf": "low",
    "src": "National Geographic; San Diego Zoo",
    "urls": [
     "https://www.nationalgeographic.com/animals/reptiles/facts/galapagos-tortoise",
     "https://animals.sandiegozoo.org/animals/galapagos-giant-tortoise"
    ],
    "accessed": "2026-10-23",
    "note": "disputed: National Geographic says more than 100 years on average, San Diego Zoo says 35 on average but some live much longer"
   },
   "body_length_cm": {
    "v": 150,
    "conf": "medium",
    "src": "San Diego Zoo; National Geographic",
    "urls": [
     "https://animals.sandiegozoo.org/animals/galapagos-giant-tortoise",
     "https://www.nationalgeographic.com/animals/reptiles/facts/galapagos-tortoise"
    ],
    "accessed": "2026-10-23",
    "lo": 122,
    "hi": 183,
    "note": "males up to 6 ft (1.83 m) head to tail per both sources; San Diego Zoo adds 4-5 ft across the shell's curve"
   }
  }
 },
 "geographer_cone_snail": {
  "facts": {
   "body_length_cm": {
    "v": 15,
    "conf": "medium",
    "src": "National Geographic",
    "urls": [
     "https://www.nationalgeographic.com/animals/invertebrates/facts/geography-cone"
    ],
    "accessed": "2026-10-23",
    "lo": 10,
    "hi": 15,
    "note": "shell length, about 6 inches; Wikipedia gives 10 to 15 cm"
   }
  }
 },
 "gharial": {
  "facts": {
   "lifespan_years_wild": {
    "v": 50,
    "conf": "high",
    "src": "National Geographic; Britannica",
    "urls": [
     "https://www.nationalgeographic.com/animals/reptiles/facts/gharial",
     "https://www.britannica.com/animal/gavial"
    ],
    "accessed": "2026-10-23",
    "lo": 40,
    "hi": 60,
    "note": "40 to 60 years (National Geographic); thought to be as long as 60 in the wild, maximum unknown (Britannica)"
   },
   "body_length_cm": {
    "v": 500,
    "conf": "medium",
    "src": "Animal Diversity Web; Smithsonian's National Zoo; National Geographic",
    "urls": [
     "https://animaldiversity.org/accounts/Gavialis_gangeticus/",
     "https://nationalzoo.si.edu/animals/gharial",
     "https://www.nationalgeographic.com/animals/reptiles/facts/gharial"
    ],
    "accessed": "2026-10-23",
    "lo": 373,
    "hi": 650,
    "note": "males 5 to 6 m (Animal Diversity Web, National Zoo), up to 6.5 m; National Geographic says a typical gharial is 12 to 15 feet"
   }
  }
 },
 "giant_squid": {
  "facts": {
   "body_length_cm": {
    "v": 1300,
    "conf": "medium",
    "src": "Smithsonian Ocean; Australian Museum",
    "urls": [
     "https://ocean.si.edu/ocean-life/invertebrates/giant-squid",
     "https://australian.museum/learn/animals/molluscs/southern-giant-squid-architeuthis-dux/"
    ],
    "accessed": "2026-10-23",
    "lo": 1000,
    "hi": 1500,
    "note": "total length including the two long feeding tentacles; Smithsonian: largest recorded almost 13 m; Australian Museum: at least 15 m; body (mantle) alone is only about 2 m"
   },
   "lifespan_years_wild": {
    "v": 5,
    "conf": "medium",
    "src": "Smithsonian Ocean",
    "urls": [
     "https://ocean.si.edu/ocean-life/invertebrates/giant-squid"
    ],
    "accessed": "2026-10-23",
    "note": "believed to live about five years and reproduce once"
   }
  }
 },
 "giant_water_bug": {
  "facts": {
   "body_length_cm": {
    "v": 5.2,
    "conf": "medium",
    "src": "BugGuide; National Geographic",
    "urls": [
     "https://www.bugguide.net/node/view/13708",
     "https://www.nationalgeographic.com/animals/article/giant-water-bugs-ducklings-snakes-predators"
    ],
    "accessed": "2026-10-23",
    "lo": 4.7,
    "hi": 10.2,
    "note": "Lethocerus americanus 47 to 57 mm (BugGuide); the largest species in South America exceed four inches (National Geographic)"
   }
  }
 },
 "green_anaconda": {
  "facts": {
   "lifespan_years_wild": {
    "v": 10,
    "conf": "high",
    "src": "National Geographic; Smithsonian's National Zoo",
    "urls": [
     "https://www.nationalgeographic.com/animals/reptiles/facts/green-anaconda",
     "https://nationalzoo.si.edu/animals/green-anaconda",
     "https://kids.nationalgeographic.com/animals/reptiles/facts/anaconda"
    ],
    "accessed": "2026-10-23",
    "note": "about 10 years on average in the wild; longer in human care"
   },
   "body_length_cm": {
    "v": 762,
    "conf": "medium",
    "src": "Smithsonian's National Zoo; National Geographic Kids",
    "urls": [
     "https://nationalzoo.si.edu/animals/green-anaconda",
     "https://kids.nationalgeographic.com/animals/reptiles/facts/anaconda"
    ],
    "accessed": "2026-10-23",
    "lo": 610,
    "hi": 914,
    "note": "20 to 30 feet; the National Zoo says they can reach 30 feet, so this is the upper range rather than a typical length"
   }
  }
 },
 "horseshoe_crab": {
  "facts": {
   "lifespan_years_wild": {
    "v": 30,
    "conf": "high",
    "src": "National Geographic; Smithsonian's National Zoo",
    "urls": [
     "https://www.nationalgeographic.com/animals/invertebrates/facts/atlantic-horseshoe-crab",
     "https://nationalzoo.si.edu/animals/horseshoe-crab"
    ],
    "accessed": "2026-10-23",
    "lo": 20,
    "hi": 40,
    "note": "National Geographic: 20 to 40 years; the National Zoo: 20 years or more"
   },
   "body_length_cm": {
    "v": 61,
    "conf": "medium",
    "src": "National Geographic",
    "urls": [
     "https://www.nationalgeographic.com/animals/invertebrates/facts/atlantic-horseshoe-crab"
    ],
    "accessed": "2026-10-23",
    "note": "two feet long including the tail spine"
   }
  }
 },
 "indian_pangolin": {
  "facts": {
   "lifespan_years_wild": {
    "v": 20,
    "conf": "medium",
    "src": "Animal Diversity Web",
    "urls": [
     "https://animaldiversity.org/accounts/Manis_crassicaudata/"
    ],
    "accessed": "2026-10-23",
    "note": "believed to live over 20 years in the wild; the oldest captive lived over 19"
   }
  }
 },
 "manta_ray": {
  "facts": {
   "lifespan_years_wild": {
    "v": 50,
    "conf": "medium",
    "src": "National Geographic",
    "urls": [
     "https://www.nationalgeographic.com/animals/fish/facts/manta-ray"
    ],
    "accessed": "2026-10-23",
    "note": "National Geographic says manta rays can live for 50 years (manta rays in general)"
   }
  }
 },
 "marine_iguana": {
  "facts": {
   "body_length_cm": {
    "v": 130,
    "conf": "medium",
    "src": "National Geographic; Britannica",
    "urls": [
     "https://www.nationalgeographic.com/animals/reptiles/facts/marine-iguana",
     "https://www.britannica.com/animal/marine-iguana"
    ],
    "accessed": "2026-10-23",
    "lo": 122,
    "hi": 152,
    "note": "National Geographic: 4 to 5 feet; Britannica: up to 1.3 m (4.3 ft); total length"
   },
   "lifespan_years_wild": {
    "v": 8.5,
    "conf": "medium",
    "src": "National Geographic",
    "urls": [
     "https://www.nationalgeographic.com/animals/reptiles/facts/marine-iguana"
    ],
    "accessed": "2026-10-23",
    "lo": 5,
    "hi": 12,
    "note": "5 to 12 years in the wild"
   }
  }
 },
 "mountain_gorilla": {
  "facts": {
   "lifespan_years_wild": {
    "v": 35,
    "conf": "medium",
    "src": "National Geographic",
    "urls": [
     "https://www.nationalgeographic.com/animals/mammals/facts/mountain-gorilla"
    ],
    "accessed": "2026-10-23",
    "lo": 35,
    "hi": 40,
    "note": "NatGeo: average 35 years in the wild; the wider 35-40 range is for gorillas in general"
   }
  }
 },
 "musk_ox": {
  "facts": {
   "lifespan_years_wild": {
    "v": 17,
    "conf": "high",
    "src": "Animal Diversity Web; National Geographic",
    "urls": [
     "https://animaldiversity.org/accounts/Ovibos_moschatus/",
     "https://www.nationalgeographic.com/animals/mammals/facts/musk-ox"
    ],
    "accessed": "2026-10-23",
    "lo": 12,
    "hi": 20,
    "note": "National Geographic: average 12-20 years in the wild; Animal Diversity Web: females 15-18, some over 20"
   },
   "top_speed_kmh": {
    "v": 60,
    "conf": "low",
    "src": "Wikipedia",
    "urls": [
     "https://en.wikipedia.org/wiki/Muskox"
    ],
    "accessed": "2026-10-23",
    "note": "only Wikipedia found; no reputable second source",
    "medium": "run"
   }
  }
 },
 "nile_monitor": {
  "facts": {
   "body_length_cm": {
    "v": 170,
    "conf": "low",
    "src": "Wikipedia",
    "urls": [
     "https://en.wikipedia.org/wiki/Nile_monitor"
    ],
    "accessed": "2026-10-23",
    "lo": 120,
    "hi": 244,
    "note": "only Wikipedia found: grows from about 120 to 220 cm, largest 244 cm"
   }
  }
 },
 "poison_dart_frog": {
  "facts": {
   "body_length_cm": {
    "v": 2.5,
    "conf": "medium",
    "src": "Smithsonian's National Zoo; National Geographic; San Diego Zoo",
    "urls": [
     "https://nationalzoo.si.edu/animals/poison-frogs",
     "https://www.nationalgeographic.com/animals/amphibians/facts/poison-dart-frogs-1",
     "https://animals.sandiegozoo.org/animals/poison-frog"
    ],
    "accessed": "2026-10-23",
    "lo": 1,
    "hi": 6,
    "note": "a family of many species: generally 2 to 4 cm (National Zoo), about 1 inch (National Geographic), 1 to 6 cm depending on species (San Diego Zoo)"
   },
   "lifespan_years_wild": {
    "v": 10,
    "conf": "low",
    "src": "National Geographic; Smithsonian's National Zoo",
    "urls": [
     "https://www.nationalgeographic.com/animals/amphibians/facts/poison-dart-frogs-1",
     "https://nationalzoo.si.edu/animals/poison-frogs"
    ],
    "accessed": "2026-10-23",
    "lo": 3,
    "hi": 15,
    "note": "depends heavily on the species: 3 to 15 years for the family (National Geographic), 10 for the golden poison frog, 12 to 20 for the tri-colored one (National Zoo)"
   }
  }
 },
 "reticulated_python": {
  "facts": {
   "body_length_cm": {
    "v": 440,
    "conf": "medium",
    "src": "National Geographic",
    "urls": [
     "https://www.nationalgeographic.com/animals/article/python-sets-record-for-worlds-longest-wild-snake"
    ],
    "accessed": "2026-10-23",
    "lo": 305,
    "hi": 579,
    "note": "typically 10 to 19 feet; a Sumatra study of wild snakes found 1.5-6.5 m including young ones"
   }
  }
 },
 "stonefish": {
  "facts": {
   "body_length_cm": {
    "v": 33,
    "conf": "high",
    "src": "FishBase; Britannica",
    "urls": [
     "https://www.fishbase.se/summary/5825",
     "https://www.britannica.com/animal/Synanceja-verrucosa"
    ],
    "accessed": "2026-10-23",
    "lo": 27,
    "hi": 40,
    "note": "Synanceia verrucosa: common length 27 cm, maximum 40 cm (FishBase); about 33 cm (Britannica)"
   }
  }
 },
 "tarantula_hawk": {
  "facts": {
   "body_length_cm": {
    "v": 5,
    "conf": "medium",
    "src": "Britannica; BugGuide",
    "urls": [
     "https://www.britannica.com/animal/tarantula-hawk",
     "https://www.bugguide.net/node/view/3920"
    ],
    "accessed": "2026-10-23",
    "lo": 4,
    "hi": 11,
    "note": "common species about 5 cm; the largest (Pepsis heros) up to 11 cm; BugGuide: genus up to 40 mm or more"
   }
  }
 },
 "tiger_pufferfish": {
  "facts": {
   "body_length_cm": {
    "v": 40,
    "conf": "medium",
    "src": "FishBase",
    "urls": [
     "https://fishbase.se/ComNames/CommonNameSearchList.php?CommonName=Tiger+puffer"
    ],
    "accessed": "2026-10-23",
    "lo": 40,
    "hi": 80,
    "note": "FishBase for Takifugu rubripes (the tiger puffer; assumes this is the game's Tiger Pufferfish): common length 40 cm, maximum 80 cm"
   }
  }
 },
 "wild_boar": {
  "facts": {
   "body_length_cm": {
    "v": 170,
    "conf": "medium",
    "src": "Animal Diversity Web; National Geographic",
    "urls": [
     "https://animaldiversity.org/accounts/Sus_scrofa/",
     "https://www.nationalgeographic.com/animals/mammals/facts/wild-boar"
    ],
    "accessed": "2026-10-23",
    "lo": 91,
    "hi": 240,
    "note": "the sources overlap only partly: Animal Diversity Web 153-240 cm total length, National Geographic 3-6 ft (91-183 cm)"
   },
   "lifespan_years_wild": {
    "v": 10,
    "conf": "medium",
    "src": "Animal Diversity Web; National Geographic",
    "urls": [
     "https://animaldiversity.org/accounts/Sus_scrofa/",
     "https://www.nationalgeographic.com/animals/mammals/facts/wild-boar"
    ],
    "accessed": "2026-10-23",
    "lo": 9,
    "hi": 14,
    "note": "9 to 10 years (maximum known per Animal Diversity Web, average per National Geographic); Wikipedia mentions up to 14 but few survive past 4-5"
   },
   "top_speed_kmh": {
    "v": 40,
    "conf": "low",
    "src": "Wikipedia (citing Heptner 1988)",
    "urls": [
     "https://en.wikipedia.org/wiki/Wild_boar"
    ],
    "accessed": "2026-10-23",
    "note": "only Wikipedia found; no reputable second source",
    "medium": "run"
   }
  }
 },
 "wild_yak": {
  "facts": {
   "lifespan_years_wild": {
    "v": 25,
    "conf": "medium",
    "src": "Animal Diversity Web",
    "urls": [
     "https://animaldiversity.org/accounts/Bos_grunniens/"
    ],
    "accessed": "2026-10-23",
    "note": "maximum lifespan in the wild, about 25 years; the source's page covers the yak species in general"
   },
   "body_length_cm": {
    "v": 310,
    "conf": "low",
    "src": "Wikipedia",
    "urls": [
     "https://en.wikipedia.org/wiki/Wild_yak"
    ],
    "accessed": "2026-10-23",
    "lo": 240,
    "hi": 380,
    "note": "head and body 240-380 cm, tail excluded; only Wikipedia found"
   }
  }
 }
};
