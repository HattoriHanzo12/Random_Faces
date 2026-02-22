import { deriveTraits, renderFace, CANONICAL_SIZE } from "./face.js";
import { initGallery } from "./gallery.js";

const SEED_PARAM = "seed";
const MAX_SEED_LENGTH = 64;
const CANVAS_SIZE = CANONICAL_SIZE;
const MANIFEST_PATH = "data/minted_faces.json";
const CONFIG_PATH = "data/inscription_config.json";
const DEFAULT_CONFIG = {
  logicInscriptionId: "",
  maxOfficialSupply: 100,
  rendererVersion: "classic-seeded-v1"
};

function isLikelyInscriptionId(value) {
  return /^[a-f0-9]{64}i\d+$/i.test(String(value || "").trim());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

const elements = {
  tabButtons: Array.from(document.querySelectorAll("[data-view]")),
  generatorPanel: document.getElementById("generator-panel"),
  galleryPanel: document.getElementById("gallery-panel"),
  canvasElement: document.getElementById("face-canvas-el"),
  seedInput: document.getElementById("seed-input"),
  applySeed: document.getElementById("apply-seed"),
  randomizeSeed: document.getElementById("randomize-seed"),
  copyLink: document.getElementById("copy-link"),
  downloadFace: document.getElementById("download-face"),
  downloadMintHtml: document.getElementById("download-mint-html"),
  currentSeed: document.getElementById("current-seed"),
  generatorStatus: document.getElementById("generator-status"),
  logicStatus: document.getElementById("logic-status"),
  supplyStatus: document.getElementById("supply-status"),
  galleryStatus: document.getElementById("gallery-status"),
  galleryGrid: document.getElementById("gallery-grid")
};

const state = {
  seed: "",
  traits: null,
  canvasContext: null,
  inscriptionConfig: { ...DEFAULT_CONFIG },
  manifestCount: 0
};

function normalizeSeed(raw) {
  return String(raw ?? "").trim().slice(0, MAX_SEED_LENGTH);
}

function randomSeed() {
  if (window.crypto && typeof window.crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(8);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readSeedFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return normalizeSeed(params.get(SEED_PARAM));
}

function setSeedInUrl(seed) {
  const url = new URL(window.location.href);
  url.searchParams.set(SEED_PARAM, seed);
  window.history.replaceState({}, "", url);
}

function setGeneratorStatus(message, isError = false) {
  elements.generatorStatus.textContent = message;
  elements.generatorStatus.classList.toggle("error", isError);
}

function setLogicStatus(message, isError = false) {
  elements.logicStatus.textContent = message;
  elements.logicStatus.classList.toggle("error", isError);
}

function setSupplyStatus(message, isError = false) {
  elements.supplyStatus.textContent = message;
  elements.supplyStatus.classList.toggle("error", isError);
}

function refreshCanvas() {
  if (!state.canvasContext || !state.traits) {
    return;
  }

  renderFace(state.canvasContext, state.traits, CANVAS_SIZE);
}

function safeFileName(seed) {
  return seed.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 40);
}

function updateMintExportState() {
  const logicInscriptionId = String(state.inscriptionConfig.logicInscriptionId || "").trim();
  const exportEnabled = isLikelyInscriptionId(logicInscriptionId);
  elements.downloadMintHtml.disabled = !exportEnabled;

  if (!exportEnabled) {
    setLogicStatus("Mint HTML export is disabled until a valid logic inscription ID is set in data/inscription_config.json.");
    return;
  }

  setLogicStatus(`Logic inscription loaded: ${logicInscriptionId}`);
}

function updateSupplyStatusText() {
  const maxSupply = Number.isFinite(state.inscriptionConfig.maxOfficialSupply)
    ? state.inscriptionConfig.maxOfficialSupply
    : DEFAULT_CONFIG.maxOfficialSupply;
  const prefix = `Official collection: ${state.manifestCount}/${maxSupply}.`;
  setSupplyStatus(`${prefix} Policy: one mint per wallet (first come, first served).`);
}

function buildMintHtml(seed, logicInscriptionId) {
  const safeSeedLiteral = JSON.stringify(seed);
  const safeLogicId = String(logicInscriptionId).trim();
  const safeTitleSeed = escapeHtml(seed);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'">
  <meta http-equiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=(), payment=(), usb=()">
  <title>Random Face ${safeTitleSeed}</title>
  <style>
    html, body {
      margin: 0;
      background: #000;
      width: 100%;
      min-height: 100%;
      display: grid;
      place-items: center;
    }

    canvas {
      width: min(100vw, 800px);
      height: auto;
      display: block;
    }
  </style>
</head>
<body>
  <canvas id="face" width="800" height="800"></canvas>
  <script type="module">
    import { renderFromSeed } from "/content/${safeLogicId}";
    const canvas = document.getElementById("face");
    const seed = ${safeSeedLiteral};
    renderFromSeed(canvas, seed, 800);
  </script>
</body>
</html>
`;
}

async function copyShareLink() {
  const url = new URL(window.location.href);
  url.searchParams.set(SEED_PARAM, state.seed);

  try {
    await navigator.clipboard.writeText(url.toString());
    setGeneratorStatus("Share link copied.");
  } catch (error) {
    const helper = document.createElement("textarea");
    helper.value = url.toString();
    document.body.append(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
    setGeneratorStatus("Share link copied (fallback).");
    console.error(error);
  }
}

function downloadCanvas() {
  if (!elements.canvasElement) {
    setGeneratorStatus("Canvas not ready yet.", true);
    return;
  }

  const link = document.createElement("a");
  link.download = `random_face_${safeFileName(state.seed)}.png`;
  link.href = elements.canvasElement.toDataURL("image/png");
  link.click();
  setGeneratorStatus("PNG download started.");
}

function downloadMintHtml() {
  const logicInscriptionId = String(state.inscriptionConfig.logicInscriptionId || "").trim();
  if (!isLikelyInscriptionId(logicInscriptionId)) {
    setGeneratorStatus("Set a valid logic inscription ID in data/inscription_config.json before exporting mint HTML.", true);
    return;
  }

  const html = buildMintHtml(state.seed, logicInscriptionId);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `random_face_${safeFileName(state.seed)}.html`;
  link.click();
  URL.revokeObjectURL(url);
  setGeneratorStatus("Mint HTML download started.");
}

function applySeed(rawSeed) {
  const normalized = normalizeSeed(rawSeed) || randomSeed();
  state.seed = normalized;
  state.traits = deriveTraits(normalized);

  elements.seedInput.value = normalized;
  elements.currentSeed.textContent = normalized;

  setSeedInUrl(normalized);
  refreshCanvas();
  setGeneratorStatus("Face updated from seed.");
}

function setActiveView(view) {
  const showGenerator = view === "generator";
  elements.generatorPanel.hidden = !showGenerator;
  elements.galleryPanel.hidden = showGenerator;

  elements.tabButtons.forEach((button) => {
    const isActive = button.dataset.view === view;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
}

function initTabs() {
  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => setActiveView(button.dataset.view));
  });
}

function initCanvas() {
  if (!elements.canvasElement) {
    setGeneratorStatus("Canvas element missing from page.", true);
    return false;
  }

  elements.canvasElement.width = CANVAS_SIZE;
  elements.canvasElement.height = CANVAS_SIZE;
  state.canvasContext = elements.canvasElement.getContext("2d", { alpha: false });

  if (!state.canvasContext) {
    setGeneratorStatus("Canvas context failed to initialize.", true);
    return false;
  }

  return true;
}

async function loadInscriptionConfig() {
  state.inscriptionConfig = { ...DEFAULT_CONFIG };

  try {
    const response = await fetch(CONFIG_PATH, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Config request failed (${response.status}).`);
    }

    const payload = await response.json();
    if (!payload || typeof payload !== "object") {
      throw new Error("Config payload is invalid.");
    }

    const maxSupply = Number(payload.maxOfficialSupply);
    state.inscriptionConfig = {
      logicInscriptionId: String(payload.logicInscriptionId || "").trim(),
      maxOfficialSupply: Number.isFinite(maxSupply) && maxSupply > 0
        ? Math.floor(maxSupply)
        : DEFAULT_CONFIG.maxOfficialSupply,
      rendererVersion: String(payload.rendererVersion || DEFAULT_CONFIG.rendererVersion)
    };
  } catch (error) {
    setLogicStatus("Could not load inscription config. Using defaults.", true);
    console.error(error);
  }

  updateMintExportState();
}

