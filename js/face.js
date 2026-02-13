const PALETTES = [
  {
    name: "Neon Lagoon",
    bgTop: [7, 20, 42],
    bgBottom: [1, 5, 13],
    head: [124, 255, 201],
    eye: [7, 20, 42],
    detail: [118, 213, 255]
  },
  {
    name: "Cyber Dusk",
    bgTop: [30, 18, 51],
    bgBottom: [6, 6, 15],
    head: [255, 190, 120],
    eye: [45, 12, 66],
    detail: [255, 122, 149]
  },
  {
    name: "Signal Core",
    bgTop: [14, 40, 30],
    bgBottom: [3, 8, 9],
    head: [180, 248, 255],
    eye: [8, 17, 35],
    detail: [124, 255, 201]
  },
  {
    name: "Night Circuit",
    bgTop: [24, 24, 33],
    bgBottom: [5, 7, 16],
    head: [238, 233, 255],
    eye: [24, 26, 51],
    detail: [122, 255, 223]
  }
];

const ACCESSORIES = ["none", "antenna", "visor", "blush"];

function randomRange(rng, min, max) {
  return min + (max - min) * rng();
}

function randomInt(rng, min, max) {
  return Math.floor(randomRange(rng, min, max + 1));
}

function pick(rng, values) {
  return values[Math.floor(rng() * values.length)];
}

