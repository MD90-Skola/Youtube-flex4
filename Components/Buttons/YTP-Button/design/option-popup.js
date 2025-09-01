// Modul för spelar-popupen (CSP-säker). Anropas från options.js: initPopup(shadowRoot)
export function initPopup(shadowRoot) {
    const overlay = shadowRoot.querySelector(".ytf-overlay");
    const sheet   = shadowRoot.querySelector(".ytf-sheet");
    if (!overlay || !sheet) return;

    overlay.addEventListener("click", (e) => {
        const path = e.composedPath ? e.composedPath() : [];
        if (!path.includes(sheet)) shadowRoot.host.remove();
    });

    shadowRoot.querySelectorAll(".ytf-iconbtn").forEach(btn => {
        btn.addEventListener("click", () => {
            const action = btn.getAttribute("data-action");
            window.dispatchEvent(new CustomEvent("ytf:action", { detail: { action } }));
        });
    });
}
