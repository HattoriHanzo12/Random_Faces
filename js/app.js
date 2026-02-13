import { deriveTraits, renderFace } from "./face.js";
import { initGallery } from "./gallery.js";

const SEED_PARAM = "seed";
const MAX_SEED_LENGTH = 64;
const CANVAS_SIZE = 480;

const elements = {
  tabButtons: Array.from(document.querySelectorAll("[data-view]")),
  generatorPanel: document.getElementById("generator-panel"),
  galleryPanel: document.getElementById("gallery-panel"),
  canvasMount: document.getElementById("face-canvas"),
  seedInput: document.getElementById("seed-input"),
  applySeed: document.getElementById("apply-seed"),
  randomizeSeed: document.getElementById("randomize-seed"),
  copyLink: document.getElementById("copy-link"),
  downloadFace: document.getElementById("download-face"),
  currentSeed: document.getElementById("current-seed"),
  traitList: document.getElementById("trait-list"),
  generatorStatus: document.getElementById("generator-status"),
  galleryStatus: document.getElementById("gallery-status"),
  galleryGrid: document.getElementById("gallery-grid")
};

const state = {
  seed: "",
  traits: null,
  p5Instance: null,
  canvasElement: null
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

function traitLabels(traits) {
  return [
    `Palette: ${traits.paletteName}`,
    `Eyes: ${traits.eyeShape}`,
    `Accessory: ${traits.accessory}`,
    `Mouth: ${traits.mouthWidth}x${traits.mouthHeight}`,
    `Stars: ${traits.starCount}`
  ];
}

function renderTraitList(traits) {
  elements.traitList.innerHTML = "";
  traitLabels(traits).forEach((label) => {
    const item = document.createElement("li");
    item.textContent = label;
    elements.traitList.append(item);
  });
}

function refreshCanvas() {
  if (!state.p5Instance) {
    return;
  }

  state.p5Instance.redraw();
}

function safeFileName(seed) {
  return seed.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 40);
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
  if (!state.canvasElement) {
    setGeneratorStatus("Canvas not ready yet.", true);
    return;
  }

  const link = document.createElement("a");
  link.download = `random_face_${safeFileName(state.seed)}.png`;
  link.href = state.canvasElement.toDataURL("image/png");
  link.click();
  setGeneratorStatus("PNG download started.");
}

function applySeed(rawSeed) {
  const normalized = normalizeSeed(rawSeed) || randomSeed();
  state.seed = normalized;
  state.traits = deriveTraits(normalized);

  elements.seedInput.value = normalized;
  elements.currentSeed.textContent = normalized;

  setSeedInUrl(normalized);
  renderTraitList(state.traits);
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

function initP5() {
  if (typeof window.p5 !== "function") {
    setGeneratorStatus("p5.js did not load. Please refresh.", true);
    return;
  }

  const sketch = (p) => {
    p.setup = () => {
      const canvas = p.createCanvas(CANVAS_SIZE, CANVAS_SIZE);
      canvas.parent(elements.canvasMount);
      state.canvasElement = canvas.elt;
      p.noLoop();
    };

    p.draw = () => {
      if (state.traits) {
        renderFace(p, state.traits);
      }
    };
  };

  state.p5Instance = new window.p5(sketch);
}

function bindEvents() {
  elements.applySeed.addEventListener("click", () => applySeed(elements.seedInput.value));
  elements.randomizeSeed.addEventListener("click", () => applySeed(randomSeed()));
  elements.copyLink.addEventListener("click", copyShareLink);
  elements.downloadFace.addEventListener("click", downloadCanvas);
  elements.seedInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      applySeed(elements.seedInput.value);
    }
  });
}

async function bootstrap() {
  initTabs();
  initP5();
  bindEvents();

  const initialSeed = readSeedFromUrl() || randomSeed();
  applySeed(initialSeed);

  await initGallery({
    container: elements.galleryGrid,
    statusElement: elements.galleryStatus
  });
}

bootstrap();
