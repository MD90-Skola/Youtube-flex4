// Components/Dislikes/dislike.js
// Dislike Viewer – visar LIKES + DISLIKES direkt i YouTube-knapparna (ingen bubble)

const API = "https://returnyoutubedislikeapi.com/votes?videoId=";
const CSS_HREF = chrome.runtime.getURL("Components/Dislikes/dislike.css");
const INTL = new Intl.NumberFormat();

// Små helpers
function $(sel, root){ return (root || document).querySelector(sel); }
function $all(sel, root){ return Array.from((root || document).querySelectorAll(sel)); }

// ===== CSS =====
function ensureCss() {
  if ($("#ytf-dislike-css-link")) return;
  const link = document.createElement("link");
  link.id = "ytf-dislike-css-link";
  link.rel = "stylesheet";
  link.href = CSS_HREF;
  document.documentElement.appendChild(link);
}

// ===== Video ID =====
function getVideoId(){
  // watch?v=...
  const url = new URL(location.href);
  const v = url.searchParams.get("v");
  if (v) return v;

  // fallback: ibland via ytdata
  const og = $('meta[property="og:url"]')?.content;
  if (og) {
    try {
      const u = new URL(og);
      return u.searchParams.get("v");
    } catch {}
  }
  return null;
}

// ===== Format =====
function fmt(n){
  if (n == null) return "?";
  try { return INTL.format(n); } catch { return String(n); }
}

// ===== Hitta knapparna =====
function getTopButtonsRoot(){
  return $("#top-level-buttons-computed")
      || $("ytd-segmented-like-dislike-button-renderer")
      || $("ytd-menu-renderer.ytd-watch-metadata")
      || document;
}

function findButtonByAriaContains(parts, root){
  // Leta bara i "top buttons"-området så vi inte råkar träffa andra knappar på sidan
  const scope = root || getTopButtonsRoot();
  const buttons = $all("button[aria-label]", scope);

  for (const b of buttons) {
    const label = (b.getAttribute("aria-label") || "").toLowerCase();
    if (parts.some(p => label.includes(p))) return b;
  }
  return null;
}

function getLikeButton(){
  return findButtonByAriaContains(["gilla", "like"], getTopButtonsRoot());
}

function getDislikeButton(){
  // Din knapp har "Ogilla videon"
  return findButtonByAriaContains(["ogilla", "dislike"], getTopButtonsRoot());
}

// ===== Injicera siffran i knappen =====
function removeCounts(){
  $all(".ytf-count").forEach(n => n.remove());
}









function injectCount(button, value){
  if (!button) return;

  const iconWrap = button.querySelector(".yt-spec-button-shape-next__icon");

  // 1) Om YouTube redan har en siffra/text i knappen: ERSÄTT den
  // (leta efter en span utanför ikon-diven som redan har text)
  const existingTextSpan = Array.from(button.querySelectorAll("span"))
    .find(s => {
      if (s.classList.contains("ytf-count")) return false;      // vår
      if (iconWrap && iconWrap.contains(s)) return false;        // ikon
      const t = (s.textContent || "").trim();
      return t.length > 0 && /^\d/.test(t);                      // börjar med siffra
    });

  if (existingTextSpan){
    existingTextSpan.textContent = fmt(value);
    // ta bort ev. gammal injicerad
    button.querySelectorAll(".ytf-count").forEach(n => n.remove());
    return;
  }

  // 2) Annars: skapa vår siffra (t.ex. Dislike-knappen har ofta ingen text alls)
  button.querySelectorAll(".ytf-count").forEach(n => n.remove());

  const span = document.createElement("span");
  span.className = "ytf-count";
  span.textContent = fmt(value);

  if (iconWrap){
    iconWrap.insertAdjacentElement("afterend", span);
  } else {
    button.appendChild(span);
  }
}












function mountCounts(data){
  // Rensa bara våra egna siffror
  removeCounts();

  // Visa ENDAST dislikes i knappen
  injectCount(getDislikeButton(), data?.dislikes);
}


// ===== Fetch + SPA =====
let enabled = false;
let lastVideoId = null;
let fetchTimer = null;
let domObserver = null;
let currentFetch = null;

function abortActiveFetch(){
  try { currentFetch?.abort(); } catch {}
  currentFetch = null;
}

async function doFetch(){
  if (!enabled) return;

  const id = getVideoId();
  if (!id) {
    lastVideoId = null;
    removeCounts();
    return;
  }

  // Om samma video-id och vi redan visar siffror kan vi ändå refetcha ibland,
  // men här räcker det att fortsätta pga MutationObserver triggar ofta.
  lastVideoId = id;

  abortActiveFetch();
  const ctrl = new AbortController();
  currentFetch = ctrl;

  try {
    const url = API + encodeURIComponent(id);
    const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    const data = await res.json();
    // data brukar innehålla {likes, dislikes, ...}
    mountCounts(data);

  } catch (err) {
    // Abort = ok
    if (err?.name === "AbortError") return;

    // Visa ändå "?" om API failar
    mountCounts({ likes: null, dislikes: null });
  }
}

function scheduleFetch(){
  if (!enabled) return;
  clearTimeout(fetchTimer);

  // Debounce: låt DOM stabiliseras efter SPA-navigering
  fetchTimer = setTimeout(doFetch, 150);
}

function ensureObserver(){
  if (domObserver) return;
  domObserver = new MutationObserver(() => scheduleFetch());
}

function startObserver(){
  ensureObserver();
  try { domObserver.observe(document.body, { childList: true, subtree: true }); } catch {}

  // YouTube SPA-event
  window.addEventListener("yt-navigate-finish", scheduleFetch, { passive: true });
}

function stopObserver(){
  try { domObserver?.disconnect(); } catch {}
  window.removeEventListener("yt-navigate-finish", scheduleFetch);
}

// ===== Public API =====
export function enable(){
  if (enabled) return;
  enabled = true;

  ensureCss();
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
  removeCounts();

  console.log("[YT-Flex] Dislike Viewer: OFF");
}

export function toggleDislikes(){
  enabled ? disable() : enable();
}
