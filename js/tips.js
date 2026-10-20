// =====================================================================
// tips.js — tooltips for stat labels: native `title` on hover (desktop) plus a tap/keyboard popover (phones).
// tip(el, text) marks an element; installTips() is called once at startup.
// =====================================================================
export function tip(el, text) {
  if (!text) return el;
  el.title = text; el.dataset.tip = text; el.tabIndex = 0; el.classList.add("has-tip");
  return el;
}
let pop = null, hideT = 0;
export function installTips() {
  if (pop || typeof document === "undefined") return;
  pop = document.createElement("div"); pop.className = "tippop"; pop.setAttribute("role", "tooltip"); pop.hidden = true; document.body.append(pop);
  const hide = () => { pop.hidden = true; clearTimeout(hideT); };
  const show = (el) => {
    pop.textContent = el.dataset.tip; pop.hidden = false;
    const r = el.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
    const top = r.bottom + 8 + h > window.innerHeight ? Math.max(8, r.top - h - 8) : r.bottom + 8;
    pop.style.left = left + "px"; pop.style.top = top + "px";
    clearTimeout(hideT); hideT = setTimeout(hide, 9000);
  };
  document.addEventListener("click", (e) => { const t = e.target.closest && e.target.closest("[data-tip]"); if (t) show(t); else hide(); }, true);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(); else if ((e.key === "Enter" || e.key === " ") && e.target.dataset && e.target.dataset.tip) { e.preventDefault(); show(e.target); } });
  window.addEventListener("scroll", hide, { passive: true, capture: true });
}
