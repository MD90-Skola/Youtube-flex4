// Öppnar SocialBlade för aktuell kanal (handle eller channel-id).

function getChannelPath() {
    const owner = document.querySelector(
        "ytd-video-owner-renderer a[href^='/@'], " +
        "ytd-video-owner-renderer a[href^='/channel/'], " +
        "ytd-video-owner-renderer a[href^='/user/'], " +
        "ytd-video-owner-renderer a[href^='/c/']"
    );
    return owner?.getAttribute("href") || null;
}

export function openSocialBlade() {
    const path = getChannelPath();
    if (!path) { console.warn("[YT-Flex] Hittar inte kanal."); return; }
    const url = "https://socialblade.com/youtube" + path;
    window.open(url, "_blank", "noopener");
}
