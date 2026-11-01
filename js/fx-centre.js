// js/fx-centre.js: the Display panel (battery saver, frame rate, pixel detail, idle pause, FPS readout). Loaded by index.html as its own module.
// It only stores the options (localStorage "adw_fx") and announces them with the window event "adw-fx"; js/pxbg.js, which draws the animated background, reads them and
// answers with "adw-fx-stat" ({ fps, frozen, why }) about once a second. The look is in styles/fx-centre.css; the button's fixed position is in styles/worlds/pixel-bg.css and js/pxbg.js (dock).

const $ = (s, r = document) => r.querySelector(s);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const KEY = "adw_fx", DEFAULTS = { saver: false, auto: false, fps: 0, detail: "auto", idle: false, meter: false };
const FPS = [[0, "Auto"], [60, "60"], [30, "30"], [20, "20"], [10, "10"]], DETAIL = [["auto", "Auto"], ["low", "Low"]];
const WHY = { reduce: "your device asks for reduced motion", saver: "battery saver", battery: "battery is low", idle: "paused while idle" };
const ICON = {
  close: "<svg viewBox='0 0 16 16' aria-hidden='true' focusable='false'><path d='M3.5 3.5l9 9M12.5 3.5l-9 9' fill='none' stroke='currentColor' stroke-width='1.8'/></svg>",
  reset: "<svg viewBox='0 0 16 16' aria-hidden='true' focusable='false'><path d='M13 8a5 5 0 1 1-1.6-3.7M13 2.5v3h-3' fill='none' stroke='currentColor' stroke-width='1.8'/></svg>"
};
function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const k in attrs || {}) { const v = attrs[k]; if (v == null || v === false) continue; if (k === "html") e.innerHTML = v; else e.setAttribute(k, v === true ? "" : v); }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c);
  return e;
}
const load = () => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch (e) { return { ...DEFAULTS }; } };

