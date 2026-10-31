// js/infocard.js: the "i" info button and its one shared profile panel (Music-Centre style: Esc, the X or an outside click closes it).
// WHAT is shown lives in per-world builders next to each world's card code (registerProfile); this file only owns the button, the panel and a few tiny UI helpers (kit).
// Never used by the quiz: infoBtn() refuses there, and tools/test-infocard.mjs renders every quiz screen to prove no data-info element exists.
import { tip } from "./tips.js";

const NO_INFO_MODES = new Set(["quiz"]);   // belt and braces: the quiz never shows an "i", whatever a screen asks for
const builders = new Map();                // world id ("animals" | "football" | ...) -> (ctx, entity, opts) => node
const optsOf = new WeakMap();              // button -> { entity, opts }: opts may be a function, read at click time (a lot can change after the button was drawn)
let host = null;                           // () => { ctx, world, entity(id) }, set by installInfo

export const registerProfile = (world, fn) => { builders.set(world, fn); };
export const hasProfile = (world) => builders.has(world);

// ---------- tiny element builder (own copy: this module must not import app.js) ----------
export function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const k in attrs || {}) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}

// ---------- kit: the building blocks every profile uses, so all worlds look and read the same ----------
export const kit = {
  el, tip,
  section: (title, ...kids) => el("section", { class: "ic-sec" }, el("h3", { class: "ic-h" }, title), ...kids),
  // label: value row; `why` becomes a tooltip on the label
  kv: (label, value, why) => el("div", { class: "ic-kv" }, tip(el("span", { class: "ic-k" }, label), why), el("b", { class: "ic-v" }, value)),
  bar: (label, value, max, why, cls, color) => el("div", { class: "ic-bar" + (cls ? " " + cls : ""), style: color ? `--c:${color}` : null }, tip(el("span", { class: "ic-k" }, label), why),
    el("span", { class: "ic-track" }, el("i", { style: `width:${Math.max(0, Math.min(100, (value / (max || 100)) * 100))}%` })), el("b", { class: "ic-v" }, value)),
  chips: (items) => el("div", { class: "ic-chips" }, items.map((c) => (c && c.nodeType ? c : el("span", { class: "ic-chip" }, c)))),
  chip: (text, why, cls) => tip(el("span", { class: "ic-chip" + (cls ? " " + cls : "") }, text), why),
  // a formula is shown as text; builders generate it from the imported constants so it cannot drift from the engine
  formula: (text, why) => tip(el("code", { class: "ic-formula" }, text), why),
  note: (text) => el("p", { class: "ic-note" }, text),
  list: (items) => el("ul", { class: "ic-list" }, items.map((x) => el("li", {}, x)))
};

// ---------- the button ----------
// infoBtn(entity, opts): a real <button> (32px hit area, ~20px visible). Returns null when this world has no profile yet, for the quiz, or for an entity without an id.
// opts (object, or a function returning one) is handed to the world's builder; e.g. { hideTraits: () => lotIsMystery }.
export function infoBtn(entity, opts) {
  if (!host || !entity || entity.id == null) return null;
  const { ctx, world } = host();
  if (!builders.has(world) || NO_INFO_MODES.has(ctx && ctx.mode && ctx.mode.id)) return null;
  const b = el("button", { class: "info-i", type: "button", "data-info": String(entity.id), "aria-label": `Info: ${entity.name || entity.id}`, "aria-haspopup": "dialog", onpointerdown: (e) => e.stopPropagation() },
    el("span", { "aria-hidden": "true" }, "i"));   // pointerdown must not reach a slot's drag handler
  optsOf.set(b, { entity, opts });
  return b;
}
// withInfo(node, entity, opts): node plus its "i" side by side, for rows that have no slot of their own
export function withInfo(node, entity, opts) {
  const b = infoBtn(entity, opts);
  return b ? el("span", { class: "info-wrap" }, node, b) : node;
}

