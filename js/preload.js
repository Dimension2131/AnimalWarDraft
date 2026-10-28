// js/preload.js: bounded, deduplicated image preloading + a shared "this URL failed" memory.
//
// Why: the game used to start downloading EVERY silhouette as soon as a pack was loaded (156 requests for animals on the home screen, 406 after
// tapping the Football tab, all at once, for assets only the quiz uses). Now only what the player is about to see is fetched, a few at a time.
//   preload(urls)  queue URLs (deduplicated, at most CONCURRENCY in flight, decoded off the main thread when the browser supports decode()).
//   failed         URLs that errored once. Screens re-render often (every bid); without this a missing image was re-requested (and flashed as a
//                  broken image) on every re-render. Callers check failed.has(url) before creating an <img>.
const CONCURRENCY = 3, KEEP = 96;
const held = new Map();      // url -> Image. Holding the object keeps the decoded bitmap/cache entry alive until it is evicted (oldest first).
const queued = new Set();
let queue = [], active = 0;
export const failed = new Set();

function trim() { while (held.size > KEEP) held.delete(held.keys().next().value); }
function pump() {
  while (active < CONCURRENCY && queue.length) {
    const url = queue.shift(); queued.delete(url);
    if (held.has(url) || failed.has(url)) continue;
    active++;
    const im = new Image(); im.decoding = "async";
    const done = () => { active--; pump(); };
    im.onload = () => { (typeof im.decode === "function" ? im.decode().catch(() => { }) : Promise.resolve()).then(done); };
    im.onerror = () => { failed.add(url); held.delete(url); done(); };
    held.set(url, im); trim();
    im.src = url;
  }
}
// urls are served in the order given; earlier = more urgent. Safe to call on every render.
export function preload(urls) {
  if (typeof Image === "undefined") return;
  for (const u of urls) {
    if (!u || typeof u !== "string" || held.has(u) || failed.has(u) || queued.has(u)) continue;
    queued.add(u); queue.push(u);
  }
  pump();
}
// The picture a card shows for an entity (same choice as the card code makes), used to prefetch upcoming lots.
export const cardImage = (pack, a) => (!a ? null : (pack && (pack.engine === "pokemon" || pack.engine === "football" || pack.engine === "basketball")) ? a.image : (a.iconUrl || a.silhouette || null));
