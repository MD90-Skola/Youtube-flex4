// Always-on Zoom for YouTube
// ALT + Scroll  = zooma in/ut runt muspekaren (0.25x–8x)
// ALT + Drag    = panorera
// ALT + DblClick= reset (skala & position)
//
// Körs en gång via initAlwaysOn(); lyssnar globalt men reagerar bara över spelaren.

const LIMITS = { MIN: 0.25, MAX: 8 };
let bound = false;
let dragging = false;
let lastX = 0, lastY = 0;
let state = { scale: 1, panX: 0, panY: 0 };

function $1(sel, root=document){ return root.querySelector(sel); }
function video(){ return $1("video.html5-main-video") || $1("ytd-player video"); }
function playerEl(){ return $1(".html5-video-player"); }           // stora playern
function containerEl(){ return $1(".html5-video-container") || playerEl(); }

function ensureStyle(){
    if (document.getElementById("ytf-zoom-css-ao")) return;
    const s = document.createElement("style");
    s.id = "ytf-zoom-css-ao";
    s.textContent = `
    /* Transformera bara videon, inte UI */
    video.html5-main-video, ytd-player video {
      transform-origin: center center !important;
      will-change: transform !important;
    }
    /* Alt-hint */
    body.ytf-zoom-alt video.html5-main-video { cursor: grab !important; }
    /* HUD för feedback (visas via flashHint()) */
    .ytf-zoom-hud {
      position: fixed; right: 12px; bottom: 12px;
      background: rgba(0,0,0,.6); color:#fff; border:1px solid #333;
      padding: 6px 10px; border-radius: 10px; z-index: 2147483646;
      font: 500 12px/1 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      backdrop-filter: blur(4px);
      opacity: 0; transform: translateY(6px);
      transition: opacity .12s ease, transform .12s ease;
      pointer-events: none;
    }
    .ytf-zoom-hud.show { opacity: 1; transform: translateY(0); }
  `;
    document.head.appendChild(s);
}

function isOverPlayer(e){
    const p = playerEl() || containerEl();
    if (!p) return false;
    const r = p.getBoundingClientRect();
    const x = e.clientX, y = e.clientY;
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

function apply(){
    const v = video(); if (!v) return;
    v.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.scale})`;
}

function setScale(next, { anchorX, anchorY }){
    const v = video();
    const clamped = Math.min(LIMITS.MAX, Math.max(LIMITS.MIN, Number(next)||1));
    const prev = state.scale;
    if (!v) { state.scale = clamped; apply(); return; }

    if (anchorX != null && anchorY != null && clamped !== prev){
        const rect = v.getBoundingClientRect();
        const cx = rect.left + rect.width/2;
        const cy = rect.top + rect.height/2;
        const dx = anchorX - cx;
        const dy = anchorY - cy;
        // Justera pan så punkten under pekaren håller sig "still"
        state.panX -= dx * (clamped - prev);
        state.panY -= dy * (clamped - prev);
    }
    state.scale = clamped;
    apply();
}

function panBy(dx, dy){
    state.panX += dx; state.panY += dy;
    apply();
}

function reset(){
    state = { scale: 1, panX: 0, panY: 0 };
    apply();
}

function flashHUD(text){
    let hud = document.querySelector(".ytf-zoom-hud");
    if (!hud){
        hud = document.createElement("div");
        hud.className = "ytf-zoom-hud";
        document.documentElement.appendChild(hud);
    }
    hud.textContent = text;
    hud.classList.add("show");
    clearTimeout(flashHUD._t);
    flashHUD._t = setTimeout(()=>hud.classList.remove("show"), 800);
}

function onWheel(e){
    // Reagera bara över spelaren och när ALT hålls
    if (!e.altKey || !isOverPlayer(e)) return;
    // ignorera scroll i menyer/input
    const tag = (e.target?.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;

    const delta = -Math.sign(e.deltaY) * 0.10; // 10% steg
    setScale((state.scale||1) + delta, { anchorX: e.clientX, anchorY: e.clientY });
    flashHUD(`Zoom: ${(state.scale*100).toFixed(0)}%`);
    e.preventDefault(); e.stopPropagation();
}

function onDown(e){
    if (e.button !== 0) return;
    if (!e.altKey || !isOverPlayer(e)) return;
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    document.documentElement.style.cursor = "grabbing";
    e.preventDefault(); e.stopPropagation();
}

function onMove(e){
    // Toggle "alt-cursor" hint när man är över playern
    if (isOverPlayer(e) && e.altKey) document.body.classList.add("ytf-zoom-alt");
    else if (!dragging) document.body.classList.remove("ytf-zoom-alt");

    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    panBy(dx, dy);
    e.preventDefault(); e.stopPropagation();
}

function onUp(){
    if (!dragging) return;
    dragging = false;
    document.documentElement.style.cursor = "";
}

function onDbl(e){
    if (!e.altKey || !isOverPlayer(e)) return;
    reset();
    flashHUD("Reset");
    e.preventDefault(); e.stopPropagation();
}

// Public API
export function initAlwaysOn(){
    if (bound) return;
    ensureStyle();
    const opts = { passive:false, capture:true };
    window.addEventListener("wheel", onWheel, opts);
    window.addEventListener("mousedown", onDown, opts);
    window.addEventListener("mousemove", onMove, opts);
    window.addEventListener("mouseup", onUp, opts);
    window.addEventListener("dblclick", onDbl, opts);
    bound = true;
    // Liten hint vid start
    setTimeout(()=>flashHUD("ALT + Scroll: Zoom"), 400);
}

export function resetZoom(){ reset(); }
export function flashHint(){ flashHUD("ALT + Scroll (zoom), ALT + Drag (pan), ALT + Dubbelklick (reset)"); }

// (kompatibilitet om du redan kallar toggle från popup – gör bara hint)
export function toggleZoomControls(){ initAlwaysOn(); flashHint(); }
