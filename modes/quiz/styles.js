const CSS = `
.qz-head{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;justify-content:space-between}
.qz-head .qz-step{font:1.05rem var(--display);letter-spacing:.04em}
.qz-stage{display:flex;flex-direction:column;gap:12px}
.qz-plate{position:relative;align-self:center;width:min(78vw,320px);aspect-ratio:1;background:var(--yellow);border:2px solid var(--dark);box-shadow:var(--offset);display:grid;place-items:center;border-radius:50%;padding:13%}
.qz-plate.small{width:min(52vw,200px);padding:11%}
.qz-plate.sq{border-radius:22px;padding:5%}
.qz-plate.photo{padding:0;overflow:hidden}
.qz-sil{max-width:100%;max-height:100%;object-fit:contain;filter:url(#ink-ink)}
.qz-photo{position:absolute;display:block;object-fit:cover;object-position:50% 35%;inset:0;width:100%;height:100%}
.qz-plate.sq.photo .qz-photo{object-fit:contain;object-position:center}
.qz-plate.photo.cutout .qz-photo,.qz-plate.sq.photo.cutout .qz-photo{object-fit:contain;object-position:center;inset:5%;width:90%;height:90%}
.qz-plate.photo.cutout:not(.sq) .qz-photo{inset:3%;width:94%;height:94%}
.qz-q{font:4rem var(--display);color:var(--dark)}
.qz-emoji{font-size:5rem;line-height:1}
.qz-prompt{font:1.35rem/1.25 var(--display);text-align:center;margin:0}
.qz-hint{text-align:center;color:var(--muted);font-size:.9rem;margin:0}
.qz-opts{display:grid;gap:8px}
.qz-opt{width:100%;text-align:left;font-size:1.05rem;padding:14px 16px;min-height:52px}
.qz-opt.sel{background:var(--teal);color:var(--dark);border-color:var(--teal)}
.qz-opt.right{background:var(--good);color:var(--dark)}
.qz-opt.wrong{background:var(--bad);color:var(--dark)}
.qz-num{display:grid;gap:10px}
.qz-num input[type=range]{width:100%;-webkit-appearance:none;appearance:none;height:34px;background:transparent;margin:0}
.qz-num input[type=range]::-webkit-slider-runnable-track{height:12px;background:linear-gradient(90deg,var(--yellow),var(--pink));border:2px solid var(--dark);border-radius:99px}
.qz-num input[type=range]::-moz-range-track{height:12px;background:linear-gradient(90deg,var(--yellow),var(--pink));border:2px solid var(--dark);border-radius:99px}
.qz-num input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:30px;height:30px;margin-top:-11px;border-radius:50%;background:var(--text);border:3px solid var(--dark);box-shadow:2px 2px 0 var(--dark)}
.qz-num input[type=range]::-moz-range-thumb{width:26px;height:26px;border-radius:50%;background:var(--text);border:3px solid var(--dark)}
.qz-read{font:1.9rem var(--display);text-align:center;color:var(--muted);min-height:1.3em}
.qz-read.set{color:var(--yellow)}
.qz-ticks{display:flex;justify-content:space-between;font-size:.78rem;color:var(--muted);margin-top:-6px}
.qz-numrow{display:flex;gap:8px;align-items:center}
.qz-numrow input[type=number]{flex:1;min-width:0;font-size:1.3rem;padding:10px}
.qz-unit{font:1.1rem var(--display);color:var(--yellow);white-space:nowrap}
.qz-status{text-align:center;min-height:1.4em;color:var(--muted)}
.qz-status.ok{color:var(--good)}
.qz-big{font:2rem var(--display);text-align:center;margin:0}
.qz-tbl{width:100%;border-collapse:collapse}
.qz-tbl th,.qz-tbl td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--rule);vertical-align:top}
.qz-tbl td.n,.qz-tbl th.n{text-align:right;white-space:nowrap}
.qz-pos{color:var(--good)}.qz-neg{color:var(--bad)}
.qz-true{font:1.15rem var(--display);color:var(--yellow)}
.qz-src{color:var(--muted);font-size:.8rem;overflow-wrap:anywhere}
.qz-me{background:rgba(51,214,192,.12)}
.qz-podium{display:grid;gap:8px}
`;
export function ensureStyles() {
  if (typeof document === "undefined" || document.__qzStyles) return;
  try {
    const el = document.createElement("style"); el.textContent = CSS;
    (document.head || document.documentElement).append(el); document.__qzStyles = true;
  } catch (e) { console.warn("[quiz] styles not injected", e); }
}