// option-popup.js (CSP-säker). Anropas från options.js: initPopup(shadowRoot)
export function initPopup(shadowRoot) {
  const overlay = shadowRoot.querySelector(".ytf-overlay");
  const sheet   = shadowRoot.querySelector(".ytf-sheet");
  if (!overlay || !sheet) return;

  // Close on outside click
  overlay.addEventListener("click", (e) => {
    const path = e.composedPath ? e.composedPath() : [];
    if (!path.includes(sheet)) shadowRoot.host.remove();
  });

  // Top buttons: YouTube / Studio
  shadowRoot.querySelectorAll("[data-open]").forEach(btn => {
    btn.addEventListener("click", () => {
      const url = btn.getAttribute("data-open");
      if (!url) return;
      window.open(url, "_blank");
    });
  });

  // Toggles (store in chrome.storage.local)
  shadowRoot.querySelectorAll("[data-toggle-key]").forEach(el => {
    el.addEventListener("change", async () => {
      const key = el.getAttribute("data-toggle-key");
      if (!key) return;

      const value = !!el.checked;
      await chrome.storage.local.set({ [key]: value });
    });
  });

  // Existing action buttons (advanced etc.)
  shadowRoot.querySelectorAll(".ytf-iconbtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      window.dispatchEvent(new CustomEvent("ytf:action", { detail: { action } }));
    });
  });
}
