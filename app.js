const SEED = {
  tiktok: [
    { id: "6718335390845095173" },
    { id: "6948210747285441798" },
    { id: "7067695578729221378" },
    { id: "6742501081818877190" },
    { id: "7527476667770522893" },
    { id: "6796374554391448838" },
    { id: "6990565363377392901" }
  ],
  youtube: [
    { id: "DLJRmUT9IRk" },
    { id: "vUKfHzd0fkA" },
    { id: "iThZjk94-tU" },
    { id: "EtBc4mWMmJE" },
    { id: "T6BlmRDbHm4" },
    { id: "_EYl7YgqwHY" },
    { id: "vMGuObY8_sw" },
    { id: "lsViB64M7Rk" }
  ],
  instagram: [
    { id: "DW-toGVj4I4" },
    { id: "DW2k9pLTeQ4" },
    { id: "Dbn-XJhk0_-" },
    { id: "DWowsEjjQlE" }
  ]
};

const NAMES = { tiktok: "TIKTOK", youtube: "SHORTS", instagram: "INSTAGRAM" };
const CLS = { tiktok: "tt", youtube: "yt", instagram: "ig" };

const splash = document.getElementById("splash");
const hud = document.querySelector(".hud");
const feed = document.getElementById("feed");
const track = document.getElementById("track");
const hitNum = document.getElementById("hit-num");
const muteBtn = document.getElementById("mute-btn");
const autoBtn = document.getElementById("auto-btn");
const drawer = document.getElementById("drawer");
const toast = document.getElementById("toast");
const addStatus = document.getElementById("add-status");

const customKey = "dm-custom-v1";
const colsKey = "dm-cols-v3";
const thumbKey = "dm-tt-thumbs-v1";
const YT = "https://www.youtube-nocookie.com";

let muted = true;
let auto = false;
let cols = initialCols();
let hits = [];
let index = 0;
let slideH = 0;
let dragging = false;
let axis = null;
let startX = 0;
let startY = 0;
let lastY = 0;
let lastT = 0;
let dy = 0;
let vy = 0;
let playing = null;
let paused = false;

window.open = () => null;

