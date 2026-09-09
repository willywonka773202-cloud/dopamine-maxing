const SEED = {
  tiktok: [
    { id: "6718335390845095173", label: "@scout2015" },
    { id: "6948210747285441798", label: "@countingprimes" },
    { id: "7067695578729221378", label: "@burntpizza89" },
    { id: "6742501081818877190", label: "@patrox" },
    { id: "7527476667770522893", label: "@_luwes" },
    { id: "6796374554391448838", label: "@blessy2flex" },
    { id: "6990565363377392901", label: "little coco" }
  ],
  youtube: [
    { id: "DLJRmUT9IRk", label: "short" },
    { id: "vUKfHzd0fkA", label: "short" },
    { id: "iThZjk94-tU", label: "short" },
    { id: "EtBc4mWMmJE", label: "short" },
    { id: "T6BlmRDbHm4", label: "short" },
    { id: "_EYl7YgqwHY", label: "short" },
    { id: "vMGuObY8_sw", label: "artemis II" },
    { id: "lsViB64M7Rk", label: "orion" }
  ],
  instagram: [
    { id: "DW-toGVj4I4", label: "nasa" },
    { id: "DW2k9pLTeQ4", label: "nasa" },
    { id: "Dbn-XJhk0_-", label: "nasa" },
    { id: "DWowsEjjQlE", label: "public reel" }
  ]
};

const ORDER = ["tiktok", "youtube", "instagram"];
const feedEl = document.getElementById("feed");
const splash = document.getElementById("splash");
const hud = document.querySelector(".hud");
const hitNum = document.getElementById("hit-num");
const muteBtn = document.getElementById("mute-btn");
const drawer = document.getElementById("drawer");
const toast = document.getElementById("toast");
const addStatus = document.getElementById("add-status");

const customKey = "dm-custom-v1";
const colsKey = "dm-cols-v1";
let muted = true;
let hits = [];
let lastHit = 0;
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
  if (m) return { platform: "youtube", id: m[1], label: "pasted" };
  m = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/) || url.match(/tiktok\.com\/player\/v1\/(\d+)/) || url.match(/tiktok\.com\/embed\/(\d+)/);
  if (m) return { platform: "tiktok", id: m[1], label: "pasted" };
  m = url.match(/instagram\.com\/(reel|p|reels)\/([A-Za-z0-9_-]+)/);
  if (m) return { platform: "instagram", id: m[2], label: "pasted" };
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

function embedSrc(platform, item, active) {
  if (!active || !item) return "";
  if (platform === "youtube") {
    return `https://www.youtube.com/embed/${item.id}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${item.id}&playsinline=1&rel=0&modestbranding=1&controls=0&cc_load_policy=0&iv_load_policy=3&fs=0`;
  }
  if (platform === "tiktok") {
    return `https://www.tiktok.com/player/v1/${item.id}?autoplay=1&muted=${muted ? 1 : 0}&loop=1&progress_bar=0&description=0&music_info=0&controls=0`;
  }
  return `https://www.instagram.com/reel/${item.id}/embed/`;
}

function openHref(platform, item) {
  if (platform === "youtube") return `https://www.youtube.com/shorts/${item.id}`;
  if (platform === "tiktok") return `https://www.tiktok.com/player/v1/${item.id}`;
  return `https://www.instagram.com/reel/${item.id}/`;
}

function paneHTML(platform, item) {
  const names = { tiktok: "TIKTOK", youtube: "SHORTS", instagram: "INSTAGRAM" };
  const cls = platform === "tiktok" ? "tt" : platform === "youtube" ? "yt" : "ig";
  return `
    <article class="pane ${cls}" data-platform="${platform}" data-id="${item.id}">
      <span class="badge">${names[platform]}</span>
      <button class="open-btn" type="button" data-open="${openHref(platform, item)}">OPEN</button>
      <div class="stage">
        <iframe
          title="${names[platform]}"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerpolicy="strict-origin-when-cross-origin"
        ></iframe>
      </div>
      <div class="shield" aria-hidden="true"></div>
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
  applyColsUi();
  buildHits(false);
  render();
  feedEl.scrollTo({ top: 0 });
  showToast(cols === 1 ? "FULL SCREEN · SWIPE ALL 3" : `${cols} SIDE BY SIDE`);
}

function render() {
  applyColsUi();
  if (cols === 1) {
    feedEl.innerHTML = hits.map((slide) => `
      <section class="hit">${paneHTML(slide.platform, slide.item)}</section>`).join("");
  } else {
    feedEl.innerHTML = hits.map((hit) => `
      <section class="hit">
        ${paneHTML("tiktok", hit.tiktok)}
        ${paneHTML("youtube", hit.youtube)}
        ${cols === 3 ? paneHTML("instagram", hit.instagram) : ""}
      </section>`).join("");
  }
  syncIframes();
}

function visibleIndex() {
  const h = feedEl.clientHeight || 1;
  return Math.max(0, Math.min(hits.length - 1, Math.round(feedEl.scrollTop / h)));
}

function syncIframes() {
  const current = visibleIndex();
  lastHit = current;
  hitNum.textContent = String(current + 1).padStart(2, "0");
  const sections = document.querySelectorAll(".hit");
  sections.forEach((section, i) => {
    const active = Math.abs(i - current) <= 1;
    section.querySelectorAll(".pane").forEach((pane) => {
      const iframe = pane.querySelector("iframe");
      const platform = pane.dataset.platform;
      let item;
      if (cols === 1) item = hits[i] && hits[i].item;
      else item = hits[i] && hits[i][platform];
      const next = embedSrc(platform, item, active);
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
  showToast.t = setTimeout(() => { toast.hidden = true; }, 1600);
}

function enter() {
  splash.hidden = true;
  hud.hidden = false;
  feedEl.hidden = false;
  buildHits(true);
  render();
  showToast(cols === 1 ? "SWIPE · TT THEN YT THEN IG" : "FEEDS ARMED");
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

document.getElementById("enter").addEventListener("click", enter);
document.getElementById("mute-btn").addEventListener("click", () => setMuted(!muted));
document.getElementById("shuffle-btn").addEventListener("click", () => {
  buildHits(true);
  render();
  feedEl.scrollTo({ top: 0 });
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

feedEl.addEventListener("scroll", () => {
  if (visibleIndex() !== lastHit) syncIframes();
}, { passive: true });

feedEl.addEventListener("click", (e) => {
  const open = e.target.closest("[data-open]");
  if (!open) return;
  e.preventDefault();
  window.open(open.getAttribute("data-open"), "_blank", "noopener");
});

window.addEventListener("keydown", (e) => {
  if (!splash.hidden) {
    if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); enter(); }
    return;
  }
  if (e.code === "Space") { e.preventDefault(); setMuted(!muted); }
  if (e.key === "1" || e.key === "2" || e.key === "3") setCols(e.key);
  if (e.key === "ArrowDown" || e.key === "j") feedEl.scrollBy({ top: feedEl.clientHeight, behavior: "smooth" });
  if (e.key === "ArrowUp" || e.key === "k") feedEl.scrollBy({ top: -feedEl.clientHeight, behavior: "smooth" });
});
