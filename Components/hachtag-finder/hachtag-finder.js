/*  File: Components/hachtag-finder.js
    Purpose: Open a popup that shows ALL tags from current YouTube video,
    comma-separated for easy copy/paste + copy button with "copy successful",
    scrollable list + stats (tag count).
*/

export function openHachtagFinderPopup() {
  // Prevent duplicates
  if (document.getElementById("htf-overlay")) return;

  // --- Extract tags (robust-ish) ---
  const tags = extractYouTubeTags();
  const uniqueTags = Array.from(new Set(tags.map(t => (t || "").trim()).filter(Boolean)));

  // Comma-separated string (exactly what you asked for)
  const tagsCSV = uniqueTags.join(", ");

  // --- UI (Popup / Overlay) ---
  const overlay = document.createElement("div");
  overlay.id = "htf-overlay";
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 999999;
    background: rgba(0,0,0,0.55);
    display: flex; align-items: center; justify-content: center;
    font-family: Arial, sans-serif;
  `;

  const modal = document.createElement("div");
  modal.id = "htf-modal";
  modal.style.cssText = `
    width: min(720px, 92vw);
    background: #111; color: #fff;
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 14px;
    box-shadow: 0 18px 60px rgba(0,0,0,0.6);
    overflow: hidden;
  `;

  const header = document.createElement("div");
  header.style.cssText = `
    display:flex; align-items:center; justify-content:space-between;
    padding: 12px 14px;
    background: rgba(255,255,255,0.06);
    border-bottom: 1px solid rgba(255,255,255,0.10);
  `;

  const title = document.createElement("div");
  title.style.cssText = `font-size: 14px; font-weight: 700; letter-spacing: .2px;`;
  title.textContent = "Hashtag / Tag Finder";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = "✕";
  closeBtn.style.cssText = `
    width: 34px; height: 34px; cursor:pointer;
    border-radius: 10px; border: 1px solid rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.08); color: #fff;
  `;
  closeBtn.addEventListener("click", () => cleanup());

  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = document.createElement("div");
  body.style.cssText = `padding: 14px;`;

  const stats = document.createElement("div");
  stats.id = "htf-stats";
  stats.style.cssText = `
    display:flex; align-items:center; justify-content:space-between;
    margin-bottom: 10px; gap: 10px;
    font-size: 12px; opacity: .9;
  `;

  const countLabel = document.createElement("div");
  countLabel.textContent = `Tags: ${uniqueTags.length}`;

  const statusLabel = document.createElement("div");
  statusLabel.id = "htf-status";
  statusLabel.style.cssText = `min-height: 16px; color: #8cff8c; font-weight: 700;`;

  stats.appendChild(countLabel);
  stats.appendChild(statusLabel);

  const textarea = document.createElement("textarea");
  textarea.id = "htf-textarea";
  textarea.readOnly = true;
  textarea.value = tagsCSV || "";
  textarea.placeholder = "No tags found on this video.";
  textarea.style.cssText = `
    width: 100%;
    height: 180px;                 /* scrollbar list */
    resize: none;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.06);
    color: #fff;
    outline: none;
    overflow: auto;                /* scrollbar */
    line-height: 1.4;
    font-size: 13px;
  `;

  const actions = document.createElement("div");
  actions.style.cssText = `
    display:flex; gap: 10px; justify-content:flex-end;
    margin-top: 12px;
  `;

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.textContent = "Copy";
  copyBtn.style.cssText = `
    padding: 10px 14px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.14);
    background: rgba(0,170,255,0.28);
    color: #fff;
    cursor: pointer;
    font-weight: 700;
  `;

  copyBtn.addEventListener("click", async () => {
    const text = textarea.value.trim();
    if (!text) {
      setStatus("No tags to copy", true);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copy successful");
    } catch (e) {
      // Fallback
      textarea.focus();
      textarea.select();
      const ok = document.execCommand("copy");
      setStatus(ok ? "copy successful" : "copy failed", !ok);
    }
  });

  const closeBtn2 = document.createElement("button");
  closeBtn2.type = "button";
  closeBtn2.textContent = "Close";
  closeBtn2.style.cssText = `
    padding: 10px 14px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.08);
    color: #fff;
    cursor: pointer;
    font-weight: 700;
  `;
  closeBtn2.addEventListener("click", () => cleanup());

  actions.appendChild(closeBtn2);
  actions.appendChild(copyBtn);

  body.appendChild(stats);
  body.appendChild(textarea);
  body.appendChild(actions);

  modal.appendChild(header);
  modal.appendChild(body);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Close when clicking outside modal
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) cleanup();
  });

  // ESC to close
  const onKeyDown = (e) => {
    if (e.key === "Escape") cleanup();
  };
  document.addEventListener("keydown", onKeyDown);

  // Put cursor inside textarea (nice UX)
  setTimeout(() => textarea.focus(), 50);

  function setStatus(text, isError = false) {
    statusLabel.style.color = isError ? "#ff8c8c" : "#8cff8c";
    statusLabel.textContent = text;
    // auto-clear after a bit
    setTimeout(() => {
      if (statusLabel.textContent === text) statusLabel.textContent = "";
    }, 1500);
  }

  function cleanup() {
    document.removeEventListener("keydown", onKeyDown);
    overlay.remove();
  }
}

/* ------------------------------
   Tag extraction helpers
--------------------------------*/
function extractYouTubeTags() {
  // 1) Direct object (often exists)
  try {
    const kw = window?.ytInitialPlayerResponse?.videoDetails?.keywords;
    if (Array.isArray(kw) && kw.length) return kw;
  } catch (_) {}

  // 2) Try ytInitialPlayerResponse in scripts (fallback)
  const fromScript = extractFromInlinePlayerResponse();
  if (fromScript.length) return fromScript;

  // 3) Meta keywords (less reliable)
  const meta = document.querySelector('meta[name="keywords"]');
  if (meta?.content) {
    return meta.content.split(",").map(s => s.trim()).filter(Boolean);
  }

  return [];
}

function extractFromInlinePlayerResponse() {
  // We scan scripts for "ytInitialPlayerResponse"
  // and try to parse JSON portion safely-ish.
  const scripts = Array.from(document.scripts || []);
  for (const s of scripts) {
    const text = s.textContent || "";
    if (!text.includes("ytInitialPlayerResponse")) continue;

    // Try to find: ytInitialPlayerResponse = { ... };
    const idx = text.indexOf("ytInitialPlayerResponse");
    if (idx === -1) continue;

    const eq = text.indexOf("=", idx);
    if (eq === -1) continue;

    // Find first "{"
    const start = text.indexOf("{", eq);
    if (start === -1) continue;

    // Grab JSON by matching braces
    const jsonStr = sliceJSONObject(text, start);
    if (!jsonStr) continue;

    try {
      const obj = JSON.parse(jsonStr);
      const kw = obj?.videoDetails?.keywords;
      if (Array.isArray(kw) && kw.length) return kw;
    } catch (_) {}
  }
  return [];
}

function sliceJSONObject(str, startIndex) {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIndex; i < str.length; i++) {
    const ch = str[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    } else {
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === "{") depth++;
      if (ch === "}") depth--;

      if (depth === 0) {
        return str.slice(startIndex, i + 1);
      }
    }
  }
  return null;
}
