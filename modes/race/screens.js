import { simulateRace, positionAt, courseLength, fmtTime, slotRating, courseFor, playbackOf } from "./race.js";

const svgUrl = (body) => `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80" preserveAspectRatio="none">${body}</svg>`)}")`;
const ART = {
  sprint: () => `background-image:${svgUrl('<ellipse cx="40" cy="14" rx="20" ry="6" fill="#fff" opacity=".8"/><ellipse cx="120" cy="24" rx="16" ry="5" fill="#fff" opacity=".7"/><rect y="46" width="160" height="34" fill="#4c8b36"/><rect y="52" width="160" height="26" fill="#b5533a"/><path d="M0 52H160M0 65H160M0 77H160" stroke="#fff" stroke-width="1.5" opacity=".85"/><path d="M0 58.5H160M0 71H160" stroke="#fff" stroke-width="1" stroke-dasharray="8 8" opacity=".5"/>')},linear-gradient(#78b9f0 0 46%,#4c8b36 46%)`,
  distance: () => `background-image:${svgUrl('<circle cx="130" cy="18" r="10" fill="#fff3c4"/><path d="M0 52Q40 28 80 48T160 46V80H0Z" fill="#d9a65a"/><path d="M0 64Q50 44 100 62T160 60V80H0Z" fill="#c28a3e"/><path d="M0 74Q40 62 90 72T160 70V80H0Z" fill="#a8702f"/><rect x="30" y="34" width="4" height="14" rx="2" fill="#4e8a3c"/><rect x="24" y="38" width="4" height="6" rx="2" fill="#4e8a3c"/><rect x="36" y="36" width="4" height="6" rx="2" fill="#4e8a3c"/>')},linear-gradient(#f0a566,#f8dcaa 60%)`,
  swim: () => `background-image:${svgUrl('<path d="M0 18q10-6 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0" fill="none" stroke="#fff" stroke-width="2" opacity=".35"/><path d="M0 44q10-6 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0" fill="none" stroke="#fff" stroke-width="2" opacity=".3"/><path d="M0 68q10-6 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0" fill="none" stroke="#fff" stroke-width="2" opacity=".25"/><path d="M0 31H160M0 57H160" stroke="#ff5c5c" stroke-width="4" stroke-dasharray="7 7" opacity=".9"/><path d="M0 31H160M0 57H160" stroke="#fff" stroke-width="4" stroke-dasharray="7 7" stroke-dashoffset="7" opacity=".9"/>')},linear-gradient(#2a86d1,#0b3a66)`,
  climb: () => `background-image:${svgUrl('<polygon points="0,80 0,40 28,12 52,36 84,6 120,38 142,22 160,40 160,80" fill="#6c7280"/><polygon points="0,80 40,48 84,80" fill="#8a91a0" opacity=".6"/><polygon points="84,80 120,44 160,80" fill="#565c6a" opacity=".6"/><polygon points="28,12 20,24 36,24" fill="#fff"/><polygon points="84,6 74,22 94,22" fill="#fff"/><g fill="#ffd23a"><circle cx="24" cy="50" r="2.5"/><circle cx="60" cy="58" r="2.5"/><circle cx="100" cy="52" r="2.5"/><circle cx="132" cy="60" r="2.5"/></g><path d="M12 80V30M140 80V34" stroke="#e8e0c8" stroke-width="1.5" stroke-dasharray="3 3" opacity=".7"/>')},linear-gradient(#8fb2d6,#d3dfec)`,
  rough: () => `background-image:${svgUrl('<g fill="#2e7d3a"><polygon points="14,64 28,22 42,64"/><polygon points="70,60 86,14 102,60"/><polygon points="120,66 136,28 152,66"/></g><g fill="#1f5a2c"><polygon points="40,66 52,34 64,66"/><polygon points="100,68 112,40 124,68"/></g><g fill="#5a3b20"><rect x="26" y="62" width="4" height="10"/><rect x="84" y="58" width="4" height="12"/><rect x="134" y="64" width="4" height="10"/></g><rect y="70" width="160" height="10" fill="#0b1c10"/><rect x="48" y="66" width="30" height="7" rx="3.5" fill="#6b4a2b"/><ellipse cx="112" cy="72" rx="9" ry="5" fill="#77808a"/><ellipse cx="6" cy="73" rx="7" ry="4" fill="#656e78"/>')},linear-gradient(#1b4425,#0e2414)`
};
const PALETTE = ["#5f84ff", "#ff5c95", "#33d6c0", "#ffd23a", "#b18cff", "#ff9a3c"];
const ART_CSS = Object.entries(ART).map(([id, f]) => `.rc-art-${id}{${f()}}`).join("\n");

