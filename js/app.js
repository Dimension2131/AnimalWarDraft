// =====================================================================
// app.js — UI, routing, host election, and every client write the host waits for.
// Hidden pages: ?validate and ?balance (work without Firebase configured).
// =====================================================================
import * as R from "./rules.js";
import { ANIMALS, ANIMAL_MAP } from "./animals.js";
import { simulate, describeAutopsy, validateAnimals, balanceTest } from "./sim.js";
import { createRenderer, renderEventLog, renderLossCards } from "./renderer.js";

const $ = (s, r = document) => r.querySelector(s);
const arr = (v) => (Array.isArray(v) ? v : v ? Object.values(v) : []);
// Animal icon: silhouette image when we have one (falls back to the emoji if it fails to load).
const icon = (a) => {
  const em = () => h("span", { class: "emoji" }, a.emoji);
  return a.silhouette ? h("img", { class: "sil", src: a.silhouette, alt: a.name || "", loading: "lazy", onerror: (e) => e.target.replaceWith(em()) }) : em();
};
// Home-screen hero: three random silhouettes, printed in blue / pink / teal and overlapped.
function hero() {
  const pool = ANIMALS.filter((a) => a.silhouette), picks = [], inks = ["blue", "pink", "teal"];
  while (pool.length && picks.length < 3) picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return h("div", { class: "hero" },
    h("div", { class: "hero-art", "aria-hidden": "true" }, picks.map((a, i) => h("img", { class: `hero-sil ink-${inks[i]} hs${i}`, src: a.silhouette, alt: "", onerror: (e) => e.target.remove() }))),
    h("h1", { class: "wordmark" }, h("span", {}, "Animal"), h("span", {}, "Draft"), h("span", {}, "War")),
    h("p", { class: "tagline" }, "Bid on animals, set your lineup, then watch them fight."));
}
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (["value", "checked", "disabled", "selected"].includes(k)) e[k] = v;
    else if (v !== false && v != null) e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat(Infinity)) { if (c == null || c === false) continue; e.append(c.nodeType ? c : document.createTextNode(String(c))); }
  return e;
}
const root = $("#app");
// Warm the browser cache so every silhouette is ready before its lot comes up.
setTimeout(() => { for (const a of ANIMALS) if (a.silhouette) new Image().src = a.silhouette; }, 0);
const secs = (ms) => Math.max(0, Math.ceil(ms / 1000));
const fmtMass = (m) => (m >= 1000 ? +(m / 1000).toPrecision(3) + " t" : (m >= 100 ? Math.round(m) : m >= 1 ? +m.toFixed(1) : +m.toPrecision(2)) + " kg");
let toastT;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3500); }

// ---------------- hidden pages ----------------
function pageValidate() {
  const v = validateAnimals(ANIMALS);
  root.replaceChildren(h("section", { class: "screen" }, h("h1", {}, "Validate animals"),
    h("p", {}, `${ANIMALS.length} animals loaded, ${v.length} violation(s).`),
    v.length ? h("ul", { class: "viol" }, v.map((x) => h("li", {}, x))) : h("p", { class: "ok" }, "All animals are valid.")));
}
function pageBalance() {
  root.replaceChildren(h("section", { class: "screen" }, h("h1", {}, "Balance test"), h("p", {}, "Simulating 2000 random 5v5 fights...")));
  setTimeout(() => {
    const bt = balanceTest(ANIMALS, 2000);
    root.replaceChildren(h("section", { class: "screen" }, h("h1", {}, "Balance test"),
      h("p", {}, `Fights: ${bt.fights} · draw rate ${(bt.drawRate * 100).toFixed(1)}% · cap draws ${bt.capDraws} · avg ticks ${bt.avgTicks.toFixed(1)} · max ${bt.maxTicks} · side A win ${(bt.aWinRate * 100).toFixed(1)}%`),
      h("div", { class: "scroll" }, h("table", { class: "tbl" },
        h("thead", {}, h("tr", {}, ["Animal", "Games", "Wins", "Draws", "Win rate", "Flag"].map((x) => h("th", {}, x)))),
        h("tbody", {}, bt.rows.map((r) => h("tr", { class: r.flag ? "flag" : "" },
          h("td", {}, r.name), h("td", {}, r.games), h("td", {}, r.wins), h("td", {}, r.draws), h("td", {}, (r.winRate * 100).toFixed(1) + "%"), h("td", {}, r.flag))))))));
  }, 30);
}

