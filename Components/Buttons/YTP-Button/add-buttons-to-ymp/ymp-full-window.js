// Monterar en “Full-Window/Stream” knapp i .ytp-right-controls.

const CSS_HREF = chrome.runtime.getURL("Components/Buttons/YTP-Button/add-buttons-to-ymp/ymp-full-window.css");

function ensureCss(){
    if (document.getElementById("ytf-ymp-fw-css")) return;
    const l = document.createElement("link");
    l.id = "ytf-ymp-fw-css"; l.rel = "stylesheet"; l.href = CSS_HREF;
    document.documentElement.appendChild(l);
}

function icon(){
    const s = document.createElementNS("http://www.w3.org/2000/svg","svg");
    s.setAttribute("viewBox","0 0 24 24");
    // liten skärm med fot – enkel “stream” symbol
    s.innerHTML = `<path fill="currentColor" d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm3 14h10v2H7z"/>`;
    return s;
}

const raf = () => new Promise(r => requestAnimationFrame(r));
async function waitFor(sel, t = 6000){
    const t0 = performance.now();
    while (performance.now() - t0 < t) { const el = document.querySelector(sel); if (el) return el; await raf(); }
    return null;
}

export async function mountFullWindowButton(onClick){
    ensureCss();
    const controls =
        (await waitFor(".ytp-right-controls")) ||
        (await waitFor("ytd-watch-flexy .ytp-right-controls"));
    if (!controls) return null;

    if (controls.querySelector('.ytp-button.ytf-fw-btn[data-ytf="fw"]')) return null;

    const btn = document.createElement("button");
    btn.className = "ytp-button ytf-fw-btn"; btn.dataset.ytf = "fw";
    btn.type = "button"; btn.title = "Full-Window"; btn.setAttribute("aria-label","Full-Window");
    btn.appendChild(icon());
    btn.addEventListener("click", onClick);
    const before = controls.querySelector(".ytp-fullscreen-button");
    if (before) controls.insertBefore(btn, before); else controls.appendChild(btn);
    return btn;
}

export function unmountFullWindowButton(){
    document.querySelectorAll('.ytp-right-controls .ytf-fw-btn[data-ytf="fw"]').forEach(n => n.remove());
}
