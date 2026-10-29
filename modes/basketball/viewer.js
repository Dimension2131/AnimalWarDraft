// modes/basketball/viewer.js: the cinematic match viewer (DOM + 2D canvas, no libraries). It only DRAWS what choreo.frameAt(M, now - startAt) says, so every device sees the same film in sync,
// a late joiner lands on the right second with no replay, and "skip to the final buzzer" is a local jump to the last frame.
// Reduced motion (or no canvas): scoreboard + commentary feed only, driven by the same clock.
import * as C from "./choreo.js";
import * as E from "./engine.js";
import * as P from "./replay.js";
import { photo } from "./card.js";
import { failed } from "../../js/preload.js";
import { leaders, quarterTable } from "./stats.js";
import { mulberry32 } from "../../js/sim.js";
import { createVoice } from "./voice.js";
import { createMusic } from "./music.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rc = (el, ...kids) => el.replaceChildren(...kids.filter((k) => k != null && k !== false));
const hueOf = (s) => { let x = 7; for (const c of String(s)) x = (Math.imul(x, 31) + c.charCodeAt(0)) | 0; return Math.abs(x) % 360; };
export function kitsOf(names) {   // [{shirt, text}] per side; the second side is moved away if both hues are close
  const a = hueOf(names[0]); let b = hueOf(names[1]); if (Math.min(Math.abs(a - b), 360 - Math.abs(a - b)) < 70) b = (a + 170) % 360;
  return [{ shirt: `hsl(${a} 78% 46%)`, text: "#fff" }, { shirt: `hsl(${b} 78% 46%)`, text: "#fff" }];
}
// court (feet, x along the length) -> screen. Landscape: x runs left to right. Portrait: the court stands upright and a rising x goes UP the screen.
export function project(view, u, v) { return view.portrait ? [view.W / 2 + (v - view.cy) * view.s, view.H / 2 - (u - view.cx) * view.s] : [view.W / 2 + (u - view.cx) * view.s, view.H / 2 + (v - view.cy) * view.s]; }

