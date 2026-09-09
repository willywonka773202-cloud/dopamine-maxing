const SEED = {
  tiktok: [
    { id: "6718335390845095173", label: "@scout2015" },
    { id: "6948210747285441798", label: "@countingprimes" },
    { id: "7067695578729221378", label: "@burntpizza89" },
    { id: "6742501081818877190", label: "@patrox" },
    { id: "7527476667770522893", label: "@_luwes" },
    { id: "6796374554391448838", label: "@blessy2flex" },
    { id: "6990565363377392901", label: "little coco" },
    { id: "6718335390845095173", label: "docs classic" }
  ],
  youtube: [
    { id: "DLJRmUT9IRk", label: "viral short" },
    { id: "vUKfHzd0fkA", label: "viral short" },
    { id: "iThZjk94-tU", label: "viral short" },
    { id: "EtBc4mWMmJE", label: "viral short" },
    { id: "T6BlmRDbHm4", label: "viral short" },
    { id: "_EYl7YgqwHY", label: "viral short" },
    { id: "vMGuObY8_sw", label: "artemis II" },
    { id: "lsViB64M7Rk", label: "orion reentry" }
  ],
  instagram: [
    { id: "DW-toGVj4I4", label: "nasa", kind: "reel" },
    { id: "DW2k9pLTeQ4", label: "nasa", kind: "reel" },
    { id: "Dbn-XJhk0_-", label: "nasa", kind: "reel" },
    { id: "Ck3Z0OVLtoH", label: "public reel", kind: "reel" },
    { id: "DEhOo1JsD7e", label: "public reel", kind: "reel" },
    { id: "DLHx_WNoXoY", label: "public reel", kind: "reel" },
    { id: "C08-b3uM0U9", label: "public post", kind: "p" },
    { id: "fA9uwTtkSN", label: "oembed sample", kind: "p" }
  ]
};

const feedEl = document.getElementById("feed");
const splash = document.getElementById("splash");
const hud = document.querySelector(".hud");
const hitNum = document.getElementById("hit-num");
const swipeNum = document.getElementById("swipe-num");
const muteBtn = document.getElementById("mute-btn");
const drawer = document.getElementById("drawer");
const about = document.getElementById("about");
const toast = document.getElementById("toast");
const addStatus = document.getElementById("add-status");

const customKey = "dm-custom-v1";
let muted = true;
let focused = null;
let hits = [];
let lastHit = 0;
let swipeCount = 0;

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
  if (m) return { platform: "instagram", id: m[2], kind: m[1] === "p" ? "p" : "reel", label: "pasted" };
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

function buildHits(doShuffle) {
  const custom = loadCustom();
  const tt = (doShuffle ? shuffle(SEED.tiktok) : SEED.tiktok.slice()).concat(custom.filter(x => x.platform === "tiktok"));
  const yt = (doShuffle ? shuffle(SEED.youtube) : SEED.youtube.slice()).concat(custom.filter(x => x.platform === "youtube"));
  const ig = (doShuffle ? shuffle(SEED.instagram) : SEED.instagram.slice()).concat(custom.filter(x => x.platform === "instagram"));
  const n = Math.max(tt.length, yt.length, ig.length, 6);
  hits = Array.from({ length: n }, (_, i) => ({
    tiktok: tt[i % tt.length],
    youtube: yt[i % yt.length],
    instagram: ig[i % ig.length]
  }));
}

function embedSrc(platform, item, active) {
  if (!active) return "";
  if (platform === "youtube") {
    return `https://www.youtube.com/embed/${item.id}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${item.id}&playsinline=1&rel=0&modestbranding=1&enablejsapi=1`;
  }
  if (platform === "tiktok") {
    return `https://www.tiktok.com/player/v1/${item.id}?autoplay=1&muted=${muted ? 1 : 0}&loop=1&progress_bar=0&description=0&music_info=0`;
  }
  const kind = item.kind === "p" ? "p" : "reel";
  return `https://www.instagram.com/${kind}/${item.id}/embed/captioned/`;
}

function openHref(platform, item) {
  if (platform === "youtube") return `https://www.youtube.com/shorts/${item.id}`;
  if (platform === "tiktok") return `https://www.tiktok.com/embed/${item.id}`;
  const kind = item.kind === "p" ? "p" : "reel";
  return `https://www.instagram.com/${kind}/${item.id}/`;
}

function paneHTML(platform, item, idx) {
  const names = { tiktok: "TIKTOK", youtube: "YOUTUBE", instagram: "INSTAGRAM" };
  const cls = platform === "tiktok" ? "tt" : platform === "youtube" ? "yt" : "ig";
  return `
    <article class="pane ${cls}" data-platform="${platform}" data-hit="${idx}">
      <span class="badge">${names[platform]}</span>
      <button class="focus-btn" type="button" data-focus>FOCUS</button>
      <a class="open-btn" href="${openHref(platform, item)}" target="_blank" rel="noopener">OPEN</a>
      <iframe
        title="${names[platform]} ${item.label || item.id}"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        allowfullscreen
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
      ></iframe>
      <div class="fallback" hidden>
        <h3>${names[platform]}</h3>
        <p>${item.label || item.id}</p>
        <a href="${openHref(platform, item)}" target="_blank" rel="noopener">open on ${platform}</a>
      </div>
    </article>`;
}