function formatColor(rgb) {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

export function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function hash() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

export function mulberry32(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRngFromSeed(seed) {
  const normalized = String(seed ?? "").trim() || "random-faces-default";
  const hash = xmur3(normalized);
  return mulberry32(hash());
}

export function deriveTraits(seed) {
  const normalizedSeed = String(seed ?? "").trim() || "random-faces-default";
  const rng = createRngFromSeed(normalizedSeed);
  const palette = pick(rng, PALETTES);

  const headWidth = randomInt(rng, 225, 290);
  const headHeight = randomInt(rng, 215, 285);
  const eyeShape = rng() > 0.45 ? "oval" : "circle";
  const eyeSize = randomInt(rng, 22, 38);
  const eyeOffsetX = randomInt(rng, 52, 78);
  const eyeOffsetY = randomInt(rng, 18, 44);
  const pupilScale = randomRange(rng, 0.38, 0.62);
  const browTilt = randomRange(rng, -0.32, 0.32);
  const mouthWidth = randomInt(rng, 82, 128);
  const mouthHeight = randomInt(rng, 24, 56);
  const mouthOffset = randomInt(rng, 34, 62);
  const mouthWeight = randomRange(rng, 4.8, 8.5);
  const accessory = pick(rng, ACCESSORIES);
  const starCount = randomInt(rng, 24, 72);
  const grain = randomRange(rng, 0.06, 0.22);

  return {
    seed: normalizedSeed,
    paletteName: palette.name,
    colors: {
      backgroundTop: palette.bgTop,
      backgroundBottom: palette.bgBottom,
      head: palette.head,
      eye: palette.eye,
      detail: palette.detail
    },
    headWidth,
    headHeight,
    eyeShape,
    eyeSize,
    eyeOffsetX,
    eyeOffsetY,
    pupilScale,
    browTilt,
    mouthWidth,
    mouthHeight,
    mouthOffset,
    mouthWeight,
    accessory,
    starCount,
    grain
  };
}

function drawBackground(p, traits) {
  const { backgroundTop, backgroundBottom } = traits.colors;
  for (let y = 0; y < p.height; y += 1) {
    const ratio = y / (p.height - 1);
    const r = p.lerp(backgroundTop[0], backgroundBottom[0], ratio);
    const g = p.lerp(backgroundTop[1], backgroundBottom[1], ratio);
    const b = p.lerp(backgroundTop[2], backgroundBottom[2], ratio);
    p.stroke(r, g, b);
    p.line(0, y, p.width, y);
  }
}

function drawStars(p, traits) {
  const rng = createRngFromSeed(`${traits.seed}-stars`);
  p.noStroke();
  for (let i = 0; i < traits.starCount; i += 1) {
    const x = randomRange(rng, 0, p.width);
    const y = randomRange(rng, 0, p.height);
    const alpha = randomRange(rng, 35, 120);
    const size = randomRange(rng, 1.2, 2.6);
    p.fill(255, 255, 255, alpha);
    p.circle(x, y, size);
  }
}

function drawAccessory(p, traits, centerX, centerY) {
  if (traits.accessory === "none") {
    return;
  }

  const detail = traits.colors.detail;

  if (traits.accessory === "antenna") {
    p.stroke(detail[0], detail[1], detail[2]);
    p.strokeWeight(5);
    p.line(centerX, centerY - traits.headHeight * 0.54, centerX, centerY - traits.headHeight * 0.76);
    p.noStroke();
    p.fill(detail[0], detail[1], detail[2]);
    p.circle(centerX, centerY - traits.headHeight * 0.81, 18);
    return;
  }

  if (traits.accessory === "visor") {
    p.noStroke();
    p.fill(detail[0], detail[1], detail[2], 190);
    p.rectMode(p.CENTER);
    p.rect(centerX, centerY - traits.eyeOffsetY + 2, traits.eyeOffsetX * 2.7, traits.eyeSize * 1.4, 20);
    p.rectMode(p.CORNER);
    return;
  }

  if (traits.accessory === "blush") {
    p.noStroke();
    p.fill(detail[0], detail[1], detail[2], 120);
    p.ellipse(centerX - traits.eyeOffsetX * 1.15, centerY + 26, 24, 14);
    p.ellipse(centerX + traits.eyeOffsetX * 1.15, centerY + 26, 24, 14);
  }
}

export function renderFace(p, traits) {
  const centerX = p.width / 2;
  const centerY = p.height / 2;

  drawBackground(p, traits);
  drawStars(p, traits);

  p.noStroke();
  p.fill(...traits.colors.head);
  p.ellipse(centerX, centerY, traits.headWidth, traits.headHeight);

  drawAccessory(p, traits, centerX, centerY);

  p.fill(...traits.colors.eye);
  const eyeWidth = traits.eyeShape === "circle" ? traits.eyeSize : traits.eyeSize * 1.3;
  const eyeHeight = traits.eyeShape === "circle" ? traits.eyeSize : traits.eyeSize * 0.78;

  p.ellipse(centerX - traits.eyeOffsetX, centerY - traits.eyeOffsetY, eyeWidth, eyeHeight);
  p.ellipse(centerX + traits.eyeOffsetX, centerY - traits.eyeOffsetY, eyeWidth, eyeHeight);

  p.fill(245, 250, 255);
  const pupilSize = traits.eyeSize * traits.pupilScale;
  p.ellipse(centerX - traits.eyeOffsetX + 1.5, centerY - traits.eyeOffsetY + 1.5, pupilSize, pupilSize);
  p.ellipse(centerX + traits.eyeOffsetX + 1.5, centerY - traits.eyeOffsetY + 1.5, pupilSize, pupilSize);

  p.stroke(...traits.colors.eye);
  p.strokeWeight(4);
  p.line(
    centerX - traits.eyeOffsetX - 16,
    centerY - traits.eyeOffsetY - 24 - traits.browTilt * 30,
    centerX - traits.eyeOffsetX + 16,
    centerY - traits.eyeOffsetY - 24 + traits.browTilt * 30
  );
  p.line(
    centerX + traits.eyeOffsetX - 16,
    centerY - traits.eyeOffsetY - 24 + traits.browTilt * 30,
    centerX + traits.eyeOffsetX + 16,
    centerY - traits.eyeOffsetY - 24 - traits.browTilt * 30
  );

  p.noFill();
  p.stroke(...traits.colors.eye);
  p.strokeWeight(traits.mouthWeight);
  p.arc(
    centerX,
    centerY + traits.mouthOffset,
    traits.mouthWidth,
    traits.mouthHeight,
    0,
    p.PI
  );

  const grainRng = createRngFromSeed(`${traits.seed}-grain`);
  p.noStroke();
  for (let i = 0; i < 120; i += 1) {
    p.fill(255, 255, 255, randomRange(grainRng, 0, traits.grain * 65));
    p.circle(randomRange(grainRng, 0, p.width), randomRange(grainRng, 0, p.height), 1.2);
  }

  p.fill(210, 236, 255, 140);
  p.textAlign(p.RIGHT, p.BOTTOM);
  p.textSize(12);
  p.textFont("IBM Plex Mono");
  p.text(formatColor(traits.colors.detail), p.width - 12, p.height - 10);
}
