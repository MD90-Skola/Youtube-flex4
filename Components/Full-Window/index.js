// Controller: väljer rätt "full-window" beroende på nuvarande läge.
// - Är riktig fullscreen aktiv? -> gör inget (ska inte krocka).
// - Är Bio/Theater aktivt?      -> kör bio-mode/fullwindow.js
// - Annars                      -> kör normal-mode/fullwindow.js
// - "fullscreen-mode" används för att stänga av full-window (toggle off).

function $1(sel, root=document){ return root.querySelector(sel); }
function getFlexy(){ return $1("ytd-watch-flexy"); }
function isTheater(){ return !!getFlexy()?.hasAttribute("theater"); }
function isTrueFullscreen(){ return !!document.fullscreenElement; }

const modCache = {};
async function useMod(path){
    if (!modCache[path]) modCache[path] = import(chrome.runtime.getURL(path));
    return modCache[path];
}

// Publika API:n som din popup kan kalla:
export async function runAuto(){
    if (isTrueFullscreen()) return; // krockskydd
    if (isTheater()){
        const m = await useMod("Components/Full-Window/bio-mode/fullwindow.js");
        m.toggle(true);
    } else {
        const m = await useMod("Components/Full-Window/normal-mode/fullwindow.js");
        m.toggle(true);
    }
}

// Tvinga av (används av "Fullscreen (f)" enligt din beskrivning)
export async function toggleOff(){
    const m1 = await useMod("Components/Full-Window/normal-mode/fullwindow.js");
    const m2 = await useMod("Components/Full-Window/bio-mode/fullwindow.js");
    await m1.toggle(false);
    await m2.toggle(false);
}

// Hjälpkommandon om du vill kalla lägen direkt:
export async function runNormal(){ if (!isTrueFullscreen()){ (await useMod("Components/Full-Window/normal-mode/fullwindow.js")).toggle(true); } }
export async function runBio(){    if (!isTrueFullscreen()){ (await useMod("Components/Full-Window/bio-mode/fullwindow.js")).toggle(true); } }
