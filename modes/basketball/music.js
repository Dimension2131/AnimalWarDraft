// modes/basketball/music.js: light background music, synthesised with the Web Audio API (no audio files). A relaxed groove: soft chords, a muted kick and hat and a bass line that
// get busier as the game heats up (set(heat) from the viewer, 0..1). Kept quiet, and DUCKED while the commentator speaks. Off by default; the AudioContext comes from the tap that turns it on.
// The scheduler is driven by update(), called every frame by the viewer: it schedules the next bars a little ahead of the audio clock.
import { mulberry32 } from "../../js/sim.js";

const BPM = 96, BEAT = 60 / BPM, BAR = BEAT * 4, AHEAD = 1.6;
export const LEVEL = 0.07, DUCKED = 0.02;
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
// Am7 - Fmaj7 - Cmaj7 - G6: warm and unhurried
const CHORDS = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 55, 60, 64], [55, 59, 62, 64]];
const ROOTS = [33, 29, 36, 31];
const PENTA = [69, 72, 74, 76, 79, 81];

export function createMusic({ ctx, seed = 11 }) {
  if (!ctx || typeof ctx.createOscillator !== "function" || typeof ctx.createGain !== "function") return null;
  const rnd = mulberry32(seed >>> 0), st = { running: false, next: 0, bar: 0, master: null, filter: null, ducked: false, made: 0, heat: 0 };
  const T = () => ctx.currentTime;
  function note(freq, type, at, attack, hold, release, peak, dest) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(peak, at + attack); g.gain.setValueAtTime(peak, at + attack + hold); g.gain.linearRampToValueAtTime(0.0001, at + attack + hold + release);
    o.connect(g); g.connect(dest); o.start(at); o.stop(at + attack + hold + release + 0.05); st.made++;
  }
  function kick(at) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(130, at); o.frequency.exponentialRampToValueAtTime(45, at + 0.14);
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(0.7, at + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
    o.connect(g); g.connect(st.master); o.start(at); o.stop(at + 0.25); st.made++;
  }
  function hat(at, v) { note(7000, "square", at, 0.002, 0.004, 0.03, 0.05 * v, st.master); }
  function bar(at, i) {
    const ch = CHORDS[i % CHORDS.length], heat = st.heat;
    ch.forEach((m, k) => note(hz(m), k === 0 ? "sine" : "triangle", at + k * 0.03, 0.4, BAR - 0.8, 0.9, k === 0 ? 0.3 : 0.16, st.filter));
    const root = ROOTS[i % ROOTS.length];
    for (let b = 0; b < 4; b++) {
      const t = at + b * BEAT;
      if (heat > 0.05 || b % 2 === 0) kick(t + 0);
      if (heat > 0.35) hat(t + BEAT / 2, 0.6 + heat);
      if (heat > 0.6) { hat(t + BEAT / 4, 0.6); hat(t + (3 * BEAT) / 4, 0.6); }
      if (heat > 0.2 && b % 2 === 1) note(hz(root), "sine", t + BEAT * 0.5, 0.01, BEAT * 0.3, 0.2, 0.34, st.master);
    }
    for (let q = 0; q < 8; q++) if (rnd() < 0.18 + 0.3 * heat) note(hz(PENTA[Math.floor(rnd() * PENTA.length)]), "sine", at + q * (BEAT / 2) + 0.01, 0.01, 0.05, 0.9, 0.09, st.filter);
  }
  return {
    get running() { return st.running; },
    get notes() { return st.made; },
    start() {
      if (st.running) return; st.running = true;
      st.master = ctx.createGain(); st.master.gain.value = 0.0001; st.filter = ctx.createBiquadFilter(); st.filter.type = "lowpass"; st.filter.frequency.value = 1800;
      st.filter.connect(st.master); st.master.connect(ctx.destination); st.master.gain.setTargetAtTime(LEVEL, T(), 1.2); st.next = T() + 0.1; st.bar = 0; this.update();
    },
    set(heat) { st.heat = Math.max(0, Math.min(1, +heat || 0)); },   // how hot the game is right now: the groove gets busier
    update() {
      if (!st.running) return;
      while (st.next < T() + AHEAD) { bar(st.next, st.bar++); st.next += BAR; }
    },
    duck(on) { if (!st.running || st.ducked === !!on) return; st.ducked = !!on; st.master.gain.setTargetAtTime(on ? DUCKED : LEVEL, T(), on ? 0.12 : 0.6); },
    stop() { if (!st.running) return; st.running = false; try { st.master.gain.setTargetAtTime(0.0001, T(), 0.3); } catch (e) { /* ignore */ } }
  };
}
