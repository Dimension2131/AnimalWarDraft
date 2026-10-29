import * as E from "./engine.js";
import { planOf } from "./host.js";
import * as B from "./bracket.js";
import * as P from "./replay.js";
import { teamRows, leaders, quarterTable } from "./stats.js";
import { photo, subDetails, ratingBar } from "./card.js";
import { ensureStyles } from "./styles.js";
import * as C from "./choreo.js";
import { createViewer } from "./viewer.js";

// DOM replaceChildren() turns null into the text "null": always go through rc()
const rc = (el, ...kids) => el.replaceChildren(...kids.filter((k) => k != null && k !== false));

export default function createScreens(ctx) {
  const { h, screen, arr, secs, toast, nameOf, isHost, S, N, bar } = ctx;
  ensureStyles();
  const ent = (id) => ctx.entities.map.get(id) || { id, name: id, emoji: "?", pos: "SF", positions: [], team: "", ovr: 0 };
  const sameIds = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
  const posMode = () => E.normPosMode((S.tour && S.tour.posMode) || ctx.settings().posMode);
  // Where the five stand on the half court (percent of the court, the basket is at the top). Slot order = slotsOf(mode).
  const SPOTS = C.SPOTS;   // where each slot stands (the match viewer's choreography uses the same table)
  const tipOf = (node, text) => { if (node && node.setAttribute) node.setAttribute("title", text); return node; };

  // =============== LINEUP: starting five, bench rotation, tactics; drag & drop / tap to swap ===============
  function lineupScreen() {
    let order = null, tactics = { ...E.DEFAULT_TACTICS }, dirty = false, pending = null, sel = -1, drag = null, suppressClick = false, lastMode = "", info = "", showSubs = false;
    const court = h("div", { class: "bb-court" }), infoBox = h("div", { class: "card" }), tableBox = h("div", { class: "bb-scroll" }), benchBox = h("div", { class: "bb-bench" }), strength = h("div", { class: "row wrap" }), cd = bar(ctx.mode.lineupMs / 1000), cdText = h("div", { class: "center" }), status = h("div", { class: "card" });
    const intro = h("p", { class: "muted" });
    const save = (done) => { dirty = false; clearTimeout(pending); return N.put(S.code, `lineups/${S.key}`, JSON.parse(JSON.stringify({ order, done: !!done, tactics }))).catch((e) => toast(e.message)); };
    const later = () => { dirty = true; clearTimeout(pending); pending = setTimeout(() => save(false), 400); };
    const readyBtn = h("button", { class: "btn primary big", onclick: () => save(true) }, "Ready");
    const selPace = h("select", { "aria-label": "Pace", onchange: (e) => { tactics = E.normTactics({ ...tactics, pace: e.target.value }); later(); } }, E.PACES.map((x) => h("option", { value: x }, E.PACE_LABEL[x])));
    const selFocus = h("select", { "aria-label": "Offensive focus", onchange: (e) => { tactics = E.normTactics({ ...tactics, focus: e.target.value }); later(); } }, E.FOCUSES.map((x) => h("option", { value: x }, E.FOCUS_LABEL[x])));
    const mine = () => arr(((S.ledger || {}).rosters || {})[S.key]).map((x) => x.id);
    const autoBtn = h("button", { class: "btn", type: "button", onclick: () => { order = E.autoLineup(mine().map(ent), posMode()); sel = -1; later(); draw(); } }, "Auto-pick best five");
    const tacRow = h("div", { class: "bb-top" }, h("label", {}, "Pace ", selPace), h("label", {}, "Focus ", selFocus), autoBtn);
    screen(h("h2", {}, "Set your team"), intro, h("div", { class: "card" }, cd.el, cdText), tacRow, strength, court, h("h3", {}, "Bench (rotation order)"), benchBox,
      h("p", { class: "bb-hint" }, "The first bench player is the first off the bench. Coaches rest tired starters, protect players in foul trouble and play their best five in a close finish."), h("h3", {}, "Ratings"), infoBox, tableBox, readyBtn, status);

    function swap(a, b) { if (a === b || a < 0 || b < 0 || b >= order.length || a >= order.length) return; order = E.swapIdx(order, a, b); sel = -1; later(); draw(); }
    const tap = (i) => { if (suppressClick) { suppressClick = false; return; } if (sel < 0) { sel = i; draw(); } else if (sel === i) { sel = -1; draw(); } else swap(sel, i); };
    function slotEl(i, p, slot) {
      const f = p && slot ? E.fit(p, slot, posMode()) : 1, cls = "bb-slot" + (p ? "" : " empty") + (f <= 0.78 ? " fit-bad" : f <= 0.9 ? " fit-warn" : "") + (sel === i ? " sel" : "");
      const spot = slot ? (SPOTS[posMode()] || SPOTS.strict)[slot.i] : null, style = spot ? `left:${spot[0]}%;top:${spot[1]}%` : null;
      const code = slot ? (slot.code === "ANY" ? p ? p.pos : "" : slot.code) : p ? p.pos : "";
      if (!p) return h("div", { class: cls, "data-idx": i, style }, h("span", { class: "emoji" }, "·"), h("span", { class: "nm" }, slot ? slot.code : "empty"));
      return h("button", { class: cls, type: "button", style, "data-idx": i, "aria-label": `${p.name}, ${slot ? slot.code : "bench"}, overall ${p.ovr}`, title: `${p.name} · ${p.pos} · OVR ${p.ovr}${slot && f < 1 ? ` · plays at ${Math.round(f * 100)}% here` : ""}`, onpointerdown: (ev) => down(ev, i), onclick: () => tap(i) },
        photo(h, p, "bb-photo"), h("span", { class: "ov" }, p.ovr), slot ? null : h("span", { class: "rk" }, "#" + (i - E.STARTERS + 1)), h("span", { class: "nm" }, E.surname(p)), h("span", { class: "cd" }, code),
        h("span", { class: "bb-info", role: "button", title: "Show his ratings", "aria-label": `Ratings of ${p.name}`, onpointerdown: (ev) => ev.stopPropagation(), onclick: (ev) => { ev.stopPropagation(); info = p.id; drawInfo(); } }, "i"));
    }
    // ratings of the selected player (main ratings, and under "More details" every sub rating) and a table of the whole roster
    function drawInfo() {
      const p = info && order && order.includes(info) ? ent(info) : null, toggle = h("button", { class: "btn small", type: "button", onclick: () => { showSubs = !showSubs; drawInfo(); } }, showSubs ? "Hide details" : "More details");
      rc(infoBox, h("div", { class: "row between" }, h("strong", {}, p ? `${p.name} · ${p.pos}${p.positions && p.positions.length > 1 ? " / " + p.positions.slice(1).join(" / ") : ""} · ${p.team} · OVR ${p.ovr}` : "Player ratings"), toggle),
        p ? h("div", { class: "stats bb-main7" }, E.MAINS.map((m) => ratingBar(h, tipOf, m.label, m.description, p[m.key], 100, "s-" + m.key))) : h("p", { class: "bb-hint" }, "Tap the \u201Ci\u201D on a player to see his ratings."),
        p && showSubs ? subDetails({ h, tip: tipOf }, p, 100) : null);
      const ids = order || [], cols = showSubs ? E.SUBS : [], head = h("tr", {}, h("th", {}, "Player"), h("th", {}, "Pos"), h("th", {}, "OVR"), ...E.MAINS.map((m) => tipOf(h("th", { class: "m-" + m.key }, m.abbr), m.label)), ...cols.map((x) => tipOf(h("th", { class: "sub" }, x.abbr), x.label)));
      rc(tableBox, h("table", { class: "bb-tbl" }, head, ...ids.map((id, i) => { const q = ent(id); return h("tr", { class: i < E.STARTERS ? "" : "dnp" }, h("td", { class: "n" }, q.name), h("td", {}, q.pos), h("td", {}, q.ovr), ...E.MAINS.map((m) => h("td", {}, q[m.key])), ...cols.map((x) => h("td", { class: "sub" }, q[x.key]))); })));
    }
    function draw() {
      if (!order) return;
      const mode = posMode(), slots = E.slotsOf(mode), players = order.map(ent);
      rc(court, ...slots.map((s) => slotEl(s.i, order[s.i] ? players[s.i] : null, s)));
      drawInfo();
      rc(benchBox, ...(order.length > E.STARTERS ? order.slice(E.STARTERS).map((id, j) => slotEl(E.STARTERS + j, players[E.STARTERS + j], null)) : [h("span", { class: "bb-hint" }, "No bench: your five play the whole game and will tire.")]));
      selPace.value = tactics.pace; selFocus.value = tactics.focus;
      const xi = slots.map((s) => (order[s.i] ? players[s.i] : null)), r = E.ratings(xi, mode, { chem: true });
      rc(strength, ...[["SCR", r.off], ["PLY", r.ply], ["PER D", r.per], ["RIM", r.rim], ["REB", r.reb], ["ATH", r.ath]].map(([l, v]) => h("span", { class: "chip-s" }, `${l} ${Math.round(v)}`)), h("span", { class: "chip-s" }, `Chemistry +${(r.chem * 0.3).toFixed(1)}%`));
      if (lastMode !== mode) { lastMode = mode; intro.textContent = mode === "strict" ? "Positions: five strict slots (PG, SG, SF, PF, C). A player out of position plays worse: amber and red borders show how much." : mode === "groups" ? "Positions: Guard, Guard, Wing, Wing, Big. A player one group away plays slightly worse, a guard at big much worse." : "Positionless: anyone can play anywhere. Balance still matters: you need a ball handler, shooters, a rim protector and rebounding." ; intro.textContent += " Drag players between the court and the bench, or tap one and then another to swap them."; }
    }
    function down(ev, i) { if (!order || (ev.button != null && ev.button > 0)) return; drag = { i, x: ev.clientX, y: ev.clientY, ghost: null, over: null }; }
    function overEl(x, y) { const el = typeof document.elementFromPoint === "function" ? document.elementFromPoint(x, y) : null; return el && el.closest ? el.closest("[data-idx]") : null; }
    function move(ev) {
      if (!drag) return;
      if (!drag.ghost) {
        if (Math.hypot(ev.clientX - drag.x, ev.clientY - drag.y) < 8) return;
        const src = court.querySelector(`[data-idx="${drag.i}"]`) || benchBox.querySelector(`[data-idx="${drag.i}"]`);
        if (!src) { drag = null; return; }
        drag.ghost = src.cloneNode(true); drag.ghost.classList.add("bb-ghost"); document.body.append(drag.ghost); sel = -1;
      }
      drag.ghost.style.left = ev.clientX + "px"; drag.ghost.style.top = ev.clientY + "px";
      const t = overEl(ev.clientX, ev.clientY); if (drag.over && drag.over !== t) drag.over.classList.remove("over");
      drag.over = t && +t.getAttribute("data-idx") !== drag.i ? t : null; if (drag.over) drag.over.classList.add("over");
    }
    function up(ev) {
      if (!drag) return; const d = drag; drag = null;
      if (d.ghost) { d.ghost.remove(); if (d.over) d.over.classList.remove("over"); suppressClick = true; setTimeout(() => { suppressClick = false; }, 60); const t = overEl(ev.clientX, ev.clientY); if (t) swap(d.i, +t.getAttribute("data-idx")); }
    }
    if (typeof document.addEventListener === "function") { document.addEventListener("pointermove", move); document.addEventListener("pointerup", up); document.addEventListener("pointercancel", up); }

    return {
      tick() { const G = S.game; if (!G || !G.lineupDeadline) return; const rem = G.lineupDeadline - N.now(); cd.set(rem / ctx.mode.lineupMs); cdText.textContent = secs(rem) + "s left"; },
      update() {
        const isP = S.role === "player", ids = mine();
        for (const el of [readyBtn, court, benchBox, strength, tacRow]) if (el) el.hidden = !isP || !ids.length;
        const sub = S.lineups && S.lineups[S.key] ? S.lineups[S.key] : null;
        if (isP && ids.length && (!order || (!dirty && !drag && sub && !sameIds(order, ids)))) {
          const so = sub ? arr(sub.order) : []; tactics = E.normTactics(sub && sub.tactics);
          order = sameIds(so, ids) ? so : E.autoLineup(ids.map(ent), posMode()); draw();
        } else if (order && !dirty && !drag && isP && sub) {   // follow what the host stored (e.g. after a reconnect)
          const so = arr(sub.order), nt = E.normTactics(sub.tactics);
          if (sameIds(so, ids) && (so.join() !== order.join() || nt.pace !== tactics.pace || nt.focus !== tactics.focus)) { order = so; tactics = nt; draw(); }
        } else if (order && lastMode !== posMode()) draw();
        const ready = S.lineups || {}; rc(status, h("h3", {}, "Coaches"), ...arr(S.game && S.game.keys).map((k) => h("div", { class: "row between" }, nameOf(k), h("span", { class: "muted" }, ready[k] && ready[k].done ? "ready" : "arranging…"))));
        readyBtn.textContent = S.lineups && S.lineups[S.key] && S.lineups[S.key].done ? "Ready (tap to change)" : "Ready";
      },
      destroy() { if (typeof document.removeEventListener === "function") { document.removeEventListener("pointermove", move); document.removeEventListener("pointerup", up); document.removeEventListener("pointercancel", up); } }
    };
  }

  // =============== shared views ===============
  const scoreTxt = (r) => `${r.score[0]} - ${r.score[1]}${r.ot ? (r.ot > 1 ? ` (${r.ot}OT)` : " (OT)") : ""}`;
  // The bracket as plain rows: who played whom, the score, who is still to be decided.
  const bracketEl = (T, me) => {
    const br = T.bracket, res = T.res || {}; if (!br || !arr(br.rounds).length) return h("p", { class: "muted" }, "No bracket.");
    const nm2 = (k) => (k ? nameOf(k) : k === null ? "bye" : "to be decided");
    return h("div", { class: "bb-br" }, arr(br.rounds).map((rd) => h("div", {}, arr(rd).map((m) => {
      const r = res[m.id], [a, b2] = B.sidesOf(m, res); if (r && r.bye && !r.w) return null;
      const mine = a === me || b2 === me;
      return h("div", { class: "row between bb-brm" + (mine ? " me" : "") }, h("span", { class: "muted small" }, m.label), h("span", {}, r && !r.bye ? [h("b", { class: r.w === a ? "win" : "" }, nm2(a)), `  ${scoreTxt(r)}  `, h("b", { class: r.w === b2 ? "win" : "" }, nm2(b2))] : r && r.bye ? `${nm2(r.w)} goes through` : `${nm2(a)} v ${nm2(b2)}`));
    }))));
  };
  const rankList = (order) => h("ol", { class: "bb-rank" }, arr(order).map((k) => h("li", {}, nameOf(k))));
  const fixed = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toString();
  function boxTable(sim, side, name) {
    const rows = sim.box[side], sum = (k) => rows.reduce((a, x) => a + x[k], 0);
    const fg = (m, a) => `${m}-${a}`;
    const head = h("tr", {}, ["Player", "MIN", "PTS", "REB", "AST", "STL", "BLK", "TO", "PF", "FG", "3P", "FT", "+/-"].map((x) => h("th", {}, x)));
    const line = (x) => x.secs > 0 ? h("tr", {}, h("td", { class: "n" }, `${x.pn}${x.fouledOut ? " (fouled out)" : ""}${x.injured ? " (hurt)" : ""}`), h("td", {}, fixed(x.min)), h("td", {}, x.pts), h("td", {}, x.oreb + x.dreb), h("td", {}, x.ast), h("td", {}, x.stl), h("td", {}, x.blk), h("td", {}, x.tov), h("td", {}, x.pf), h("td", {}, fg(x.fgm, x.fga)), h("td", {}, fg(x.tpm, x.tpa)), h("td", {}, fg(x.ftm, x.fta)), h("td", {}, (x.pm > 0 ? "+" : "") + x.pm))
      : h("tr", { class: "dnp" }, h("td", {}, x.pn), h("td", { colspan: 12 }, "did not play"));
    const tot = h("tr", { class: "tot" }, h("td", {}, "Team"), h("td", {}, ""), h("td", {}, sum("pts")), h("td", {}, sum("oreb") + sum("dreb")), h("td", {}, sum("ast")), h("td", {}, sum("stl")), h("td", {}, sum("blk")), h("td", {}, sum("tov")), h("td", {}, sum("pf")), h("td", {}, fg(sum("fgm"), sum("fga"))), h("td", {}, fg(sum("tpm"), sum("tpa"))), h("td", {}, fg(sum("ftm"), sum("fta"))), h("td", {}, ""));
    return h("div", { class: "bb-scroll" }, h("h4", {}, name), h("table", { class: "bb-tbl" }, head, ...rows.map(line), tot));
  }
  function statsTable(sim, names) {
    return h("div", { class: "bb-stats" }, h("div", { class: "bb-st-head" }, h("b", { class: "bb-st-name" }, names[0]), h("div", { class: "bb-st-mid" }, h("div", { class: "bb-st-title" }, "TEAM STATS"), h("div", { class: "bb-st-score" }, `${sim.score[0]} - ${sim.score[1]}${sim.ot ? (sim.ot > 1 ? ` (${sim.ot}OT)` : " (OT)") : ""}`)), h("b", { class: "bb-st-name" }, names[1])),
      teamRows(sim).map((r) => h("div", { class: "bb-st-row" }, h("span", { class: "bb-st-v" + (r.lead === 0 ? " lead" : "") }, r.v[0]), h("span", { class: "bb-st-lab" }, r.label), h("span", { class: "bb-st-v" + (r.lead === 1 ? " lead" : "") }, r.v[1]))));
  }

  // =============== MATCH: scoreboard + play-by-play replay of the simulated game ===============
  function matchScreen() {
    let curId = "", plan = null, names = ["", ""], cmpDone = "", watchId = "", tickKey = "", live = null;
    const plans = {}, tickRows = {}, skipped = {};
    const head = h("div", { class: "qz-head" }), stage = h("div", {}), side = h("div", { class: "card" });
    screen(head, h("div", { class: "card" }, stage), side);
    const planFor = (T, f) => (plans[f.id] ||= planOf(ctx.entities.map, T, f, [nameOf(f.a), nameOf(f.b)], f.speed));
    const speedPill = (f) => `${(P.SPEEDS[P.normSpeed(f.speed)] || P.SPEEDS.quick).label}${f.inj ? " · injuries on" : ""}`;
    const fiveList = (T, k) => { const ids = arr(T.lineups[k]).slice(0, E.STARTERS).map(ent), tac = E.normTactics((T.tactics || {})[k]); return h("div", { class: "bb-five" }, h("b", {}, `${nameOf(k)} · ${tac.pace} pace · ${tac.focus}`), ...ids.map((p) => h("span", {}, `${p.pos} ${p.name} (${p.ovr})`))); };
    function compareView(T, f) {
      const teams = [f.a, f.b].map((k) => { const pl = arr(T.lineups[k]).map(ent); return { xi: pl.slice(0, E.STARTERS), bench: pl.slice(E.STARTERS), mode: E.normPosMode(T.posMode) }; });
      const c = E.compare(teams[0], teams[1]);
      return h("div", { class: "bb-cmp" }, c.rows.map((r) => h("div", { class: "r" }, h("b", {}, r.a), h("div", { class: "bar l" }, h("i", { style: `width:${Math.min(100, r.a)}%` })), h("span", { class: "lab" }, r.label), h("div", { class: "bar rr" }, h("i", { style: `width:${Math.min(100, r.b)}%` })), h("b", {}, r.b))),
        h("p", { class: "muted small center" }, `Chemistry bonus: +${(c.chem[0] * 0.3).toFixed(1)}% / +${(c.chem[1] * 0.3).toFixed(1)}%. This is only a preview: the game is decided by the simulation.`));
    }
    // the live view: the cinematic viewer (choreography drawn on a canvas, play-by-play, quarter table, leaders); after the final buzzer the full team stats and box scores
    function createLive(f) {
      const after = h("div", {}), M = filmFor(f);
      const viewer = createViewer({ h, N, ent, onSkip: (token) => { skipped[f.id] = true; if (f.a === S.key || f.b === S.key) N.patch(S.code, "", { [`lineups/${S.key}/skip`]: token }).catch(() => {}); } });
      viewer.load(M, f.startAt, `${f.id}:${f.seed}`); if (skipped[f.id]) viewer.skip(); viewer.start();
      const el = h("div", {}, viewer.el, after);
      let doneKey = "";
      function paint(now) {
        if (!viewer.running) viewer.paint(now);   // no animation frames (reduced motion, tests): the screen's own tick drives the viewer
        if (viewer.over && doneKey !== f.id) { doneKey = f.id; rc(after, h("h4", {}, "Team stats"), statsTable(plan.sim, names), boxTable(plan.sim, 0, names[0]), boxTable(plan.sim, 1, names[1])); }
      }
      return { el, paint, destroy: () => viewer.destroy() };
    }
    // the film of a game: built once from the same simulation every device runs (a few hundred ms), in the pre-game window or on first need
    const films = {};
    const filmFor = (f) => (films[f.id] ||= (() => { const p = planFor(S.tour, f); return C.buildMatch({ teams: p.teams, sim: p.sim, seed: f.seed | 0, speed: f.speed }); })());
    const liveText = (f, now) => {
      const r = now - f.startAt;
      if (r < 0) return [`${nameOf(f.a)} v ${nameOf(f.b)}`, `tip-off in ${secs(-r)}s`];
      const M = filmFor(f);
      if (!M.animated) return [`${nameOf(f.a)} ${M.finalScore[0]} - ${M.finalScore[1]} ${nameOf(f.b)}`, "final"];
      const rr = skipped[f.id] ? M.endAnim : Math.min(r, M.endAnim), sc = rr >= M.total ? M.finalScore : C.scoreAt(M, rr), ck = C.clockAt(M, rr);
      return [`${nameOf(f.a)} ${sc[0]} - ${sc[1]} ${nameOf(f.b)}`, rr >= M.total ? "final" : `${P.periodLabel(ck.q)} ${P.fmtClock(ck.clk)}`];
    };
    function ticker(fights) {   // the games of this round: live score, tap to watch another one
      const key = fights.map((f) => f.id).join() + "|" + watchId + "|" + curId;
      if (key === tickKey) return; tickKey = key;
      for (const k of Object.keys(tickRows)) delete tickRows[k];
      if (fights.length < 2) { rc(side); side.hidden = true; return; }
      side.hidden = false;
      rc(side, h("h4", {}, "Games this round"), ...fights.map((f) => { const sc = h("span", {}), st = h("span", { class: "muted small" }); tickRows[f.id] = { sc, st };
        return h("div", { class: "row between" + (f.id === curId ? " me" : "") }, h("span", {}, h("b", {}, f.label), " ", sc), h("span", {}, st, f.id === curId ? null : h("button", { class: "btn small", type: "button", onclick: () => { watchId = f.id; api.update(); } }, "Watch")));
      }));
    }
    function setup(T, f) { if (live && live.destroy) live.destroy(); curId = f.id; cmpDone = ""; plan = planFor(T, f); names = [nameOf(f.a), nameOf(f.b)]; live = createLive(f); }
    function between(T) {
      const fin = T.state === "finishing" || T.state === "done";
      rc(stage, h("h3", {}, fin ? "Tournament complete" : "Next game soon…"), bracketEl(T, S.key));
      if (isHost() && T.state === "awaitNext") stage.append(h("button", { class: "btn primary", onclick: () => { const r = ctx.runner(); if (r && r.nextFight) r.nextFight(); } }, "Start next game now"));
      if (live && live.destroy) live.destroy(); curId = ""; plan = null; live = null; side.hidden = true; tickKey = "";
    }
    const api = {
      update() {
        const T = S.tour; if (!T) { rc(stage, h("p", { class: "muted center" }, "Loading…")); return; }
        const ids = arr(T.current).length ? arr(T.current) : T.currentFight ? [T.currentFight] : [], fights = T.state === "playing" ? ids.map((id) => (T.fights || {})[id]).filter((f) => f && f.a && f.b) : [];
        if (!fights.length) { if (curId || !stage.firstChild || stage.dataset.b !== T.state) { stage.dataset.b = T.state; between(T); } rc(head, h("span", { class: "qz-step" }, "Game phase"), h("span", { class: "pill" }, ({ awaitNext: "between games", finishing: "wrapping up", done: "finished" })[T.state] || T.state)); return; }
        stage.dataset.b = "";
        const f = fights.find((x) => x.id === watchId) || fights.find((x) => x.a === S.key || x.b === S.key) || fights[0];
        rc(head, h("span", { class: "qz-step" }, f.label || "Game"), h("span", { class: "pill" }, speedPill(f)));
        if (f.id !== curId) { setup(T, f); this.paintStage(T, f, true); }
        ticker(fights);
      },
      paintStage(T, f, force) {
        const pre = N.now() < f.startAt, key = (pre ? "pre" : "play") + f.id;
        if (!force && cmpDone === key) return;
        cmpDone = key;
        if (pre) rc(stage, h("div", { class: "bb-row-vs" }, h("b", {}, names[0]), h("span", { class: "muted" }, "vs"), h("b", {}, names[1]), h("span", { class: "pill" }, speedPill(f))), h("h4", { class: "center" }, "Team comparison"), compareView(T, f), h("div", { class: "row between" }, fiveList(T, f.a), fiveList(T, f.b)), h("p", { class: "muted center", "data-tip": "1" }));
        else rc(stage, live.el);
      },
      tick() {
        const T = S.tour, now = N.now(); if (!T || T.state !== "playing" || !plan) return;
        const f = (T.fights || {})[curId]; if (!f) return;
        this.paintStage(T, f, false);
        if (now < f.startAt) { const k = stage.querySelector("[data-tip]"); if (k) k.textContent = `Tip-off in ${secs(f.startAt - now)}s`; }
        else if (live) live.paint(now);
        for (const id of Object.keys(tickRows)) { const fx = (T.fights || {})[id]; if (!fx) continue; const [a, b] = liveText(fx, now); tickRows[id].sc.textContent = a; tickRows[id].st.textContent = b; }
      },
      destroy() { if (live && live.destroy) live.destroy(); live = null; }
    };
    return api;
  }

  // =============== RESULTS ===============
  function resultsScreen() {
    const body = h("div", { class: "card" });
    screen(h("h1", {}, "Final standings"), body, h("button", { class: "btn primary", onclick: () => ctx.leave() }, "Leave room"));
    let sel = "";   // the game whose stats are shown (default: the final)
    const cache = {};
    const played = (T) => { const out = []; for (const rd of arr(T.bracket && T.bracket.rounds)) for (const m of arr(rd)) { const r = (T.res || {})[m.id]; if (!r || r.bye || !r.w) continue; const f = Object.values(T.fights || {}).find((x) => x.mid === m.id); if (f) out.push({ m, r, f }); } return out; };
    const simFor = (T, f) => (cache[f.id] ||= (() => { const names = [nameOf(f.a), nameOf(f.b)]; return { names, sim: planOf(ctx.entities.map, T, f, names, "instant").sim }; })());
    return { update() {
      const r = (S.game && S.game.results) || {}, T = S.tour || {}, ch = arr(r.champion), list2 = played(T);
      if (!list2.some((x) => x.m.id === sel)) { const fin = list2.filter((x) => !x.m.third).pop() || list2[list2.length - 1]; sel = fin ? fin.m.id : ""; }
      const cur = list2.find((x) => x.m.id === sel), d = cur ? simFor(T, cur.f) : null;
      rc(body, ch.length ? h("p", { class: "bb-champ" }, `🏆 ${ch.map(nameOf).join(" & ")}`) : null, arr(r.order).length ? rankList(r.order) : null, T.bracket ? bracketEl(T, S.key) : h("p", { class: "muted" }, "No results recorded."),
        cur ? h("h3", {}, "Game stats") : null, cur && list2.length > 1 ? h("div", { class: "row wrap" }, list2.map((x) => h("button", { class: "btn small" + (x.m.id === sel ? " primary" : ""), type: "button", onclick: () => { sel = x.m.id; this.update(); } }, `${x.m.label}: ${nameOf(x.f.a)} ${x.r.score[0]}-${x.r.score[1]} ${nameOf(x.f.b)}`))) : null,
        d ? statsTable(d.sim, d.names) : null, d ? boxTable(d.sim, 0, d.names[0]) : null, d ? boxTable(d.sim, 1, d.names[1]) : null,
        ...arr(r.order).map((k) => h("div", { class: "bb-five" }, h("b", {}, `${nameOf(k)}`), h("div", { class: "row wrap" }, arr(T.lineups && T.lineups[k]).slice(0, E.STARTERS).map((id) => ctx.icon(ent(id)))))));
    } };
  }
  return { lineup: lineupScreen, match: matchScreen, results: resultsScreen };
}
