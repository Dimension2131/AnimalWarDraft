// modes/basketball/card.js: the basketball player card (draft screen) and the compact stat strip, used by js/app.js when pack.engine === "basketball".
import { ensureStyles } from "./styles.js";
import { failed } from "../../js/preload.js";
import { composites, MAINS, SUBS } from "./engine.js";

const missing = new Set();

export function photo(h, a, cls) {
  const em = () => h("span", { class: "emoji" }, a.emoji);
  const src = a.image || ("basketball/img/" + a.id + ".png");
  if (missing.has(a.id) || failed.has(src)) return em();   // known-missing photo: no request, no broken-image flash on every re-render
  return h("img", { class: cls || "bb-photo", src, alt: a.name, decoding: "async", onerror: (e) => { missing.add(a.id); failed.add(src); e.target.replaceWith(em()); } });
}

export const ratingBar = (h, tip, label, desc, v, max, cls) => h("div", { class: "stat " + cls }, tip(h("span", {}, label), desc), h("div", { class: "sbar" }, h("i", { style: `width:${Math.min(100, (v / max) * 100)}%` })), h("b", {}, v));
// The sub ratings of a player grouped under their main rating: the "More details" part of the card and of the line-up screen.
export function subDetails({ h, tip }, a, max = 100) {
  return h("div", { class: "bb-subs" }, MAINS.map((m) => h("div", { class: "bb-subgrp" }, h("div", { class: "bb-subhead s-" + m.key }, h("b", {}, m.label), h("span", {}, a[m.key])),
    ...SUBS.filter((x) => x.main === m.key).map((x) => ratingBar(h, tip, x.label, x.description, a[x.key], max, "sub s-" + m.key)))));
}

export function card({ h, tip, PK }, a, compact, note) {
  ensureStyles();
  if (!a) return h("div", { class: "acard ph" }, h("div", { class: "plate-head" }, h("div", { class: "medal" }, h("span", { class: "qmark" }, "?")), h("div", { class: "grow" }, h("strong", { class: "aname" }, "???"), h("div", { class: "special" }, note || "Next player…"))));
  const max = PK.statMax || 100;
  return h("div", { class: "acard bb" },
    h("div", { class: "plate-head" }, h("div", { class: "bb-plate" }, photo(h, a)), h("div", { class: "grow" }, h("strong", { class: "aname" }, a.name), h("div", { class: "special" }, `${a.pos}${a.positions && a.positions.length > 1 ? " / " + a.positions.slice(1).join(" / ") : ""} · ${a.team}`),
      h("div", { class: "row wrap tagrow" }, h("span", { class: "bb-ovr" }, a.ovr), a.legend ? h("span", { class: "pill" }, "Legend") : null, h("span", { class: "pill" }, a.position)))),
    h("div", { class: "row meta" }, (PK.cardChips ? PK.cardChips(a) : []).map((x) => h("span", { class: "chip-s" }, x))),
    compact ? null : h("div", { class: "stats" }, PK.stats.map((st) => ratingBar(h, tip, st.label, st.description, a[st.key], max, "s-" + st.key))),
    compact ? null : h("details", { class: "bb-more" }, h("summary", {}, "More details"), subDetails({ h, tip }, a, max)));
}

const TIPS = Object.fromEntries(MAINS.map((m) => [m.abbr, `${m.label}: ${m.description}`]));
export const strip = ({ h, tip }, PK, a) => { const c = composites(a); return h("span", { class: "sstrip" }, ...Object.entries(c).map(([k, v]) => h("span", { class: "sp s-" + k }, tip(h("i", {}, k), TIPS[k]), h("b", {}, v))), h("span", { class: "sp" }, h("i", {}, "OVR"), h("b", {}, a.ovr))); };
