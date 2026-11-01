// js/bots-ui.js: the "Bots" card of the lobby (draft modes only): the Solo mode and Add bots switches, a seat meter, and one card per bot with its personality.
// Only the host can change anything; everybody else sees the same cards read-only. Styles: styles/bots.css. The bots themselves are run by js/host.js (logic: js/bots.js).
import * as B from "./bots.js";

const AVATARS = ["🤖", "🦊", "🐺", "🦈", "🐲", "👾", "🧠", "😈", "🦉", "🔥"];

export function createBotsPanel({ h, N, R, state, isHost }) {
  const cards = new Map();   // bot key -> { el, refs, sig, cfg, name, dirtyUntil, timer }
  let L = {}, open = new Set();

  // ---------- switches ----------
  const sw = (id) => h("button", { class: "mc-switch", type: "button", role: "switch", "aria-checked": "false", "aria-labelledby": id + "L", "aria-describedby": id + "H" }, h("span", { class: "mc-knob" }));
  const soloSw = sw("btSolo"), addSw = sw("btAdd");
  const row = (id, title, hint, s) => h("div", { class: "bt-switchrow" }, h("div", { class: "bt-switchtxt" }, h("b", { id: id + "L" }, title), h("span", { id: id + "H", class: "muted small" }, hint)), s);
  const pips = h("div", { class: "bt-pips", role: "img" }), seatTxt = h("span", { class: "bt-seattxt" });
  const list = h("div", { class: "bt-list" });
  const addBtn = h("button", { class: "btn bt-addbtn", type: "button", onclick: () => addBot() }, "+ Add a bot");
  const note = h("p", { class: "muted small bt-note" });
  const node = h("div", { class: "card bots-card", hidden: true },
    h("h3", {}, "Bots ", h("span", { class: "bt-beta" }, "draft games")),
    row("btSolo", "Solo mode", "Play on your own against a bot. You can start without waiting for friends.", soloSw),
    row("btAdd", "Add bots", "Fill empty seats with bots that bid alongside the people in the room.", addSw),
    h("div", { class: "bt-seats" }, pips, seatTxt), list, addBtn, note);

  // ---------- helpers ----------
  const players = () => state().players || {};
  const botList = () => Object.entries(players()).filter(([, p]) => p && p.bot).sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0));
  const humanCount = () => Object.values(players()).filter((p) => p && !p.bot).length;
  const save = (key, c, immediate) => {   // the bot's own card writes its personality (and name) after a short pause, so dragging a slider is one write, not fifty
    c.dirtyUntil = Date.now() + 2000; clearTimeout(c.timer);
    const go = () => { const code = state().code; N.put(code, `players/${key}/bot`, c.cfg).catch(() => {}); N.put(code, `players/${key}/name`, c.name).catch(() => {}); };
    if (immediate) go(); else c.timer = setTimeout(go, 300);
  };
  function addBot() {
    if (!isHost()) return;
    const ps = players(), room = R.MAX_PLAYERS - Object.keys(ps).length; if (room <= 0) return;
    const nb = B.nextBot(ps);
    N.put(state().code, `players/${nb.key}`, { name: nb.name, joinedAt: N.now(), sid: "bot", appealTokens: 1, online: true, role: "player", bot: nb.bot }).catch(() => {});
    open = new Set([nb.key]);
  }

  // ---------- one bot ----------
  function makeCard(key) {
    const c = { key, refs: {}, sig: "", cfg: B.normBot(null), name: "", dirtyUntil: 0, timer: 0 }, r = c.refs;
    r.avatar = h("span", { class: "bt-avatar" }); r.name = h("b", { class: "bt-name" }); r.sub = h("span", { class: "bt-sub" });
    r.mini = h("span", { class: "bt-mini", "aria-hidden": "true" }, B.DIALS.map(() => h("i", {})));
    r.head = h("button", { class: "bt-head", type: "button", "aria-expanded": "false", onclick: () => { open.has(key) ? open.delete(key) : open.add(key); c.el.classList.toggle("open", open.has(key)); r.head.setAttribute("aria-expanded", String(open.has(key))); } },
      r.avatar, h("span", { class: "bt-id" }, r.name, r.sub), r.mini, h("span", { class: "bt-chev", "aria-hidden": "true" }, "▾"));
    // name + avatar
    r.nameIn = h("input", { type: "text", maxlength: 16, "aria-label": "Bot name", oninput: (e) => { c.name = e.target.value.replace(/\s+/g, " ").slice(0, 16) || c.name; r.name.textContent = c.name; save(key, c); } });
    r.avatars = h("div", { class: "bt-avatars", role: "group", "aria-label": "Bot avatar" }, AVATARS.map((em) => h("button", { type: "button", class: "bt-em", "data-v": em, "aria-label": em, onclick: () => { c.cfg.emoji = em; paint(c); save(key, c); } }, em)));
    // archetype presets
    r.archs = h("div", { class: "bt-archs", role: "group", "aria-label": "Personality preset" }, B.ARCH_IDS.map((id) => { const a = B.ARCH[id];
      return h("button", { type: "button", class: "bt-arch", "data-v": id, style: `--ac:${a.color}`, onclick: () => { const nm = c.name; c.cfg = B.botFromArch(id); c.name = nm; paint(c); save(key, c); } }, h("span", {}, a.emoji), h("b", {}, a.label), h("small", {}, a.blurb)); }));
    // bidding style
    r.styles = h("div", { class: "bt-styles", role: "group", "aria-label": "Bidding style" }, B.STYLES.map((s) => h("button", { type: "button", class: "mc-chip", "data-v": s.id, "aria-pressed": "false", title: s.blurb, onclick: () => { c.cfg.style = s.id; paint(c); save(key, c); } }, s.label)));
    r.styleNote = h("p", { class: "muted small bt-stylenote" });
    // dials
    r.dials = {};
    const dialRows = [...B.DIALS, { key: "chat", label: "Chattiness", lo: "Silent", hi: "Trash talker", text: (v) => (v < 34 ? "Never says a word." : v < 67 ? "Comments now and then after winning a player." : "Loves to talk after winning a player.") }].map((d) => {
      const out = h("output", { class: "bt-val" }), txt = h("span", { class: "muted small bt-dtext" });
      const inp = h("input", { type: "range", min: 0, max: 100, step: 5, "aria-label": d.label, oninput: (e) => { c.cfg[d.key] = +e.target.value; r.dials[d.key].paint(c); paintMini(c); save(key, c); } });
      r.dials[d.key] = { inp, out, txt, paint: (cc) => { const v = cc.cfg[d.key]; if (document.activeElement !== inp) inp.value = v; out.textContent = v; txt.textContent = d.text(v); inp.style.setProperty("--p", String(v / 100)); } };
      return h("div", { class: "bt-dial" }, h("div", { class: "bt-dtop" }, h("span", {}, d.label), out), inp, h("div", { class: "bt-dends muted small" }, h("span", {}, d.lo), h("span", {}, d.hi)), txt);
    });
    r.shuffle = h("button", { class: "btn small", type: "button", onclick: () => { const a = B.ARCH[c.cfg.arch]; for (const k of B.DIAL_KEYS) c.cfg[k] = B.clampDial((a ? a.dials[k] : 50) + (Math.random() - 0.5) * 60); paint(c); save(key, c); } }, "🎲 Shake it up");
    r.remove = h("button", { class: "btn small bt-remove", type: "button", onclick: () => { N.del(state().code, `players/${key}`).catch(() => {}); open.delete(key); } }, "Remove bot");
    r.body = h("div", { class: "bt-body" },
      h("label", { class: "bt-lbl" }, "Name", r.nameIn), h("div", { class: "bt-lbl" }, "Avatar", r.avatars),
      h("div", { class: "bt-lbl" }, "Personality preset", r.archs),
      h("div", { class: "bt-lbl" }, "Bidding style", r.styles, r.styleNote),
      h("div", { class: "bt-dials" }, dialRows),
      h("div", { class: "bt-actions" }, r.shuffle, r.remove));
    c.el = h("div", { class: "bt-card" }, r.head, r.body);
    return c;
  }
  function paintMini(c) { [...c.refs.mini.children].forEach((i, n) => i.style.setProperty("--v", String(c.cfg[B.DIAL_KEYS[n]] / 100))); }
  function paint(c) {
    const r = c.refs, a = B.ARCH[c.cfg.arch] || B.ARCH.balanced, st = B.STYLES.find((s) => s.id === c.cfg.style) || B.STYLES[0];
    c.el.style.setProperty("--ac", a.color);
    r.avatar.textContent = c.cfg.emoji; r.name.textContent = c.name; r.sub.textContent = `${a.label} · ${st.label}`;
    if (document.activeElement !== r.nameIn) r.nameIn.value = c.name;
    for (const b of r.avatars.children) b.setAttribute("aria-pressed", String(b.dataset.v === c.cfg.emoji));
    for (const b of r.archs.children) b.setAttribute("aria-pressed", String(b.dataset.v === c.cfg.arch));
    for (const b of r.styles.children) b.setAttribute("aria-pressed", String(b.dataset.v === c.cfg.style));
    r.styleNote.textContent = st.blurb;
    for (const k in r.dials) r.dials[k].paint(c);
    paintMini(c);
  }

  // ---------- the whole card ----------
  function render() {
    const host = isHost(), bots = botList(), keys = new Set(bots.map(([k]) => k)), h0 = humanCount(), total = h0 + bots.length;
    for (const [k, c] of cards) if (!keys.has(k)) { clearTimeout(c.timer); c.el.remove(); cards.delete(k); open.delete(k); }
    bots.forEach(([k, p], i) => {
      let c = cards.get(k);
      if (!c) { c = makeCard(k); cards.set(k, c); }
      const sig = JSON.stringify([p.name, p.bot]);
      if (sig !== c.sig && Date.now() >= c.dirtyUntil) { c.sig = sig; c.cfg = B.normBot(p.bot); c.name = p.name || "Bot"; paint(c); }
      c.el.classList.toggle("open", open.has(k)); c.refs.head.setAttribute("aria-expanded", String(open.has(k)));
      c.el.classList.toggle("ro", !host);
      for (const el of c.el.querySelectorAll(".bt-body input, .bt-body button")) el.disabled = !host;
      c.refs.remove.disabled = !host || bots.length <= 1;
      c.refs.remove.title = bots.length <= 1 ? "Turn Solo mode and Add bots off to remove the last bot" : "";
    });
    const els = bots.map(([k]) => cards.get(k).el);
    if (els.length !== list.children.length || els.some((e, i) => list.children[i] !== e)) list.replaceChildren(...els);   // only when a bot came, left or moved
    // seat meter: one pip per seat. People are teal, each bot wears its own colour.
    const seats = R.MAX_PLAYERS, pipSig = JSON.stringify([h0, seats, bots.map(([, q]) => [(q.bot || {}).arch, (q.bot || {}).emoji])]);
    if (pipSig !== render.pipSig) { render.pipSig = pipSig; pips.replaceChildren(...Array.from({ length: seats }, (_, i) => {
      if (i < h0) return h("i", { class: "pip human" });
      const b = bots[i - h0]; if (!b) return h("i", { class: "pip" });
      return h("i", { class: "pip bot", style: `--ac:${(B.ARCH[(b[1].bot || {}).arch] || B.ARCH.balanced).color}` }, (b[1].bot || {}).emoji || "🤖");
    })); }
    pips.setAttribute("aria-label", `${h0} people and ${bots.length} bots in ${seats} seats`);
    seatTxt.textContent = `${total}/${seats} seats · ${h0} ${h0 === 1 ? "person" : "people"}, ${bots.length} ${bots.length === 1 ? "bot" : "bots"}`;
    addBtn.hidden = !L.addBots; addBtn.disabled = !host || total >= seats;
    note.textContent = !L.solo && !L.addBots ? "Both switches are off, so there are no bots in this room."
      : L.addBots ? "People always get a seat first: if the room fills up, the newest bot leaves. Tap a bot to change how it plays."
      : "Solo mode gives you one bot. Switch on Add bots to play against several. Tap the bot to change how it plays.";
    list.hidden = !bots.length;
  }
  return {
    node,
    refresh(settings, host, draftMode) {
      L = settings || {}; node.hidden = !draftMode;
      for (const [s, on] of [[soloSw, !!L.solo], [addSw, !!L.addBots]]) { s.setAttribute("aria-checked", String(on)); s.disabled = !host; }
      render();
    },
    update: render,
    wire({ edit }) {
      soloSw.addEventListener("click", () => edit((s) => { s.solo = !s.solo; }));
      addSw.addEventListener("click", () => edit((s) => { s.addBots = !s.addBots; }));
    }
  };
}