const CSS = ART_CSS + `
.rc-strip{display:flex;border:2px solid var(--edge,#888);border-radius:6px;overflow:hidden;margin:6px 0}
.rc-seg{background-repeat:repeat-x;background-size:auto 100%;padding:6px;font-size:.72rem;font-weight:700;color:#fff;text-shadow:0 1px 2px #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-right:1px solid rgba(255,255,255,.35);min-width:0}
.rc-seg:last-child{border-right:0}.rc-seg.now{outline:2px solid var(--yellow,#ffd23a);outline-offset:-2px}
.rc-lane{margin:10px 0}.rc-lane .top{display:flex;justify-content:space-between;gap:8px;font-size:.85rem;margin-bottom:2px}
.rc-track{position:relative;height:84px;border:2px solid var(--rule,#555);border-radius:8px;overflow:hidden;display:flex;background:#111}
.rc-track .seg{position:relative;height:100%;background-repeat:repeat-x;background-size:auto 100%;border-left:2px dashed rgba(255,255,255,.55)}
.rc-track .seg:first-child{border-left:0}
.rc-track::before{content:"";position:absolute;left:0;top:0;bottom:0;width:6px;background:#fff;z-index:1;opacity:.85}
.rc-track::after{content:"";position:absolute;right:0;top:0;bottom:0;width:14px;z-index:1;background:repeating-conic-gradient(#fff 0 25%,#111 0 50%) 0 0/14px 14px}
.rc-slot{position:absolute;left:10px;bottom:6px;width:34px;height:34px;color:rgba(255,255,255,.55);filter:drop-shadow(0 1px 1px rgba(0,0,0,.7));transition:color .3s,transform .3s}
.rc-slot b{position:absolute;left:-4px;top:-8px;font-size:.62rem;background:rgba(0,0,0,.6);color:#fff;border-radius:8px;padding:0 4px}
.rc-slot.on{color:var(--pc);transform:scale(1.25);filter:drop-shadow(0 0 5px var(--pc))}
.rc-slot.done{color:var(--pc);opacity:.55}
.rc-sil{display:inline-block;width:100%;height:100%;background:currentColor;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:center;mask-position:center;-webkit-mask-size:contain;mask-size:contain}
.rc-sil.emoji{background:none;font-size:26px;line-height:34px;text-align:center}
.rc-run{position:absolute;top:50%;width:42px;height:42px;margin:-21px 0 0 -21px;border-radius:50%;background:var(--pc);border:3px solid #fff;color:#0b1210;padding:6px;box-sizing:border-box;transition:left .27s linear;z-index:3;box-shadow:0 2px 6px rgba(0,0,0,.6)}
.rc-lane.pass .rc-run{animation:rcpass .9s ease-out}
@keyframes rcpass{0%{box-shadow:0 0 0 0 var(--pc)}60%{box-shadow:0 0 0 16px transparent;transform:scale(1.25)}100%{box-shadow:0 2px 6px rgba(0,0,0,.6)}}
.rc-lane.done .rc-run{border-color:var(--yellow,#ffd23a)}
.rc-dot{display:inline-block;width:12px;height:12px;border-radius:50%;background:var(--pc);margin-right:6px;vertical-align:middle}
.rc-clock{font-size:1.5rem;font-weight:800;text-align:center}
.rc-log{max-height:240px;overflow:auto;font-size:.85rem}.rc-log div{padding:2px 0;border-bottom:1px dashed var(--rule,#444)}
.rc-log .e-lead,.rc-log .e-end,.rc-log .e-finish{font-weight:800}.rc-log .e-stumble,.rc-log .e-panic,.rc-log .e-fumble,.rc-log .e-headwind{color:#ff8fb5}
.rc-log .e-burst,.rc-log .e-secondwind,.rc-log .e-tailwind{color:var(--teal,#33d6c0)}.rc-log .e-standings{color:var(--yellow,#ffd23a)}
.rc-warn{border:2px solid var(--pink,#ff5c95);background:rgba(255,92,149,.14);padding:8px 10px;border-radius:6px;font-size:.85rem}
.rc-tbl td,.rc-tbl th{white-space:nowrap}.rc-tbl .win{font-weight:800;color:var(--yellow,#ffd23a)}
.legtag{display:block;font-size:.72rem;font-weight:700;color:var(--muted,#aaa)}
.legtag.t-great{color:var(--teal,#33d6c0)}.legtag.t-good{color:#a6e08a}.legtag.t-poor{color:#ffb86b}.legtag.t-awful{color:#ff8fb5}
.lrow.reserve{opacity:.6;border-style:dashed}
`;
function ensureCss() {
  try {
    if (document.getElementById && document.getElementById("race-css")) return;
    const st = document.createElement("style"); st.id = "race-css"; st.textContent = CSS;
    (document.head || document.documentElement).append(st);
  } catch (e) { /* error */}
}
const ord = (n) => n + (["st", "nd", "rd"][((n + 90) % 100 - 10) % 10 - 1] || "th");
const prepend = (parent, node) => { if (typeof parent.prepend === "function") parent.prepend(node); else parent.append(node); };

