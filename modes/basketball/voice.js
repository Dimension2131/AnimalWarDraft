// modes/basketball/voice.js: the spoken commentator, built on the browser's own speech synthesis (no audio files, any player name works).
// A real commentator does not read out everything: he says the big things, reacts, and now and then fills a quiet moment. So this voice SELECTS what to say:
//  - every line has an importance (a basket is 8, a block 8, a plain pass 1). Big moments are always said; medium ones only when he has room; small ones rarely and spaced out;
//  - at most two lines wait; a line that is stale by the time he is free is dropped instead of being said late; he never talks faster to catch up (he speaks at a natural pace you can follow);
//  - tone: each kind of moment has its own delivery (calm build-up, rising chance, sharp save, groan on a miss, stern for a card, grave for a red, relaxed for colour), and a made basket is delivered in three beats:
//    a shouted "Bucket!", the name, then the description a little calmer;
//  - Fast speed only says the key moments (importance 5+); Full also adds the lower-importance lines when there is room.
// Pure logic around an injected `synth` / `Utt` (testable with a fake). Browsers only allow speech after a tap: enable() must be called from the click handler.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const DEEP = /google uk english male|daniel|arthur|oliver|fred|rishi|aaron|thomas|david|mark|george|guy|ryan|james|alex|gordon|lee|reed|microsoft .*(david|mark|george|guy|ryan|james|thomas|christopher|eric|davis)/i;
const FEMALE = /female|samantha|karen|zira|susan|hazel|victoria|moira|tessa|fiona|libby|sonia|aria|jenny|michelle|ava|allison|catherine|kate|serena|google us english$/i;
export const voiceScore = (v) => { const n = v.name || ""; return (DEEP.test(n) ? 4 : 0) + (/\bmale\b/i.test(n) && !FEMALE.test(n) ? 3 : 0) + (/en[-_]GB/i.test(v.lang || "") ? 1 : 0) - (FEMALE.test(n) ? 6 : 0); };

// what is actually said: no minute, scores and "v" read out loud
export function spokenText(text) {
  return String(text || "").replace(/…/g, ".").replace(/\bv\b/g, "versus").replace(/(\d+)-(\d+)/g, "$1 to $2").replace(/\s+/g, " ").trim();
}

// ---- how interesting is a line? ----
export const IMPORTANCE = { final: 9, made: 8, block: 8, overtime: 9, qend: 8, tipoff: 7, steal: 7, injury: 7, foul: 5, timeout: 5, coin: 5, missed: 3, reb: 3, ft: 4, ftUp: 2, tov: 4, drive: 3, stepback: 2, pullup: 2, postup: 2, push: 3, assistPass: 3, kick: 3, sub: 3, bring: 1, inbound: 1, outlet: 1, swing: 1, entry: 2, screen: 1, run: 4, clutch: 4, foulTrouble: 3, fatigue: 3, trait: 3, state: 3, remark: 3 };
export const COLOUR = new Set(["run", "clutch", "foulTrouble", "fatigue", "trait", "state", "remark"]);
export const kindOf = (line) => (line && (line.kind || line.cls)) || "";
export const importanceOf = (line) => { const k = kindOf(line); return IMPORTANCE[k] != null ? IMPORTANCE[k] : line && line.cls ? 5 : 1; };
export const isKeyLine = (line) => importanceOf(line) >= 5;
const maxAge = (imp) => (imp >= 8 ? Infinity : imp >= 5 ? 5000 : imp >= 3 ? 2500 : 1500);   // ms a line may wait before it is no longer worth saying
const hashOf = (t) => { let h = 7; for (const c of String(t)) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0; return Math.abs(h); };