// ---------------- main ----------------
async function main() {
  const q = location.search;
  if (/[?&]validate\b/.test(q)) return pageValidate();
  if (/[?&]balance\b/.test(q)) return pageBalance();
  let N, H;
  try { N = await import("./net.js"); H = await import("./host.js"); }
  catch (e) { root.replaceChildren(h("section", { class: "screen" }, h("h1", {}, "Could not load Firebase"), h("p", {}, String(e)), h("p", { class: "muted" }, "Open this page through a web server (https or http://localhost), not file://, and check your connection."))); return; }

  const S = { code: null, role: null, key: null, name: "", connected: true, loaded: {}, chat: [], view: "home" };
  const PATHS = ["meta", "players", "spectators", "ledger", "game", "auction", "lineups", "tour", "appeals", "host"];
  let unsubs = [], runner = null, current = null, currentName = "", raf = 0, booting = false;
  const nameOf = (k) => (S.players && S.players[k] && S.players[k].name) || k;
  const isHost = () => !!(S.host && S.host.sid === N.sid);
  const settings = () => {
    const s = { ...R.DEFAULT_SETTINGS, ...((S.meta && S.meta.settings) || {}) };
    const f = { ...((S.meta && S.meta.settings && S.meta.settings.filters) || R.DEFAULT_SETTINGS.filters) };
    f.habitats = arr(f.habitats); f.classes = arr(f.classes); f.excluded = arr(f.excluded);
    if (f.massMin == null) f.massMin = R.MASS_SLIDER_MIN; if (f.massMax == null) f.massMax = R.MASS_SLIDER_MAX;
    s.filters = f; return s;
  };
  const playersSorted = () => Object.entries(S.players || {}).sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0)).map(([k, p]) => ({ key: k, ...p }));
  const voterId = () => (S.role === "player" ? S.key : N.sid);

  // ----- watching -----
  function startWatching(code) {
    stopWatching();
    for (const p of PATHS) unsubs.push(N.watch(code, p, (v) => { S[p] = v; S.loaded[p] = true; schedule(); }));
    unsubs.push(N.watchChat(code, (c) => { S.chat = c; chatUpdate(); }));
  }
  function stopWatching() { unsubs.forEach((u) => { try { u(); } catch (e) { /* ignore */ } }); unsubs = []; S.loaded = {}; for (const p of PATHS) S[p] = undefined; }
  function schedule() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; route(); if (current && current.update) current.update(); topbar(); ensureRunner(); }); }

  async function enter(code, role, name) {
    const r = await N.joinRoom(code, name, role);
    Object.assign(S, { code, role: r.role, key: r.key, name: r.name, chat: [] });
    sessionStorage.setItem("adw_room", JSON.stringify({ code, role: r.role, name: r.name }));
    startWatching(code); $("#chat").hidden = false; schedule();
    if (r.role !== role) toast("The game is already running, so you joined as a spectator.");
  }
  async function leave() {
    if (runner) { runner.stop(); runner = null; }
    if (S.code) await N.leaveRoom(S.code, S.role, S.key);
    stopWatching(); sessionStorage.removeItem("adw_room");
    Object.assign(S, { code: null, role: null, key: null, view: "home" }); $("#chat").hidden = true; $("#banner").hidden = true; schedule();
  }

  // ----- host runner & election -----
  function ensureRunner() {
    if (S.role !== "player" || !S.loaded.host) return;
    if (isHost() && !runner) runner = H.startHost({ code: S.code, key: S.key, animals: ANIMALS });
    else if (!isHost() && runner) { runner.stop(); runner = null; }
  }
  async function election() {
    if (S.role !== "player" || !S.loaded.host || !S.loaded.players || !S.meta || isHost()) return;
    if (H.shouldClaimHost({ players: S.players, host: S.host, myKey: S.key })) { try { await N.claimHost(S.code, S.key); } catch (e) { console.warn(e); } }
  }
  setInterval(election, 2500);

  // ----- connection / takeover banner -----
  let firstConn = true;
  N.watchConnection((c) => {
    const was = S.connected; S.connected = c; schedule();
    if (firstConn) { firstConn = false; return; }
    if (c && !was && S.code) N.reassert(S.code, S.role, S.key, S.name).then((ok) => { if (ok === false) schedule(); }).catch(console.warn);
  });
  function topbar() {
    const b = $("#banner"), tb = $("#topbar");
    tb.replaceChildren();
    if (S.code) {
      tb.append(h("span", { class: "code" }, S.code), h("span", { class: "who" }, S.role === "spectator" ? "spectating" : S.name), ...(isHost() ? [h("span", { class: "pill host" }, "host")] : []),
        h("span", { class: S.connected ? "dot on" : "dot" }), h("button", { class: "btn small", onclick: leave }, "Leave"));
    }
    const taken = S.role === "player" && S.loaded.players && S.players && S.players[S.key] && S.players[S.key].sid && S.players[S.key].sid !== N.sid;
    let msg = "";
    if (!N.configured) msg = "Firebase is not configured. Edit the block at the top of rules.js.";
    else if (!S.connected) msg = "Offline, reconnecting…";
    else if (taken) msg = "taken";
    b.hidden = !msg; b.replaceChildren();
    if (msg === "taken") b.append("Your seat was taken over by another device. ", h("button", { class: "btn small", onclick: async () => { await N.reassert(S.code, "player", S.key, S.name); await N.patch(S.code, `players/${S.key}`, { sid: N.sid, online: true }); schedule(); } }, "Take it back"));
    else if (msg) b.append(msg);
  }

  // ----- routing -----
  const screens = {};
  function mount(name) {
    if (name === currentName) return;
    if (current && current.destroy) current.destroy();
    root.replaceChildren(); currentName = name; current = screens[name]();
  }
  function route() {
    if (booting && !S.code) return mount("loading"); // rejoining after refresh: never flash home
    if (!S.code) return mount(S.view === "leaderboard" ? "leaderboard" : "home");
    if (!S.loaded.meta) return mount("loading");
    if (!S.meta) { toast("That room no longer exists."); leave(); return; }
    mount({ lobby: "lobby", draft: "draft", lineup: "lineup", tournament: "fight", results: "results" }[S.meta.phase] || "loading");
  }
  setInterval(() => { if (current && current.tick) current.tick(); }, 250);

  // ================= shared widgets =================
  function animalCard(a, compact, note) {
    const stats = ["offense", "defense", "speed", "stamina", "instinct"];
    const zone = (statVals, tileVals) => compact ? null : h("div", { class: "statzone" },
      h("div", { class: "stats" }, stats.map((s) => h("div", { class: "stat s-" + s }, h("span", {}, s), h("div", { class: "sbar" }, h("i", { style: `width:${statVals ? statVals[s] : 0}%` })), h("b", {}, statVals ? statVals[s] : "?")))),
      h("div", { class: "arena-tiles" }, R.ARENAS.map((ar) => { const v = tileVals ? (tileVals[ar] || 0) : null; return h("div", { class: "atile " + (v == null ? "zero" : v > 0 ? "good" : v < 0 ? "bad" : "zero") }, h("span", {}, R.ARENA_INFO[ar].label), h("b", {}, v == null ? "?" : `${v > 0 ? "+" : ""}${v}`)); })));
    // Placeholder plate: same skeleton as a real animal, every value a "?", so the draft screen never changes height.
    if (!a) return h("div", { class: "acard ph" },
      h("div", { class: "plate-head" }, h("div", { class: "medal" }, h("span", { class: "qmark" }, "?")), h("div", { class: "grow" }, h("strong", { class: "aname" }, "???"), h("div", { class: "special" }, note || "Next animal…"))),
      h("div", { class: "row meta" }, [1, 2, 3].map(() => h("span", { class: "chip-s" }, "?"))),
      h("div", { class: "row wrap tagrow" }),
      zone(null, null));
    return h("div", { class: "acard" },
      h("div", { class: "plate-head" }, h("div", { class: "medal" }, icon(a)), h("div", { class: "grow" }, h("strong", { class: "aname" }, a.name), h("div", { class: "special" }, a.special || ""))),
      h("div", { class: "row meta" }, h("span", { class: "chip-s" }, a.class), arr(a.habitats).map((x) => h("span", { class: "chip-s" }, x)), h("span", { class: "chip-s" }, fmtMass(a.mass_kg)), h("span", { class: "chip-s" }, "size " + a.size)),
      h("div", { class: "row wrap tagrow" }, arr(a.tags).map((t) => h("span", { class: "pill tag-" + t }, t))),
      zone(a, a.arena_bonus || {}));
  }
  const bar = (total) => { const i = h("i"); const marks = total ? h("div", { class: "cmarks" }, [0.25, 0.5, 0.75].map((f) => h("span", { style: `left:${f * 100}%` }, `${Math.round(total * f)}s`))) : null; return { el: h("div", { class: "cwrap" }, h("div", { class: "cbar" }, i), marks), set(f) { i.style.width = Math.max(0, Math.min(1, f)) * 100 + "%"; i.className = f < 0.25 ? "low" : ""; } }; };
  const screen = (...k) => { const s = h("section", { class: "screen" }, ...k); root.append(s); return s; };

  screens.loading = () => { screen(h("p", { class: "muted center" }, "Loading room…")); return {}; };

  // ================= HOME =================
  screens.home = () => {
    const nameIn = h("input", { placeholder: "Your name", maxlength: 24, value: N.savedName(), autocomplete: "nickname" });
    const codeIn = h("input", { placeholder: "CODE", maxlength: 4, class: "code-in", autocapitalize: "characters" });
    const need = () => { const n = N.cleanName(nameIn.value); if (!n) { toast("Enter a name first"); throw new Error("no name"); } N.saveName(n); return n; };
    const go = (fn) => async () => { try { await fn(); } catch (e) { if (e.message !== "no name") toast(e.message); } };
    screen(hero(),
      h("div", { class: "card" }, h("label", {}, "Name"), nameIn, h("p", { class: "muted small" }, "The same name on another device takes over your seat.")),
      h("div", { class: "card" }, h("button", { class: "btn primary big", onclick: go(async () => { const n = need(); const code = await N.createRoom(n, JSON.parse(JSON.stringify(R.DEFAULT_SETTINGS))); await enter(code, "player", n); }) }, "Create room")),
      h("div", { class: "card" }, h("label", {}, "Room code"), codeIn, h("div", { class: "row" },
        h("button", { class: "btn primary big", onclick: go(async () => { const n = need(), c = N.normCode(codeIn.value); if (c.length !== 4) throw new Error("Enter the 4-letter code"); await enter(c, "player", n); }) }, "Join"),
        h("button", { class: "btn big", onclick: go(async () => { const n = need(), c = N.normCode(codeIn.value); if (c.length !== 4) throw new Error("Enter the 4-letter code"); await enter(c, "spectator", n); }) }, "Spectate"))),
      h("button", { class: "btn", onclick: () => { S.view = "leaderboard"; schedule(); } }, "Leaderboard"));
    return { update() { } };
  };

  // ================= LEADERBOARD =================
  screens.leaderboard = () => {
    const body = h("div", {}), res = h("div", {}), look = h("input", { placeholder: "Look up a name" });
    const row = (s, i) => h("tr", {}, h("td", {}, i == null ? "" : i + 1), h("td", {}, s.name || s.key), h("td", {}, s.tournaments_won || 0), h("td", {}, s.fights_won || 0), h("td", {}, s.fights_lost || 0), h("td", {}, s.fights_drawn || 0), h("td", {}, s.games_played || 0), h("td", {}, s.animals_drafted || 0));
    const table = (rows, ranked) => h("div", { class: "scroll" }, h("table", { class: "tbl" }, h("thead", {}, h("tr", {}, ["#", "Player", "Titles", "W", "L", "D", "Games", "Drafted"].map((x) => h("th", {}, x)))), h("tbody", {}, rows.map((s, i) => row(s, ranked ? i : null)))));
    screen(h("h1", {}, "Leaderboard"), h("button", { class: "btn small", onclick: () => { S.view = "home"; schedule(); } }, "Back"),
      h("div", { class: "card" }, h("div", { class: "row" }, look, h("button", {
        class: "btn", onclick: async () => {
          try { const s = await N.lookupStats(look.value); res.replaceChildren(s ? table([s], false) : h("p", { class: "muted" }, "No stats for that name.")); } catch (e) { toast(e.message); }
        }
      }, "Find")), res), body);
    body.append(h("p", { class: "muted" }, "Loading…"));
    N.topStats().then((rows) => body.replaceChildren(rows.length ? table(rows, true) : h("p", { class: "muted" }, "No games recorded yet."))).catch((e) => body.replaceChildren(h("p", { class: "muted" }, "Could not load: " + e.message)));
    return { update() { } };
  };

  // ================= LOBBY =================
  const v2m = (v) => R.MASS_SLIDER_MIN * Math.pow(R.MASS_SLIDER_MAX / R.MASS_SLIDER_MIN, v / 1000);
  const m2v = (m) => Math.round((1000 * Math.log(m / R.MASS_SLIDER_MIN)) / Math.log(R.MASS_SLIDER_MAX / R.MASS_SLIDER_MIN));
  screens.lobby = () => {
    let L = settings(), pending = null, search = "";
    const push = () => { clearTimeout(pending); pending = setTimeout(async () => { pending = null; try { await N.put(S.code, "meta/settings", L); } catch (e) { toast(e.message); } }, 250); };
    const edit = (fn) => { if (!isHost()) return; fn(L); push(); refresh(); };
    const num = (key, min, max) => h("input", { type: "number", min, max, onchange: (e) => edit((s) => { s[key] = Math.max(min, Math.min(max, Math.floor(+e.target.value) || min)); }) });
    const inBal = num("startBalance", 10, 100000), inRos = num("rosterSize", R.ROSTER_MIN, R.ROSTER_MAX), inSec = num("auctionSeconds", 5, 120);
    const cbVote = h("input", { type: "checkbox", onchange: (e) => edit((s) => { s.spectatorVoting = e.target.checked; }) });
    const selJudge = h("select", { onchange: (e) => edit((s) => { s.judgeMode = e.target.value; }) }, ["auto", "vote", "ai"].map((x) => h("option", { value: x }, x)));
    const selOut = h("select", { onchange: (e) => edit((s) => { s.appealOutcome = e.target.value; }) }, ["rematch", "flip"].map((x) => h("option", { value: x }, x)));
    const chips = (list, key) => h("div", { class: "row wrap" }, list.map((x) => h("button", { type: "button", class: "chip", "aria-pressed": "false", "data-v": x, onclick: () => edit((s) => { const a = new Set(s.filters[key]); a.has(x) ? a.delete(x) : a.add(x); s.filters[key] = [...a]; }) }, x)));
    const habChips = chips(R.HABITATS, "habitats"), clsChips = chips(R.CLASSES, "classes");
    const massLabel = h("div", { class: "muted small" });
    const dFill = h("div", { class: "dfill" });
    const dtick = (m) => h("span", { class: "dtick", style: `left:${m2v(m) / 10}%` }, m >= 1000 ? m / 1000 + " t" : m + " kg");
    const rMin = h("input", { type: "range", min: 0, max: 1000, "aria-label": "Minimum mass", oninput: (e) => edit((s) => { s.filters.massMin = Math.min(v2m(+e.target.value), s.filters.massMax); }) });
    const rMax = h("input", { type: "range", min: 0, max: 1000, "aria-label": "Maximum mass", oninput: (e) => edit((s) => { s.filters.massMax = Math.max(v2m(+e.target.value), s.filters.massMin); }) });
    const dualBox = h("div", { class: "dual" }, h("div", { class: "dtrack" }, dFill), rMin, rMax, h("div", { class: "dticks" }, [0.01, 1, 100, 10000].map(dtick)));
    const exList = h("div", { class: "exlist" }), exCount = h("span", { class: "muted small" });
    const searchIn = h("input", { placeholder: "Search animals to exclude", oninput: (e) => { search = e.target.value.toLowerCase(); drawEx(); } });
    function drawEx() {
      const ex = new Set(L.filters.excluded), items = ANIMALS.filter((a) => !search || a.name.toLowerCase().includes(search) || a.id.includes(search)).slice(0, 150);
      exList.replaceChildren(...items.map((a) => h("label", { class: "exrow" }, h("input", { type: "checkbox", checked: ex.has(a.id), onchange: (e) => edit((s) => { const set = new Set(s.filters.excluded); e.target.checked ? set.add(a.id) : set.delete(a.id); s.filters.excluded = [...set]; }) }), ` ${a.name}`)));
      exCount.textContent = `${ex.size} excluded`;
    }
    const poolInfo = h("div", { class: "poolinfo" }), startBtn = h("button", { class: "btn primary big", onclick: async () => { try { await runner.startGame(); } catch (e) { toast(e.message); } } }, "Start game");
    const plist = h("div", {}), specInfo = h("p", { class: "muted small" });
    function refresh() {
      const host = isHost(), f = L.filters;
      for (const [el, v] of [[inBal, L.startBalance], [inRos, L.rosterSize], [inSec, L.auctionSeconds]]) { if (document.activeElement !== el) el.value = v; el.disabled = !host; }
      cbVote.checked = !!L.spectatorVoting; cbVote.disabled = !host; selJudge.value = L.judgeMode; selOut.value = L.appealOutcome; selJudge.disabled = selOut.disabled = !host;
      habChips.querySelectorAll(".chip").forEach((c) => { const on = f.habitats.includes(c.dataset.v); c.classList.toggle("on", on); c.setAttribute("aria-pressed", String(on)); });
      clsChips.querySelectorAll(".chip").forEach((c) => { const on = f.classes.includes(c.dataset.v); c.classList.toggle("on", on); c.setAttribute("aria-pressed", String(on)); });
      const lo = m2v(f.massMin), hi = m2v(f.massMax);
      rMin.value = lo; rMax.value = hi; rMin.disabled = rMax.disabled = !host;
      dFill.style.left = lo / 10 + "%"; dFill.style.right = (100 - hi / 10) + "%";
      rMin.style.zIndex = lo > 500 ? 4 : 2; rMax.style.zIndex = 3;
      massLabel.textContent = `Mass range: ${fmtMass(f.massMin)} to ${fmtMass(f.massMax)}`;
      exCount.textContent = `${f.excluded.length} excluded`;
      const n = H.filterPool(ANIMALS, f).length, np = Object.keys(S.players || {}).length, need = H.minPool(Math.max(np, 2), L.rosterSize), ok = n >= need;
      poolInfo.className = "poolinfo " + (ok ? "ok" : "bad"); poolInfo.textContent = `Pool: ${n} animals (need at least ${need} for ${Math.max(np, 2)} players × ${L.rosterSize} + ${R.POOL_MARGIN})`;
      startBtn.hidden = !host; startBtn.disabled = !(host && runner && ok && np >= 2);
    }
    screen(h("div", { class: "card center" }, h("div", { class: "muted" }, "Room code"), h("div", { class: "bigcode" }, S.code), h("div", { class: "muted small" }, "Friends join with this code (max 6 players, 10 connections).")),
      h("div", { class: "card" }, h("h3", {}, "Players"), plist, specInfo),
      h("div", { class: "card" }, h("h3", {}, "Settings"),
        h("div", { class: "grid2" }, h("label", {}, "Starting balance ($)", inBal), h("label", {}, "Roster size (3-8)", inRos), h("label", {}, "Auction seconds", inSec)),
        h("label", { class: "row" }, cbVote, " Spectators can vote on appeals"),
        h("div", { class: "grid2" }, h("label", {}, "Judge mode", selJudge), h("label", {}, "If appeal upheld", selOut))),
      h("div", { class: "card" }, h("h3", {}, "Animal pool"), h("label", {}, "Habitat"), habChips, h("label", {}, "Class"), clsChips,
        h("label", {}, "Mass"), dualBox, massLabel, h("label", {}, "Exclude animals ", exCount), searchIn, exList, poolInfo),
      startBtn, h("p", { class: "muted center small" }, "Waiting for the host to start…"));
    drawEx(); refresh();
    return {
      update() {
        if (!pending) { const fresh = settings(); if (JSON.stringify(fresh) !== JSON.stringify(L)) { L = fresh; drawEx(); } }
        refresh();
        plist.replaceChildren(...playersSorted().map((p) => h("div", { class: "row between" }, h("span", {}, h("span", { class: "dot " + (p.online ? "on" : "") }), ` ${p.name}`, S.host && S.host.key === p.key ? h("span", { class: "pill host" }, "host") : null),
          isHost() && !p.online ? h("button", { class: "btn small", onclick: () => N.del(S.code, `players/${p.key}`) }, "Remove") : null)));
        specInfo.textContent = `${Object.keys(S.spectators || {}).length} spectator(s) watching`;
      }
    };
  };

  // ================= DRAFT =================
  screens.draft = () => {
    let barMax = 1000, lastId = null, bidTouched = false;
    const cd = bar(settings().auctionSeconds), cdText = h("div", { class: "cdnum" }), msg = h("div", { class: "center muted lotmsg" }), cardBox = h("div", { class: "d-card" }), topInfo = h("div", { class: "d-top" }), bigBid = h("div", { class: "bigbid" });
    const bidIn = h("input", { type: "number", min: 1, step: 1, oninput: () => { bidTouched = true; } });
    const quick = (label, fn) => h("button", { class: "btn small", onclick: () => { bidTouched = true; bidIn.value = Math.max(+bidIn.min, Math.min(+bidIn.max || 1e9, fn())); } }, label);
    const A0 = () => S.auction, topAmt = () => (A0() && A0().top ? A0().top.amt : 0);
    const bidBtn = h("button", { class: "btn primary", onclick: async () => { const ok = await N.bid(S.code, S.key, +bidIn.value); if (!ok) toast("Bid rejected (too low, over your balance, outbid, or time is up)."); else bidTouched = false; } }, "Bid");
    const doSkip = async () => { const ok = await N.skip(S.code, S.key); if (!ok) toast("You cannot skip right now."); };
    const skipBtn = h("button", { class: "btn", onclick: doSkip }, "Skip");
    const claimBtn = h("button", { class: "btn primary", onclick: async () => { const ok = await N.claimFree(S.code, S.key); if (!ok) toast("Too late to claim."); } }, "Claim free");
    const bidBox = h("div", { class: "card bidbox" }, h("div", { class: "quickrow" }, quick("+1", () => topAmt() + 1), quick("+5", () => topAmt() + 5), quick("+10", () => topAmt() + 10), quick("Max", () => +bidIn.max)), h("div", { class: "bidrow" }, bidIn, bidBtn, skipBtn));
    const claimBox = h("div", { class: "card claimbox" }, h("p", { class: "small" }, "You are the last one left: claim it free, or skip."), h("div", { class: "row" }, claimBtn, h("button", { class: "btn", onclick: doSkip }, "Skip")));
    const idleBox = h("div", { class: "idlebox" }, "Your bid controls appear here");
    const slot = h("div", { class: "actionslot" }, bidBox, claimBox, idleBox); // fixed-height slot: bid box, claim box or idle box swap inside it
    const tbl = h("div", { class: "card d-tbl" }), logBox = h("div", { class: "card d-log" }), rosters = h("div", { class: "card d-ros" });
    // The dock holds everything you need to bid (price, timer, buttons). On phones it sticks to the bottom of the screen so the animal and the buttons are visible together.
    const dock = h("div", { class: "card lotcard dock d-dock" }, h("div", { class: "dockrow" }, bigBid, cdText), cd.el, msg, slot);
    screen(topInfo, cardBox, dock, tbl, logBox, rosters).classList.add("draftgrid");
    return {
      tick() {
        const A = A0(); if (!A || A.resolved) return;
        const t = N.now(), dl = A.status === "claim" && A.claim ? A.claim.deadline : A.deadline, rem = dl - t;
        if (rem > barMax) barMax = rem; cd.set(rem / barMax); cdText.textContent = secs(rem) + "s";
      },
      update() {
        const L = S.ledger || {}, G = S.game || {}, st = settings(), A = S.auction, me = S.key, bal = L.balances || {}, ros = L.rosters || {};
        const active = A && !A.resolved && A.id === (L.drawIndex || 0), a = A && ANIMAL_MAP.get(A.animalId);
        if (A && A.id !== lastId) { lastId = A.id; barMax = Math.max(1000, A.deadline - N.now()); bidTouched = false; }
        topInfo.replaceChildren(h("div", { class: "lotbar" }, h("span", { class: "lotno" }, `Lot ${Math.min((L.drawIndex || 0) + 1, arr(G.pool).length)} of ${arr(G.pool).length}`), L.stall ? h("span", { class: "pill" }, `${L.stall} of ${R.STALL_LIMIT} unsold in a row`) : null),
          S.role === "player" ? h("div", { class: "purse" }, h("b", {}, `$${bal[me] ?? 0}`), h("span", { class: "muted" }, `left, roster ${arr(ros[me]).length} of ${st.rosterSize}`)) : h("div", { class: "pill" }, "spectating"));
        cardBox.replaceChildren(active && a ? animalCard(a) : animalCard(null, false, A && A.resolved && A.outcome ? "Resolved…" : "Next animal…"));
        const isPart = !!(A && A.participants && A.participants[me]), elig = !!(A && A.eligible && A.eligible[me]), skipped = !!(A && A.skips && A.skips[me]), top = A && A.top;
        const iTop = top && top.key === me, isPlayer = S.role === "player";
        const inClaim = !!(active && A.status === "claim" && A.claim && A.claim.key === me && !A.claim.taken && !A.claim.declined);
        let m = "";
        if (!active) m = L.last ? L.last.text : "";
        else if (A.status === "claim") m = A.claim && A.claim.key === me ? "You are the last one left: claim it free or skip." : `${nameOf(A.claim && A.claim.key)} may claim it for free…`;
        else if (!isPlayer) m = top ? `Top bid: $${top.amt} by ${nameOf(top.key)}` : "No bids yet";
        else if (!isPart) m = "Your roster is full. Sit this one out.";
        else if (skipped) m = "You skipped this animal.";
        else if (!elig) m = "You are broke: you can only Skip or Claim.";
        else if (iTop) m = `You are the top bidder at $${top.amt}.`;
        else m = top ? `Top bid: $${top.amt} by ${nameOf(top.key)}` : "No bids yet. Open the bidding!";
        msg.textContent = m;
        bigBid.replaceChildren(...(active && A.status === "bidding" ? [top ? h("span", { class: "amt" }, `$${top.amt}`) : h("span", { class: "amt none" }, "No bids yet"), top ? h("span", { class: "who" }, nameOf(top.key) + (iTop ? " (you)" : "")) : null].filter(Boolean) : []));
        const canBid = isPlayer && active && A.status === "bidding" && elig && !skipped, minBid = topAmt() + R.MIN_BID, limit = (A && A.limits && A.limits[me]) || 0;
        bidBox.hidden = !(isPlayer && active && A.status === "bidding" && isPart);
        claimBox.hidden = !inClaim;
        idleBox.hidden = !(isPlayer && bidBox.hidden && claimBox.hidden); slot.classList.toggle("on", isPlayer);
        bidIn.min = minBid; bidIn.max = limit; if (!bidTouched || +bidIn.value < minBid) bidIn.value = Math.min(minBid, Math.max(limit, 1));
        bidBtn.disabled = !canBid || minBid > limit; skipBtn.disabled = !(isPlayer && active && A.status === "bidding" && isPart && !skipped && !iTop); bidIn.disabled = !canBid;
        tbl.replaceChildren(h("h3", {}, "Players"), ...(G.keys ? arr(G.keys) : []).map((k) => {
          const tags = []; if (A && active) { if (A.top && A.top.key === k) tags.push("top"); if (A.skips && A.skips[k]) tags.push("skipped"); if (A.participants && !A.participants[k]) tags.push("full"); if (A.participants && A.participants[k] && !(A.eligible && A.eligible[k])) tags.push("broke"); }
          if (S.players && S.players[k] && !S.players[k].online) tags.push("offline");
          return h("div", { class: "row between" }, h("span", {}, nameOf(k), k === me ? h("span", { class: "pill you" }, "you") : null), h("span", { class: "muted" }, `$${bal[k] ?? 0} with ${arr(ros[k]).length}/${st.rosterSize} animals `, tags.map((t) => h("span", { class: "pill " + t }, t))));
        }));
        const entries = Object.entries(L.log || {}).sort((x, y) => +y[0] - +x[0]).slice(0, 8);
        logBox.replaceChildren(h("h3", {}, "Draft log"), ...entries.map(([, t]) => h("div", { class: "logline" + (t.startsWith("STALL") ? " stall" : "") }, t)));
        rosters.replaceChildren(h("h3", {}, "Rosters"), ...(G.keys ? arr(G.keys) : []).map((k) => h("details", { open: k === me }, h("summary", {}, `${nameOf(k)} (${arr(ros[k]).length})`),
          ...arr(ros[k]).map((x) => { const an = ANIMAL_MAP.get(x.id); return h("div", { class: "row between small" }, h("span", {}, an ? an.name : x.id), h("span", { class: "muted" }, x.price ? `$${x.price}` : "free")); }))));
      }
    };
  };

  // ================= LINEUP =================
  screens.lineup = () => {
    let order = null, dirty = false;
    let dragging = false;
    const rowsBox = h("div", { class: "rows" });
    const cd = bar(R.LINEUP_MS / 1000), cdText = h("div", { class: "center" }), list = h("div", { class: "card" }, rowsBox), status = h("div", { class: "card" });
    const save = (done) => { dirty = false; return N.put(S.code, `lineups/${S.key}`, { order, done }).catch((e) => toast(e.message)); };
    const readyBtn = h("button", { class: "btn primary big", onclick: () => save(true) }, "Ready");
    screen(h("h2", {}, "Set your lineup"), h("p", { class: "muted" }, "Drag the handle to reorder. Positions 1-2 are the front line (hit most often). The rest fight from the back."), h("div", { class: "card" }, cd.el, cdText), list, readyBtn, status);
    const draftOrder = () => arr(((S.ledger || {}).rosters || {})[S.key]).map((x) => x.id);
    const draw = () => drawRows();
    // keyboard fallback: focus a handle and press Arrow Up / Arrow Down
    function gripKey(e, i) {
      const d = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0, j = i + d; if (!d) return;
      e.preventDefault(); if (j < 0 || j >= order.length) return;
      [order[i], order[j]] = [order[j], order[i]]; dirty = true; draw(); save(false);
      const g = rowsBox.children[j] && rowsBox.children[j].querySelector(".grip"); if (g) g.focus();
    }
    // pointer drag (mouse, touch, pen): the grabbed row follows the pointer, the rows it passes slide out of the way
    function startDrag(e, i) {
      if (e.button != null && e.button !== 0) return;
      e.preventDefault();
      const grip = e.currentTarget, rows = [...rowsBox.children], row = rows[i], n = rows.length;
      const step = n > 1 ? rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().top : row.getBoundingClientRect().height + 6;
      const y0 = e.clientY; let target = i;
      dragging = true; row.classList.add("dragging"); rows.forEach((r) => { if (r !== row) r.classList.add("shifting"); });
      try { grip.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      const move = (ev) => {
        const dy = Math.max(-i * step, Math.min((n - 1 - i) * step, ev.clientY - y0));
        row.style.transform = `translateY(${dy}px)`;
        target = Math.max(0, Math.min(n - 1, Math.round(i + dy / step)));
        rows.forEach((r, j) => { if (r === row) return; const sh = i < target && j > i && j <= target ? -step : i > target && j >= target && j < i ? step : 0; r.style.transform = sh ? `translateY(${sh}px)` : ""; });
      };
      const end = (ev) => {
        grip.removeEventListener("pointermove", move); grip.removeEventListener("pointerup", end); grip.removeEventListener("pointercancel", end);
        try { grip.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        dragging = false;
        if (ev.type === "pointerup" && target !== i) { const [m] = order.splice(i, 1); order.splice(target, 0, m); dirty = true; save(false); }
        draw();
      };
      grip.addEventListener("pointermove", move); grip.addEventListener("pointerup", end); grip.addEventListener("pointercancel", end);
    }
    function drawRows() {
      rowsBox.replaceChildren(...order.map((id, i) => {
        const a = ANIMAL_MAP.get(id) || { name: id, emoji: "?" };
        const grip = h("button", { class: "grip", type: "button", "aria-label": `Move ${a.name}. Drag, or use the arrow keys.`, title: "Drag to reorder", onpointerdown: (e) => startDrag(e, i), onkeydown: (e) => gripKey(e, i) });
        return h("div", { class: "lrow" + (i < R.FRONT_SLOTS ? " front" : "") + (i === 0 ? " first" : "") + (i === R.FRONT_SLOTS ? " firstback" : "") },
          grip, h("span", { class: "pos" }, i + 1), icon(a), h("span", { class: "grow" }, a.name));
      }));
    }
    return {
      tick() { const G = S.game; if (!G || !G.lineupDeadline) return; const rem = G.lineupDeadline - N.now(); cd.set(rem / R.LINEUP_MS); cdText.textContent = secs(rem) + "s left"; },
      update() {
        const isP = S.role === "player", mine = draftOrder();
        readyBtn.hidden = !isP || !mine.length; list.hidden = !isP || !mine.length;
        if (!dragging && isP && mine.length && (!order || (!dirty && S.lineups && S.lineups[S.key] && JSON.stringify(arr(S.lineups[S.key].order)) !== JSON.stringify(order)))) {
          const sub = S.lineups && S.lineups[S.key] ? arr(S.lineups[S.key].order) : [];
          order = sub.length === mine.length && [...sub].sort().join() === [...mine].sort().join() ? sub : mine.slice(); draw();
        }
        if (isP && !mine.length) rowsBox.replaceChildren(h("p", { class: "muted" }, "You drafted no animals, so you sit out the tournament."));
        const ready = S.lineups || {}; status.replaceChildren(h("h3", {}, "Players"), ...arr(S.game && S.game.keys).map((k) => h("div", { class: "row between" }, nameOf(k), h("span", { class: "muted" }, ready[k] && ready[k].done ? "ready" : "arranging…"))));
        readyBtn.textContent = S.lineups && S.lineups[S.key] && S.lineups[S.key].done ? "Ready (tap to change)" : "Ready";
      }
    };
  };

  // ================= FIGHT / TOURNAMENT =================
  screens.fight = () => {
    const sims = {}, skipped = {}; let rend = null, loadedId = null, logIdx = 0, hlId = null, narrUnsub = null, narrFor = null, narr = null, panelSig = "", warned = {};
    const title = h("h2", {}), canvas = h("canvas", { class: "arena" });
    const ctl = h("div", { class: "row wrap stage-ctl" });
    const stage = h("div", {}, canvas, ctl), result = h("div", { class: "card center big result" }), nextBox = h("div", { class: "card" }), panel = h("div", {});
    const logBox = h("div", { class: "logbox" }), cards = h("div", {}), stand = h("div", { class: "card" });
    const sel = (b, f) => h("button", { class: "btn small", onclick: f }, b);
    const playBtn = sel("Pause", () => { if (!rend) return; playBtn.textContent = rend.toggle() ? "Pause" : "Play"; });
    const speedBtns = [1, 2, 4].map((n) => sel(n + "x", () => { if (rend) rend.setSpeed(n); speedBtns.forEach((b, k) => b.classList.toggle("on", [1, 2, 4][k] === n)); }));
    speedBtns[0].classList.add("on");
    ctl.append(playBtn, ...speedBtns, sel("Skip to result", () => { if (rend) { rend.skip(); const f = shownFight(); if (f) skipped[f.id] = true; schedule(); } }), sel("Replay", () => { if (rend) { rend.replay(); playBtn.textContent = "Pause"; } }));
    // Phones: one column in the old order. Wide screens: arena on the left, result / appeal / event log in a column beside it.
    const side = h("div", { class: "fg-side" }, result, nextBox, panel, h("div", { class: "card" }, h("h3", {}, "Event log"), logBox));
    const fsec = screen(title, stage, side, h("div", { class: "card fg-loss" }, h("h3", {}, "Why they lost"), cards), stand);
    fsec.classList.add("fightgrid"); title.classList.add("fg-title"); stage.classList.add("fg-stage"); stand.classList.add("fg-stand");

    const T = () => S.tour;
    function shownFight() {
      const t = T(); if (!t || !t.fights) return null;
      if (t.currentFight && t.fights[t.currentFight]) return t.fights[t.currentFight];
      const last = t.fights["f" + t.seq]; return last && last.status === "done" ? last : null;
    }
    function ensureSim(f) { return sims[f.id] || (sims[f.id] = simulate(arr(f.teamA), arr(f.teamB), f.arena, f.seed)); }
    const revealed = (f, sim) => !!f && (skipped[f.id] || f.status === "done" || N.now() >= f.startAt + R.revealDelay(sim.events.length));
    const hl = (id) => { hlId = id; const f = shownFight(); if (!f) return; renderEventLog(logBox, ensureSim(f).events, Math.max(logIdx, id), { onClick: hl, highlightId: id }); const li = logBox.querySelector(`li[data-id="${id}"]`); if (li) li.scrollIntoView({ block: "nearest" }); };
    function drawLog() { const f = shownFight(); if (!f) { logBox.replaceChildren(); return; } renderEventLog(logBox, ensureSim(f).events, logIdx, { onClick: hl, highlightId: hlId }); }
    function loadFight(f) {
      const sim = ensureSim(f); loadedId = f.id; logIdx = 0; hlId = null;
      if (!rend) rend = createRenderer(canvas, { onProgress: (i) => { logIdx = i; drawLog(); }, onEnd: () => schedule() });
      rend.load({ teamA: arr(f.teamA), teamB: arr(f.teamB), arena: f.arena, events: sim.events }, N.now() - f.startAt);
      if (S.role) { if (narrUnsub) narrUnsub(); narrFor = f.id; narr = null; narrUnsub = N.watch(S.code, `fights/${f.id}/narration`, (v) => { narr = v; schedule(); }); }
    }
    // ----- appeals UI (rebuilt only when its signature changes so typed text survives updates) -----
    function claimForm(label, onSubmit) {
      const msgIn = h("textarea", { maxlength: R.APPEAL_TEXT_MAX, rows: 4, placeholder: "Write your message here (one message only)" });
      return h("div", { class: "card" }, h("h3", {}, label), msgIn,
        h("button", { class: "btn primary", onclick: () => { const text = msgIn.value.trim().slice(0, R.APPEAL_TEXT_MAX); if (!text) return toast("Write a message first."); onSubmit([{ text }]); } }, "Submit"));
    }
    const claimList = (title, cl) => h("div", { class: "card" }, h("h3", {}, title), ...arr(cl).map((c) => h("div", {}, c.text + " ", c.eventId ? h("button", { class: "evid", onclick: () => hl(c.eventId) }, "#" + c.eventId) : null)));
    function buildPanel(f, a, sim) {
      const fid = f.id, me = S.key, winnerKey = f.final && f.final.winner === "A" ? f.a : f.b, loserKey = f.final && f.final.winner === "A" ? f.b : f.a;
      const parts = []; const cdEl = h("div", { class: "muted center", "data-cd": a ? (a.status === "open" || a.status === "rebuttal" || a.status === "voting" || a.status === "rematch" ? a.deadline : 0) : 0 });
      if (!a) return h("div", { class: "card" }, h("p", { class: "muted" }, `${nameOf(loserKey)} may appeal…`));
      if (a.status === "open") {
        if (me === a.by) parts.push(h("div", { class: "card" }, h("p", {}, "You lost. Appeal once per tournament, or accept the result."), h("button", { class: "btn", onclick: () => N.tx(S.code, `appeals/${fid}`, (c) => (c && c.status === "open" ? { ...c, status: "waived" } : undefined)) }, "No appeal")),
          claimForm("Appeal this result", (claims) => N.tx(S.code, `appeals/${fid}`, (c) => (c && c.status === "open" && c.by === me ? { ...c, status: "submitted", claims } : undefined))));
        else parts.push(h("p", { class: "muted center" }, `${nameOf(a.by)} is deciding whether to appeal…`));
      } else if (a.status === "submitted" || a.status === "rebuttal") {
        parts.push(claimList(`${nameOf(a.by)} appeals`, a.claims));
        if (a.status === "rebuttal" && me === winnerKey && !a.rebutDone) parts.push(claimForm("Your rebuttal (60 s)", (claims) => N.patch(S.code, `appeals/${fid}`, { rebuttal: claims, rebutDone: true })));
        else parts.push(h("p", { class: "muted center" }, a.status === "rebuttal" ? `${nameOf(winnerKey)} is writing a rebuttal…` : "Appeal received…"));
      } else if (a.status === "voting") {
        parts.push(claimList(`${nameOf(a.by)} appeals`, a.claims), a.rebuttal ? claimList(`${nameOf(winnerKey)} replies`, a.rebuttal) : null);
        const vid = voterId(), canVote = !!(a.voters && a.voters[vid]), mine = a.votes ? a.votes[vid] : undefined, cast = Object.keys(a.votes || {}).length, tot = Object.keys(a.voters || {}).length;
        parts.push(h("div", { class: "card" }, h("p", {}, canVote ? "Should the appeal be upheld?" : "Voting is open to others."), canVote ? h("div", { class: "row" },
          h("button", { class: "btn primary", disabled: mine !== undefined, onclick: () => N.put(S.code, `appeals/${fid}/votes/${vid}`, true) }, "Uphold"),
          h("button", { class: "btn", disabled: mine !== undefined, onclick: () => N.put(S.code, `appeals/${fid}/votes/${vid}`, false) }, "Reject")) : null, h("p", { class: "muted small" }, `${cast}/${tot} votes cast`)));
      } else if (a.status === "ai") parts.push(h("p", { class: "muted center" }, "The AI judge is deliberating…"));
      else if (a.status === "rematch") {
        parts.push(claimList(`${nameOf(a.by)} appeals`, a.claims), a.rebuttal ? claimList(`${nameOf(winnerKey)} replies`, a.rebuttal) : null);
        if (me === winnerKey) parts.push(h("div", { class: "card" }, h("p", {}, "No judge was available. Accept a rematch? (Declining or timing out keeps your win.)"), h("div", { class: "row" },
          h("button", { class: "btn primary", disabled: !!a.response, onclick: () => N.put(S.code, `appeals/${fid}/response`, "accept") }, "Accept rematch"), h("button", { class: "btn", disabled: !!a.response, onclick: () => N.put(S.code, `appeals/${fid}/response`, "decline") }, "Decline"))));
        else parts.push(h("p", { class: "muted center" }, `${nameOf(winnerKey)} is deciding on a rematch offer…`));
      } else if (a.status === "resolved") parts.push(h("p", { class: "center" }, a.upheld ? `Appeal upheld (${a.via}). Outcome: ${a.outcome}.` : "Appeal rejected. The result stands."));
      else if (a.status === "waived") parts.push(h("p", { class: "muted center" }, "No appeal."));
      return h("div", {}, h("h3", {}, "Appeal"), cdEl, ...parts);
    }
    return {
      destroy() { if (rend) rend.destroy(); if (narrUnsub) narrUnsub(); },
      tick() {
        const el = panel.querySelector("[data-cd]"); if (el && +el.dataset.cd) el.textContent = secs(+el.dataset.cd - N.now()) + "s left";
        const t = T(); if (t && t.state === "awaitNext") { const c = nextBox.querySelector("[data-next]"); if (c) c.textContent = secs((t.nextAt || 0) - N.now()) + "s"; }
        const f = shownFight(); if (f && !result.dataset.done && revealed(f, ensureSim(f))) schedule();
      },
      update() {
        const t = T(); if (!t) return;
        const f = shownFight(), host = isHost();
        const tk = t.currentFight && f ? f.id + "|" + f.label : "";
        if (title.dataset.k !== tk) { title.dataset.k = tk; if (tk) title.replaceChildren(h("span", { class: "vs-label" }, f.label), h("span", { class: "vs" }, h("span", { class: "sa" }, nameOf(f.a)), h("span", { class: "x" }, "vs"), h("span", { class: "sb" }, nameOf(f.b)))); else title.textContent = "Tournament"; }
        stage.hidden = !f;
        if (f && (loadedId !== f.id)) { loadFight(f); }
        if (f && f.result && !warned[f.id]) { warned[f.id] = true; const r = ensureSim(f); const dg = `${r.winner}:${r.events.length}:${r.events[r.events.length - 1].id}:${r.survivors.A}-${r.survivors.B}`; if (dg !== f.result.digest) console.warn("[sim] local result differs from host result", dg, f.result.digest); }
        // result
        const sim = f ? ensureSim(f) : null, rev = f && revealed(f, sim);
        result.hidden = !rev; result.dataset.done = rev ? "1" : "";
        if (rev) {
          const w = f.final ? f.final.winner : f.result ? f.result.winner : sim.winner, surv = f.final ? f.final.survivors : sim.survivors;
          result.replaceChildren(h("div", { class: "verdict " + (w === "draw" ? "draw" : w === "A" ? "sa" : "sb") }, w === "draw" ? "Draw" : `${nameOf(w === "A" ? f.a : f.b)} wins`), h("div", { class: "muted small" }, `Survivors: ${nameOf(f.a)} ${surv.A}, ${nameOf(f.b)} ${surv.B}.${f.flipped ? " Flipped on appeal." : ""}${f.replayed ? " Replaced by a rematch." : ""}`));
          renderLossCards(cards, sim.autopsy, narr, { onClick: hl });
        } else { cards.replaceChildren(h("p", { class: "muted" }, f ? "Revealed when the fight ends." : "")); }
        // next fight box
        nextBox.hidden = t.state !== "awaitNext";
        if (t.state === "awaitNext") {
          const nx = H.advance(t), m = nx.pick ? nx.tour.rounds[nx.pick.ri][nx.pick.mi] : null, byes = arr(nx.tour.rounds[nx.tour.round]).filter((x) => x.bye).map((x) => nameOf(x.a));
          nextBox.replaceChildren(...[h("h3", {}, m ? `Up next: ${nx.tour.labels[nx.pick.ri] || "Fight"}` : "Tournament complete"),
          m ? h("div", { class: "big center" }, `${nameOf(m.a)} vs ${nameOf(m.b)}`) : h("p", {}, "Calculating final results…"),
          byes.length ? h("p", { class: "muted small" }, `Bye (counts as a win): ${byes.join(", ")}`) : null,
          m ? h("div", { class: "center" }, host ? h("button", { class: "btn primary big", onclick: () => runner && runner.nextFight() }, "Next fight") : h("span", { class: "muted" }, "Waiting for the host…"), h("div", { class: "muted small" }, "auto in ", h("span", { "data-next": 1 }, secs((t.nextAt || 0) - N.now()) + "s"))) : null].filter(Boolean));
        }
        // appeal panel
        if (t.state === "appeal" && f && f.final && rev) {
          const a = (S.appeals || {})[f.id], sig = [f.id, a && a.status, a && a.response, a && a.rebutDone, a && a.votes && a.votes[voterId()], S.role, a && a.votes ? Object.keys(a.votes).length : 0].join("|");
          if (sig !== panelSig) { panelSig = sig; panel.replaceChildren(buildPanel(f, a, sim)); }
        } else if (panelSig) { panelSig = ""; panel.replaceChildren(); }
        // standings
        const st = H.computeStandings(arr(t.keys), t);
        stand.replaceChildren(h("h3", {}, `Standings (${t.format})`), h("div", { class: "scroll" }, h("table", { class: "tbl" }, h("thead", {}, h("tr", {}, ["#", "Player", "Pts", "Surv"].map((x) => h("th", {}, x)))),
          h("tbody", {}, st.order.map((k, i) => h("tr", {}, h("td", {}, i + 1), h("td", {}, nameOf(k)), h("td", {}, st.pts[k]), h("td", {}, st.surv[k])))))));
        const ctlHide = !f; ctl.hidden = ctlHide;
      }
    };
  };

  // ================= RESULTS =================
  const resCache = {};
  // One card per fight. The summary is always visible; the event log and loss cards are built the first time it opens.
  function fightLog(f) {
    const w = f.final ? f.final.winner : "?";
    const d = h("details", { class: "fightlog" },
      h("summary", {}, h("span", {}, `${f.label}: ${nameOf(f.a)} vs ${nameOf(f.b)}`),
        h("span", { class: "muted small" }, w === "draw" ? "Draw" : w === "?" ? "" : `${nameOf(w === "A" ? f.a : f.b)} won` + (f.flipped ? " (flipped)" : f.replayed ? " (rematch)" : ""))));
    const body = h("div", { class: "fightbody" });
    d.addEventListener("toggle", () => {
      if (!d.open || body.childElementCount) return;
      if (!f.teamA || !f.teamB) { body.append(h("p", { class: "muted small" }, "No log was saved for this fight.")); return; }
      const sim = resCache[f.id] || (resCache[f.id] = simulate(arr(f.teamA), arr(f.teamB), f.arena, f.seed));
      const logBox = h("div", { class: "logbox" }), cards = h("div", {});
      body.append(h("h3", {}, "Event log"), logBox, h("h3", {}, "Why they lost"), cards);
      renderEventLog(logBox, sim.events, sim.events.length);
      renderLossCards(cards, sim.autopsy, null, {});
    });
    d.append(body);
    return d;
  }
  screens.results = () => {
    const box = h("div", {}), fightsBox = h("div", { class: "card" }, h("h3", {}, "Fights"));
    screen(h("h1", {}, "Final results"), box, fightsBox, h("div", { class: "row" }, h("button", { class: "btn", onclick: () => { S.view = "leaderboard"; S.code && leave().then(() => { S.view = "leaderboard"; schedule(); }); } }, "Leaderboard"), h("button", { class: "btn primary", onclick: leave }, "Leave room")));
    return {
      update() {
        const t = S.tour; if (!t || !t.results) { box.replaceChildren(h("p", { class: "muted center" }, "Calculating…")); return; }
        const r = t.results, champs = arr(r.champion).map(nameOf);
        const fights = Object.values(t.fights || {}).filter((f) => !f.replayOf).sort((a, b) => a.startAt - b.startAt);
        for (const f of fights) if (!fightsBox.querySelector(`[data-fid="${f.id}"]`)) { const d = fightLog(f); d.dataset.fid = f.id; fightsBox.append(d); }
        box.replaceChildren(h("div", { class: "card champ" }, h("div", { class: "muted" }, champs.length > 1 ? "Champions" : "Champion"), h("div", { class: "champname" }, champs.length ? champs.join(" & ") : "No champion")),
          h("div", { class: "card scroll" }, h("table", { class: "tbl" }, h("thead", {}, h("tr", {}, ["#", "Player", "Pts", "Survivors"].map((x) => h("th", {}, x)))),
            h("tbody", {}, arr(r.order).map((k, i) => h("tr", {}, h("td", {}, i + 1), h("td", {}, nameOf(k)), h("td", {}, (r.pts || {})[k] ?? 0), h("td", {}, (r.surv || {})[k] ?? 0)))))));
      }
    };
  };

  // ================= CHAT =================
  const chatList = $("#chatlist"), chatIn = $("#chatin");
  function chatUpdate() {
    chatList.replaceChildren(...S.chat.map((m) => h("div", { class: "msg" }, h("b", {}, m.name), m.spec ? h("span", { class: "pill" }, "spectator") : null, ": " + m.text)));
    chatList.scrollTop = chatList.scrollHeight;
  }
  $("#chatform").addEventListener("submit", async (e) => {
    e.preventDefault(); if (!S.code) return;
    const ok = await N.sendChat(S.code, S.name, chatIn.value, S.role === "spectator").catch((err) => { toast(err.message); return false; });
    if (ok) chatIn.value = ""; else if (chatIn.value.trim()) toast("Slow down: 1 message per second.");
  });
  $("#chathead").addEventListener("click", () => $("#chat").classList.toggle("open"));

  // ----- boot (auto-rejoin after refresh) -----
  const saved = (() => { try { return JSON.parse(sessionStorage.getItem("adw_room")); } catch (e) { return null; } })();
  if (saved && saved.code) {
    booting = true; schedule();
    const giveUp = setTimeout(() => { booting = false; schedule(); }, 8000);
    enter(saved.code, saved.role, saved.name)
      .catch((e) => { sessionStorage.removeItem("adw_room"); toast(e.message); })
      .finally(() => { clearTimeout(giveUp); booting = false; schedule(); });
  } else schedule();
}
main();