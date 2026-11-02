// js/leaderboard.js: the Leaderboard screen. createLeaderboard({ h, N, onBack }) returns { node, destroy }.
// World tabs (All games + the four worlds), sort chips, a Hall of Fame strip, the podium and ranking, and a profile sheet when a row is tapped.
// All the numbers come from js/stats.js; the look is in styles/leaderboard.css.
import * as ST from "./stats.js";

const TABS = [{ id: "all", label: "All games", emoji: "🌍" }, ...ST.WORLDS];
const MEDAL = ["🥇", "🥈", "🥉"];
const pct = (v) => Math.round(v * 100) + "%";

export function createLeaderboard({ h, N, onBack }) {
  let nodes = null, error = null, tab = "all", sortId = "titles", query = "", sheet = null, alive = true;
  const world = () => (tab === "all" ? null : tab);
  const list = h("div", { class: "lb-list" }), hof = h("div", { class: "lb-hof" }), tabsEl = h("div", { class: "lb-tabs", role: "tablist" }), sortsEl = h("div", { class: "lb-sorts" });
  const search = h("input", { class: "lb-search", type: "search", placeholder: "Find a player", "aria-label": "Find a player", autocomplete: "off", oninput: () => { query = search.value.trim().toLowerCase(); draw(); } });
  const sheetHost = h("div", { class: "lb-sheetHost" });
  const refreshBtn = h("button", { class: "btn small", onclick: () => load() }, "Refresh");
  const node = h("div", { class: "lb" }, h("div", { class: "lb-bar" }, h("button", { class: "btn small", onclick: () => onBack() }, "Back"), refreshBtn), tabsEl, hof, sortsEl, search, list, sheetHost);

  const avatar = (name, cls = "") => { const a = ST.avatarOf(name); return h("span", { class: "lb-av " + cls, style: `--hue:${a.hue}`, "aria-hidden": "true" }, a.emoji); };
  const formDots = (a) => h("span", { class: "lb-form", title: "Last games" }, (a.form || []).slice(-5).map((r) => h("i", { class: r === "W" ? "w" : "l" })));
  const msg = (t) => h("p", { class: "lb-msg" }, t);

  function drawTabs() {
    tabsEl.replaceChildren(...TABS.map((t) => h("button", { class: "lb-tab", role: "tab", "aria-selected": String(t.id === tab), onclick: () => { tab = t.id; draw(); } }, h("span", {}, t.emoji), " ", t.label)));
    sortsEl.replaceChildren(...ST.SORTS.map((s) => h("button", { class: "lb-chip", "aria-pressed": String(s.id === sortId), onclick: () => { sortId = s.id; draw(); } }, s.label)));
  }
  function drawHof() {
    const best = nodes ? ST.hallOfFame(nodes, world()) : [];
    if (!best.length) { hof.replaceChildren(); hof.hidden = true; return; }
    hof.hidden = false;
    hof.replaceChildren(h("h3", {}, "Hall of Fame"), h("div", { class: "lb-hofrow" }, best.map((b) => h("button", { class: "lb-hofcard", onclick: () => openProfile(b.key) },
      h("span", { class: "lb-hofem" }, b.emoji), h("b", {}, b.title), h("span", { class: "lb-hofname" }, b.name), h("small", {}, b.text)))));
  }
  function row(r) {
    const n = r.node, a = r.a, top = r.rank <= 3;
    return h("button", { class: "lb-row" + (top ? " top t" + r.rank : ""), onclick: () => openProfile(n.key) },
      h("span", { class: "lb-rank" }, top ? MEDAL[r.rank - 1] : String(r.rank)), avatar(n.name),
      h("span", { class: "lb-who" }, h("b", {}, n.name || n.key), h("small", {}, `${a.games} game${a.games === 1 ? "" : "s"} · ${a.titles} title${a.titles === 1 ? "" : "s"}`), formDots(a)),
      h("span", { class: "lb-score" }, h("b", {}, r.shown), h("small", {}, ST.SORTS.find((s) => s.id === sortId).label)));
  }
  function draw() {
    drawTabs(); drawHof();
    if (error) return list.replaceChildren(msg("Could not load the leaderboard: " + error));
    if (!nodes) return list.replaceChildren(msg("Loading…"));
    let rows = ST.rank(nodes, world(), sortId);
    if (query) rows = rows.filter((r) => String(r.node.name || "").toLowerCase().includes(query));
    if (!rows.length) {
      const why = query ? "Nobody matches that name." : sortId === "winrate" ? "Win rate needs at least 3 matches played." : sortId === "grade" ? "Draft grades need at least 2 drafts." : "No games recorded here yet. Finish a game and it shows up.";
      return list.replaceChildren(msg(why));
    }
    list.replaceChildren(...rows.map(row));
  }

  // ---------- profile sheet ----------
  const stat = (label, value, sub) => h("div", { class: "lb-stat" }, h("b", {}, value), h("span", {}, label), sub ? h("small", {}, sub) : null);
  function closeSheet() { sheet = null; sheetHost.replaceChildren(); document.removeEventListener("keydown", onKey, true); }
  const onKey = (e) => { if (e.key === "Escape") closeSheet(); };
  function openProfile(key) {
    const n = (nodes || []).find((x) => x.key === key); if (!n) return;
    const w = world(), a = ST.aggOf(n, w), all = ST.aggOf(n, null), played = a.games > 0, rec = a.rec || {}, rv = ST.rivals(n), badges = ST.badgesOf(n);
    const games = (a.mw + a.ml + a.md);
    const worldRows = ST.WORLDS.map((x) => ({ x, a: ST.aggOf(n, x.id) })).filter((r) => r.a.games > 0);
    const maxG = Math.max(1, ...worldRows.map((r) => r.a.games));
    const botRows = Object.entries(n.bots || {}).map(([id, v]) => ({ id, v, t: v.w + v.l + v.d })).filter((r) => r.t > 0).sort((p, q) => q.t - p.t);
    const worldName = w ? ST.WORLDS.find((x) => x.id === w).label : "all games";
    const body = h("div", { class: "lb-sheet-body" },
      h("div", { class: "lb-ph" }, avatar(n.name, "big"), h("div", {}, h("h2", {}, n.name || n.key), h("p", { class: "lb-sub" }, `${all.games} games · ${all.titles} titles · ${worldName}`), formDots(all))),
      !played ? msg("Nothing played in this game yet.") : h("div", {},
        h("div", { class: "lb-grid" },
          stat("Titles", String(a.titles), `${pct(ST.titleRate(a))} of games`), stat("Win rate", games ? pct(ST.winRate(a)) : "-", `${a.mw}W ${a.ml}L ${a.md}D`),
          stat("Best streak", String(a.bestStreak), a.streak > 0 ? `now ${a.streak} in a row` : ""), stat("Podiums", String(a.podiums))),
        h("h3", {}, "Drafting"),
        h("div", { class: "lb-grid" },
          stat("Draft grade", a.gradeN ? ST.gradeLetter(ST.avgGrade(a)) + " " + Math.round(ST.avgGrade(a)) : "-", a.gradeN ? `over ${a.gradeN} draft${a.gradeN === 1 ? "" : "s"}` : ""),
          stat("Avg price", a.picks ? "$" + ST.avgPrice(a).toFixed(1) : "-", `${a.picks} picks`), stat("Snipes", String(a.snipes), "won in the last 2s"), stat("Bidding wars", String(a.wars), "6+ bids on a lot")),
        h("ul", { class: "lb-recs" },
          rec.steal ? h("li", {}, h("span", {}, "🕵️ Best steal"), h("b", {}, `${rec.steal.ent} for $${rec.steal.price}`), h("small", {}, `worth about $${Math.round(rec.steal.fair)}`)) : null,
          rec.overpay && rec.overpay.over > 0 ? h("li", {}, h("span", {}, "💸 Biggest overpay"), h("b", {}, `${rec.overpay.ent} for $${rec.overpay.price}`), h("small", {}, `worth about $${Math.round(rec.overpay.fair)}`)) : null,
          rec.blowout ? h("li", {}, h("span", {}, "💥 Biggest win"), h("b", {}, `By ${rec.blowout.margin}${rec.blowout.score ? " (" + rec.blowout.score.join("-") + ")" : ""}`), h("small", {}, "vs " + rec.blowout.vs)) : null)),
      !w && worldRows.length ? h("div", {}, h("h3", {}, "By game"), h("div", { class: "lb-worlds" }, worldRows.map((r) => h("div", { class: "lb-wrow" }, h("span", {}, r.x.emoji + " " + r.x.label),
        h("span", { class: "lb-wbar", style: `--p:${r.a.games / maxG}` }), h("small", {}, `${r.a.titles}/${r.a.games}`))))) : null,
      h("h3", {}, "Rivals"),
      rv.list.length ? h("div", { class: "lb-rivals" },
        rv.nemesis ? h("p", {}, "😈 Nemesis: ", h("b", {}, rv.nemesis.name), ` (${rv.nemesis.w}-${rv.nemesis.l}${rv.nemesis.d ? "-" + rv.nemesis.d : ""} against them)`) : null,
        rv.victim ? h("p", {}, "🎯 Favourite victim: ", h("b", {}, rv.victim.name), ` (${rv.victim.w}-${rv.victim.l}${rv.victim.d ? "-" + rv.victim.d : ""})`) : null,
        h("div", { class: "lb-h2h" }, rv.list.slice(0, 6).map((r) => h("span", { class: "lb-pillx" }, `${r.name} ${r.w}-${r.l}${r.d ? "-" + r.d : ""}`)))) : msg("Head-to-head results show up after matches against other people."),
      botRows.length ? h("div", {}, h("h3", {}, "Against bots"), h("div", { class: "lb-h2h" }, botRows.map((r) => h("span", { class: "lb-pillx" }, `${r.id} ${r.v.w}-${r.v.l}${r.v.d ? "-" + r.v.d : ""}`)))) : null,
      h("h3", {}, `Badges ${badges.filter((b) => b.earned).length}/${badges.length}`),
      h("div", { class: "lb-badges" }, badges.map((b) => h("div", { class: "lb-badge" + (b.earned ? " got" : "") }, h("span", { class: "lb-bem" }, b.earned ? b.emoji : "🔒"), h("b", {}, b.label), h("small", {}, b.desc)))));
    sheet = h("div", { class: "lb-sheet", role: "dialog", "aria-modal": "true", "aria-label": (n.name || key) + " profile", onclick: (e) => { if (e.target === sheet) closeSheet(); } },
      h("div", { class: "lb-sheet-card" }, h("button", { class: "lb-x", "aria-label": "Close", onclick: closeSheet }, "×"), body));
    sheetHost.replaceChildren(sheet); document.addEventListener("keydown", onKey, true);
    const x = sheet.querySelector(".lb-x"); if (x && x.focus) x.focus();
  }

  async function load() {
    error = null; refreshBtn.disabled = true; draw();
    try { const got = await N.allStats(); if (!alive) return; nodes = got; } catch (e) { if (!alive) return; error = e.message || String(e); }
    refreshBtn.disabled = false; draw();
  }
  draw(); load();
  return { node, destroy() { alive = false; closeSheet(); } };
}
