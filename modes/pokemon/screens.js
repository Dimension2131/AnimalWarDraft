import * as E from "./engine.js";
import * as Dt from "./data.js";
import { EVENT_MS, teamsOfFight } from "./host.js";
import { computeStandings } from "../classic/host.js";
import { ensureStyles } from "./styles.js";

const ART = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/";
const SPR = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/";
const cap = (s) => String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);
const TYPE_BG = { normal: "#c3c3a8", fire: "#ff9a55", water: "#6fa8ff", electric: "#ffe04a", grass: "#7fdc6a", ice: "#9ae8ee", fighting: "#e0645c", poison: "#c27ad8", ground: "#e2c06a", flying: "#b4a8f5", psychic: "#ff7fa8", bug: "#b5d84a", rock: "#c9b26a", ghost: "#9c84c4", dragon: "#8a6cff", dark: "#9a8274", steel: "#b9c2d4", fairy: "#f5a8d8", typeless: "#ccc" };
// Battle badges use whole words (no PAR / BRN / SpA / Spe): a badge is read in the middle of a fast animation.
const STAT_LBL = { atk: "Attack", def: "Defense", spa: "Sp. Attack", spd: "Sp. Defense", spe: "Speed", acc: "Accuracy", eva: "Evasion" };
const ST_LBL = { par: "Paralysis", brn: "Burn", psn: "Poison", tox: "Bad poison", slp: "Sleep", frz: "Freeze" };

// DOM replaceChildren() turns null into the text "null": always go through rc()
const rc = (el, ...kids) => el.replaceChildren(...kids.filter((k) => k != null && k !== false));