function init() {
  const root = document.documentElement, btn = $("#fxBtn");
  if (!btn) return;   // index.html ships the button
  let opts = load(), stat = { fps: 0, frozen: false, why: null };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(opts)); } catch (e) { /* private mode: the options last until the page closes */ } window.dispatchEvent(new Event("adw-fx")); render(); };

  // ---------- panel ----------
  const sw = (id, hint) => el("button", { class: "mc-switch", type: "button", role: "switch", "aria-checked": "false", "aria-labelledby": id + "L", "aria-describedby": hint }, el("span", { class: "mc-knob" }));
  const state = () => el("span", { class: "mc-swstate" }, "Off");
  const saverSw = sw("fxSaver", "fxSaverHint"), saverSt = state(), autoSw = sw("fxAuto", "fxAutoHint"), autoSt = state();
  const idleSw = sw("fxIdle", "fxIdleHint"), idleSt = state(), meterSw = sw("fxMeterSw"), meterSt = state();
  const seg = (label, list, key) => {
    const g = el("div", { class: "fx-seg", role: "group", "aria-label": label });
    for (const [v, t] of list) g.append(el("button", { class: "mc-chip", type: "button", "data-v": String(v), "aria-pressed": "false" }, t));
    g.addEventListener("click", (e) => { const b = e.target.closest(".mc-chip"); if (!b) return; const raw = b.dataset.v; opts[key] = typeof DEFAULTS[key] === "number" ? +raw : raw; save(); });
    return g;
  };
  const fpsSeg = seg("Frame rate", FPS, "fps"), detailSeg = seg("Pixel detail", DETAIL, "detail");
  const row = (id, text, s, st) => el("div", { class: "mc-row" }, el("span", { id: id + "L", class: "mc-lbl" }, text), s, st);
  const status = el("p", { class: "fx-status", "aria-live": "polite" });
  const resetBtn = el("button", { class: "mc-ico", type: "button", "aria-label": "Reset display options", title: "Reset to defaults", html: ICON.reset });
  const closeBtn = el("button", { class: "mc-ico", type: "button", "aria-label": "Close display panel", title: "Close", html: ICON.close });
  const hasBattery = !!navigator.getBattery;   // Chrome / Android only: iPhones and Firefox have no battery reading
  const panel = el("section", { id: "fxPanel", role: "dialog", "aria-labelledby": "fxTitle", hidden: true },
    el("div", { class: "mc-head" }, el("h2", { id: "fxTitle" }, "Display"), resetBtn, closeBtn),
    el("div", { class: "fx-body" },
      el("div", { class: "fx-block" }, row("fxSaver", "Battery saver", saverSw, saverSt), el("p", { id: "fxSaverHint", class: "mc-note" }, "Freezes the animated background on one still picture. Saves the most battery.")),
      hasBattery ? el("div", { class: "fx-block" }, row("fxAuto", "Auto battery saver", autoSw, autoSt), el("p", { id: "fxAutoHint", class: "mc-note" }, "Turns the saver on by itself when the battery is at 20% or lower and not charging.")) : null,
      el("div", { class: "fx-block" }, row("fxIdle", "Pause when idle", idleSw, idleSt), el("p", { id: "fxIdleHint", class: "mc-note" }, "Freezes the background after 1 minute without a tap or key, and wakes it up when you touch the screen.")),
      el("div", { class: "fx-block" }, el("span", { class: "mc-lbl" }, "Frame rate"), fpsSeg, el("p", { class: "mc-note" }, "Fewer frames per second means less battery. Auto is 30 on phones and 60 on computers.")),
      el("div", { class: "fx-block" }, el("span", { class: "mc-lbl" }, "Pixel detail"), detailSeg, el("p", { class: "mc-note" }, "Low draws bigger pixels, which is about half the work on a phone.")),
      el("div", { class: "fx-block" }, row("fxMeterSw", "Show FPS", meterSw, meterSt)),
      status));
  btn.after(panel);   // right after the button in the DOM, so Tab goes from the button straight into the panel
  btn.setAttribute("aria-haspopup", "dialog"); btn.setAttribute("aria-controls", "fxPanel"); btn.setAttribute("aria-expanded", "false");
  const meter = el("div", { id: "fxMeter", "aria-hidden": "true", hidden: true }); document.body.append(meter);

  // ---------- placement: under the utility buttons, right-aligned with the light/dark button, never off screen (same as the Music Centre) ----------
  let open = false, raf = 0;
  const utils = () => [$("#themeBtn"), $("#eyeBtn"), $("#musicBtn")].filter(Boolean);
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
  const mo = new MutationObserver(queuePlace);   // pxbg.js docks the buttons into the top bar with inline styles / classes
  mo.observe(root, { attributes: true, attributeFilter: ["class"] });
  const tb = $("#topbar"); if (tb) mo.observe(tb, { childList: true });
  const watchBtns = () => { for (const b of [btn, ...utils()]) mo.observe(b, { attributes: true, attributeFilter: ["style"] }); };

  function openPanel() { open = true; panel.hidden = false; btn.setAttribute("aria-expanded", "true"); watchBtns(); place(); render(); saverSw.focus({ preventScroll: true }); }
  function closePanel(returnFocus) { open = false; panel.hidden = true; btn.setAttribute("aria-expanded", "false"); if (returnFocus) btn.focus({ preventScroll: true }); }
  btn.addEventListener("click", () => (open ? closePanel(false) : openPanel()));
  closeBtn.addEventListener("click", () => closePanel(true));
  // Escape closes the panel, except while the interface is hidden: then Escape belongs to the eye button.
  document.addEventListener("keydown", (e) => { if (open && e.key === "Escape" && !root.classList.contains("bgonly")) closePanel(true); }, true);
  // outside click closes (that includes the music button, so the two panels never stay open together); the panel and the light/dark and eye buttons count as inside
  document.addEventListener("pointerdown", (e) => { if (open && ![panel, btn, $("#themeBtn"), $("#eyeBtn")].some((n) => n && n.contains(e.target))) closePanel(false); }, true);

  // ---------- controls ----------
  const flip = (k) => () => { opts[k] = !opts[k]; save(); };
  saverSw.addEventListener("click", flip("saver")); autoSw.addEventListener("click", flip("auto")); idleSw.addEventListener("click", flip("idle")); meterSw.addEventListener("click", flip("meter"));
  resetBtn.addEventListener("click", () => { opts = { ...DEFAULTS }; save(); });

  // ---------- rendering ----------
  const onOff = (s, st, v) => { s.setAttribute("aria-checked", String(!!v)); st.textContent = v ? "On" : "Off"; };
  const mark = (g, cur) => { for (const b of g.children) b.setAttribute("aria-pressed", String(b.dataset.v === String(cur))); };
  function render() {
    onOff(saverSw, saverSt, opts.saver); onOff(autoSw, autoSt, opts.auto); onOff(idleSw, idleSt, opts.idle); onOff(meterSw, meterSt, opts.meter);
    mark(fpsSeg, opts.fps); mark(detailSeg, opts.detail);
    meter.hidden = !opts.meter; meter.textContent = stat.frozen ? "frozen" : stat.fps + " fps";
    btn.classList.toggle("is-frozen", !!stat.frozen);
    btn.title = stat.frozen ? "Display (background frozen)" : "Display and battery";
    status.textContent = stat.frozen ? "Background frozen: " + (WHY[stat.why] || "paused") : stat.fps ? "Drawing at " + stat.fps + " fps" : "Background running";
  }
  window.addEventListener("adw-fx-stat", (e) => { const d = e.detail || {}; stat = { fps: Math.round(d.fps || 0), frozen: !!d.frozen, why: d.why || null }; render(); });
  render();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
