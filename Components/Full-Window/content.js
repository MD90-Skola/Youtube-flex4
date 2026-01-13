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
  //    - vi fetch:ar från extension och stoppar in i <style>
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
  // 3) Mode-system (matchar din CSS)
  //    Modes vi använder:
  //    - "normal"  => yt-mode-normal
  //    - "theater" => yt-mode-theater (vårt windowed fullscreen)
  //    - "shorts"  => yt-mode-shorts
  // =========================
  let active = false;        // true = vårt windowed fullscreen är på
  let currentMode = "normal";

  function clearModeClasses(fx) {
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

  function setMode(mode) {
    const fx = getFlexy();
    if (!fx) return;

    clearModeClasses(fx);
    clearRootClasses();

    // root
    setRootClasses(mode);

    // flexy mode
    if (mode === "theater") fx.classList.add("yt-mode-theater");
    else if (mode === "shorts") fx.classList.add("yt-mode-shorts");
    else fx.classList.add("yt-mode-normal");

    // Force reflow (YouTube kan “cacha” layout)
    fx.style.transform = "translateZ(0)";
    setTimeout(() => { fx.style.transform = ""; }, 0);

    // Resize-event hjälper playern uppdatera layout
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    setTimeout(() => window.dispatchEvent(new Event("resize")), 120);

    currentMode = mode;
  }

  // =========================
  // 4) Detektion: vad är "basläget" när vi INTE är aktiva?
  // =========================
  function detectBaseMode() {
    if (isShorts()) return "shorts";
    return "normal";
  }

  // =========================
  // 5) När får vi aktivera windowed fullscreen?
  //    - Inte i native fullscreen, PiP, miniplayer, shorts
  // =========================
  function isAllowedToToggle() {
    if (isShorts()) return false;
    if (isNativeFullscreen()) return false;
    if (isPiP()) return false;
    if (isMiniPlayer()) return false;
    return true;
  }

  // =========================
  // 6) Toggle: Normal <-> Theater(windowed fullscreen)
  // =========================
  async function toggle(force) {
    const want = (typeof force === "boolean") ? force : !active;

    // Om vi ska stänga
    if (!want) {
      active = false;
      setMode(detectBaseMode());
      return;
    }

    // Om vi ska slå på
    if (!isAllowedToToggle()) return;

    const ok = await ensureCss();
    if (!ok) return;

    active = true;
    setMode("theater");
  }

  // =========================
  // 7) Inject knapp i player
  // =========================
  function injectButton() {
    // controls finns bara när spelaren är laddad
    const controls = $(".ytp-right-controls");
    if (!controls) return;

    if ($("#yt-flex-fw-btn")) return;

    const btn = document.createElement("button");
    btn.id = "yt-flex-fw-btn";
    btn.className = "ytp-button";
    btn.title = "Windowed Fullscreen";
    btn.innerHTML = "⬛";
    btn.addEventListener("click", () => toggle(), { passive: true });

    controls.prepend(btn);
  }
  const btnTimer = setInterval(injectButton, 500);

  // =========================
  // 8) Håll mode korrekt vid navigation / fullscreen / osv
  // =========================
  function sync() {
    // Shorts ska alltid vara shorts (och stänga vår active)
    if (isShorts()) {
      active = false;
      setMode("shorts");
      return;
    }

    // Om native fullscreen startar: stäng vår
    if (isNativeFullscreen() && active) {
      toggle(false);
      return;
    }

    // Om vi inte är aktiva: säkerställ basläge
    if (!active) {
      setMode(detectBaseMode());
    }
  }

  window.addEventListener("yt-navigate-finish", sync, true);
  document.addEventListener("fullscreenchange", sync, true);

  // ESC stänger windowed fullscreen
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
  // 10) Debug API (för DevTools)
  // =========================
  window.__YTFW = {
    toggle,
    setMode, // (manual) "normal" | "theater" | "shorts"
    mode: () => currentMode,
    active: () => active,
    sync
  };

  // =========================
  // 11) Startläge
  // =========================
  sync();
})();
