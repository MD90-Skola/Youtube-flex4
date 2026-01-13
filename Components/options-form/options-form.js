export function initOptionsForm(shadowRoot) {
  const host = shadowRoot.host;

  // stäng när man klickar utanför
  shadowRoot.querySelector(".ov")?.addEventListener("click", (e) => {
    const win = shadowRoot.querySelector(".win");
    const path = e.composedPath ? e.composedPath() : [];
    if (win && !path.includes(win)) host.remove();
  });

  shadowRoot.querySelector("[data-close]")?.addEventListener("click", () => host.remove());

  shadowRoot.querySelectorAll("[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");

      // mappa dina nya knappnamn till dina befintliga actions
      const map = {
        thumb_clipboard: "printscreenn-clipboard",
        thumb_viewer: "thumbviewer",      // byt till din riktiga action om den heter annat
        thumb_png: "printpng",
        hashtag_finder: "hashtag_finder", // byt till din riktiga action om den finns
        videodl: "videodl",
        socialblade: "socialblade",
      };

      window.dispatchEvent(new CustomEvent("ytf:action", { detail: { action: map[action] || action } }));
      host.remove();
    });
  });
}
