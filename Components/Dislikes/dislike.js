// Dislike Viewer – toggle ON/OFF via din design-popup
// - INGEN flytande knapp längre
// - Badge placeras till VÄNSTER om like/dislike
// - Hämtar data från Return YouTube Dislike API
// - Stänger av rent (tar bort badge + stoppar observer)

let enabled = false;
let domObserver = null;

const API = "https://returnyoutubedislikeapi.com/votes?videoId=";
const CSS_HREF = chrome.runtime.getURL("Components/Dislikes/dislike.css");

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
        const u = new URL(location.href);
        if (u.pathname === "/watch") return u.searchParams.get("v");
        const m = location.href.match(/(?:[?&]v=|shorts\/|embed\/)([A-Za-z0-9_-]{6,})/);
        return m ? m[1] : null;
    } catch (e) { return null; }
}

function likeBars() {
    const cands = [
        "ytd-segmented-like-dislike-button-renderer",
        "ytd-menu-renderer.ytd-watch-metadata",
        "#top-level-buttons-computed"
    ];
    const set = new Set();
    cands.forEach(sel => $all(sel).forEach(n => set.add(n)));
    return Array.from(set);
}

function numberWithSep(n){ try { return n.toLocaleString(); } catch (e) { return String(n); } }
function fmt(n){
    if (n == null) return "?";
    if (n >= 1000000) return (n/1000000).toFixed(1).replace(/\.0$/,"") + "M";
    if (n >= 1000)    return (n/1000).toFixed(1).replace(/\.0$/,"") + "K";
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
    chip.title = "Dislikes: " + (dislikes != null ? numberWithSep(dislikes) : "?") + " • Ratio: " + ratio + "%";
    chip.innerHTML = "👎 " + fmt(dislikes) + " <small>(" + ratio + "%)</small>";

    // Placera TILL VÄNSTER: lägg som första barn i baren
    const bar = bars[0];
    if (bar.firstChild) bar.insertBefore(chip, bar.firstChild);
    else bar.appendChild(chip);
}

function fetchAndRender(){
    if (!enabled) return;
    const id = getVideoId();
    if (!id) { removeAllChips(); return; }
    fetch(API + encodeURIComponent(id), { cache: "no-store" })
        .then(res => { if (!res.ok) throw new Error(res.statusText); return res.json(); })
        .then(data => { if (enabled) mountChip(data); })
        .catch(e => { if (enabled) mountChip({ dislikes: null, likes: null }); console.warn("[YT-Flex][Dislikes] fetch fail:", e); });
}

function ensureObserver(){
    if (!domObserver) domObserver = new MutationObserver(() => { if (enabled) fetchAndRender(); });
}
function startObserver(){ ensureObserver(); try { domObserver.observe(document.body, { childList:true, subtree:true }); } catch(e){} }
function stopObserver(){ try { domObserver && domObserver.disconnect(); } catch(e){} }

export function enable(){
    if (enabled) return;
    ensureCss();
    enabled = true;
    startObserver();
    fetchAndRender();
    console.log("[YT-Flex] Dislike Viewer: ON");
}

export function disable(){
    if (!enabled) return;
    enabled = false;
    stopObserver();
    removeAllChips();
    console.log("[YT-Flex] Dislike Viewer: OFF");
}

export function toggleDislikes(){ enabled ? disable() : enable(); }