export default function createScreens(ctx) {
  const { h, screen, arr, secs, toast, schedule, nameOf, isHost, S, N, bar } = ctx;
  ensureStyles();
  let D = null; Dt.loadBattleData().then((d) => { D = d; schedule(); }).catch((e) => toast("Could not load the move data: " + e.message));
  const ent = (id) => ctx.entities.map.get(id) || { id, name: id, emoji: "?", types: [], abilities: [] };
  const tp = (t) => h("span", { class: "tpill", style: `background:${TYPE_BG[t] || "#ccc"};color:#070c0b` }, cap(t));
  const img = (src, cls, e) => h("img", { class: cls, src, alt: e ? e.name : "", loading: "lazy", onerror: (ev) => { if (e && e.imageAlt && !ev.target.dataset.fb) { ev.target.dataset.fb = "1"; ev.target.src = e.imageAlt; } else ev.target.replaceWith(h("span", { class: "emoji" }, e ? e.emoji : "?")); } });
  const catIcon = (c) => (c === "physical" ? "💥" : c === "special" ? "✨" : "◌");
  const fmtMove = (m) => `Power ${m.p == null ? "—" : m.p} · Accuracy ${m.a == null ? "—" : m.a + "%"} · ${m.pp} uses`;

  // =============== LINEUP (order + moves + ability) ===============
  function lineupScreen() {
    let order = null, sets = {}, dirty = false, pending = null, open = null, flt = { q: "", t: "" };
    const rowsBox = h("div", {}), cd = bar(ctx.mode.lineupMs / 1000), cdText = h("div", { class: "center" }), status = h("div", { class: "card" });
    const save = (done) => { dirty = false; clearTimeout(pending); return N.put(S.code, `lineups/${S.key}`, JSON.parse(JSON.stringify({ order, done: !!done, sets }))).catch((e) => toast(e.message)); };
    const later = () => { dirty = true; clearTimeout(pending); pending = setTimeout(() => save(false), 400); };
    const readyBtn = h("button", { class: "btn primary big", onclick: () => save(true) }, "Ready");
    screen(h("h2", {}, "Set your team"), h("p", { class: "muted" }, "Order = who leads first. Open a Pokémon to choose its four moves and its ability. Untouched Pokémon get a sensible default set."), h("div", { class: "card" }, cd.el, cdText), rowsBox, readyBtn, status);
    const draftOrder = () => arr(((S.ledger || {}).rosters || {})[S.key]).map((x) => x.id);
    const setOf = (e) => { if (!sets[e.id]) sets[e.id] = Dt.defaultSet(D, e); sets[e.id].moves = arr(sets[e.id].moves).map(Number); return sets[e.id]; };
    const move = (i, d) => { const j = i + d; if (j < 0 || j >= order.length) return; [order[i], order[j]] = [order[j], order[i]]; later(); draw(); };
    function movesPanel(e) {
      const st = setOf(e), ids = Dt.learnsetOf(D, e), have = new Set(st.moves);
      const slots = h("div", { class: "pk-mv-slots" }), list = h("div", { class: "pk-mv-list" });
      const q = h("input", { placeholder: "Search moves", value: flt.q, oninput: (ev) => { flt.q = ev.target.value.toLowerCase(); fill(); } });
      const ts = h("select", { onchange: (ev) => { flt.t = ev.target.value; fill(); } }, h("option", { value: "" }, "All types"), ...D.typeNames.map((t) => h("option", { value: t, selected: flt.t === t }, cap(t))));
      const drawSlots = () => { rc(slots, ...[0, 1, 2, 3].map((i) => { const id = st.moves[i], m = id && D.moves[id]; return m ? h("button", { class: "pk-slot", type: "button", title: (m.d || "") + " (tap to remove)", style: `border-left:6px solid ${TYPE_BG[m.t]}`, onclick: () => { st.moves.splice(i, 1); later(); draw(); } }, h("span", {}, h("b", {}, m.n), h("br"), h("small", { class: "muted" }, `${catIcon(m.c)} ${fmtMove(m)}`)), h("span", {}, "✕")) : h("div", { class: "pk-slot empty" }, "empty slot"); })); };
      const fill = () => {
        const items = ids.filter((id) => { const m = D.moves[id]; return (!flt.q || m.n.toLowerCase().includes(flt.q)) && (!flt.t || m.t === flt.t); }).sort((a, b) => (D.moves[b].p || 0) - (D.moves[a].p || 0)).slice(0, 80);
        rc(list, ...items.map((id) => { const m = D.moves[id]; return h("button", { class: "pk-mv" + (have.has(id) ? " on" : ""), type: "button", title: m.d || "", onclick: () => { if (have.has(id)) st.moves = st.moves.filter((x) => x !== id); else if (st.moves.length < 4) st.moves.push(id); else return toast("Remove a move first (tap a slot)."); later(); draw(); } }, h("span", {}, tp(m.t), " ", h("b", {}, m.n)), h("span", { class: "muted small" }, `${catIcon(m.c)} ${fmtMove(m)}`), m.d ? h("small", {}, m.d) : null); }));
        if (!items.length) rc(list, h("p", { class: "muted small" }, "No playable move matches."));
      };
      drawSlots(); fill();
      const ab = h("select", { onchange: (ev) => { st.ability = ev.target.value; later(); } }, e.abilities.map((a) => h("option", { value: a.id, selected: a.id === st.ability }, `${(D.abilities[a.id] || { n: a.id }).n}${a.hidden ? " (hidden)" : ""}${E.ABILITIES.has(a.id) ? "" : " · no battle effect"}`)));
      return h("div", { class: "pk-ctl" }, h("label", {}, "Ability", ab), h("p", { class: "muted small" }, (D.abilities[st.ability] || {}).d || ""), slots, h("p", { class: "muted small" }, `${ids.length} playable moves for ${e.name}. Tap to add, tap a slot to remove.`), h("div", { class: "pk-filter" }, q, ts), list);
    }
    function draw() {
      if (!order || !D) return;
      rc(rowsBox, ...order.map((id, i) => {
        const e = ent(id), st = setOf(e), names = st.moves.map((m) => (D.moves[m] || {}).n).filter(Boolean).join(" · ");
        return h("div", { class: "pk-lrow" }, h("div", { class: "pk-lhead" }, h("span", { class: "pk-pos" }, i + 1), ctx.icon(e), h("div", { class: "grow" }, h("b", {}, e.name), h("div", { class: "row wrap" }, e.types.map(tp)))),
          h("p", { class: "pk-lmoves muted small" }, names || "No moves chosen"),
          h("div", { class: "pk-lact" },
            h("div", { class: "pk-seg" }, h("button", { class: "btn small", type: "button", "aria-label": `Move ${e.name} up`, disabled: i === 0, onclick: () => move(i, -1) }, "↑"), h("button", { class: "btn small", type: "button", "aria-label": `Move ${e.name} down`, disabled: i === order.length - 1, onclick: () => move(i, 1) }, "↓")),
            h("button", { class: "btn small pk-edit", type: "button", "aria-expanded": String(open === id), onclick: () => { open = open === id ? null : id; draw(); } }, open === id ? "Close moves" : "Edit moves")),
          open === id ? movesPanel(e) : null);
      }));
    }
    return {
      tick() { const G = S.game; if (!G || !G.lineupDeadline) return; const rem = G.lineupDeadline - N.now(); cd.set(rem / ctx.mode.lineupMs); cdText.textContent = secs(rem) + "s left"; },
      update() {
        const isP = S.role === "player", mine = draftOrder();
        readyBtn.hidden = !isP || !mine.length; rowsBox.hidden = !isP || !mine.length;
        if (D && isP && mine.length && !order) {
          const sub = S.lineups && S.lineups[S.key] ? S.lineups[S.key] : null, so = sub ? arr(sub.order) : [];
          order = so.length === mine.length && [...so].sort().join() === [...mine].sort().join() ? so : mine.slice();
          if (sub && sub.sets) for (const [id, v] of Object.entries(sub.sets)) sets[id] = { moves: arr(v.moves).map(Number), ability: v.ability }; draw();
        }
        const ready = S.lineups || {}; rc(status, h("h3", {}, "Players"), ...arr(S.game && S.game.keys).map((k) => h("div", { class: "row between" }, nameOf(k), h("span", { class: "muted" }, ready[k] && ready[k].done ? "ready" : "arranging…"))));
        readyBtn.textContent = S.lineups && S.lineups[S.key] && S.lineups[S.key].done ? "Ready (tap to change)" : "Ready";
      }
    };
  }

  // =============== BATTLE VIEWER ===============
  const toView = (st) => ({ turn: st.turn, weather: st.weather, tr: st.tr, over: st.over, sides: st.sides.map((sd) => ({ name: sd.name, active: sd.active, hz: { ...sd.hz }, scr: { ...sd.scr, tailwind: sd.tw || 0 }, team: sd.team.map((m) => ({ id: m.id, pid: m.pid, name: m.name, types: m.types.slice(), hp: m.hp, max: m.max, st: m.st, fnt: m.fnt, stg: { ...m.stg }, sub: (m.v && m.v.sub) > 0, ab: m.ab })) })) });
  function applyEv(V, e, fx) {
    const sd = (s) => V.sides[s], mon = (s, i) => sd(s).team[i == null ? sd(s).active : i];
    switch (e.e) {
      case "send": { const m = mon(e.s, e.i); sd(e.s).active = e.i; m.stg = {}; m.sub = false; break; }
      case "hp": { const m = mon(e.s, e.i); if (e.hp < m.hp) fx && fx.hit(e.s); m.hp = e.hp; m.max = e.max; break; }
      case "status": mon(e.s, e.i).st = e.st; break;
      case "faint": { const m = mon(e.s, e.i); m.fnt = true; m.hp = 0; m.st = null; m.stg = {}; break; }
      case "stage": { const m = mon(e.s); m.stg[e.k] = Math.max(-6, Math.min(6, (m.stg[e.k] || 0) + e.d)); if (e.d === 6) m.stg[e.k] = 6; break; }
      case "weather": V.weather = e.w; break;
      case "hazard": sd(e.s).hz[e.k] = e.n; break;
      case "screen": sd(e.s).scr[e.k] = e.n; break;
      case "sub": mon(e.s).sub = e.on; break;
      case "haze": V.sides.forEach((s) => { s.team[s.active].stg = {}; }); break;
      case "turn": V.turn = e.n; break;
      case "move": fx && fx.move(e.s, e.mt); break;
      case "end": V.end = e.w; break;
      default: break;
    }
  }
  function makeViewer(mySide) {
    const top = 1 - mySide, V = { cur: null }, queue = []; let nextAt = 0, lines = [];
    const side = (cls, s) => {
      const sprite = h("img", { class: "pk-sprite", alt: "" }), nm = h("span", {}), hpT = h("span", { class: "small" }), fill = h("i"), badges = h("div", { class: "pk-badges" }), team = h("div", { class: "pk-team" }), env = h("div", { class: "pk-badges" });
      const plate = h("div", { class: "pk-plate" }, h("div", { class: "nm" }, nm, hpT), h("div", { class: "pk-hpbar" }, fill), badges, env, team);
      return { s, el: h("div", { class: "pk-side " + cls }, sprite, plate), sprite, nm, hpT, fill, badges, env, team, shown: null };
    };
    const T = side("foe", top), B = side("me", mySide);
    const arena = h("div", { class: "pk-arena" }, T.el, B.el), logBox = h("div", { class: "pk-log" }), banner = h("div", { class: "pk-banner" });
    const el = h("div", { class: "pk-ctl" }, banner, arena, h("div", { class: "pk-weather muted small center" }), logBox);
    const wx = el.querySelector(".pk-weather");
    const fx = { hit(s) { const x = s === top ? T : B; x.sprite.classList.remove("hit"); void x.sprite.offsetWidth; x.sprite.classList.add("hit"); }, move(s) { const x = s === top ? T : B; x.sprite.classList.add("atk"); setTimeout(() => x.sprite.classList.remove("atk"), 260); } };
    function paint() {
      const v = V.cur; if (!v) return;
      for (const P of [T, B]) {
        const sd = v.sides[P.s], m = sd.team[sd.active], e = ent(m.id);
        if (P.shown !== m.id) { P.shown = m.id; P.sprite.replaceWith(P.sprite = img(e.image || ART + m.pid + ".png", "pk-sprite", e)); }
        P.sprite.classList.toggle("fnt", !!m.fnt);
        const f = m.hp / m.max; P.nm.textContent = `${m.name}`; P.hpT.textContent = `${m.hp}/${m.max}`; P.fill.style.width = (100 * f) + "%"; P.fill.className = f < 0.2 ? "low" : f < 0.5 ? "mid" : "";
        const b = []; if (m.st) b.push(h("span", { class: "pk-b " + m.st }, ST_LBL[m.st])); if (m.sub) b.push(h("span", { class: "pk-b env" }, "Substitute"));
        for (const [k, d] of Object.entries(m.stg)) if (d) b.push(h("span", { class: "pk-b " + (d > 0 ? "up" : "dn") }, `${STAT_LBL[k]} ${d > 0 ? "+" : ""}${d}`));
        rc(P.badges, ...b);
        const ev = []; const hz = sd.hz; if (hz.rocks) ev.push("Stealth Rock"); if (hz.spikes) ev.push("Spikes ×" + hz.spikes); if (hz.tspikes) ev.push("Toxic spikes"); if (hz.web) ev.push("Sticky Web");
        if (sd.scr.reflect > 0) ev.push("Reflect"); if (sd.scr.light > 0) ev.push("Light Screen"); if (sd.scr.veil > 0) ev.push("Aurora Veil"); if (sd.scr.tailwind > 0) ev.push("Tailwind");
        rc(P.env, ...ev.map((x) => h("span", { class: "pk-b env" }, x)));
        rc(P.team, ...sd.team.map((t, i) => h("i", { class: (t.fnt ? "fnt " : "") + (i === sd.active ? "cur" : ""), title: `${t.name} ${t.hp}/${t.max}` })));
      }
      arena.dataset.w = v.weather || ""; wx.textContent = [v.weather ? ({ rain: "Rain", sun: "Harsh sun", sand: "Sandstorm", hail: "Hail", snow: "Snow" })[v.weather] : "", v.tr > 0 ? "Trick Room" : "", `Turn ${v.turn}`].filter(Boolean).join(" · ");
      if (v.end != null) banner.textContent = v.end === -1 ? "It's a draw!" : `${v.sides[v.end].name} wins!`;
    }
    const addLine = (t, hl) => { lines.push([t, hl]); if (lines.length > 60) lines.shift(); rc(logBox, ...lines.map(([x, c]) => h("div", { class: c ? "hl" : "" }, x))); logBox.scrollTop = logBox.scrollHeight; };
    const weight = (e) => (e.e === "text" ? 1 : e.e === "hp" ? 0.55 : e.e === "send" || e.e === "faint" ? 0.8 : 0.15);
    return {
      el, view: () => V.cur, busy: () => queue.length > 0,
      init(st, evs) { V.cur = toView(st); queue.length = 0; lines = []; rc(logBox); banner.textContent = ""; paint(); if (evs) queue.push(...evs); },
      push(evs) { queue.push(...evs); },
      skip(evs) { for (const e of evs) { applyEv(V.cur, e, null); if (e.e === "text") addLine(e.t); } paint(); },
      step(now) {
        if (!V.cur) return; let changed = false;
        while (queue.length && now >= nextAt) { const e = queue.shift(); applyEv(V.cur, e, fx); if (e.e === "text") addLine(e.t, /fainted|wins|super effective|critical/.test(e.t)); nextAt = now + EVENT_MS * weight(e); changed = true; if (weight(e) < 0.2) continue; else break; }
        if (changed) paint();
      },
      paint
    };
  }

  // =============== BATTLE SCREEN ===============
  function battleScreen() {
    let curId = "", V = null, mode = "", B = null, lastN = 0, sent = {}, autoData = null, loadingFor = "", subs = [], st = null, mySide = 0, lastCtl = "";
    const head = h("div", { class: "qz-head" }), stage = h("div", {}), ctl = h("div", { class: "card pk-ctl" }), side = h("div", {});
    ctl.hidden = true;
    screen(head, h("div", { class: "card" }, stage), ctl, side);
    const stopSubs = () => { subs.forEach((u) => { try { u(); } catch (e) { /* ignore */ } }); subs = []; };
    const meOf = (f) => (S.key === f.b ? 1 : 0);
    const cdb = bar(0), cdt = h("span", { class: "muted small" });

    function setup(f) {
      curId = f.id; mode = f.style; V = null; B = null; lastN = 0; sent = {}; autoData = null; st = null; stopSubs(); mySide = meOf(f); lastCtl = "";
      rc(stage, h("p", { class: "muted center" }, "Loading the battle…"));
    }
    async function prepare(T, f) {
      if (!D || loadingFor === f.id) return; loadingFor = f.id;
      const teams = teamsOfFight(D, ctx.entities.map, T, f), names = [nameOf(f.a), nameOf(f.b)];
      if (f.style === "auto") {
        const s0 = E.createBattle({ teams, names, seed: f.seed | 0 }), init = toView(s0), res = E.runAuto({ teams: teamsOfFight(D, ctx.entities.map, T, f), names, seed: f.seed | 0 });
        autoData = { events: res.events, played: 0 }; V = makeViewer(mySide); V.init(s0, null); rc(stage, vsHeader(f), V.el); V.paint();
      } else {
        V = makeViewer(mySide); rc(stage, vsHeader(f), V.el);
        subs.push(N.watch(S.code, `pkb/${f.id}`, (v) => { B = v; schedule(); }));
      }
    }
    const vsHeader = (f) => h("div", { class: "pk-vs" }, h("b", {}, nameOf(f.a)), h("span", { class: "muted" }, "vs"), h("b", {}, nameOf(f.b)), h("span", { class: "pill" }, f.label || "Battle"), h("span", { class: "pill" }, f.style === "manual" ? "Manual" : "Auto"));

    function manualSync(f) {
      if (!B || !V) return;
      if (B.n !== lastN) {
        const logs = Object.entries(B.log || {}).map(([k, v]) => [+k, v]).sort((a, b) => a[0] - b[0]);
        if (!lastN) {
          st = JSON.parse(B.st);
          if (B.n === 1) { V.init(st, null); const ev = logs.length ? JSON.parse(logs[0][1]) : []; V.push(ev); }
          else { V.init(st, null); }
        } else {
          st = JSON.parse(B.st);
          for (const [k, v] of logs) if (k >= lastN) V.push(JSON.parse(v));
        }
        lastN = B.n;
      }
    }
    function controls(f) {
      const canPlay = S.role === "player" && (S.key === f.a || S.key === f.b) && mode === "manual" && B && st && !st.over;
      const sig = [B && B.n, V && V.busy(), sent[B && B.n], D && 1].join("|");
      if (!canPlay) { ctl.hidden = true; return; }
      ctl.hidden = false; if (sig === lastCtl) return; lastCtl = sig;
      const need = E.needsChoice(st), mine = need[mySide];
      if (V.busy()) { rc(ctl, h("p", { class: "muted center" }, "…")); return; }
      if (!mine) { rc(ctl, h("p", { class: "muted center" }, "Waiting for your opponent to choose a replacement…")); return; }
      if (sent[B.n]) { rc(ctl, h("p", { class: "muted center" }, "Locked in. Waiting for your opponent…")); return; }
      const send = async (c) => { sent[B.n] = true; lastCtl = ""; try { await N.put(S.code, `pkb/${f.id}/ch/${B.n}/${mySide === 0 ? "a" : "b"}`, c); } catch (e) { sent[B.n] = false; toast(e.message); } schedule(); };
      const L = E.legalChoices(st, mySide), me = st.sides[mySide].team[st.sides[mySide].active], foe = st.sides[1 - mySide].team[st.sides[1 - mySide].active];
      const mv = L.filter((c) => c.t === "move"), sw = L.filter((c) => c.t === "switch");
      const kids = [h("div", { class: "row between" }, h("b", {}, st.phase === "replace" ? "Choose your next Pokémon" : `What will ${me.name} do?`), cdt), cdb.el];
      if (mv.length && st.phase !== "replace") kids.push(h("div", { class: "pk-moves" }, mv.map((c) => {
        const slot = c.i === -1 ? null : me.moves[c.i], m = c.i === -1 ? { n: "Struggle", t: "normal", c: "physical", p: 50, a: null, pp: 1 } : D.moves[slot.id];
        const eff = m.c !== "status" && c.i !== -1 ? E.typeEff(m.t, foe.types, m) : 1;
        return h("button", { class: "pk-mbtn", type: "button", style: `background:${TYPE_BG[m.t] || "#ccc"}`, title: (m.d ? m.d + " " : "") + `(Accuracy ${m.a == null ? "—" : m.a + "%"})`, onclick: () => send(c) },
          h("b", {}, m.n), eff !== 1 ? h("span", { class: "pk-eff" }, eff === 0 ? "No effect" : eff > 1 ? "Super effective ×" + eff : "Not very effective") : h("span"),
          h("small", {}, `${cap(m.t)} · ${catIcon(m.c)} ${m.p == null ? "—" : m.p} power`), h("small", { class: "pk-pp" }, `${slot ? slot.pp + "/" + slot.max : "∞"} uses left`));
      })));
      if (sw.length) kids.push(h("div", {}, h("p", { class: "muted small" }, st.phase === "replace" ? "Your Pokémon fainted:" : "Or switch:"), h("div", { class: "pk-bench" }, sw.map((c) => { const t = st.sides[mySide].team[c.i], e = ent(t.id); return h("button", { class: "pk-bbtn", type: "button", onclick: () => send(c) }, ctx.icon(e), h("span", { class: "grow" }, h("b", {}, t.name), h("div", { class: "pk-hpbar" }, h("i", { style: `width:${100 * t.hp / t.max}%` })))); }))));
      rc(ctl, ...kids);
    }
    function between(T) {
      const done = Object.values(T.fights || {}).filter((f) => f.final).sort((a, b) => a.startAt - b.startAt), last = done[done.length - 1];
      const stn = computeStandings(T.keys, T);
      rc(stage, 
        h("h3", {}, T.state === "finishing" ? "Tournament complete" : "Next battle soon…"),
        last ? h("p", { class: "center" }, `${nameOf(last.a)} vs ${nameOf(last.b)}: ${last.final.winner === "draw" ? "draw" : nameOf(last.final.winner === "A" ? last.a : last.b) + " won"} (${last.final.survivors.A}-${last.final.survivors.B} left)`) : null,
        h("table", { class: "qz-tbl" }, h("tbody", {}, stn.order.map((k, i) => h("tr", {}, h("td", {}, `${i + 1}. ${nameOf(k)}`), h("td", { class: "n" }, h("b", {}, stn.pts[k] ?? 0), " pts"))))));
      if (isHost() && T.state === "awaitNext") stage.append(h("button", { class: "btn primary", onclick: () => { const r = ctx.runner(); if (r && r.nextFight) r.nextFight(); } }, "Start next battle now"));
      V = null; curId = ""; loadingFor = "";
    }
    return {
      update() {
        const T = S.tour; if (!T) { rc(stage, h("p", { class: "muted center" }, "Loading…")); return; }
        const f = T.state === "playing" ? T.fights[T.currentFight] : null;
        if (!f) { if (curId || !stage.firstChild || stage.dataset.b !== T.state) { stage.dataset.b = T.state; between(T); } rc(head, h("span", { class: "qz-step" }, "Battle phase"), h("span", { class: "pill" }, ({ awaitNext: "between battles", finishing: "wrapping up", done: "finished" })[T.state] || T.state)); ctl.hidden = true; return; }
        stage.dataset.b = "";
        if (f.id !== curId) setup(f);
        rc(head, h("span", { class: "qz-step" }, `${f.label || "Battle"}`), h("span", { class: "pill" }, f.style === "manual" ? "Manual battle" : "Auto battle"));
        if (!V) { prepare(T, f); }
        if (mode === "manual") { manualSync(f); controls(f); } else ctl.hidden = true;
        rc(side);
      },
      tick() {
        const T = S.tour, f = T && T.state === "playing" ? T.fights[T.currentFight] : null; if (!f || !V) return;
        const now = N.now();
        if (f.style === "auto" && autoData) {
          if (now < f.startAt) { return; }
          const want = Math.floor((now - f.startAt) / EVENT_MS), evs = autoData.events;
          if (autoData.played < want - 6 && !V.busy()) { const to = Math.min(evs.length, want - 2); V.skip(evs.slice(autoData.played, to)); autoData.played = to; }
          if (autoData.played < evs.length && !V.busy()) { const to = Math.min(evs.length, autoData.played + 12); V.push(evs.slice(autoData.played, to)); autoData.played = to; }
        }
        V.step(now);
        if (mode === "manual" && B && B.dl) { const rem = B.dl - now; cdb.set(rem / 45000); cdt.textContent = secs(rem) + "s"; if (ctl.firstChild && !ctl.hidden) controls(f); }
      },
      destroy() { stopSubs(); }
    };
  }

  // =============== RESULTS ===============
  function resultsScreen() {
    const body = h("div", { class: "card" });
    const again = ctx.playAgainBar({ same: true });
    screen(h("h1", {}, "Results"), body, again.el, h("button", { class: "btn", onclick: () => ctx.leave() }, "Leave room"));
    return { update() { again.update();
      const r = (S.game && S.game.results) || {}, sc = r.scores || {}, T = S.tour || {}, ch = arr(r.champion);
      rc(body, ch.length ? h("p", { class: "pk-banner" }, `🏆 ${ch.map(nameOf).join(" & ")}`) : null,
        ...arr(r.order).map((k, i) => h("div", { class: "pk-lrow" }, h("div", { class: "row between" }, h("b", {}, `${i + 1}. ${nameOf(k)}`), h("span", {}, `${sc[k] ?? 0} pts`)), h("div", { class: "row wrap pk-rteam" }, arr(T.lineups && T.lineups[k]).map((id) => { const e = ent(id); return e.image ? img(e.image, "sil color", e) : ctx.icon(e); })))),
        arr(r.order).length ? null : h("p", { class: "muted" }, "No results recorded."));
    } };
  }
  return { lineup: lineupScreen, battle: battleScreen, results: resultsScreen };
}