async function loadManifestCount() {
  state.manifestCount = 0;
  try {
    const response = await fetch(MANIFEST_PATH, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Manifest request failed (${response.status}).`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) {
      throw new Error("Manifest is not an array.");
    }

    state.manifestCount = payload.length;
  } catch (error) {
    setSupplyStatus("Could not read minted_faces.json for supply status.", true);
    console.error(error);
    return;
  }

  updateSupplyStatusText();
}

function bindEvents() {
  elements.applySeed.addEventListener("click", () => applySeed(elements.seedInput.value));
  elements.randomizeSeed.addEventListener("click", () => applySeed(randomSeed()));
  elements.copyLink.addEventListener("click", copyShareLink);
  elements.downloadFace.addEventListener("click", downloadCanvas);
  elements.downloadMintHtml.addEventListener("click", downloadMintHtml);
  elements.seedInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      applySeed(elements.seedInput.value);
    }
  });
}

async function bootstrap() {
  initTabs();
  if (!initCanvas()) {
    return;
  }
  bindEvents();

  await loadInscriptionConfig();
  await loadManifestCount();

  const initialSeed = readSeedFromUrl() || randomSeed();
  applySeed(initialSeed);

  const galleryResult = await initGallery({
    container: elements.galleryGrid,
    statusElement: elements.galleryStatus
  });

  if (galleryResult && Number.isFinite(galleryResult.count)) {
    state.manifestCount = galleryResult.count;
    updateSupplyStatusText();
  }
}

bootstrap();
