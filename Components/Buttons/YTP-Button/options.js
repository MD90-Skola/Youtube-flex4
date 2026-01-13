// Components/Buttons/YTP-Button/options.js
// YT Flex — Options button next to Like + opens option-popup (shadow, CSP-safe)

(() => {
  "use strict";

  const DEFAULTS = {
    addonEnabled: true,
    addOptionsButton: true,
    advStreamMode: true,
    enableDislikes: false,
  };

  const IDS = {
    TOP_BTN: "ytf-top-opt-btn",
    WRAP: "ytf-top-opt-wrap",
    HOST: "ytf-options-host",
  };

  async function getState() {
    try {
      const stored = await chrome.storage.local.get(Object.keys(DEFAULTS));
      return Object.assign({}, DEFAULTS, stored);
    } catch {
      return { ...DEFAULTS };
    }
  }

  // ---------- YouTube top menu helpers ----------
  function topMenuEl() {
    return (
      document.querySelector("#top-level-buttons-computed") ||
      document.querySelector("ytd-masthead #top-level-buttons") ||
      document.querySelector("ytd-masthead #top-level-buttons-container #top-level-buttons")
    );
  }

  async function waitForTopMenu(timeout = 12000) {
    const now = topMenuEl();
    if (now) return now;

    return await new Promise((resolve) => {
      let done = false;

      const finish = (val) => {
        if (done) return;
        done = true;
        try { obs.disconnect(); } catch {}
        clearTimeout(t);
        resolve(val);
      };

      const t = setTimeout(() => finish(null), timeout);

      const obs = new MutationObserver(() => {
        const el = topMenuEl();
        if (el) finish(el);
      });

      obs.observe(document.documentElement, { childList: true, subtree: true });
    });
  }

  function findDirectChild(menu, el) {
    if (!menu || !el) return null;
    let cur = el;
    while (cur && cur.parentElement && cur.parentElement !== menu) cur = cur.parentElement;
    return (cur && cur.parentElement === menu) ? cur : null;
  }

  function findLikeChild(menu) {
    if (!menu) return null;

    // vanlig variant
    const direct = [...menu.children].find(
      el => (el.tagName || "").toLowerCase() === "segmented-like-dislike-button-view-model"
    );
    if (direct) return direct;

    // fallback: hitta Like/Gilla-knapp och mappa upp till direct child
    const btn =
      menu.querySelector('button[aria-label*="Gilla"]') ||
      menu.querySelector('button[aria-label*="Like"]') ||
      menu.querySelector('button[title*="Gilla"]') ||
      menu.querySelector('button[title*="Like"]');

    return findDirectChild(menu, btn);
  }

  function findShareChild(menu) {
    if (!menu) return null;
    for (const child of [...menu.children]) {
      const btn = [...child.querySelectorAll("button[aria-label]")].find(b => {
        const a = (b.getAttribute("aria-label") || "").trim().toLowerCase();
        return a === "dela" || a === "share";
      });
      if (btn) return child;
    }
    return null;
  }

  function insertAfter(parent, node, refNode) {
    parent.insertBefore(node, refNode?.nextSibling || null);
  }

  // ---------- Cleanup ----------
  function removeTopButton() {
    document.getElementById(IDS.WRAP)?.remove();
    document.querySelectorAll(`#${IDS.TOP_BTN}`).forEach(n => n.remove());
  }

  function removeHost() {
    document.getElementById(IDS.HOST)?.remove();
  }

  // ---------- Popup open (loads option-popup.*) ----------
  async function openOptionsPopup() {
    const state = await getState();
    if (!state.addonEnabled) return;

    let host = document.getElementById(IDS.HOST);
    if (!host) {
      host = document.createElement("div");
      host.id = IDS.HOST;
      document.documentElement.appendChild(host);
      host.attachShadow({ mode: "open" });
    }

    const shadow = host.shadowRoot;
    shadow.innerHTML = "";

    const base = "Components/Buttons/YTP-Button/add-buttons-to-ymp/";
    const htmlURL = chrome.runtime.getURL(base + "option-popup.html");
    const cssURL  = chrome.runtime.getURL(base + "option-popup.css");
    const jsURL   = chrome.runtime.getURL(base + "option-popup.js");

    // CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssURL;
    shadow.appendChild(link);

    // HTML
    const html = await fetch(htmlURL).then(r => r.text());
    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    shadow.appendChild(wrap);

    // JS init
    const m = await import(jsURL);
    m.initPopup?.(shadow);
  }

  // ---------- Build the top Options button (no cloning) ----------
  function buildTopWrap() {
    const wrap = document.createElement("yt-button-view-model");
    wrap.id = IDS.WRAP;
    wrap.className = "ytd-menu-renderer";

    const btn = document.createElement("button");
    btn.id = IDS.TOP_BTN;
    btn.type = "button";
    btn.title = ""; // ta bort tooltip
    btn.setAttribute("aria-label", "Options");
    btn.setAttribute("aria-disabled", "false");
    btn.className = "yt-spec-button-shape-next yt-spec-button-shape-next--text yt-spec-button-shape-next--icon-leading";

    const icon = document.createElement("span");
    icon.className = "yt-spec-button-shape-next__icon";
    icon.innerHTML = `
      <span class="ytIconWrapperHost" style="width:24px;height:24px;">
        <span class="yt-icon-shape ytSpecIconShapeHost">
          <div style="width:100%;height:100%;display:block;fill:currentcolor;">
            <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"
                 focusable="false" aria-hidden="true"
                 style="pointer-events:none;display:inherit;width:100%;height:100%;">
              <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.27 7.27 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 1h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 7.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.83 14.52a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.3.6.22l2.39-.96c.51.4 1.05.71 1.63.94l.36 2.54c.04.24.25.42.49.42h3.8c.24 0 .45-.18.49-.42l.36-2.54c.58-.23 1.12-.54 1.63-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"/>
            </svg>
          </div>
        </span>
      </span>
    `;

    const text = document.createElement("span");
    text.className = "yt-spec-button-shape-next__button-text-content";
    text.textContent = "Options";

    btn.appendChild(icon);
    btn.appendChild(text);

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      openOptionsPopup();
    }, true);

    wrap.appendChild(btn);
    return wrap;
  }

  async function mountTopButton() {
    const state = await getState();

    if (!state.addonEnabled || !state.addOptionsButton) {
      removeTopButton();
      return;
    }

    const menu = await waitForTopMenu(12000);
    if (!menu) return;

    let wrap = document.getElementById(IDS.WRAP);
    if (!wrap) {
      wrap = buildTopWrap();
      menu.appendChild(wrap);
    }

    // Place after Like if possible
    const likeNow = findLikeChild(menu);
    const shareNow = findShareChild(menu);

    if (likeNow) insertAfter(menu, wrap, likeNow);
    else if (shareNow) menu.insertBefore(wrap, shareNow);
  }

  // ---------- F12 trigger ----------
  window.addEventListener("message", (e) => {
    if (e.source !== window) return;
    if (e.data?.type === "YTF_OPEN_OPTIONS") openOptionsPopup();
  });

  // ---------- Mount loop ----------
  let timer = null;
  function schedule(delay = 120) {
    clearTimeout(timer);
    timer = setTimeout(() => mount(), delay);
  }

  async function mount() {
    try {
      const state = await getState();
      if (!state.addonEnabled) {
        removeTopButton();
        removeHost();
        return;
      }
      await mountTopButton();
    } catch (err) {
      console.error("[YT-Flex] mount crash:", err);
    }
  }

  window.addEventListener("yt-navigate-finish", () => schedule(0), true);
  window.addEventListener("load", () => schedule(0), true);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (Object.keys(changes).some(k => k in DEFAULTS)) schedule(0);
  });

  const obs = new MutationObserver(() => {
    if (!document.getElementById(IDS.WRAP)) schedule(120);
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });

  schedule(0);
})();
