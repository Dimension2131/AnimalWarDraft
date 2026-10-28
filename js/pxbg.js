(() => {
const CFG = {"animals":{"night":{"layers":[{"f":"animals_night_0.png","w":2048,"h":112,"off":14,"drift":true,"orb":false},{"f":"animals_night_1.png","w":1024,"h":170,"off":30,"drift":true,"orb":false},{"f":"animals_night_2.png","w":44,"h":44,"off":null,"drift":false,"orb":true},{"f":"animals_night_3.png","w":256,"h":120,"off":null,"drift":true,"orb":false}],"sky":[[0.2,"#05070f"],[0.4,"#0a1020"],[0.58,"#0f1a2e"],[0.74,"#162640"],[0.88,"#223a58"],[1.0,"#30506e"]],"band":"animals_night_band.png","bw":128,"bh":44,"T":300,"ft":2.4,"actors":[{"ai":"fx","tl":1,"layer":1,"wx":630,"ty":59,"an":{"S":{"f":"fall_night.png","v":1,"n":8,"fw":20,"fh":97,"fps":12}}},{"ai":"fx","tl":1,"layer":1,"wx":625,"ty":130,"an":{"S":{"f":"mist_night.png","v":1,"n":8,"fw":30,"fh":30,"fps":5}}}],"fx":{"layer":1,"wet":[[654,1020]],"y":157,"col":"#bfe0ff","depth":5}},"light":{"layers":[{"f":"animals_light_0.png","w":2048,"h":112,"off":14,"drift":true,"orb":false},{"f":"animals_light_1.png","w":1024,"h":170,"off":30,"drift":true,"orb":false},{"f":"animals_light_2.png","w":40,"h":40,"off":null,"drift":false,"orb":true},{"f":"animals_light_3.png","w":512,"h":100,"off":null,"drift":true,"orb":false}],"sky":[[0.25,"#6fb7e8"],[0.45,"#86c5ee"],[0.65,"#a2d3f2"],[0.82,"#c2e2f4"],[1.0,"#e3f1f4"]],"band":"animals_light_band.png","bw":128,"bh":44,"T":300,"ft":2.4,"actors":[{"ai":"fx","tl":1,"layer":1,"wx":630,"ty":59,"an":{"S":{"f":"fall_light.png","v":1,"n":8,"fw":20,"fh":97,"fps":12}}},{"ai":"fx","tl":1,"layer":1,"wx":625,"ty":130,"an":{"S":{"f":"mist_light.png","v":1,"n":8,"fw":30,"fh":30,"fps":5}}}],"fx":{"layer":1,"wet":[[654,1020]],"y":157,"col":"#ffffff","depth":5}}},"pokemon":{"night":{"layers":[{"f":"pokemon_night_0.png","w":3840,"h":300,"off":0,"drift":true,"orb":false},{"f":"pokemon_night_1.png","w":1024,"h":130,"off":100,"drift":true,"orb":false},{"f":"pokemon_night_2.png","w":44,"h":44,"off":null,"drift":false,"orb":true},{"f":"pokemon_night_3.png","w":256,"h":130,"off":null,"drift":true,"orb":false}],"sky":[[0.22,"#070816"],[0.4,"#0c0f2c"],[0.56,"#151740"],[0.7,"#231a52"],[0.82,"#3a2260"],[1.0,"#5b2d6c"]],"band":"pokemon_night_band.png","bw":128,"bh":40,"T":520,"ft":2.4,"actors":[{"ai":"swim","layer":0,"an":{"L":{"f":"lapras_L.png","n":3,"fw":37,"fh":42,"fps":3},"R":{"f":"lapras_R.png","n":3,"fw":37,"fh":42,"fps":3}},"range":[1750,2150],"vx":5,"gy":164,"bob":1.2},{"ai":"swim","layer":0,"an":{"L":{"f":"mantine_L.png","n":3,"fw":42,"fh":28,"fps":3},"R":{"f":"mantine_R.png","n":3,"fw":42,"fh":28,"fps":3}},"range":[1800,2200],"vx":3.5,"gy":212,"bob":1},{"ai":"swim","layer":0,"follow":1,"off":[-30,8],"an":{"L":{"f":"mantyke_L.png","n":1,"fw":44,"fh":17,"fps":3},"R":{"f":"mantyke_R.png","n":1,"fw":44,"fh":17,"fps":3}},"gy":220,"bob":1.6},{"ai":"swim","layer":0,"follow":1,"off":[-54,-6],"an":{"L":{"f":"mantyke_L.png","n":1,"fw":44,"fh":17,"fps":3},"R":{"f":"mantyke_R.png","n":1,"fw":44,"fh":17,"fps":3}},"gy":204,"bob":1.3},{"ai":"jump","layer":0,"an":{"L":{"f":"magikarp_L.png","n":3,"fw":23,"fh":27,"fps":6},"R":{"f":"magikarp_R.png","n":3,"fw":23,"fh":27,"fps":6}},"range":[1700,2250],"gy":154,"peak":46,"dur":1.5,"vx":26},{"ai":"alt","layer":0,"an":{"S":{"f":"staryu_r0.png","n":3,"fw":21,"fh":20,"fps":4},"T":{"f":"staryu_r2.png","n":3,"fw":19,"fh":22,"fps":4}},"wx":969,"g":[110,109,108,107,106,105,105,104,104,104,104,105,105,106,106,107,108,109,110,110,111,111,112,112,112,112,111,111,110,110,109,108,108,107,106,106,106,106,106,106,106,106,107,107,108,109,110,110,111,112,112,113,113,113,114,114,114,113,113,113,113,113,112,112,112,112,112,112,113,113,113,113,114,114,114,115,115,115,115,115,114,114,114,113,113,112,111,111,110,110,109,109,110,110,110,111,112,113,115,116,117,119,121,122,124,126,127,129,130,132,133,134,136,137,138,139,141,142,143,145,147,149,151,153,155,158,160,163,165,168,171,174,177,179,182,185,188,190,193,195,198,201,203,206,208,211,214,216,219,222,224,227,230,232,235,238,240,242,244,247,248,250,252,253,254,255,256,257,258,258,259,260,260,261,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,278,279,280,280,280,280,280,280,280,280,279,279,278,277,276,276,275,274,273,272,271,270,270,269,269,269,269,269,269,269,269,270,270,271,272,273,274,275,275,276,277,278,279,279,280,280,280,280,280,280,280,280,279,278,278,277,276,275,274,273,273,272,271,270,270,269,269,269,269,269,269,269,269,270,271,271,272,273,274,275,276,277,277,278,279,279,280,280,280,280,280,280,280,279,279,278,277,276,275,273,270,268,265,261,258,254,251,247,243,239,235,231,227,223,219,215,211,207,203,199,195,190,186,181,177,172,167,162,157,153,148,143,139,135,131,127,124,121,118,116,114,113,112,111,111,111,111,112,112,112,113,113,113,113,113,112,112,111,110,109,108,109,109,110,111,112,112,111,109,107,104,103,103,104,105,107,109,111,111,110,108,105,102,99,96,94,93,93,94,96,97,98,98,97,96,94,92,90,90,91,92,95,98,101,103,104,104,102,100,98,95,93,92,92,93,94,96,97,98,97,96,94,92,90,89,89,90,93,96,100,103,106,108,109,108,107,106,105,104,105,106,108,110,112,113,113,113,111,110,108,108,107,108,108,109,110,110,111,111,112,112,113,114,114,115,115,115,115,116,115,115,115,115,114,114,113,113,112,112,111,111,111,111,110,110,111,111,111],"gs":8,"dy":3,"period":6},{"ai":"walk","layer":0,"an":{"R":{"f":"charmander_R.png","n":8,"fw":30,"fh":25,"fps":8},"L":{"f":"charmander_L.png","n":8,"fw":30,"fh":25,"fps":8},"dR":{"f":"ch_dR.png","n":5,"fw":36,"fh":49,"fps":8},"dL":{"f":"ch_dL.png","n":5,"fw":36,"fh":49,"fps":8},"m":{"f":"ch_m.png","n":3,"fw":30,"fh":14,"fps":4},"uR":{"f":"ch_uR.png","n":4,"fw":38,"fh":65,"fps":8},"uL":{"f":"ch_uL.png","n":4,"fw":38,"fh":65,"fps":8},"zR":{"f":"ch_zR.png","n":4,"fw":26,"fh":24,"fps":2},"zL":{"f":"ch_zL.png","n":4,"fw":26,"fh":24,"fps":2}},"range":[2780,2990],"vx":8,"g":[110,109,108,107,106,105,105,104,104,104,104,105,105,106,106,107,108,109,110,110,111,111,112,112,112,112,111,111,110,110,109,108,108,107,106,106,106,106,106,106,106,106,107,107,108,109,110,110,111,112,112,113,113,113,114,114,114,113,113,113,113,113,112,112,112,112,112,112,113,113,113,113,114,114,114,115,115,115,115,115,114,114,114,113,113,112,111,111,110,110,109,109,110,110,110,111,112,113,115,116,117,119,121,122,124,126,127,129,130,132,133,134,136,137,138,139,141,142,143,145,147,149,151,153,155,158,160,163,165,168,171,174,177,179,182,185,188,190,193,195,198,201,203,206,208,211,214,216,219,222,224,227,230,232,235,238,240,242,244,247,248,250,252,253,254,255,256,257,258,258,259,260,260,261,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,278,279,280,280,280,280,280,280,280,280,279,279,278,277,276,276,275,274,273,272,271,270,270,269,269,269,269,269,269,269,269,270,270,271,272,273,274,275,275,276,277,278,279,279,280,280,280,280,280,280,280,280,279,278,278,277,276,275,274,273,273,272,271,270,270,269,269,269,269,269,269,269,269,270,271,271,272,273,274,275,276,277,277,278,279,279,280,280,280,280,280,280,280,279,279,278,277,276,275,273,270,268,265,261,258,254,251,247,243,239,235,231,227,223,219,215,211,207,203,199,195,190,186,181,177,172,167,162,157,153,148,143,139,135,131,127,124,121,118,116,114,113,112,111,111,111,111,112,112,112,113,113,113,113,113,112,112,111,110,109,108,109,109,110,111,112,112,111,109,107,104,103,103,104,105,107,109,111,111,110,108,105,102,99,96,94,93,93,94,96,97,98,98,97,96,94,92,90,90,91,92,95,98,101,103,104,104,102,100,98,95,93,92,92,93,94,96,97,98,97,96,94,92,90,89,89,90,93,96,100,103,106,108,109,108,107,106,105,104,105,106,108,110,112,113,113,113,111,110,108,108,107,108,108,109,110,110,111,111,112,112,113,114,114,115,115,115,115,116,115,115,115,115,114,114,113,113,112,112,111,111,111,111,110,110,111,111,111],"gs":8,"dy":4},{"ai":"still","layer":0,"an":{"S":{"f":"bulbasaur.png","n":10,"fw":29,"fh":28,"fps":5}},"wx":320,"g":[110,109,108,107,106,105,105,104,104,104,104,105,105,106,106,107,108,109,110,110,111,111,112,112,112,112,111,111,110,110,109,108,108,107,106,106,106,106,106,106,106,106,107,107,108,109,110,110,111,112,112,113,113,113,114,114,114,113,113,113,113,113,112,112,112,112,112,112,113,113,113,113,114,114,114,115,115,115,115,115,114,114,114,113,113,112,111,111,110,110,109,109,110,110,110,111,112,113,115,116,117,119,121,122,124,126,127,129,130,132,133,134,136,137,138,139,141,142,143,145,147,149,151,153,155,158,160,163,165,168,171,174,177,179,182,185,188,190,193,195,198,201,203,206,208,211,214,216,219,222,224,227,230,232,235,238,240,242,244,247,248,250,252,253,254,255,256,257,258,258,259,260,260,261,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,278,279,280,280,280,280,280,280,280,280,279,279,278,277,276,276,275,274,273,272,271,270,270,269,269,269,269,269,269,269,269,270,270,271,272,273,274,275,275,276,277,278,279,279,280,280,280,280,280,280,280,280,279,278,278,277,276,275,274,273,273,272,271,270,270,269,269,269,269,269,269,269,269,270,271,271,272,273,274,275,276,277,277,278,279,279,280,280,280,280,280,280,280,279,279,278,277,276,275,273,270,268,265,261,258,254,251,247,243,239,235,231,227,223,219,215,211,207,203,199,195,190,186,181,177,172,167,162,157,153,148,143,139,135,131,127,124,121,118,116,114,113,112,111,111,111,111,112,112,112,113,113,113,113,113,112,112,111,110,109,108,109,109,110,111,112,112,111,109,107,104,103,103,104,105,107,109,111,111,110,108,105,102,99,96,94,93,93,94,96,97,98,98,97,96,94,92,90,90,91,92,95,98,101,103,104,104,102,100,98,95,93,92,92,93,94,96,97,98,97,96,94,92,90,89,89,90,93,96,100,103,106,108,109,108,107,106,105,104,105,106,108,110,112,113,113,113,111,110,108,108,107,108,108,109,110,110,111,111,112,112,113,114,114,115,115,115,115,116,115,115,115,115,114,114,113,113,112,112,111,111,111,111,110,110,111,111,111],"gs":8,"dy":4},{"mode":"screen","an":{"R":{"f":"altaria_R.png","n":4,"fw":27,"fh":30,"fps":4}},"yf":0.14,"sp":28,"x0":100,"amp":14,"per":0.55},{"ai":"fx","tl":1,"layer":0,"wx":3128,"ty":-52,"an":{"S":{"f":"smoke_night.png","v":1,"n":8,"fw":44,"fh":64,"fps":4}}},{"ai":"fx","tl":1,"layer":0,"wx":3128,"ty":10,"an":{"S":{"f":"lava.png","v":1,"n":6,"fw":44,"fh":70,"fps":7}}},{"ai":"range","layer":0,"an":{"S":{"f":"oddish.png","n":6,"fw":43,"fh":40,"fps":5}},"range":[100,500],"vx":4,"g":[110,109,108,107,106,105,105,104,104,104,104,105,105,106,106,107,108,109,110,110,111,111,112,112,112,112,111,111,110,110,109,108,108,107,106,106,106,106,106,106,106,106,107,107,108,109,110,110,111,112,112,113,113,113,114,114,114,113,113,113,113,113,112,112,112,112,112,112,113,113,113,113,114,114,114,115,115,115,115,115,114,114,114,113,113,112,111,111,110,110,109,109,110,110,110,111,112,113,115,116,117,119,121,122,124,126,127,129,130,132,133,134,136,137,138,139,141,142,143,145,147,149,151,153,155,158,160,163,165,168,171,174,177,179,182,185,188,190,193,195,198,201,203,206,208,211,214,216,219,222,224,227,230,232,235,238,240,242,244,247,248,250,252,253,254,255,256,257,258,258,259,260,260,261,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,278,279,280,280,280,280,280,280,280,280,279,279,278,277,276,276,275,274,273,272,271,270,270,269,269,269,269,269,269,269,269,270,270,271,272,273,274,275,275,276,277,278,279,279,280,280,280,280,280,280,280,280,279,278,278,277,276,275,274,273,273,272,271,270,270,269,269,269,269,269,269,269,269,270,271,271,272,273,274,275,276,277,277,278,279,279,280,280,280,280,280,280,280,279,279,278,277,276,275,273,270,268,265,261,258,254,251,247,243,239,235,231,227,223,219,215,211,207,203,199,195,190,186,181,177,172,167,162,157,153,148,143,139,135,131,127,124,121,118,116,114,113,112,111,111,111,111,112,112,112,113,113,113,113,113,112,112,111,110,109,108,109,109,110,111,112,112,111,109,107,104,103,103,104,105,107,109,111,111,110,108,105,102,99,96,94,93,93,94,96,97,98,98,97,96,94,92,90,90,91,92,95,98,101,103,104,104,102,100,98,95,93,92,92,93,94,96,97,98,97,96,94,92,90,89,89,90,93,96,100,103,106,108,109,108,107,106,105,104,105,106,108,110,112,113,113,113,111,110,108,108,107,108,108,109,110,110,111,111,112,112,113,114,114,115,115,115,115,116,115,115,115,115,114,114,113,113,112,112,111,111,111,111,110,110,111,111,111],"gs":8,"dy":4}],"fx":{"layer":0,"wet":[[976,2572]],"y":150,"col":"#d8e0ff"}},"light":{"layers":[{"f":"pokemon_light_0.png","w":3840,"h":300,"off":0,"drift":true,"orb":false},{"f":"pokemon_light_1.png","w":1024,"h":130,"off":100,"drift":true,"orb":false},{"f":"pokemon_light_2.png","w":40,"h":40,"off":null,"drift":false,"orb":true},{"f":"pokemon_light_3.png","w":512,"h":110,"off":null,"drift":true,"orb":false}],"sky":[[0.25,"#7aa8e8"],[0.45,"#9cb4ee"],[0.62,"#c4b4ee"],[0.78,"#eab4c4"],[1.0,"#f6c8b0"]],"band":"pokemon_light_band.png","bw":128,"bh":40,"T":520,"ft":2.4,"actors":[{"ai":"swim","layer":0,"an":{"L":{"f":"lapras_L.png","n":3,"fw":37,"fh":42,"fps":3},"R":{"f":"lapras_R.png","n":3,"fw":37,"fh":42,"fps":3}},"range":[1750,2150],"vx":5,"gy":164,"bob":1.2},{"ai":"swim","layer":0,"an":{"L":{"f":"mantine_L.png","n":3,"fw":42,"fh":28,"fps":3},"R":{"f":"mantine_R.png","n":3,"fw":42,"fh":28,"fps":3}},"range":[1800,2200],"vx":3.5,"gy":212,"bob":1},{"ai":"swim","layer":0,"follow":1,"off":[-30,8],"an":{"L":{"f":"mantyke_L.png","n":1,"fw":44,"fh":17,"fps":3},"R":{"f":"mantyke_R.png","n":1,"fw":44,"fh":17,"fps":3}},"gy":220,"bob":1.6},{"ai":"swim","layer":0,"follow":1,"off":[-54,-6],"an":{"L":{"f":"mantyke_L.png","n":1,"fw":44,"fh":17,"fps":3},"R":{"f":"mantyke_R.png","n":1,"fw":44,"fh":17,"fps":3}},"gy":204,"bob":1.3},{"ai":"jump","layer":0,"an":{"L":{"f":"magikarp_L.png","n":3,"fw":23,"fh":27,"fps":6},"R":{"f":"magikarp_R.png","n":3,"fw":23,"fh":27,"fps":6}},"range":[1700,2250],"gy":154,"peak":46,"dur":1.5,"vx":26},{"ai":"alt","layer":0,"an":{"S":{"f":"staryu_r0.png","n":3,"fw":21,"fh":20,"fps":4},"T":{"f":"staryu_r2.png","n":3,"fw":19,"fh":22,"fps":4}},"wx":969,"g":[110,109,108,107,106,105,105,104,104,104,104,105,105,106,106,107,108,109,110,110,111,111,112,112,112,112,111,111,110,110,109,108,108,107,106,106,106,106,106,106,106,106,107,107,108,109,110,110,111,112,112,113,113,113,114,114,114,113,113,113,113,113,112,112,112,112,112,112,113,113,113,113,114,114,114,115,115,115,115,115,114,114,114,113,113,112,111,111,110,110,109,109,110,110,110,111,112,113,115,116,117,119,121,122,124,126,127,129,130,132,133,134,136,137,138,139,141,142,143,145,147,149,151,153,155,158,160,163,165,168,171,174,177,179,182,185,188,190,193,195,198,201,203,206,208,211,214,216,219,222,224,227,230,232,235,238,240,242,244,247,248,250,252,253,254,255,256,257,258,258,259,260,260,261,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,278,279,280,280,280,280,280,280,280,280,279,279,278,277,276,276,275,274,273,272,271,270,270,269,269,269,269,269,269,269,269,270,270,271,272,273,274,275,275,276,277,278,279,279,280,280,280,280,280,280,280,280,279,278,278,277,276,275,274,273,273,272,271,270,270,269,269,269,269,269,269,269,269,270,271,271,272,273,274,275,276,277,277,278,279,279,280,280,280,280,280,280,280,279,279,278,277,276,275,273,270,268,265,261,258,254,251,247,243,239,235,231,227,223,219,215,211,207,203,199,195,190,186,181,177,172,167,162,157,153,148,143,139,135,131,127,124,121,118,116,114,113,112,111,111,111,111,112,112,112,113,113,113,113,113,112,112,111,110,109,108,109,109,110,111,112,112,111,109,107,104,103,103,104,105,107,109,111,111,110,108,105,102,99,96,94,93,93,94,96,97,98,98,97,96,94,92,90,90,91,92,95,98,101,103,104,104,102,100,98,95,93,92,92,93,94,96,97,98,97,96,94,92,90,89,89,90,93,96,100,103,106,108,109,108,107,106,105,104,105,106,108,110,112,113,113,113,111,110,108,108,107,108,108,109,110,110,111,111,112,112,113,114,114,115,115,115,115,116,115,115,115,115,114,114,113,113,112,112,111,111,111,111,110,110,111,111,111],"gs":8,"dy":3,"period":6},{"ai":"walk","layer":0,"an":{"R":{"f":"charmander_R.png","n":8,"fw":30,"fh":25,"fps":8},"L":{"f":"charmander_L.png","n":8,"fw":30,"fh":25,"fps":8},"dR":{"f":"ch_dR.png","n":5,"fw":36,"fh":49,"fps":8},"dL":{"f":"ch_dL.png","n":5,"fw":36,"fh":49,"fps":8},"m":{"f":"ch_m.png","n":3,"fw":30,"fh":14,"fps":4},"uR":{"f":"ch_uR.png","n":4,"fw":38,"fh":65,"fps":8},"uL":{"f":"ch_uL.png","n":4,"fw":38,"fh":65,"fps":8},"zR":{"f":"ch_zR.png","n":4,"fw":26,"fh":24,"fps":2},"zL":{"f":"ch_zL.png","n":4,"fw":26,"fh":24,"fps":2}},"range":[2780,2990],"vx":8,"g":[110,109,108,107,106,105,105,104,104,104,104,105,105,106,106,107,108,109,110,110,111,111,112,112,112,112,111,111,110,110,109,108,108,107,106,106,106,106,106,106,106,106,107,107,108,109,110,110,111,112,112,113,113,113,114,114,114,113,113,113,113,113,112,112,112,112,112,112,113,113,113,113,114,114,114,115,115,115,115,115,114,114,114,113,113,112,111,111,110,110,109,109,110,110,110,111,112,113,115,116,117,119,121,122,124,126,127,129,130,132,133,134,136,137,138,139,141,142,143,145,147,149,151,153,155,158,160,163,165,168,171,174,177,179,182,185,188,190,193,195,198,201,203,206,208,211,214,216,219,222,224,227,230,232,235,238,240,242,244,247,248,250,252,253,254,255,256,257,258,258,259,260,260,261,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,278,279,280,280,280,280,280,280,280,280,279,279,278,277,276,276,275,274,273,272,271,270,270,269,269,269,269,269,269,269,269,270,270,271,272,273,274,275,275,276,277,278,279,279,280,280,280,280,280,280,280,280,279,278,278,277,276,275,274,273,273,272,271,270,270,269,269,269,269,269,269,269,269,270,271,271,272,273,274,275,276,277,277,278,279,279,280,280,280,280,280,280,280,279,279,278,277,276,275,273,270,268,265,261,258,254,251,247,243,239,235,231,227,223,219,215,211,207,203,199,195,190,186,181,177,172,167,162,157,153,148,143,139,135,131,127,124,121,118,116,114,113,112,111,111,111,111,112,112,112,113,113,113,113,113,112,112,111,110,109,108,109,109,110,111,112,112,111,109,107,104,103,103,104,105,107,109,111,111,110,108,105,102,99,96,94,93,93,94,96,97,98,98,97,96,94,92,90,90,91,92,95,98,101,103,104,104,102,100,98,95,93,92,92,93,94,96,97,98,97,96,94,92,90,89,89,90,93,96,100,103,106,108,109,108,107,106,105,104,105,106,108,110,112,113,113,113,111,110,108,108,107,108,108,109,110,110,111,111,112,112,113,114,114,115,115,115,115,116,115,115,115,115,114,114,113,113,112,112,111,111,111,111,110,110,111,111,111],"gs":8,"dy":4},{"ai":"still","layer":0,"an":{"S":{"f":"bulbasaur.png","n":10,"fw":29,"fh":28,"fps":5}},"wx":320,"g":[110,109,108,107,106,105,105,104,104,104,104,105,105,106,106,107,108,109,110,110,111,111,112,112,112,112,111,111,110,110,109,108,108,107,106,106,106,106,106,106,106,106,107,107,108,109,110,110,111,112,112,113,113,113,114,114,114,113,113,113,113,113,112,112,112,112,112,112,113,113,113,113,114,114,114,115,115,115,115,115,114,114,114,113,113,112,111,111,110,110,109,109,110,110,110,111,112,113,115,116,117,119,121,122,124,126,127,129,130,132,133,134,136,137,138,139,141,142,143,145,147,149,151,153,155,158,160,163,165,168,171,174,177,179,182,185,188,190,193,195,198,201,203,206,208,211,214,216,219,222,224,227,230,232,235,238,240,242,244,247,248,250,252,253,254,255,256,257,258,258,259,260,260,261,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,278,279,280,280,280,280,280,280,280,280,279,279,278,277,276,276,275,274,273,272,271,270,270,269,269,269,269,269,269,269,269,270,270,271,272,273,274,275,275,276,277,278,279,279,280,280,280,280,280,280,280,280,279,278,278,277,276,275,274,273,273,272,271,270,270,269,269,269,269,269,269,269,269,270,271,271,272,273,274,275,276,277,277,278,279,279,280,280,280,280,280,280,280,279,279,278,277,276,275,273,270,268,265,261,258,254,251,247,243,239,235,231,227,223,219,215,211,207,203,199,195,190,186,181,177,172,167,162,157,153,148,143,139,135,131,127,124,121,118,116,114,113,112,111,111,111,111,112,112,112,113,113,113,113,113,112,112,111,110,109,108,109,109,110,111,112,112,111,109,107,104,103,103,104,105,107,109,111,111,110,108,105,102,99,96,94,93,93,94,96,97,98,98,97,96,94,92,90,90,91,92,95,98,101,103,104,104,102,100,98,95,93,92,92,93,94,96,97,98,97,96,94,92,90,89,89,90,93,96,100,103,106,108,109,108,107,106,105,104,105,106,108,110,112,113,113,113,111,110,108,108,107,108,108,109,110,110,111,111,112,112,113,114,114,115,115,115,115,116,115,115,115,115,114,114,113,113,112,112,111,111,111,111,110,110,111,111,111],"gs":8,"dy":4},{"mode":"screen","an":{"R":{"f":"altaria_R.png","n":4,"fw":27,"fh":30,"fps":4}},"yf":0.14,"sp":28,"x0":100,"amp":14,"per":0.55},{"ai":"fx","tl":1,"layer":0,"wx":3128,"ty":-52,"an":{"S":{"f":"smoke_light.png","v":1,"n":8,"fw":44,"fh":64,"fps":4}}},{"ai":"fx","tl":1,"layer":0,"wx":3128,"ty":10,"an":{"S":{"f":"lava.png","v":1,"n":6,"fw":44,"fh":70,"fps":7}}}],"fx":{"layer":0,"wet":[[976,2572]],"y":150,"col":"#ffffff"}}},"football":{"light":{"layers":[{"f":"football_light_0.png","w":512,"h":90,"off":22,"drift":false,"orb":false},{"f":"football_light_1.png","w":512,"h":100,"off":null,"drift":true,"orb":false}],"sky":[[0.3,"#4a98e0"],[0.55,"#66aee8"],[0.78,"#90c4ee"],[1.0,"#f4d4a8"]],"band":"football_light_band.png","bw":160,"bh":48,"T":900,"ft":1.6},"night":{"layers":[{"f":"football_night_0.png","w":512,"h":90,"off":22,"drift":false,"orb":false},{"f":"football_night_1.png","w":256,"h":100,"off":null,"drift":true,"orb":false}],"sky":[[0.25,"#02060d"],[0.45,"#04101e"],[0.62,"#071a2e"],[0.78,"#0a2238"],[1.0,"#11334b"]],"band":"football_night_band.png","bw":160,"bh":48,"T":900,"ft":1.6}},"basketball":{"night":{"layers":[{"f":"basketball_night_0.png","w":340,"h":96,"off":34,"drift":false,"orb":false,"once":true,"game":true},{"f":"basketball_night_f.png","w":165,"h":96,"off":34,"drift":false,"orb":false},{"f":"basketball_night_1.png","w":512,"h":104,"off":64,"drift":false,"orb":false},{"f":"basketball_night_2.png","w":512,"h":84,"off":null,"drift":false,"orb":false}],"sky":[[0.2,"#05060c"],[0.45,"#0a0c18"],[0.7,"#120e18"],[0.9,"#1c1218"],[1.0,"#26150f"]],"band":"basketball_night_band.png","bw":160,"bh":40,"T":900,"ft":1.4,"game":true,"actors":[]},"light":{"layers":[{"f":"basketball_light_0.png","w":340,"h":96,"off":34,"drift":false,"orb":false,"once":true,"game":true},{"f":"basketball_light_f.png","w":165,"h":96,"off":34,"drift":false,"orb":false},{"f":"basketball_light_1.png","w":512,"h":104,"off":64,"drift":false,"orb":false},{"f":"basketball_light_2.png","w":512,"h":84,"off":null,"drift":false,"orb":false}],"sky":[[0.25,"#93a6c8"],[0.5,"#a8b8d6"],[0.75,"#c2cde2"],[1.0,"#dce2f0"]],"band":"basketball_light_band.png","bw":160,"bh":40,"T":900,"ft":1.4,"game":true,"actors":[]}}}, B = 'assets/pxbg/', IM = {}, R = document.documentElement;
const still = matchMedia('(prefers-reduced-motion: reduce)').matches, every = matchMedia('(pointer: coarse)').matches ? 2 : 1;
const t0 = performance.now(), now = () => (performance.now() - t0) / 1000;
const img = f => IM[f] || (IM[f] = Object.assign(new Image(), { src: B + f, onload: still ? () => draw(now()) : null }));
const ok = i => i.complete && i.naturalWidth;
const cv = document.createElement('canvas'); cv.id = 'pxcv';
cv.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:-1;pointer-events:none;image-rendering:pixelated';
document.body.prepend(cv); R.classList.add('cv');
const g = cv.getContext('2d', { alpha: false }); let S = 4, W = 1, H = 1, n = 0;
const cfg = () => (CFG[R.dataset.world] || CFG.animals)[R.dataset.theme === 'light' ? 'light' : 'night'], sn = v => Math.round(v * S) / S;
function size() { const w = innerWidth, h = innerHeight; S = w > 900 ? 4 : w > 520 ? 3 : 2; cv.width = w; cv.height = h; W = w / S; H = h / S; draw(now()); }
const AS = new Map(), ptr = { x: -9e3, y: -9e3 }, rnd = (a, b) => a + Math.random() * (b - a);
addEventListener('pointermove', e => { ptr.x = e.clientX; ptr.y = e.clientY; }); addEventListener('pointerdown', e => { ptr.x = e.clientX; ptr.y = e.clientY; });
const stOf = (a, t) => { let s = AS.get(a); if (!s) AS.set(a, s = { x: a.range ? rnd(a.range[0], a.range[1]) : (a.wx || 0), dir: Math.random() < .5 ? 1 : -1, st: 'move', t0: t, lt: t, next: t + rnd(6, 16), hit: 0 }); return s; };
function move(a, s, dt) { s.x += s.dir * a.vx * dt; if (s.x > a.range[1]) { s.x = a.range[1]; s.dir = -1; } else if (s.x < a.range[0]) { s.x = a.range[0]; s.dir = 1; } }
function step(a, s, t, night, c) {
  const dt = Math.min(.1, t - s.lt); s.lt = t; const el = t - s.t0;
  if (a.follow != null) { const L = AS.get(c.actors[a.follow]); if (L) { s.x = L.x + a.off[0] * L.dir; s.dir = L.dir; } return; }
  if (a.ai === 'walk') {
    const an = a.an;
    if (s.hit && (s.st === 'move' || s.st === 'sleep')) { s.st = 'dig'; s.t0 = t; }
    else if (s.st === 'dig' && el > an.dR.n / an.dR.fps) { s.st = 'm'; s.t0 = t; }
    else if (s.st === 'm' && el > 5) { s.st = 'up'; s.t0 = t; }
    else if (s.st === 'up' && el > an.uR.n / an.uR.fps) { s.st = 'move'; s.t0 = t; s.next = t + rnd(8, 20); }
    else if (s.st === 'move') { move(a, s, dt); if (t > s.next) { if (Math.random() < (night ? .65 : .12)) { s.st = 'sleep'; s.next = t + rnd(14, 28); } else s.next = t + rnd(8, 20); s.t0 = t; } }
    else if (s.st === 'sleep' && t > s.next) { s.st = 'move'; s.t0 = t; s.next = t + rnd(10, 20); }
    s.hit = 0;
  } else if (a.ai === 'jump') {
    if (s.st === 'move') { if (t > s.next) { s.st = 'air'; s.t0 = t; s.x = rnd(a.range[0], a.range[1]); s.dir = Math.random() < .5 ? 1 : -1; } }
    else { s.x += s.dir * a.vx * dt; if (el > a.dur) { s.st = 'move'; s.next = t + rnd(5, 11); } }
  } else if (a.range) move(a, s, dt);
}
function pick(a, s, t) {
  const dr = s.dir > 0 ? 'R' : 'L', an = a.an; let k;
  if (a.ai === 'walk') k = s.st === 'move' ? dr : s.st === 'sleep' ? 'z' + dr : s.st === 'dig' ? 'd' + dr : s.st === 'm' ? 'm' : 'u' + dr;
  else if (a.ai === 'alt') k = Math.floor(t / a.period) % 3 === 2 ? 'T' : 'S';
  else k = an[dr] ? dr : 'S';
  const A = an[k] || an.S || an[dr], once = k[0] === 'd' || k[0] === 'u', f = Math.floor((t - s.t0) * A.fps);
  return [A, once ? Math.min(A.n - 1, f) : ((f % A.n) + A.n) % A.n];
}
const gAt = (a, x, Wt) => { const i = (((x % Wt) + Wt) % Wt) / a.gs, i0 = Math.floor(i), f = i - i0, G = a.g; return G[i0 % G.length] * (1 - f) + G[(i0 + 1) % G.length] * f; };
function worldActor(a, L, c, t, top, o, night) {
  const s = stOf(a, t); step(a, s, t, night, c);
  if (a.ai === 'jump' && s.st !== 'air') return;
  const [A, fr] = pick(a, s, t), im = img(A.f); if (!ok(im)) return;
  const air = a.ai === 'jump' ? (t - s.t0) / a.dur : 0;
  const gy = a.tl ? top + a.ty + A.fh : top + (a.g ? gAt(a, s.x, L.w) + (a.dy || 0) : a.gy) + (a.bob ? Math.sin(t * a.bob * 2) * 1.5 : 0);
  const foot = gy - (air ? a.peak * 4 * air * (1 - air) : 0), sxs = A.v ? 0 : fr * A.fw, sys = A.v ? fr * A.fh : 0;
  for (let k = -1; ; k++) {
    const cx = (a.tl ? a.wx + A.fw / 2 : s.x) + k * L.w - o; if (cx - A.fw / 2 > W) break; if (cx + A.fw / 2 < 0) continue;
    const dx = cx - A.fw / 2, dy = foot - A.fh;
    if (a.ai === 'walk' && ptr.x / S > dx && ptr.x / S < dx + A.fw && ptr.y / S > dy && ptr.y / S < dy + A.fh) s.hit = 1;
    if (air) {
      g.save(); g.translate(cx, dy + A.fh / 2); if (s.dir > 0) g.scale(-1, 1); g.rotate(Math.atan2(a.peak * 4 * (1 - 2 * air) / a.dur, a.vx));
      g.drawImage(im, sxs, sys, A.fw, A.fh, -A.fw / 2, -A.fh / 2, A.fw, A.fh); g.restore();
    } else g.drawImage(im, sxs, sys, A.fw, A.fh, sn(dx), sn(dy), A.fw, A.fh);
  }
}
function screenActor(a, t) {
  const A = a.an.R, im = img(A.f); if (!ok(im)) return;
  const span = W + A.fw * 2, x = ((a.x0 + t * a.sp) % span) - A.fw, y = a.yf * H + Math.sin(t * a.per) * a.amp;
  g.drawImage(im, (Math.floor(t * A.fps) % A.n) * A.fw, 0, A.fw, A.fh, sn(x), sn(y), A.fw, A.fh);
}
function water(f, t, top, o, Wt) {
  const y0 = sn(top + f.y), T = Math.floor(t * 3), fo = o % 1; g.fillStyle = f.col;
  for (let x = 0; x <= W; x++) {
    const wx = (Math.floor(x + o) % Wt + Wt) % Wt; let d = -1;
    for (const [a, b] of f.wet) if (wx >= a && wx < b) { d = Math.min(wx - a, b - wx); break; }
    if (d < 0) continue; const px = x - fo;
    g.globalAlpha = 1; if (Math.sin(wx * .35 + t * 2.2) + Math.sin(wx * .13 - t * 1.3) > 1.3) g.fillRect(px, y0, 1, 1);
    if (d < 4 && (wx + T) % 3 === 0) { g.globalAlpha = .9; g.fillRect(px, y0 - (d < 2 ? 1 : 0), 1, 1); }
    g.globalAlpha = .55; for (let r = 2; r < (f.depth || 16); r += 2) if ((wx * 7 + r * 13 + Math.floor(t * 2 + r)) % 23 === 0) g.fillRect(px, y0 + r, 2 + (r % 3), 1);
  }
  g.globalAlpha = 1;
}
// ---- Basketball: a live 3v3 game on the court layer (c.game). Passing, steals, jump shots, dunks, rebounds; scoreboard + clock on the hanging cube; 4 quarters, then FINAL, then a new game. Starts fresh on every page load.
const BB = { CW: 340, RL: [32, 30], RR: [310, 30], SPD: 8, QS: 720, POSE: { run: 0, dribble: 1, defend: 2, shoot: 3, dunk: 4, stand: 5 } };
const G = { p: [], T: [[], []], ball: { h: null, f: null, rest: null, x: 170, y: 82 }, st: 'live', tm: 0, lt: 0, q: 1, clock: BB.QS, sc: [0, 0], off: 0, dir: 1, passes: 0, qend: false, made: false, spot: 80 };
const GL = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001001001', 8: '111101111101111', 9: '111101111001111', F: '111100110100100', I: '111010010010111', N: '101111111111101', A: '111101111101101', L: '100100100100111', O: '111101101101111' };
const dirOf = tm => ((tm === 0) === (G.q < 3)) ? 1 : -1, hoopOf = dir => dir > 0 ? BB.RR : BB.RL, dist = (a, b) => Math.hypot(a.x - b.x, a.d - b.d);
const nearest = (arr, x, y) => arr.reduce((a, b) => Math.hypot(a.x - x, a.d - y) <= Math.hypot(b.x - x, b.d - y) ? a : b);
function bbInit() {
  G.p = []; G.T = [[], []];
  for (let tm = 0; tm < 2; tm++) for (let i = 0; i < 3; i++) { const p = { tm, i, x: 150 + tm * 40 + i * 14, d: 72 + i * 9, tx: 0, td: 0, face: tm ? -1 : 1, spd: 60, lift: 0, fr: 0, pose: 'stand', act: null, mark: null, has: false, mv: false }; p.tx = p.x; p.td = p.d; G.p.push(p); G.T[tm].push(p); }
  G.sc = [0, 0]; G.q = 1; G.clock = BB.QS; G.qend = false; G.ball.h = null; G.ball.f = null; tipoff(0);
}
function tipoff(tm) {   // ball at centre court, the team that gets it fetches it; everybody drifts to the middle
  G.ball.rest = { x: 170, y: 82 }; G.ball.h = null; G.ball.f = null; G.made = true; G.off = tm; G.dir = dirOf(tm);
  G.p.forEach(p => { p.act = null; p.lift = 0; p.has = false; p.tx = 170 + (p.tm ? 1 : -1) * (30 + p.i * 18) * (p.i % 2 ? 1 : -1) * 0 + (p.tm ? 38 : -38) + (p.i - 1) * 6; p.td = 70 + p.i * 9; });
  reb(tm);
}
function reb(forceTm) {
  const R = G.ball.rest, grp = forceTm != null ? G.T[forceTm] : G.T[G.made ? 1 - G.off : (Math.random() < .62 ? 1 - G.off : G.off)];
  G.who = nearest(grp, R.x, R.y); G.st = 'reb'; G.tm = 0;
}
function poss(tm, who) {
  if (G.qend) return brk(who);
  G.off = tm; G.dir = dirOf(tm); G.st = 'adv'; G.tm = 0; G.passes = 1 + (Math.random() < .5 ? 1 : 0);
  G.ball.h = who; G.ball.f = null; G.ball.rest = null; G.p.forEach(p => { p.has = p === who; p.act = null; p.lift = 0; });
  const h = hoopOf(G.dir), off = G.T[tm], def = G.T[1 - tm], oth = off.filter(p => p !== who);
  who.tx = h[0] - G.dir * 100; who.td = rnd(76, 84);
  oth[0].tx = h[0] - G.dir * rnd(70, 90); oth[0].td = 70; oth[1].tx = h[0] - G.dir * rnd(70, 90); oth[1].td = 90;
  off.forEach((p, k) => { def[k].mark = p; });
}
function brk(who) {
  G.st = G.q >= 4 && G.sc[0] !== G.sc[1] ? 'final' : 'break'; G.tm = 0; G.ball.h = who || G.ball.h; if (G.ball.h) G.ball.h.has = true; G.ball.f = null;
  G.p.forEach(p => { p.act = null; p.lift = 0; p.tx = p.x; p.td = p.d; });
}
function fly(f) { G.ball.f = Object.assign({ u: 0, arc: 0, dur: .4 }, f); G.ball.h = null; G.p.forEach(p => p.has = false); }
function score(pts) { G.sc[G.off] += pts; G.made = true; }
function finish(f) {
  G.ball.f = null;
  if (f.done === 'recv') { G.ball.h = f.to; f.to.has = true; G.passes--; G.st = 'set'; G.tm = 0; }
  else if (f.done === 'swap') poss(f.to.tm, f.to);
  else if (f.done === 'rim') {
    const h = hoopOf(G.dir);
    if (f.made) { score(f.pts); fly({ x0: h[0], y0: h[1] + 2, tx: h[0] - G.dir * 2, ty: 84, dur: .5, done: 'rest' }); }
    else { G.made = false; fly({ x0: h[0], y0: h[1], tx: h[0] - G.dir * rnd(12, 45), ty: rnd(72, 88), dur: .55, arc: 14, done: 'rest' }); }
  } else if (f.done === 'rest') G.ball.rest = { x: f.tx, y: f.ty };
}
function doPass() {
  const h = G.ball.h, cand = G.T[G.off].filter(p => p !== h), r = cand[Math.random() < .5 ? 0 : 1], dm = G.T[1 - G.off].find(d => d.mark === r), tgt = Math.random() < .2 ? dm : r;
  G.st = 'pass'; fly({ x0: h.x + h.face * 7, y0: h.d - 14, to: tgt, dur: Math.max(.3, dist(h, r) / 150), arc: 8, done: tgt === r ? 'recv' : 'swap' });
}
function action() {
  const h = G.ball.h, r = Math.random(), dm = G.T[1 - G.off].find(d => d.mark === h), ho = hoopOf(G.dir);
  if (r < .3) { G.st = 'dunk'; G.tm = 0; }
  else if (r < .9) { G.st = 'shoot'; G.tm = 0; G.spot = rnd(52, 92); h.td = rnd(72, 88); }
  else { G.st = 'pass'; fly({ x0: h.x + h.face * 7, y0: h.d - 14, to: dm, dur: .22, done: 'swap' }); }
}
function actStep(p, dt) {
  const a = p.act, ho = hoopOf(G.dir); a.t += dt;
  if (a.k === 'dunk') {
    const u = Math.min(1, a.t / .7), e = Math.min(1, u / .55);
    p.x = a.x0 + (a.tx - a.x0) * e; p.d = a.d0 + (80 - a.d0) * e; p.lift = 22 * 4 * u * (1 - u); p.fr = Math.min(4, Math.floor(u * 5)); p.pose = 'dunk'; p.tx = p.x; p.td = p.d;
    if (u >= .5 && p.has) fly({ x0: p.x + p.face * 8, y0: p.d - p.lift - 38, tx: ho[0], ty: ho[1], dur: .2, done: 'rim', made: true, pts: 2 });
    if (u >= 1) { p.act = null; p.lift = 0; }
  } else {
    const u = Math.min(1, a.t / .75), lift = [0, 1, 3, 4, 1];
    p.fr = Math.min(4, Math.floor(u * 5)); p.lift = lift[p.fr]; p.pose = 'shoot';
    if (u >= .5 && p.has) { const pts = Math.abs(p.x - ho[0]) > 72 ? 3 : 2; fly({ x0: p.x + p.face * 3, y0: p.d - p.lift - 38, tx: ho[0], ty: ho[1], dur: .7, arc: 30, done: 'rim', made: Math.random() < (pts === 3 ? .38 : .52), pts }); }
    if (u >= 1) { p.act = null; p.lift = 0; }
  }
}
function bbStep(t) {
  if (!G.p.length) { bbInit(); G.lt = t; }
  const dt = Math.min(.05, Math.max(0, t - G.lt)); G.lt = t; G.tm += dt;
  if (G.st !== 'break' && G.st !== 'final') { G.clock -= dt * BB.SPD; if (G.clock <= 0) { G.clock = 0; G.qend = true; } }
  const off = G.T[G.off], def = G.T[1 - G.off], h = G.ball.h, ho = hoopOf(G.dir), live = G.st !== 'break' && G.st !== 'final';
  if (G.st === 'break' && G.tm > 4) { G.q++; G.clock = G.q > 4 ? 300 : BB.QS; G.qend = false; tipoff((G.q + 1) % 2); }
  else if (G.st === 'final' && G.tm > 20) { G.sc = [0, 0]; G.q = 1; G.clock = BB.QS; G.qend = false; tipoff(0); }
  else if (G.st === 'adv') { if (dist(h, { x: h.tx, d: h.td }) < 3) { G.st = 'set'; G.tm = 0; } }
  else if (G.st === 'set') { if (G.tm > .55) { if (G.passes > 0) doPass(); else action(); } }
  else if (G.st === 'dunk') { h.tx = ho[0] - G.dir * 14; h.td = 80; h.spd = 80; if (Math.abs(h.x - h.tx) <= 26 || G.tm > 3) { h.act = { k: 'dunk', t: 0, x0: h.x, d0: h.d, tx: h.tx }; G.st = 'live'; G.tm = 0; } }
  else if (G.st === 'shoot') { h.tx = ho[0] - G.dir * G.spot; h.spd = 70; if (dist(h, { x: h.tx, d: h.td }) < 3 || G.tm > 3) { h.act = { k: 'shoot', t: 0 }; G.st = 'live'; G.tm = 0; } }
  else if (G.st === 'live') { if (G.ball.rest && !G.p.some(p => p.act)) reb(); }
  else if (G.st === 'reb') { const R = G.ball.rest || { x: 170, y: 82 }, w = G.who; w.tx = R.x; w.td = R.y; w.spd = 70; if (dist(w, { x: R.x, d: R.y }) < 4 || G.tm > 2.5) { G.ball.rest = null; poss(w.tm, w); } }
  if (live && G.tm > 9 && G.st !== 'reb') { G.p.forEach(p => { p.act = null; p.lift = 0; }); G.ball.f = null; G.ball.rest = { x: 170, y: 82 }; reb(); }
  if (G.ball.f) { const f = G.ball.f; f.u += dt / f.dur; if (f.u >= 1) finish(f); }
  if (live && (G.st === 'adv' || G.st === 'set' || G.st === 'pass' || G.st === 'dunk' || G.st === 'shoot' || G.st === 'live')) {
    def.forEach(d => { if (d.mark && !d.act) { d.tx = d.mark.x + G.dir * 14; d.td = d.mark.d; } });
    if (G.st === 'set' && G.tm % 1.2 < dt) off.forEach(p => { if (!p.has) { p.tx += rnd(-7, 7); p.td = Math.min(90, Math.max(68, p.td + rnd(-5, 5))); } });
  }
  for (const p of G.p) {
    if (p.act) actStep(p, dt); else {
      p.spd = live ? (p.tm === G.off ? (p.has ? 58 : 62) : 52) : 0; if (G.st === 'reb' && p === G.who) p.spd = 70; if (G.st === 'dunk' && p.has) p.spd = 80; if (G.st === 'shoot' && p.has) p.spd = 70;
      const dx = p.tx - p.x, dd = p.td - p.d, L = Math.hypot(dx, dd); p.mv = L > 1.5;
      if (p.mv) { const s = Math.min(L, p.spd * dt); p.x += dx / L * s; p.d += dd / L * s; }
      if (live && G.st !== 'reb') p.face = p.tm === G.off ? G.dir : -G.dir; else if (p.mv && Math.abs(dx) > 1) p.face = dx > 0 ? 1 : -1;
      p.pose = !live ? 'stand' : p.has ? 'dribble' : p.tm !== G.off && G.st !== 'reb' ? 'defend' : p.mv ? 'run' : 'stand';
      p.fr = Math.floor(t * (p.pose === 'defend' ? 6 : p.pose === 'stand' ? 3 : 10) + p.i * 2 + p.tm) % 5;
    }
  }
}
function ballPos(t) {
  const b = G.ball, f = b.f;
  if (f) { const u = Math.min(1, f.u), tx = f.to ? f.to.x + f.to.face * 4 : f.tx, ty = f.to ? f.to.d - 14 : f.ty; return [f.x0 + (tx - f.x0) * u, f.y0 + (ty - f.y0) * u - f.arc * 4 * u * (1 - u)]; }
  const h = b.h; if (h) {
    if (h.pose === 'dribble') return [h.x + h.face * 7, h.d - 3 - Math.abs(Math.sin(t * 8 + h.i)) * 11];
    if (h.pose === 'shoot' || h.pose === 'dunk') return [h.x + h.face * (h.pose === 'dunk' ? 8 : 3), h.d - h.lift - 38];
    return [h.x + h.face * 7, h.d - 12];
  }
  return b.rest ? [b.rest.x, b.rest.y] : [170, 82];
}
function bbDraw(top, ox, t) {
  bbStep(t);
  for (const p of G.p.slice().sort((a, b) => a.d - b.d)) {
    const im = img('basketball_' + (p.tm ? 'away' : 'home') + '_' + (p.face > 0 ? 'R' : 'L') + '.png'); if (!ok(im)) continue;
    g.globalAlpha = .35; g.fillStyle = '#000'; g.fillRect(sn(ox + p.x - 5), sn(top + p.d - 1), 10, 2); g.globalAlpha = 1;
    g.drawImage(im, (BB.POSE[p.pose] * 5 + p.fr) * 20, 0, 20, 32, sn(ox + p.x - 10), sn(top + p.d - 31 - p.lift), 20, 32);
  }
  const bi = img('basketball_ball.png'), [bx, by] = ballPos(t); if (ok(bi)) g.drawImage(bi, sn(ox + bx - 2), sn(top + by - 2));
}
function bbText(s, x, y, k, col) { g.fillStyle = col; for (const ch of String(s)) { const m = GL[ch]; if (m) for (let i = 0; i < 15; i++) if (m[i] === '1') g.fillRect(x + (i % 3) * k, y + ((i / 3) | 0) * k, k, k); x += 4 * k; } }
function bbBoard(night, t) {
  if (!G.p.length) return;
  const bx = Math.round(W / 2 - 30), by = 26, sx = bx + 4, sy = by + 5, amb = night ? '#ffb347' : '#e0922a', tl = night ? '#35e0c0' : '#1f9a8a', fin = G.st === 'final', blink = Math.floor(t * 2) % 2;
  g.fillStyle = night ? '#59607c' : '#8795b2'; for (const w of [6, 22, 38, 54]) g.fillRect(bx + w, 0, 1, by);
  g.fillStyle = night ? '#10131f' : '#56627e'; g.fillRect(bx, by, 60, 36); g.fillStyle = night ? '#2a3150' : '#9aa8c4'; g.fillRect(bx, by, 60, 2); g.fillStyle = night ? '#080a12' : '#3a455e'; g.fillRect(bx, by + 34, 60, 2);
  g.fillStyle = night ? '#06070b' : '#26304a'; g.fillRect(sx, sy, 52, 22);
  const a = String(G.sc[0]), b = String(G.sc[1]), wa = a.length * 8 - 2, wb = b.length * 8 - 2;
  if (!fin || G.sc[0] > G.sc[1] || blink) bbText(a, sx + 2, sy + 2, 2, amb);
  if (!fin || G.sc[1] > G.sc[0] || blink) bbText(b, sx + 50 - wb, sy + 2, 2, tl);
  if (!fin) { g.fillStyle = G.off ? tl : amb; if (G.off) g.fillRect(sx + 50 - wb, sy + 12, wb, 1); else g.fillRect(sx + 2, sy + 12, wa, 1); }
  if (fin) bbText('FINAL', sx + 16, sy + 15, 1, '#ffffff');
  else {
    const c = Math.ceil(G.clock), m = String(Math.floor(c / 60)).padStart(2, '0'), s = String(c % 60).padStart(2, '0');
    bbText(G.q > 4 ? 'O' : G.q, sx + 3, sy + 15, 1, '#ffffff'); bbText(m, sx + 17, sy + 15, 1, '#ffffff'); bbText(s, sx + 29, sy + 15, 1, '#ffffff');
    if (G.st === 'break' || blink) { g.fillStyle = '#ffffff'; g.fillRect(sx + 25, sy + 16, 1, 1); g.fillRect(sx + 25, sy + 18, 1, 1); }
  }
}
function draw(t) {
  g.setTransform(S, 0, 0, S, 0, 0); g.imageSmoothingEnabled = false;
  const c = cfg(), vw = innerWidth, night = R.dataset.theme !== 'light'; let y = 0;
  for (const [e, col] of c.sky) { const y1 = sn(e * H); g.fillStyle = col; g.fillRect(0, y, W, y1 - y + .01); y = y1; }
  if (y < H) g.fillRect(0, y, W, H - y);
  for (let i = c.layers.length - 1; i >= 0; i--) {
    const L = c.layers[i], im = img(L.f); if (!ok(im)) continue;
    if (L.orb) { g.drawImage(im, sn((vw - (vw - 1200) / 4) / S - L.w / 2), Math.ceil(130 / S)); continue; }
    const top = L.off == null ? 0 : H - L.off - L.h, o = L.once ? -Math.round((W - L.w) / 2) : L.drift ? (t * L.w / c.T) % L.w : 0;
    for (let x = -o; x < W && (!L.once || x === -o); x += L.w) g.drawImage(im, sn(x), sn(top));
    if (L.game) bbDraw(top, -o, t);
    if (c.fx && c.fx.layer === i) water(c.fx, t, top, o, L.w);
    for (const a of c.actors || []) if (a.layer === i) worldActor(a, L, c, t, top, o, night);
  }
  for (const a of c.actors || []) if (a.mode === 'screen') screenActor(a, t);
  if (c.game) bbBoard(night, t);
  const b = img(c.band); if (ok(b)) { const f = Math.floor(t / c.ft * 8) % 8; for (let x = 0; x < W; x += c.bw) g.drawImage(b, 0, f * c.bh, c.bw, c.bh, sn(x), sn(H - c.bh), c.bw, c.bh); }
}
function loop() { requestAnimationFrame(loop); if (document.hidden || (++n % every)) return; draw(now()); }
addEventListener('resize', () => { clearTimeout(size.t); size.t = setTimeout(size, 120); });
new MutationObserver(() => draw(now())).observe(R, { attributes: true, attributeFilter: ['data-world', 'data-theme'] });
for (const w in CFG) for (const th in CFG[w]) { const c = CFG[w][th]; c.layers.forEach(l => img(l.f)); img(c.band); (c.actors || []).forEach(a => Object.values(a.an || {}).forEach(A => img(A.f))); }
const eb = document.createElement('button'); eb.id = 'eyeBtn'; eb.type = 'button'; eb.title = 'Hide / show the interface (Esc to show)'; eb.setAttribute('aria-label', 'Hide or show the interface'); document.body.append(eb);
eb.onclick = () => { R.classList.toggle('bgonly'); eb.setAttribute('aria-pressed', R.classList.contains('bgonly')); };
addEventListener('keydown', e => { if (e.key === 'Escape' && R.classList.contains('bgonly')) { R.classList.remove('bgonly'); eb.setAttribute('aria-pressed', false); } });
['home_R', 'home_L', 'away_R', 'away_L', 'ball'].forEach(k => img('basketball_' + k + '.png'));
size(); if (!still) requestAnimationFrame(loop);
})();
