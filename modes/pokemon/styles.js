const CSS = `
.pk-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.pk-lrow{border:1.5px solid var(--edge-dim);background:var(--sheet);padding:8px;display:grid;gap:8px;margin-bottom:8px}
.pk-lhead{display:flex;gap:8px;align-items:center}
.pk-lhead .grow{flex:1;min-width:0}
.pk-lhead img.sil{width:56px;height:56px;image-rendering:pixelated}
.pk-pos{font:1.1rem var(--display);color:var(--yellow);width:1.4em;text-align:center}
.pk-mv-slots{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.pk-slot{display:flex;gap:6px;align-items:center;justify-content:space-between;text-align:left;padding:8px;border:1.5px solid var(--edge-dim);background:var(--field);color:var(--text);cursor:pointer;font:inherit;min-height:44px}
.pk-slot.empty{opacity:.5;border-style:dashed}
.pk-mv-list{max-height:260px;overflow:auto;display:grid;gap:4px;border:1.5px dashed var(--edge-dim);padding:6px;background:var(--field)}
.pk-mv{display:grid;grid-template-columns:1fr auto;gap:2px 8px;text-align:left;padding:7px 8px;border:1.5px solid var(--rule);background:var(--sheet);color:var(--text);cursor:pointer;font:inherit}
.pk-mv.on{border-color:var(--teal);background:rgba(51,214,192,.12)}
.pk-mv small{color:var(--muted);grid-column:1/-1}
.pk-filter{display:flex;gap:6px;flex-wrap:wrap}
.pk-filter input,.pk-filter select{flex:1;min-width:110px}
.pk-arena{position:relative;border:2px solid var(--dark);box-shadow:var(--offset);overflow:hidden;background:linear-gradient(#17304f,#27527a 52%,#3c6b3a 52%,#2b5129);display:grid;grid-template-rows:auto auto;gap:6px;padding:8px 4px}
.pk-arena[data-w=rain]{background:linear-gradient(#1b2433,#30465f 55%,#2f4a32 55%,#223b27)}
.pk-arena[data-w=sun]{background:linear-gradient(#ff9a3d,#ffd36b 55%,#6b8a3a 55%,#4a6b2a)}
.pk-arena[data-w=sand]{background:linear-gradient(#a8803c,#d1ad66 55%,#9c7b3f 55%,#7d6030)}
.pk-arena[data-w=hail],.pk-arena[data-w=snow]{background:linear-gradient(#8db3d6,#d3e6f5 55%,#b7ccdc 55%,#93a9b8)}
.pk-side{position:relative;display:flex;flex-direction:column;gap:2px;padding:6px 14px;width:min(100%,270px)}
.pk-side.foe{align-items:center;justify-self:end}
.pk-side.me{align-items:center;justify-self:start}
.pk-plate{background:rgba(7,12,11,.86);border:2px solid var(--dark);padding:6px 10px;width:100%;color:var(--text);display:grid;gap:4px}
.pk-plate .nm{font:1rem var(--display);display:flex;justify-content:space-between;gap:6px}
.pk-hpbar{height:10px;background:#222;border:1.5px solid var(--dark);overflow:hidden}
.pk-hpbar i{display:block;height:100%;background:var(--good);transition:width .55s ease,background .3s}
.pk-hpbar i.mid{background:var(--warn)}.pk-hpbar i.low{background:var(--bad)}
.pk-sprite{width:clamp(84px,24vw,128px);height:clamp(84px,24vw,128px);object-fit:contain;transition:transform .2s,opacity .4s,filter .3s;flex:none}
.pk-side.me .pk-sprite{transform:scaleX(-1)}
.pk-side .pk-sprite.atk{transform:translateX(24px)}.pk-side.me .pk-sprite.atk{transform:scaleX(-1) translateX(24px)}
.pk-side.foe .pk-sprite.atk{transform:translateX(-24px)}
.pk-sprite.hit{animation:pkhit .35s}
.pk-sprite.fnt{opacity:0;transform:translateY(30px)}
@keyframes pkhit{0%,100%{filter:none}25%{filter:brightness(3) saturate(0)}50%{filter:none}75%{filter:brightness(2.4) saturate(0)}}
.pk-badges{display:flex;gap:4px;flex-wrap:wrap}
.pk-b{font-size:.68rem;font-weight:800;padding:1px 6px;border-radius:999px;border:1.5px solid var(--dark);color:var(--dark);background:var(--yellow)}
.pk-b.par{background:#ffd23a}.pk-b.brn{background:#ff7a3d}.pk-b.psn,.pk-b.tox{background:#b06be0}.pk-b.slp{background:#9aa6b8}.pk-b.frz{background:#7fd6ff}
.pk-b.up{background:var(--good)}.pk-b.dn{background:var(--bad)}.pk-b.env{background:var(--teal)}
.pk-team{display:flex;gap:3px}
.pk-team i{width:11px;height:11px;border-radius:50%;background:var(--good);border:1.5px solid var(--dark)}
.pk-team i.fnt{background:#444}.pk-team i.cur{outline:2px solid var(--yellow)}
.pk-log{height:150px;overflow:auto;background:var(--field);border:1.5px dashed var(--edge-dim);padding:8px;font-size:.92rem}
.pk-log div{padding:1px 0}.pk-log .hl{color:var(--yellow);font-weight:700}
.pk-ctl{display:grid;gap:8px}
.pk-moves{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.pk-mbtn{display:grid;gap:2px;text-align:left;padding:9px 10px;border:2px solid var(--dark);color:var(--dark);cursor:pointer;font:inherit;min-height:62px;box-shadow:2px 2px 0 var(--dark)}
.pk-mbtn b{font-size:1rem}.pk-mbtn small{opacity:.85}
.pk-mbtn:disabled{opacity:.45;cursor:not-allowed}
.pk-bench{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px}
.pk-bbtn{display:flex;gap:6px;align-items:center;padding:6px;border:1.5px solid var(--edge-dim);background:var(--sheet);color:var(--text);cursor:pointer;font:inherit;text-align:left}
.pk-bbtn img{width:36px;height:36px;image-rendering:pixelated}
.pk-bbtn .pk-hpbar{height:6px;margin-top:3px}
.pk-bbtn:disabled{opacity:.4}
.pk-banner{font:1.4rem var(--display);text-align:center;color:var(--yellow);text-shadow:3px 3px 0 var(--pink)}
.pk-vs{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap}
.pk-eff{font-size:.7rem;font-weight:800;background:var(--dark);color:var(--yellow);padding:0 5px;border-radius:99px;justify-self:start}
@media (max-width:520px){.pk-plate .nm{font-size:.85rem}.pk-side{width:min(100%,240px)}}
`;
export function ensureStyles() {
  if (typeof document === "undefined" || document.__pkStyles) return;
  try { const el = document.createElement("style"); el.textContent = CSS; (document.head || document.documentElement).append(el); document.__pkStyles = true; } catch (e) { console.warn("[pokemon] styles not injected", e); }
}
