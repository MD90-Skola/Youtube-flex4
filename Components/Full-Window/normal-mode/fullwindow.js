// Full-window för "Standard vy" (utan theater).
// Egen kapslad implementation så den inte krockar med Bio-läget.

function $1(sel, root=document){ return root.querySelector(sel); }
function getFlexy(){ return $1("ytd-watch-flexy"); }
function getVideo(){ return $1("video.html5-main-video") || $1("ytd-player video"); }

let active = false;

function injectCss(){
    if (document.getElementById("ytf-fw-css-normal")) return;
    const css = `
html.yt-ext-no-scroll, body.yt-ext-no-scroll { overflow:hidden!important; background:#000!important; }

ytd-watch-flexy.yt-ext-fw-normal #player-theater-container,
ytd-watch-flexy.yt-ext-fw-normal #player-container,
ytd-watch-flexy.yt-ext-fw-normal #player {
  position:fixed!important; inset:0!important; width:100vw!important; height:100vh!important; height:100dvh!important;
  z-index:2147483646!important; display:flex!important; align-items:center!important; justify-content:center!important;
  background:#000!important; overflow:hidden!important; transform:none!important; backface-visibility:hidden!important;
}

ytd-watch-flexy.yt-ext-fw-normal .html5-video-container {
  position:absolute!important; inset:0!important; display:flex!important; align-items:center!important; justify-content:center!important;
  background:#000!important; transform:none!important; will-change:auto!important; z-index:2147483646!important;
}

ytd-watch-flexy.yt-ext-fw-normal video.html5-main-video,
ytd-watch-flexy.yt-ext-fw-normal ytd-player video,
ytd-watch-flexy.yt-ext-fw-normal video {
  width:100%!important; height:100%!important; object-fit:contain!important; object-position:center center!important; background:#000!important;
  transform-origin:center center!important; transform:translate(var(--yt-ext-pan-x,0px),var(--yt-ext-pan-y,0px)) scale(var(--yt-ext-zoom,1))!important;
  will-change:transform!important; opacity:1!important; visibility:visible!important;
}

ytd-watch-flexy.yt-ext-fw-normal .ytp-chrome-bottom { z-index:2147483647!important; }

ytd-watch-flexy.yt-ext-fw-normal #cinematics,
ytd-watch-flexy.yt-ext-fw-normal #ambient-metadata,
ytd-watch-flexy.yt-ext-fw-normal #full-bleed-container { display:none!important; }
`;
    const link = document.createElement("style");
    link.id = "ytf-fw-css-normal";
    link.textContent = css;
    document.head.appendChild(link);
}

function revive(){
    const v = getVideo(); if (!v) return;
    try { if ("requestVideoFrameCallback" in v) v.requestVideoFrameCallback(()=>{}); } catch {}
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    setTimeout(() => window.dispatchEvent(new Event("resize")), 120);
}

export function isActive(){ return active; }

export function toggle(state){
    const want = (typeof state==="boolean") ? state : !active;
    const flexy = getFlexy(); if (!flexy) return;

    // Säkerställ att theater inte är på i normal-läget
    if (want) { flexy.removeAttribute("theater"); }

    if (want){
        injectCss();
        document.documentElement.classList.add("yt-ext-no-scroll");
        document.body.classList.add("yt-ext-no-scroll");
        flexy.classList.add("yt-ext-fw-normal");
        active = true;
        revive();
        // ESC stänger
        const onEsc = (e)=>{ if (e.key==="Escape"){ window.removeEventListener("keydown",onEsc, true); toggle(false); } };
        window.addEventListener("keydown", onEsc, { capture:true });
        // Äkta fullscreen → lämna FW
        const onFs = ()=>{ if (document.fullscreenElement) { document.removeEventListener("fullscreenchange",onFs, true); toggle(false); } };
        document.addEventListener("fullscreenchange", onFs, { capture:true });
    } else {
        document.documentElement.classList.remove("yt-ext-no-scroll");
        document.body.classList.remove("yt-ext-no-scroll");
        flexy.classList.remove("yt-ext-fw-normal");
        active = false;
        revive();
    }
}

export default { toggle, isActive };
