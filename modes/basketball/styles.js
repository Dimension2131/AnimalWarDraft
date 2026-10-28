// modes/basketball/styles.js: CSS of the Basketball War Draft (injected once; uses the world tokens from styles/worlds/basketball.css, with fallbacks).
const CSS = `
.bb-plate{width:84px;height:84px;flex:none;border:2px solid var(--dark,#120a05);background:var(--field,#1a0f08);display:grid;place-items:center;overflow:hidden;border-radius:50%}
.bb-plate img,.bb-photo{width:100%;height:100%;object-fit:cover;object-position:50% 18%}
.bb-plate .emoji{font-size:2.2rem}
.bb-ovr{display:inline-block;font:800 .95rem var(--display,inherit);background:var(--yellow,#ffb347);color:#101010;padding:0 6px;line-height:1.35;box-shadow:1px 1px 0 var(--pink,#e4452c)}
.bb-champ{font:800 1.4rem var(--display,inherit);background:var(--yellow,#ffb347);color:#101010;padding:2px 10px;box-shadow:2px 2px 0 var(--pink,#e4452c);display:inline-block}
.bb-tip{flex:1 1 100%;margin:2px 0 0;font-size:.82rem;color:var(--muted,#b99)}
.pill.rtag{font-weight:800;font-size:.68rem;padding:0 6px;margin-right:4px}
.acard.bb .stat.s-scoring,.sp.s-SCR,.bb-subhead.s-scoring,.bb-subs .sub.s-scoring{--c:#ffb347}
.acard.bb .stat.s-playmaking,.sp.s-PLY,.bb-subhead.s-playmaking,.bb-subs .sub.s-playmaking{--c:#4aa3ff}
.acard.bb .stat.s-perimeter,.sp.s-PRD,.bb-subhead.s-perimeter,.bb-subs .sub.s-perimeter{--c:#35e0c0}
.acard.bb .stat.s-interior,.sp.s-INT,.bb-subhead.s-interior,.bb-subs .sub.s-interior{--c:#2fb8e8}
.acard.bb .stat.s-rebounding,.sp.s-REB,.bb-subhead.s-rebounding,.bb-subs .sub.s-rebounding{--c:#9bd13c}
.acard.bb .stat.s-athleticism,.sp.s-ATH,.bb-subhead.s-athleticism,.bb-subs .sub.s-athleticism{--c:#b987ff}
.acard.bb .stat.s-mindset,.sp.s-MND,.bb-subhead.s-mindset,.bb-subs .sub.s-mindset{--c:#ff7a5c}
.bb-more{margin-top:8px}.bb-more summary{cursor:pointer;font-weight:700;padding:4px 0}
.bb-subs{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;margin-top:6px}
.bb-subgrp{display:grid;gap:3px;align-content:start}
.bb-subhead{display:flex;justify-content:space-between;border-bottom:2px solid var(--c,#999);font-size:.85rem;text-transform:uppercase;letter-spacing:.04em}
.bb-subs .stat.sub{font-size:.8rem}
.acard.bb .stats{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}
.bb-top{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.bb-top select,.bb-top .btn{min-height:40px}
.bb-court{position:relative;width:100%;aspect-ratio:50/47;min-height:300px;max-width:560px;margin:0 auto;border:2px solid var(--edge,#ccc);overflow:hidden;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 50 47' preserveAspectRatio='none'%3E%3Cg fill='none' stroke='%23fff' stroke-opacity='.6' stroke-width='.28'%3E%3Crect x='17' y='0' width='16' height='19'/%3E%3Cpath d='M19 19A6 6 0 0 0 31 19'/%3E%3Cpath d='M19 19A6 6 0 0 1 31 19' stroke-dasharray='1 .8'/%3E%3Cpath d='M22 4.5A3 3 0 0 0 28 4.5'/%3E%3Cpath d='M3 0V14.2A23.75 23.75 0 0 0 47 14.2V0'/%3E%3Cpath d='M19 47A6 6 0 0 1 31 47'/%3E%3Cpath d='M22 3.2h6'/%3E%3C/g%3E%3Ccircle cx='25' cy='5.2' r='.75' fill='none' stroke='%23ff7a3a' stroke-width='.35'/%3E%3C/svg%3E") center/100% 100% no-repeat,repeating-linear-gradient(90deg,#9a5b2a 0 44px,#a4642f 44px 88px)}
.bb-court .bb-slot{position:absolute;transform:translate(-50%,-50%);width:clamp(58px,17%,92px);z-index:1}
.bb-court .bb-slot.sel,.bb-court .bb-slot.over{z-index:2}
.bb-slot{display:grid;justify-items:center;gap:2px;padding:4px 2px;background:rgba(20,10,4,.82);color:var(--text,#fff);border:2px solid rgba(255,255,255,.5);font:inherit;cursor:grab;touch-action:none;user-select:none}
.bb-slot img{width:46px;height:46px;border-radius:50%;object-fit:cover;object-position:50% 18%;background:#2a1a0d;pointer-events:none}
.bb-slot .emoji{font-size:1.6rem;pointer-events:none}
.bb-slot .nm{font-size:.7rem;line-height:1.1;text-align:center;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;pointer-events:none}
.bb-slot .ov{position:absolute;top:-6px;right:-6px;font:800 .72rem var(--display,inherit);background:var(--yellow,#ffb347);color:#101010;padding:0 4px;pointer-events:none}
.bb-slot .cd{font-size:.62rem;color:var(--muted,#b99);pointer-events:none}
.bb-info{position:absolute;bottom:-7px;right:-7px;width:20px;height:20px;border-radius:50%;background:var(--blue,#4aa3ff);color:#101010;font:800 .75rem/20px var(--display,inherit);text-align:center;cursor:pointer;touch-action:manipulation}
.bb-main7{grid-template-columns:repeat(auto-fill,minmax(200px,1fr))}
.bb-slot.fit-warn{border-color:var(--warn,#ffc04d)}
.bb-slot.fit-bad{border-color:var(--bad,#ff7a8a);background:rgba(80,10,20,.75)}
.bb-slot.sel{outline:3px solid var(--yellow,#ffb347);outline-offset:1px}
.bb-slot.over{outline:3px dashed var(--teal,#35e0c0);outline-offset:1px}
.bb-slot.empty{opacity:.5;border-style:dashed}
.bb-bench{display:flex;flex-wrap:wrap;gap:8px;padding:8px;border:1.5px dashed var(--edge-dim,#987);background:var(--field,#1a0f08);min-height:70px}
.bb-bench .bb-slot{position:relative;width:84px}
.bb-bench .bb-slot .rk{position:absolute;top:-6px;left:-6px;font:800 .66rem var(--display,inherit);background:var(--blue,#4aa3ff);color:#101010;padding:0 4px;pointer-events:none}
.bb-hint{font-size:.8rem;color:var(--muted,#b99)}
.bb-ghost{position:fixed;z-index:9999;pointer-events:none;opacity:.9;transform:translate(-50%,-60%) scale(1.08)}
.bb-cmp{display:grid;gap:6px}
.bb-cmp .r{display:grid;grid-template-columns:2.4rem 1fr 7rem 1fr 2.4rem;gap:6px;align-items:center;font-size:.85rem}
.bb-cmp .r b{text-align:center}
.bb-cmp .bar{height:10px;background:var(--field,#1a0f08);border:1px solid var(--edge-dim,#987);position:relative}
.bb-cmp .bar i{position:absolute;top:0;bottom:0;background:var(--teal,#35e0c0)}
.bb-cmp .bar.l i{right:0}.bb-cmp .bar.rr i{left:0;background:var(--pink,#e4452c)}
.bb-cmp .lab{text-align:center;color:var(--muted,#b99)}
.bb-score{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;text-align:center}
.bb-score .big{font:800 2.8rem var(--display,inherit);letter-spacing:.06em;background:var(--dark,#120a05);color:var(--yellow,#ffb347);padding:0 14px;border:2px solid var(--edge,#ccc)}
.bb-score .tn{font:800 1.15rem var(--display,inherit);text-transform:uppercase;overflow:hidden;text-overflow:ellipsis}
.bb-clock{text-align:center;font:700 1.1rem var(--display,inherit);color:var(--teal,#35e0c0);margin-top:4px}
.bb-qs{width:100%;border-collapse:collapse;font-size:.85rem;margin-top:8px}
.bb-qs th,.bb-qs td{padding:2px 6px;text-align:center}.bb-qs td:first-child,.bb-qs th:first-child{text-align:left}
.bb-log{max-height:280px;overflow:auto;display:grid;gap:4px;margin-top:8px}
.bb-log div{padding:5px 8px;background:var(--sheet,#2a1a0d);border-left:3px solid var(--edge-dim,#987);font-size:.88rem}
.bb-log div.made{border-left-color:var(--yellow,#ffb347)}
.bb-log div.three{border-left-color:var(--yellow,#ffb347);font-weight:700}
.bb-log div.sub{border-left-color:var(--blue,#4aa3ff)}
.bb-log div.mark{color:var(--muted,#b99);border-left-color:var(--teal,#35e0c0)}
.bb-lead{display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:.82rem;margin-top:8px}
.bb-five{display:grid;gap:2px;font-size:.8rem;margin-top:6px}
.bb-tbl{width:100%;border-collapse:collapse;font-size:.82rem}
.bb-tbl th,.bb-tbl td{padding:3px 5px;text-align:right;white-space:nowrap}
.bb-tbl th:first-child,.bb-tbl td:first-child{text-align:left}
.bb-tbl tr.dnp td{color:var(--muted,#b99)}
.bb-tbl tr.tot td{font-weight:800;border-top:1px solid var(--edge-dim,#987)}
.bb-tbl td.n{font-weight:700}.bb-tbl .sub{color:var(--muted,#b99);font-size:.76rem}
.bb-scroll{overflow-x:auto}
.bb-stats{display:grid;gap:4px}
.bb-st-head{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:start;margin-bottom:6px}
.bb-st-team{display:grid;gap:4px;justify-items:center}
.bb-st-name{font:800 1.05rem var(--display,inherit);text-transform:uppercase}
.bb-st-icons{display:flex;flex-wrap:wrap;gap:4px;justify-content:center}
.bb-st-pl{display:grid;justify-items:center;font-size:.62rem;width:50px}
.bb-st-mid{text-align:center}.bb-st-title{font-size:.7rem;letter-spacing:.14em;color:var(--muted,#b99)}
.bb-st-score{font:800 1.7rem var(--display,inherit)}
.bb-st-row{display:grid;grid-template-columns:5.5rem 1fr 5.5rem;gap:8px;align-items:center;text-align:center;font-size:.9rem}
.bb-st-v{padding:1px 6px;font-weight:700}.bb-st-v.lead{background:var(--yellow,#ffb347);color:#101010}
.bb-st-lab{color:var(--muted,#b99);font-size:.8rem}
.bb-row-vs{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap}
.bb-br .bb-brm.me{background:rgba(255,179,71,.12)}.bb-br b.win{color:var(--yellow,#ffb347)}
.bb-rank{margin:6px 0;padding-left:1.4rem}
@media (max-width:520px){.bb-slot img{width:38px;height:38px}.bb-court .bb-slot{width:clamp(54px,17%,70px)}.bb-score .big{font-size:2rem}.bb-st-row{grid-template-columns:4rem 1fr 4rem}}
`;
export function ensureStyles() {
  if (typeof document === "undefined" || document.__bbStyles) return;
  try { const el = document.createElement("style"); el.textContent = CSS; (document.head || document.documentElement).append(el); document.__bbStyles = true; } catch (e) { console.warn("[basketball] styles", e); }
}
