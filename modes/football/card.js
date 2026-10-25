// modes/football/card.js: the football player card (draft screen) and the compact stat strip, used by js/app.js when pack.engine === "football".
import { ensureStyles } from "./styles.js";
import { failed } from "../../js/preload.js";

export const statsFor = (PK, a) => (typeof PK.statsFor === "function" ? PK.statsFor(a) : PK.stats);

const missing = new Set();

export function photo(h, a, cls) {
  const em = () => h("span", { class: "emoji" }, a.emoji);
  const src = a.image || ("football/img/" + a.id + ".png");
  if (missing.has(a.id) || failed.has(src)) return em();   // known-missing photo: no request, no broken-image flash on every re-render (the old guard `!a.image &&` was never true, so it re-requested the 404 on every bid)
  return h("img", {
    class: cls || "fb-photo",
    src,
    alt: a.name,
    decoding: "async",
    onerror: (e) => { missing.add(a.id); failed.add(src); e.target.replaceWith(em()); }
  });
}

export function card({ h, tip, PK }, a, compact, note) {
  ensureStyles();
  if (!a) return h("div", { class: "acard ph" }, h("div", { class: "plate-head" }, h("div", { class: "medal" }, h("span", { class: "qmark" }, "?")), h("div", { class: "grow" }, h("strong", { class: "aname" }, "???"), h("div", { class: "special" }, note || "Next player…"))));
  const stats = statsFor(PK, a), max = PK.statMax || 100;
  return h("div", { class: "acard fb" },
    h("div", { class: "plate-head" }, h("div", { class: "fb-plate" }, photo(h, a)), h("div", { class: "grow" }, h("strong", { class: "aname" }, a.name), h("div", { class: "special" }, `${a.pos} · ${a.nation}`),
      h("div", { class: "row wrap tagrow" }, h("span", { class: "fb-ovr" }, a.ovr), a.icon ? h("span", { class: "pill fb-icon" }, "Icon") : null, h("span", { class: "pill" }, a.position)))),
    h("div", { class: "row meta" }, (PK.cardChips ? PK.cardChips(a) : []).map((x) => h("span", { class: "chip-s" }, x))),
    compact ? null : h("div", { class: "stats" }, stats.map((st) => h("div", { class: "stat s-" + st.key }, tip(h("span", {}, st.label), st.description), h("div", { class: "sbar" }, h("i", { style: `width:${Math.min(100, (a[st.key] / max) * 100)}%` })), h("b", {}, a[st.key])))));
}

export const strip = ({ h, tip }, PK, a) => h("span", { class: "sstrip" }, ...statsFor(PK, a).map((st) => h("span", { class: "sp s-" + st.key }, tip(h("i", {}, st.abbr || st.label), st.description), h("b", {}, a[st.key]))), h("span", { class: "sp" }, h("i", {}, "OVR"), h("b", {}, a.ovr)));
