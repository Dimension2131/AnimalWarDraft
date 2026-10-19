// =====================================================================
// renderer.js — Canvas 2D arena. It ONLY plays events[]; it never decides anything.
// Exports: createRenderer(canvas, callbacks), renderEventLog(), renderLossCards()
//
// Look: every arena is a two-ink print (pattern + halftone on tinted paper), every fighter is a
// stamped disc whose animal silhouette is printed in its side's ink (A = blue, B = pink) with a
// second ink slightly off-register underneath. Hits leave ink splats instead of particle sparks.
// =====================================================================
import * as R from "./rules.js";
import { hpOf, describeAutopsy } from "./sim.js";

const INK = "#e6e9dc", PAPER = "#0a0f0e", BLUE = "#2340c8", PINK = "#e8336f", YELLOW = "#ffd23a", TEAL = "#0f8c80", GREY = "#7b7f98";
const DISPLAY = '"Dela Gothic One","Arial Black","Segoe UI Black",system-ui,sans-serif';
const BODY = '"Schibsted Grotesk",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
const SIDE = { A: BLUE, B: PINK };
const UNDER = { A: "rgba(232,51,111,.55)", B: "rgba(35,64,200,.5)" };
const TAU = Math.PI * 2;
const reduceMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const imgCache = new Map();
function getImg(url) {
  if (!url) return null;
  let i = imgCache.get(url);
  if (!i) { i = new Image(); i.crossOrigin = "anonymous"; i.onerror = () => { i.bad = true; }; i.src = url; imgCache.set(url, i); }
  return i.complete && !i.bad && i.naturalWidth ? i : null;
}
// Silhouettes are black on transparent; re-ink them on an offscreen canvas in the colour we need.
// (No crossOrigin on purpose: we only draw the result, never read pixels, so a missing CORS header cannot break it.)
// Returns a state object: { canvas } once ready, { bad:true } if the file failed, otherwise still loading.
const silCache = new Map();
function getSil(url, color) {
  if (!url) return null;
  const key = url + "|" + color;
  let s = silCache.get(key);
  if (!s) {
    s = { canvas: null, bad: false }; silCache.set(key, s);
    const img = new Image();
    img.onload = () => { try {
      const w = img.naturalWidth || 256, hh = img.naturalHeight || 256, k = 256 / Math.max(w, hh), c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(hh * k));
      const x = c.getContext("2d"); x.drawImage(img, 0, 0, c.width, c.height); x.globalCompositeOperation = "source-in"; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height); s.canvas = c;
    } catch (e) { s.bad = true; } };
    img.onerror = () => { s.bad = true; };
    img.src = url;
  }
  return s;
}
const initials = (n) => String(n || "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------------------------------------------------------------------
// Arena art. Each scene is drawn ONCE into an offscreen canvas (see drawBg) and re-used every frame.
// ---------------------------------------------------------------------
function halftone(c, x, y, w, h, color, fromTop, max) {
  c.fillStyle = color; const step = 8;
  for (let j = 0; j * step < h; j++) {
    const t = (j * step) / h, rr = max * (fromTop ? 1 - t : t);
    if (rr < 0.6) continue;
    for (let i = 0; i * step < w + step; i++) { c.beginPath(); c.arc(x + i * step + (j % 2) * (step / 2), y + j * step, rr, 0, TAU); c.fill(); }
  }
}
// Water: overlapping wave scales (seigaiha), cold two-blue print.
function sceneWater(c, W, H) {
  c.fillStyle = "#0f3642"; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 9; i++) {
    const y = H * 0.08 + i * H * 0.11;
    c.beginPath(); c.moveTo(-10, y);
    for (let x = 0; x <= W + 10; x += 10) c.lineTo(x, y + Math.sin(x * 0.03 + i) * 6);
    c.lineTo(W + 10, H + 10); c.lineTo(-10, H + 10); c.closePath();
    c.fillStyle = i % 2 ? "#124a58" : "#0f3f4c"; c.fill();
    c.strokeStyle = "rgba(51,214,192,.4)"; c.lineWidth = 2; c.stroke();
  }
}
// Forest: flat pine silhouettes in rows, yellow pollen dots.
function sceneForest(c, W, H, rnd) {
  c.fillStyle = "#133522"; c.fillRect(0, 0, W, H);
  let row = 0;
  for (let y = H + 14; y > -40; y -= 34, row++) {
    for (let x = (row % 2) * 22 - 10; x < W + 20; x += 44) {
      const s = 0.9 + rnd() * 0.35;
      c.fillStyle = row % 2 ? "#1d4a2e" : "#18402a";
      c.beginPath(); c.moveTo(x, y - 42 * s); c.lineTo(x + 16 * s, y); c.lineTo(x - 16 * s, y); c.closePath(); c.fill();
    }
  }
  c.fillStyle = "rgba(255,210,58,.5)";
  for (let i = 0; i < 40; i++) { c.beginPath(); c.arc(rnd() * W, rnd() * H, 1.8, 0, TAU); c.fill(); }
}
// Desert: wind-swept dune ridges in ochre and gold, a hot sun low in the corner, grain speckle.
function sceneDesert(c, W, H) {
  const sun = c.createRadialGradient(W * 0.8, H * 0.12, 4, W * 0.8, H * 0.12, W * 0.34);
  sun.addColorStop(0, "rgba(255,210,58,.75)"); sun.addColorStop(0.45, "rgba(255,160,60,.25)"); sun.addColorStop(1, "rgba(255,160,60,0)");
  c.fillStyle = sun; c.fillRect(0, 0, W, H);
  c.fillStyle = "rgba(255,210,58,.9)"; c.beginPath(); c.arc(W * 0.8, H * 0.12, W * 0.07, 0, TAU); c.fill();
  let n = 0;
  for (let y = 40; y < H + 30; y += 34, n++) {
    c.beginPath();
    for (let x = -6; x <= W + 6; x += 6) { const yy = y + Math.sin(x * 0.012 + n) * 9 + Math.sin(x * 0.031 + n * 2) * 4; x === -6 ? c.moveTo(x, yy) : c.lineTo(x, yy); }
    c.lineTo(W + 6, H + 10); c.lineTo(-6, H + 10); c.closePath();
    c.fillStyle = n % 2 ? "rgba(120,84,30,.28)" : "rgba(90,60,20,.22)"; c.fill();
    c.strokeStyle = "rgba(255,210,58,.35)"; c.lineWidth = 1.4; c.stroke();
  }
  c.fillStyle = "rgba(255,230,160,.35)";
  for (let i = 0; i < 90; i++) { c.fillRect(Math.random() * W, Math.random() * H, 1.4, 1.4); }
}
// Plains: rolling flat bands of grass, teal tufts, pink wildflowers.
function scenePlains(c, W, H, rnd) {
  c.fillStyle = "#2c3a1d"; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 6; i++) {
    const y = H * 0.1 + i * H * 0.16;
    c.beginPath(); c.moveTo(-10, y); c.quadraticCurveTo(W * 0.5, y - 36, W + 10, y + 8);
    c.lineTo(W + 10, H + 10); c.lineTo(-10, H + 10); c.closePath();
    c.fillStyle = i % 2 ? "#354a24" : "#3a5227"; c.fill();
  }
  c.strokeStyle = "rgba(51,214,192,.55)"; c.lineWidth = 1.6; c.lineCap = "round";
  for (let i = 0; i < 90; i++) {
    const x = rnd() * W, y = rnd() * H;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - 3, y - 7); c.moveTo(x, y); c.lineTo(x + 3, y - 7); c.stroke();
  }
  c.lineCap = "butt"; c.fillStyle = PINK;
  for (let i = 0; i < 20; i++) { c.beginPath(); c.arc(rnd() * W, rnd() * H, 2.4, 0, TAU); c.fill(); }
}
// Mountain: three flat layered peaks with snowcaps against a night sky.
function sceneMountain(c, W, H, rnd) {
  c.fillStyle = "#141a33"; c.fillRect(0, 0, W, H);
  c.fillStyle = "rgba(230,233,220,.5)";
  for (let i = 0; i < 50; i++) { c.beginPath(); c.arc(rnd() * W, rnd() * H * 0.6, 1.1, 0, TAU); c.fill(); }
  const peaks = [
    { x: 0.2, top: 0.42, w: 0.6, col: "#1f2a52" },
    { x: 0.72, top: 0.34, w: 0.7, col: "#263466" },
    { x: 0.46, top: 0.62, w: 0.9, col: "#2d3d78" },
  ];
  for (const p of peaks) {
    const px = W * p.x, py = H * p.top, half = (W * p.w) / 2, base = H * 1.05;
    c.beginPath(); c.moveTo(px, py); c.lineTo(px + half, base); c.lineTo(px - half, base); c.closePath();
    c.fillStyle = p.col; c.fill();
    const cap = (H - py) * 0.22;
    c.beginPath(); c.moveTo(px, py); c.lineTo(px + cap * 0.9, py + cap); c.lineTo(px - cap * 0.9, py + cap); c.closePath();
    c.fillStyle = "rgba(230,233,220,.55)"; c.fill();
  }
}
const ART = {
  water:    { paper: "#0f3642", fleck: "#ffffff", scene: sceneWater },
  forest:   { paper: "#133522", fleck: "#ffd23a", scene: sceneForest },
  desert:   { paper: "#3b2d12", fleck: "#e8336f", scene: sceneDesert },
  plains:   { paper: "#2c3a1d", fleck: "#0f8c80", scene: scenePlains },
  mountain: { paper: "#141a33", fleck: "#ffffff", scene: sceneMountain }
};
let grain = null;
function getGrain() {
  if (grain) return grain;
  const c = document.createElement("canvas"); c.width = c.height = 96; const x = c.getContext("2d"), r = rng(7);
  for (let i = 0; i < 520; i++) { x.fillStyle = `rgba(230,233,220,${0.04 + r() * 0.06})`; x.fillRect(Math.floor(r() * 96), Math.floor(r() * 96), 1 + (r() < 0.2 ? 1 : 0), 1); }
  return (grain = c);
}
function regMark(c, x, y) {
  c.strokeStyle = "rgba(22,22,58,.6)"; c.lineWidth = 1.2; c.beginPath(); c.arc(x, y, 5, 0, TAU); c.moveTo(x - 9, y); c.lineTo(x + 9, y); c.moveTo(x, y - 9); c.lineTo(x, y + 9); c.stroke();
}
function blob(c, x, y, r, seed, spikes) {
  const rnd = rng(seed), n = spikes || 10;
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, rr = r * (0.55 + rnd() * 0.65), a2 = a + TAU / n / 2, r2 = r * (spikes ? 0.5 : 0.35 + rnd() * 0.3);
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr, qx = x + Math.cos(a2) * r2, qy = y + Math.sin(a2) * r2;
    i === 0 ? c.moveTo(px, py) : c.lineTo(px, py); c.lineTo(qx, qy);
  }
  c.closePath();
}