export function createViewer({ h, N, ent, onSkip }) {
  const reduced = typeof matchMedia === "function" && !!(matchMedia("(prefers-reduced-motion: reduce)") || {}).matches;
  const sb = { a: h("span", { class: "tn" }), b: h("span", { class: "tn" }), s: h("span", { class: "big" }, "0 - 0") };
  const clock = h("div", { class: "bb-clock" }), log = h("div", { class: "bb-log", "aria-live": "polite" });
  const canvas = reduced ? null : h("canvas", { class: "bb-canvas", "aria-hidden": "true" }), ov = h("div", { class: "bb-ov" });
  const view = h("div", { class: "bb-view" }, canvas, ov);
  const state = { M: null, startAt: 0, skipped: false, lastR: -1, shown: 0, key: "", cam: { cx: 47, cy: 25, z: 1 }, camMode: "follow", pp: new Map(), lastT: 0, ovKey: "", alive: true, raf: 0, sound: false, audio: null, momSeen: 0, voice: null, music: null, vs: 1, spokenIdx: 0, dims: {}, ctx: null, kits: null, lastLive: -1e9, gfx: "auto", light: false, ft: [], frames: 0, crowd: null, zPrev: [9, 9], lastBounce: -1e9, quarterKey: "" };
  const skipBtn = h("button", { class: "btn small", type: "button", onclick: () => { if (!state.skipped) { state.skipped = true; if (onSkip) { try { onSkip(state.key); } catch (e) { /* the local skip still works */ } } } } }, "Skip to the final buzzer");
  const camBtn = h("button", { class: "btn small", type: "button", onclick: () => { state.camMode = state.camMode === "follow" ? "full" : "follow"; camBtn.textContent = state.camMode === "follow" ? "Camera: follow ball" : "Camera: full court"; } }, "Camera: follow ball");
  const sndBtn = h("button", { class: "btn small", type: "button", onclick: () => toggleSound() }, "Sound: off");
  const voiceBtn = h("button", { class: "btn small", type: "button", onclick: () => toggleVoice() }, "Commentary: off");
  const musicBtn = h("button", { class: "btn small", type: "button", onclick: () => toggleMusic() }, "Music: off");
  const VSPEEDS = [["Slow", 0.85], ["Normal", 1], ["Fast", 1.15]];
  const speedBtn = h("button", { class: "btn small", type: "button", onclick: () => { state.vs = (state.vs + 1) % VSPEEDS.length; speedBtn.textContent = "Voice speed: " + VSPEEDS[state.vs][0]; if (state.voice) state.voice.setSpeed(VSPEEDS[state.vs][1]); } }, "Voice speed: Normal");
  const GFX = [["auto", "Graphics: auto"], ["light", "Graphics: light"], ["full", "Graphics: full"]];
  const gfxBtn = h("button", { class: "btn small", type: "button", onclick: () => { const i = (GFX.findIndex((g) => g[0] === state.gfx) + 1) % GFX.length; state.gfx = GFX[i][0]; state.light = state.gfx === "light"; state.ft = []; gfxBtn.textContent = GFX[i][1]; } }, "Graphics: auto");
  const ctl = h("div", { class: "bb-ctl row wrap" }, skipBtn, reduced ? null : camBtn, sndBtn, voiceBtn, speedBtn, musicBtn, reduced ? null : gfxBtn);
  const liveWrap = h("div", { class: "bb-live" }), qt = h("div", { class: "bb-scroll" }), lead = h("div", { class: "bb-lead" });
  liveWrap.append(qt, lead);
  const el = h("div", { class: "bb-viewer" }, h("div", { class: "bb-score" }, sb.a, sb.s, sb.b), clock, reduced ? h("p", { class: "muted small center" }, "Reduced motion is on: commentary only.") : view, ctl, log, liveWrap);

  // ----- spoken commentary: off by default, started by a tap (browsers block speech before one). The short film (Quick) reads only the key lines. -----
  function toggleVoice() {
    if (state.voice && state.voice.on) { state.voice.disable(); voiceBtn.textContent = "Commentary: off"; return; }
    const w = typeof window !== "undefined" ? window : {};
    if (!state.voice) state.voice = createVoice({ synth: w.speechSynthesis, Utt: w.SpeechSynthesisUtterance });
    if (!state.voice.supported) { voiceBtn.textContent = "Commentary: not available"; return; }
    if (state.M) state.voice.setMode(state.M.speed === "quick" ? "fast" : "full");
    state.voice.setSpeed(VSPEEDS[state.vs][1]); state.voice.enable(); voiceBtn.textContent = "Commentary: on";
    state.spokenIdx = state.M && state.M.animated ? C.linesUntil(state.M, Math.max(0, state.lastR)).length : 0;   // start from "now", never read the backlog
  }
  function speakFeed(M, r) {
    const v = state.voice; if (!v || !v.on) return;
    if (state.skipped) { v.cancel(); state.spokenIdx = M.lines.length; return; }
    if (r < state.lastR - 1) state.spokenIdx = C.linesUntil(M, r).length;
    while (state.spokenIdx < M.lines.length && M.lines[state.spokenIdx].r <= r) { const L = M.lines[state.spokenIdx++]; v.offer(L, r - L.r); }
    v.tick();
  }

  // ----- sound: off by default; the AudioContext is only created on the tap that turns it on (browsers block autoplay) -----
  function toggleSound() {
    state.sound = !state.sound; sndBtn.textContent = "Sound: " + (state.sound ? "on" : "off");
    if (state.sound && !ensureAudio()) { state.sound = false; sndBtn.textContent = "Sound: not available"; }
    if (!state.sound) crowdLevel(0);
  }
  function ensureAudio() {
    if (!state.audio) { try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) state.audio = new AC(); } catch (e) { state.audio = null; } }
    if (state.audio && state.audio.state === "suspended") { try { state.audio.resume(); } catch (e) { /* ignore */ } }
    return state.audio;
  }
  function toggleMusic() {
    if (state.music && state.music.running) { state.music.stop(); musicBtn.textContent = "Music: off"; return; }
    const a = ensureAudio(); if (!a) { musicBtn.textContent = "Music: not available"; return; }
    if (!state.music) state.music = createMusic({ ctx: a });
    if (!state.music) { musicBtn.textContent = "Music: not available"; return; }
    state.music.start(); musicBtn.textContent = "Music: on";
  }
  const sfxOK = () => state.sound && state.audio;
  function tone(type, f0, f1, dur, vol, at = 0) { const a = state.audio; try { const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + at; o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.05); } catch (e) { /* sound is optional */ } }
  function noise(dur, freq, vol, q = 1) { const a = state.audio; try { const n = Math.max(1, Math.floor(a.sampleRate * dur)), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / n); const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol; src.buffer = buf; src.connect(f); f.connect(g); g.connect(a.destination); src.start(); } catch (e) { /* sound is optional */ } }
  const SFX = {
    whistle: () => { tone("square", 2900, 2900, 0.45, 0.1); },
    buzzer: () => { tone("sawtooth", 180, 180, 1.1, 0.14); tone("square", 182, 182, 1.1, 0.08); },
    swish: () => noise(0.35, 4200, 0.18, 0.8), three: () => { noise(0.4, 4200, 0.2, 0.8); },
    rim: () => { tone("triangle", 520, 380, 0.25, 0.14); tone("sine", 1040, 760, 0.18, 0.05); },
    dunk: () => { tone("sine", 140, 55, 0.3, 0.22); noise(0.25, 1500, 0.12, 0.7); },
    block: () => { tone("square", 700, 300, 0.12, 0.1); noise(0.12, 2000, 0.14, 1); },
    steal: () => noise(0.14, 2600, 0.12, 1.2), tip: () => { tone("sine", 220, 110, 0.15, 0.12); },
    bounce: () => tone("sine", 150, 70, 0.09, 0.1)
  };
  // the crowd: a quiet bed that follows the heat of the game, plus a swell when the moment deserves one (a three, a dunk, a block, a late bucket)
  function crowdLevel(v) { const a = state.audio; if (!a) return; try { if (!state.crowd) { const n = a.sampleRate * 2, buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); src.buffer = buf; src.loop = true; f.type = "bandpass"; f.frequency.value = 650; f.Q.value = 0.5; g.gain.value = 0.0001; src.connect(f); f.connect(g); g.connect(a.destination); src.start(); state.crowd = { g, f }; } state.crowd.g.gain.setTargetAtTime(Math.max(0.0001, v), a.currentTime, 0.4); } catch (e) { /* sound is optional */ } }
  function cheer(power) { const a = state.audio; if (!sfxOK() || !a || !state.crowd) return; try { const t = a.currentTime, g = state.crowd.g.gain; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.03 + 0.09 * clamp(power, 0, 1), t + 0.25); g.setTargetAtTime(0.012, t + 0.4, 0.9); state.crowd.f.frequency.setValueAtTime(900, t); state.crowd.f.frequency.setTargetAtTime(650, t + 0.5, 0.8); } catch (e) { /* ignore */ } }

  // ----- feed, quarter table and leaders -----
  const addLine = (L) => { const d = h("div", { class: (L.cls || "") + (L.hype >= 2 ? " hot" : "") }, L.text); log.append(d); };
  function syncFeed(M, r) {
    const all = M.animated ? C.linesUntil(M, r) : (state.skipped || r >= 0 ? M.highlights : []);
    if (r < state.lastR - 1 || state.shown > all.length) { rc(log); state.shown = 0; }
    if (state.shown === 0 && all.length > 16) { log.append(h("div", { class: "mark" }, "…earlier play not shown")); state.shown = all.length - 16; }
    for (let i = state.shown; i < all.length; i++) addLine(all[i]);
    if (all.length !== state.shown) { state.shown = all.length; while (log.children.length > 90) log.children[0].remove(); log.scrollTop = log.scrollHeight; }
  }
  function syncLive(M, r, score) {
    const evs = C.eventsUntil(M, r), names = M.names, qs = quarterTable(evs, score), hdr = qs.map((x) => P.periodLabel(x.q));
    rc(qt, h("table", { class: "bb-qs" }, h("tr", {}, h("th", {}, ""), ...hdr.map((x) => h("th", {}, x)), h("th", {}, "T")), h("tr", {}, h("td", {}, names[0]), ...qs.map((x) => h("td", {}, x.a)), h("td", {}, score[0])), h("tr", {}, h("td", {}, names[1]), ...qs.map((x) => h("td", {}, x.b)), h("td", {}, score[1]))));
    const ld = leaders(evs); rc(lead, ...ld.map((x, s) => h("div", {}, h("b", {}, names[s]), h("div", {}, x ? `${x.n}: ${x.pts} pts, ${x.reb} reb, ${x.ast} ast` : "—"))));
  }

  // ----- overlays (cards from the choreography; the facts in them come from the event log) -----
  function overlayFor(M, fr) {
    const c = fr && fr.card; if (!c) return null;
    const key = c.type + ":" + Math.round(c.r0);
    if (state.ovKey === key) return { key, node: undefined };
    const names = M.names, d = c.data || {}, who = (id) => (id ? h("div", { class: "bb-plate" }, photo(h, ent(id), "bb-photo")) : null);
    const box = (cls, ...kids) => ({ key, node: h("div", { class: "bb-card " + cls }, ...kids) });
    const sc = (s) => `${names[0]} ${s[0]} - ${s[1]} ${names[1]}`;
    switch (c.type) {
      case "tip": return box("cover", h("b", {}, "Tip-off"), h("div", { class: "bb-big2" }, `${names[0]} vs ${names[1]}`));
      case "period": return box("", h("b", {}, `Quarter ${d.n}`));
      case "ot": return box("cover hot", h("b", {}, d.n > 1 ? `Overtime ${d.n}` : "Overtime"), h("div", { class: "muted small" }, "All square after four quarters"));
      case "half": return box("cover", h("b", {}, "Halftime"), h("div", { class: "bb-big2" }, sc(d.score)));
      case "qend": return box("cover", h("b", {}, d.n <= 4 ? `End of quarter ${d.n}` : "End of overtime"), h("div", { class: "bb-big2" }, sc(d.score)));
      case "final": { const w = d.score[0] > d.score[1] ? 0 : 1; return box("cover hot", h("b", {}, "Final"), h("div", { class: "bb-big2" }, sc(d.score)), h("div", { class: "muted small" }, `${names[w]} win`)); }
      case "coin": return box("cover", h("b", {}, "Coin toss"), h("div", { class: "muted small" }, `${d.name} win the toss`));
      case "timeout": return box("cover", h("b", {}, `Timeout, ${d.name}`), h("div", { class: "muted small" }, `${d.left} left`));
      case "play": return box("hot row bb-who", who(d.id), h("div", {}, h("b", {}, d.text), h("div", { class: "muted small" }, `${d.name} (${names[d.s]})`)));
      case "run": return box("hot", h("b", {}, `${d.name} on a ${d.n}-0 run`));
      case "milestone": return box("hot row bb-who", who(d.id), h("div", {}, h("b", {}, `${d.pts} points`), h("div", { class: "muted small" }, `${d.name} (${names[d.s]})`)));
      case "buzzer": return box("hot row bb-who", who(d.id), h("div", {}, h("b", {}, "Buzzer-beater!"), h("div", { class: "muted small" }, `${d.name} (${names[d.s]})`)));
      case "trouble": return box("", h("b", {}, `Foul trouble: ${d.name}`), h("div", { class: "muted small" }, `${d.n} fouls (${names[d.s]})`));
      case "foulout": return box("", h("b", {}, "Fouled out"), h("div", { class: "muted small" }, `${d.name} (${names[d.s]})`));
      case "injury": return box("", h("b", {}, "Injury"), h("div", { class: "muted small" }, `${d.name} (${names[d.s]}) is hurt`));
      case "ft": return box("", h("b", {}, `${d.name} at the line`), h("div", { class: "muted small" }, `${d.n} shot${d.n > 1 ? "s" : ""}`));
      default: return null;
    }
  }

  // ----- player faces: a round photo (pre-rendered once into a small canvas); a number disc if the photo is missing -----
  const faces = new Map();
  function faceOf(id) {
    let f = faces.get(id); if (f) return f; f = { c: null, bad: false }; faces.set(id, f);
    const e = ent(id); if (!e || typeof Image === "undefined") { f.bad = true; return f; }
    try {
      const im = new Image(); im.onload = () => { try { const w = im.naturalWidth || im.width || 0, hh = im.naturalHeight || im.height || 0; if (!w || !hh) { f.bad = true; return; } const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), sq = Math.min(w, hh), sy = Math.max(0, (hh - sq) * 0.15); g.beginPath(); g.arc(32, 32, 32, 0, Math.PI * 2); g.clip(); g.drawImage(im, 0, sy, sq, sq, 0, 0, 64, 64); f.c = c; } catch (err) { f.bad = true; } };
      const src = e.image || "basketball/img/" + e.id + ".png"; if (failed.has(src)) { f.bad = true; return f; }   // the shared memory of missing photos: no repeat request
      im.onerror = () => { f.bad = true; failed.add(src); }; im.src = src;
    } catch (err) { f.bad = true; }
    return f;
  }
  const roundRect = (g, x, y, w, hh, r) => { g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + hh - r); g.quadraticCurveTo(x + w, y + hh, x + w - r, y + hh); g.lineTo(x + r, y + hh); g.quadraticCurveTo(x, y + hh, x, y + hh - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); };

  // ----- canvas -----
  function setup() {
    if (!canvas || typeof canvas.getContext !== "function") return null;
    if (!state.ctx) state.ctx = canvas.getContext("2d");
    const dpr = state.light ? 1 : Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1), W = Math.round(canvas.clientWidth || 640), H = Math.round(canvas.clientHeight || 340);
    if (state.dims.W !== W || state.dims.H !== H || state.dims.dpr !== dpr) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); state.dims = { W, H, dpr }; }
    return state.ctx;
  }
  // The floor: irregular planks running along the court (laid out once from a fixed pattern), a surround in the team colours, painted lanes, solid and dashed free-throw semicircles,
  // the restricted-area arc, the three-point line with straight corners, lane hash marks, backboards with their supports and the centre circle.
  const PLANKS = (() => { const rnd = mulberry32(2024), tones = ["#d8a768", "#d2a061", "#dcae70", "#cd9a58", "#d5a564"], out = []; for (let y = 0; y < 50; y += 1.6) { let x = -rnd() * 9; while (x < 94) { const len = 9 + rnd() * 10; if (x + len > 0) out.push([Math.max(0, x), y, Math.min(94, x + len), Math.min(50, y + 1.6), tones[Math.floor(rnd() * tones.length)]]); x += len; } } return out; })();
  function drawCourt(g, v, kits) {
    const R = (u0, v0, u1, v1) => { const a = project(v, u0, v0), b = project(v, u1, v1); return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])]; };
    const line = Math.max(1.2, v.s * 0.17), WHITE = "rgba(255,255,255,.95)";
    g.fillStyle = "#1a0f0c"; g.fillRect(0, 0, v.W, v.H);
    // surround: the colour of the team that defends that end first, darkened
    g.fillStyle = "#3a1a14"; g.fillRect(...R(-6, -6, 100, 56)); g.globalAlpha = 0.5; g.fillStyle = kits[0].shirt; g.fillRect(...R(-6, -6, 47, 56)); g.fillStyle = kits[1].shirt; g.fillRect(...R(47, -6, 100, 56)); g.globalAlpha = 1;
    g.fillStyle = "#d4a15f"; g.fillRect(...R(0, 0, 94, 50));
    if (!state.light) for (const [x0, y0, x1, y1, c] of PLANKS) { g.fillStyle = c; g.fillRect(...R(x0, y0, x1, y1)); g.strokeStyle = "rgba(90,50,20,.13)"; g.lineWidth = 1; g.strokeRect(...R(x0, y0, x1, y1)); }
    // painted lanes (the whole key from the baseline to the free-throw line)
    g.globalAlpha = 0.92; g.fillStyle = kits[0].shirt; g.fillRect(...R(0, 17, 19, 33)); g.fillStyle = kits[1].shirt; g.fillRect(...R(75, 17, 94, 33)); g.globalAlpha = 1;
    g.strokeStyle = WHITE; g.lineWidth = line; g.setLineDash([]);
    const arc = (u, w, r, a0, a1, dash) => { const p = project(v, u, w), rot = v.portrait ? -Math.PI / 2 : 0; g.setLineDash(dash ? [v.s * 0.9, v.s * 0.9] : []); g.beginPath(); g.arc(p[0], p[1], r * v.s, a0 + rot, a1 + rot); g.stroke(); g.setLineDash([]); };
    const seg = (u0, v0, u1, v1) => { const a = project(v, u0, v0), b = project(v, u1, v1); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
    g.strokeRect(...R(0, 0, 94, 50)); seg(47, 0, 47, 50);
    arc(47, 25, 6, 0, Math.PI * 2); arc(47, 25, 2, 0, Math.PI * 2);
    seg(47, -2.2, 47, 0); seg(47, 50, 47, 52.2);   // the centre-line ticks outside the sidelines
    for (const end of [0, 1]) {
      const sg = end === 0 ? 1 : -1, X = (x) => (end === 0 ? x : 94 - x), hx = X(5.25), turn = end === 0 ? 0 : Math.PI;   // arcs are drawn facing the court
      g.strokeRect(...R(X(0), 17, X(19), 33));
      for (const t of [7, 8, 11, 14, 17]) { seg(X(t), 17, X(t), 16.1); seg(X(t), 33, X(t), 33.9); }   // lane hash marks
      arc(X(19), 25, 6, turn - Math.PI / 2, turn + Math.PI / 2);   // free-throw semicircle: solid outside the key,
      arc(X(19), 25, 6, turn + Math.PI / 2, turn + (3 * Math.PI) / 2, true);   // dashed inside it
      arc(hx, 25, 4, turn - Math.PI / 2, turn + Math.PI / 2);   // restricted area
      // three-point line: straight corner sections 3 ft from the sideline, then an arc of radius 23.75 ft around the rim
      const dy = 22, th0 = Math.asin(dy / 23.75), ax = Math.sqrt(23.75 * 23.75 - dy * dy);
      seg(X(0), 3, X(5.25 + ax), 3); seg(X(0), 47, X(5.25 + ax), 47); arc(hx, 25, 23.75, turn - th0, turn + th0);
      // backboard, its support and the rim
      g.save(); g.lineWidth = Math.max(2.5, v.s * 0.32); g.strokeStyle = "#f4f4f4"; seg(X(4), 22, X(4), 28); g.restore(); g.lineWidth = Math.max(1.4, v.s * 0.2); seg(X(4), 25, X(4.5), 25);
      const rp = project(v, hx, 25); g.beginPath(); g.arc(rp[0], rp[1], 0.75 * v.s, 0, Math.PI * 2); g.strokeStyle = "#ff6a2b"; g.lineWidth = Math.max(1.6, v.s * 0.24); g.stroke(); g.strokeStyle = WHITE; g.lineWidth = line; void sg;
    }
  }
  function draw(fr, now) {
    if (state.light && (state.frames++ & 1)) return;   // light graphics: every other frame
    const g = setup(); if (!g) return;
    const { W, H, dpr } = state.dims, portrait = H > W * 1.05, s0 = portrait ? Math.min(W / 58, H / 102) : Math.min(W / 102, H / 58);
    const zoom = state.camMode === "full" ? 1 : portrait ? 1.7 : 1.9;
    const target = state.camMode === "full" ? [47, 25] : [fr.ball.x, fr.ball.y], dt = clamp((now - state.lastT) / 1000, 0, 0.25); state.lastT = now;
    const c = state.cam, k = 1 - Math.exp(-dt / 0.4), jump = Math.hypot(target[0] - c.cx, target[1] - c.cy) > 45;
    c.cx = jump ? target[0] : c.cx + (target[0] - c.cx) * k; c.cy = jump ? target[1] : c.cy + (target[1] - c.cy) * k; c.z = jump ? zoom : c.z + (zoom - c.z) * k;
    const s = s0 * c.z, halfU = (portrait ? H : W) / (2 * s), halfV = (portrait ? W : H) / (2 * s);
    const cx = halfU >= 51 ? 47 : clamp(c.cx, halfU - 4, 98 - halfU), cy = halfV >= 29 ? 25 : clamp(c.cy, halfV - 4, 54 - halfV);
    const v = { W, H, s, cx, cy, portrait }, kits = state.kits || (state.kits = kitsOf(state.M.names));
    g.setTransform(dpr, 0, 0, dpr, 0, 0); drawCourt(g, v, kits);
    const a2 = 1 - Math.exp(-dt / 0.05), r = Math.max(7, 1.55 * s), draws = [];
    for (const p of fr.players) {
      if (!p.on) continue;
      const key = p.s + ":" + p.i; let q = state.pp.get(key);
      if (!q || q.id !== p.id || Math.hypot(p.x - q.x, p.y - q.y) > 8) q = { x: p.x, y: p.y, id: p.id }; else { q.x += (p.x - q.x) * a2; q.y += (p.y - q.y) * a2; }
      state.pp.set(key, q);
      const pt = project(v, q.x, q.y); if (pt[0] < -30 || pt[1] < -30 || pt[0] > W + 30 || pt[1] > H + 30) continue;
      draws.push({ p, pt });
    }
    draws.sort((m, n) => m.pt[1] - n.pt[1]);
    for (const { p, pt } of draws) {
      const col = kits[p.s].shirt, f = state.light ? { bad: true } : faceOf(p.id);
      if (!state.light) { g.fillStyle = "rgba(0,0,0,.28)"; g.beginPath(); g.ellipse(pt[0], pt[1] + r * 0.85, r * 0.9, r * 0.35, 0, 0, Math.PI * 2); g.fill(); }
      if (f.c) g.drawImage(f.c, pt[0] - r, pt[1] - r, 2 * r, 2 * r);
      else { g.beginPath(); g.arc(pt[0], pt[1], r, 0, Math.PI * 2); g.fillStyle = col; g.fill(); g.fillStyle = "#fff"; g.font = `700 ${Math.round(r * 1.05)}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(p.num), pt[0], pt[1] + 0.5); }
      g.beginPath(); g.arc(pt[0], pt[1], r, 0, Math.PI * 2); g.lineWidth = p.hold ? 3.5 : 2.5; g.strokeStyle = p.hold ? "#ffe14d" : col; g.stroke();
      if (f.c) { const fs = Math.round(Math.max(9, r * 0.75)), lw = fs * 1.5 + 2, ly = pt[1] + r + 1; g.fillStyle = col; roundRect(g, pt[0] - lw / 2, ly, lw, fs + 3, 3); g.fill(); g.fillStyle = "#fff"; g.font = `700 ${fs}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(p.num), pt[0], ly + (fs + 3) / 2 + 0.5); }
      if (p.hold) { const e = ent(p.id), nm = E.surname(e); g.fillStyle = "#fff"; g.font = `700 ${Math.round(Math.max(10, r * 0.8))}px sans-serif`; g.textAlign = "center"; g.textBaseline = "alphabetic"; g.strokeStyle = "rgba(0,0,0,.7)"; g.lineWidth = 3; g.strokeText(nm, pt[0], pt[1] - r - 5); g.fillText(nm, pt[0], pt[1] - r - 5); }
    }
    const b = fr.ball, bp = project(v, b.x, b.y), br = Math.max(4, 0.62 * s) * (1 + b.z * 0.03), lift = b.z * s * 0.5 * (portrait ? 1 : 1);
    if (!state.light) { g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(bp[0], bp[1], br * 0.9, br * 0.5, 0, 0, Math.PI * 2); g.fill(); }
    const by = bp[1] - lift;
    g.beginPath(); g.arc(bp[0], by, br, 0, Math.PI * 2); g.fillStyle = "#f2762a"; g.fill(); g.lineWidth = 1.4; g.strokeStyle = "#2b1405"; g.stroke();
    if (!state.light) { g.beginPath(); g.moveTo(bp[0] - br, by); g.lineTo(bp[0] + br, by); g.moveTo(bp[0], by - br); g.lineTo(bp[0], by + br); g.lineWidth = 1; g.stroke(); }
  }

  // ----- sound cues for the moments that just passed (only while following the live clock) -----
  function cues(M, fr, r) {
    if (!state.sound || state.skipped) { state.momSeen = M.moments.filter((m) => m.r <= r).length; if (state.crowd) crowdLevel(0); return; }
    crowdLevel(0.01 + 0.035 * fr.heat);
    while (state.momSeen < M.moments.length && M.moments[state.momSeen].r <= r) {
      const m = M.moments[state.momSeen++]; if (r - m.r > 2500) continue;
      const f = SFX[m.fx]; if (f) f(); if (m.cheer > 0.25) cheer(m.cheer);
    }
    // the dribble: a soft thump at the low point of each bounce, only when the film is slow enough to hear them as bounces
    const z = fr.ball.z, slow = M.speed === "full" || M.speed === "broadcast";
    if (slow && fr.leg && (fr.leg.kind === "carry" || fr.leg.kind === "hold") && state.zPrev[0] < state.zPrev[1] && state.zPrev[0] < z && state.zPrev[0] < 2.2 && now0() - state.lastBounce > 180) { SFX.bounce(); state.lastBounce = now0(); }
    state.zPrev = [z, state.zPrev[0]];
  }
  const now0 = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

  // ----- the one entry point: paint the state at server time `now` -----
  function paint(now) {
    const M = state.M; if (!M) return;
    const live = now - state.startAt, r = state.skipped ? (M.animated ? M.endAnim : 0) : Math.max(0, live), names = M.names;
    sb.a.textContent = names[0]; sb.b.textContent = names[1];
    if (!M.animated) {   // Instant: the final score and the best plays
      sb.s.textContent = `${M.finalScore[0]} - ${M.finalScore[1]}`; clock.textContent = M.ot ? `Final (${M.ot > 1 ? M.ot + "OT" : "OT"})` : "Final";
      for (const b of [skipBtn, camBtn, sndBtn, voiceBtn, speedBtn, musicBtn, gfxBtn]) if (b) b.hidden = true; liveWrap.hidden = true;
      if (state.shown === 0) { rc(log); log.append(h("div", { class: "mark" }, `Final: ${names[0]} ${M.finalScore[0]}-${M.finalScore[1]} ${names[1]}`)); log.append(h("div", { class: "mark" }, "Best plays")); for (const L of M.highlights) addLine({ text: `${P.periodLabel(L.q)} ${P.fmtClock(L.clk)}  ${L.text}`, cls: L.cls }); state.shown = 1; }
      return;
    }
    skipBtn.hidden = state.skipped || r >= M.endAnim;
    const fr = C.frameAt(M, r), sc = fr.score;
    sb.s.textContent = `${sc[0]} - ${sc[1]}`;
    clock.textContent = r >= M.total ? (M.ot ? `Final (${M.ot > 1 ? M.ot + "OT" : "OT"})` : "Final") : `${P.periodLabel(fr.q)} · ${P.fmtClock(fr.clk)}${fr.sc != null ? ` · shot clock ${Math.ceil(fr.sc)}` : ""}`;
    syncFeed(M, r); speakFeed(M, r);
    if (now - state.lastLive >= 500 || state.skipped || r >= M.endAnim) { state.lastLive = now; syncLive(M, Math.min(r, M.endAnim), sc); }
    if (state.music && state.music.running) { state.music.set(fr.heat); state.music.update(); state.music.duck(!!(state.voice && state.voice.busy)); }
    cues(M, fr, r);
    state.lastR = r;
    const o = overlayFor(M, fr);
    if (o && o.node !== undefined) { state.ovKey = o.key; rc(ov, o.node); ov.hidden = !o.node; } else if (!o) { if (state.ovKey) { state.ovKey = ""; rc(ov); ov.hidden = true; } }
    if (canvas) {
      const t0 = now0(); draw(fr, now);
      if (state.gfx === "auto" && !state.light) { state.ft.push(now0() - t0 + 0); if (state.ft.length > 90) { const avg = state.ft.reduce((a, b) => a + b, 0) / state.ft.length; state.ft = []; if (avg > 14) { state.light = true; gfxBtn.textContent = "Graphics: light (auto)"; } } }
    }
  }
  function loop() { if (!state.alive) return; try { paint(N.now()); } catch (e) { console.warn("[basketball] viewer", e); } state.raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame(loop) : 0; }
  return {
    el, paint,
    get running() { return !!state.raf; },
    get over() { const M = state.M; return !!M && (!M.animated || state.skipped || N.now() - state.startAt >= M.endAnim); },
    start() { if (!state.raf && canvas && typeof requestAnimationFrame === "function") state.raf = requestAnimationFrame(loop); },
    load(M, startAt, key) {
      state.M = M; state.startAt = startAt; state.skipped = false; state.lastR = -1; state.shown = 0; state.ovKey = ""; state.kits = null; state.pp = new Map(); state.momSeen = 0; state.key = key || ""; state.lastLive = -1e9; state.spokenIdx = 0; state.cam = { cx: 47, cy: 25, z: 1 };
      { const kits = kitsOf(M.names); sb.a.setAttribute("style", `border-bottom:4px solid ${kits[0].shirt}`); sb.b.setAttribute("style", `border-bottom:4px solid ${kits[1].shirt}`); }
      rc(log); rc(ov); ov.hidden = true; liveWrap.hidden = !M.animated;
      for (const b of [skipBtn, camBtn, sndBtn, voiceBtn, speedBtn, musicBtn, gfxBtn]) if (b) b.hidden = false;
      if (state.voice) { state.voice.cancel(); state.voice.setMode(M.speed === "quick" ? "fast" : "full"); }
    },
    skip() { state.skipped = true; },
    get skipped() { return state.skipped; },
    destroy() { state.alive = false; if (state.voice) state.voice.disable(); if (state.music) state.music.stop(); if (state.raf && typeof cancelAnimationFrame === "function") cancelAnimationFrame(state.raf); state.raf = 0; if (state.audio && state.audio.close) { try { state.audio.close(); } catch (e) { /* ignore */ } } }
  };
}
