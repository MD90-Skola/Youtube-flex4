// Konvertera till MP3 i webbläsaren med ffmpeg.wasm (helt lokalt).
// Stöd: a) konvertera via URL (om CORS tillåter), b) filväljare som fallback.
// Kräver web_accessible_resources för:
//   libs/ffmpeg/ffmpeg.min.js
//   libs/ffmpeg/ffmpeg-core.js
//   libs/ffmpeg/ffmpeg-core.wasm

let ffmpeg, loaded = false;

async function ensureFFmpeg() {
    if (loaded) return;
    await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = chrome.runtime.getURL("libs/ffmpeg/ffmpeg.min.js");
        s.onload = res;
        s.onerror = rej;
        document.documentElement.appendChild(s);
    });
    const { createFFmpeg, fetchFile } = window.FFmpeg;
    ffmpeg = createFFmpeg({
        log: false,
        corePath: chrome.runtime.getURL("libs/ffmpeg/ffmpeg-core.js"),
    });
    await ffmpeg.load();
    window.__FFMPEG_FETCH_FILE__ = fetchFile;
    loaded = true;
}

async function runToMp3(inputUint8, outNameSuggest = "audio.mp3") {
    await ensureFFmpeg();
    const inName = "input.bin";
    const outName = "output.mp3";

    ffmpeg.FS("writeFile", inName, inputUint8);
    await ffmpeg.run("-i", inName, "-vn", "-ar", "44100", "-ac", "2", "-b:a", "192k", outName);
    const data = ffmpeg.FS("readFile", outName);

    const blob = new Blob([data.buffer], { type: "audio/mpeg" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = outNameSuggest.replace(/\.[^.]+$/, "") + ".mp3";
    document.body.appendChild(a);
    a.click();
    a.remove();

    try { ffmpeg.FS("unlink", inName); } catch {}
    try { ffmpeg.FS("unlink", outName); } catch {}
}

export async function convertFileToMp3(file) {
    if (!file) return;
    const fetchFile = window.__FFMPEG_FETCH_FILE__ || (await ensureFFmpeg(), window.__FFMPEG_FETCH_FILE__);
    const uint8 = await fetchFile(file);
    await runToMp3(uint8, file.name);
}

export async function pickAndConvertToMp3() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*,audio/*";
    input.onchange = async () => {
        const file = input.files?.[0];
        if (file) await convertFileToMp3(file);
    };
    input.click();
}

// Försök konvertera en *tillåten* URL direkt → MP3 (CORS kan stoppa).
export async function convertUrlToMp3(url, outName = "audio.mp3") {
    try {
        const res = await fetch(url, { mode: "cors", cache: "no-store" });
        if (!res.ok) throw new Error(res.statusText);
        const buf = await res.arrayBuffer();
        await runToMp3(new Uint8Array(buf), outName);
        return true;
    } catch (e) {
        console.warn("[YT-Flex][converter-mp3] URL convert failed (CORS?):", e);
        return false; // låt anroparen falla tillbaka på filväljare
    }
}
