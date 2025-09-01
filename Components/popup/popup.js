// Kan köras både i toolbar-popup (document) och i ShadowRoot (på YouTube-sidan)
export async function initSettingsPopup(root) {
    const $ = (sel) => root.querySelector(sel);
    const overlay = $(".ytf-opt-overlay");
    const sheet   = $(".ytf-opt-sheet");
    if (!overlay || !sheet) return;

    const close = () => {
        // ShadowRoot på YouTube-sidan → stäng host. Toolbar-popup → stäng fönster.
        if (root.host && root.host.remove) root.host.remove();
        else window.close();
    };

    overlay.addEventListener("click", (e) => {
        const path = e.composedPath ? e.composedPath() : [];
        if (!path.includes(sheet)) close();
    });

    const inputs = [...root.querySelectorAll('input[type="checkbox"][data-setting]')];

    const defaults = {
        addOptionsButton: true,
        addFullWindowButton: true,
        enableDislikes: false,
    };

    function applyState(state) {
        inputs.forEach(inp => {
            const k = inp.dataset.setting;
            inp.checked = !!(state[k] ?? defaults[k]);
        });
    }

    const stored = await chrome.storage.local.get(Object.keys(defaults));
    applyState(stored);

    inputs.forEach(inp => {
        inp.addEventListener("change", async () => {
            const key = inp.dataset.setting;
            const val = !!inp.checked;
            await chrome.storage.local.set({ [key]: val });
            // Snabb feedback för Dislikes när popupen körs inne på YouTube-sidan.
            if (key === "enableDislikes" && root !== document) {
                try {
                    const m = await import(chrome.runtime.getURL("Components/Dislikes/dislike.js"));
                    if (val) m.enable?.(); else m.disable?.();
                } catch {}
            }
        });
    });
}

// MV3: denna fil laddas som <script type="module" src="popup.js"> i toolbar-popupen.
// Auto-init där (root = document). På YouTube-sidan importeras funktionen av content-scriptet.
if (typeof document !== "undefined" && document.body && document.body.classList.contains("ytf-standalone")) {
    initSettingsPopup(document);
}
