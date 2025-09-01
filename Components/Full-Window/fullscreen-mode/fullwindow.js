// "Fullscreen (f)" enligt din regel: ska STÄNGA AV full-window för båda lägena.

const modCache = {};
async function useMod(path){
    if (!modCache[path]) modCache[path] = import(chrome.runtime.getURL(path));
    return modCache[path];
}

export async function toggle(){
    const normal = await useMod("Components/Full-Window/normal-mode/fullwindow.js");
    const bio    = await useMod("Components/Full-Window/bio-mode/fullwindow.js");
    normal.toggle(false);
    bio.toggle(false);
}
export default { toggle };
