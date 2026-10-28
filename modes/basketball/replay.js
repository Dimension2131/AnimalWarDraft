// modes/basketball/replay.js: the timeline of a simulated game. Pure functions, no DOM.
// The simulation (engine.simulateGame) is the outcome. A replay only decides how fast it is shown: the whole game is stretched or squeezed over a real duration,
// so the same events come out at every speed. frameAt() is a pure function of the real milliseconds since the game's start: late joiners and reconnects just call it.
import { QUARTER_SECS, OT_SECS, REG_SECS } from "./engine.js";

export const SPEEDS = {
  instant: { id: "instant", label: "Instant", note: "final score and a box score, about 10 s", ms: 0 },
  quick: { id: "quick", label: "Quick replay", note: "the whole game in about 2 minutes", ms: 120000 },
  full: { id: "full", label: "Full replay", note: "the whole game in about 5 minutes", ms: 300000 }
};
export const SPEED_IDS = Object.keys(SPEEDS);
export const normSpeed = (s) => (SPEEDS[s] ? s : "quick");
export const speedOfSettings = (st) => { const v = st && st.matchSpeed; return SPEEDS[v] ? v : st && st.matchStyle === "watch" ? "full" : st && st.matchStyle === "quick" ? "instant" : "quick"; };
export const INSTANT_MS = 6000, END_PAD_MS = 6000;

// the real duration of a replay (overtime stretches it in proportion to the extra game time)
export const durationMs = (sim, speed) => { const sp = SPEEDS[normSpeed(speed)]; return sp.ms ? Math.round((sp.ms * sim.totalSecs) / REG_SECS) : 0; };
export const endMs = (sim, speed) => (SPEEDS[normSpeed(speed)].ms ? durationMs(sim, speed) + END_PAD_MS : INSTANT_MS);

// game seconds elapsed at real ms r
export const gameSecsAt = (sim, speed, r) => { const d = durationMs(sim, speed); return d ? Math.max(0, Math.min(sim.totalSecs, (r / d) * sim.totalSecs)) : sim.totalSecs; };
// period number and clock (seconds left) for a given amount of game seconds
export function clockOf(gs) {
  if (gs < REG_SECS) { const q = Math.min(4, Math.floor(gs / QUARTER_SECS) + 1); return { q, left: Math.max(0, q * QUARTER_SECS - gs) }; }
  const ot = Math.floor((gs - REG_SECS) / OT_SECS) + 1; return { q: 4 + ot, left: Math.max(0, REG_SECS + ot * OT_SECS - gs) };
}
export const periodLabel = (q) => (q <= 4 ? `Q${q}` : q === 5 ? "OT" : `${q - 4}OT`);
export const fmtClock = (sec) => { const s = Math.max(0, Math.ceil(sec - 1e-9)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

// what the viewer sees at real ms r: score, clock, the events so far (newest last), and whether it is over
export function frameAt(sim, speed, r) {
  const sp = SPEEDS[normSpeed(speed)], over = !sp.ms || r >= durationMs(sim, speed), gs = over ? sim.totalSecs : gameSecsAt(sim, speed, r);
  let n = 0; while (n < sim.events.length && sim.events[n].gt <= gs + 1e-9) n++;
  const evs = over ? sim.events : sim.events.slice(0, n), last = evs[evs.length - 1], c = clockOf(gs);
  return { gs, over, events: evs, score: over ? sim.score.slice() : last ? last.score.slice() : [0, 0], q: over ? 4 + sim.ot || 4 : c.q, left: over ? 0 : c.left };
}

// one line of play-by-play from an event; null for events that are not shown
export function lineOf(e, names) {
  const t = (s) => names[s] || "";
  switch (e.e) {
    case "start": return `Tip-off: ${t(e.tip)} win the jump ball.`;
    case "period": return e.n <= 4 ? `Start of quarter ${e.n}.` : null;
    case "overtime": return `Overtime ${e.n}: the game is tied, five more minutes.`;
    case "qend": return `End of ${e.n <= 4 ? "quarter " + e.n : "overtime"}: ${t(0)} ${e.score[0]}, ${t(1)} ${e.score[1]}.`;
    case "shot": {
      const k = { ins: "drives and finishes inside", mid: "hits the mid-range jumper", thr: "drains a three", fb: "finishes on the fast break" }[e.kind] || "scores";
      if (e.blk) return `${e.pn} is blocked by ${e.bn}!`;
      if (!e.made) return `${e.pn} misses ${e.kind === "thr" ? "the three" : e.kind === "ins" ? "inside" : e.kind === "fb" ? "the fast break" : "the jumper"}.`;
      return `${e.pn} ${k}${e.an ? ` (assist ${e.an})` : ""}${e.andOne ? ", and the foul!" : "."} ${e.score[0]}-${e.score[1]}`;
    }
    case "ft": return `${e.pn} ${e.made ? "makes" : "misses"} free throw ${e.i} of ${e.n}.${e.made ? ` ${e.score[0]}-${e.score[1]}` : ""}`;
    case "reb": return `${e.pn} ${e.off ? "grabs the offensive rebound" : "pulls down the rebound"}.`;
    case "tov": return e.stn ? `${e.stn} steals it from ${e.pn}.` : `${e.pn} turns it over.`;
    case "foul": return e.kind === "intentional" ? `${e.pn} fouls intentionally (${e.n}).` : e.kind === "shooting" ? `Shooting foul on ${e.pn} (${e.n}).` : `Foul on ${e.pn} (${e.n}).`;
    case "sub": return `${t(e.s)}: ${e.on} in for ${e.off || "an empty spot"}${e.why === "fouls" ? " (foul trouble)" : e.why === "injury" ? " (injury)" : ""}.`;
    case "timeout": return `Timeout, ${t(e.s)} (${e.left} left).`;
    case "injury": return `${e.pn} is hurt and is out for the rest of the game.`;
    case "end": return "Final.";
    default: return null;
  }
}
// hype 0-3 of an event (for later: commentary, sound)
export const hypeOf = (e) => (e.e === "shot" && e.made ? (e.kind === "thr" ? 2 : 1) : e.blk ? 2 : e.e === "timeout" ? 1 : e.e === "end" ? 3 : 0);
