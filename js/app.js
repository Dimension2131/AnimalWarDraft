import * as R from "./rules.js";
import { loadPackData } from "./animals.js";
import * as P from "./pack.js";
import * as M from "./modes.js";
import { tip, installTips } from "./tips.js";
import { simulate, validateAnimals, balanceTest } from "./sim.js";
import * as FBC from "../modes/football/card.js";
import { preload, failed, cardImage } from "./preload.js";

const $ = (s, r = document) => r.querySelector(s);
const arr = (v) => (Array.isArray(v) ? v : v ? Object.values(v) : []);
const icon = (a, eager) => {
  const em = () => h("span", { class: "emoji" }, a.emoji);
  let src = a.iconUrl || a.silhouette;   // iconUrl = small colour sprite (Pokémon); silhouette = ink-filtered shape (animals)
  if (src && failed.has(src)) src = a.iconAlt && !failed.has(a.iconAlt) ? a.iconAlt : null;   // known-missing: no request, no broken-image flash on re-render
  if (!src) return em();
  const first = src;
  // eager = the picture of the lot being auctioned: never lazy (a lazy <img> is only fetched after layout), and high priority.
  const attrs = { class: "sil" + (a.iconUrl ? " color" : ""), src, alt: a.name || "", decoding: "async", onerror: (e) => {
    failed.add(first);
    if (a.iconAlt && first !== a.iconAlt && !failed.has(a.iconAlt)) { e.target.src = a.iconAlt; } else e.target.replaceWith(em());
  } };
  if (eager) attrs.fetchpriority = "high"; else attrs.loading = "lazy";
  return h("img", attrs);
};
function hero(pack, list) {
  const want = new Set(pack.heroIds || []);
  const pool = list.filter((a) => a.silhouette && (!want.size || want.has(a.id))), picks = [], inks = ["blue", "pink", "teal"];
  while (pool.length && picks.length < 3) picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return h("div", { class: "hero" },
    h("div", { class: "hero-art", "aria-hidden": "true" }, picks.map((a, i) => h("img", { class: `hero-sil ink-${inks[i]} hs${i}`, src: a.silhouette, alt: "", onerror: (e) => e.target.remove() }))),
    h("h1", { class: "wordmark" }, pack.title.split(/\s+/).map((w) => h("span", { "data-t": w }, w))),
    h("p", { class: "tagline" }, pack.tagline));
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
const secs = (ms) => Math.max(0, Math.ceil(ms / 1000));
let toastT;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3500); }

// Home title glitch: scramble the words that change, with an RGB-split jitter. Skipped for reduced-motion users.
function glitchTo(wordmark, title) {
  const words = title.split(/\s+/), spans = [...wordmark.children];
  const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const set = (sp, t) => { sp.textContent = t; sp.setAttribute("data-t", t); };
  words.forEach((w, i) => { if (!spans[i]) wordmark.append(h("span", { "data-t": w }, w)); });
  while (wordmark.children.length > words.length) wordmark.lastChild.remove();
  const sp = [...wordmark.children], diff = words.map((w, i) => sp[i].textContent !== w);
  if (reduce || !diff.some(Boolean)) { sp.forEach((el, i) => set(el, words[i])); return; }
  const GL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&@$0123456789", frames = 16; let f = 0;
  wordmark.classList.add("glitching");
  const tick = setInterval(() => {
    f++;
    sp.forEach((el, i) => { if (!diff[i]) return; const w = words[i], keep = Math.floor((f / frames) * w.length); set(el, w.slice(0, keep) + Array.from({ length: w.length - keep }, () => GL[Math.floor(Math.random() * GL.length)]).join("")); });
    if (f >= frames) { clearInterval(tick); sp.forEach((el, i) => set(el, words[i])); setTimeout(() => wordmark.classList.remove("glitching"), 140); }
  }, 55);
}

async function pageValidate() {
  const { pack, list: ANIMALS } = await loadPackData(new URLSearchParams(location.search).get("pack"));
  const v = pack.engine ? ANIMALS.flatMap((e) => (pack.validate ? pack.validate(e) : []).map((x) => `${e.id}: ${x}`)) : validateAnimals(ANIMALS, pack);
  root.replaceChildren(h("section", { class: "screen" }, h("h1", {}, "Validate animals"),
    h("p", {}, `${ANIMALS.length} animals loaded, ${v.length} violation(s).`),
    v.length ? h("ul", { class: "viol" }, v.map((x) => h("li", {}, x))) : h("p", { class: "ok" }, "All animals are valid.")));
}
async function pageBalance() {
  const { pack, list: ANIMALS } = await loadPackData(new URLSearchParams(location.search).get("pack"));
  root.replaceChildren(h("section", { class: "screen" }, h("h1", {}, "Balance test"), h("p", {}, "Simulating 2000 random 5v5 fights...")));
  setTimeout(() => {
    const bt = balanceTest(ANIMALS, 2000, P.arenaIds(pack));
    root.replaceChildren(h("section", { class: "screen" }, h("h1", {}, "Balance test"),
      h("p", {}, `Fights: ${bt.fights} · draw rate ${(bt.drawRate * 100).toFixed(1)}% · cap draws ${bt.capDraws} · avg ticks ${bt.avgTicks.toFixed(1)} · max ${bt.maxTicks} · side A win ${(bt.aWinRate * 100).toFixed(1)}%`),
      h("div", { class: "scroll" }, h("table", { class: "tbl" },
        h("thead", {}, h("tr", {}, ["Animal", "Games", "Wins", "Draws", "Win rate", "Flag"].map((x) => h("th", {}, x)))),
        h("tbody", {}, bt.rows.map((r) => h("tr", { class: r.flag ? "flag" : "" },
          h("td", {}, r.name), h("td", {}, r.games), h("td", {}, r.wins), h("td", {}, r.draws), h("td", {}, (r.winRate * 100).toFixed(1) + "%"), h("td", {}, r.flag))))))));
  }, 30);
}