export function createRenderer(canvas, cb = {}) {
  const ctx = canvas.getContext("2d");
  let W = 360, H = 420, dpr = 1, units = {}, evs = [], idx = 0, pos = 0, playing = true, speed = 1, last = 0, raf = 0;
  let banner = "", tickNo = 0, ended = false, endFired = false, arena = "plains", floaters = [], fx = [], parts = [], teams = null, time = 0, rad = 24;
  let bgCanvas = null, bgKey = "";

  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('22px "Dela Gothic One"'), document.fonts.load('800 12px "Schibsted Grotesk"')]).then(() => { bgKey = ""; }).catch(() => {});
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = Math.max(240, canvas.clientWidth || 360); H = Math.round(W * 1.15);
    canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); layout();
  }
  function layout() {
    if (!teams) return;
    for (const side of ["A", "B"]) {
      const n = teams[side].length, back = Math.max(0, n - R.FRONT_SLOTS), fy = side === "A" ? H * 0.60 : H * 0.40, by = side === "A" ? H * 0.82 : H * 0.18;
      rad = clamp(W / (2 * Math.max(back, 2) + 3), 15, 30);
      for (let i = 0; i < n; i++) {
        const u = units[side + i]; if (!u) continue;
        if (i < R.FRONT_SLOTS) { const f = Math.min(n, R.FRONT_SLOTS); u.hx = f === 1 ? W / 2 : W * (0.33 + 0.34 * i); u.hy = fy; u.labelW = W * 0.3; }
        else { u.hx = (W * (i - R.FRONT_SLOTS + 1)) / (back + 1); u.hy = by; u.labelW = W / (back + 1) - 4; }
        if (u.status === "active") { u.x = u.hx; u.y = u.hy; }
      }
    }
  }
  function initParts() {
    parts = []; for (let i = 0; i < 34; i++) parts.push({ x: Math.random() * W, y: Math.random() * H, s: 1 + Math.random() * 2.2, v: 0.2 + Math.random() * 0.6 });
  }
  function build() {
    units = {}; floaters = []; fx = []; idx = 0; banner = ""; tickNo = 0; ended = false; endFired = false;
    for (const side of ["A", "B"]) teams[side].forEach((a, i) => {
      const hp = hpOf(a);
      units[side + i] = { key: side + i, side, a, hp, maxHp: hp, status: "active", limp: false, x: 0, y: 0, hx: 0, hy: 0, lunge: null, flash: 0, shake: 0, kx: 0, ky: 0, alpha: 1, tilt: 0, venomTick: -99, out: false };
    });
    layout();
  }

  // ---- applying one event (state always, animation only when !instant) ----
  function floater(u, text, color, big) { if (u) floaters.push({ x: u.x, y: u.y - rad, text, color, t: 0, life: 1000, size: big ? 24 : 16 }); }
  function fire(e, instant) {
    const u = units[e.actor], t = units[e.target];
    tickNo = Math.max(tickNo, e.tick);
    switch (e.type) {
      case "attack": case "crit":
        if (t) { t.hp = Math.max(0, t.hp - e.value); }
        if (!instant && u && t) {
          const dx = t.x - u.x, dy = t.y - u.y, d = Math.hypot(dx, dy) || 1;
          u.lunge = { t: 0, dx: dx / d, dy: dy / d }; t.flash = 1; t.shake = reduceMotion ? 0 : 1; t.kx = (dx / d) * rad * 0.6; t.ky = (dy / d) * rad * 0.6;
          fx.push({ kind: e.type === "crit" ? "star" : "splat", x: t.x, y: t.y, t: 0, life: e.type === "crit" ? 520 : 420, color: SIDE[u.side] || INK, seed: (e.id || 0) * 97 + 13 });
          floater(t, `-${e.value}`, e.type === "crit" ? YELLOW : "#ffffff", e.type === "crit");
          if (e.type === "crit") floater(u, "CRIT", YELLOW, true);
        }
        break;
      case "miss": if (!instant && t) { floater(t, "miss", "#d3d6e8"); t.swoosh = 1; } if (!instant && u && t) { u.lunge = { t: 0, dx: (t.x - u.x) / (Math.hypot(t.x - u.x, t.y - u.y) || 1), dy: (t.y - u.y) / (Math.hypot(t.x - u.x, t.y - u.y) || 1) }; } break;
      case "limp": if (u) u.limp = true; break;
      case "flee": if (u) { u.status = "fled"; u.fleeing = true; if (instant) { u.alpha = 0; u.out = true; } } break;
      case "down": if (u) { u.hp = 0; u.status = "down"; u.fade = true; if (instant) { u.alpha = 0.45; u.tilt = 1.2; } } break;
      case "death": if (!instant && u) floater(u, "KO", PINK, true); break;
      case "synergy": if (!instant && u) floater(u, `+${e.value}% team`, "#7fe8dc"); break;
      case "arena_effect": if (e.actor && !instant && u) floater(u, `${e.value > 0 ? "+" : ""}${e.value}% terrain`, e.value > 0 ? "#b6f08a" : "#ffb98f"); break;
      case "status":
        if (e.sub === "venom" && t) t.venomTick = e.tick + R.VENOM_WINDOW;
        if ((e.sub === "herd" || e.sub === "venom_tick") && t) {
          t.hp = Math.max(0, t.hp - e.value);
          if (!instant) { t.flash = 0.6; floater(t, `-${e.value}`, e.sub === "venom_tick" ? "#9be37a" : "#9fb4ff"); }
        }
        break;
      case "end": banner = e.text; break;
    }
    if (e.sub === "collapse" && u) { u.status = "down"; u.fade = true; if (instant) { u.alpha = 0.45; u.tilt = 1.2; } }
  }
  function applyUpTo(n) { while (idx < n) { fire(evs[idx], true); idx++; } }

  // ---- drawing ----
  function paintBg() {
    const art = ART[arena] || ART.plains, info = R.ARENA_INFO[arena] || R.ARENA_INFO.plains;
    if (!bgCanvas) bgCanvas = document.createElement("canvas");
    bgCanvas.width = Math.round(W * dpr); bgCanvas.height = Math.round(H * dpr);
    const c = bgCanvas.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = art.paper; c.fillRect(0, 0, W, H);
    let seed = 0; for (const ch of arena) seed = seed * 31 + ch.charCodeAt(0);
    c.save(); c.beginPath(); c.rect(0, 0, W, H); c.clip();
    art.scene(c, W, H, rng(seed || 1));
    c.restore();
    c.fillStyle = c.createPattern(getGrain(), "repeat"); c.fillRect(0, 0, W, H);
    // mid line + print marks
    c.strokeStyle = "rgba(230,233,220,.3)"; c.lineWidth = 2; c.setLineDash([10, 9]); c.beginPath(); c.moveTo(0, H / 2); c.lineTo(W, H / 2); c.stroke(); c.setLineDash([]);
    regMark(c, 12, H - 12); regMark(c, W - 12, H - 12); regMark(c, W - 12, 12);
    // arena name tag
    c.font = `12px ${DISPLAY}`; c.textBaseline = "middle"; const label = info.label, tw = c.measureText(label).width;
    c.fillStyle = PINK; c.fillRect(11, 11, tw + 18, 22); c.fillStyle = PAPER; c.fillRect(8, 8, tw + 18, 22);
    c.strokeStyle = INK; c.lineWidth = 1.5; c.strokeRect(8, 8, tw + 18, 22); c.fillStyle = INK; c.textAlign = "left"; c.fillText(label, 17, 19.5);
  }
  function drawBg() {
    const key = `${arena}|${W}|${H}|${dpr}`;
    if (bgKey !== key) { paintBg(); bgKey = key; }
    ctx.drawImage(bgCanvas, 0, 0, W, H);
    const art = ART[arena] || ART.plains;
    ctx.fillStyle = art.fleck; ctx.globalAlpha = 0.5;
    for (const p of parts) ctx.fillRect(p.x, p.y, p.s, p.s);
    ctx.globalAlpha = 1;
  }
  function stepParts(dt) {
    if (reduceMotion) return;
    for (const p of parts) {
      if (arena === "water") { p.y -= p.v * dt * 0.05; p.x += Math.sin((time + p.x) / 400) * 0.2; if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; } }
      else if (arena === "desert") { p.x += p.v * dt * 0.12; if (p.x > W + 5) { p.x = -5; p.y = Math.random() * H; } }
      else if (arena === "forest") { p.y += p.v * dt * 0.04; p.x += Math.sin((time + p.y) / 500) * 0.4; if (p.y > H + 5) { p.y = -5; p.x = Math.random() * W; } }
      else if (arena === "mountain") { p.y += p.v * dt * 0.05; p.x -= p.v * dt * 0.02; if (p.y > H + 5) { p.y = -5; p.x = Math.random() * W; } }
      else { p.x += p.v * dt * 0.05; p.y += Math.sin((time + p.x) / 700) * 0.2; if (p.x > W + 5) { p.x = -5; p.y = Math.random() * H; } }
    }
  }
  function drawFx(kind) {
    for (const f of fx) {
      if ((kind === "under") !== (f.kind === "splat")) continue;
      const p = clamp(f.t / f.life, 0, 1), s = 0.55 + 0.6 * (1 - (1 - p) * (1 - p));
      ctx.save(); ctx.globalAlpha = 1 - p * p;
      if (f.kind === "splat") { blob(ctx, f.x, f.y, rad * 1.25 * s, f.seed); ctx.fillStyle = f.color; ctx.fill(); }
      else { blob(ctx, f.x, f.y, rad * 1.9 * s, f.seed, 12); ctx.fillStyle = YELLOW; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke(); }
      ctx.restore();
    }
  }
  function drawUnit(u) {
    if (u.out) return;
    const live = u.status === "active", ink = live ? SIDE[u.side] : GREY;
    let x = u.x + (u.shake > 0 ? Math.sin(time / 25) * 4 * u.shake : 0) + u.kx, y = u.y + u.ky;
    if (u.lunge) { const p = u.lunge.t / 300, o = Math.sin(Math.PI * clamp(p, 0, 1)) * rad * 1.4; x += u.lunge.dx * o; y += u.lunge.dy * o; }
    ctx.save(); ctx.globalAlpha = u.alpha; ctx.translate(x, y);
    ctx.rotate(u.tilt + (u.limp && live ? Math.sin(time / 90) * 0.18 : 0));
    // second ink, off-register
    ctx.beginPath(); ctx.arc(3, 3, rad, 0, TAU); ctx.fillStyle = live ? UNDER[u.side] : "rgba(123,127,152,.4)"; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); ctx.fillStyle = PAPER; ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, rad - 2, 0, TAU); ctx.clip();
    const im = getImg(u.a.image), sil = u.a.silhouette ? getSil(u.a.silhouette, ink) : null;
    if (im) ctx.drawImage(im, -rad, -rad, rad * 2, rad * 2);
    else if (sil && sil.canvas) { const sc = sil.canvas, k = (rad * 1.5) / Math.max(sc.width, sc.height); ctx.drawImage(sc, (-sc.width * k) / 2, (-sc.height * k) / 2, sc.width * k, sc.height * k); }
    else if (sil && !sil.bad) { /* silhouette still loading: show the bare disc */ }
    else if (u.a.emoji) { ctx.font = `${rad * 1.1}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = INK; ctx.fillText(u.a.emoji, 0, 2); }
    else { ctx.font = `${rad * 0.85}px ${DISPLAY}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = ink; ctx.fillText(initials(u.a.name), 0, 1); }
    if (tickNo <= u.venomTick && live) {
      ctx.strokeStyle = "rgba(15,140,128,.7)"; ctx.lineWidth = 2;
      for (let k = -rad * 2; k < rad * 2; k += 6) { ctx.beginPath(); ctx.moveTo(k, rad); ctx.lineTo(k + rad, -rad); ctx.stroke(); }
    }
    if (u.flash > 0) { ctx.fillStyle = `rgba(255,210,58,${u.flash * 0.85})`; ctx.fillRect(-rad, -rad, rad * 2, rad * 2); }
    ctx.restore();
    ctx.lineWidth = 3; ctx.strokeStyle = live ? INK : GREY; ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); ctx.stroke();
    if (u.swoosh > 0) { ctx.strokeStyle = `rgba(22,22,58,${u.swoosh})`; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(0, 0, rad + 7, -1, 1); ctx.stroke(); ctx.setLineDash([]); }
    if (!live) { ctx.strokeStyle = GREY; ctx.lineWidth = 3; const d = rad * 0.55; ctx.beginPath(); ctx.moveTo(-d, -d); ctx.lineTo(d, d); ctx.moveTo(d, -d); ctx.lineTo(-d, d); ctx.stroke(); }
    ctx.restore();
    // name + hp bar (not rotated)
    ctx.save(); ctx.globalAlpha = Math.max(u.alpha, 0.5); ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.font = `800 ${Math.max(10, rad * 0.5)}px ${BODY}`; ctx.lineJoin = "round"; ctx.lineWidth = 4; ctx.strokeStyle = PAPER; ctx.fillStyle = INK;
    let nm = u.a.name; const maxW = u.labelW || rad * 3;
    if (ctx.measureText(nm).width > maxW) { while (nm.length > 3 && ctx.measureText(nm + "…").width > maxW) nm = nm.slice(0, -1); nm = nm.trimEnd() + "…"; }
    ctx.strokeText(nm, x, y + rad + 12); ctx.fillText(nm, x, y + rad + 12);
    const bw = rad * 2, f = clamp(u.hp / u.maxHp, 0, 1), bx = x - rad, by = y + rad + 17;
    ctx.fillStyle = INK; ctx.fillRect(bx - 2, by - 2, bw + 4, 9);
    ctx.fillStyle = f > 0.5 ? "#19b39e" : f > 0.25 ? YELLOW : "#ff4d6d"; ctx.fillRect(bx, by, bw * f, 5);
    ctx.fillStyle = INK; for (let k = 1; k < 4; k++) ctx.fillRect(bx + (bw * k) / 4 - 0.5, by, 1, 5);
    ctx.restore();
  }
  function drawBanner(label) {
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.035);
    let fs = 22; ctx.font = `${fs}px ${DISPLAY}`; let tw = ctx.measureText(label).width;
    if (tw > W - 56) { fs = Math.max(11, Math.floor((fs * (W - 56)) / tw)); ctx.font = `${fs}px ${DISPLAY}`; tw = ctx.measureText(label).width; }
    const bw = tw + 36, bh = fs + 24;
    ctx.fillStyle = PINK; ctx.fillRect(-bw / 2 + 5, -bh / 2 + 5, bw, bh);
    ctx.fillStyle = "#070c0b"; ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.strokeStyle = YELLOW; ctx.lineWidth = 3; ctx.strokeRect(-bw / 2 + 1.5, -bh / 2 + 1.5, bw - 3, bh - 3);
    ctx.fillStyle = YELLOW; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(label, 0, 1);
    ctx.restore();
  }
  function draw() {
    drawBg(); drawFx("under");
    for (const u of Object.values(units)) drawUnit(u);
    drawFx("over");
    ctx.lineJoin = "round"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.strokeStyle = INK;
    for (const f of floaters) {
      ctx.globalAlpha = clamp(1.4 - f.t / f.life * 1.4, 0, 1); ctx.font = `${f.size}px ${DISPLAY}`; ctx.lineWidth = 5; ctx.fillStyle = f.color;
      const fy = f.y - f.t * 0.04; ctx.strokeText(f.text, f.x, fy); ctx.fillText(f.text, f.x, fy);
    }
    ctx.globalAlpha = 1;
    const label = pos < 0 ? `Starts in ${Math.ceil(-pos / 1000)}s` : banner;
    if (label) drawBanner(label);
  }

  function frame(ts) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(100, ts - (last || ts)); last = ts; time = ts;
    if (!teams) return;
    if (playing && !ended) pos += dt * speed;
    if (pos >= 0) {
      const target = Math.min(evs.length, Math.floor(pos / R.EVENT_MS) + 1);
      if (target - idx > 6) { applyUpTo(target - 6); }
      let fired = false;
      while (idx < target) { fire(evs[idx], false); idx++; fired = true; }
      if (fired && cb.onProgress) cb.onProgress(idx);
      if (idx >= evs.length && !ended) { ended = true; }
      if (ended && !endFired) { endFired = true; cb.onEnd && cb.onEnd(); }
    }
    const k = dt * speed;
    for (const u of Object.values(units)) {
      if (u.lunge) { u.lunge.t += k; if (u.lunge.t >= 300) u.lunge = null; }
      if (u.flash > 0) u.flash = Math.max(0, u.flash - k / 250);
      if (u.shake > 0) u.shake = Math.max(0, u.shake - k / 300);
      if (u.swoosh > 0) u.swoosh = Math.max(0, u.swoosh - k / 300);
      u.kx *= 0.85; u.ky *= 0.85;
      if (u.fade && u.alpha > 0.45) { u.alpha = Math.max(0.45, u.alpha - k / 600); u.tilt = Math.min(1.2, u.tilt + k / 500); }
      if (u.fleeing && !u.out) { u.x += (u.hx < W / 2 ? -1 : 1) * k * 0.35; u.alpha = Math.max(0, u.alpha - k / 900); if (u.x < -rad || u.x > W + rad || u.alpha <= 0) { u.out = true; } }
    }
    for (const f of floaters) f.t += k; floaters = floaters.filter((f) => f.t < f.life);
    for (const f of fx) f.t += k; fx = fx.filter((f) => f.t < f.life);
    stepParts(dt); draw();
  }

  window.addEventListener("resize", resize);
  raf = requestAnimationFrame(frame);

  return {
    // fight: {teamA, teamB, arena, events}; startPos = ms already elapsed (negative = countdown)
    load(fight, startPos = 0) {
      teams = { A: fight.teamA, B: fight.teamB }; arena = fight.arena; evs = fight.events; pos = startPos; playing = true; ended = false; bgKey = "";
      resize(); initParts(); build();
    },
    play() { playing = true; }, pause() { playing = false; }, toggle() { playing = !playing; return playing; },
    setSpeed(s) { speed = s; },
    skip() { applyUpTo(evs.length); pos = evs.length * R.EVENT_MS; ended = true; if (cb.onProgress) cb.onProgress(idx); if (!endFired) { endFired = true; cb.onEnd && cb.onEnd(); } },
    replay() { if (!teams) return; pos = 0; playing = true; build(); resize(); if (cb.onProgress) cb.onProgress(0); },
    getState() { return { pos, playing, speed, ended, idx, total: evs.length }; },
    destroy() { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); }
  };
}

