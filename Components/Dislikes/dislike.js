// Components/Dislikes/dislike.js
// Dislike Viewer – robust: debounce, abort stale fetch, SPA navigation aware.

let enabled = false;
let domObserver = null;
let currentFetch = null;         // AbortController for the active fetch
let fetchTimer = null;           // Debounce timer
let lastVideoId = null;

const API = "https://returnyoutubedislikeapi.com/votes?videoId=";
const CSS_HREF = chrome.runtime.getURL("Components/Dislikes/dislike.css");
const INTL = new Intl.NumberFormat(); // Safer formatting

function $(sel, root){ return (root || document).querySelector(sel); }
function $all(sel, root){ return Array.from((root || document).querySelectorAll(sel)); }

function ensureCss() {
    if ($("#ytf-dislike-css-link")) return;
    const link = document.createElement("link");
    link.id = "ytf-dislike-css-link";
    link.rel = "stylesheet";
    link.href = CSS_HREF;
    document.documentElement.appendChild(link);
}

function getVideoId() {
    try {
        // Prefer ytd-watch-flexy attribute (watch + shorts ibland)
        const flexyId = $("ytd-watch-flexy")?.getAttribute("video-id");
        if (flexyId) return flexyId;

        const u = new URL(location.href);
        if (u.pathname === "/watch") return u.searchParams.get("v");

        const m = location.href.match(/(?:[?&]v=|shorts\/|embed\/)([A-Za-z0-9_-]{6,})/);
        return m ? m[1] : null;
    } catch { return null; }
}

function likeBars() {
    // Fler kandidater, YouTube ändrar strukturer ofta
    const cands = [
        "ytd-segmented-like-dislike-button-renderer",
        "#top-level-buttons-computed",
        "ytd-menu-renderer.ytd-watch-metadata",
        "ytd-menu-renderer.ytd-watch-flexy",
    ];
    const set = new Set();
    cands.forEach(sel => $all(sel).forEach(n => set.add(n)));
    return Array.from(set);
}

function fmt(n){
    if (n == null) return "?";
    if (n >= 1_000_000) return (n/1_000_000).toFixed(1).replace(/\.0$/,"") + "M";
    if (n >= 1_000)    return (n/1_000).toFixed(1).replace(/\.0$/,"") + "K";
    return String(n);
}

function removeAllChips(){ $all(".ytf-dislikes-chip").forEach(n => n.remove()); }

function mountChip(data){
    const bars = likeBars();
    if (!bars.length) return;

    removeAllChips();

    const dislikes = data && data.dislikes;
    const likes    = data && data.likes;
    const total    = (likes || 0) + (dislikes || 0);
    const ratio    = total ? Math.round((dislikes || 0) * 100 / total) : 0;

    const chip = document.createElement("span");
    chip.className = "ytf-dislikes-chip";
    chip.title = `Dislikes: ${dislikes != null ? INTL.format(dislikes) : "?"} • Ratio: ${ratio}%`;
    chip.innerHTML = `👎 ${fmt(dislikes)} <small>(${ratio}%)</small>`;

    // Placera TILL VÄNSTER som första barn i första baren
    const bar = bars[0];
    if (bar.firstChild) bar.insertBefore(chip, bar.firstChild);
    else bar.appendChild(chip);
}

function abortActiveFetch(){
    try { currentFetch?.abort(); } catch {}
    currentFetch = null;
}

async function doFetch(){
    if (!enabled) return;
    const id = getVideoId();
    if (!id) { lastVideoId = null; removeAllChips(); return; }

    // Avbryt pågående (stale) requests
    abortActiveFetch();
    lastVideoId = id;
    const ctrl = new AbortController();
    currentFetch = ctrl;

    try {
        const url = API + encodeURIComponent(id);
        const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();

        // Om ID hann bytas under väntan — ignorera
        if (!enabled || id !== lastVideoId) return;

        mountChip(data);
    } catch (e) {
        if (e.name !== "AbortError") {
            // Visa ?-chip endast om fortfarande aktiv och rätt video
            if (enabled && id === lastVideoId) mountChip({ dislikes: null, likes: null });
            console.warn("[YT-Flex][Dislikes] fetch fail:", e);
        }
    } finally {
        if (currentFetch === ctrl) currentFetch = null;
    }
}

function scheduleFetch(){
    if (!enabled) return;
    clearTimeout(fetchTimer);
    // Debounce: vänta lite för att låta DOM stabiliseras efter SPA-navigering
    fetchTimer = setTimeout(doFetch, 150);
}

function ensureObserver(){
    if (domObserver) return;
    domObserver = new MutationObserver(() => { scheduleFetch(); });
}

function startObserver(){
    ensureObserver();
    try { domObserver.observe(document.body, { childList:true, subtree:true }); } catch {}
    // Lyssna på YouTubes interna navigation (SPA)
    window.addEventListener("yt-navigate-finish", scheduleFetch, { passive: true });
}

function stopObserver(){
    try { domObserver && domObserver.disconnect(); } catch {}
    window.removeEventListener("yt-navigate-finish", scheduleFetch);
}

export function enable(){
    if (enabled) return;
    ensureCss();
    enabled = true;
    startObserver();
    scheduleFetch();
    console.log("[YT-Flex] Dislike Viewer: ON");
}

export function disable(){
    if (!enabled) return;
    enabled = false;
    clearTimeout(fetchTimer);
    abortActiveFetch();
    stopObserver();
    removeAllChips();
    console.log("[YT-Flex] Dislike Viewer: OFF");
}

export function toggleDislikes(){ enabled ? disable() : enable(); }