// ---- tone ----
export const TONES = {
  calm: { pitch: 0.7, rate: 0.98, volume: 0.72 }, lively: { pitch: 0.74, rate: 1.02, volume: 0.8 }, chance: { pitch: 0.82, rate: 1.08, volume: 0.9 }, sharp: { pitch: 0.86, rate: 1.05, volume: 0.95 },
  groan: { pitch: 0.64, rate: 0.93, volume: 0.8 }, stern: { pitch: 0.62, rate: 0.92, volume: 0.85 }, grave: { pitch: 0.6, rate: 0.9, volume: 0.78 }, relaxed: { pitch: 0.68, rate: 0.93, volume: 0.66 },
  formal: { pitch: 0.72, rate: 0.95, volume: 0.88 }, shout: { pitch: 0.98, rate: 0.95, volume: 1 }, name: { pitch: 1.0, rate: 1.0, volume: 1 }, afterMade: { pitch: 0.8, rate: 1.06, volume: 0.9 }
};
const KIND_TONE = { made: "afterMade", block: "sharp", steal: "sharp", missed: "groan", foul: "stern", injury: "grave", tipoff: "formal", qend: "formal", final: "formal", overtime: "shout", timeout: "relaxed", sub: "relaxed", drive: "chance", push: "lively", assistPass: "lively", kick: "lively", stepback: "chance", pullup: "chance", run: "relaxed", clutch: "chance", foulTrouble: "relaxed", fatigue: "relaxed", trait: "relaxed", state: "relaxed", remark: "relaxed" };
export const toneOf = (kind, hype) => { const t = TONES[KIND_TONE[kind] || "calm"], h = hype || 0; return { pitch: clamp(t.pitch + 0.02 * h, 0.5, 1.05), rate: t.rate, volume: clamp(t.volume + 0.02 * h, 0.5, 1) }; };
const sentences = (t) => String(t).split(/(?<=[.!?])\s+/).filter(Boolean);
// the line as a few beats, each with its own delivery: the first sentence leads (louder, higher), the rest is a calmer description; a basket is shouted, then the name, then the story
export function segmentsOf(text, kind, hype) {
  const ss = sentences(text), base = toneOf(kind, hype);
  if (kind === "made" && ss.length >= 2) {
    const out = [{ text: ss[0], ...TONES.shout }, { text: ss[1], ...TONES.name }];
    if (ss.length > 2) out.push({ text: ss.slice(2).join(" "), ...toneOf("made", hype) });
    return out;
  }
  if (ss.length < 2) return [{ text: String(text), ...base }];
  const loud = /!/.test(ss[0]);
  return [{ text: ss[0], pitch: clamp(base.pitch + (loud ? 0.05 : 0), 0.5, 1.05), rate: base.rate, volume: clamp(base.volume + (loud ? 0.05 : 0), 0.5, 1) }, { text: ss.slice(1).join(" "), pitch: clamp(base.pitch - 0.03, 0.5, 1.05), rate: clamp(base.rate + 0.03, 0.7, 1.3), volume: clamp(base.volume - 0.06, 0.5, 1) }];
}

