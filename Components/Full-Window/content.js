// Components/Full-Window/content.js
(() => {
  // =========================
  // 0) Guard: kör bara en gång
  // =========================
  if (window.__YT_FLEX_FW_LOADED__) return;
  window.__YT_FLEX_FW_LOADED__ = true;

  // Bara top-frame
  try { if (window.top !== window.self) return; } catch {}

  console.log("[YT-Flex] Full-Window content.js loaded");

  // =========================
  // 1) CSS loader (content.css)
  // =========================
  const STYLE_ID = "yt-flex-fw-style";
  let cssReady = false;
  let cssPromise = null;

  async function ensureCss() {
    if (cssReady) return true;
    if (cssPromise) return cssPromise;

    cssPromise = (async () => {
      try {
        const url = chrome.runtime.getURL("Components/Full-Window/content.css");
        const txt = await fetch(url).then(r => r.text());

        let style = document.getElementById(STYLE_ID);
        if (!style) {
          style = document.createElement("style");
          style.id = STYLE_ID;
          document.head.appendChild(style);
        }
        style.textContent = txt;

        cssReady = true;
        return true;
      } catch (e) {
        console.warn("[YT-Flex] CSS load failed:", e);
        return false;
      }
    })();

    return cssPromise;
  }

  // =========================
  // 2) Helpers
  // =========================
  const $ = (s) => document.querySelector(s);
  const getFlexy = () => $("ytd-watch-flexy");

  // Shorts DOM skiljer sig -> hitta en "host"
  function getShortsHost() {
    return (
      $("ytd-reel-video-renderer[is-active]") ||
      $("ytd-reel-video-renderer") ||
      $("ytd-shorts")
    );
  }

  function isShorts() {
    return location.pathname.startsWith("/shorts");
  }
  function isNativeFullscreen() {
    return !!document.fullscreenElement;
  }
  function isPiP() {
    return !!document.pictureInPictureElement;
  }
  function isMiniPlayer() {
    const mini = $("ytd-miniplayer");
    if (!mini) return false;
    const r = mini.getBoundingClientRect();
    return r.width > 120 && r.height > 90 && r.bottom > 0 && r.right > 0;
  }

  // =========================
  // 3) Mode-system
  // =========================
  let active = false;        // true = theater (windowed fullscreen) är på
  let currentMode = "normal";

  function clearModeClasses(fx) {
    if (!fx) return;
    fx.classList.remove("yt-mode-normal", "yt-mode-theater", "yt-mode-shorts");
  }

  function clearRootClasses() {
    document.documentElement.classList.remove("yt-flex", "yt-theater", "yt-shorts");
    document.body.classList.remove("yt-flex", "yt-theater", "yt-shorts");
  }

  function setRootClasses(mode) {
    // Bas
    document.documentElement.classList.add("yt-flex");
    document.body.classList.add("yt-flex");

    // Specifika
    if (mode === "theater") {
      document.documentElement.classList.add("yt-theater");
      document.body.classList.add("yt-theater");
    } else if (mode === "shorts") {
      document.documentElement.classList.add("yt-shorts");
      document.body.classList.add("yt-shorts");
    }
  }

  function cleanupShortsHost() {
    const sh = getShortsHost();
    if (sh) sh.classList.remove("yt-mode-shorts-host");
  }

  function setMode(mode) {
    // alltid se till att CSS finns när vi sätter ett "special-mode"
    // (normal kan funka utan, men det skadar inte)
    // OBS: vi await:ar inte här – den kallas ibland från sync() ofta
    ensureCss();

    const fx = getFlexy();

    // Rensa root + host-klasser
    clearRootClasses();
    cleanupShortsHost();
    if (fx) clearModeClasses(fx);

    // root
    setRootClasses(mode);

    // THEATER/NORMAL kräver watch-flexy
    if (mode === "theater" || mode === "normal") {
      if (!fx) return;

      if (mode === "theater") fx.classList.add("yt-mode-theater");
      else fx.classList.add("yt-mode-normal");

      // Force reflow (YouTube kan “cacha” layout)
      fx.style.transform = "translateZ(0)";
      setTimeout(() => { fx.style.transform = ""; }, 0);
    }

    // SHORTS: funkar utan watch-flexy
    if (mode === "shorts") {
      const sh = getShortsHost();
      if (sh) sh.classList.add("yt-mode-shorts-host");
    }

    // Resize-event hjälper playern uppdatera layout
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    setTimeout(() => window.dispatchEvent(new Event("resize")), 120);

    currentMode = mode;
  }

  // =========================
  // 4) Basläge när vi inte är aktiva
  // =========================
  function detectBaseMode() {
    if (isShorts()) return "shorts";
    return "normal";
  }

  // =========================
  // 5) När får vi aktivera theater?
  // =========================
  function isAllowedToToggle() {
    if (isShorts()) return false;
    if (isNativeFullscreen()) return false;
    if (isPiP()) return false;
    if (isMiniPlayer()) return false;
    return true;
  }

  // =========================
  // 6) Toggle: Normal <-> Theater
  // =========================
  async function toggle(force) {
    const want = (typeof force === "boolean") ? force : !active;

    // stäng
    if (!want) {
      active = false;
      setMode(detectBaseMode());
      return;
    }

    // slå på
    if (!isAllowedToToggle()) return;

    const ok = await ensureCss();
    if (!ok) return;

    active = true;
    setMode("theater");
  }

  // =========================
  // 7) Inject knapp i player
  //       knappen i media spelare menu till höger yt-flex-fw-btn
  // =========================


function applyStreamButtonVisibility(enabled) {
  const btn = document.getElementById("yt-flex-fw-btn");
  if (btn) btn.style.display = enabled ? "" : "none";
}

function injectButton() {
  const controls = $(".ytp-right-controls");
  if (!controls) return;

  let btn = document.getElementById("yt-flex-fw-btn");

  if (!btn) {
    btn = document.createElement("button");
    btn.id = "yt-flex-fw-btn";
    btn.className = "ytp-button";
    btn.innerHTML = "⬛";
    btn.addEventListener("click", () => toggle(), { passive: true });
    controls.prepend(btn);
  }

  // ✅ sätt synlighet varje gång (SPA-säkert)
  chrome.storage.local.get(["advStreamMode"], (res) => {
    applyStreamButtonVisibility(!!res.advStreamMode);
  });
}

const btnTimer = setInterval(injectButton, 500);

// initial state (om knappen redan finns)
chrome.storage.local.get(["advStreamMode"], (res) => {
  applyStreamButtonVisibility(!!res.advStreamMode);
});

// live updates from popup
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if ("advStreamMode" in changes) {
    applyStreamButtonVisibility(!!changes.advStreamMode.newValue);
  }
});


  // =========================
  // 8) Sync vid navigation / fullscreen / osv
  // =========================
  function sync() {
    // Shorts: alltid shorts-mode (och stäng theater)
    if (isShorts()) {
      active = false;
      setMode("shorts");
      return;
    }

    // Om native fullscreen startar: stäng theater
    if (isNativeFullscreen() && active) {
      toggle(false);
      return;
    }

    // Om inte active: håll basläge
    if (!active) {
      setMode(detectBaseMode());
    }
  }

  window.addEventListener("yt-navigate-finish", sync, true);
  document.addEventListener("fullscreenchange", sync, true);

  // ESC stänger theater
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && active) toggle(false);
  }, true);

  // =========================
  // 9) Lyssna på kommandon från options.js via DOM-event
  // =========================
  window.addEventListener("YT_FLEX_WINFS", (ev) => {
    const a = ev?.detail?.action;
    if (a === "toggle") toggle();
    if (a === "on") toggle(true);
    if (a === "off") toggle(false);
  });

  // =========================
  // 10) Debug API (DevTools)
  // =========================
  window.__YTFW = {
    toggle,
    setMode, // "normal" | "theater" | "shorts"
    mode: () => currentMode,
    active: () => active,
    sync
  };

  // =========================
  // 11) Start
  // =========================
  ensureCss().then(sync);
})();
