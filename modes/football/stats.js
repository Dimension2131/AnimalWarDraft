// modes/football/stats.js: the TEAM STATS table, used LIVE under the commentary and for the final table on the results page (same rows, same code, so they always agree).
// Shots, shots on target and cards come from the simulation's events (the outcome layer); possession, passes, pass accuracy, fouls, corners and offsides are counted from the choreography's play
// (choreo.buildMatch(...) records each one with the moment it happened). Pass accuracy = passes / (passes + times that side lost the ball); a booked or sent-off player has also committed a foul.
const pct = (a, b) => (a + b ? Math.round((100 * a) / (a + b)) : null);
export const ROWS = [["shots", "Shots", "high"], ["onTarget", "Shots on target", "high"], ["possession", "Possession", "high"], ["passes", "Passes", "high"], ["accuracy", "Pass accuracy", "high"], ["fouls", "Fouls", "low"], ["yellow", "Yellow cards", "low"], ["red", "Red cards", "low"], ["offsides", "Offsides", "low"], ["corners", "Corners", "high"]];

// c = raw counts per side; returns the ten rows with the leading side of each marked (more is better for shots/possession/passes/corners, fewer for fouls/cards/offsides; a tie highlights nobody)
function rowsFrom(c) {
  const poss0 = c.possession == null ? 50 : Math.round(c.possession[0]), v = {
    shots: c.shots, onTarget: c.onTarget, possession: [poss0, 100 - poss0], passes: c.passes, accuracy: [pct(c.passes[0], c.turn[0]), pct(c.passes[1], c.turn[1])],
    fouls: [0, 1].map((i) => c.fouls[i] + c.yellow[i] + c.red[i] - c.redSecond[i]), yellow: c.yellow, red: c.red, offsides: c.offsides, corners: c.corners
  };
  return ROWS.map(([key, label, better]) => { const x = v[key], unit = key === "possession" || key === "accuracy" ? "%" : "", ok = x[0] != null && x[1] != null; return { key, label, better, unit, v: x.slice(), lead: !ok || x[0] === x[1] ? -1 : (better === "high" ? x[0] > x[1] : x[0] < x[1]) ? 0 : 1 }; });
}
const count = (list, f) => [0, 1].map((s) => list.filter((e) => e.s === s && f(e)).length);

// the final table (whole match)
export function buildStats({ M, sim }) {
  const ev = sim.events, st = M.stats;
  return { score: sim.score.slice(), pens: M.pens ? M.pens.score.slice() : null, final: true, rows: rowsFrom({
    shots: sim.stats.shots.slice(), onTarget: sim.stats.onTarget.slice(), possession: st.poss, passes: st.passes, turn: st.turnovers, fouls: st.fouls, offsides: st.offsides, corners: st.corners,
    yellow: count(ev, (e) => e.e === "yellow" || (e.e === "red" && e.second)), red: count(ev, (e) => e.e === "red"), redSecond: count(ev, (e) => e.e === "red" && e.second) }) };
}
// the same table at real time r of the film (what has happened so far): used for the live stats during the match
export function liveStats(M, r) {
  const mo = M.moments.filter((m) => m.r <= r && m.ei >= 0), lg = M.statLog.filter((q) => q.r <= r), k = (key) => [0, 1].map((s) => lg.filter((q) => q.s === s && q.k === key).length);
  let pt = null; for (let i = 0; i < M.possTrack.length && M.possTrack[i].r <= r; i++) pt = M.possTrack[i];
  const tot = pt ? pt.c0 + pt.c1 : 0, sc = mo.length ? mo[mo.length - 1].score : [0, 0], final = r >= M.total;
  return { score: sc.slice(), pens: null, final, rows: rowsFrom({
    shots: count(mo, (e) => ["goal", "save", "miss"].includes(e.e)), onTarget: count(mo, (e) => e.e === "goal" || e.e === "save"), possession: tot ? [(pt.c0 / tot) * 100, (pt.c1 / tot) * 100] : null,
    passes: k("passes"), turn: k("turn"), fouls: k("fouls"), offsides: k("offsides"), corners: k("corners"),
    yellow: count(mo, (e) => e.e === "yellow" || (e.e === "red" && e.second)), red: count(mo, (e) => e.e === "red"), redSecond: count(mo, (e) => e.e === "red" && e.second) }) };
}

// ---- the view: both teams' players (face + surname) either side, the numbers in the middle, the leading side of each row highlighted in its team colour. Built once; update() only changes the numbers. ----
// h = the app's element builder; icon(player) -> element; lineups = [[ids], [ids]]; ent(id) -> player; kits = [{shirt}, {shirt}]; title = text above the score
export function createStatsView({ h, names, kits, lineups, ent, icon, surname, title = "TEAM STATS" }) {
  const team = (s) => h("div", { class: "fb-st-team" }, h("b", { class: "fb-st-name", style: `color:${kits[s].shirt}` }, names[s]), h("div", { class: "fb-st-icons" }, lineups[s].map((id) => { const p = ent(id); return h("div", { class: "fb-st-pl" }, icon(p), h("span", {}, surname(p))); })));
  const titleEl = h("div", { class: "fb-st-title" }, title), scoreEl = h("div", { class: "fb-st-score" }, "0 - 0"), penEl = h("div", { class: "muted small" });
  const cells = ROWS.map(([key, label]) => ({ key, a: h("span", { class: "fb-st-v" }), b: h("span", { class: "fb-st-v" }), lab: h("span", { class: "fb-st-lab" }, label) }));
  const el = h("div", { class: "fb-stats" }, h("div", { class: "fb-st-head" }, team(0), h("div", { class: "fb-st-mid" }, titleEl, scoreEl, penEl), team(1)), cells.map((c) => h("div", { class: "fb-st-row" }, c.a, c.lab, c.b)));
  const show = (c, s, r) => { const x = c[s === 0 ? "a" : "b"], lead = r.lead === s; x.textContent = r.v[s] == null ? "–" : `${r.v[s]}${r.unit}`; x.className = "fb-st-v" + (lead ? " lead" : ""); if (x.style) x.style.background = lead ? kits[s].shirt : ""; };
  return {
    el,
    update(st, heading) {
      titleEl.textContent = heading || (st.final ? "TEAM STATS" : "LIVE STATS"); scoreEl.textContent = `${st.score[0]} - ${st.score[1]}`; penEl.textContent = st.pens ? `${st.pens[0]}-${st.pens[1]} on penalties` : "";
      st.rows.forEach((r, i) => { show(cells[i], 0, r); show(cells[i], 1, r); });
    }
  };
}
