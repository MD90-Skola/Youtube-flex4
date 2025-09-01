// option-popup.js – körs i shadow-root. Skickar ett CustomEvent till sidan.

(function () {
    const root = document.currentScript.getRootNode();
    const $ = (s) => root.querySelector(s);

    function close() {
        const ov = $(".ytf-overlay");
        if (!ov) return;
        ov.style.animation = "ytf-fade .12s reverse ease-in";
        setTimeout(() => ov.remove(), 120);
    }

    root.addEventListener("click", (e) => {
        if (e.target.matches("[data-close]")) close();
    });

    function fire(action) {
        // Bubblar till window i contentscript-kontexten
        window.dispatchEvent(new CustomEvent("ytf:action", { detail: { action } }));
    }

    root.querySelectorAll(".ytf-tile").forEach(btn => {
        btn.addEventListener("click", () => {
            fire(btn.getAttribute("data-action"));
            // close(); // lämna öppen om du vill
        });
    });
})();
