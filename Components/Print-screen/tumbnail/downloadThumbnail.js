// Download the current video's thumbnail (tries maxres -> hqdefault -> 0.jpg)
function getCurrentVideoId() {
    // Works on watch pages and shorts with a watch-flexy root
    try {
        const u = new URL(location.href);
        const id = u.searchParams.get("v")
            || document.querySelector("ytd-watch-flexy")?.getAttribute("video-id")
            || "";
        return id;
    } catch {
        return "";
    }
}

// Try a list of URLs in order and trigger a download on the first that exists
async function resolveBestThumb(videoId) {
    const base = `https://img.youtube.com/vi/${videoId}`;
    const candidates = [
        `${base}/maxresdefault.jpg`, // 1280×720
        `${base}/hqdefault.jpg`,     // 480p
        `${base}/0.jpg`              // fallback
    ];

    for (const url of candidates) {
        try {
            const res = await fetch(url, { method: "HEAD" });
            if (res.ok) return url;
        } catch { /* ignore and try next */ }
    }
    return null;
}

export async function downloadThumbnail() {
    const videoId = getCurrentVideoId();
    if (!videoId) {
        console.warn("[YT-Flex] No video ID found for thumbnail download.");
        return;
    }
    const url = await resolveBestThumb(videoId);
    if (!url) {
        console.warn("[YT-Flex] Could not resolve a thumbnail URL.");
        return;
    }

    // Create a temporary <a download> to save the file
    const a = document.createElement("a");
    a.href = url;
    a.download = `${videoId}-thumbnail.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
}
