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

const feedEl = document.getElementById("feed");
const splash = document.getElementById("splash");
const hud = document.querySelector(".hud");
const lock = document.getElementById("lock");
const hitNum = document.getElementById("hit-num");
const muteBtn = document.getElementById("mute-btn");
const drawer = document.getElementById("drawer");
const toast = document.getElementById("toast");
const addStatus = document.getElementById("add-status");

const customKey = "dm-custom-v1";
const colsKey = "dm-cols-v2";
let muted = true;
let hits = [];
let index = 0;
let cols = initialCols();

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
      hits.push({ platform: "tiktok", item: p.tiktok[i % p.tiktok.length] });
      hits.push({ platform: "youtube", item: p.youtube[i % p.youtube.length] });
      hits.push({ platform: "instagram", item: p.instagram[i % p.instagram.length] });
    }
    return;
  }
  hits = Array.from({ length: n }, (_, i) => ({
    tiktok: p.tiktok[i % p.tiktok.length],
    youtube: p.youtube[i % p.youtube.length],
    instagram: p.instagram[i % p.instagram.length]
  }));
}

function embedSrc(platform, item) {
  if (!item) return "";
  if (platform === "youtube") {
    return `https://www.youtube-nocookie.com/embed/${item.id}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${item.id}&playsinline=1&rel=0&modestbranding=1&controls=0&fs=0&disablekb=1`;
  }
  if (platform === "tiktok") {
    return `https://www.tiktok.com/player/v1/${item.id}?autoplay=1&muted=${muted ? 1 : 0}&loop=1&progress_bar=0&description=0&music_info=0&controls=0`;
  }
  return `https://www.instagram.com/reel/${item.id}/embed/captioned/`;
}

function paneHTML(platform, item) {
  const names = { tiktok: "TIKTOK", youtube: "SHORTS", instagram: "INSTAGRAM" };
  const cls = platform === "tiktok" ? "tt" : platform === "youtube" ? "yt" : "ig";
  return `
    <article class="pane ${cls}" data-platform="${platform}">
      <span class="badge">${names[platform]}</span>
      <div class="stage">
        <iframe
          title="${names[platform]}"
          sandbox="allow-scripts allow-same-origin"
          allow="autoplay; encrypted-media"
          referrerpolicy="no-referrer"
          tabindex="-1"
        ></iframe>
      </div>
      <iframe class="blocker" src="about:blank" tabindex="-1" aria-hidden="true"></iframe>
    </article>`;
}

function applyColsUi() {
  document.documentElement.style.setProperty("--cols", String(cols));
  document.querySelectorAll("#col-picker button").forEach((btn) => {
    btn.classList.toggle("on", Number(btn.dataset.cols) === cols);
  });
}

function setCols(next) {
  const n = clampCols(next);
  if (n === cols) return;
  cols = n;
  localStorage.setItem(colsKey, String(cols));
  index = 0;
  buildHits(false);
  render();
  showToast(cols === 1 ? "FULL SCREEN" : `${cols} SIDE BY SIDE`);
}

function render() {
  applyColsUi();
  if (cols === 1) {
    feedEl.innerHTML = hits.map((slide) => `<section class="hit">${paneHTML(slide.platform, slide.item)}</section>`).join("");
  } else {
    feedEl.innerHTML = hits.map((hit) => `
      <section class="hit">
        ${paneHTML("tiktok", hit.tiktok)}
        ${paneHTML("youtube", hit.youtube)}
        ${cols === 3 ? paneHTML("instagram", hit.instagram) : ""}
      </section>`).join("");
  }
  goTo(0, true);
}

function goTo(next, instant) {
  index = Math.max(0, Math.min(hits.length - 1, next));
  hitNum.textContent = String(index + 1).padStart(2, "0");
  const offset = index * feedEl.clientHeight;
  feedEl.scrollTo({ top: offset, behavior: instant ? "auto" : "smooth" });
  syncIframes();
}

function syncIframes() {
  document.querySelectorAll(".hit").forEach((section, i) => {
    const active = Math.abs(i - index) <= 1;
    section.querySelectorAll(".pane").forEach((pane) => {
      const iframe = pane.querySelector(".stage iframe");
      const platform = pane.dataset.platform;
      let item;
      if (cols === 1) item = hits[i] && hits[i].item;
      else item = hits[i] && hits[i][platform];
      const next = active ? embedSrc(platform, item) : "";
      if (iframe.getAttribute("src") !== next) iframe.src = next;
    });
  });
}

function setMuted(next) {
  muted = next;
  muteBtn.classList.toggle("on", muted);
  muteBtn.textContent = muted ? "MUTE" : "SOUND";
  syncIframes();
}

function showToast(msg) {
  toast.hidden = false;
  toast.textContent = msg;
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => { toast.hidden = true; }, 1500);
}

function enter() {
  splash.hidden = true;
  hud.hidden = false;
  feedEl.hidden = false;
  lock.hidden = false;
  buildHits(true);
  render();
  showToast("LINKS BLOCKED · SWIPE HERE");
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

let startY = 0;
let startX = 0;
let tracking = false;

function onStart(y, x) {
  startY = y;
  startX = x;
  tracking = true;
}
function onEnd(y, x) {
  if (!tracking) return;
  tracking = false;
  const dy = y - startY;
  const dx = x - startX;
  if (Math.abs(dy) < 36 || Math.abs(dy) < Math.abs(dx)) return;
  if (dy < 0) goTo(index + 1);
  else goTo(index - 1);
}

lock.addEventListener("touchstart", (e) => {
  const t = e.changedTouches[0];
  onStart(t.clientY, t.clientX);
}, { passive: true });
lock.addEventListener("touchend", (e) => {
  const t = e.changedTouches[0];
  onEnd(t.clientY, t.clientX);
}, { passive: true });
lock.addEventListener("mousedown", (e) => onStart(e.clientY, e.clientX));
window.addEventListener("mouseup", (e) => onEnd(e.clientY, e.clientX));
lock.addEventListener("wheel", (e) => {
  e.preventDefault();
  if (e.deltaY > 12) goTo(index + 1);
  else if (e.deltaY < -12) goTo(index - 1);
}, { passive: false });
lock.addEventListener("click", (e) => e.preventDefault());

document.getElementById("enter").addEventListener("click", enter);
document.getElementById("mute-btn").addEventListener("click", () => setMuted(!muted));
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
window.addEventListener("keydown", (e) => {
  if (!splash.hidden) {
    if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); enter(); }
    return;
  }
  if (e.code === "Space") { e.preventDefault(); setMuted(!muted); }
  if (e.key === "1" || e.key === "2" || e.key === "3") setCols(e.key);
  if (e.key === "ArrowDown" || e.key === "j") goTo(index + 1);
  if (e.key === "ArrowUp" || e.key === "k") goTo(index - 1);
});
