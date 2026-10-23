export default [
  () => import("./classic/mode.js"),
  () => import("./pokemon/mode.js"),   // before the quiz: the first mode a pack supports is the default one in its lobby
  () => import("./quiz/mode.js"),
  () => import("./race/mode.js"),
];
