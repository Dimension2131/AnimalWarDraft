// modes/football/styles.js: CSS of the Football War Draft (injected once; uses the world tokens from styles/worlds/football.css, with fallbacks).
const CSS = `
.fb-plate{width:84px;height:84px;flex:none;border:2px solid var(--dark,#04100a);background:var(--field,#050f09);display:grid;place-items:center;overflow:hidden;border-radius:50%}
.fb-plate img,.fb-photo{width:100%;height:100%;object-fit:cover;object-position:50% 18%}
.fb-plate .emoji{font-size:2.2rem}
.fb-ovr{display:inline-block;font:800 .95rem var(--display,inherit);background:var(--yellow,#ffe14d);color:#101010;padding:0 6px;line-height:1.35;box-shadow:1px 1px 0 var(--pink,#ff3d57)}
.fb-champ{font:800 1.4rem var(--display,inherit);background:var(--yellow,#ffe14d);color:#101010;padding:2px 10px;box-shadow:2px 2px 0 var(--pink,#ff3d57);display:inline-block}
.fb-tip{flex:1 1 100%;margin:2px 0 0;font-size:.82rem;color:var(--muted,#9ab)}
.pill.rtag{font-weight:800;font-size:.68rem;padding:0 6px;margin-right:4px}
.acard.fb .stat.s-pac,.sp.s-pac{--c:#ffe14d}.acard.fb .stat.s-sho,.sp.s-sho{--c:#ff5d73}.acard.fb .stat.s-pas,.sp.s-pas{--c:#4aa3ff}
.acard.fb .stat.s-dri,.sp.s-dri{--c:#b987ff}.acard.fb .stat.s-def,.sp.s-def{--c:#35e0c0}.acard.fb .stat.s-phy,.sp.s-phy{--c:#ff9a3d}
.acard.fb .stat.s-div,.sp.s-div{--c:#4aa3ff}.acard.fb .stat.s-han,.sp.s-han{--c:#35e07f}.acard.fb .stat.s-kic,.sp.s-kic{--c:#ffe14d}
.acard.fb .stat.s-ref,.sp.s-ref{--c:#ff5d73}.acard.fb .stat.s-spd,.sp.s-spd{--c:#ff9a3d}.acard.fb .stat.s-gkp,.sp.s-gkp{--c:#b987ff}
.acard.fb .stat b{color:var(--c)}
.pill.fb-icon{background:var(--yellow,#ffe14d);color:#101010;font-weight:800}
.fb-top{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.fb-top select,.fb-top .btn{min-height:40px}
.fb-pitch{position:relative;display:grid;gap:10px;padding:12px 6px;border:2px solid var(--edge,#ccc);background:repeating-linear-gradient(0deg,#17572f 0 56px,#1b6335 56px 112px);overflow:hidden}
.fb-pitch::before{content:"";position:absolute;inset:6px;border:2px solid rgba(255,255,255,.35);pointer-events:none}
.fb-pitch::after{content:"";position:absolute;left:0;right:0;top:50%;border-top:2px solid rgba(255,255,255,.3);pointer-events:none}
.fb-line{display:flex;justify-content:space-around;gap:4px;position:relative;z-index:1}
.fb-slot{position:relative;display:grid;justify-items:center;gap:2px;width:min(23%,92px);min-width:62px;padding:4px 2px;background:rgba(4,16,10,.72);color:var(--text,#fff);border:2px solid rgba(255,255,255,.4);font:inherit;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}
.fb-slot img{width:44px;height:44px;border-radius:50%;object-fit:cover;object-position:50% 18%;background:#0e2317;pointer-events:none}
.fb-slot .emoji{font-size:1.6rem;pointer-events:none}
.fb-slot .nm{font-size:.7rem;line-height:1.1;text-align:center;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;pointer-events:none}
.fb-slot .ov{position:absolute;top:-6px;right:-6px;font:800 .72rem var(--display,inherit);background:var(--yellow,#ffe14d);color:#101010;padding:0 4px;pointer-events:none}
.fb-slot .cd{font-size:.62rem;color:var(--muted,#9ab);pointer-events:none}
.fb-slot.fit-warn{border-color:var(--warn,#ffc04d)}
.fb-slot.fit-bad{border-color:var(--bad,#ff7a8a);background:rgba(80,10,20,.7)}
.fb-slot.sel{outline:3px solid var(--yellow,#ffe14d);outline-offset:1px}
.fb-slot.over{outline:3px dashed var(--teal,#35e07f);outline-offset:1px}
.fb-slot.empty{opacity:.5;border-style:dashed}
.fb-bench{display:flex;flex-wrap:wrap;gap:8px;padding:8px;border:1.5px dashed var(--edge-dim,#789);background:var(--field,#050f09);min-height:70px}
.fb-bench .fb-slot{width:84px}
.fb-hint{font-size:.8rem;color:var(--muted,#9ab)}
.fb-ghost{position:fixed;z-index:9999;pointer-events:none;opacity:.9;transform:translate(-50%,-60%) scale(1.08)}
.fb-cmp{display:grid;gap:6px}
.fb-cmp .r{display:grid;grid-template-columns:2.4rem 1fr 5.5rem 1fr 2.4rem;gap:6px;align-items:center;font-size:.85rem}
.fb-cmp .r b{text-align:center}
.fb-cmp .bar{height:10px;background:var(--field,#050f09);border:1px solid var(--edge-dim,#789);position:relative}
.fb-cmp .bar i{position:absolute;top:0;bottom:0;background:var(--teal,#35e07f)}
.fb-cmp .bar.l i{right:0}.fb-cmp .bar.rr i{left:0;background:var(--pink,#ff3d57)}
.fb-cmp .lab{text-align:center;color:var(--muted,#9ab)}
.fb-score{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;text-align:center}
.fb-score .big{font:800 2.6rem var(--display,inherit);letter-spacing:.06em;background:var(--dark,#04100a);color:var(--yellow,#ffe14d);padding:0 14px;border:2px solid var(--edge,#ccc)}
.fb-score .tn{font:800 1.15rem var(--display,inherit);text-transform:uppercase;overflow:hidden;text-overflow:ellipsis}
.fb-clock{text-align:center;font:700 1rem var(--display,inherit);color:var(--teal,#35e07f);margin-top:4px}
.fb-log{max-height:260px;overflow:auto;display:grid;gap:4px;margin-top:8px}
.fb-log div{padding:5px 8px;background:var(--sheet,#0e2317);border-left:3px solid var(--edge-dim,#789);font-size:.9rem}
.fb-log div.goal{border-left-color:var(--yellow,#ffe14d);font-weight:700}
.fb-log div.sub{border-left-color:var(--blue,#4aa3ff)}
.fb-log div.mark{color:var(--muted,#9ab)}
.fb-xi{display:grid;gap:2px;font-size:.8rem;margin-top:6px}
.fb-tbl{width:100%;border-collapse:collapse;font-size:.9rem}
.fb-tbl th,.fb-tbl td{padding:4px 6px;text-align:right}
.fb-tbl th:first-child,.fb-tbl td:first-child{text-align:left}
.fb-tbl tr.me td{background:rgba(255,225,77,.12)}
.fb-tbl td.n{font-weight:700}
.fb-row-vs{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap}
@media (max-width:520px){.fb-slot{min-width:56px}.fb-slot img{width:38px;height:38px}.fb-score .big{font-size:2rem}}
.fb-viewer{display:grid;gap:6px}
.fb-view{position:relative;width:100%;aspect-ratio:105/68;max-height:70vh;margin:0 auto;background:#1c6b3a;border:2px solid var(--edge,#ccc);overflow:hidden}
.fb-canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
@media (orientation:portrait){.fb-view{aspect-ratio:68/105;max-height:72vh;max-width:min(100%,calc(72vh * 68 / 105))}}
.fb-ov{position:absolute;left:0;right:0;top:8%;display:flex;justify-content:center;pointer-events:none;padding:0 8px}
.fb-ov[hidden]{display:none}
.fb-card{background:rgba(4,16,10,.92);color:#fff;border:2px solid var(--edge,#ccc);padding:8px 14px;text-align:center;max-width:94%;animation:fb-in .25s ease-out}
.fb-card.goal{border-color:var(--yellow,#ffe14d)}
.fb-card.yellow{border-color:#ffe14d}.fb-card.red{border-color:#ff3d57}
.fb-cardchip{display:inline-block;width:14px;height:20px;margin-right:8px;vertical-align:middle;border-radius:2px}
.fb-cardchip.yellow{background:#ffe14d}.fb-cardchip.red{background:#ff3d57}
.fb-pop{font:800 2rem var(--display,inherit);color:var(--yellow,#ffe14d);letter-spacing:.08em;animation:fb-pop .5s ease-out}
.fb-who{align-items:center;justify-content:center;gap:10px}
.fb-who .fb-plate{width:64px;height:64px}
.fb-big2{font:800 1.2rem var(--display,inherit);margin:4px 0}
.fb-ctl{justify-content:center;gap:8px}
.fb-pens{min-height:1.1em}
.fb-log div.save{border-left-color:var(--teal,#35e07f)}.fb-log div.miss{border-left-color:var(--edge-dim,#789)}
.fb-log div.yellow{border-left-color:#ffe14d}.fb-log div.red{border-left-color:#ff3d57;font-weight:700}
.fb-br{display:grid;gap:4px;margin:6px 0}
.fb-brm{padding:4px 8px;background:var(--sheet,#0e2317);border-left:3px solid var(--edge-dim,#789);gap:8px;flex-wrap:wrap}
.fb-brm.me{border-left-color:var(--yellow,#ffe14d)}.fb-brm b.win{color:var(--yellow,#ffe14d)}
.fb-tick{padding:4px 0;gap:8px;flex-wrap:wrap}.fb-tick.me{font-weight:700}
.fb-rank{margin:6px 0;padding-left:1.4rem}
.fb-stats{margin:8px 0;background:var(--sheet,#0e2317);padding:10px 8px;border:2px solid var(--edge,#ccc)}
.fb-st-head{display:grid;grid-template-columns:1fr auto 1fr;gap:6px;align-items:start;margin-bottom:8px}
.fb-st-team{min-width:0}.fb-st-name{display:block;text-align:center;margin-bottom:4px}
.fb-st-icons{display:grid;grid-template-columns:repeat(auto-fill,minmax(46px,1fr));gap:4px 2px}
.fb-st-pl{display:flex;flex-direction:column;align-items:center;min-width:0;font-size:.62rem;line-height:1.1;text-align:center}
.fb-st-pl>:first-child{width:34px;height:34px;object-fit:cover;border-radius:50%}
.fb-st-pl span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fb-st-mid{text-align:center;padding:0 4px}.fb-st-title{font:700 .8rem var(--display,inherit);letter-spacing:.08em}
.fb-st-score{font:800 1.5rem var(--display,inherit);margin-top:4px}
.fb-st-row{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:5px 0;text-align:center}
.fb-st-lab{padding:0 10px;min-width:8.5rem}
.fb-st-v{justify-self:center;min-width:2.6rem;padding:2px 10px;border-radius:99px}
.fb-st-v.lead{color:#fff;font-weight:700}
.fb-st-tabs{gap:6px;margin:6px 0}
.fb-live{margin-top:8px}
.fb-live .fb-stats{margin:0}
.fb-live .fb-st-pl>:first-child{width:28px;height:28px}
@media (max-width:520px){.fb-st-icons{grid-template-columns:repeat(4,1fr)}.fb-st-lab{min-width:5.5rem;font-size:.82rem}.fb-st-pl>:first-child{width:30px;height:30px}}
@keyframes fb-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
@keyframes fb-pop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.15);opacity:1}100%{transform:scale(1)}}
@media (prefers-reduced-motion:reduce){.fb-card,.fb-pop{animation:none}}
`;
export function ensureStyles() {
  if (typeof document === "undefined" || document.__fbStyles) return;
  try { const el = document.createElement("style"); el.textContent = CSS; (document.head || document.documentElement).append(el); document.__fbStyles = true; } catch (e) { console.warn("[football] styles not injected", e); }
}
