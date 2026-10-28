// modes/football/viewer.js: the cinematic match viewer (DOM + 2D canvas, no libraries). It only DRAWS what choreo.frameAt(M, now - startAt) says, so every device sees the same film in sync,
// a late joiner lands on the right second with no replay, and "skip to full time" is a local jump to the last frame.
// Reduced motion (or no canvas): scoreboard + commentary feed only, driven by the same clock.
import * as C from "./choreo.js";
import * as E from "./engine.js";
import { photo } from "./card.js";
import { failed } from "../../js/preload.js";
import { createVoice } from "./voice.js";
import { createMusic } from "./music.js";
import { liveStats, createStatsView } from "./stats.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rc = (el, ...kids) => el.replaceChildren(...kids.filter((k) => k != null && k !== false));
const hueOf = (s) => { let x = 7; for (const c of String(s)) x = (Math.imul(x, 31) + c.charCodeAt(0)) | 0; return Math.abs(x) % 360; };
export function kitsOf(names) {   // [{shirt, keeper, text}] per side; the second side is moved away if both hues are close
  const a = hueOf(names[0]); let b = hueOf(names[1]); if (Math.min(Math.abs(a - b), 360 - Math.abs(a - b)) < 70) b = (a + 170) % 360;
  return [{ shirt: `hsl(${a} 75% 48%)`, keeper: "#ffd23f", text: "#fff" }, { shirt: `hsl(${b} 75% 48%)`, keeper: "#3ddc97", text: "#fff" }];
}
// pitch (metres, x along the length) -> screen. Landscape: team 0 defends the left goal. Portrait: the pitch stands upright and team 0 attacks UP (its goal is at the bottom).
export function project(view, u, v) { return view.portrait ? [view.W / 2 + (v - view.cy) * view.s, view.H / 2 - (u - view.cx) * view.s] : [view.W / 2 + (u - view.cx) * view.s, view.H / 2 + (v - view.cy) * view.s]; }

