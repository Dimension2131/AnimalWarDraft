// js/music-centre.js: the floating Music Centre panel. Loaded by index.html as its own module, so js/app.js is untouched.
// The playback and song discovery live in js/music.js; the look is in styles/music-centre.css; the button's fixed position is
// extended in styles/worlds/pixel-bg.css and js/pxbg.js (dock) next to the light/dark and eye buttons.
import { createMusicEngine, CATEGORIES } from "./music.js";

const $ = (s, r = document) => r.querySelector(s);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const ICON = {
  play: "<svg viewBox='0 0 16 16' aria-hidden='true' focusable='false'><path d='M4 2.5v11l9-5.5z' fill='currentColor'/></svg>",
  pause: "<svg viewBox='0 0 16 16' aria-hidden='true' focusable='false'><path d='M3.5 2.5h3.5v11H3.5zM9 2.5h3.5v11H9z' fill='currentColor'/></svg>",
  next: "<svg viewBox='0 0 16 16' aria-hidden='true' focusable='false'><path d='M3 2.5v11l7-5.5zM11 2.5h2v11h-2z' fill='currentColor'/></svg>",
  refresh: "<svg viewBox='0 0 16 16' aria-hidden='true' focusable='false'><path d='M13 8a5 5 0 1 1-1.6-3.7M13 2.5v3h-3' fill='none' stroke='currentColor' stroke-width='1.8'/></svg>",
  shuffle: "<svg viewBox='0 0 16 16' aria-hidden='true' focusable='false'><path d='M1.5 4.5h2.8c3.4 0 4.4 7 7.9 7h1.8M1.5 11.5h2.8c1.1 0 1.9-.6 2.6-1.6M9.2 6.1c.8-1 1.8-1.6 3-1.6h1.8M12.2 2.6l2 1.9-2 1.9M12.2 9.6l2 1.9-2 1.9' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='square'/></svg>",
  close: "<svg viewBox='0 0 16 16' aria-hidden='true' focusable='false'><path d='M3.5 3.5l9 9M12.5 3.5l-9 9' fill='none' stroke='currentColor' stroke-width='1.8'/></svg>"
};
function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const k in attrs || {}) { const v = attrs[k]; if (v == null || v === false) continue; if (k === "html") e.innerHTML = v; else e.setAttribute(k, v === true ? "" : v); }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c);
  return e;
}
// Game tile (data-world on <html>, see js/pack.js) -> music folder. Pokémon has no folder, so switching to it leaves the music alone.
const WORLD_CAT = { animals: "animals", football: "football", basketball: "basketball" };
const label = (c) => c.charAt(0).toUpperCase() + c.slice(1);

