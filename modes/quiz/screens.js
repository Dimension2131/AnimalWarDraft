import * as L from "./logic.js";
import { ensureStyles } from "./styles.js";

export default function createScreens(ctx) {
  const { h, screen, arr, secs, toast, schedule, nameOf, isHost, S, N, bar } = ctx;
  ensureStyles();
  const ent = (id) => ctx.entities.map.get(id) || { id, name: id, emoji: "?" };
  const pts = (p) => (p > 0 ? `+${p}` : p < 0 ? `−${-p}` : "0");
  const ptsCls = (p) => (p > 0 ? "qz-pos" : p < 0 ? "qz-neg" : "");

  function watchQuiz() {
    const Q = { plan: null, cur: null, reveal: {}, ident: {}, final: null, mine: {}, local: {} };
    const subs = [];
    const w = (path, fn) => subs.push(N.watch(S.code, path, (v) => { fn(v); schedule(); }));
    w("quiz/plan", (v) => { Q.plan = L.normPlan(v); });
    w("quiz/cur", (v) => { Q.cur = v; });
    w("quiz/reveal", (v) => { Q.reveal = v || {}; });
    w("quiz/ident", (v) => { Q.ident = v || {}; });
    w("quiz/final", (v) => { Q.final = v; });
    if (S.role === "player") w(`quiz/ans/${S.key}`, (v) => { Q.mine = v || {}; });
    return { Q, stop() { subs.forEach((u) => { try { u(); } catch (e) { /* ignore */ } }); } };
  }
  const canPlay = (Q) => S.role === "player" && !!Q.plan && Q.plan.keys.includes(S.key);
  const myAns = (Q, i) => { const d = Q.local[Q.plan.gid + ":" + i] || Q.mine[L.sk(i)]; return d && d.g === Q.plan.gid ? d : null; };
  async function submit(Q, i, fields) {
    if (!canPlay(Q) || !Q.cur || Q.cur.i !== i) return;
    if (N.now() > Q.cur.deadline) { toast("Time is up."); return; }
    const doc = { g: Q.plan.gid, t: N.now(), ...fields };
    Q.local[Q.plan.gid + ":" + i] = doc; schedule();
    try { await N.put(S.code, `quiz/ans/${S.key}/${L.sk(i)}`, L.clean(doc)); } catch (e) { toast(e.message); }
  }

  const mystery = (id, small) => {
    const e = ent(id), q = () => h("span", { class: "qz-q" }, "?");
    return h("div", { class: "qz-plate" + (small ? " small" : "") }, e.silhouette ? h("img", { class: "qz-sil", src: e.silhouette, alt: "Mystery silhouette", onerror: (ev) => ev.target.replaceWith(q()) }) : q());
  };
  function timerBox(cur) {
    const total = Math.max(1000, cur.deadline - cur.start), cd = bar(Math.round(total / 1000)), txt = h("div", { class: "center muted" });
    return { el: h("div", {}, cd.el, txt), tick() { const rem = (cur.deadline) - N.now(); cd.set(rem / total); txt.textContent = secs(rem) + "s"; } };
  }
  const status = (el, text, ok) => { el.textContent = text; el.className = "qz-status" + (ok ? " ok" : ""); };
  const nextBtn = () => h("button", { class: "btn primary", type: "button", onclick: () => { const r = ctx.runner(); if (r && r.skip) r.skip().catch((e) => toast(e.message)); } }, "Next");

  function viewChoice(Q, st, cur) {
    const P = Q.plan, an = P.animals[st.a], sp = st.t === "species", opts = (sp ? an.species : an.kind).options, i = cur.i;
    const T = timerBox(cur), stat = h("div", { class: "qz-status" });
    const lab = (o) => (sp ? ent(o).name : o);
    const pick = (o) => submit(Q, i, o === null ? { done: true, skip: true } : { v: o, done: true });
    const btns = opts.map((o) => h("button", { class: "btn qz-opt", type: "button", onclick: () => pick(o) }, lab(o)));
    const skip = sp ? h("button", { class: "btn", type: "button", onclick: () => pick(null) }, "Skip (0 points, no penalty)") : null;
    const el = h("div", { class: "qz-stage" }, mystery(an.id),
      h("p", { class: "qz-prompt" }, sp ? P.prompts.species : P.prompts.kind),
      sp ? h("p", { class: "qz-hint" }, `Bonus: +${P.settings.points.species} if right, ${P.settings.penalty ? "−" + P.settings.penalty + " if wrong" : "no penalty if wrong"}, 0 if you skip.`) : h("p", { class: "qz-hint" }, `${P.settings.points.kind} points`),
      h("div", { class: "qz-opts" }, btns), skip, stat, T.el);
    const sync = () => {
      const a = myAns(Q, i), can = canPlay(Q), up = N.now() >= cur.deadline, locked = !!(a && a.done);
      btns.forEach((b, j) => { b.classList.toggle("sel", !!(a && a.v === opts[j])); b.disabled = !can || locked || up; });
      if (skip) skip.disabled = !can || locked || up;
      status(stat, !can ? "You are watching this one." : up ? "Time is up." : locked ? (a.skip ? "Skipped. Waiting for the others…" : "Locked in. Waiting for the others…") : "Pick one.", locked);
    };
    return { el, sync, tick() { T.tick(); sync(); } };
  }

  function viewNum(Q, st, cur) {
    const P = Q.plan, q = P.animals[st.a].num[st.n], i = cur.i, lo = q.min, hi = q.max;
    const toVal = (pos) => lo * Math.pow(hi / lo, pos / 1000), toPos = (v) => Math.max(0, Math.min(1000, Math.round((1000 * Math.log(v / lo)) / Math.log(hi / lo))));
    const T = timerBox(cur), stat = h("div", { class: "qz-status" });
    const slider = h("input", { type: "range", min: 0, max: 1000, step: 1, value: 500, "aria-label": q.label + " (log scale)", oninput: () => { box.value = String(+toVal(+slider.value).toPrecision(3)); queue(); } });
    const box = h("input", { type: "number", min: 0, step: "any", inputmode: "decimal", placeholder: q.unit, "aria-label": q.label, oninput: () => { const v = parse(); if (v !== null) slider.value = toPos(v); queue(); } });
    slider.value = 500;
    let touched = false, adopted = false, flushed = false, timer = null;
    const parse = () => { const v = Number(box.value); return box.value !== "" && Number.isFinite(v) && v > 0 ? v : null; };
    const save = (done) => { const v = parse(); if (v === null) { if (done) toast("Enter a number above 0."); return; } submit(Q, i, { v, done: !!done }); };
    const queue = () => { touched = true; clearTimeout(timer); timer = setTimeout(() => save(false), 300); };
    const lock = h("button", { class: "btn primary big", type: "button", onclick: () => save(true) }, "Lock in");
    const el = h("div", { class: "qz-stage" }, mystery(P.animals[st.a].id, true),
      h("p", { class: "qz-prompt" }, q.prompt), q.note ? h("p", { class: "qz-hint" }, q.note) : null,
      h("div", { class: "qz-num" }, slider, h("div", { class: "qz-numrow" }, box, h("span", { class: "qz-unit" }, q.unit)), lock),
      h("p", { class: "qz-hint" }, `The slider is logarithmic. Up to 1000 points: full marks inside the published range, 0 at a factor of 10 off.`), stat, T.el);
    const sync = () => {
      const a = myAns(Q, i), can = canPlay(Q), up = N.now() >= cur.deadline;
      if (a && typeof a.v === "number" && !touched && !adopted) { adopted = true; box.value = String(+a.v.toPrecision(3)); slider.value = toPos(a.v); }
      slider.disabled = box.disabled = lock.disabled = !can || up || !!(a && a.done && up);
      status(stat, !can ? "You are watching this one." : up ? "Time is up." : a && a.done ? "Locked in. You can still change it until the timer ends." : a ? "Saved. Press Lock in when you are sure." : "Move the slider or type a number.", !!(a && a.done));
    };
    return { el, sync, tick() { T.tick(); const rem = cur.deadline - N.now(); if (canPlay(Q) && touched && !flushed && rem < 600 && rem > 0) { flushed = true; save(false); } sync(); } };
  }

  const photo = (e, info, small) => {
    const sm = small ? " small" : "", plate = h("div", { class: "qz-plate" + sm });
    const fallback = () => { plate.className = "qz-plate" + sm; plate.replaceChildren(e.silhouette ? h("img", { class: "qz-sil", src: e.silhouette, alt: e.name }) : h("span", { class: "qz-q" }, e.name[0] || "?")); };
    if (info && info.image) { plate.className = "qz-plate photo" + (info.cutout ? " cutout" : "") + sm; plate.append(h("img", { class: "qz-photo", src: info.image, alt: e.name, onerror: fallback })); }
    else fallback();
    return plate;
  };
  function viewIdent(Q, st, cur) {
    const an = Q.plan.animals[st.a], e = ent(an.id), T = timerBox(cur), kind = h("p", { class: "qz-hint" }), credit = h("p", { class: "qz-src center" }), slot = h("div", {});
    let shownImg;
    const el = h("div", { class: "qz-stage" }, h("p", { class: "qz-hint" }, "It was…"), slot, h("p", { class: "qz-big" }, e.name), kind, credit, T.el, h("div", { class: "row" }, nextBtn()));
    const nb = el.querySelector(".btn");
    return {
      el, sync() {
        const info = Q.ident[L.ak(st.a)] || {}, key = info.image || "";
        if (shownImg !== key || shownImg === undefined) { shownImg = key; slot.replaceChildren(photo(e, info)); }
        kind.textContent = info.kind ? `Kind: ${info.kind}` : ""; credit.textContent = info.credit || ""; if (nb) nb.hidden = !isHost();
      }, tick() { T.tick(); this.sync(); }
    };
  }

  function viewReveal(Q, st, cur) {
    const P = Q.plan, box = h("div", { class: "qz-stage" }), T = timerBox(cur), nb = nextBtn(); let sig = "";
    const row = (cells, k) => h("tr", { class: k === S.key ? "qz-me" : "" }, cells);
    const draw = (R) => {
      if (!R) { box.replaceChildren(h("p", { class: "muted center" }, "Loading results…")); return; }
      const e = ent(R.id), keys = P.keys, name = (k) => nameOf(k);
      const info = Q.ident[L.ak(st.a)] || {}, parts = [h("h2", { class: "center" }, e.name), photo(e, info, true), e.special ? h("p", { class: "qz-hint" }, e.special) : null];
      const ident = (title, rows, correctText, label) => h("div", { class: "card" }, h("h3", {}, title), h("p", { class: "qz-true" }, correctText),
        h("div", { class: "scroll" }, h("table", { class: "qz-tbl" }, h("thead", {}, h("tr", {}, h("th", {}, "Player"), h("th", {}, "Answer"), h("th", { class: "n" }, "Points"))),
          h("tbody", {}, keys.map((k) => { const r = rows[k] || { p: 0 }; return row([h("td", {}, name(k)), h("td", {}, label(r)), h("td", { class: "n " + ptsCls(r.p) }, pts(r.p))], k); })))));
      if (R.kind) parts.push(ident("What kind?", R.kind.rows || {}, `Kind: ${R.kind.correct}`, (r) => (r.v === undefined ? "no answer" : (r.v === R.kind.correct ? "✓ " : "✗ ") + r.v)));
      if (R.species) parts.push(ident("Which one exactly?", R.species.rows || {}, `Species: ${e.name}`, (r) => (r.v === undefined ? "skipped / no answer" : (r.v === R.species.correct ? "✓ " : "✗ ") + ent(r.v).name)));
      for (const n of R.nums || []) {
        parts.push(h("div", { class: "card" }, h("h3", {}, n.prompt),
          h("p", { class: "qz-true" }, `Real value: ${L.fmtNum(n.actual)} ${n.unit}`, typeof n.lo === "number" && typeof n.hi === "number" ? ` (published range ${L.fmtNum(n.lo)} to ${L.fmtNum(n.hi)})` : ""),
          n.note ? h("p", { class: "qz-hint" }, n.note) : null,
          h("div", { class: "scroll" }, h("table", { class: "qz-tbl" }, h("thead", {}, h("tr", {}, h("th", {}, "Player"), h("th", { class: "n" }, "Answer"), h("th", {}, "How far off"), h("th", { class: "n" }, "Points"))),
            h("tbody", {}, keys.map((k) => { const r = (n.rows || {})[k] || { p: 0 }; return row([h("td", {}, name(k)), h("td", { class: "n" }, typeof r.v === "number" ? `${L.fmtNum(r.v)} ${n.unit}` : "-"), h("td", {}, L.offBy(r.v, n.actual, n.lo, n.hi)), h("td", { class: "n " + ptsCls(r.p) }, pts(r.p))], k); })))),
          n.src ? h("p", { class: "qz-src" }, "Source: " + n.src) : null));
      }
      parts.push(h("div", { class: "card" }, h("h3", {}, "Leaderboard"), h("table", { class: "qz-tbl" }, h("tbody", {}, arr(R.order).map((k, idx) => row([h("td", {}, `${idx + 1}. ${name(k)}`), h("td", { class: "n " + ptsCls((R.gain || {})[k]) }, pts((R.gain || {})[k] || 0)), h("td", { class: "n" }, h("b", {}, (R.board || {})[k] ?? 0))], k))))));
      box.replaceChildren(...parts);
    };
    const el = h("div", {}, box, T.el, h("div", { class: "row" }, nb));
    return { el, sync() { const R = Q.reveal[L.ak(st.a)], s = JSON.stringify(R || null); if (s !== sig) { sig = s; draw(R); } nb.hidden = !isHost(); }, tick() { T.tick(); this.sync(); } };
  }

  function quizScreen() {
    const W = watchQuiz(), Q = W.Q;
    const head = h("div", { class: "qz-head" }), stage = h("div", {});
    screen(head, h("div", { class: "card" }, stage));
    let shown = "", view = null;
    const label = (st) => (st.t === "kind" ? "What kind?" : st.t === "species" ? "Species (bonus)" : st.t === "ident" ? "Reveal" : st.t === "num" ? `Question ${st.n + 1}` : "Results");
    const myScore = () => { if (!Q.plan || !Q.plan.settings || Q.plan.settings.reveal !== "each") return null; let best = null; for (const [k, R] of Object.entries(Q.reveal || {})) if (R && R.board && (best === null || +k.slice(1) > best.a)) best = { a: +k.slice(1), s: R.board[S.key] }; return best ? best.s : 0; };
    return {
      update() {
        const P = Q.plan, cur = Q.cur;
        if (!P || !cur || cur.gid !== P.gid) { if (shown !== "wait") { shown = "wait"; view = null; head.replaceChildren(); stage.replaceChildren(h("p", { class: "muted center" }, "Loading the quiz…")); } return; }
        const st = P.steps[cur.i]; if (!st) return;
        const key = `${P.gid}:${cur.i}`;
        if (key !== shown) {
          shown = key;
          view = st.t === "kind" || st.t === "species" ? viewChoice(Q, st, cur) : st.t === "num" ? viewNum(Q, st, cur) : st.t === "ident" ? viewIdent(Q, st, cur) : viewReveal(Q, st, cur);
          stage.replaceChildren(view.el);
        }
        const ms = myScore();
        head.replaceChildren(h("span", { class: "qz-step" }, `${ctx.pack.nouns.singular[0].toUpperCase()}${ctx.pack.nouns.singular.slice(1)} ${st.a + 1} of ${P.animals.length} · ${label(st)}`),
          canPlay(Q) ? h("span", { class: "pill" }, ms === null ? "scores revealed at the end" : `your score: ${ms}`) : h("span", { class: "pill" }, "spectating"));
        if (view) view.sync();
      },
      tick() { if (view) view.tick(); },
      destroy() { W.stop(); }
    };
  }

  function resultsScreen() {
    const W = watchQuiz(), Q = W.Q, body = h("div", { class: "qz-stage" }), actions = h("div", { class: "row" });
    screen(h("h1", {}, "Final standings"), body, actions);
    let sig = "";
    const again = h("button", { class: "btn primary big", type: "button", onclick: () => { const r = ctx.runner(); if (r && r.playAgain) r.playAgain().catch((e) => toast(e.message)); } }, "Play again");
    const wait = h("p", { class: "muted small" }, "Waiting for the host to start a new game…");
    actions.append(again, wait, h("button", { class: "btn", type: "button", onclick: () => ctx.leave() }, "Leave room"));
    return {
      update() {
        again.hidden = !isHost(); wait.hidden = isHost();
        const F = Q.final, s = JSON.stringify(F || null) + (Q.plan ? Q.plan.gid : "");
        if (s === sig) return; sig = s;
        if (!F || !Q.plan) { body.replaceChildren(h("p", { class: "muted center" }, "Loading results…")); return; }
        const order = arr(F.order), tot = F.totals || {};
        body.replaceChildren(
          h("div", { class: "card" }, h("table", { class: "qz-tbl" }, h("thead", {}, h("tr", {}, h("th", {}, "#"), h("th", {}, "Player"), h("th", { class: "n" }, "Points"))),
            h("tbody", {}, order.map((k, i) => h("tr", { class: k === S.key ? "qz-me" : "" }, h("td", {}, i + 1), h("td", {}, nameOf(k)), h("td", { class: "n" }, h("b", {}, tot[k] ?? 0))))))),
          h("details", { class: "card" }, h("summary", {}, "Points per animal"), h("div", { class: "scroll" }, h("table", { class: "qz-tbl" },
            h("thead", {}, h("tr", {}, h("th", {}, ctx.pack.nouns.singular), order.map((k) => h("th", { class: "n" }, nameOf(k))))),
            h("tbody", {}, arr(F.per).map((p) => h("tr", {}, h("td", {}, ent(p.id).name), order.map((k) => h("td", { class: "n " + ptsCls((p.gain || {})[k]) }, pts((p.gain || {})[k] || 0))))))))));
      },
      destroy() { W.stop(); }
    };
  }

  return { quiz: quizScreen, results: resultsScreen };
}