export function downloadMediaFromUrl(inputUrl) {
  try {
    const raw = inputUrl || window.location.href; // funkar med prompt-URL eller current tab
    const u = new URL(raw);

    // youtube.com eller m.youtube.com -> sosyoutube.com
    u.hostname = u.hostname.replace(/^m\./, "");
    u.hostname = u.hostname.replace("youtube.com", "sosyoutube.com");

    // Öppna NY FLIK (nytt fönster/tab)
    window.open(u.toString(), "_blank", "noopener,noreferrer");
  } catch (err) {
    console.error("[sos-youtube] kunde inte öppna:", err);
  }
}
