// Kopiera aktuell videoframe till urklipp (fallback: nedladdning)
function videoEl() {
    return document.querySelector("video.html5-main-video") || document.querySelector("ytd-player video");
}
function drawCanvas() {
    const v = videoEl();
    if (!v) { console.warn("[YT-Flex] Ingen video."); return null; }
    const c = document.createElement("canvas");
    c.width = v.videoWidth || v.clientWidth || 0;
    c.height = v.videoHeight || v.clientHeight || 0;
    const ctx = c.getContext("2d");
    ctx.drawImage(v, 0, 0, c.width, c.height);
    return c;
}
export async function copyToClipboard() {
    try {
        const canvas = drawCanvas();
        if (!canvas) return;
        const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
        if (!blob) throw new Error("No blob");

        if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            console.log("[YT-Flex] Frame copied to clipboard.");
        } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            const ts = new Date().toISOString().replace(/[:.]/g,"-");
            a.href = url; a.download = `youtube-frame-${ts}.png`;
            document.body.appendChild(a); a.click(); a.remove();
            URL.revokeObjectURL(url);
        }
    } catch (e) {
        console.warn("[YT-Flex] Clipboard failed, fallback to download.", e);
        // fallback
        const v = videoEl(); if (!v) return;
        const c = drawCanvas(); if (!c) return;
        c.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            const ts = new Date().toISOString().replace(/[:.]/g,"-");
            a.href = url; a.download = `youtube-frame-${ts}.png`;
            document.body.appendChild(a); a.click(); a.remove();
            URL.revokeObjectURL(url);
        }, "image/png");
    }
}