export function createVoice({ synth, Utt, now = () => Date.now() } = {}) {
  const supported = !!(synth && typeof synth.speak === "function" && typeof Utt === "function");
  const st = { on: false, mode: "full", speed: 1, queue: [], busy: false, started: 0, est: 0, cur: null, voice: null, spoken: [], segs: [], lastEnd: -1e9, lastLow: -1e9, lastChatter: -1e9, lastColour: -1e9 };
  const pickVoice = () => {
    if (st.voice || !supported || typeof synth.getVoices !== "function") return st.voice;
    const en = (synth.getVoices() || []).filter((v) => /^en[-_]/i.test(v.lang || ""));
    st.voice = en.slice().sort((a, b) => voiceScore(b) - voiceScore(a))[0] || null;   // a deep male English voice if the device has one
    return st.voice;
  };
  // say the beats of one item one after another; each beat is its own utterance with its own pitch, pace and volume
  function speakItem(item) {
    const segs = item.segs || segmentsOf(item.text, item.kind, item.hype); st.cur = item; st.busy = true; st.started = now(); st.spoken.push(item.text);
    let k = 0, total = 0; for (const g of segs) total += (900 + g.text.length * 75) / clamp(g.rate * st.speed, 0.7, 1.35); st.est = total;
    const next = () => {
      if (st.cur !== item) return;
      if (k >= segs.length) { st.busy = false; st.cur = null; st.lastEnd = now(); return pump(); }
      const g = segs[k++], u = new Utt(g.text); u.rate = clamp(g.rate * st.speed, 0.7, 1.35); u.pitch = g.pitch; u.volume = g.volume; st.segs.push({ text: g.text, rate: u.rate, pitch: u.pitch, volume: u.volume });
      const v = pickVoice(); if (v) u.voice = v;
      u.onend = next; u.onerror = next;
      try { synth.speak(u); } catch (e) { st.busy = false; st.cur = null; }
    };
    next();
  }
  function pump() {
    if (!st.on || !supported) return;
    if (st.busy && now() - st.started > st.est + 2500) { st.busy = false; st.cur = null; st.lastEnd = now(); }   // an engine that never fires "end" (hidden tab) must not silence him forever
    if (st.busy) return;
    const t = now();
    while (st.queue.length) { const it = st.queue.shift(); if (t - it.at > maxAge(it.imp)) continue; return speakItem(it); }
  }
  const cancelNow = () => { st.cur = null; st.busy = false; if (supported) { try { synth.cancel(); } catch (e) { /* ignore */ } } };
  return {
    supported,
    get on() { return st.on; },
    get spoken() { return st.spoken; },
    get segments() { return st.segs; },
    get queued() { return st.queue.length; },
    get busy() { return st.on && st.busy; },
    get speed() { return st.speed; },
    setMode(speed) { st.mode = speed === "fast" ? "fast" : "full"; },
    setSpeed(mult) { st.speed = clamp(+mult || 1, 0.7, 1.4); },   // the user's own pace control: devices differ a lot in how fast their default voice talks
    enable() { if (!supported) return false; st.on = true; st.queue.length = 0; cancelNow(); speakItem({ text: "Commentary on.", kind: "remark", hype: 0, imp: 5, at: now() }); return true; },
    disable() { st.on = false; st.queue.length = 0; cancelNow(); },
    cancel() { st.queue.length = 0; cancelNow(); },
    // a feed line went live; ageMs = how long ago. Decides whether he says it at all.
    offer(line, ageMs) {
      if (!st.on || !supported) return;
      const imp = importanceOf(line), kind = kindOf(line), age = ageMs || 0, t = now();
      if (st.mode === "fast" && imp < 5) return;
      if (age > maxAge(imp)) return;
      const text = spokenText(line.text); if (!text) return;
      const item = { text, kind, hype: line.hype || 0, imp, at: t - age };
      if (kind === "made") { st.queue.length = 0; cancelNow(); st.lastLow = st.lastChatter = t; speakItem(item); return; }   // a basket is never read late: he drops what he was saying
      if (imp <= 4) {   // he only fills a gap when he is free, and not too often
        if (st.busy || st.queue.length || t - st.lastEnd < (imp <= 2 ? 3000 : 1500)) return;
        if (imp <= 2 && (t - st.lastChatter < 14000 || hashOf(text) % 3 !== 0)) return;
        if (imp >= 3 && t - st.lastLow < 5000) return;
        if (COLOUR.has(kind) && t - st.lastColour < 30000) return;
        st.lastLow = t; if (imp <= 2) st.lastChatter = t; if (COLOUR.has(kind)) st.lastColour = t;
      }
      if (st.queue.length >= 2) { let lo = 0; st.queue.forEach((q, i) => { if (q.imp < st.queue[lo].imp) lo = i; }); if (st.queue[lo].imp < imp) st.queue.splice(lo, 1); else return; }
      st.queue.push(item); pump();
    },
    tick() { pump(); }
  };
}
