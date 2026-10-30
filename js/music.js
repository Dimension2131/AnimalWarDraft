// js/music.js: the Music Centre's playback engine. No DOM in here (the panel lives in js/music-centre.js), so it can be tested on its own.
//  - ONE shared <audio> element plays every track, so two background songs can never overlap. Its listeners are attached once.
//  - The song list comes from assets/music/manifest.json (see tools/build-music-manifest.mjs): a static host cannot list a folder.
//    If the manifest is missing or empty, folder listings are tried as a fallback (works on `python -m http.server`, `npx serve` ...).
//  - Random playback: a random track when music starts, another random one (never the same twice in a row) when a track ends or fails.
//  - Preferences (mute + volume) are kept in localStorage under "adw_music", like the project's other adw_* keys.
export const CATEGORIES = ["football", "animals", "quiz", "race", "basketball"];   // keep in sync with tools/build-music-manifest.mjs
export const TYPES = { mp3: "audio/mpeg", ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/ogg; codecs=opus", wav: "audio/wav", m4a: "audio/mp4", aac: "audio/aac", flac: "audio/flac", weba: "audio/webm", webm: "audio/webm" };
const KEY = "adw_music", DUCK = 0.35, FADE_OUT = 700, FADE_IN = 900, clamp = (n, a, b) => Math.min(b, Math.max(a, n));

const extOf = (f) => { const m = /\.([a-z0-9]+)$/i.exec(f); return m ? m[1].toLowerCase() : ""; };
export const isAudioFile = (f) => typeof f === "string" && !!TYPES[extOf(f)];
// "Football Background Music 1.mp3" -> "Football Background Music 1" (only a real, supported audio extension is removed; the file name and URL are untouched)
export const cleanName = (f) => (isAudioFile(f) ? f.replace(/\.[a-z0-9]+$/i, "") : String(f)).trim();

export function createMusicEngine({ audio, base, fetchFn, storage, rand = Math.random, speech = null, timers = { set: (f, ms) => setInterval(f, ms), clear: (id) => clearInterval(id) }, now = () => Date.now() }) {
  const S = {
    tracks: [], cur: null, status: "idle", notice: "", loaded: false, muted: false, volume: 40, volumeLocked: false, ducked: false,
    userPaused: false, pausedBySynth: false, needGesture: false, modeMusic: false, modeCat: null, fadeMul: 1, fadeTok: 0, rampUp: false, started: false, starting: false, gen: 0, failed: new Set(), lastLoad: 0, loading: null
  };
  const subs = new Set();
  let duckTimer = 0, rampTimer = 0, dead = false;
  const snap = () => ({ tracks: S.tracks, cur: S.cur, status: S.status, notice: S.notice, loaded: S.loaded, muted: S.muted, volume: S.volume, modeMusic: S.modeMusic, volumeLocked: S.volumeLocked, isPlaying: !!S.cur && !audio.paused, userPaused: S.userPaused, failed: S.failed });
  const emit = () => { const s = snap(); for (const f of subs) { try { f(s); } catch (e) { /* a broken subscriber must not stop playback */ } } };
  const save = () => { try { storage && storage.setItem(KEY, JSON.stringify({ muted: S.muted, volume: S.volume, modeMusic: S.modeMusic })); } catch (e) { /* private mode */ } };
  try { const p = JSON.parse((storage && storage.getItem(KEY)) || "null"); if (p) { S.muted = p.muted === true; S.modeMusic = p.modeMusic === true; if (Number.isFinite(p.volume)) S.volume = clamp(Math.round(p.volume), 0, 100); } } catch (e) { /* ignore */ }

  // iOS Safari ignores audio.volume (the device buttons rule): detect it once so the UI can say so instead of showing a dead slider.
  try { audio.volume = 0.5; S.volumeLocked = Math.abs(audio.volume - 0.5) > 0.01; } catch (e) { S.volumeLocked = true; }
  audio.preload = "auto"; audio.muted = S.muted;
  const applyVolume = () => { try { audio.volume = clamp((S.volume / 100) * (S.ducked ? DUCK : 1) * S.fadeMul, 0, 1); } catch (e) { /* ignore */ } };
  // Linear fade of a 0..1 multiplier that sits on top of the user's volume. With a locked volume (iOS) there is nothing to ramp, so it just jumps.
  const stopRamp = () => { if (rampTimer) { timers.clear(rampTimer); rampTimer = 0; } };
  function ramp(to, ms, done) {
    stopRamp();
    if (S.volumeLocked || ms <= 0) { S.fadeMul = to; applyVolume(); if (done) done(); return; }
    const from = S.fadeMul, t0 = now();
    rampTimer = timers.set(() => { const k = clamp((now() - t0) / ms, 0, 1); S.fadeMul = from + (to - from) * k; applyVolume(); if (k >= 1) { stopRamp(); if (done) done(); } }, 40);
  }
  const cancelFade = () => { S.fadeTok++; stopRamp(); S.rampUp = false; if (S.fadeMul !== 1) { S.fadeMul = 1; applyVolume(); } };   // any deliberate action cancels a pending mode switch
  applyVolume();

  // ---------- library ----------
  const canPlay = (f) => { try { return audio.canPlayType(TYPES[extOf(f)]) !== ""; } catch (e) { return true; } };
  const usable = (f) => isAudioFile(f) && canPlay(f);
  function parseManifest(j) {
    const src = j && typeof j === "object" ? j.categories || j : {}, out = {};
    for (const c of CATEGORIES) out[c] = [...new Set((Array.isArray(src[c]) ? src[c] : []).filter(usable))];
    return out;
  }
  async function listFolder(cat) {   // directory-listing fallback: only HTML index pages count; a 404 (GitHub Pages) or the SPA index simply yields nothing
    try {
      const r = await fetchFn(base + cat + "/"); if (!r.ok || !/html/i.test((r.headers && r.headers.get("content-type")) || "")) return [];
      const html = await r.text(), found = [], re = /href\s*=\s*["']([^"']+)["']/gi; let m;
      while ((m = re.exec(html))) { const seg = m[1].split(/[?#]/)[0].split("/").filter(Boolean).pop(); if (!seg) continue; let n = seg; try { n = decodeURIComponent(seg); } catch (e) { /* keep raw */ } if (usable(n)) found.push(n); }
      return [...new Set(found)];
    } catch (e) { return []; }
  }
  async function readLibrary(probe) {
    let map = null;
    try { const r = await fetchFn(base + "manifest.json", { cache: "no-cache" }); if (r.ok) map = parseManifest(await r.json()); } catch (e) { map = null; }
    if (!map || (probe && !CATEGORIES.some((c) => map[c].length))) {
      const found = await Promise.all(CATEGORIES.map(listFolder)); map = map || {};
      CATEGORIES.forEach((c, i) => { if (found[i].length) map[c] = found[i]; else if (!map[c]) map[c] = []; });
    }
    return CATEGORIES.flatMap((c) => map[c].map((file) => ({ id: c + "/" + file, cat: c, file, name: cleanName(file), url: base + c + "/" + encodeURIComponent(file) })));
  }
  // (Re)read the song list. Never touches what is currently playing. probe=true also tries folder listings when the manifest has nothing.
  function loadLibrary(probe = true) {
    if (S.loading) return S.loading;
    S.loading = readLibrary(probe).then((tracks) => {
      if (dead) return; S.tracks = tracks; S.loaded = true; S.lastLoad = Date.now(); S.failed.clear();
      if (!tracks.length && !S.cur) S.status = "idle";
      emit(); autoStart();
    }).catch(() => { S.loaded = true; emit(); }).finally(() => { S.loading = null; });
    return S.loading;
  }

  // ---------- playback ----------
  const pick = (excludeId, cat = null) => {
    const pool = S.tracks.filter((t) => !S.failed.has(t.id) && (!cat || t.cat === cat));
    const others = pool.filter((t) => t.id !== excludeId);
    const from = others.length ? others : pool;   // a one-track library just repeats that track
    return from.length ? from[Math.floor(rand() * from.length) % from.length] : null;
  };
  const unmute = () => { if (S.muted) { S.muted = false; audio.muted = false; save(); } };
  function play(t, { manual = false, fade = false } = {}) {
    if (!t || dead) return;
    const gen = ++S.gen;
    if (fade) { S.fadeMul = 0; S.rampUp = true; } else { cancelFade(); }   // a fade-in starts once the song really plays (see onPlaying)
    if (manual) { S.failed.delete(t.id); S.userPaused = false; unmute(); }   // an explicit choice means "I want to hear it"
    S.pausedBySynth = false; S.cur = t; S.started = true; S.status = "loading"; S.notice = "";
    audio.src = t.url;   // replaces (and aborts) whatever was loaded: there is only ever one stream
    applyVolume();
    settle(safePlay(), gen, t);
    emit();
  }
  const safePlay = () => { try { return Promise.resolve(audio.play()); } catch (e) { return Promise.reject(e); } };
  function settle(p, gen, t) {
    S.starting = true;
    p.then(() => { if (gen === S.gen) { S.needGesture = false; } }, (err) => {
      if (gen !== S.gen) return;   // a newer track took over: this rejection is stale
      const n = err && err.name;
      if (n === "AbortError") return;
      if (n === "NotAllowedError") { S.needGesture = true; S.status = "blocked"; cancelFade(); emit(); return; }   // autoplay policy: wait for a real gesture, do not retry in a loop
      failed(t, gen);
    }).then(() => { S.starting = false; });
  }
  function failed(t, gen) {   // the file is missing / corrupt / unsupported: remember it and move on to another track
    if (gen !== S.gen || dead) return;
    S.failed.add(t.id); cancelFade();
    const n = pick(t.id);
    if (n && n.id !== t.id) { play(n); S.notice = "Couldn’t play “" + t.name + "”. Trying another."; emit(); return; }
    S.gen++; try { audio.removeAttribute("src"); audio.load(); } catch (e) { /* ignore */ }
    S.status = "none"; S.notice = ""; emit();
  }
  function resume() {
    if (!S.cur || S.status === "none") return startRandom();
    if (S.starting) return;
    settle(safePlay(), S.gen, S.cur);
  }
  function startRandom(opts) { const id = S.cur && S.cur.id, t = (S.modeMusic && S.modeCat && pick(id, S.modeCat)) || pick(id); if (t) play(t, opts); else { S.status = S.tracks.length ? "none" : "idle"; emit(); } }
  function autoStart() { if (!S.started && !S.muted && !S.userPaused && !S.cur && S.tracks.length) startRandom(); }

  const onPlaying = () => { S.status = "playing"; S.needGesture = false; S.notice = ""; if (S.rampUp) { S.rampUp = false; ramp(1, FADE_IN); } emit(); watchSpeech(true); };
  const onPause = () => { if (S.status === "playing") S.status = "paused"; emit(); watchSpeech(false); };
  const onEnded = () => { watchSpeech(false); const n = pick(S.cur && S.cur.id); if (n) play(n); else { S.status = "none"; emit(); } };   // random continuation, also after a manual pick
  const onError = () => { if (S.cur && audio.getAttribute("src")) failed(S.cur, S.gen); };
  audio.addEventListener("playing", onPlaying); audio.addEventListener("pause", onPause); audio.addEventListener("ended", onEnded); audio.addEventListener("error", onError);

  // The match commentators use speechSynthesis: while one is talking, the song steps back, like the synthesised match music does.
  function watchSpeech(on) {
    if (!speech) return;
    if (on && !duckTimer) duckTimer = timers.set(() => { const d = !!speech.speaking; if (d !== S.ducked) { S.ducked = d; applyVolume(); } }, 400);
    if (!on && duckTimer) { timers.clear(duckTimer); duckTimer = 0; if (S.ducked) { S.ducked = false; applyVolume(); } }
  }

  return {
    get state() { return snap(); },
    on(fn) { subs.add(fn); fn(snap()); return () => subs.delete(fn); },
    loadLibrary, refresh: () => loadLibrary(true), get lastLoad() { return S.lastLoad; },
    select(id) { const t = S.tracks.find((x) => x.id === id); if (t) play(t, { manual: true }); },
    next() { const t = pick(S.cur && S.cur.id); if (t) play(t, { manual: true }); },
    random(cat) { const t = pick(S.cur && S.cur.id, cat || null); if (t) play(t, { manual: true }); },   // random song, optionally only from one category
    setModeMusic(on) { S.modeMusic = !!on; save(); emit(); },
    // The player switched game (Animals / Football / Basketball ...). cat = that game's music folder, or null if it has none.
    // With "mode music" on, the current song fades out and a random song of that folder fades in. Only at this moment: afterwards the player is free to pick anything.
    setModeCat(cat, { change = false } = {}) {
      S.modeCat = cat || null;
      if (!change || !S.modeMusic || !cat || S.muted || S.userPaused || S.pausedBySynth || dead) return;
      if (S.cur && S.cur.cat === cat && S.status !== "none") return;   // already playing that game's music
      const t = pick(S.cur && S.cur.id, cat); if (!t) return;
      const tok = ++S.fadeTok; stopRamp(); S.rampUp = false;
      const go = () => { if (tok === S.fadeTok && !dead) play(t, { fade: true }); };
      if (S.cur && !audio.paused) ramp(0, FADE_OUT, go); else go();
    },
    toggle() {
      if (!S.cur || S.status === "none") { startRandom({ manual: true }); return; }
      if (audio.paused) { S.userPaused = false; S.pausedBySynth = false; unmute(); resume(); emit(); }
      else { cancelFade(); S.userPaused = true; audio.pause(); S.status = "paused"; emit(); }
    },
    setMuted(m) {
      S.muted = !!m; audio.muted = S.muted; save();
      if (!S.muted) { if (!S.cur && !S.userPaused) startRandom(); else if (S.needGesture && !S.userPaused) resume(); }
      emit();
    },
    setVolume(v) { S.volume = clamp(Math.round(+v || 0), 0, 100); applyVolume(); save(); emit(); },
    // called by the panel on a real user gesture while the browser's autoplay policy is blocking us
    gesture() { if (S.needGesture && !S.muted && !S.userPaused && !S.starting) resume(); },
    get blocked() { return S.needGesture; },
    // the match viewers' own synthesised music was switched on/off: pause ours while it plays, resume after (unless the user took over meanwhile)
    synth(on) {
      if (on) { if (S.cur && !audio.paused) { S.pausedBySynth = true; audio.pause(); S.status = "synth"; emit(); } }
      else if (S.pausedBySynth) { S.pausedBySynth = false; if (!S.userPaused && !S.muted) resume(); else { S.status = "paused"; emit(); } }
    },
    destroy() { dead = true; stopRamp(); watchSpeech(false); audio.removeEventListener("playing", onPlaying); audio.removeEventListener("pause", onPause); audio.removeEventListener("ended", onEnded); audio.removeEventListener("error", onError); try { audio.pause(); } catch (e) { /* ignore */ } subs.clear(); }
  };
}
