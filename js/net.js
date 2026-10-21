import * as R from "./rules.js";

const V = R.FIREBASE_VERSION;
const [appMod, dbMod] = await Promise.all([
  import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
  import(`https://www.gstatic.com/firebasejs/${V}/firebase-database.js`)
]);
const { ref, onValue, set, update, get, push, remove, runTransaction, onDisconnect,
  query, orderByChild, limitToLast, serverTimestamp } = dbMod;

export const configured = !R.firebaseConfig.apiKey.startsWith("YOUR_");
const app = appMod.initializeApp(R.firebaseConfig);
export const db = dbMod.getDatabase(app);
export { serverTimestamp };

// ---------- time ----------
let offset = 0;
onValue(ref(db, ".info/serverTimeOffset"), (s) => { offset = s.val() || 0; });
export const now = () => Date.now() + offset;

// ---------- identity ----------
export const nameKey = (n) => String(n || "").trim().toLowerCase().replace(/[.#$/\[\]]/g, "_").slice(0, 24);
export const cleanName = (n) => String(n || "").trim().replace(/\s+/g, " ").slice(0, 24);
const rid = () => Math.random().toString(36).slice(2, 10);
export const sid = (() => { let s = sessionStorage.getItem("adw_sid"); if (!s) { s = rid() + rid(); sessionStorage.setItem("adw_sid", s); } return s; })();
export const savedName = () => localStorage.getItem("adw_name") || "";
export const saveName = (n) => localStorage.setItem("adw_name", n);

// ---------- generic refs ----------
const rp = (code, path = "") => ref(db, `rooms/${code}${path ? "/" + path : ""}`);
export const P = rp;
export const getVal = async (code, path) => (await get(rp(code, path))).val();
export const put = (code, path, v) => set(rp(code, path), v);
export const patch = (code, path, o) => update(rp(code, path), o);
export const del = (code, path) => remove(rp(code, path));
export const tx = (code, path, fn) => runTransaction(rp(code, path), fn, { applyLocally: false });
export function watch(code, path, cb) {
  return onValue(rp(code, path), (s) => cb(s.val()), (e) => console.warn("watch error", path, e));
}
export function watchConnection(cb) { return onValue(ref(db, ".info/connected"), (s) => cb(!!s.val())); }

// ---------- rooms ----------
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const makeCode = () => Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join("");
export const normCode = (c) => String(c || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);

export async function createRoom(name, settings, extra = {}) {
  const key = nameKey(name);
  for (let i = 0; i < 12; i++) {
    const code = makeCode();
    const res = await runTransaction(rp(code, "meta"), (cur) => (cur ? undefined : {
      createdAt: serverTimestamp(), hostKey: key, phase: "lobby", pack: extra.pack || "animals", mode: extra.mode || "classic", settings }), { applyLocally: false });
    if (res.committed) return code;
  }
  throw new Error("Could not allocate a room code, try again");
}

export async function joinRoom(code, name, wantRole) {
  const meta = await getVal(code, "meta");
  if (!meta) throw new Error("Room not found");
  const key = nameKey(name), nm = cleanName(name);
  if (!key) throw new Error("Enter a name");
  let role = wantRole;
  if (role === "player") {
    if (meta.phase && meta.phase !== "lobby") {
      const ex = await getVal(code, `players/${key}`);
      if (!ex) role = "spectator";
    }
  }

  const cres = await runTransaction(rp(code, "conns"), (cur) => {
    cur = cur || {};
    if (!cur[sid] && Object.keys(cur).length >= R.MAX_CONNECTIONS) return undefined;
    cur[sid] = { key, role, t: Date.now() };
    return cur;
  }, { applyLocally: false });
  if (!cres.committed) throw new Error("Room is full (10 connections)");
  onDisconnect(rp(code, `conns/${sid}`)).remove();
  if (role === "player") {
    const pres = await runTransaction(rp(code, `players/${key}`), (cur) => {
      if (!cur) {
        return { name: nm, joinedAt: serverTimestamp(), sid, appealTokens: 1, online: true, role: "player" };
      }
      return { ...cur, name: nm, sid, online: true };
    }, { applyLocally: false });

    const players = (await getVal(code, "players")) || {};
    if (Object.keys(players).length > R.MAX_PLAYERS && pres.snapshot.val().sid === sid && !(meta.settings && players[key] && players[key].old)) {
      const mine = players[key];
      const earlier = Object.entries(players).filter(([k, p]) => k !== key && (p.joinedAt || 0) <= (mine.joinedAt || 0)).length;
      if (earlier >= R.MAX_PLAYERS) { await remove(rp(code, `players/${key}`)); await remove(rp(code, `conns/${sid}`)); throw new Error("Room already has 6 players. Join as spectator."); }
    }
    onDisconnect(rp(code, `players/${key}/online`)).set(false);
  } else {
    await set(rp(code, `spectators/${sid}`), { name: nm, joinedAt: serverTimestamp() });
    onDisconnect(rp(code, `spectators/${sid}`)).remove();
  }
  saveName(nm);
  return { role, key, name: nm };
}

export async function leaveRoom(code, role, key) {
  try {
    await remove(rp(code, `conns/${sid}`));
    if (role === "spectator") await remove(rp(code, `spectators/${sid}`));
    else if (role === "player") await update(rp(code, `players/${key}`), { online: false });
  } catch (e) { console.warn(e); }
}

export async function reassert(code, role, key, name) {
  await set(rp(code, `conns/${sid}`), { key, role, t: Date.now() });
  onDisconnect(rp(code, `conns/${sid}`)).remove();
  if (role === "player") {
    const cur = await getVal(code, `players/${key}`);
    if (cur && cur.sid !== sid) return false;
    await update(rp(code, `players/${key}`), { online: true, sid });
    onDisconnect(rp(code, `players/${key}/online`)).set(false);
  } else {
    await set(rp(code, `spectators/${sid}`), { name, joinedAt: serverTimestamp() });
    onDisconnect(rp(code, `spectators/${sid}`)).remove();
  }
  return true;
}

export const beat = (code, key) => update(rp(code, "host"), { key, sid, hb: serverTimestamp() });
export async function claimHost(code, key) {
  const res = await runTransaction(rp(code, "host"), (cur) => {
    const t = now();
    if (cur && cur.sid !== sid && cur.hb && t - cur.hb < R.HOST_STALE_MS) return undefined;
    return { key, sid, hb: t };
  }, { applyLocally: false });
  return res.committed;
}

export function applyBid(a, key, amount, t) {
  if (!a || a.status !== "bidding" || a.resolved) return undefined;
  if (!(a.eligible && a.eligible[key])) return undefined;
  if (a.skips && a.skips[key]) return undefined;
  if (t >= a.deadline) return undefined;
  const lim = (a.limits && a.limits[key]) || 0;
  amount = Math.floor(amount);
  const min = (a.top ? a.top.amt : 0) + R.MIN_BID;
  if (!(amount >= min) || amount > lim) return undefined;
  const left = a.deadline - t;
  if (left <= R.LAST_MOMENT_MS) a.deadline += R.EXTEND_LAST_MS;
  else if (left <= R.EXTEND_WINDOW_MS) a.deadline += R.EXTEND_SMALL_MS;
  a.top = { key, amt: amount };
  return a;
}
export function applySkip(a, key) {
  if (!a || a.resolved) return undefined;
  if (a.status === "bidding") {
    if (!(a.eligible && a.eligible[key])) return undefined;
    if (a.top && a.top.key === key) return undefined;
    a.skips = a.skips || {}; a.skips[key] = true; return a;
  }
  if (a.status === "claim" && a.claim && a.claim.key === key) { a.claim = { ...a.claim, declined: true }; return a; }
  return undefined;
}
export function applyClaim(a, key, t) {
  if (!a || a.status !== "claim" || a.resolved || !a.claim || a.claim.key !== key || a.claim.declined) return undefined;
  if (t >= a.claim.deadline) return undefined;
  a.claim = { ...a.claim, taken: true }; return a;
}
const run = async (code, fn) => (await runTransaction(rp(code, "auction"), fn, { applyLocally: false })).committed;
export const bid = (code, key, amount) => run(code, (a) => applyBid(a, key, amount, now()));
export const skip = (code, key) => run(code, (a) => applySkip(a, key));
export const claimFree = (code, key) => run(code, (a) => applyClaim(a, key, now()));

let lastChat = 0;
export async function sendChat(code, name, text, spec) {
  const t = Date.now();
  if (t - lastChat < R.CHAT_MIN_GAP_MS) return false;
  text = String(text || "").trim().slice(0, 200);
  if (!text) return false;
  lastChat = t;
  await push(rp(code, "chat"), { name, text, spec: !!spec, t: serverTimestamp() });
  return true;
}
export function watchChat(code, cb) {
  return onValue(query(rp(code, "chat"), limitToLast(R.CHAT_KEEP)), (s) => {
    const out = []; s.forEach((c) => { out.push({ id: c.key, ...c.val() }); }); cb(out);
  });
}
export async function pruneChat(code) {
  const s = await get(rp(code, "chat"));
  const keys = []; s.forEach((c) => { keys.push(c.key); });
  if (keys.length <= R.CHAT_KEEP) return;
  const up = {}; keys.slice(0, keys.length - R.CHAT_KEEP).forEach((k) => { up[k] = null; });
  await update(rp(code, "chat"), up);
}

export async function bumpStats(key, name, delta) {
  await runTransaction(ref(db, `stats/${key}`), (cur) => {
    const s = cur || { name, games_played: 0, fights_won: 0, fights_lost: 0, fights_drawn: 0, tournaments_won: 0, animals_drafted: 0 };
    s.name = name;
    for (const k of Object.keys(delta)) s[k] = (s[k] || 0) + delta[k];
    return s;
  }, { applyLocally: false });
}
export async function topStats() {
  const s = await get(query(ref(db, "stats"), orderByChild("tournaments_won"), limitToLast(50)));
  const out = []; s.forEach((c) => { out.push({ key: c.key, ...c.val() }); });
  return out.sort((a, b) => (b.tournaments_won || 0) - (a.tournaments_won || 0) || (b.fights_won || 0) - (a.fights_won || 0)).slice(0, 20);
}
export async function lookupStats(name) {
  const v = (await get(ref(db, `stats/${nameKey(name)}`))).val();
  return v ? { key: nameKey(name), ...v } : null;
}

let wake = null;
export async function keepAwake() {
  try { if ("wakeLock" in navigator) { wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => { wake = null; }); } } catch (e) { console.warn("wake lock", e); }
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && window.__isHost && !wake) keepAwake(); });
