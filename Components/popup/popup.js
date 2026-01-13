// popup.js — toolbar popup (simple, readable)

const DEFAULTS = {
  addonEnabled: true,

  addOptionsButton: true,
  enableDislikes: false,

  // the toggles you asked for
  advStreamMode: true,

  // advanced
  advThumbDownload: true,
  advThumbClipboard: true,
  advVideoDL: true,
  advSocialBlade: true,
  advZoom: true,
};

const ADV_KEYS = [
  "advThumbDownload",
  "advThumbClipboard",
  "advVideoDL",
  "advSocialBlade",
  "advZoom",
];

function $(sel) { return document.querySelector(sel); }
function $all(sel) { return [...document.querySelectorAll(sel)]; }

function setRowsDisabled(disabled) {
  // disable everything except master row
  const keys = [
    "advStreamMode",
    "addOptionsButton",
    "enableDislikes",
    ...ADV_KEYS,
  ];

  for (const key of keys) {
    const row = document.querySelector(`[data-row="${key}"]`);
    row?.classList.toggle("ytf-disabled", disabled);
  }

  const acc = document.querySelector('details[data-acc="advanced"]');
  acc?.classList.toggle("ytf-disabled", disabled);

  const note = $("#ytf-master-note");
  if (note) {
    note.textContent = disabled
      ? "YT Flex är avstängt. Slå på “Addon on/off” för att aktivera funktionerna."
      : "";
  }
}

function updateAdvBadge() {
  const badge = $("#ytf-adv-badge");
  if (!badge) return;

  let on = 0;
  for (const key of ADV_KEYS) {
    const inp = document.querySelector(`input[data-setting="${key}"]`);
    if (inp?.checked) on++;
  }
  badge.textContent = `${on}/${ADV_KEYS.length}`;
}

async function loadState() {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULTS));
  return Object.assign({}, DEFAULTS, stored);
}

async function applyState(state) {
  for (const key of Object.keys(DEFAULTS)) {
    const inp = document.querySelector(`input[data-setting="${key}"]`);
    if (inp) inp.checked = !!state[key];
  }

  setRowsDisabled(!state.addonEnabled);
  updateAdvBadge();
}

async function bindToggles() {
  const inputs = $all('input[type="checkbox"][data-setting]');

  inputs.forEach(inp => {
    inp.addEventListener("change", async () => {
      const key = inp.dataset.setting;
      const val = !!inp.checked;

      await chrome.storage.local.set({ [key]: val });

      if (key === "addonEnabled") {
        setRowsDisabled(!val);
        // collapse advanced when OFF
        const acc = document.querySelector('details[data-acc="advanced"]');
        if (!val && acc) acc.open = false;
      }

      if (ADV_KEYS.includes(key)) updateAdvBadge();
    });
  });
}

function bindTopButtons() {
  $all("[data-open]").forEach(btn => {
    btn.addEventListener("click", () => {
      const url = btn.getAttribute("data-open");
      if (url) window.open(url, "_blank");
    });
  });
}

(async function init() {
  bindTopButtons();
  await bindToggles();

  const state = await loadState();
  await applyState(state);
})();
