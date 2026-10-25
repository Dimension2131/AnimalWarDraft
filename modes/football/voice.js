// modes/football/voice.js: optional spoken commentary, using the browser's own speech synthesis (no audio files, any player name works).
// Full speed reads EVERY line of the feed; Fast speed reads only the key lines (goals, saves, misses, cards, substitutions, kick-off, half-time, full-time).
// Lines are queued and read one after another; if the voice falls behind, the oldest chatter is dropped and the voice speeds up a little, but key lines are never dropped for being busy.
// Pure logic around an injected `synth` / `Utt`, so it can be tested with a fake. Browsers only allow speech after a tap: enable() must be called from the click handler.

const DEEP = /google uk english male|daniel|arthur|oliver|fred|rishi|aaron|thomas|david|mark|george|guy|ryan|james|alex|gordon|lee|reed|microsoft .*(david|mark|george|guy|ryan|james|thomas|christopher|eric|davis)/i;
const FEMALE = /female|samantha|karen|zira|susan|hazel|victoria|moira|tessa|fiona|libby|sonia|aria|jenny|michelle|ava|allison|catherine|kate|serena|google us english$/i;
export const voiceScore = (v) => { const n = v.name || ""; return (DEEP.test(n) ? 4 : 0) + (/\bmale\b/i.test(n) && !FEMALE.test(n) ? 3 : 0) + (/en[-_]GB/i.test(v.lang || "") ? 1 : 0) - (FEMALE.test(n) ? 6 : 0); };
// a deep voice that warms up with the moment: hype 0 (calm play-by-play) .. 3 (a goal): louder, quicker and a little higher, but never squeaky
export const heat = (hype, mode, queued) => ({ pitch: 0.7 + 0.09 * hype, rate: clamp((mode === "fast" ? 1.2 : 0.95) + 0.07 * hype + 0.06 * (queued || 0), 0.85, 1.7), volume: Math.min(1, 0.78 + 0.08 * hype) });
export const isKeyLine = (line) => !!(line && line.cls);
// what is actually said: no minute, scores and "v" read out loud
export function spokenText(text) {
  return String(text || "").replace(/…/g, ".").replace(/\bv\b/g, "versus").replace(/(\d+)-(\d+)/g, "$1 to $2").replace(/\s+/g, " ").trim();
}

export function createVoice({ synth, Utt, now = () => Date.now() } = {}) {
  const supported = !!(synth && typeof synth.speak === "function" && typeof Utt === "function");
  const st = { on: false, mode: "full", queue: [], busy: false, started: 0, est: 0, voice: null, spoken: [] };
  const pickVoice = () => {
    if (st.voice || !supported || typeof synth.getVoices !== "function") return st.voice;
    const vs = synth.getVoices() || [], en = vs.filter((v) => /^en[-_]/i.test(v.lang || ""));
    st.voice = en.slice().sort((a, b) => voiceScore(b) - voiceScore(a))[0] || null;   // a deep male English voice if the device has one
    return st.voice;
  };
  function speak(item) {
    const u = new Utt(item.text); st.busy = true; st.started = now(); st.est = 1200 + item.text.length * 85;
    const h = heat(item.hype || 0, st.mode, st.queue.length); u.rate = h.rate; u.pitch = h.pitch; u.volume = h.volume;
    const v = pickVoice(); if (v) u.voice = v;
    const done = () => { if (st.cur === u) { st.busy = false; st.cur = null; pump(); } };
    u.onend = done; u.onerror = done; st.cur = u; st.spoken.push(item.text);
    try { synth.speak(u); } catch (e) { st.busy = false; }
  }
  function pump() {
    if (!st.on || !supported) return;
    if (st.busy && now() - st.started > st.est + 2500) { st.busy = false; st.cur = null; }   // an engine that never fires "end" (hidden tab) must not block the commentary forever
    if (st.busy) return;
    const t = now();
    while (st.queue.length) {
      const it = st.queue.shift(), age = t - it.at;
      if (age > (it.key ? 14000 : 7000)) continue;   // stale by the time the voice got to it
      return speak(it);
    }
  }
  return {
    supported,
    get on() { return st.on; },
    get spoken() { return st.spoken; },
    get queued() { return st.queue.length; },
    get busy() { return st.on && st.busy; },
    setMode(speed) { st.mode = speed === "fast" ? "fast" : "full"; },
    enable() { if (!supported) return false; st.on = true; st.queue.length = 0; st.busy = false; try { synth.cancel(); } catch (e) { /* ignore */ } speak({ text: "Commentary on.", cls: "", key: true, at: now() }); return true; },
    disable() { st.on = false; st.queue.length = 0; st.busy = false; st.cur = null; if (supported) { try { synth.cancel(); } catch (e) { /* ignore */ } } },
    cancel() { st.queue.length = 0; st.busy = false; st.cur = null; if (supported) { try { synth.cancel(); } catch (e) { /* ignore */ } } },
    // a new feed line went live; ageMs = how long ago (a late joiner's backlog is simply too old to be read)
    offer(line, ageMs) {
      if (!st.on || !supported) return;
      const key = isKeyLine(line); if (st.mode === "fast" && !key) return;
      const item = { text: spokenText(line.text), cls: line.cls || "", hype: line.hype || 0, key, at: now() - (ageMs || 0) }; if (!item.text) return;
      if (line.cls === "goal") { st.queue.length = 0; if (st.busy) { try { synth.cancel(); } catch (e) { /* ignore */ } st.busy = false; st.cur = null; } }   // a goal is never read late
      else if (st.queue.length >= (st.mode === "fast" ? 3 : 8)) { const k = st.queue.findIndex((q) => !q.key); if (k >= 0) st.queue.splice(k, 1); else if (!key) return; else st.queue.shift(); }
      st.queue.push(item); pump();
    },
    tick() { pump(); }
  };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
