// Lägger till en "video_settings"-knapp i spelaren.
// Popup (bottom sheet) laddas via HTML/CSS och all JS körs här (CSP-säkert).

const raf = () => new Promise(r => requestAnimationFrame(r));
async function waitFor(sel, {timeout = 15000} = {}) {
    const t0 = performance.now();
    while (performance.now() - t0 < timeout) {
        const el = document.querySelector(sel);
        if (el) return el;
        await raf();
    }
    return null;
}

function makeIconVideoSettings() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "24");
    svg.innerHTML = `<path d="M3 6c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v2.18l2.2-1.65c.66-.5 1.8-.03 1.8.82V16.6c0 .85-1.14 1.32-1.8.83L17 15.77V18c1.1 0 2-.9 2-2V6zm-6.52 3.06h1.04l.17.48c.2.06.39.15.57.26l.47-.19.74.74-.19.47c.12.18.2.37.26.57l.48.17v1.04l-.48.17c-.06.2-.15.39-.26.57l.19.47-.74.74-.47-.19c-.18.12-.37.2-.57.26l-.17.48H8.48l-.17-.48c-.2-.06-.39-.15-.57-.26l-.47.19-.74-.74.19-.47c-.12-.18-.2-.37-.26-.57l-.48-.17v-1.04l.48-.17c.06-.2.15-.39.26-.57l-.19-.47.74-.74.47.19c.18-.12.37-.2.57-.26l.17-.48zm.52 1.94a1 1 0 110 2 1 1 0 010-2z" fill="currentColor"/>`;
    return svg;
}

function buildButton() {
    const btn = document.createElement("button");
    btn.className = "ytf-opts-btn";
    btn.type = "button";
    btn.title = "YT Tools";
    btn.setAttribute("aria-label", "YT Tools");
    Object.assign(btn.style, {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "36px",
        height: "36px",
        marginLeft: "6px",
        border: "none",
        background: "transparent",
        color: "inherit",
        cursor: "pointer"
    });
    btn.appendChild(makeIconVideoSettings());
    btn.addEventListener("click", openPopup);
    return btn;
}

async function mountButton() {
    const controlsRight =
        await waitFor(".ytp-right-controls") ||
        await waitFor("ytd-watch-flexy .ytp-right-controls");
    if (!controlsRight) return;
    if (controlsRight.querySelector(".ytf-opts-btn")) return;
    const btn = buildButton();
    controlsRight.insertBefore(btn, controlsRight.firstChild);
}

function hookNavigation() {
    const obs = new MutationObserver(() => mountButton());
    obs.observe(document.body, { childList: true, subtree: true });
    mountButton();
}

// ---------- Popup (bottom sheet) ----------
async function openPopup() {
    const base = "Components/Buttons/YTP-Button/design/";
    const htmlURL = chrome.runtime.getURL(base + "option-popup.html");
    const cssURL  = chrome.runtime.getURL(base + "option-popup.css");

    let host = document.getElementById("ytf-option-host");
    if (!host) {
        host = document.createElement("div");
        host.id = "ytf-option-host";
        document.documentElement.appendChild(host);
        host.attachShadow({ mode: "open" });
    }

    const html = await fetch(htmlURL).then(r => r.text()).catch(() => "");
    if (!html) return;

    const shadow = host.shadowRoot;
    shadow.innerHTML = "";

    // CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssURL;
    shadow.appendChild(link);

    // HTML
    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    shadow.appendChild(wrap);

    const overlay = shadow.querySelector(".ytf-overlay");
    const sheet   = shadow.querySelector(".ytf-sheet");

    if (!overlay || !sheet) { host.remove(); return; }

    // Stäng när man klickar utanför sheeten
    overlay.addEventListener("click", (e) => {
        const path = e.composedPath ? e.composedPath() : [];
        if (!path.includes(sheet)) host.remove();
    });

    // Bind actions
    shadow.querySelectorAll(".ytf-iconbtn").forEach(btn => {
        btn.addEventListener("click", () => {
            const action = btn.getAttribute("data-action");
            window.dispatchEvent(new CustomEvent("ytf:action", { detail: { action } }));
            // Valfritt: stäng efter klick
            // host.remove();
        });
    });
}
// ---------- /Popup ----------

// ---------- Action router ----------
const modCache = {};
async function useModule(path) {
    if (!modCache[path]) modCache[path] = import(chrome.runtime.getURL(path));
    return modCache[path];
}

window.addEventListener("ytf:action", async (e) => {
    const a = e.detail && e.detail.action;
    try {
        if (a === "dislikes") {
            const m = await useModule("Components/Dislikes/dislike.js");
            m.toggleDislikes();
        } else if (a === "stream") {
            const ctrl = await useModule("Components/Full-Window/index.js");
            await ctrl.runAuto();
        } else if (a === "printpng") {
            const m = await useModule("Components/Print-screen/index.js");
            m.captureFrame();
        } else if (a === "printcopy") {
            const m = await useModule("Components/Print-screen/index.js");
            m.copyFrameToClipboard();
        } else if (a === "socialblade") {
            const m = await useModule("Components/social-blade/index.js");
            m.openSocialBlade();
        }
    } catch (err) {
        console.error("[YT-Flex]", err);
    }
});
// ---------- /Action router ----------

hookNavigation();

// Auto-start Zoom (alltid på)
useModule("Components/zoom/zoom.js")
    .then(m => m.initAlwaysOn())
    .catch(err => console.error("[YT-Flex] Zoom init error:", err));
