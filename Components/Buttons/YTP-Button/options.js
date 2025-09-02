// YT Flex — center-slot med fungerande popup-actions + FW-genväg

const DEFAULTS = {
    addOptionsButton: true,
    addFullWindowButton: true,
    enableDislikes: false,
};

const raf = () => new Promise(r => requestAnimationFrame(r));
async function waitFor(sel, timeout = 8000){
    const t0 = performance.now();
    while (performance.now() - t0 < timeout){
        const el = document.querySelector(sel);
        if (el) return el;
        await raf();
    }
    return null;
}
function getVideoId(){
    const u = new URL(location.href);
    return u.searchParams.get("v") ||
        document.querySelector("ytd-watch-flexy")?.getAttribute("video-id") || "";
}
async function getState(){
    try { return Object.assign({}, DEFAULTS, await chrome.storage.local.get(Object.keys(DEFAULTS))); }
    catch { return { ...DEFAULTS }; }
}
function ensurePosCss(){
    if (document.getElementById("ytf-ymp-pos-css")) return;
    const link = document.createElement("link");
    link.id = "ytf-ymp-pos-css";
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("Components/Buttons/YTP-Button/add-buttons-to-ymp/ymp-position.css");
    document.documentElement.appendChild(link);
}
function svg(d, sz=22){
    const s = document.createElementNS("http://www.w3.org/2000/svg","svg");
    s.setAttribute("viewBox","0 0 24 24");
    s.setAttribute("width", String(sz));
    s.setAttribute("height", String(sz));
    s.innerHTML = `<path fill="currentColor" d="${d}"/>`;
    return s;
}

// ---------- FW toggle helper ----------
let fwBusy = false;
async function toggleFullWindow(){
    if (fwBusy) return;
    fwBusy = true;
    try {
        const ctrl = await import(chrome.runtime.getURL("Components/Full-Window/index.js"));
        if (typeof ctrl.toggle === "function")       await ctrl.toggle();
        else if (typeof ctrl.runAuto === "function") await ctrl.runAuto();
        else if (typeof ctrl.run === "function")     await ctrl.run();
        else if (typeof ctrl.exit === "function")    await ctrl.exit();
    } catch (e) {
        console.warn("[YT-Flex] Full-Window module:", e);
    } finally {
        fwBusy = false;
        scheduleMount(50); // UI kan ha bytts
    }
}

// ---------- Buttons ----------
function makeOptionsBtn(){
    const b = document.createElement("button");
    b.className = "ytf-btn"; b.type = "button";
    b.title = "YT Flex — Options (Alt-klick = Full-Window)";
    b.appendChild(svg("M3 6c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v2.18l2.2-1.65c.66-.5 1.8-.03 1.8.82V16.6c0 .85-1.14 1.32-1.8.83L17 15.77V18c1.1 0 2-.9 2-2V6zm-6.52 3.06h1.04l.17.48c.2.06.39.15.57.26l.47-.19.74.74-.19.47c.12.18.2.37.26.57l.48.17v1.04l-.48.17c-.06.2-.15.39-.26.57l.19.47-.74.74-.47-.19c-.18.12-.37.2-.57.26l-.17.48H8.48l-.17-.48c-.2-.06-.39-.15-.57-.26l-.47.19-.74-.74.19-.47c-.12-.18-.2-.37-.26-.57l-.48-.17v-1.04l.48-.17c.06-.2.15-.39.26-.57l-.19-.47.74-.74.47.19c.18-.12.37-.2.57-.26l.17-.48zm.52 1.94a1 1 0 110 2 1 1 0 010-2z"));
    // Primärt: öppna popup. Genväg: Alt-klick eller dubbelklick => FW toggle.
    b.addEventListener("click", (ev) => {
        if (ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) { toggleFullWindow(); return; }
        openPlayerPopup();
    }, { passive:true });
    b.addEventListener("dblclick", () => toggleFullWindow(), { passive:true });
    return b;
}

function makeFullWindowBtn(){
    const b = document.createElement("button");
    b.className = "ytf-btn"; b.type = "button";
    b.title = "YT Flex — Full-Window";
    b.appendChild(svg("M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm3 14h10v2H7z"));
    b.addEventListener("click", () => toggleFullWindow(), { passive:true });
    return b;
}

// ---------- Mount center slot ----------
let lastKey = "";
let currentControls = null;
let moControls = null;
let mountTimer = null;

function scheduleMount(delay=80){
    clearTimeout(mountTimer);
    mountTimer = setTimeout(() => mountCenterSlot(), delay);
}

