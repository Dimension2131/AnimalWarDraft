// modes/football/music.js: light background music, synthesised with the Web Audio API (no audio files). A slow, warm loop of four soft chords with a few sparse notes on top, kept quiet,
// and DUCKED (the volume drops) while the commentator is speaking so the two never fight. Off by default; the AudioContext comes from the tap that turns it on (browsers block autoplay).
// The scheduler is driven by update(), called every frame by the viewer: it schedules the next bars a little ahead of the audio clock.
import { mulberry32 } from "../../js/sim.js";

const BPM = 74, BEAT = 60 / BPM, BAR = BEAT * 4, AHEAD = 1.6;
export const LEVEL = 0.075, DUCKED = 0.022;   // master gain: light, and almost out of the way under the commentator
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
// Cmaj7 - Am7 - Fmaj7 - G6, voiced low and soft
const CHORDS = [[48, 55, 59, 64], [45, 52, 59, 64], [41, 52, 57, 64], [43, 50, 59, 64]];
const PENTA = [72, 74, 76, 79, 81, 84];   // C major pentatonic, an octave and a half above the pads

export function createMusic({ ctx, seed = 7 }) {
  if (!ctx || typeof ctx.createOscillator !== "function" || typeof ctx.createGain !== "function") return null;
  const rnd = mulberry32(seed >>> 0), st = { running: false, next: 0, bar: 0, master: null, filter: null, ducked: false, made: 0 };
  const T = () => ctx.currentTime;
  function note(freq, type, at, attack, hold, release, peak, dest) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(peak, at + attack); g.gain.setValueAtTime(peak, at + attack + hold); g.gain.linearRampToValueAtTime(0.0001, at + attack + hold + release);
    o.connect(g); g.connect(dest); o.start(at); o.stop(at + attack + hold + release + 0.05); st.made++;
  }
  function bar(at, i) {
    const ch = CHORDS[i % CHORDS.length];
    ch.forEach((m, k) => { note(hz(m) * (k === 3 ? 1 : 1), k === 0 ? "sine" : "triangle", at + k * 0.04, 1.0, BAR - 1.4, 1.6, k === 0 ? 0.5 : 0.22, st.filter); });   // the pad: slow attack, long release, notes overlap into the next bar
    for (let q = 0; q < 8; q++) if (rnd() < 0.42) note(hz(PENTA[Math.floor(rnd() * PENTA.length)]), "sine", at + q * (BEAT / 2) + 0.01, 0.015, 0.05, 1.3, 0.1, st.filter);   // sparse, bell-like notes
  }
  return {
    get running() { return st.running; },
    get notes() { return st.made; },
    start() {
      if (st.running) return; st.running = true;
      st.master = ctx.createGain(); st.master.gain.value = 0.0001; st.filter = ctx.createBiquadFilter(); st.filter.type = "lowpass"; st.filter.frequency.value = 1400;
      st.filter.connect(st.master); st.master.connect(ctx.destination); st.master.gain.setTargetAtTime(LEVEL, T(), 1.2); st.next = T() + 0.1; st.bar = 0; this.update();
    },
    update() {
      if (!st.running) return;
      while (st.next < T() + AHEAD) { bar(st.next, st.bar++); st.next += BAR; }
    },
    // the commentator is speaking: step aside
    duck(on) { if (!st.running || st.ducked === !!on) return; st.ducked = !!on; st.master.gain.setTargetAtTime(on ? DUCKED : LEVEL, T(), on ? 0.12 : 0.6); },
    stop() { if (!st.running) return; st.running = false; try { st.master.gain.setTargetAtTime(0.0001, T(), 0.3); } catch (e) { /* ignore */ } }
  };
}
