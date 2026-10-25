import * as E from "./engine.js";
import { planOf } from "./host.js";
import * as B from "./bracket.js";
import * as C from "./choreo.js";
import { createViewer } from "./viewer.js";
import { photo } from "./card.js";
import { ensureStyles } from "./styles.js";

// DOM replaceChildren() turns null into the text "null": always go through rc()
const rc = (el, ...kids) => el.replaceChildren(...kids.filter((k) => k != null && k !== false));
const mdLabel = (s) => String(s || "Match").replace(/^Round/, "Matchday");

export default function createScreens(ctx) {
  const { h, screen, arr, secs, toast, schedule, nameOf, isHost, S, N, bar } = ctx;
  ensureStyles();
  const ent = (id) => ctx.entities.map.get(id) || { id, name: id, emoji: "?", position: "midfielder", positions: [], nation: "", club: "", ovr: 0 };
  const sameIds = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

  // =============== LINEUP: formation, pitch, bench, drag & drop / tap to swap ===============
  function lineupScreen() {
    let order = null, formation = E.DEFAULT_FORMATION, dirty = false, pending = null, sel = -1, drag = null, suppressClick = false;
    const pitch = h("div", { class: "fb-pitch" }), benchBox = h("div", { class: "fb-bench" }), strength = h("div", { class: "row wrap" }), cd = bar(ctx.mode.lineupMs / 1000), cdText = h("div", { class: "center" }), status = h("div", { class: "card" });
    const save = (done) => { dirty = false; clearTimeout(pending); return N.put(S.code, `lineups/${S.key}`, JSON.parse(JSON.stringify({ order, done: !!done, formation }))).catch((e) => toast(e.message)); };
    const later = () => { dirty = true; clearTimeout(pending); pending = setTimeout(() => save(false), 400); };
    const readyBtn = h("button", { class: "btn primary big", onclick: () => save(true) }, "Ready");
    const selForm = h("select", { "aria-label": "Formation", onchange: (e) => setFormation(e.target.value) }, E.FORMATION_IDS.map((f) => h("option", { value: f }, f)));
    const autoBtn = h("button", { class: "btn", type: "button", onclick: () => { order = E.autoLineup(mine().map(ent), formation); sel = -1; later(); draw(); } }, "Auto-pick best XI");
    const mine = () => arr(((S.ledger || {}).rosters || {})[S.key]).map((x) => x.id);
    screen(h("h2", {}, "Set your team"),
      h("p", { class: "muted" }, "Pick a formation, then drag players between the pitch and the bench (or tap one, then tap another, to swap them). Red or amber borders mean a player is out of position and plays worse."),
      h("div", { class: "card" }, cd.el, cdText), h("div", { class: "fb-top" }, h("label", {}, "Formation ", selForm), autoBtn), strength, pitch, h("h3", {}, "Bench"), benchBox, h("p", { class: "fb-hint" }, "Bench players come on when starters tire (up to 3 substitutions)."), readyBtn, status);

    function setFormation(f) {
      formation = E.normFormation(f); const all = mine().map(ent), xi = order.slice(0, Math.min(E.XI, order.length)).map(ent), arranged = E.arrange(xi, formation);
      if (arranged.some((p) => !p)) order = E.autoLineup(all, formation);
      else { const bench = order.slice(E.XI); order = arranged.map((p) => p.id).concat(bench); }
      sel = -1; later(); draw();
    }
    function swap(a, b) { if (a === b || a < 0 || b < 0 || b >= order.length || a >= order.length) return; order = E.swapIdx(order, a, b); sel = -1; later(); draw(); }
    const tap = (i) => { if (suppressClick) { suppressClick = false; return; } if (sel < 0) { sel = i; draw(); } else if (sel === i) { sel = -1; draw(); } else swap(sel, i); };

    function slotEl(i, p, slot) {
      const f = p && slot ? E.fit(p, slot) : 1, cls = "fb-slot" + (p ? "" : " empty") + (f <= 0.72 ? " fit-bad" : f <= 0.85 ? " fit-warn" : "") + (sel === i ? " sel" : "");
      if (!p) return h("div", { class: cls, "data-idx": i }, h("span", { class: "emoji" }, "·"), h("span", { class: "nm" }, slot ? slot.code : "empty"));
      return h("button", { class: cls, type: "button", "data-idx": i, "aria-label": `${p.name}, ${slot ? slot.code : "bench"}, overall ${p.ovr}`, title: `${p.name} · ${p.pos} · OVR ${p.ovr}${slot && f < 1 ? ` · plays ${Math.round(f * 100)}% here` : ""}`,
        onpointerdown: (ev) => down(ev, i), onclick: () => tap(i) },
        photo(h, p, "fb-photo"), h("span", { class: "ov" }, p.ovr), h("span", { class: "nm" }, E.surname(p)), h("span", { class: "cd" }, slot ? slot.code : p.pos));
    }
    function draw() {
      if (!order) return;
      const slots = E.slotsOf(formation), players = order.map(ent);
      const lines = ["FWD", "MID", "DEF", "GK"].map((ln) => h("div", { class: "fb-line" }, slots.filter((s) => s.line === ln).map((s) => slotEl(s.i, order[s.i] ? players[s.i] : null, s))));
      rc(pitch, ...lines);
      rc(benchBox, ...(order.length > E.XI ? order.slice(E.XI).map((id, j) => slotEl(E.XI + j, players[E.XI + j], null)) : [h("span", { class: "fb-hint" }, "No bench: your whole squad is on the pitch.")]));
      selForm.value = formation;
      const xi = slots.map((s) => (order[s.i] ? players[s.i] : null)), r = E.ratings(xi, formation, { chem: true });
      rc(strength, ...[["ATT", r.att], ["MID", r.ctl], ["DEF", r.def], ["GK", r.gk]].map(([l, v]) => h("span", { class: "chip-s" }, `${l} ${Math.round(v)}`)), h("span", { class: "chip-s" }, `Chemistry +${(r.chem * 0.4).toFixed(1)}%`));
    }
    // pointer drag (mouse and touch): a plain tap still works through click
    function down(ev, i) { if (!order || (ev.button != null && ev.button > 0)) return; drag = { i, x: ev.clientX, y: ev.clientY, ghost: null, over: null }; }
    function overEl(x, y) { const el = typeof document.elementFromPoint === "function" ? document.elementFromPoint(x, y) : null; return el && el.closest ? el.closest("[data-idx]") : null; }
    function move(ev) {
      if (!drag) return;
      if (!drag.ghost) {
        if (Math.hypot(ev.clientX - drag.x, ev.clientY - drag.y) < 8) return;
        const src = pitch.querySelector(`[data-idx="${drag.i}"]`) || benchBox.querySelector(`[data-idx="${drag.i}"]`);
        if (!src) { drag = null; return; }
        drag.ghost = src.cloneNode(true); drag.ghost.classList.add("fb-ghost"); document.body.append(drag.ghost); sel = -1;
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
        for (const el of [readyBtn, pitch, benchBox, strength, selForm.parentNode, autoBtn]) if (el) el.hidden = !isP || !ids.length;
        if (isP && ids.length && (!order || (!dirty && !drag && S.lineups && S.lineups[S.key] && !sameIds(order, ids)))) {
          const sub = S.lineups && S.lineups[S.key] ? S.lineups[S.key] : null, so = sub ? arr(sub.order) : [];
          formation = E.normFormation(sub && sub.formation);
          order = sameIds(so, ids) ? so : E.autoLineup(ids.map(ent), formation); draw();
        } else if (order && !dirty && !drag && isP && S.lineups && S.lineups[S.key]) {   // follow what the host stored (e.g. after a reconnect)
          const sub = S.lineups[S.key], so = arr(sub.order);
          if (sameIds(so, ids) && (so.join() !== order.join() || E.normFormation(sub.formation) !== formation)) { order = so; formation = E.normFormation(sub.formation); draw(); }
        }
        const ready = S.lineups || {}; rc(status, h("h3", {}, "Managers"), ...arr(S.game && S.game.keys).map((k) => h("div", { class: "row between" }, nameOf(k), h("span", { class: "muted" }, ready[k] && ready[k].done ? "ready" : "arranging…"))));
        readyBtn.textContent = S.lineups && S.lineups[S.key] && S.lineups[S.key].done ? "Ready (tap to change)" : "Ready";
      },
      destroy() { if (typeof document.removeEventListener === "function") { document.removeEventListener("pointermove", move); document.removeEventListener("pointerup", up); document.removeEventListener("pointercancel", up); } }
    };
  }

  // =============== MATCH ===============
  const pensTxt = (r) => (r && r.pens ? ` (${r.pens[0]}-${r.pens[1]} pens)` : "");
  // The bracket as plain rows: who played whom, the score, who is still to be decided.
  const bracketEl = (T, me) => {
    const br = T.bracket, res = T.res || {}; if (!br || !arr(br.rounds).length) return h("p", { class: "muted" }, "No bracket.");
    const nm2 = (k) => (k ? nameOf(k) : k === null ? "bye" : "to be decided");
    return h("div", { class: "fb-br" }, arr(br.rounds).map((rd) => h("div", {}, arr(rd).map((m) => {
      const r = res[m.id], [a, b2] = B.sidesOf(m, res); if (r && r.bye && !r.w) return null;
      const mine = a === me || b2 === me;
      return h("div", { class: "row between fb-brm" + (mine ? " me" : "") }, h("span", { class: "muted small" }, m.label), h("span", {}, r && !r.bye ? [h("b", { class: r.w === a ? "win" : "" }, nm2(a)), `  ${r.score[0]} - ${r.score[1]}${pensTxt(r)}  `, h("b", { class: r.w === b2 ? "win" : "" }, nm2(b2))] : r && r.bye ? `${nm2(r.w)} goes through` : `${nm2(a)} v ${nm2(b2)}`));
    }))));
  };
  const rankList = (order) => h("ol", { class: "fb-rank" }, arr(order).map((k) => h("li", {}, nameOf(k))));

  function matchScreen() {
    let curId = "", plan = null, names = ["", ""], cmpDone = "", watchId = "", viewer = null, tickKey = "";
    const plans = {}, tickRows = {};
    const head = h("div", { class: "qz-head" }), stage = h("div", {}), side = h("div", { class: "card" });
    screen(head, h("div", { class: "card" }, stage), side);
    const planFor = (T, f) => (plans[f.id] ||= planOf(ctx.entities.map, T, f, [nameOf(f.a), nameOf(f.b)]));
    const xiList = (T, k) => { const ids = arr(T.lineups[k]).slice(0, E.XI).map((id) => ent(id)); return h("div", { class: "fb-xi" }, h("b", {}, `${nameOf(k)} · ${(T.formations || {})[k] || E.DEFAULT_FORMATION}`), ...ids.map((p) => h("span", {}, `${p.pos} ${p.name} (${p.ovr})`))); };
    const speedPill = (f) => `${(C.SPEEDS[C.normSpeed(f.speed || (f.style === "quick" ? "quick" : "watch"))] || C.SPEEDS.full).label}${f.disc ? " · cards on" : ""}`;
    function compareView(T, f) {
      const teams = [f.a, f.b].map((k) => { const pl = arr(T.lineups[k]).map(ent); return { xi: pl.slice(0, E.XI), bench: pl.slice(E.XI), formation: (T.formations || {})[k] || E.DEFAULT_FORMATION }; });
      const c = E.compare(teams[0], teams[1]), mx = 100;
      return h("div", { class: "fb-cmp" }, c.rows.map((r) => h("div", { class: "r" }, h("b", {}, r.a), h("div", { class: "bar l" }, h("i", { style: `width:${Math.min(100, (r.a / mx) * 100)}%` })), h("span", { class: "lab" }, r.label), h("div", { class: "bar rr" }, h("i", { style: `width:${Math.min(100, (r.b / mx) * 100)}%` })), h("b", {}, r.b))),
        h("p", { class: "muted small center" }, `Chemistry bonus: +${(c.chem[0] * 0.4).toFixed(1)}% / +${(c.chem[1] * 0.4).toFixed(1)}%. This is only a preview: the match is decided by the simulation.`));
    }
    const liveText = (f, now) => {
      const p = planFor(S.tour, f), M = p.M, r = now - f.startAt;
      if (r < 0) return [`${nameOf(f.a)} v ${nameOf(f.b)}`, `kicks off in ${secs(-r)}s`];
      if (!M.animated) return [`${nameOf(f.a)} ${M.finalScore[0]} - ${M.finalScore[1]} ${nameOf(f.b)}`, "full time"];
      const sc = C.scoreAt(M, r).score, done = r >= M.end;
      return [`${nameOf(f.a)} ${sc[0]} - ${sc[1]} ${nameOf(f.b)}${done ? pensTxt(p.pens ? { pens: p.pens.score } : null) : ""}`, done ? "full time" : r >= M.total ? "penalties" : `${Math.floor(C.minuteOf(M, r))}'`];
    };
    function ticker(fights) {   // the matches of this round: live score, tap to watch another one
      const key = fights.map((f) => f.id).join() + "|" + watchId + "|" + curId;
      if (key === tickKey) return; tickKey = key;
      for (const k of Object.keys(tickRows)) delete tickRows[k];
      if (fights.length < 2) { rc(side); side.hidden = true; return; }
      side.hidden = false;
      rc(side, h("h4", {}, "Matches this round"), ...fights.map((f) => { const sc = h("span", {}), st = h("span", { class: "muted small" }); tickRows[f.id] = { sc, st };
        return h("div", { class: "row between fb-tick" + (f.id === curId ? " me" : "") }, h("span", {}, h("b", {}, f.label), " ", sc), h("span", {}, st, f.id === curId ? null : h("button", { class: "btn small", type: "button", onclick: () => { watchId = f.id; api.update(); } }, "Watch")));
      }));
    }
    function setup(T, f) {
      curId = f.id; cmpDone = ""; plan = planFor(T, f); names = [nameOf(f.a), nameOf(f.b)];
      if (viewer) viewer.destroy();
      viewer = createViewer({ h, N, ent, onSkip: () => { if (f.a === S.key || f.b === S.key) N.patch(S.code, "", { [`lineups/${S.key}/skip`]: f.id }).catch(() => {}); } });   // skipping is local, but the host ends the match early once both managers have skipped
      viewer.load(plan.M, f.startAt, f.id); viewer.start();
    }
    function between(T) {
      const fin = T.state === "finishing" || T.state === "done";
      rc(stage, h("h3", {}, fin ? "Tournament complete" : "Next match soon…"), bracketEl(T, S.key));
      if (isHost() && T.state === "awaitNext") stage.append(h("button", { class: "btn primary", onclick: () => { const r = ctx.runner(); if (r && r.nextFight) r.nextFight(); } }, "Start next match now"));
      if (viewer) { viewer.destroy(); viewer = null; } curId = ""; plan = null; side.hidden = true; tickKey = "";
    }
    const api = {
      update() {
        const T = S.tour; if (!T) { rc(stage, h("p", { class: "muted center" }, "Loading…")); return; }
        const ids = arr(T.current).length ? arr(T.current) : T.currentFight ? [T.currentFight] : [], fights = T.state === "playing" ? ids.map((id) => (T.fights || {})[id]).filter((f) => f && f.a && f.b) : [];
        if (!fights.length) { if (curId || !stage.firstChild || stage.dataset.b !== T.state) { stage.dataset.b = T.state; between(T); } rc(head, h("span", { class: "qz-step" }, "Match phase"), h("span", { class: "pill" }, ({ awaitNext: "between matches", finishing: "wrapping up", done: "finished" })[T.state] || T.state)); return; }
        stage.dataset.b = "";
        const f = fights.find((x) => x.id === watchId) || fights.find((x) => x.a === S.key || x.b === S.key) || fights[0];
        rc(head, h("span", { class: "qz-step" }, mdLabel(f.label)), h("span", { class: "pill" }, speedPill(f)));
        if (f.id !== curId) { setup(T, f); this.paintStage(T, f, true); }
        ticker(fights);
      },
      paintStage(T, f, force) {
        const pre = N.now() < f.startAt, key = (pre ? "pre" : "play") + f.id;
        if (!force && cmpDone === key) return;
        cmpDone = key;
        if (pre) rc(stage, h("div", { class: "fb-row-vs" }, h("b", {}, names[0]), h("span", { class: "muted" }, "vs"), h("b", {}, names[1]), h("span", { class: "pill" }, speedPill(f))), h("h4", { class: "center" }, "Team comparison"), compareView(T, f), h("div", { class: "row between" }, xiList(T, f.a), xiList(T, f.b)), h("p", { class: "muted center", "data-kickoff": "1" }));
        else rc(stage, viewer.el);
      },
      tick() {
        const T = S.tour, now = N.now(); if (!T || T.state !== "playing" || !plan) return;
        const f = (T.fights || {})[curId]; if (!f) return;
        this.paintStage(T, f, false);
        if (now < f.startAt) { const k = stage.querySelector("[data-kickoff]"); if (k) k.textContent = `Kick-off in ${secs(f.startAt - now)}s`; }
        else if (viewer && !viewer.running) viewer.paint(now);
        for (const id of Object.keys(tickRows)) { const fx = (T.fights || {})[id]; if (!fx) continue; const [a, b] = liveText(fx, now); tickRows[id].sc.textContent = a; tickRows[id].st.textContent = b; }
      },
      destroy() { if (viewer) viewer.destroy(); viewer = null; }
    };
    return api;
  }

  // =============== RESULTS ===============
  function resultsScreen() {
    const body = h("div", { class: "card" });
    screen(h("h1", {}, "Final standings"), body, h("button", { class: "btn primary", onclick: () => ctx.leave() }, "Leave room"));
    return { update() {
      const r = (S.game && S.game.results) || {}, T = S.tour || {}, ch = arr(r.champion);
      rc(body, ch.length ? h("p", { class: "fb-champ" }, `🏆 ${ch.map(nameOf).join(" & ")}`) : null, arr(r.order).length ? rankList(r.order) : null, T.bracket ? bracketEl(T, S.key) : h("p", { class: "muted" }, "No results recorded."),
        ...arr(r.order).map((k) => h("div", { class: "fb-xi" }, h("b", {}, `${nameOf(k)} · ${(T.formations || {})[k] || E.DEFAULT_FORMATION}`), h("div", { class: "row wrap" }, arr(T.lineups && T.lineups[k]).slice(0, E.XI).map((id) => ctx.icon(ent(id)))))));
    } };
  }
  return { lineup: lineupScreen, match: matchScreen, results: resultsScreen };
}