export function createViewer({ h, N, ent, onSkip }) {
  const reduced = typeof matchMedia === "function" && !!(matchMedia("(prefers-reduced-motion: reduce)") || {}).matches;
  const sb = { a: h("span", { class: "tn" }), b: h("span", { class: "tn" }), s: h("span", { class: "big" }, "0 - 0") };
  const clock = h("div", { class: "fb-clock" }), pensEl = h("div", { class: "fb-pens muted small center" }), log = h("div", { class: "fb-log", "aria-live": "polite" });
  const canvas = reduced ? null : h("canvas", { class: "fb-canvas", "aria-hidden": "true" }), ov = h("div", { class: "fb-ov" });
  const view = h("div", { class: "fb-view" }, canvas, ov);
  const state = { M: null, startAt: 0, skipped: false, lastR: -1, shown: 0, key: "", cam: { cx: 52.5, cy: 34, z: 1 }, camMode: "follow", pp: new Map(), lastT: 0, ovKey: "", alive: true, raf: 0, sound: false, audio: null, momSeen: 0, voice: null, music: null, spokenIdx: 0, vs: 1, live: null, lastLive: -1e9, kits: null, dims: { W: 0, H: 0 }, ctx: null };
  const skipBtn = h("button", { class: "btn small", type: "button", onclick: () => { if (!state.skipped) { state.skipped = true; if (onSkip) { try { onSkip(state.key); } catch (e) { /* the local skip still works */ } } } } }, "Skip to full time");
  const camBtn = h("button", { class: "btn small", type: "button", onclick: () => { state.camMode = state.camMode === "follow" ? "full" : "follow"; camBtn.textContent = state.camMode === "follow" ? "Camera: follow ball" : "Camera: full pitch"; } }, "Camera: follow ball");
  const sndBtn = h("button", { class: "btn small", type: "button", onclick: () => toggleSound() }, "Sound: off");
  const voiceBtn = h("button", { class: "btn small", type: "button", onclick: () => toggleVoice() }, "Commentary: off");
  const musicBtn = h("button", { class: "btn small", type: "button", onclick: () => toggleMusic() }, "Music: off");
  const VSPEEDS = [["Slow", 0.85], ["Normal", 1], ["Fast", 1.15]];
  const speedBtn = h("button", { class: "btn small", type: "button", onclick: () => { state.vs = (state.vs + 1) % VSPEEDS.length; speedBtn.textContent = "Voice speed: " + VSPEEDS[state.vs][0]; if (state.voice) state.voice.setSpeed(VSPEEDS[state.vs][1]); } }, "Voice speed: Normal");
  const ctl = h("div", { class: "fb-ctl row wrap" }, skipBtn, reduced ? null : camBtn, sndBtn, voiceBtn, speedBtn, musicBtn);
  const liveWrap = h("div", { class: "fb-live" });
  const el = h("div", { class: "fb-viewer" }, h("div", { class: "fb-score" }, sb.a, sb.s, sb.b), clock, pensEl, reduced ? h("p", { class: "muted small center" }, "Reduced motion is on: commentary only.") : view, ctl, log, liveWrap);

  // ----- spoken commentary: off by default, started by a tap (browsers block speech before one). Full reads every line, Fast only the key lines. -----
  function toggleVoice() {
    if (state.voice && state.voice.on) { state.voice.disable(); voiceBtn.textContent = "Commentary: off"; return; }
    const w = typeof window !== "undefined" ? window : {};
    if (!state.voice) state.voice = createVoice({ synth: w.speechSynthesis, Utt: w.SpeechSynthesisUtterance });
    if (!state.voice.supported) { voiceBtn.textContent = "Commentary: not available"; return; }
    if (state.M) state.voice.setMode(state.M.speed);
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
  }
  // one AudioContext for crowd/whistle and music, created by a tap (browsers block autoplay)
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
  function whistle() { const a = state.audio; if (!state.sound || !a) return; try { const o = a.createOscillator(), g = a.createGain(); o.type = "square"; o.frequency.value = 2900; g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(0.12, a.currentTime + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.5); o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + 0.55); } catch (e) { /* sound is optional */ } }
  function roar() { const a = state.audio; if (!state.sound || !a) return; try { const n = a.sampleRate * 2, buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / n); const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); f.type = "bandpass"; f.frequency.value = 900; g.gain.value = 0.25; src.buffer = buf; src.connect(f); f.connect(g); g.connect(a.destination); src.start(); } catch (e) { /* sound is optional */ } }

  // ----- feed and scoreboard -----
  const addLine = (L) => { const d = h("div", { class: L.cls || "" }, (L.m != null && L.m < 120 ? `${L.m}' ` : "") + L.text); log.append(d); };
  function syncFeed(M, r) {
    const all = M.animated ? C.linesUntil(M, r) : (state.skipped || r >= 0 ? M.highlights : []);
    if (r < state.lastR - 1 || state.shown > all.length) { rc(log); state.shown = 0; }
    if (state.shown === 0 && all.length > 16) { log.append(h("div", { class: "mark" }, "…earlier play not shown")); state.shown = all.length - 16; }
    for (let i = state.shown; i < all.length; i++) addLine(all[i]);
    if (all.length !== state.shown) { state.shown = all.length; while (log.children.length > 90) log.children[0].remove(); log.scrollTop = log.scrollHeight; }
  }
  const scorersOf = (M, r) => [0, 1].map((s) => M.moments.filter((m) => m.e === "goal" && m.s === s && m.r <= r).map((m) => `${m.pn} ${m.m}'`).join(", ") || "-");
  function overlayFor(M, fr, r) {
    const c = fr && fr.card; if (!c) return null;
    const key = fr.segIndex + ":" + c.type;
    if ((c.ff != null && fr.f > c.ff) || (c.type === "penKick" && fr.f > 0.95)) return { key: "", node: null };   // card shown for the first part of the segment only (the rest is the jog back and the kick-off)
    if (state.ovKey === key) return { key, node: undefined };
    const names = M.names;
    if (c.type === "goal") { const p = ent(c.id); return { key, node: h("div", { class: "fb-card goal" }, h("div", { class: "fb-pop" }, "GOAL!"), h("div", { class: "row fb-who" }, h("div", { class: "fb-plate" }, photo(h, p, "fb-photo")), h("div", {}, h("b", {}, `${c.num ? "#" + c.num + " " : ""}${p.name}`), h("div", { class: "muted small" }, `${names[c.s]} · ${c.m}'${c.assist ? " · assist " + c.assist : ""}`)))) }; }
    if (c.type === "ht" || c.type === "ft") { const sc = fr.score, g = scorersOf(M, r); return { key, node: h("div", { class: "fb-card" }, h("b", {}, c.type === "ht" ? "Half-time" : "Full-time"), h("div", { class: "fb-big2" }, `${names[0]} ${sc[0]} - ${sc[1]} ${names[1]}`), h("div", { class: "muted small" }, `${names[0]}: ${g[0]}`), h("div", { class: "muted small" }, `${names[1]}: ${g[1]}`)) }; }
    if (c.type === "yellow" || c.type === "red") return { key, node: h("div", { class: "fb-card " + c.type }, h("span", { class: "fb-cardchip " + c.type }), h("b", {}, c.type === "yellow" ? "Yellow card" : c.second ? "Second yellow: sent off" : "Red card"), h("div", { class: "muted small" }, `${c.name} (${names[c.s]})`)) };
    if (c.type === "injury") return { key, node: h("div", { class: "fb-card" }, h("b", {}, "Injury"), h("div", { class: "muted small" }, `${c.name} (${names[c.s]}) is down`)) };
    if (c.type === "sub") return { key, node: h("div", { class: "fb-card sub" }, h("b", {}, c.forced ? "Injury change" : "Substitution"), h("div", { class: "muted small" }, `${names[c.s]}: ${c.on} on, ${c.off} off`)) };
    if (c.type === "pens") return { key, node: h("div", { class: "fb-card" }, h("b", {}, "Penalty shoot-out"), h("div", { class: "muted small" }, "Level after 90 minutes")) };
    if (c.type === "penKick") return { key, node: h("div", { class: "fb-card" }, h("b", {}, c.res === "goal" ? "Scores!" : c.res === "save" ? "Saved!" : "Misses!"), h("div", { class: "muted small" }, `${c.name} (${names[c.s]})`)) };
    if (c.type === "penEnd") return { key, node: h("div", { class: "fb-card goal" }, h("b", {}, `${names[c.winner]} win on penalties`), h("div", { class: "fb-big2" }, `${c.score[0]} - ${c.score[1]}`)) };
    return null;
  }

  // ----- player faces: a round photo (pre-rendered once into a small canvas), a team-coloured ring and the shirt number underneath -----
  const faces = new Map();
  function faceOf(id) {
    let f = faces.get(id); if (f) return f; f = { c: null, bad: false }; faces.set(id, f);
    const e = ent(id); if (!e || typeof Image === "undefined") { f.bad = true; return f; }
    try {
      const im = new Image(); im.onload = () => { try { const w = im.naturalWidth || im.width || 0, hh = im.naturalHeight || im.height || 0; if (!w || !hh) { f.bad = true; return; } const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), sq = Math.min(w, hh), sy = Math.max(0, (hh - sq) * 0.15); g.beginPath(); g.arc(32, 32, 32, 0, Math.PI * 2); g.clip(); g.drawImage(im, 0, sy, sq, sq, 0, 0, 64, 64); f.c = c; } catch (err) { f.bad = true; } };
      const src = e.image || "football/img/" + e.id + ".png"; if (failed.has(src)) { f.bad = true; return f; }   // the shared memory of missing photos: no repeat request
      im.onerror = () => { f.bad = true; failed.add(src); }; im.src = src;
    } catch (err) { f.bad = true; }
    return f;
  }
  const roundRect = (g, x, y, w, hh, r) => { g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + hh - r); g.quadraticCurveTo(x + w, y + hh, x + w - r, y + hh); g.lineTo(x + r, y + hh); g.quadraticCurveTo(x, y + hh, x, y + hh - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); };

  // ----- canvas -----
  function setup() {
    if (!canvas || typeof canvas.getContext !== "function") return null;
    if (!state.ctx) state.ctx = canvas.getContext("2d");
    const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1, W = Math.round(canvas.clientWidth || 640), H = Math.round(canvas.clientHeight || 400);
    if (state.dims.W !== W || state.dims.H !== H) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); state.dims = { W, H, dpr }; }
    return state.ctx;
  }
  function drawPitch(g, v) {
    const R = (u0, v0, u1, v1) => { const a = project(v, u0, v0), b = project(v, u1, v1); return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])]; };
    g.fillStyle = "#1c6b3a"; g.fillRect(0, 0, v.W, v.H);
    for (let k = 0; k < 14; k++) { g.fillStyle = k % 2 ? "#1f7340" : "#1a6436"; g.fillRect(...R(k * 7.5, 0, (k + 1) * 7.5, 68)); }
    g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = Math.max(1.2, v.s * 0.18);
    const box = (u0, v0, u1, v1) => g.strokeRect(...R(u0, v0, u1, v1)), circle = (u, w, r, fill) => { const p = project(v, u, w); g.beginPath(); g.arc(p[0], p[1], r * v.s, 0, Math.PI * 2); if (fill) { g.fillStyle = "rgba(255,255,255,.9)"; g.fill(); } else g.stroke(); };
    box(0, 0, 105, 68); box(52.5, 0, 52.5, 68); circle(52.5, 34, 9.15); circle(52.5, 34, 0.35, true);
    box(0, 13.84, 16.5, 54.16); box(105 - 16.5, 13.84, 105, 54.16); box(0, 24.84, 5.5, 43.16); box(105 - 5.5, 24.84, 105, 43.16);
    circle(11, 34, 0.35, true); circle(94, 34, 0.35, true);
    g.strokeStyle = "rgba(255,255,255,.55)"; box(-2.4, 30.34, 0, 37.66); box(105, 30.34, 107.4, 37.66);
  }
  function draw(fr, now) {
    const g = setup(); if (!g) return;
    const { W, H, dpr } = state.dims, portrait = H > W * 1.05, s0 = portrait ? Math.min(W / 76, H / 113) : Math.min(W / 113, H / 76);
    const pens = fr.shown === "pens", zoom = state.camMode === "full" ? 1 : pens ? 2.4 : portrait ? 1.8 : 2.1;
    const target = state.camMode === "full" ? [52.5, 34] : pens ? [88, 34] : [fr.ball.x * 105, fr.ball.y * 68], dt = clamp((now - state.lastT) / 1000, 0, 0.25); state.lastT = now;
    const c = state.cam, k = 1 - Math.exp(-dt / 0.35), jump = Math.hypot(target[0] - c.cx, target[1] - c.cy) > 45;
    c.cx = jump ? target[0] : c.cx + (target[0] - c.cx) * k; c.cy = jump ? target[1] : c.cy + (target[1] - c.cy) * k; c.z = jump ? zoom : c.z + (zoom - c.z) * k;
    const s = s0 * c.z, halfU = (portrait ? H : W) / (2 * s), halfV = (portrait ? W : H) / (2 * s);
    const cx = halfU >= 56.5 ? 52.5 : clamp(c.cx, halfU - 4, 109 - halfU), cy = halfV >= 38 ? 34 : clamp(c.cy, halfV - 4, 72 - halfV);
    const v = { W, H, s, cx, cy, portrait }; g.setTransform(dpr, 0, 0, dpr, 0, 0); drawPitch(g, v);
    if (fr.leg && ["pass", "cross", "shot"].includes(fr.leg.kind)) { const a = project(v, fr.leg.from[0] * 105, fr.leg.from[1] * 68), b = project(v, fr.ball.x * 105, fr.ball.y * 68); g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 2; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    const a2 = 1 - Math.exp(-dt / 0.05), r = Math.max(9, 1.9 * s), kits = state.kits || (state.kits = kitsOf(state.M.names)), draws = [];
    for (const p of fr.players) {
      if (!p.on) continue;
      const key = p.s + ":" + p.i; let q = state.pp.get(key);
      if (!q || Math.hypot((p.x - q.x) * 105, (p.y - q.y) * 68) > 10) q = { x: p.x, y: p.y }; else { q.x += (p.x - q.x) * a2; q.y += (p.y - q.y) * a2; }
      state.pp.set(key, q);
      const pt = project(v, q.x * 105, q.y * 68); if (pt[0] < -30 || pt[1] < -30 || pt[0] > W + 30 || pt[1] > H + 30) continue;
      draws.push({ p, pt });
    }
    draws.sort((m, n) => m.pt[1] - n.pt[1]);   // nearer the bottom of the screen is drawn on top
    for (const { p, pt } of draws) {
      const col = p.i === 0 ? kits[p.s].keeper : kits[p.s].shirt, f = faceOf(p.id);
      g.fillStyle = "rgba(0,0,0,.28)"; g.beginPath(); g.ellipse(pt[0], pt[1] + r * 0.85, r * 0.9, r * 0.35, 0, 0, Math.PI * 2); g.fill();
      if (f.c) g.drawImage(f.c, pt[0] - r, pt[1] - r, 2 * r, 2 * r);
      else { g.beginPath(); g.arc(pt[0], pt[1], r, 0, Math.PI * 2); g.fillStyle = col; g.fill(); g.fillStyle = "#fff"; g.font = `700 ${Math.round(r * 1.05)}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(p.num), pt[0], pt[1] + 0.5); }
      g.beginPath(); g.arc(pt[0], pt[1], r, 0, Math.PI * 2); g.lineWidth = p.hold ? 3.5 : 2.5; g.strokeStyle = p.hold ? "#ffe14d" : col; g.stroke();
      const fs = Math.round(Math.max(9, r * 0.8)), lw = fs * 1.5 + 2, ly = pt[1] + r + 1;
      g.fillStyle = col; roundRect(g, pt[0] - lw / 2, ly, lw, fs + 3, 3); g.fill(); g.fillStyle = p.i === 0 ? "#111" : "#fff"; g.font = `700 ${fs}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(p.num), pt[0], ly + (fs + 3) / 2 + 0.5);
      if (p.hold) { const e = ent(p.id); g.fillStyle = "#fff"; g.font = `700 ${Math.round(Math.max(10, r * 0.8))}px sans-serif`; g.textBaseline = "alphabetic"; g.strokeStyle = "rgba(0,0,0,.7)"; g.lineWidth = 3; g.strokeText(E.surname(e), pt[0], pt[1] - r - 5); g.fillText(E.surname(e), pt[0], pt[1] - r - 5); }
    }
    const bp = project(v, fr.ball.x * 105, fr.ball.y * 68), br = Math.max(3.5, 0.75 * s) * (1 + fr.ball.z * 0.5);
    g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(bp[0], bp[1], br * 0.9, br * 0.5, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(bp[0], bp[1] - fr.ball.z * 14, br, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); g.lineWidth = 1.5; g.strokeStyle = "#222"; g.stroke();
  }

  // ----- the one entry point: paint the state at server time `now` -----
  function paint(now) {
    const M = state.M; if (!M) return;
    const live = now - state.startAt, r = state.skipped ? (M.animated ? M.endAnim : 0) : Math.max(0, live), names = M.names;
    sb.a.textContent = names[0]; sb.b.textContent = names[1];
    if (!M.animated) {   // Instant: the final score and the highlights
      sb.s.textContent = `${M.finalScore[0]} - ${M.finalScore[1]}`; clock.textContent = "Full time"; pensEl.textContent = M.pens ? `Penalties: ${M.pens.score[0]}-${M.pens.score[1]}` : ""; skipBtn.hidden = true; camBtn.hidden = true; sndBtn.hidden = true; voiceBtn.hidden = true; speedBtn.hidden = true; musicBtn.hidden = true; liveWrap.hidden = true;
      if (state.shown === 0) { rc(log); log.append(h("div", { class: "mark" }, `Full-time: ${names[0]} ${M.finalScore[0]}-${M.finalScore[1]} ${names[1]}`)); for (const L of M.highlights) addLine(L); state.shown = 1; }
      return;
    }
    skipBtn.hidden = state.skipped || r >= M.endAnim;
    const fr = C.frameAt(M, r), sc = fr.score;
    sb.s.textContent = `${sc[0]} - ${sc[1]}`;
    clock.textContent = r >= M.total && fr.shown !== "pens" ? "Full time" : fr.shown === "pens" ? "Penalty shoot-out" : fr.seg.kind === "ht" ? "Half-time" : `${Math.floor(fr.minute)}'`;
    pensEl.textContent = fr.pens ? `Penalties: ${fr.pens[0]}-${fr.pens[1]}` : "";
    syncFeed(M, r); speakFeed(M, r);
    if (state.live && (now - state.lastLive >= 400 || state.skipped || r >= M.endAnim)) { state.lastLive = now; const ls = liveStats(M, Math.min(r, M.endAnim)); if (r >= M.endAnim && M.pens) ls.pens = M.pens.score.slice(); state.live.update(ls); }   // the stats under the commentary, kept up to date
    if (state.music && state.music.running) { state.music.update(); state.music.duck(!!(state.voice && state.voice.busy)); }   // the music steps aside while the commentator talks
    // sound cues for the moments that just passed (only while following the live clock)
    if (state.sound && !state.skipped) { while (state.momSeen < M.moments.length && M.moments[state.momSeen].r <= r) { const m = M.moments[state.momSeen++]; if (r - m.r < 2500) { if (m.e === "goal") roar(); else if (m.e === "kick" || m.e === "ht" || m.e === "ft") whistle(); } } } else state.momSeen = M.moments.filter((m) => m.r <= r).length;
    state.lastR = r;
    const o = overlayFor(M, fr, r);
    if (o && o.node !== undefined) { state.ovKey = o.key; rc(ov, o.node); ov.hidden = !o.node; } else if (!o) { if (state.ovKey) { state.ovKey = ""; rc(ov); ov.hidden = true; } }
    if (canvas) draw(fr, now);
  }
  function loop() { if (!state.alive) return; try { paint(N.now()); } catch (e) { console.warn("[football] viewer", e); } state.raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame(loop) : 0; }
  return {
    el, paint,
    get running() { return !!state.raf; },
    start() { if (!state.raf && canvas && typeof requestAnimationFrame === "function") state.raf = requestAnimationFrame(loop); },
    load(M, startAt, key) { state.M = M; state.startAt = startAt; state.skipped = false; state.lastR = -1; state.shown = 0; state.ovKey = ""; state.kits = null; state.pp = new Map(); state.momSeen = 0; state.key = key || ""; state.lastLive = -1e9; state.live = null; rc(liveWrap); liveWrap.hidden = !M.animated; if (M.animated) { state.live = createStatsView({ h, names: M.names, kits: kitsOf(M.names), lineups: M.lineups, ent, icon: (p) => photo(h, p, "fb-photo"), surname: E.surname, title: "LIVE STATS" }); liveWrap.append(state.live.el); state.live.update(liveStats(M, 0)); } state.spokenIdx = 0; if (state.voice) { state.voice.cancel(); state.voice.setMode(M.speed); } state.cam = { cx: 52.5, cy: 34, z: 1 }; rc(log); rc(ov); ov.hidden = true; skipBtn.hidden = false; },
    skip() { state.skipped = true; },
    get skipped() { return state.skipped; },
    destroy() { state.alive = false; if (state.voice) state.voice.disable(); if (state.music) state.music.stop(); if (state.raf && typeof cancelAnimationFrame === "function") cancelAnimationFrame(state.raf); state.raf = 0; if (state.audio && state.audio.close) { try { state.audio.close(); } catch (e) { /* ignore */ } } }
  };
}