async function main() {
  const q = location.search;
  if (/[?&]validate\b/.test(q)) return pageValidate();
  if (/[?&]balance\b/.test(q)) return pageBalance();
  let N, H;
  try { N = await import("./net.js"); H = await import("./host.js"); }
  catch (e) { root.replaceChildren(h("section", { class: "screen" }, h("h1", {}, "Could not load Firebase"), h("p", {}, String(e)), h("p", { class: "muted" }, "Open this page through a web server (https or http://localhost), not file://, and check your connection."))); return; }

  installTips();
  const S = { code: null, role: null, key: null, name: "", connected: true, loaded: {}, chat: [], view: "home" };
  const DEFAULT = await loadPackData(); let PK = DEFAULT.pack, ENT = { list: DEFAULT.list, map: DEFAULT.map }, MD = (await M.getMode()), ctxKey = "", ctxLoading = "", MODES = await M.listModes(), PACKS = await P.listPacks();
  const modeScreens = {}; let homePack = PK.id;
  const want = () => (S.meta ? `${S.meta.pack || PACKS[0].id}|${S.meta.mode || MODES[0].id}` : "");
  async function ensureCtx() {
    const k = want(); if (!k || k === ctxKey || k === ctxLoading) return;
    ctxLoading = k;
    try {
      const [pk, md] = k.split("|");
      P.getPack(pk).then((p) => P.applyPack(p, { animate: true }));   // the world switches as soon as the room says which pack it uses, before the (bigger) data load
      const d = await loadPackData(pk);
      PK = d.pack; ENT = { list: d.list, map: d.map }; MD = await M.getMode(md); if (!M.supports(MD, PK)) MD = M.modesFor(MODES, PK)[0] || MD; P.applyPack(PK); ctxKey = k;
    } catch (e) { toast("Could not load this room's category or mode: " + e.message); }
    ctxLoading = ""; schedule();
  }
  const PATHS = ["meta", "players", "spectators", "ledger", "game", "auction", "lineups", "tour", "appeals", "host"];
  let unsubs = [], runner = null, current = null, currentName = "", raf = 0, booting = false;
  if (!sessionStorage.getItem("adw_room")) P.applyPack(PK);   // a reload inside a room keeps the world index.html already set; ensureCtx() confirms it
  const nameOf = (k) => (S.players && S.players[k] && S.players[k].name) || k;
  const isHost = () => !!(S.host && S.host.sid === N.sid);
  const settings = () => {
    const s = { ...R.DEFAULT_SETTINGS, ...(MD.defaultSettings || {}), ...((S.meta && S.meta.settings) || {}) };
    s.filters = P.normFilters(PK, (S.meta && S.meta.settings && S.meta.settings.filters) || P.defaultFilters(PK));
    return s;
  };
  const playersSorted = () => Object.entries(S.players || {}).sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0)).map(([k, p]) => ({ key: k, ...p }));
  const voterId = () => (S.role === "player" ? S.key : N.sid);

  function startWatching(code) {
    stopWatching();
    for (const p of PATHS) unsubs.push(N.watch(code, p, (v) => { S[p] = v; S.loaded[p] = true; schedule(); }));
    unsubs.push(N.watchChat(code, (c) => { S.chat = c; chatUpdate(); }));
  }
  function stopWatching() { unsubs.forEach((u) => { try { u(); } catch (e) { /* ignore */ } }); unsubs = []; S.loaded = {}; for (const p of PATHS) S[p] = undefined; }
  // ---- public lobby listing (host device only): list while phase=lobby, unlist the moment the game starts or the room is private ----
  let listedSig = "", listedCode = "", listTimer = 0;
  function unlistNow() { if (listedCode) { N.unlistRoom(listedCode); listedCode = ""; } listedSig = ""; if (listTimer) { clearInterval(listTimer); listTimer = 0; } }
  function syncListing(force) {
    const m = S.meta, want = !!(S.code && isHost() && m && m.visibility === "public" && m.phase === "lobby" && !m.started);
    if (!want) return unlistNow();   // game started / private / not host / left: remove the signpost (also if the heartbeat fires late)
    const entry = { host: S.name || nameOf(S.key), players: Object.keys(S.players || {}).length, pack: m.pack || "animals", mode: m.mode || "classic" };
    const sig = S.code + JSON.stringify(entry);
    if (force || sig !== listedSig) {
      listedSig = sig; listedCode = S.code;
      N.listRoom(S.code, entry).catch(() => { listedSig = ""; });
    }
    if (!listTimer) listTimer = setInterval(() => syncListing(true), 20000);   // heartbeat: readers ignore signposts older than N.PUBLIC_TTL_MS
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; route(); if (current && current.update) current.update(); topbar(); ensureRunner(); syncListing(); }); }

  async function enter(code, role, name) {
    const r = await N.joinRoom(code, name, role);
    Object.assign(S, { code, role: r.role, key: r.key, name: r.name, chat: [] });
    sessionStorage.setItem("adw_room", JSON.stringify({ code, role: r.role, name: r.name }));
    startWatching(code); $("#chat").hidden = false; schedule();
    if (r.role !== role) toast("The game is already running, so you joined as a spectator.");
  }
  async function leave() {
    unlistNow();
    if (runner) { runner.stop(); runner = null; }
    if (S.code) await N.leaveRoom(S.code, S.role, S.key);
    stopWatching(); sessionStorage.removeItem("adw_room"); ctxKey = "";
    P.getPack(homePack).then((p) => P.applyPack(p, { animate: true }));
    Object.assign(S, { code: null, role: null, key: null, view: "home" }); $("#chat").hidden = true; $("#banner").hidden = true; schedule();
  }

  function ensureRunner() {
    if (S.role !== "player" || !S.loaded.host || !S.meta || ctxKey !== want()) return;
    if (runner && runner.modeId !== MD.id) { runner.stop(); runner = null; }
    if (isHost() && !runner) { runner = H.startHost({ code: S.code, key: S.key, animals: ENT.list, pack: PK, mode: MD }); runner.modeId = MD.id; }
    else if (!isHost() && runner) { runner.stop(); runner = null; }
  }
  async function election() {
    if (S.role !== "player" || !S.loaded.host || !S.loaded.players || !S.meta || isHost()) return;
    if (H.shouldClaimHost({ players: S.players, host: S.host, myKey: S.key })) { try { await N.claimHost(S.code, S.key); } catch (e) { console.warn(e); } }
  }
  setInterval(election, 2500);

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
      tb.append(h("span", { class: "brand" }, PK.title), h("span", { class: "code" }, S.code), h("span", { class: "who" }, S.role === "spectator" ? "spectating" : S.name), ...(isHost() ? [h("span", { class: "pill host" }, "host")] : []),
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

  const screens = {};
  function mount(name, key = name, factory = screens[name]) {
    if (key === currentName) return;
    if (current && current.destroy) current.destroy();
    root.replaceChildren(); currentName = key; current = factory();
  }

  function modeScreen(phase) {
    if (!(MD.id in modeScreens)) modeScreens[MD.id] = MD.screens ? MD.screens(uiCtx) : {};
    return modeScreens[MD.id][phase] || screens[phase] || null;
  }
  function route() {
    if (booting && !S.code) return mount("loading");
    if (!S.code) return mount(S.view === "leaderboard" ? "leaderboard" : "home");
    if (!S.loaded.meta) return mount("loading");
    if (!S.meta) { toast("That room no longer exists."); leave(); return; }
    if (ctxKey !== want()) { ensureCtx(); return mount("loading"); }
    const f = MD.phases.includes(S.meta.phase) ? modeScreen(S.meta.phase) : null;
    if (f) mount(S.meta.phase, `${MD.id}:${S.meta.phase}`, f); else mount("loading");
  }
  setInterval(() => { if (current && current.tick) current.tick(); }, 250);

  const toughOf = (a) => (a && P.toughnessTable(ENT.list).get(a.id)) || (a ? { v: Math.round(R.toughnessOf(a)), pct: 50, rank: 0, of: 0 } : null);
  const toughTip = (t) => R.TOUGHNESS.description + (t && t.rank ? ` This one: ${t.v}, rank #${t.rank} of ${t.of}.` : "");
  const toughRow = (a) => { const t = toughOf(a); return h("div", { class: "stat s-toughness" }, tip(h("span", {}, R.TOUGHNESS.label), toughTip(t)), h("div", { class: "sbar" }, h("i", { style: `width:${t ? t.pct : 0}%` })), h("b", {}, t ? t.v : "?")); };
  const toughChip = (a) => { const t = toughOf(a); return h("span", { class: "sp s-toughness" }, tip(h("i", {}, R.TOUGHNESS.abbr), toughTip(t)), h("b", {}, t.v)); };
  const traitPill = (kind, a, hide) => {
    const d = a && a.traits && (kind === "up" ? R.TRAIT_UP : R.TRAIT_DOWN)[a.traits[kind]]; if (!d) return null;
    const word = kind === "up" ? "Strength" : "Weakness";
    return tip(h("span", { class: "pill trait trait-" + kind }, (kind === "up" ? "▲ " : "▼ ") + (hide ? "???" : d.name)),
      hide ? `${word}: hidden until this ${PK.nouns.singular} is bought.` : `${word}: ${d.name}. ${d.desc}${a.traits.why ? " Why: " + a.traits.why : ""}`);
  };
  const traitPills = (a, hide) => [traitPill("up", a, hide), traitPill("down", a, hide)].filter(Boolean);

  function pokemonCard(a, compact, note) {
    const stats = P.engineStats(PK), max = PK.statMax || 100, cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
    if (!a) return h("div", { class: "acard ph" }, h("div", { class: "plate-head" }, h("div", { class: "medal" }, h("span", { class: "qmark" }, "?")), h("div", { class: "grow" }, h("strong", { class: "aname" }, "???"), h("div", { class: "special" }, note || "Next Pokémon…"))));
    const art = h("img", { class: "pk-art", src: failed.has(a.image) && a.imageAlt ? a.imageAlt : a.image, alt: a.name, decoding: "async", fetchpriority: compact ? null : "high", loading: compact ? "lazy" : null, onerror: (e) => { failed.add(a.image); if (a.imageAlt && !e.target.dataset.fb) { e.target.dataset.fb = "1"; e.target.src = a.imageAlt; } else e.target.replaceWith(h("span", { class: "emoji" }, a.emoji)); } });
    return h("div", { class: "acard pk" },
      h("div", { class: "plate-head" }, h("div", { class: "pk-cplate" }, art), h("div", { class: "grow" }, h("strong", { class: "aname" }, a.name), h("div", { class: "special" }, a.special || ""),
        h("div", { class: "row wrap tagrow" }, a.types.map((t) => h("span", { class: "tpill type-" + t }, cap(t))), a.cls !== "Regular" ? h("span", { class: "pill" }, a.cls) : null))),
      h("div", { class: "row meta" }, (PK.cardChips ? PK.cardChips(a) : []).map((x) => h("span", { class: "chip-s" }, x))),
      compact ? null : h("div", { class: "stats" }, stats.map((st) => h("div", { class: "stat s-" + st.key }, tip(h("span", {}, st.label), st.description), h("div", { class: "sbar" }, h("i", { style: `width:${Math.min(100, (a[st.key] / max) * 100)}%` })), h("b", {}, a[st.key]))), h("div", { class: "stat s-bst" }, h("span", {}, "Total"), h("div", { class: "sbar" }, h("i", { style: `width:${Math.min(100, (a.bst / 720) * 100)}%` })), h("b", {}, a.bst))),
      compact ? null : h("div", { class: "pk-abil" }, h("span", { class: "muted small" }, "Abilities: "), a.abilities.map((x) => h("span", { class: "chip-s" }, cap(x.id.replace(/-/g, " ")) + (x.hidden ? " (hidden)" : ""))), h("span", { class: "chip-s" }, `${a.nmoves} moves`)));
  }
  function animalCard(a, compact, note, hideTraits) {
    if (PK.engine === "pokemon") return pokemonCard(a, compact, note);
    if (PK.engine === "football") return FBC.card({ h, tip, PK }, a, compact, note);
    const stats = P.engineStats(PK);
    const zone = (statVals, tileVals, ta) => compact ? null : h("div", { class: "statzone" },
      h("div", { class: "stats" }, stats.map((st) => { const s = st.key; return h("div", { class: "stat s-" + s }, tip(h("span", {}, st.label), st.description), h("div", { class: "sbar" }, h("i", { style: `width:${statVals ? statVals[s] : 0}%` })), h("b", {}, statVals ? statVals[s] : "?")); }), toughRow(ta)),
      h("div", { class: "arena-tiles" }, PK.arenas.map((arn) => { const ar = arn.id, v = tileVals ? (tileVals[ar] || 0) : null; return h("div", { class: "atile " + (v == null ? "zero" : v > 0 ? "good" : v < 0 ? "bad" : "zero") }, h("span", {}, arn.label), h("b", {}, v == null ? "?" : `${v > 0 ? "+" : ""}${v}`)); })));
    if (!a) return h("div", { class: "acard ph" },
      h("div", { class: "plate-head" }, h("div", { class: "medal" }, h("span", { class: "qmark" }, "?")), h("div", { class: "grow" }, h("strong", { class: "aname" }, "???"), h("div", { class: "special" }, note || `Next ${PK.nouns.singular}…`))),
      h("div", { class: "row meta" }, [1, 2, 3].map(() => h("span", { class: "chip-s" }, "?"))),
      h("div", { class: "row wrap tagrow" }),
      h("div", { class: "row wrap traitrow" }),
      zone(null, null, null));
    return h("div", { class: "acard" },
      h("div", { class: "plate-head" }, h("div", { class: "medal" }, icon(a, !compact)), h("div", { class: "grow" }, h("strong", { class: "aname" }, a.name), h("div", { class: "special" }, a.special || ""))),
      h("div", { class: "row meta" }, (PK.cardChips ? PK.cardChips(a) : []).map((x) => h("span", { class: "chip-s" }, x))),
      h("div", { class: "row wrap tagrow" }, arr(a.tags).map((t) => h("span", { class: "pill tag-" + t }, t))),
      h("div", { class: "row wrap traitrow" }, ...traitPills(a, hideTraits)),
      zone(a, a.arena_bonus || {}, a));
  }
  const bar = (total) => { const i = h("i"); const marks = total ? h("div", { class: "cmarks" }, [0.25, 0.5, 0.75].map((f) => h("span", { style: `left:${f * 100}%` }, `${Math.round(total * f)}s`))) : null; return { el: h("div", { class: "cwrap" }, h("div", { class: "cbar" }, i), marks), set(f) { i.style.width = Math.max(0, Math.min(1, f)) * 100 + "%"; i.className = f < 0.25 ? "low" : ""; } }; };
  const screen = (...k) => { const s = h("section", { class: "screen" }, ...k); root.append(s); return s; };
  const statStrip = (a) => PK.engine === "football" ? FBC.strip({ h, tip }, PK, a) : h("span", { class: "sstrip" }, ...P.engineStats(PK).map((st) => h("span", { class: "sp s-" + st.key }, tip(h("i", {}, st.abbr || st.label), st.description), h("b", {}, a[st.key]))), toughChip(a), ...traitPills(a, false));
  const uiCtx = {
    h, screen, arr, secs, toast, schedule, icon, bar, animalCard, statStrip, tip, S, N, R,
    nameOf, isHost, voterId, settings, leave: () => leave(),
    runner: () => runner,
    get pack() { return PK; }, get mode() { return MD; }, get entities() { return ENT; },
    arenaMeta: () => P.arenaMeta(PK),
    simulate: (A, B, arena, seed) => simulate(A, B, arena, seed, { arenaLabel: P.arenaOf(PK, arena).label })
  };

  screens.loading = () => { screen(h("p", { class: "muted center" }, "Loading room…")); return {}; };

  // ================= HOME =================
  screens.home = () => {
    const nameIn = h("input", { placeholder: "Your name", maxlength: 24, value: N.savedName(), autocomplete: "nickname" });
    const codeIn = h("input", { placeholder: "CODE", maxlength: 4, class: "code-in", autocapitalize: "characters" });
    const need = () => { const n = N.cleanName(nameIn.value); if (!n) { toast("Enter a name first"); throw new Error("no name"); } N.saveName(n); return n; };
    const go = (fn) => async () => { try { await fn(); } catch (e) { if (e.message !== "no name") toast(e.message); } };
    // public lobbies: the index is a signpost, every entry is re-verified against the real room (N.verifiedPublicRooms) before it is shown
    let alive = true, pubIdx = {}, pubUnsub = null, pubTimer = 0;
    const pubList = h("div", { class: "pub-list" }, h("p", { class: "muted small" }, "Looking for public lobbies…"));
    const pubCard = h("div", { class: "card" }, h("label", {}, "Public lobbies"), pubList);
    const renderPub = async () => {
      let rooms = []; try { rooms = await N.verifiedPublicRooms(pubIdx); } catch (e) { /* keep empty */ }
      if (!alive) return;
      pubList.replaceChildren(...(rooms.length ? rooms.map((r) => h("div", { class: "row between pub-row" },
        h("span", {}, h("b", {}, `${r.host}'s room`), h("span", { class: "muted small" }, `  ${r.code} · ${r.players}/${R.MAX_PLAYERS} players${PACKS.length > 1 ? " · " + ((PACKS.find((p) => p.id === r.pack) || {}).name || r.pack) : ""}`)),
        r.players >= R.MAX_PLAYERS ? h("span", { class: "muted small" }, "Full") : h("button", { class: "btn primary", onclick: go(async () => { await enter(r.code, "player", need()); }) }, "Join"))) : [h("p", { class: "muted small" }, "No public lobbies right now. Create one, or join a private room with its code.")]));
    };
    if (N.configured) { pubUnsub = N.watchPublicRooms((idx) => { pubIdx = idx; renderPub(); }); pubTimer = setInterval(renderPub, 15000); }
    let heroEl = hero(PK, ENT.list);
    const visSel = h("select", { title: "Private rooms need the code. Public rooms are listed on this page while they are still in the lobby." }, h("option", { value: "private" }, "Private (code only)"), h("option", { value: "public" }, "Public (listed)"));
    const modeSel = h("select", { onchange: () => drawOpts() }), optBox = h("div", { class: "create-opts" }), optSel = {};
    const modeList = () => M.modesFor(MODES, PK);
    const drawModes = () => { modeSel.replaceChildren(...modeList().map((m) => h("option", { value: m.id }, M.titleOf(m, PK)))); drawOpts(); };
    function drawOpts() {   // per-mode options chosen when the room is created (Pokémon war: auto or manual battles)
      const md = modeList().find((m) => m.id === modeSel.value) || modeList()[0]; optBox.replaceChildren(); for (const k of Object.keys(optSel)) delete optSel[k];
      for (const o of (md && md.createOptions) || []) { const sel = h("select", {}, o.options.map((x) => h("option", { value: x.v, selected: x.v === o.default }, x.l))); optSel[o.id] = sel; optBox.append(h("label", {}, o.label, sel)); }
      modeInfo.textContent = (md && md.description) || (PK.placeholder ? "Coming soon: this category has its look, but no playable mode yet." : "");
    }
    const modeInfo = h("p", { class: "muted small" });
    const tabs = h("div", { class: "vsel", role: "tablist", "aria-label": "Game version" }, PACKS.map((p) => h("button", { type: "button", role: "tab", class: "vtab" + (p.id === homePack ? " on" : ""), "data-pack": p.id, "aria-selected": String(p.id === homePack),
      onclick: async (ev) => {
        const tabEl = ev && ev.currentTarget;
        if (p.id === homePack) return; homePack = p.id;
        tabs.querySelectorAll(".vtab").forEach((t) => { const on = t.dataset.pack === p.id; t.classList.toggle("on", on); t.setAttribute("aria-selected", String(on)); });
        const d = await loadPackData(homePack); document.body.classList.add("flash"); setTimeout(() => document.body.classList.remove("flash"), 450);
        PK = d.pack; ENT = { list: d.list, map: d.map };
        const r = tabEl && tabEl.getBoundingClientRect ? tabEl.getBoundingClientRect() : null;
        P.applyPack(d.pack, { animate: true, origin: r && { x: r.left + r.width / 2, y: r.top + r.height / 2 }, update: () => {   // runs inside the cross-fade, together with the glitch
          glitchTo(heroEl.querySelector(".wordmark"), d.pack.title);
          const n = hero(d.pack, d.list); heroEl.querySelector(".hero-art").replaceWith(n.querySelector(".hero-art")); heroEl.querySelector(".tagline").textContent = d.pack.tagline; drawModes();
        } });
      } }, h("span", { class: "vicon" }, p.icon || "🎮"), h("b", {}, p.name), h("small", {}, p.blurb || ""))));
    drawModes();
    screen(heroEl,
      h("div", { class: "card" }, h("label", {}, "Name"), nameIn, h("p", { class: "muted small" }, "The same name on another device takes over your seat.")),
      PACKS.length > 1 ? h("div", { class: "card vcard" }, h("label", {}, "Game"), tabs) : null,
      h("div", { class: "card" }, h("label", {}, "Mode", modeSel), modeInfo, optBox, h("label", {}, "Visibility", visSel), h("button", { class: "btn primary big", onclick: go(async () => {
        const n = need(), pk = await P.getPack(homePack), md = modeList().find((m) => m.id === modeSel.value) || modeList()[0];
        if (!md) throw new Error("This category is coming soon: no game mode is playable for it yet.");
        const extra = {}; for (const [k, el] of Object.entries(optSel)) extra[k] = el.value;
        const code = await N.createRoom(n, JSON.parse(JSON.stringify({ ...R.DEFAULT_SETTINGS, ...(md.defaultSettings || {}), ...extra, filters: P.defaultFilters(pk) })), { pack: pk.id, mode: md.id, visibility: visSel.value }); await enter(code, "player", n); }) }, "Create room")),
      h("div", { class: "card" }, h("label", {}, "Room code"), codeIn, h("div", { class: "row" },
        h("button", { class: "btn primary big", onclick: go(async () => { const n = need(), c = N.normCode(codeIn.value); if (c.length !== 4) throw new Error("Enter the 4-letter code"); await enter(c, "player", n); }) }, "Join"),
        h("button", { class: "btn big", onclick: go(async () => { const n = need(), c = N.normCode(codeIn.value); if (c.length !== 4) throw new Error("Enter the 4-letter code"); await enter(c, "spectator", n); }) }, "Spectate"))),
      pubCard,
      h("button", { class: "btn", onclick: () => { S.view = "leaderboard"; schedule(); } }, "Leaderboard"));
    return { update() { }, destroy() { alive = false; clearInterval(pubTimer); if (pubUnsub) pubUnsub(); } };
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
  screens.lobby = () => {
    let L = settings(), pending = null;
    const push = () => { clearTimeout(pending); pending = setTimeout(async () => { pending = null; try { await N.put(S.code, "meta/settings", L); } catch (e) { toast(e.message); } }, 250); };
    const edit = (fn) => { if (!isHost()) return; fn(L); push(); refresh(); };
    const num = (key, min, max) => h("input", { type: "number", min, max, onchange: (e) => edit((s) => { s[key] = Math.max(min, Math.min(max, Math.floor(+e.target.value) || min)); }) });
    const inBal = num("startBalance", 10, 100000), inRos = num("rosterSize", (MD.rosterRange || {}).min ?? R.ROSTER_MIN, (MD.rosterRange || {}).max ?? R.ROSTER_MAX), inSec = num("auctionSeconds", 5, 120), inStall = num("stallLimit", R.STALL_MIN, R.STALL_MAX);
    const cbMystery = h("input", { type: "checkbox", onchange: (e) => edit((s) => { s.mysteryTraits = e.target.checked; }) });
    const selMode = h("select", { onchange: (e) => { if (isHost()) N.put(S.code, "meta/mode", e.target.value).catch((er) => toast(er.message)); } }, M.modesFor(MODES, PK).map((m) => h("option", { value: m.id }, M.titleOf(m, PK))));
    const modeDesc = h("p", { class: "muted small" }, MD.description || "");
    const modePanel = MD.settingsPanel ? MD.settingsPanel({ h, edit, isHost, pack: PK }) : { nodes: [], refresh() {} };
    const buildFilter = (d) => {
      if (d.type === "chips") {
        const row = h("div", { class: "row wrap" }, d.options.map((x) => h("button", { type: "button", class: "chip" + (d.typeChips ? " tchip type-" + x : ""), "aria-pressed": "false", "data-v": x, onclick: () => edit((s) => { const a = new Set(s.filters[d.id]); a.has(x) ? a.delete(x) : a.add(x); s.filters[d.id] = [...a]; }) }, d.format ? d.format(x) : x)));
        return { nodes: [h("label", {}, d.label), row], refresh(f) { row.querySelectorAll(".chip").forEach((c) => { const on = f[d.id].includes(c.dataset.v); c.classList.toggle("on", on); c.setAttribute("aria-pressed", String(on)); }); } };
      }
      if (d.type === "range") {
        const log = d.scale === "log", kMin = d.id + "Min", kMax = d.id + "Max";
        const v2m = (v) => (log ? d.min * Math.pow(d.max / d.min, v / 1000) : d.min + ((d.max - d.min) * v) / 1000);
        const m2v = (m) => Math.round(log ? (1000 * Math.log(m / d.min)) / Math.log(d.max / d.min) : (1000 * (m - d.min)) / (d.max - d.min));
        const fmt = d.format || ((v) => String(v)), lbl = h("div", { class: "muted small" }), dFill = h("div", { class: "dfill" });
        const dtick = (m) => h("span", { class: "dtick", style: `left:${m2v(m) / 10}%` }, (d.formatTick || fmt)(m));
        const rMin = h("input", { type: "range", min: 0, max: 1000, "aria-label": `Minimum ${d.label.toLowerCase()}`, oninput: (e) => edit((s) => { s.filters[kMin] = Math.min(v2m(+e.target.value), s.filters[kMax]); }) });
        const rMax = h("input", { type: "range", min: 0, max: 1000, "aria-label": `Maximum ${d.label.toLowerCase()}`, oninput: (e) => edit((s) => { s.filters[kMax] = Math.max(v2m(+e.target.value), s.filters[kMin]); }) });
        const box = h("div", { class: "dual" }, h("div", { class: "dtrack" }, dFill), rMin, rMax, h("div", { class: "dticks" }, (d.ticks || []).map(dtick)));
        return { nodes: [h("label", {}, d.label), box, lbl], refresh(f, host) {
          const lo = m2v(f[kMin]), hi = m2v(f[kMax]);
          rMin.value = lo; rMax.value = hi; rMin.disabled = rMax.disabled = !host;
          dFill.style.left = lo / 10 + "%"; dFill.style.right = (100 - hi / 10) + "%";
          rMin.style.zIndex = lo > 500 ? 4 : 2; rMax.style.zIndex = 3;
          lbl.textContent = `${d.label} range: ${fmt(f[kMin])} to ${fmt(f[kMax])}`;
        } };
      }
      // exclude
      let search = "";
      const exList = h("div", { class: "exlist" }), exCount = h("span", { class: "muted small" });
      const searchIn = h("input", { placeholder: `Search ${PK.nouns.plural} to exclude`, oninput: (e) => { search = e.target.value.toLowerCase(); draw(); } });
      function draw() {
        const ex = new Set(L.filters.excluded), items = ENT.list.filter((a) => !search || a.name.toLowerCase().includes(search) || a.id.includes(search)).slice(0, 150);
        exList.replaceChildren(...items.map((a) => h("label", { class: "exrow" }, h("input", { type: "checkbox", checked: ex.has(a.id), onchange: (e) => edit((s) => { const set = new Set(s.filters.excluded); e.target.checked ? set.add(a.id) : set.delete(a.id); s.filters.excluded = [...set]; }) }), ` ${a.name}`)));
        exCount.textContent = `${ex.size} excluded`;
      }
      return { nodes: [h("label", {}, d.label || `Exclude ${PK.nouns.plural}`, " ", exCount), searchIn, exList], draw, refresh(f) { exCount.textContent = `${f.excluded.length} excluded`; } };
    };
    const widgets = PK.filters.map(buildFilter);
    const poolInfo = h("div", { class: "poolinfo" }), startBtn = h("button", { class: "btn primary big", onclick: async () => { try { await runner.startGame(); } catch (e) { toast(e.message); } } }, "Start game");
    const plist = h("div", {}), specInfo = h("p", { class: "muted small" });
    const drawEx = () => widgets.forEach((w) => w.draw && w.draw());
    function refresh() {
      const host = isHost(), f = L.filters;
      for (const [el, v] of [[inBal, L.startBalance], [inRos, L.rosterSize], [inSec, L.auctionSeconds], [inStall, L.stallLimit ?? R.STALL_LIMIT]]) { if (document.activeElement !== el) el.value = v; el.disabled = !host; }
      selMode.value = MD.id; selMode.disabled = !host;
      cbMystery.checked = !!L.mysteryTraits; cbMystery.disabled = !host;
      modePanel.refresh(L, host);
      widgets.forEach((w) => w.refresh(f, host));
      const n = H.filterPool(ENT.list, f, PK).length, np = Object.keys(S.players || {}).length, need = MD.noDraft ? 1 : H.minPool(Math.max(np, 2), L.rosterSize), ok = n >= need;
      poolInfo.className = "poolinfo " + (ok ? "ok" : "bad"); poolInfo.textContent = MD.noDraft ? `Pool: ${n} ${PK.nouns.plural}` : `Pool: ${n} ${PK.nouns.plural} (need at least ${need} for ${Math.max(np, 2)} players × ${L.rosterSize} + ${R.POOL_MARGIN})`;
      startBtn.hidden = !host; startBtn.disabled = !(host && runner && ok && np >= 2);
    }
    const draftBox = h("div", {}, h("div", { class: "grid2" }, h("label", {}, "Starting balance ($)", inBal), h("label", {}, "Roster size (3-8)", inRos), h("label", {}, "Auction seconds", inSec), h("label", {}, "Unsold lots in a row before a free lot", inStall)),
      PK.traitsFile ? h("label", { class: "row" }, cbMystery, " Mystery traits: strength and weakness show as ??? while an animal is up for auction") : null);
    draftBox.hidden = !!MD.noDraft;
    screen(h("div", { class: "card center" }, h("div", { class: "muted" }, "Room code"), h("div", { class: "bigcode" }, S.code), h("div", { class: "muted small" }, "Friends join with this code (max 6 players, 10 connections).")),
      h("div", { class: "card" }, h("h3", {}, "Players"), plist, specInfo),
      h("div", { class: "card" }, h("h3", {}, "Settings"),
        h("label", {}, "Mode", selMode), modeDesc,
        draftBox,
        ...modePanel.nodes),
      h("div", { class: "card" }, h("h3", {}, `${P.cap(PK.nouns.singular)} pool`), ...widgets.flatMap((w) => w.nodes), poolInfo),
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
    const claimBox = h("div", { class: "card claimbox" }, h("p", { class: "small" }, ""), h("div", { class: "row" }, claimBtn, h("button", { class: "btn", onclick: doSkip }, "Skip")));
    const idleBox = h("div", { class: "idlebox" }, "Your bid controls appear here");
    const slot = h("div", { class: "actionslot" }, bidBox, claimBox, idleBox);
    const tbl = h("div", { class: "card d-tbl" }), logBox = h("div", { class: "card d-log" }), rosters = h("div", { class: "card d-ros" });
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
        const active = A && !A.resolved && A.id === (L.drawIndex || 0), a = A && ENT.map.get(A.animalId);
        { const pool = arr(G.pool), di = L.drawIndex || 0; preload(pool.slice(di, di + 4).map((id) => cardImage(PK, ENT.map.get(id)))); }   // the current lot first, then the next three: ready before they are dealt
        if (A && A.id !== lastId) { lastId = A.id; barMax = Math.max(1000, A.deadline - N.now()); bidTouched = false; }
        topInfo.replaceChildren(h("div", { class: "lotbar" }, h("span", { class: "lotno" }, `Lot ${Math.min((L.drawIndex || 0) + 1, arr(G.pool).length)} of ${arr(G.pool).length}`), L.stall ? h("span", { class: "pill" }, `${L.stall} of ${settings().stallLimit ?? R.STALL_LIMIT} unsold in a row`) : null),
          S.role === "player" ? h("div", { class: "purse" }, h("b", {}, `$${bal[me] ?? 0}`), h("span", { class: "muted" }, `left, roster ${arr(ros[me]).length} of ${st.rosterSize}`)) : h("div", { class: "pill" }, "spectating"), S.role === "player" && PK.draftTip ? h("p", { class: "fb-tip" }, PK.draftTip(arr(ros[me]).map((x) => ENT.map.get(x.id)).filter(Boolean), st.rosterSize)) : null);
        const sold = A && A.resolved && A.outcome && A.outcome.winner ? ENT.map.get(A.outcome.animalId) : null;   // mystery traits: the bought animal is shown once with its traits revealed
        cardBox.replaceChildren(active && a ? animalCard(a, false, null, !!st.mysteryTraits) : sold && st.mysteryTraits ? animalCard(sold, false, null, false) : animalCard(null, false, A && A.resolved && A.outcome ? "Resolved…" : `Next ${PK.nouns.singular}…`));
        const isPart = !!(A && A.participants && A.participants[me]), elig = !!(A && A.eligible && A.eligible[me]), skipped = !!(A && A.skips && A.skips[me]), top = A && A.top;
        const iTop = top && top.key === me, isPlayer = S.role === "player";
        const inClaim = !!(active && A.status === "claim" && A.claim && A.claim.key === me && !A.claim.taken && !A.claim.declined);
        let m = "";
        if (!active) m = L.last ? L.last.text : "";
        else if (A.status === "claim") m = A.claim && A.claim.key === me ? "You are the last one left: claim it free or skip." : `${nameOf(A.claim && A.claim.key)} may claim it for free…`;
        else if (!isPlayer) m = top ? `Top bid: $${top.amt} by ${nameOf(top.key)}` : "No bids yet";
        else if (!isPart) m = "Your roster is full. Sit this one out.";
        else if (skipped) m = `You skipped this ${PK.nouns.singular}.`;
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
          return h("div", { class: "row between" }, h("span", {}, nameOf(k), k === me ? h("span", { class: "pill you" }, "you") : null), h("span", { class: "muted" }, `$${bal[k] ?? 0} with ${arr(ros[k]).length}/${st.rosterSize} ${PK.nouns.plural} `, tags.map((t) => h("span", { class: "pill " + t }, t))));
        }));
        const entries = Object.entries(L.log || {}).sort((x, y) => +y[0] - +x[0]).slice(0, 8);
        logBox.replaceChildren(h("h3", {}, "Draft log"), ...entries.map(([, t]) => h("div", { class: "logline" + (t.startsWith("STALL") ? " stall" : "") }, t)));
        rosters.replaceChildren(h("h3", {}, "Rosters"), ...(G.keys ? arr(G.keys) : []).map((k) => h("details", { open: k === me }, h("summary", {}, `${nameOf(k)} (${arr(ros[k]).length})`),
          ...arr(ros[k]).map((x) => { const an = ENT.map.get(x.id); return h("div", { class: "row between small" }, h("span", {}, an && PK.rosterTag ? [h("span", { class: "pill rtag" }, PK.rosterTag(an)), " "] : null, an ? an.name : x.id), h("span", { class: "muted" }, x.price ? `$${x.price}` : "free")); }))));
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
    screen(h("h2", {}, "Set your lineup"), h("p", { class: "muted" }, (MD.lineup && MD.lineup.hint && MD.lineup.hint(uiCtx)) || "Drag the handle to reorder. Positions 1-2 are the front line (hit most often). The rest fight from the back."), h("div", { class: "card" }, cd.el, cdText), list, readyBtn, status);
    const draftOrder = () => arr(((S.ledger || {}).rosters || {})[S.key]).map((x) => x.id);
    const draw = () => drawRows();
    // keyboard fallback: focus a handle and press Arrow Up / Arrow Down
    function gripKey(e, i) {
      const d = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0, j = i + d; if (!d) return;
      e.preventDefault(); if (j < 0 || j >= order.length) return;
      [order[i], order[j]] = [order[j], order[i]]; dirty = true; draw(); save(false);
      const g = rowsBox.children[j] && rowsBox.children[j].querySelector(".grip"); if (g) g.focus();
    }
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
        const a = ENT.map.get(id) || { name: id, emoji: "?" };
        const grip = h("button", { class: "grip", type: "button", "aria-label": `Move ${a.name}. Drag, or use the arrow keys.`, title: "Drag to reorder", onpointerdown: (e) => startDrag(e, i), onkeydown: (e) => gripKey(e, i) });
        const sl = MD.lineup && MD.lineup.slot ? MD.lineup.slot(i, a, uiCtx) : null;   // a mode may label slots (race: leg per slot)
        return h("div", { class: "lrow" + (!sl && i < R.FRONT_SLOTS ? " front" : "") + (i === 0 ? " first" : "") + (!sl && i === R.FRONT_SLOTS ? " firstback" : "") + (sl && sl.cls ? " " + sl.cls : "") },
          grip, h("span", { class: "pos" }, i + 1), icon(a), h("span", { class: "grow" }, a.name, sl && sl.node), a.speed != null ? statStrip(a) : null);
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
        if (isP && !mine.length) rowsBox.replaceChildren(h("p", { class: "muted" }, `You drafted no ${PK.nouns.plural}, so you sit out the tournament.`));
        const ready = S.lineups || {}; status.replaceChildren(h("h3", {}, "Players"), ...arr(S.game && S.game.keys).map((k) => h("div", { class: "row between" }, nameOf(k), h("span", { class: "muted" }, ready[k] && ready[k].done ? "ready" : "arranging…"))));
        readyBtn.textContent = S.lineups && S.lineups[S.key] && S.lineups[S.key].done ? "Ready (tap to change)" : "Ready";
      }
    };
  };

  // ================= RESULTS =================
  screens.results = () => {
    const body = h("div", { class: "card" });
    screen(h("h1", {}, "Results"), body, h("button", { class: "btn primary", onclick: () => leave() }, "Leave room"));
    return { update() { const r = (S.game && S.game.results) || {}, sc = r.scores || {}; body.replaceChildren(...arr(r.order).map((k, i) => h("div", { class: "row between" }, h("span", {}, `${i + 1}. ${nameOf(k)}`), h("b", {}, sc[k] ?? ""))), ...(arr(r.order).length ? [] : [h("p", { class: "muted" }, "No results recorded.")])); } };
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