// ---- side event log with clickable ids (ids are used by appeals) ----
export function renderEventLog(container, events, upto, opts = {}) {
  container.replaceChildren();
  const ul = document.createElement("ul"); ul.className = "evlog";
  for (let i = 0; i < Math.min(upto, events.length); i++) {
    const e = events[i], li = document.createElement("li");
    li.className = `ev ev-${e.type}${opts.highlightId === e.id ? " hl" : ""}`; li.dataset.id = e.id;
    const b = document.createElement("button"); b.type = "button"; b.className = "evid"; b.textContent = "#" + e.id;
    b.addEventListener("click", () => opts.onClick && opts.onClick(e.id));
    const tk = document.createElement("span"); tk.className = "tk"; tk.textContent = "t" + e.tick;
    li.append(b, tk, document.createTextNode(e.text)); ul.append(li);
  }
  container.append(ul); container.scrollTop = container.scrollHeight;
}

// ---- "Why they lost" cards (describeAutopsy text now, AI narration swapped in when it exists) ----
export function renderLossCards(container, autopsy, narration, opts = {}) {
  container.replaceChildren();
  const nar = Array.isArray(narration) ? narration : narration ? Object.values(narration) : [];
  for (const e of autopsy) {
    if (e.outcome === "survived") continue;
    const card = document.createElement("div"); card.className = `loss ${e.side === "A" ? "sideA" : "sideB"}`;
    const n = nar.find((x) => x && (x.animal === e.name || x.animal === e.animalId));
    const head = document.createElement("strong"); head.textContent = e.name;
    const how = document.createElement("span"); how.className = "how"; how.textContent = e.outcome; head.append(how);
    const p = document.createElement("p"); p.textContent = n && n.narration ? n.narration : describeAutopsy(e);
    card.append(head, p);
    const ids = n && n.eventIds && n.eventIds.length ? n.eventIds : [e.turningPoint, e.killEventId].filter((v, i, a) => v != null && a.indexOf(v) === i);
    if (ids.length) {
      const row = document.createElement("div"); row.className = "row wrap";
      for (const id of ids) { const b = document.createElement("button"); b.type = "button"; b.className = "evid"; b.textContent = "#" + id; b.addEventListener("click", () => opts.onClick && opts.onClick(id)); row.append(b); }
      card.append(row);
    }
    container.append(card);
  }
  if (!container.children.length) { const p = document.createElement("p"); p.className = "muted"; p.textContent = "Nobody was eliminated."; container.append(p); }
}