function clampCols(n) {
  n = Number(n);
  return n === 1 || n === 2 || n === 3 ? n : 1;
}
function initialCols() {
  const saved = localStorage.getItem(colsKey);
  if (saved) return clampCols(saved);
  return window.innerWidth < 800 ? 1 : 3;
}
function loadCustom() {
  try { return JSON.parse(localStorage.getItem(customKey) || "[]"); }
  catch { return []; }
}
function saveCustom(list) {
  localStorage.setItem(customKey, JSON.stringify(list.slice(-40)));
}
function loadThumbs() {
  try { return JSON.parse(localStorage.getItem(thumbKey) || "{}"); }
  catch { return {}; }
}
function saveThumbs(map) {
  localStorage.setItem(thumbKey, JSON.stringify(map));
}
function parseUrl(raw) {
  const url = raw.trim();
  let m = url.match(/(?:youtube\.com\/shorts\/|youtube\.com\/embed\/|youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  if (m) return { platform: "youtube", id: m[1] };
  m = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/) || url.match(/tiktok\.com\/player\/v1\/(\d+)/);
  if (m) return { platform: "tiktok", id: m[1] };
  m = url.match(/instagram\.com\/(reel|p|reels)\/([A-Za-z0-9_-]+)/);
  if (m) return { platform: "instagram", id: m[2] };
  return null;
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pools(doShuffle) {
  const custom = loadCustom();
  return {
    tiktok: (doShuffle ? shuffle(SEED.tiktok) : SEED.tiktok.slice()).concat(custom.filter(x => x.platform === "tiktok")),
    youtube: (doShuffle ? shuffle(SEED.youtube) : SEED.youtube.slice()).concat(custom.filter(x => x.platform === "youtube")),
    instagram: (doShuffle ? shuffle(SEED.instagram) : SEED.instagram.slice()).concat(custom.filter(x => x.platform === "instagram"))
  };
}
function buildHits(doShuffle) {
  const p = pools(doShuffle);
  const n = Math.max(p.tiktok.length, p.youtube.length, p.instagram.length, 8);
  if (cols === 1) {
    hits = [];
    for (let i = 0; i < n; i++) {
      hits.push([{ platform: "tiktok", item: p.tiktok[i % p.tiktok.length] }]);
      hits.push([{ platform: "youtube", item: p.youtube[i % p.youtube.length] }]);
      hits.push([{ platform: "instagram", item: p.instagram[i % p.instagram.length] }]);
    }
    return;
  }
  hits = Array.from({ length: n }, (_, i) => {
    const row = [
      { platform: "tiktok", item: p.tiktok[i % p.tiktok.length] },
      { platform: "youtube", item: p.youtube[i % p.youtube.length] }
    ];
    if (cols === 3) row.push({ platform: "instagram", item: p.instagram[i % p.instagram.length] });
    return row;
  });
}

function ytPosters(id) {
  return [
    `https://i.ytimg.com/vi/${id}/oardefault.jpg`,
    `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
  ];
}
function posterSrc(platform, item) {
  if (platform === "youtube") return ytPosters(item.id)[0];
  if (platform === "tiktok") {
    const cached = loadThumbs()[item.id];
    if (cached && cached.exp > Date.now()) return cached.url || "";
  }
  return "";
}
function posterFallback(platform, item) {
  if (platform === "youtube") return ytPosters(item.id).slice(1).join("|");
  return "";
}
function titleFor(platform, item) {
  if (item.title) return item.title;
  if (platform === "instagram") return "REEL CARD";
  if (platform === "youtube") return "SHORT";
  return "TIKTOK";
}
function subFor(platform, item) {
  if (item.author) return item.author;
  if (platform === "instagram") return "no playback on the open web";
  return item.id;
}

function paneHTML(card) {
  const { platform, item } = card;
  const src = posterSrc(platform, item);
  const fb = posterFallback(platform, item);
  return `
    <article class="pane ${CLS[platform]}" data-platform="${platform}" data-id="${item.id}">
      <span class="badge">${NAMES[platform]}</span>
      <div class="poster">
        <img alt="" src="${src}" data-fallback="${fb}" referrerpolicy="no-referrer" />
        <div class="meta">
          <h2 data-title>${titleFor(platform, item)}</h2>
          <p data-sub>${subFor(platform, item)}</p>
        </div>
        ${platform === "instagram" ? "" : `<button class="play" type="button" data-play>PLAY</button>`}
      </div>
      <div class="stage"></div>
      <div class="rail">
        <button type="button" data-pause>PAUSE</button>
        <button type="button" data-stop>STOP</button>
        <button type="button" data-next>NEXT</button>
      </div>
    </article>`;
}

function applyColsUi() {
  document.documentElement.style.setProperty("--cols", String(cols));
  document.querySelectorAll("#col-picker button").forEach((btn) => {
    btn.classList.toggle("on", Number(btn.dataset.cols) === cols);
  });
}

function render() {
  applyColsUi();
  stopPlayer();
  track.innerHTML = hits.map((row) => `<section class="slide">${row.map(paneHTML).join("")}</section>`).join("");
  measure();
  goTo(0, true);
  hydrate();
}

function measure() {
  slideH = feed.clientHeight || window.innerHeight;
  paint(true);
}
function paint(instant) {
  const max = Math.max(0, (hits.length - 1) * slideH);
  let y = index * slideH - dy;
  if (y < 0) y *= 0.32;
  if (y > max) y = max + (y - max) * 0.32;
  track.style.transition = instant ? "none" : "transform 280ms cubic-bezier(.22,.8,.2,1)";
  track.style.transform = `translate3d(0, ${-y}px, 0)`;
}
function goTo(next, instant) {
  const prev = index;
  index = Math.max(0, Math.min(hits.length - 1, next));
  dy = 0;
  hitNum.textContent = String(index + 1).padStart(2, "0");
  paint(instant);
  if (prev !== index) stopPlayer();
  if (auto) maybeAuto();
}

function embedSrc(platform, id) {
  if (platform === "youtube") {
    return `${YT}/embed/${id}?autoplay=1&mute=${muted ? 1 : 0}&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&loop=1&playlist=${id}&origin=${encodeURIComponent(location.origin)}`;
  }
  return `https://www.tiktok.com/player/v1/${id}?autoplay=1&muted=${muted ? 1 : 0}&loop=1&progress_bar=0&controls=0`;
}

function stopPlayer() {
  if (!playing) return;
  playing.classList.remove("playing");
  const stage = playing.querySelector(".stage");
  if (stage) stage.innerHTML = "";
  playing = null;
  paused = false;
}
function mountPlayer(pane) {
  const platform = pane.dataset.platform;
  const id = pane.dataset.id;
  if (platform === "instagram") return;
  if (playing && playing !== pane) stopPlayer();
  playing = pane;
  paused = false;
  pane.classList.add("playing");
  pane.querySelector("[data-pause]").textContent = "PAUSE";
  pane.querySelector(".stage").innerHTML = `
    <iframe
      title="${NAMES[platform]}"
      src="${embedSrc(platform, id)}"
      sandbox="allow-scripts allow-same-origin allow-presentation"
      allow="autoplay; encrypted-media; picture-in-picture"
    ></iframe>`;
}
function ytCommand(func) {
  const frame = playing && playing.querySelector("iframe");
  if (!frame || !frame.src.includes("youtube")) return false;
  frame.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args: [] }), YT);
  return true;
}
function togglePause() {
  if (!playing) return;
  paused = !paused;
  playing.querySelector("[data-pause]").textContent = paused ? "PLAY" : "PAUSE";
  if (ytCommand(paused ? "pauseVideo" : "playVideo")) return;
  const platform = playing.dataset.platform;
  const id = playing.dataset.id;
  const frame = playing.querySelector("iframe");
  if (!frame) return;
  if (paused) frame.src = "";
  else frame.src = embedSrc(platform, id);
}
function setMuted(next) {
  muted = next;
  muteBtn.classList.toggle("on", muted);
  muteBtn.textContent = muted ? "MUTE" : "SOUND";
  if (!playing) return;
  if (ytCommand(muted ? "mute" : "unMute")) return;
  const platform = playing.dataset.platform;
  const id = playing.dataset.id;
  const frame = playing.querySelector("iframe");
  if (frame) frame.src = embedSrc(platform, id);
}
function maybeAuto() {
  if (!auto) return;
  const row = hits[index] || [];
  const yt = row.find((c) => c.platform === "youtube");
  if (!yt) return;
  const pane = feed.querySelector(`.slide:nth-child(${index + 1}) .pane.yt`);
  if (pane) mountPlayer(pane);
}

