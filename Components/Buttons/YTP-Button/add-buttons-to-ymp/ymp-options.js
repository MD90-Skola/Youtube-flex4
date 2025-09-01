// Monterar en “Options”-knapp i .ytp-right-controls som öppnar settings-popup.

const CSS_HREF = chrome.runtime.getURL("Components/Buttons/YTP-Button/add-buttons-to-ymp/ymp-options.css");

function ensureCss(){
    if (document.getElementById("ytf-ymp-opt-css")) return;
    const l = document.createElement("link");
    l.id = "ytf-ymp-opt-css"; l.rel = "stylesheet"; l.href = CSS_HREF;
    document.documentElement.appendChild(l);
}

function icon() {
    const s = document.createElementNS("http://www.w3.org/2000/svg","svg");
    s.setAttribute("viewBox","0 0 24 24");
    s.innerHTML = `<path fill="currentColor" d="M3 6c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v2.18l2.2-1.65c.66-.5 1.8-.03 1.8.82V16.6c0 .85-1.14 1.32-1.8.83L17 15.77V18c1.1 0 2-.9 2-2V6zm-6.52 3.06h1.04l.17.48c.2.06.39.15.57.26l.47-.19.74.74-.19.47c.12.18.2.37.26.57l.48.17v1.04l-.48.17c-.06.2-.15.39-.26.57l.19.47-.74.74-.47-.19c-.18.12-.37.2-.57.26l-.17.48H8.48l-.17-.48c-.2-.06-.39-.15-.57-.26l-.47.19-.74-.74.19-.47c-.12-.18-.2-.37-.26-.57l-.48-.17v-1.04l.48-.17c.06-.2.15-.39.26-.57l-.19-.47.74-.74.47.19c.18-.12.37-.2.57-.26l.17-.48zm.52 1.94a1 1 0 110 2 1 1 0 010-2z"/>`;
    return s;
}

const raf = () => new Promise(r => requestAnimationFrame(r));
async function waitFor(sel, t = 6000){
    const t0 = performance.now();
    while (performance.now() - t0 < t) {
        const el = document.querySelector(sel);
        if (el) return el; await raf();
    }
    return null;
}

export async function mountOptionsButton(onClick){
    ensureCss();
    const controls =
        (await waitFor(".ytp-right-controls")) ||
        (await waitFor("ytd-watch-flexy .ytp-right-controls"));
    if (!controls) return null;

    if (controls.querySelector('.ytp-button.ytf-btn[data-ytf="opt"]')) return null;

    const btn = document.createElement("button");
    btn.className = "ytp-button ytf-btn"; btn.dataset.ytf = "opt";
    btn.type = "button"; btn.title = "YT Flex Settings"; btn.setAttribute("aria-label","YT Flex Settings");
    btn.appendChild(icon());
    btn.addEventListener("click", onClick);
    const before = controls.querySelector(".ytp-fullscreen-button");
    if (before) controls.insertBefore(btn, before); else controls.appendChild(btn);
    return btn;
}

export function unmountOptionsButton(){
    document.querySelectorAll('.ytp-right-controls .ytf-btn[data-ytf="opt"]').forEach(n => n.remove());
}