export function courseOfRoom(ctx) {
  const race = ctx.pack && ctx.pack.race, G = ctx.S.game;
  if (!race || !G || G.poolSeed == null) return null;
  return courseFor(race, ctx.settings(), G.poolSeed);
}
export const lineupHooks = {
  hint(ctx) {
    const c = courseOfRoom(ctx);
    return "Slot 1 runs leg 1, slot 2 runs leg 2, and so on: the order is your relay order. Put each " + ctx.pack.nouns.singular + " on the leg it is best at (marine animals swim, flyers climb...)." +
      (c ? ` Course: ${c.map((l) => `${l.icon} ${l.label} ${l.len} m`).join("  >  ")}. Anything below the last leg stays in reserve.` : "");
  },
  slot(i, a, ctx) {
    const c = courseOfRoom(ctx), h = ctx.h;
    if (!c) return null;
    if (i >= c.length) return { cls: "reserve", node: h("span", { class: "legtag" }, "Reserve: does not run") };
    const leg = c[i], r = slotRating(ctx.pack.race, a, leg);
    return { cls: "legrow", node: h("span", { class: "legtag t-" + r.word }, `Leg ${i + 1}: ${leg.icon} ${leg.label}, ${leg.len} m. Fit: ${r.word} (x${r.rel.toFixed(2)})`) };
  }
};

