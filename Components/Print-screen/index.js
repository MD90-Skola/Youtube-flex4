// Fångar videoframe (utan kontroller) och laddar ner som PNG.

function videoEl() { return document.querySelector("video.html5-main-video"); }

export function captureFrame() {
    const v = videoEl();
    if (!v) { console.warn("[YT-Flex] Ingen video."); return; }

    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const ts = new Date().toISOString().replace(/[:.]/g,"-");
        a.href = url;
        a.download = `youtube-frame-${ts}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }, "image/png");
}