async function hydrate() {
  const thumbs = loadThumbs();
  const jobs = [];
  hits.flat().forEach((card) => {
    if (card.platform === "youtube") {
      jobs.push(fetch(`https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${card.item.id}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (!data) return;
          card.item.title = data.title || card.item.title;
          card.item.author = data.author_name || card.item.author;
        })
        .catch(() => {}));
    }
    if (card.platform === "tiktok") {
      const cached = thumbs[card.item.id];
      if (cached && cached.exp > Date.now()) {
        card.item.title = cached.title || card.item.title;
        card.item.author = cached.author || card.item.author;
        card.item.thumb = cached.url;
        return;
      }
      jobs.push(fetch(`https://www.tiktok.com/oembed?url=https://www.tiktok.com/@i/video/${card.item.id}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (!data) return;
          card.item.title = data.title || card.item.title;
          card.item.author = data.author_name || card.item.author;
          card.item.thumb = data.thumbnail_url;
          thumbs[card.item.id] = {
            url: data.thumbnail_url || "",
            title: data.title || "",
            author: data.author_name || "",
            exp: Date.now() + 6 * 60 * 60 * 1000
          };
        })
        .catch(() => {}));
    }
  });
  await Promise.all(jobs);
  saveThumbs(thumbs);
  feed.querySelectorAll(".pane").forEach((pane) => {
    const platform = pane.dataset.platform;
    const id = pane.dataset.id;
    const card = hits.flat().find((c) => c.platform === platform && c.item.id === id);
    if (!card) return;
    const title = pane.querySelector("[data-title]");
    const sub = pane.querySelector("[data-sub]");
    const img = pane.querySelector("img");
    if (title) title.textContent = titleFor(platform, card.item);
    if (sub) sub.textContent = subFor(platform, card.item);
    if (img && card.item.thumb && !img.src) img.src = card.item.thumb;
    if (img && card.item.thumb && platform === "tiktok") img.src = card.item.thumb;
  });
}

function showToast(msg) {
  toast.hidden = false;
  toast.textContent = msg;
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => { toast.hidden = true; }, 1500);
}
function setCols(next) {
  const n = clampCols(next);
  if (n === cols) return;
  cols = n;
  localStorage.setItem(colsKey, String(cols));
  buildHits(false);
  render();
  showToast(cols === 1 ? "FULL SCREEN" : `${cols} SIDE BY SIDE`);
}
function enter() {
  splash.hidden = true;
  hud.hidden = false;
  feed.hidden = false;
  buildHits(true);
  render();
  showToast("SWIPE THE CARDS · TAP PLAY");
}
function addClip(raw) {
  const parsed = parseUrl(raw);
  if (!parsed) {
    addStatus.textContent = "tiktok / youtube shorts / instagram reel only";
    return false;
  }
  const list = loadCustom();
  list.push(parsed);
  saveCustom(list);
  buildHits(false);
  render();
  addStatus.textContent = `injected ${parsed.platform}`;
  showToast(`ADDED ${parsed.platform.toUpperCase()}`);
  return true;
}

