// modes/basketball/stats.js: box-score helpers (pure, no DOM): team stat rows for the "team stats" table and running leaders for the live game centre.
const pct = (m, a) => (a ? Math.round((m / a) * 1000) / 10 : 0);

// rows of { label, v: [a, b] (display strings), lead: 0 | 1 | -1 (who is ahead; -1 = level / not a contest) }
export function teamRows(sim) {
  const [a, b] = sim.team, rows = [];
  const add = (label, va, vb, na, nb, lowerBetter) => { const d = na === nb ? -1 : (na > nb) !== !!lowerBetter ? 0 : 1; rows.push({ label, v: [va, vb], lead: d }); };
  add("Field goals", `${a.fgm}-${a.fga} (${pct(a.fgm, a.fga)}%)`, `${b.fgm}-${b.fga} (${pct(b.fgm, b.fga)}%)`, pct(a.fgm, a.fga), pct(b.fgm, b.fga));
  add("Three-pointers", `${a.tpm}-${a.tpa} (${pct(a.tpm, a.tpa)}%)`, `${b.tpm}-${b.tpa} (${pct(b.tpm, b.tpa)}%)`, a.tpm, b.tpm);
  add("Free throws", `${a.ftm}-${a.fta} (${pct(a.ftm, a.fta)}%)`, `${b.ftm}-${b.fta} (${pct(b.ftm, b.fta)}%)`, a.ftm, b.ftm);
  add("Rebounds", `${a.reb} (${a.oreb} off)`, `${b.reb} (${b.oreb} off)`, a.reb, b.reb);
  add("Assists", a.ast, b.ast, a.ast, b.ast);
  add("Steals", a.stl, b.stl, a.stl, b.stl);
  add("Blocks", a.blk, b.blk, a.blk, b.blk);
  add("Turnovers", a.tov, b.tov, a.tov, b.tov, true);
  add("Personal fouls", a.pf, b.pf, a.pf, b.pf, true);
  add("Points in the paint", a.paint, b.paint, a.paint, b.paint);
  add("Fast-break points", a.fastbreak, b.fastbreak, a.fastbreak, b.fastbreak);
  add("Second-chance points", a.second, b.second, a.second, b.second);
  add("Points off turnovers", a.offTov, b.offTov, a.offTov, b.offTov);
  add("Bench points", a.bench, b.bench, a.bench, b.bench);
  add("Biggest lead", a.maxLead, b.maxLead, a.maxLead, b.maxLead);
  add("Longest scoring run", a.run, b.run, a.run, b.run);
  add("Timeouts used", a.timeouts, b.timeouts, 0, 0);
  rows.push({ label: "Lead changes / ties", v: [a.leadChanges + " / " + a.ties, b.leadChanges + " / " + b.ties], lead: -1 });
  return rows;
}

// running totals from the events shown so far: { [side]: { [playerId]: { n, pts, reb, ast } } } and the best scorer of each side
export function leaders(events) {
  const t = [{}, {}], get = (s, id, n) => (t[s][id] ||= { id, n, pts: 0, reb: 0, ast: 0 });
  for (const e of events) {
    if (e.e === "shot" && e.made) { get(e.s, e.p, e.pn).pts += e.pts; if (e.a) get(e.s, e.a, e.an).ast++; }
    else if (e.e === "ft" && e.made) get(e.s, e.p, e.pn).pts++;
    else if (e.e === "reb") get(e.s, e.p, e.pn).reb++;
  }
  return t.map((o) => Object.values(o).sort((x, y) => y.pts - x.pts || y.reb + y.ast - (x.reb + x.ast))[0] || null);
}
// quarter scores shown so far from the events: [{ q, a, b, done }]
export function quarterTable(events, score) {
  const out = []; let pa = 0, pb = 0, q = 1;
  for (const e of events) if (e.e === "qend") { out.push({ q, a: e.score[0] - pa, b: e.score[1] - pb, done: true }); pa = e.score[0]; pb = e.score[1]; q++; }
  const last = events[events.length - 1];
  if (last && last.e !== "end" && last.e !== "qend" || (!out.length && events.length)) out.push({ q, a: score[0] - pa, b: score[1] - pb, done: false });
  return out;
}