export default function createScreens(ctx) {
  const { h, screen, S, N, nameOf, icon } = ctx;
  const arr = ctx.arr;
  ensureCss();
  const arenaOf = (id) => (ctx.pack.arenas || []).find((a) => a.id === id) || {};
  const legBg = (leg) => { const bg = arenaOf(leg.arena).bg || ["#333", "#555"]; return `background:linear-gradient(90deg,${bg[0]},${bg[1]})`; };

  const silEl = (a) => (a && a.silhouette ? h("span", { class: "rc-sil", style: `-webkit-mask-image:url(${a.silhouette});mask-image:url(${a.silhouette})` }) : h("span", { class: "rc-sil emoji" }, a ? a.emoji : "?"));
  const isRace = (T) => !!(T && T.kind === "race" && T.course && T.lineups && T.result);

  let memo = { key: "", res: null };
  function simFor(T) {
    const key = [T.seed, T.difficulty, arr(T.keys).join(), arr(T.course).map((l) => l.type + l.len).join()].join("|") + JSON.stringify(T.lineups);
    if (memo.key === key) return memo.res;
    const teams = arr(T.keys).map((k) => ({ key: k, name: nameOf(k), animals: arr(T.lineups[k]).map((id) => ctx.entities.map.get(id)).filter(Boolean) }));
    const res = simulateRace({ race: ctx.pack.race, course: arr(T.course), teams, seed: T.seed, difficulty: T.difficulty });
    memo = { key, res }; return res;
  }
  const integrityWarning = (T, res) => (res.digest === T.result.digest ? null :
    h("div", { class: "rc-warn" }, h("b", {}, "Integrity warning: "), `your copy of the game simulated this race differently from the host (yours ${res.order.map(nameOf).join(" > ")}, host ${arr(T.result.order).map(nameOf).join(" > ")}). ` +
      "You may be running a different version of the game or its animal data. The host's result is the official one."));

  function raceScreen() {
    let skipped = false, built = "", res = null, T = null, lanes = [], tableCells = [], shown = 0;
    const head = h("div", { class: "card" }), strip = h("div"), clock = h("div", { class: "rc-clock" }), sub = h("div", { class: "muted small center" });
    const lanesBox = h("div"), tbl = h("div", { class: "card scroll" }), log = h("div", { class: "rc-log" }), warn = h("div"), banner = h("div");
    const skipBtn = h("button", { class: "btn", onclick: () => { skipped = true; paint(); } }, "Skip to the finish");
    const goBtn = h("button", { class: "btn primary", onclick: () => { const r = ctx.runner(); if (r && r.finishRace) r.finishRace(); } }, "Go to results now");
    screen(h("h2", {}, "Relay race"), head, warn, h("div", { class: "card" }, clock, sub, h("div", { class: "row center" }, skipBtn, goBtn), banner, strip, lanesBox), tbl,
      h("div", { class: "card" }, h("h3", {}, "Commentary"), log));
    head.append(h("div", { class: "muted" }, "Waiting for the race to be set up…"));

    const raceMs = () => {
      if (!T || !res) return -1;
      if (skipped) return res.durationMs;
      const el = N.now() - T.startAt; if (el < 0) return -1;
      return Math.min(res.durationMs, el * (res.durationMs / T.playMs));
    };
    function build() {
      const total = courseLength(res.course), n = res.nLegs;
      head.replaceChildren(h("h3", {}, `${n} legs, ${total} m, ${ctx.pack.race.difficulties[T.difficulty] ? ctx.pack.race.difficulties[T.difficulty].label : T.difficulty}`),
        h("div", { class: "muted small" }, "Slot i of your lineup runs leg i. Fit and luck decide each leg; the team with the lowest total time wins (ties: best single leg)."));
      const artOf = (l) => (ART[l.type] ? { class: "rc-art-" + l.type, style: "" } : { class: "", style: legBg(l) });
      strip.replaceChildren(h("div", { class: "rc-strip" }, res.course.map((l) => { const ar = artOf(l); return h("div", { class: "rc-seg " + ar.class, style: `width:${l.len / total * 100}%;${ar.style}`, title: `${l.label}, ${l.len} m` }, `${l.icon} ${l.len}`); })));
      lanes = res.teams.map((t, ti) => {
        const color = PALETTE[Math.max(0, arr(T.keys).indexOf(t.key)) % PALETTE.length];
        const top = h("div", { class: "top" }), runner = h("span", { class: "rc-run" }), rank = h("b");
        const slots = res.course.map((l, i) => h("span", { class: "rc-slot" }, silEl(ctx.entities.map.get(t.legs[i].animal)), h("b", {}, i + 1)));
        const track = h("div", { class: "rc-track" }, res.course.map((l, i) => { const ar = artOf(l); return h("div", { class: "seg " + ar.class, style: `width:${l.len / total * 100}%;${ar.style}` }, slots[i]); }), runner);
        const root = h("div", { class: "rc-lane", style: `--pc:${color}` }, top, track);
        top.append(h("span", {}, h("span", { class: "rc-dot" }), h("b", {}, t.name), t.key === S.key ? h("span", { class: "pill you" }, "you") : null), rank);
        const info = h("span", { class: "muted" }); top.append(info);
        return { ti, root, runner, rank, info, slots, leg: -1, color };
      });
      lanesBox.replaceChildren(...lanes.map((l) => l.root));
      const head2 = ["Player", ...res.course.map((l, i) => `${i + 1} ${l.icon}`), "Total"];
      tableCells = res.teams.map(() => []);
      const rows = res.teams.map((t, ti) => h("tr", {}, h("td", {}, h("span", { class: "rc-dot", style: `--pc:${lanes[ti].color}` }), t.name), ...res.course.map((l, i) => (tableCells[ti][i] = h("td", {}, "-"))), (tableCells[ti][res.nLegs] = h("td", {}, "-"))));
      tbl.replaceChildren(h("h3", {}, "Standings after each leg"), h("table", { class: "tbl rc-tbl" }, h("thead", {}, h("tr", {}, head2.map((x) => h("th", {}, x)))), h("tbody", {}, rows)));
      log.replaceChildren(); shown = 0;
    }
    function paint() {
      T = S.tour;
      if (!isRace(T)) return;
      res = simFor(T);
      const sig = memo.key;
      if (built !== sig) { built = sig; build(); warn.replaceChildren(...[integrityWarning(T, res)].filter(Boolean)); }
      const t = raceMs(), total = courseLength(res.course), done = t >= res.durationMs;
      const pre = t < 0, pb = playbackOf(res);
      clock.textContent = pre ? `Start in ${Math.max(0, Math.ceil((T.startAt - N.now()) / 1000))}s` : fmtTime(Math.max(0, t));
      sub.textContent = pre ? "Check the legs below, the gun is about to go." : done ? "Race over." : `Race time (replayed ${pb.scale.toFixed(1)}x faster than real time)`;
      skipBtn.hidden = done || pre; goBtn.hidden = !(done && ctx.isHost());
      // lanes
      const dists = res.teams.map((r, ti) => positionAt(res, ti, Math.max(0, t)));
      const order = dists.map((p, ti) => ({ ti, d: p.dist, fin: p.finished ? res.teams[ti].total : Infinity })).sort((a, b) => b.d - a.d || a.fin - b.fin);
      lanes.forEach((ln) => {
        const p = dists[ln.ti], team = res.teams[ln.ti], a = ctx.entities.map.get(team.legs[p.leg].animal);
        ln.runner.style.left = Math.max(1.5, Math.min(98.5, p.dist / total * 100)) + "%";
        if (ln.leg !== p.leg) {
          ln.runner.replaceChildren(silEl(a)); const first = ln.leg < 0; ln.leg = p.leg;
          if (!first) { ln.root.classList.add("pass"); setTimeout(() => ln.root.classList.remove("pass"), 900); }
        }
        ln.slots.forEach((sl, i) => { sl.className = "rc-slot" + (pre ? "" : p.finished || i < p.leg ? " done" : i === p.leg ? " on" : ""); });
        ln.root.classList.toggle("done", p.finished);
        ln.info.textContent = pre ? "ready" : p.finished ? `finished in ${fmtTime(team.total)}` : `leg ${p.leg + 1}/${res.nLegs}: ${a ? a.name : "?"}`;
        ln.rank.textContent = pre ? "" : ord(order.findIndex((o) => o.ti === ln.ti) + 1);
      });
      strip.querySelectorAll(".rc-seg").forEach((el, i) => el.classList.toggle("now", !pre && !done && dists.some((p) => p.leg === i && !p.finished)));
      res.legStandings.forEach((st, i) => {
        const doneAt = Math.max(...st.map((x) => x.cum));
        st.forEach((x) => { const ti = res.teams.findIndex((r) => r.key === x.key); tableCells[ti][i].textContent = t >= doneAt ? `${ord(x.rank)} ${fmtTime(x.cum)}` : "-"; });
      });
      res.teams.forEach((r, ti) => { const c = tableCells[ti][res.nLegs]; c.textContent = done ? `${ord(r.rank)} ${fmtTime(r.total)}` : "-"; c.className = done && r.rank === 1 ? "win" : ""; });
      let n = 0; while (n < res.events.length && res.events[n].ms <= t) n++;
      if (n < shown) { log.replaceChildren(); shown = 0; }
      for (; shown < n; shown++) { const e = res.events[shown]; prepend(log, h("div", { class: "e-" + e.type }, `${fmtTime(e.ms)}  ${e.text}`)); }
      banner.replaceChildren(...(done ? [h("div", { class: "card champ center" }, h("div", { class: "muted" }, "Winner"), h("div", { class: "champname" }, nameOf(res.order[0])),
        h("div", { class: "muted small" }, `${fmtTime(res.teams.find((r) => r.key === res.order[0]).total)}. Results in ${Math.max(0, Math.ceil((T.endAt - N.now()) / 1000))}s`))] : []));
    }
    return { update: paint, tick: paint };
  }

  // ================= RESULTS =================
  function resultsScreen() {
    const box = h("div"), detail = h("div", { class: "card scroll" }), again = ctx.playAgainBar({ same: true });
    screen(h("h1", {}, "Race results"), box, detail, again.el, h("div", { class: "row" },
      h("button", { class: "btn", onclick: () => { ctx.leave().then(() => { S.view = "leaderboard"; ctx.schedule(); }); } }, "Leaderboard"),
      h("button", { class: "btn primary", onclick: () => ctx.leave() }, "Leave room")));
    let sig = "";
    return {
      update() {
        again.update();
        const T = S.tour;
        if (!isRace(T)) { box.replaceChildren(h("p", { class: "muted center" }, "No race was recorded.")); detail.replaceChildren(); return; }
        const res = simFor(T), r = T.result, winner = arr(r.order)[0];
        if (sig === memo.key) return; sig = memo.key;
        const w = integrityWarning(T, res);
        box.replaceChildren(...[w, h("div", { class: "card champ" }, h("div", { class: "muted" }, "Winner"), h("div", { class: "champname" }, nameOf(winner)),
          h("div", { class: "muted small" }, fmtTime((r.totals || {})[winner] || 0)))].filter(Boolean));
        const same = !w;
        detail.replaceChildren(h("table", { class: "tbl rc-tbl" },
          h("thead", {}, h("tr", {}, ["#", "Player", "Total", "Best leg", ...(same ? res.course.map((l, i) => `${i + 1} ${l.icon} ${l.label}`) : [])].map((x) => h("th", {}, x)))),
          h("tbody", {}, arr(r.order).map((k, i) => {
            const t = res.teams.find((x) => x.key === k);
            return h("tr", {}, h("td", {}, i + 1), h("td", {}, nameOf(k)), h("td", {}, fmtTime((r.totals || {})[k] || 0)), h("td", {}, fmtTime((r.best || {})[k] || 0)),
              ...(same && t ? t.legs.map((l) => { const a = ctx.entities.map.get(l.animal); return h("td", {}, `${a ? a.name : l.animal} ${fmtTime(l.ms)}`); }) : []));
          }))));
      }
    };
  }
  return { race: raceScreen, results: resultsScreen };
}