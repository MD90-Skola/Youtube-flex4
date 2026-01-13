// Components/Buttons/YTP-Button/options.js
// YT Flex — Top menu Options button + options-form overlay + action router
// NOTE: No layout CSS overrides for top menu; we only change DOM order.

(() => {
  // =========================
  // Defaults / keys
  // =========================
  const DEFAULTS = {
    addonEnabled: true,

    // Basic toggles
    addOptionsButton: true,
    enableDislikes: false,

    // Feature gates
    advStreamMode: true,
    advThumbDownload: true,
    advThumbViewer: true,
    advThumbClipboard: true,
    advVideoDL: true,
    advCopy: true,
    advSocialBlade: true,
    advZoom: true,

    // (valfritt) Hashtag finder gate
    advHashtagFinder: true,
  };

  const TOP_BTN_ID = "ytf-top-opt-btn";
  const WRAP_ID = "ytf-top-opt-wrap";

  // Host för overlay (shadow root)
  const FORM_HOST_ID = "ytf-options-form-host";

  // =========================
  // Utils
  // =========================
  const raf = () => new Promise(r => requestAnimationFrame(r));

  async function waitFor(sel, timeout = 8000) {
    const t0 = performance.now();
    while (performance.now() - t0 < timeout) {
      const el = document.querySelector(sel);
      if (el) return el;
      await raf();
    }
    return null;
  }

  async function getState() {
    try {
      return Object.assign(
        {},
        DEFAULTS,
        await chrome.storage.local.get(Object.keys(DEFAULTS))
      );
    } catch {
      return { ...DEFAULTS };
    }
  }

  function topMenuEl() {
    return (
      document.querySelector("#top-level-buttons-computed") ||
      document.querySelector("ytd-masthead #top-level-buttons")
    );
  }

  // =========================
  // Cleanup / hard off
  // =========================
  function removeTopButton() {
    document.getElementById(WRAP_ID)?.remove();
    document.querySelectorAll(`#${TOP_BTN_ID}`).forEach(n => n.remove()); // legacy
  }

  function removeOptionsFormHost() {
    document.getElementById(FORM_HOST_ID)?.remove();
  }

  function unmountAllUI() {
    removeTopButton();
    removeOptionsFormHost();
  }

  async function hardDisableAllFeatures() {
    // Dislikes OFF
    try {
      const d = await import(chrome.runtime.getURL("Components/Dislikes/dislike.js"));
      d.disable?.();
    } catch {}

    // Zoom “best effort” disable
    try {
      const css = document.getElementById("ytf-zoom-css-ao");
      if (css) css.remove();
      document.body.classList.remove("ytf-zoom-alt");
      document.querySelectorAll(".ytf-zoom-hud").forEach(n => n.remove());
      const v = document.querySelector("video.html5-main-video, ytd-player video");
      if (v) v.style.transform = "";
    } catch {}
  }

  // =========================
  // Full-window trigger (ADV: Stream mode)
  // =========================
  let fwBusy = false;
  async function toggleFullWindow() {
    if (fwBusy) return;
    fwBusy = true;
    try {
      window.dispatchEvent(
        new CustomEvent("YT_FLEX_WINFS", { detail: { action: "toggle" } })
      );
    } finally {
      fwBusy = false;
      scheduleMount(80);
    }
  }

  // =========================
  // Options Form (NEW: Components/options-form/*)
  // =========================
  async function openOptionsForm() {
    const state = await getState();
    if (!state.addonEnabled) return;

    // skapa host + shadow
    let host = document.getElementById(FORM_HOST_ID);
    if (!host) {
      host = document.createElement("div");
      host.id = FORM_HOST_ID;
      document.documentElement.appendChild(host);
      host.attachShadow({ mode: "open" });
    }

    const shadow = host.shadowRoot;
    shadow.innerHTML = "";

    // NY FOLDER
    const base = "Components/options-form/";
    const htmlURL = chrome.runtime.getURL(base + "options-form.html");
    const cssURL  = chrome.runtime.getURL(base + "options-form.css");
    const jsURL   = chrome.runtime.getURL(base + "options-form.js");

    // css (endast inne i shadow → påverkar inte YouTube layout)
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssURL;
    shadow.appendChild(link);

    // html
    let html = "";
    try { html = await fetch(htmlURL).then(r => r.text()); } catch {}
    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    shadow.appendChild(wrap);

    // init
    try {
      const m = await import(jsURL);
      m.initOptionsForm?.(shadow);
    } catch (err) {
      console.error("[YT-Flex] options-form init failed:", err);

      // fallback: stäng om du klickar utanför
      const ov = shadow.querySelector(".ov") || shadow.querySelector(".ytf-overlay");
      const win = shadow.querySelector(".win") || shadow.querySelector(".ytf-sheet");
      ov?.addEventListener("click", (e) => {
        const p = e.composedPath ? e.composedPath() : [];
        if (!p.includes(win)) shadow.host.remove();
      }, { passive: true });
    }
  }

  // =========================
  // Top menu Options button (YouTube-native on YOUR DOM)
  // - Like/Dislike direct child: <segmented-like-dislike-button-view-model>
  // - Share direct child wrapper contains button aria-label "Dela"
  // =========================
  function findLikeChild(menu) {
    if (!menu) return null;
    return [...menu.children].find(
      el => (el.tagName || "").toLowerCase() === "segmented-like-dislike-button-view-model"
    ) || null;
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

  function setText(btn, text) {
    const el = btn.querySelector(".yt-spec-button-shape-next__button-text-content");
    if (el) el.textContent = text;
  }

  function setGearIcon(btn) {
    const iconWrap = btn.querySelector(".yt-spec-button-shape-next__icon");
    if (!iconWrap) return;

    iconWrap.innerHTML = `
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
  }

  function buildOptionsWrapFromShare(shareChild) {
    // clone YouTube wrapper for native spacing
    const wrap = shareChild.cloneNode(true);
    wrap.id = WRAP_ID;

    const btn = wrap.querySelector("button.yt-spec-button-shape-next");
    if (!btn) return null;

    btn.id = TOP_BTN_ID;
    btn.type = "button";
    btn.title = ""; // <= du ville ta bort title-teksten
    btn.setAttribute("aria-label", "Options");
    btn.setAttribute("aria-disabled", "false");

    btn.classList.add("yt-spec-button-shape-next--icon-leading");
    setText(btn, "Options");
    setGearIcon(btn);

    // click -> öppna nya options-form
    btn.onclick = null;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      openOptionsForm();
    }, true);

    return wrap;
  }

  function insertAfter(parent, node, refNode) {
    parent.insertBefore(node, refNode.nextSibling);
  }

  async function mountTopMenuOptionsButton(state) {
    if (!state.addonEnabled || !state.addOptionsButton) {
      removeTopButton();
      return;
    }

    let menu = topMenuEl();
    if (!menu) menu = await waitFor("#top-level-buttons-computed", 8000);
    if (!menu) return;

    const shareChild = findShareChild(menu);
    if (!shareChild) return;

    let wrap = document.getElementById(WRAP_ID);
    if (!wrap) {
      wrap = buildOptionsWrapFromShare(shareChild);
      if (!wrap) return;
      menu.insertBefore(wrap, menu.firstChild);
    } else {
      // rebind (YouTube kan byta intern DOM)
      const btn =
        wrap.querySelector(`#${TOP_BTN_ID}`) ||
        wrap.querySelector("button.yt-spec-button-shape-next");

      if (btn) {
        btn.id = TOP_BTN_ID;
        btn.onclick = null;
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopImmediatePropagation();
          openOptionsForm();
        }, true);
      }
    }

    // Place: Like/Dislike -> Options -> Share
    const likeChild = findLikeChild(menu);
    const shareNow = findShareChild(menu);

    if (likeChild) insertAfter(menu, wrap, likeChild);
    else if (shareNow) menu.insertBefore(wrap, shareNow);
  }

  // =========================
  // Feature gates (Dislikes + Zoom)
  // =========================
  async function applyFeatureGates(state) {
    if (!state.addonEnabled) return;

    try {
      const d = await import(chrome.runtime.getURL("Components/Dislikes/dislike.js"));
      if (state.enableDislikes) d.enable?.();
      else d.disable?.();
    } catch {}

    if (state.advZoom) {
      try {
        const z = await import(chrome.runtime.getURL("Components/zoom/zoom.js"));
        z.initAlwaysOn?.();
      } catch {}
    } else {
      try {
        const css = document.getElementById("ytf-zoom-css-ao");
        if (css) css.remove();
        document.body.classList.remove("ytf-zoom-alt");
        document.querySelectorAll(".ytf-zoom-hud").forEach(n => n.remove());
        const v = document.querySelector("video.html5-main-video, ytd-player video");
        if (v) v.style.transform = "";
      } catch {}
    }
  }

  // =========================
  // Action router (lyssnar på options-form knapparna)
  // =========================
  const modCache = {};
  async function useModule(path) {
    if (!modCache[path]) modCache[path] = import(chrome.runtime.getURL(path));
    return modCache[path];
  }

  window.addEventListener("ytf:action", async (e) => {
    const action = e.detail?.action;
    const state = await getState();
    if (!state.addonEnabled) return;

    try {
      if (action === "stream") {
        if (!state.advStreamMode) return;
        await toggleFullWindow();
        return;
      }

      // Thumbnail: PNG download
      if (action === "printpng") {
        if (!state.advThumbDownload) return;
        const m = await useModule("Components/Print-screen/index.js");
        m.captureFrame?.();
        return;
      }

      // Thumbnail: clipboard
      if (action === "printscreenn-clipboard" || action === "printcopy") {
        if (!state.advThumbClipboard) return;
        const m = await useModule("Components/Print-screen/print-clipboard.js");
        m.copyToClipboard?.();
        return;
      }

      // Thumbnail: download thumbnail (om du använder den)
      if (action === "thumbdl") {
        if (!state.advThumbDownload) return;
        const m = await useModule("Components/Print-screen/tumbnail/downloadThumbnail.js");
        m.downloadThumbnail?.();
        return;
      }

      // Video DL
      if (action === "videodl") {
        if (!state.advVideoDL) return;
        const m = await useModule("Components/video/video-download/sos-youtube.js");
        m.downloadMediaFromUrl?.();
        return;
      }

      // Social blade
      if (action === "socialblade") {
        if (!state.advSocialBlade) return;
        const m = await useModule("Components/social-blade/index.js");
        m.openSocialBlade?.();
        return;
      }

      // Hashtag finder (om du har en modul)
      if (action === "hashtag_finder") {
        if (!state.advHashtagFinder) return;
        // ändra path till din riktiga modul om den finns
        const m = await useModule("Components/hashtag-finder/index.js");
        m.open?.();
        return;
      }
    } catch (err) {
      console.error("[YT-Flex] action error:", err);
    }
  });

  // =========================
  // Mount loop (YouTube SPA)
  // =========================
  let mountTimer = null;
  function scheduleMount(delay = 120) {
    clearTimeout(mountTimer);
    mountTimer = setTimeout(() => mount(), delay);
  }

  async function mount() {
    const state = await getState();

    if (!state.addonEnabled) {
      unmountAllUI();
      await hardDisableAllFeatures();
      return;
    }

    await mountTopMenuOptionsButton(state);
    await applyFeatureGates(state);
  }

  window.addEventListener("yt-navigate-finish", () => scheduleMount(0), true);
  window.addEventListener("load", () => scheduleMount(0), true);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (Object.keys(changes).some(k => k in DEFAULTS)) scheduleMount(0);
  });

  scheduleMount(0);
})();
