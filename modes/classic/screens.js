import * as R from "../../js/rules.js";
import { createRenderer, renderEventLog, renderLossCards } from "../../js/renderer.js";
import * as H from "./host.js";

export default function createScreens(ctx) {
  const { h, screen, arr, secs, toast, schedule, nameOf, isHost, voterId, S, N, simulate, statStrip } = ctx;
  const screens = {};
  screens.fight = () => {
    const sims = {}, skipped = {}; let rend = null, loadedId = null, logIdx = 0, hlId = null, narrUnsub = null, narrFor = null, narr = null, panelSig = "", warned = {}, bad = {};
    const title = h("h2", {}), canvas = h("canvas", { class: "arena" });
    const ctl = h("div", { class: "row wrap stage-ctl" });
    const stage = h("div", {}, canvas, ctl), result = h("div", { class: "card center big result" }), nextBox = h("div", { class: "card" }), panel = h("div", {});
    const logBox = h("div", { class: "logbox" }), cards = h("div", {}), stand = h("div", { class: "card" });
    const sel = (b, f) => h("button", { class: "btn small", onclick: f }, b);
    const playBtn = sel("Pause", () => { if (!rend) return; playBtn.textContent = rend.toggle() ? "Pause" : "Play"; });
    const speedBtns = [1, 2, 4].map((n) => sel(n + "x", () => { if (rend) rend.setSpeed(n); speedBtns.forEach((b, k) => b.classList.toggle("on", [1, 2, 4][k] === n)); }));
    speedBtns[0].classList.add("on");
    ctl.append(playBtn, ...speedBtns, sel("Skip to result", () => { if (rend) { rend.skip(); const f = shownFight(); if (f) skipped[f.id] = true; schedule(); } }), sel("Replay", () => { if (rend) { rend.replay(); playBtn.textContent = "Pause"; } }));
    const side = h("div", { class: "fg-side" }, result, nextBox, panel, h("div", { class: "card" }, h("h3", {}, "Event log"), logBox));
    const teamsCard = h("div", { class: "card teams-card" }); let teamsSig = "";
    const fsec = screen(title, stage, side, h("div", { class: "card fg-loss" }, h("h3", {}, "Why they lost"), cards), teamsCard, stand);
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
      rend.load({ teamA: arr(f.teamA), teamB: arr(f.teamB), arena: f.arena, arenas: ctx.arenaMeta(), events: sim.events }, N.now() - f.startAt);
      if (S.role) { if (narrUnsub) narrUnsub(); narrFor = f.id; narr = null; narrUnsub = N.watch(S.code, `fights/${f.id}/narration`, (v) => { narr = v; schedule(); }); }
    }
    function claimForm(label, onSubmit) {
      const msgIn = h("textarea", { maxlength: R.APPEAL_TEXT_MAX, rows: 4, placeholder: "Write your message here (one message only)" });
      return h("div", { class: "card" }, h("h3", {}, label), msgIn,
        h("button", { class: "btn primary", onclick: () => { const text = msgIn.value.trim().slice(0, R.APPEAL_TEXT_MAX); if (!text) return toast("Write a message first."); onSubmit([{ text }]); } }, "Submit"));
    }
    const claimList = (title, cl) => h("div", { class: "card" }, h("h3", {}, title), ...arr(cl).map((c) => h("div", {}, c.text + " ", c.eventId ? h("button", { class: "evid", onclick: () => hl(c.eventId) }, "#" + c.eventId) : null)));
    const GROUNDS = {
      integrity_failure: "Objective problem: the published result does not match an independent re-simulation of this fight.",
      engine_violation: "Objective problem: the rules audit found a violation in this fight.",
      supported_claims: "Part of the appeal is backed by the facts, but nothing found changes the result.",
      none: "No objective problem was found with this fight.",
      unavailable: "The judge could not check this fight."
    };
    function verdictCard(a) {
      const v = a.verdict; if (!v) return null;
      return h("div", { class: "card" }, h("h3", {}, "Judge's reasoning"), h("p", { class: "muted small" }, GROUNDS[v.grounds] || ""),
        v.summary ? h("p", {}, v.summary) : null,
        v.error ? h("p", { class: "muted small" }, `(${v.error})`) : null,
        ...arr(v.violations).map((x) => h("div", { class: "muted small" }, x)),
        ...arr(v.claims).map((c) => h("div", { class: "small" }, `${c.verdict === "supported" ? "✔" : c.verdict === "contradicted" ? "✘" : "•"} “${c.quote}”: ${c.kind === "instruction" ? "a demand, not evidence. " : c.kind === "opinion" ? "an opinion, not evidence. " : ""}${c.reasoning || ""} `,
          ...arr(c.cites).map((id) => h("button", { class: "evid", onclick: () => hl(id) }, "#" + id)))));
    }
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
        parts.push(verdictCard(a));
        const vid = voterId(), canVote = !!(a.voters && a.voters[vid]), mine = a.votes ? a.votes[vid] : undefined, cast = Object.keys(a.votes || {}).length, tot = Object.keys(a.voters || {}).length;
        parts.push(h("div", { class: "card" }, h("p", {}, canVote ? "Should the appeal be upheld?" : "Voting is open to others."), canVote ? h("div", { class: "row" },
          h("button", { class: "btn primary", disabled: mine !== undefined, onclick: () => N.put(S.code, `appeals/${fid}/votes/${vid}`, true) }, "Uphold"),
          h("button", { class: "btn", disabled: mine !== undefined, onclick: () => N.put(S.code, `appeals/${fid}/votes/${vid}`, false) }, "Reject")) : null, h("p", { class: "muted small" }, `${cast}/${tot} votes cast`)));
      } else if (a.status === "ai") parts.push(h("p", { class: "muted center" }, "The judge is re-simulating the fight and checking the claims…"));
      else if (a.status === "rematch") {
        parts.push(claimList(`${nameOf(a.by)} appeals`, a.claims), a.rebuttal ? claimList(`${nameOf(winnerKey)} replies`, a.rebuttal) : null, verdictCard(a));
        if (me === winnerKey) parts.push(h("div", { class: "card" }, h("p", {}, (a.verdict && a.verdict.ai ? "" : "No AI verdict was available. ") + "Accept a rematch? Declining or timing out keeps your win."), h("div", { class: "row" },
          h("button", { class: "btn primary", disabled: !!a.response, onclick: () => N.put(S.code, `appeals/${fid}/response`, "accept") }, "Accept rematch"), h("button", { class: "btn", disabled: !!a.response, onclick: () => N.put(S.code, `appeals/${fid}/response`, "decline") }, "Decline"))));
        else parts.push(h("p", { class: "muted center" }, `${nameOf(winnerKey)} is deciding on a rematch offer…`));
      } else if (a.status === "resolved") parts.push(claimList(`${nameOf(a.by)} appeals`, a.claims), a.rebuttal ? claimList(`${nameOf(winnerKey)} replies`, a.rebuttal) : null, verdictCard(a),
        h("p", { class: "center" }, !a.upheld ? "Appeal rejected. The result stands." : a.via === "judge" ? "Rematch ordered: the judge found an objective problem with the original result." : a.via === "vote" ? "Appeal upheld by vote. A rematch will be played." : "Rematch accepted."));
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
        if (f && f.result && !warned[f.id]) { warned[f.id] = true; const r = ensureSim(f); const dg = `${r.winner}:${r.events.length}:${r.events[r.events.length - 1].id}:${r.survivors.A}-${r.survivors.B}`; if (dg !== f.result.digest) { bad[f.id] = true; console.warn("[sim] local result differs from host result", dg, f.result.digest); } }
        // result
        const sim = f ? ensureSim(f) : null, rev = f && revealed(f, sim);
        result.hidden = !rev; result.dataset.done = rev ? "1" : "";
        if (rev) {
          const w = f.final ? f.final.winner : f.result ? f.result.winner : sim.winner, surv = f.final ? f.final.survivors : sim.survivors;
          result.replaceChildren(h("div", { class: "verdict " + (w === "draw" ? "draw" : w === "A" ? "sa" : "sb") }, w === "draw" ? "Draw" : `${nameOf(w === "A" ? f.a : f.b)} wins`), h("div", { class: "muted small" }, `Survivors: ${nameOf(f.a)} ${surv.A}, ${nameOf(f.b)} ${surv.B}.${f.flipped ? " Flipped on appeal." : ""}${f.replayed ? " Replaced by a rematch." : ""}`), ...(bad[f.id] ? [h("div", { class: "small" }, "⚠ This result does not match your own device's re-simulation of the fight. If you lost, appeal it: the judge will check it independently.")] : []));   // spread, never pass null: native replaceChildren() renders null as the text "null"
          renderLossCards(cards, sim.autopsy, narr, { onClick: hl });
        } else { cards.replaceChildren(h("p", { class: "muted" }, f ? "Revealed when the fight ends." : "")); }
        // teams (stat labels carry the pack's tooltips)
        if (f && teamsSig !== f.id) { teamsSig = f.id; teamsCard.replaceChildren(h("h3", {}, "Lineups"), ...[["A", f.a, f.teamA], ["B", f.b, f.teamB]].map(([side, k, team]) => h("div", { class: "team" }, h("div", { class: "tname" }, nameOf(k)), ...arr(team).map((a) => h("div", { class: "trow" }, h("span", {}, a.name), statStrip(a)))))); }
        teamsCard.hidden = !f;
        // next fight box
        nextBox.hidden = t.state !== "awaitNext";
        if (t.state === "awaitNext") {
          const nx = H.advance(t), m = nx.pick ? nx.tour.rounds[nx.pick.ri][nx.pick.mi] : null, byes = arr(nx.tour.rounds[nx.tour.round]).filter((x) => x.bye).map((x) => nameOf(x.a));
          nextBox.replaceChildren(...[h("h3", {}, m ? `Up next: ${nx.tour.labels[nx.pick.ri] || "Fight"}` : "Tournament complete"),
          m ? h("div", { class: "big center" }, `${nameOf(m.a)} vs ${nameOf(m.b)}`) : h("p", {}, "Calculating final results…"),
          byes.length ? h("p", { class: "muted small" }, `Bye (counts as a win): ${byes.join(", ")}`) : null,
          m ? h("div", { class: "center" }, host ? h("button", { class: "btn primary big", onclick: () => ctx.runner() && ctx.runner().nextFight() }, "Next fight") : h("span", { class: "muted" }, "Waiting for the host…"), h("div", { class: "muted small" }, "auto in ", h("span", { "data-next": 1 }, secs((t.nextAt || 0) - N.now()) + "s"))) : null].filter(Boolean));
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
  
  const resCache = {};
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
    screen(h("h1", {}, "Final results"), box, fightsBox, h("div", { class: "row" }, h("button", { class: "btn", onclick: () => { S.view = "leaderboard"; S.code && ctx.leave().then(() => { S.view = "leaderboard"; schedule(); }); } }, "Leaderboard"), h("button", { class: "btn primary", onclick: ctx.leave }, "Leave room")));
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

  return { tournament: screens.fight, results: screens.results };
}