// ---------- the panel (one instance) ----------
let panel = null, body = null, titleEl = null, closeBtn = null, opener = null, anchor = null, swallow = false;
const isOpen = () => !!panel && !panel.hidden;
const phone = () => (typeof window !== "undefined" ? window.innerWidth : 1024) < 600;

function build() {
  titleEl = el("h2", { id: "infoTitle", class: "ic-title" });
  closeBtn = el("button", { class: "ic-x", type: "button", "aria-label": "Close info", title: "Close", onclick: () => close() }, "×");
  body = el("div", { class: "ic-body", tabindex: "-1" });
  panel = el("section", { id: "infoPanel", role: "dialog", "aria-labelledby": "infoTitle", hidden: true }, el("div", { class: "ic-head" }, titleEl, closeBtn), body);
  document.body.append(panel);
}

function place() {
  if (!panel || phone() || !anchor || !anchor.isConnected) { if (panel) { panel.style.left = ""; panel.style.top = ""; } return; }   // phones: CSS makes it a bottom sheet
  const r = anchor.getBoundingClientRect(), w = Math.min(420, window.innerWidth - 16), h = Math.min(panel.offsetHeight || 400, window.innerHeight - 16);
  const left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
  const top = r.bottom + 8 + h > window.innerHeight ? Math.max(8, r.top - h - 8) : r.bottom + 8;
  panel.style.left = left + "px"; panel.style.top = top + "px";
}

export function close() {
  if (!isOpen()) return;
  panel.hidden = true; body.replaceChildren();
  const back = opener; opener = null; anchor = null;
  if (back && back.isConnected && back.focus) back.focus();   // return focus (a re-rendered opener is gone: then focus simply stays)
}

export function open(btn) {
  const rec = optsOf.get(btn) || {}, { ctx, world, entity } = host();
  const ent = rec.entity || entity(btn.dataset.info);
  const build_ = builders.get(world);
  if (!ent || !build_) return;
  if (isOpen() && anchor === btn) { close(); return; }   // second press on the same "i" toggles
  if (!panel) build();
  const o = typeof rec.opts === "function" ? rec.opts() : rec.opts;
  let node;
  try { node = build_(ctx, ent, o || {}); } catch (e) { console.warn("[infocard] profile failed", e); node = kit.note("This profile could not be drawn."); }
  const wasOpen = isOpen();
  titleEl.textContent = ent.name || String(ent.id);
  body.replaceChildren(node); body.scrollTop = 0;
  panel.hidden = false;
  if (!wasOpen) opener = btn;
  anchor = btn;
  place();
  closeBtn.focus();
}

// ---------- install: one delegated listener, like tips.js ----------
// getHost() -> { ctx, world, entity(id) } is called at click time, so the panel always follows the current pack.
export function installInfo(getHost) {
  host = getHost;
  if (typeof document === "undefined" || installInfo.done) return;
  installInfo.done = true;
  document.addEventListener("click", (e) => {
    if (swallow) { swallow = false; e.stopPropagation(); e.preventDefault && e.preventDefault(); return; }   // the click that ended an outside press must not also act on the screen below
    const t = e.target && e.target.closest && e.target.closest("[data-info]");
    if (!t) return;
    e.stopPropagation(); e.preventDefault && e.preventDefault();   // an "i" inside a draggable slot must not also select or swap it
    open(t);
  }, true);
  document.addEventListener("pointerdown", (e) => {
    if (!isOpen()) return;
    const t = e.target;
    if (t && t.closest && (t.closest("#infoPanel") || t.closest("[data-info]") || t.closest(".tippop"))) return;
    close(); swallow = true; setTimeout(() => { swallow = false; }, 400);   // swallow the click that follows this press (cleared by timer if none comes, e.g. a drag)
  }, true);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && isOpen()) { e.stopPropagation(); close(); } }, true);
  if (typeof window !== "undefined") {
    window.addEventListener("resize", () => { if (isOpen()) place(); });
    window.addEventListener("scroll", (e) => { if (isOpen() && !(panel.contains && e.target instanceof Node && panel.contains(e.target))) place(); }, { passive: true, capture: true });
  }
}
