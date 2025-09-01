// Full-window för "Bioläge" (theater) – minimal, krocksäker.
// Fixar ENDAST playerns theater-container till fönstret och låter videon fylla ytan.
// Inga aggressiva display/opacity/transform-nollningar på hela spelaren.

function $1(sel, root = document) { return root.querySelector(sel); }
function flexy() { return $1("ytd-watch-flexy"); }
function theaterContainer() {
    // Primärt i bioläge:
    return $1("#player-theater-container")
        || $1("ytd-watch-flexy #player-container")
        || $1("#player");
}
function videoEl() {
    return $1("video.html5-main-video") || $1("ytd-player video");
}

let active = false;

function injectCss() {
    if (document.getElementById("ytf-fw-css-bio-min")) return;
    const css = `
/* blockera scroll när FW är aktivt */
html.yt-ext-no-scroll, body.yt-ext-no-scroll {
  overflow: hidden !important;
}

/* Lås fast själva theater-containern i fönstret */
.yt-ext-fw-bio #player-theater-container,
.yt-ext-fw-bio #player-container,
.yt-ext-fw-bio #player {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  height: 100vh !important; /* fallback */
  height: 100dvh !important; /* modern */
  z-index: 2147483646 !important;
  background: #000 !important;
}

/* Se till att den interna videocontainern fyller ytan */
.yt-ext-fw-bio .html5-video-container {
  width: 100% !important;
  height: 100% !important;
}

/* Videon fyller ytan utan att beskära (contain) */
.yt-ext-fw-bio video.html5-main-video,
.yt-ext-fw-bio ytd-player video {
  width: 100% !important;
  height: 100% !important;
  object-fit: contain !important;
  object-position: center center !important;
  background: #000 !important;
}

/* Kontrollerna överst */
.yt-ext-fw-bio .ytp-chrome-bottom,
.yt-ext-fw-bio .ytp-gradient-bottom,
.yt-ext-fw-bio .ytp-gradient-top {
  z-index: 2147483647 !important;
  pointer-events: auto !important;
}
`;
    const s = document.createElement("style");
    s.id = "ytf-fw-css-bio-min";
    s.textContent = css;
    document.head.appendChild(s);
}

function revive() {
    const v = videoEl(); if (!v) return;
    try { if ("requestVideoFrameCallback" in v) v.requestVideoFrameCallback(() => {}); } catch {}
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    setTimeout(() => window.dispatchEvent(new Event("resize")), 120);
}

export function isActive() { return active; }

export function toggle(state) {
    const want = (typeof state === "boolean") ? state : !active;
    const fx = flexy(); if (!fx) return;
    const tc = theaterContainer(); if (!tc) return;

    if (want) {
        injectCss();
        // Säkerställ att vi är i bioläge
        fx.setAttribute("theater", "");

        document.documentElement.classList.add("yt-ext-no-scroll");
        document.body.classList.add("yt-ext-no-scroll");
        fx.classList.add("yt-ext-fw-bio");
        active = true;
        revive();

        // ESC stänger detta läge
        const onEsc = (e) => {
            if (e.key === "Escape") {
                window.removeEventListener("keydown", onEsc, true);
                toggle(false);
            }
        };
        window.addEventListener("keydown", onEsc, { capture: true });

        // Om riktig fullscreen aktiveras -> lämna FW för att undvika krock
        const onFs = () => {
            if (document.fullscreenElement) {
                document.removeEventListener("fullscreenchange", onFs, true);
                toggle(false);
            }
        };
        document.addEventListener("fullscreenchange", onFs, { capture: true });

    } else {
        document.documentElement.classList.remove("yt-ext-no-scroll");
        document.body.classList.remove("yt-ext-no-scroll");
        fx.classList.remove("yt-ext-fw-bio");
        active = false;
        revive();
    }
}

export default { toggle, isActive };