function init() {
  const root = document.documentElement;
  let btn = $("#musicBtn");
  if (!btn) { btn = el("button", { id: "musicBtn", type: "button" }); const t = $("#themeBtn"); if (t) t.after(btn); else document.body.append(btn); }   // index.html ships the button; this is only a fallback
  btn.hidden = false;

  const audio = new Audio();   // the ONE shared background-music element
  const engine = createMusicEngine({
    audio, base: new URL("../assets/music/", import.meta.url).href, fetchFn: (u, o) => fetch(u, o),
    storage: (() => { try { return localStorage; } catch (e) { return null; } })(), speech: window.speechSynthesis || null
  });

  // ---------- panel ----------
  const sw = el("button", { class: "mc-switch", type: "button", role: "switch", "aria-checked": "true", "aria-labelledby": "mcSwLabel" }, el("span", { class: "mc-knob" }));
  const swState = el("span", { class: "mc-swstate" }, "On");
  const modeSw = el("button", { class: "mc-switch", type: "button", role: "switch", "aria-checked": "false", "aria-labelledby": "mcModeLabel", "aria-describedby": "mcModeHint" }, el("span", { class: "mc-knob" }));
  const modeState = el("span", { class: "mc-swstate" }, "Off");
  const vol = el("input", { id: "mcVol", class: "mc-vol", type: "range", min: "0", max: "100", step: "5", value: "40" });
  const volOut = el("output", { class: "mc-volout", for: "mcVol" }, "40%");
  const volNote = el("p", { class: "mc-note", hidden: true }, "Volume follows your device’s own volume buttons.");
  const playBtn = el("button", { class: "mc-ico mc-play", type: "button", "aria-label": "Play", title: "Play / pause", html: ICON.play });
  const nextBtn = el("button", { class: "mc-ico", type: "button", "aria-label": "Next random track", title: "Next random track", html: ICON.next });
  const status = el("span", { class: "mc-status" }), name = el("span", { class: "mc-name" }, "—");
  const randomBtn = el("button", { class: "mc-ico", type: "button", "aria-label": "Random song", title: "Random song", html: ICON.shuffle });
  const refreshBtn = el("button", { class: "mc-ico", type: "button", "aria-label": "Refresh song list", title: "Refresh song list", html: ICON.refresh });
  const closeBtn = el("button", { class: "mc-ico", type: "button", "aria-label": "Close music panel", title: "Close", html: ICON.close });
  const chips = el("div", { class: "mc-filters", role: "group", "aria-label": "Song category" });
  const list = el("div", { class: "mc-list", tabindex: "-1" });
  const panel = el("section", { id: "musicPanel", role: "dialog", "aria-labelledby": "mcTitle", hidden: true },
    el("div", { class: "mc-head" }, el("h2", { id: "mcTitle" }, "Music"), randomBtn, refreshBtn, closeBtn),
    el("div", { class: "mc-top" },
      el("div", { class: "mc-row" }, el("span", { id: "mcSwLabel", class: "mc-lbl" }, "Sound"), sw, swState),
      el("div", { class: "mc-row" }, el("span", { id: "mcModeLabel", class: "mc-lbl" }, "Mode music"), modeSw, modeState),
      el("p", { id: "mcModeHint", class: "mc-note" }, "Fades into the game’s own songs when you switch games."),
      el("div", { class: "mc-row" }, el("label", { for: "mcVol", class: "mc-lbl" }, "Volume"), vol, volOut), volNote,
      el("div", { class: "mc-now" }, playBtn, nextBtn, el("div", { class: "mc-track", "aria-live": "polite" }, status, name))),
    chips, list);
  btn.after(panel);   // right after the button in the DOM, so Tab goes from the button straight into the panel
  btn.setAttribute("aria-haspopup", "dialog"); btn.setAttribute("aria-controls", "musicPanel"); btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-label", "Music controls"); btn.title = "Music";

  // ---------- placement: under the utility buttons, right-aligned with the light/dark button, never off screen ----------
  let open = false, raf = 0;
  const utils = () => [$("#themeBtn"), $("#eyeBtn")].filter(Boolean);   // looked up when used: #eyeBtn is created by js/pxbg.js, after this module has run
  function place() {
    raf = 0; if (!open) return;
    const vw = root.clientWidth, vh = window.innerHeight, w = Math.min(340, vw - 16);
    const rs = [btn, ...utils()].map((b) => b.getBoundingClientRect());
    const bottom = Math.max(...rs.map((r) => r.bottom)), anchorRight = ($("#themeBtn") || btn).getBoundingClientRect().right;
    const top = Math.round(bottom + 8), right = clamp(Math.round(vw - anchorRight), 8, Math.max(8, vw - w - 8));
    Object.assign(panel.style, { top: top + "px", right: right + "px", width: w + "px", maxHeight: Math.max(150, Math.min(560, vh - top - 12)) + "px" });
  }
  const queuePlace = () => { if (open && !raf) raf = requestAnimationFrame(place); };
  addEventListener("resize", queuePlace);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", queuePlace);
  const mo = new MutationObserver(queuePlace);   // pxbg.js docks the buttons into the top bar and moves them with inline styles / classes
  mo.observe(root, { attributes: true, attributeFilter: ["class"] });
  const tb = $("#topbar"); if (tb) mo.observe(tb, { childList: true });
  const watchBtns = () => { for (const b of [btn, ...utils()]) mo.observe(b, { attributes: true, attributeFilter: ["style"] }); };   // observing the same node twice just refreshes it

  function openPanel() {
    open = true; panel.hidden = false; btn.setAttribute("aria-expanded", "true"); watchBtns(); place();
    if (Date.now() - engine.lastLoad > 30000) engine.loadLibrary(false);   // pick up songs added since the page loaded
    sw.focus({ preventScroll: true });
  }
  function closePanel(returnFocus) { open = false; panel.hidden = true; btn.setAttribute("aria-expanded", "false"); if (returnFocus) btn.focus({ preventScroll: true }); }
  btn.addEventListener("click", () => (open ? closePanel(false) : openPanel()));
  closeBtn.addEventListener("click", () => closePanel(true));
  // Escape closes the panel, except while the interface is hidden: then Escape belongs to the eye button (it brings the interface back).
  document.addEventListener("keydown", (e) => { if (open && e.key === "Escape" && !root.classList.contains("bgonly")) closePanel(true); }, true);
  // outside click closes; the panel itself and the three utility buttons count as "inside"
  document.addEventListener("pointerdown", (e) => { if (open && ![panel, btn, ...utils()].some((n) => n.contains(e.target))) closePanel(false); }, true);

  // ---------- controls ----------
  sw.addEventListener("click", () => engine.setMuted(sw.getAttribute("aria-checked") === "true"));   // switch is ON = sound on, so a click while ON mutes
  modeSw.addEventListener("click", () => engine.setModeMusic(modeSw.getAttribute("aria-checked") !== "true"));
  randomBtn.addEventListener("click", () => engine.random(filter === "all" ? null : filter));   // random song from the category you are looking at (All = everything)
  vol.addEventListener("input", () => engine.setVolume(+vol.value));
  playBtn.addEventListener("click", () => engine.toggle());
  nextBtn.addEventListener("click", () => engine.next());
  refreshBtn.addEventListener("click", () => engine.refresh());
  list.addEventListener("click", (e) => { const b = e.target.closest(".mc-song"); if (b) engine.select(b.dataset.id); });   // delegated: the list is never rebuilt on selection, so its scroll stays put
  list.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const all = [...list.querySelectorAll(".mc-song")], i = all.indexOf(document.activeElement); if (i < 0) return;
    e.preventDefault(); const n = all[clamp(i + (e.key === "ArrowDown" ? 1 : -1), 0, all.length - 1)]; if (n) n.focus();
  });

  // Browsers block autoplay until the page has been used. When the engine is waiting for that, the next real gesture anywhere starts the music (one attempt per gesture, none in a loop).
  const SKIP = new Set(["Shift", "Control", "Alt", "Meta", "Escape", "Tab", "CapsLock"]);
  for (const t of ["pointerup", "click", "touchend", "keydown"]) addEventListener(t, (e) => {
    if (!engine.blocked || panel.contains(e.target) || (t === "keydown" && (e.repeat || SKIP.has(e.key)))) return;   // panel controls act on their own
    engine.gesture();
  }, true);

  // The match viewers have their own synthesised "Music: on/off" button (modes/*/viewer.js). When one is switched on, our song pauses so the two never play together.
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("button"); if (!b || panel.contains(b)) return;
    const t = (b.textContent || "").trim(); if (/^Music:\s*on$/i.test(t)) engine.synth(true); else if (/^Music:\s*off$/i.test(t)) engine.synth(false);
  });

  // ---------- rendering ----------
  let filter = "all", lastTracks = null, last = engine.state;
  const text = (s) => {
    if (!s.loaded) return "Looking for music…";
    if (!s.tracks.length) return "No music found yet";
    if (s.notice) return s.notice;
    switch (s.status) {
      case "loading": return "Loading…";
      case "playing": return s.muted ? "Playing (sound off)" : "Now playing";
      case "paused": return "Paused";
      case "blocked": return "Tap anywhere to start the music";
      case "synth": return "Paused while match music is on";
      case "none": return "No playable tracks";
      default: return s.muted ? "Sound is off" : "Ready";
    }
  };
  function renderChips(s) {
    chips.replaceChildren(...["all", ...CATEGORIES].map((c) => {
      const n = c === "all" ? s.tracks.length : s.tracks.filter((t) => t.cat === c).length;
      return el("button", { class: "mc-chip", type: "button", "data-cat": c, "aria-pressed": String(filter === c), disabled: n === 0 && c !== "all", title: n === 0 ? "No songs in this category yet" : null }, label(c), el("span", { class: "mc-count" }, String(n)));
    }));
  }
  function renderList(s) {
    const keep = list.scrollTop, groups = [];
    for (const c of filter === "all" ? CATEGORIES : [filter]) {
      const items = s.tracks.filter((t) => t.cat === c); if (!items.length) continue;
      groups.push(el("section", { class: "mc-cat" }, filter === "all" ? el("h3", null, label(c)) : null,
        el("ul", null, items.map((t) => el("li", null, el("button", { class: "mc-song", type: "button", "data-id": t.id, title: t.name }, el("span", { class: "mc-eq", "aria-hidden": "true" }, el("i"), el("i"), el("i")), el("span", { class: "mc-sname" }, t.name)))))));
    }
    if (!groups.length) groups.push(el("p", { class: "mc-empty" }, !s.loaded ? "Looking for music…" : filter === "all" ? "No music found yet. Add songs to the music folders, then press refresh." : "No songs in this category yet."));
    list.replaceChildren(...groups); list.scrollTop = keep;
  }
  chips.addEventListener("click", (e) => {
    const b = e.target.closest(".mc-chip"); if (!b || b.disabled) return;
    filter = b.dataset.cat; for (const c of chips.children) c.setAttribute("aria-pressed", String(c.dataset.cat === filter));
    list.scrollTop = 0; renderList(last); render(last);   // render() also refreshes the Random button for the new category
  });
  function mark(s) {
    for (const b of list.querySelectorAll(".mc-song")) {
      const on = !!s.cur && b.dataset.id === s.cur.id;
      b.classList.toggle("on", on); b.classList.toggle("playing", on && s.isPlaying); b.classList.toggle("bad", s.failed.has(b.dataset.id));
      if (on) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
    }
  }
  function render(s) {
    last = s;
    sw.setAttribute("aria-checked", String(!s.muted)); swState.textContent = s.muted ? "Muted" : "On";
    if (+vol.value !== s.volume) vol.value = String(s.volume);
    vol.style.setProperty("--p", String(s.volume / 100));   // drives the filled blocks of the pixel volume bar (styles/music-centre.css)
    modeSw.setAttribute("aria-checked", String(s.modeMusic)); modeState.textContent = s.modeMusic ? "On" : "Off";
    const scope = filter === "all" ? s.tracks.length : s.tracks.filter((t) => t.cat === filter).length;
    randomBtn.disabled = !scope; randomBtn.setAttribute("aria-label", filter === "all" ? "Random song" : "Random " + label(filter) + " song"); randomBtn.title = randomBtn.getAttribute("aria-label");
    vol.setAttribute("aria-valuetext", s.volume + " percent"); volOut.textContent = s.volume + "%"; vol.disabled = s.volumeLocked; volNote.hidden = !s.volumeLocked;
    playBtn.innerHTML = s.isPlaying ? ICON.pause : ICON.play; playBtn.setAttribute("aria-label", s.isPlaying ? "Pause" : "Play"); playBtn.disabled = nextBtn.disabled = !s.tracks.length;
    status.textContent = text(s); name.textContent = s.cur ? s.cur.name : "—"; name.title = s.cur ? s.cur.name : "";
    btn.classList.toggle("is-muted", s.muted); btn.title = s.muted ? "Music (sound off)" : "Music";
    if (s.tracks !== lastTracks) { lastTracks = s.tracks; if (filter !== "all" && !s.tracks.some((t) => t.cat === filter)) filter = "all"; renderChips(s); renderList(s); }
    mark(s);
  }
  // Mode music: the Game tiles change data-world on <html>. Watching that attribute needs no hook in the game code.
  let world = root.dataset.world;
  engine.setModeCat(WORLD_CAT[world] || null);
  new MutationObserver(() => { const w = root.dataset.world; if (w === world) return; world = w; engine.setModeCat(WORLD_CAT[w] || null, { change: true }); }).observe(root, { attributes: true, attributeFilter: ["data-world"] });
  engine.on(render);
  engine.loadLibrary(true);   // starts the random music on the first allowed moment, panel open or not
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
