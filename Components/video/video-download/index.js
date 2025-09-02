// Ladda ner en tillåten medie-URL till standardmappen "Nedladdade filer" (Downloads).
// Browsern bestämmer platsen; extension kan inte välja mapp.

export async function downloadMediaFromUrl(url, filename = "media.mp4") {
    if (!/^https?:\/\//i.test(url)) {
        console.warn("[YT-Flex][video-download] Invalid URL:", url);
        return false;
    }
    try {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename; // sparas i Nedladdade filer (standard)
        document.body.appendChild(a);
        a.click();
        a.remove();
        return true;
    } catch (e) {
        console.error("[YT-Flex][video-download] download error:", e);
        return false;
    }
}