async function mountCenterSlot(){
    ensurePosCss();

    let controls = document.querySelector(".ytp-chrome-controls");
    if (!controls) controls = await waitFor(".ytp-chrome-controls", 8000);
    if (!controls) return;

    const state = await getState();
    const key = JSON.stringify({
        v: getVideoId(),
        A: !!state.addOptionsButton,
        F: !!state.addFullWindowButton
    });

    const hasSlot = !!controls.querySelector("#ytf-center-slot");
    if (key === lastKey && hasSlot) {
        return toggleDislikes(state.enableDislikes);
    }
    lastKey = key;

    controls.querySelectorAll("#ytf-center-slot").forEach(n => n.remove());

    const slot = document.createElement("div");
    slot.id = "ytf-center-slot";
    if (state.addOptionsButton)   slot.appendChild(makeOptionsBtn());
    if (state.addFullWindowButton) slot.appendChild(makeFullWindowBtn());
    if (slot.childElementCount) controls.appendChild(slot);

    toggleDislikes(state.enableDislikes);

    if (currentControls !== controls) {
        if (moControls) try { moControls.disconnect(); } catch {}
        currentControls = controls;
        moControls = new MutationObserver(() => {
            if (!currentControls.querySelector("#ytf-center-slot")) scheduleMount(0);
        });
        moControls.observe(currentControls, { childList: true });
    }
}

window.addEventListener("yt-navigate-finish", () => scheduleMount(0), true);
document.addEventListener("fullscreenchange", () => scheduleMount(0), true);
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if ("addOptionsButton" in changes || "addFullWindowButton" in changes || "enableDislikes" in changes) {
        scheduleMount(0);
    }
});
scheduleMount(0);

// ---------- Dislikes ----------
async function toggleDislikes(on){
    try {
        const d = await import(chrome.runtime.getURL("Components/Dislikes/dislike.js"));
        if (on) d.enable?.(); else d.disable?.();
    } catch {}
}

// ---------- Player popup (design/*) ----------
async function openPlayerPopup(){
    let host = document.getElementById("ytf-option-host");
    if (!host) {
        host = document.createElement("div");
        host.id = "ytf-option-host";
        document.documentElement.appendChild(host);
        host.attachShadow({ mode:"open" });
    }
    const shadow = host.shadowRoot; shadow.innerHTML = "";

    const base = "Components/Buttons/YTP-Button/design/";
    const cssURL  = chrome.runtime.getURL(base + "option-popup.css");
    const htmlURL = chrome.runtime.getURL(base + "option-popup.html");
    const jsURL   = chrome.runtime.getURL(base + "option-popup.js");

    const link = document.createElement("link"); link.rel="stylesheet"; link.href = cssURL; shadow.appendChild(link);

    let html = ""; try { html = await fetch(htmlURL).then(r=>r.text()); } catch {}
    const wrap = document.createElement("div"); wrap.innerHTML = html; shadow.appendChild(wrap);

    try { const m = await import(jsURL); m.initPopup?.(shadow); }
    catch {
        const ov = shadow.querySelector(".ytf-overlay"); const sheet = shadow.querySelector(".ytf-sheet");
        ov?.addEventListener("click", (e)=>{ const p = e.composedPath ? e.composedPath() : []; if (!p.includes(sheet)) shadow.host.remove(); }, { passive:true });
    }
}

// ---------- Popup action router (fixar Dislikes/Stream/.png/Copy/SB) ----------
const modCache = {};
async function useModule(path){
    if (!modCache[path]) modCache[path] = import(chrome.runtime.getURL(path));
    return modCache[path];
}

window.addEventListener("ytf:action", async (e) => {
    const action = e.detail && e.detail.action;
    try {
        if (action === "dislikes") {
            const st = await getState();
            const nv = !st.enableDislikes;
            await chrome.storage.local.set({ enableDislikes: nv });
            toggleDislikes(nv);
        } else if (action === "stream") {
            await toggleFullWindow();

        } else if (action === "thumbdl") {
            const m = await useModule("Components/Print-screen/tumbnail/downloadThumbnail.js");
            m.downloadThumbnail?.();

        } else if (action === "printpng") {
            const m = await useModule("Components/Print-screen/index.js");
            m.captureFrame?.();
        } else if (action === "printcopy" || action === "printscreenn-clipboard") {
            const m = await useModule("Components/Print-screen/print-clipboard.js");
            m.copyToClipboard?.();
        } else if (action === "socialblade") {
            const m = await useModule("Components/social-blade/index.js");
            m.openSocialBlade?.();
        }
    } catch (err) {
        console.error("[YT-Flex] action error:", err);
    }
});






// (valfritt) starta zoom, tyst om saknas
try {
    import(chrome.runtime.getURL("Components/zoom/zoom.js"))
        .then(m => m.initAlwaysOn?.())
        .catch(()=>{});
} catch {}