function eventPoint(e) {
  if (e.touches && e.touches[0]) return e.touches[0];
  if (e.changedTouches && e.changedTouches[0]) return e.changedTouches[0];
  return e;
}
function onDown(e) {
  if (e.target.closest("button, input, a, .drawer-card")) return;
  if (playing && !e.target.closest(".rail, .poster, .feed")) return;
  const p = eventPoint(e);
  dragging = true;
  axis = null;
  startX = p.clientX;
  startY = p.clientY;
  lastY = p.clientY;
  lastT = performance.now();
  dy = 0;
  vy = 0;
  paint(true);
}
function onMove(e) {
  if (!dragging) return;
  const p = eventPoint(e);
  const x = p.clientX - startX;
  const y = p.clientY - startY;
  if (!axis && Math.hypot(x, y) > 6) axis = Math.abs(y) >= Math.abs(x) ? "y" : "x";
  if (axis !== "y") return;
  if (e.cancelable) e.preventDefault();
  const now = performance.now();
  const dt = Math.max(1, now - lastT);
  vy = (p.clientY - lastY) / dt;
  lastY = p.clientY;
  lastT = now;
  dy = y;
  paint(true);
}
function onUp() {
  if (!dragging) return;
  dragging = false;
  if (axis === "y" && (Math.abs(dy) > slideH * 0.16 || Math.abs(vy) > 0.45)) {
    goTo(dy < 0 ? index + 1 : index - 1);
  } else {
    goTo(index);
  }
  axis = null;
}

feed.addEventListener("pointerdown", onDown);
window.addEventListener("pointermove", onMove, { passive: false });
window.addEventListener("pointerup", onUp);
window.addEventListener("pointercancel", onUp);
feed.addEventListener("touchstart", onDown, { passive: true });
window.addEventListener("touchmove", onMove, { passive: false });
window.addEventListener("touchend", onUp);
feed.addEventListener("wheel", (e) => {
  e.preventDefault();
  if (e.deltaY > 18) goTo(index + 1);
  else if (e.deltaY < -18) goTo(index - 1);
}, { passive: false });

feed.addEventListener("error", (e) => {
  if (e.target.tagName !== "IMG") return;
  const next = (e.target.dataset.fallback || "").split("|").filter(Boolean);
  if (!next.length) { e.target.removeAttribute("src"); return; }
  e.target.src = next.shift();
  e.target.dataset.fallback = next.join("|");
}, true);

feed.addEventListener("click", (e) => {
  const pane = e.target.closest(".pane");
  if (!pane) return;
  if (e.target.closest("[data-play]")) mountPlayer(pane);
  if (e.target.closest("[data-pause]")) togglePause();
  if (e.target.closest("[data-stop]")) stopPlayer();
  if (e.target.closest("[data-next]")) goTo(index + 1);
});

document.addEventListener("click", (e) => {
  const a = e.target.closest("a");
  if (!a || !a.href) return;
  try {
    if (new URL(a.href, location.href).origin !== location.origin) {
      e.preventDefault();
      e.stopPropagation();
    }
  } catch {}
}, true);

document.getElementById("enter").addEventListener("click", enter);
document.getElementById("mute-btn").addEventListener("click", () => setMuted(!muted));
document.getElementById("auto-btn").addEventListener("click", () => {
  auto = !auto;
  autoBtn.classList.toggle("on", auto);
  showToast(auto ? "AUTO ON · SHORTS ONLY" : "AUTO OFF");
  if (auto) maybeAuto();
  else stopPlayer();
});
document.getElementById("shuffle-btn").addEventListener("click", () => {
  buildHits(true);
  render();
  showToast("RESHUFFLED");
});
document.getElementById("add-btn").addEventListener("click", () => {
  drawer.hidden = false;
  document.getElementById("url-input").focus();
});
document.getElementById("close-drawer").addEventListener("click", () => { drawer.hidden = true; });
drawer.addEventListener("click", (e) => { if (e.target === drawer) drawer.hidden = true; });
document.getElementById("col-picker").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-cols]");
  if (btn) setCols(btn.dataset.cols);
});
document.getElementById("add-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("url-input");
  if (addClip(input.value)) input.value = "";
});
window.addEventListener("resize", measure);
window.addEventListener("orientationchange", () => setTimeout(measure, 250));
document.addEventListener("visibilitychange", () => { if (document.hidden) stopPlayer(); });
window.addEventListener("keydown", (e) => {
  if (!splash.hidden) {
    if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); enter(); }
    return;
  }
  if (e.code === "Space") { e.preventDefault(); setMuted(!muted); }
  if (e.key === "Escape") { stopPlayer(); drawer.hidden = true; }
  if (e.key === "1" || e.key === "2" || e.key === "3") setCols(e.key);
  if (e.key === "ArrowDown" || e.key === "j") goTo(index + 1);
  if (e.key === "ArrowUp" || e.key === "k") goTo(index - 1);
});