function render() {
  feedEl.innerHTML = hits.map((hit, i) => `
    <section class="hit" data-index="${i}">
      ${paneHTML("tiktok", hit.tiktok, i)}
      ${paneHTML("youtube", hit.youtube, i)}
      ${paneHTML("instagram", hit.instagram, i)}
    </section>`).join("");
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
  document.querySelectorAll(".hit").forEach((section, i) => {
    const active = Math.abs(i - current) <= 1;
    const hit = hits[i];
    section.querySelectorAll(".pane").forEach((pane) => {
      const platform = pane.dataset.platform;
      const iframe = pane.querySelector("iframe");
      const next = embedSrc(platform, hit[platform], active);
      if (iframe.getAttribute("src") !== next) iframe.src = next;
    });
  });
}

function setMuted(next) {
  muted = next;
  muteBtn.classList.toggle("on", muted);
  muteBtn.textContent = muted ? "MUTE" : "SOUND";
  document.querySelectorAll(".pane iframe").forEach((frame) => {
    if (!frame.src) return;
    if (frame.src.includes("youtube.com")) {
      frame.contentWindow?.postMessage(JSON.stringify({
        event: "command",
        func: muted ? "mute" : "unMute",
        args: []
      }), "*");
    }
    if (frame.src.includes("tiktok.com")) {
      frame.contentWindow?.postMessage({
        type: muted ? "mute" : "unMute",
        "x-tiktok-player": true
      }, "*");
    }
  });
  syncIframes();
}

function showToast(msg) {
  toast.hidden = false;
  toast.textContent = msg;
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => { toast.hidden = true; }, 1800);
}

function enter() {
  splash.hidden = true;
  hud.hidden = false;
  feedEl.hidden = false;
  buildHits(true);
  render();
  showToast("THREE FEEDS ARMED");
}

function toggleFocus(pane) {
  if (focused && focused !== pane) focused.classList.remove("focused");
  if (focused === pane) {
    pane.classList.remove("focused");
    focused = null;
    pane.querySelector("[data-focus]").textContent = "FOCUS";
    return;
  }
  pane.classList.add("focused");
  focused = pane;
  pane.querySelector("[data-focus]").textContent = "EXIT";
}

function addClip(raw) {
  const parsed = parseUrl(raw);
  if (!parsed) {
    addStatus.textContent = "could not read that url. tiktok / youtube / instagram only.";
    return false;
  }
  const list = loadCustom();
  list.push(parsed);
  saveCustom(list);
  buildHits(false);
  render();
  addStatus.textContent = `injected ${parsed.platform} · ${parsed.id}`;
  showToast(`ADDED ${parsed.platform.toUpperCase()}`);
  return true;
}

document.getElementById("enter").addEventListener("click", enter);
document.getElementById("mute-btn").addEventListener("click", () => setMuted(!muted));
document.getElementById("shuffle-btn").addEventListener("click", () => {
  buildHits(true);
  render();
  feedEl.scrollTo({ top: 0, behavior: "smooth" });
  swipeCount = 0;
  swipeNum.textContent = "0";
  showToast("RESHUFFLED");
});
document.getElementById("add-btn").addEventListener("click", () => { drawer.hidden = false; document.getElementById("url-input").focus(); });
document.getElementById("close-drawer").addEventListener("click", () => { drawer.hidden = true; });
document.getElementById("info-btn").addEventListener("click", () => { about.hidden = false; });
document.getElementById("close-about").addEventListener("click", () => { about.hidden = true; });
drawer.addEventListener("click", (e) => { if (e.target === drawer) drawer.hidden = true; });
about.addEventListener("click", (e) => { if (e.target === about) about.hidden = true; });

document.getElementById("add-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("url-input");
  if (addClip(input.value)) input.value = "";
});

feedEl.addEventListener("scroll", () => {
  const idx = visibleIndex();
  if (idx !== lastHit) {
    swipeCount += 1;
    swipeNum.textContent = String(swipeCount);
    if (focused) {
      focused.classList.remove("focused");
      const btn = focused.querySelector("[data-focus]");
      if (btn) btn.textContent = "FOCUS";
      focused = null;
    }
    syncIframes();
  }
}, { passive: true });

feedEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-focus]");
  if (!btn) return;
  toggleFocus(btn.closest(".pane"));
});

window.addEventListener("keydown", (e) => {
  if (splash.hidden === false) return;
  if (e.code === "Space") { e.preventDefault(); setMuted(!muted); }
  if (e.key === "ArrowDown" || e.key === "j") feedEl.scrollBy({ top: feedEl.clientHeight, behavior: "smooth" });
  if (e.key === "ArrowUp" || e.key === "k") feedEl.scrollBy({ top: -feedEl.clientHeight, behavior: "smooth" });
  if (e.key === "Escape") {
    drawer.hidden = true;
    about.hidden = true;
    if (focused) toggleFocus(focused);
  }
});
