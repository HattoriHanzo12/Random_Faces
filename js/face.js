const BASE_CANVAS_SIZE = 800;
const FEATURE_INSET = 6;

function randomRange(rng, min, max) {
  return min + (max - min) * rng();
}

function randomInt(rng, min, max) {
  return Math.floor(randomRange(rng, min, max + 1));
}

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function shiftColor(rgb, delta) {
  return [
    clampChannel(rgb[0] + delta),
    clampChannel(rgb[1] + delta),
    clampChannel(rgb[2] + delta)
  ];
}

function luminance(rgb) {
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function clampLuminance(rgb, min, max) {
  const lum = luminance(rgb);
  if (lum < min) {
    return shiftColor(rgb, min - lum);
  }
  if (lum > max) {
    return shiftColor(rgb, max - lum);
  }
  return rgb;
}

function randomColor(rng) {
  return [randomInt(rng, 0, 255), randomInt(rng, 0, 255), randomInt(rng, 0, 255)];
}

function constrainFeatureCenter(faceCenterX, faceCenterY, faceRadius, featureRadius, preferredX, preferredY) {
  const dx = preferredX - faceCenterX;
  const dy = preferredY - faceCenterY;
  const distance = Math.hypot(dx, dy);
  const maxDistance = Math.max(0, faceRadius - featureRadius - FEATURE_INSET);

  if (distance <= maxDistance || distance === 0) {
    return { x: preferredX, y: preferredY };
  }

  const ratio = maxDistance / distance;
  return {
    x: faceCenterX + dx * ratio,
    y: faceCenterY + dy * ratio
  };
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
  const centerX = BASE_CANVAS_SIZE / 2;
  const centerY = BASE_CANVAS_SIZE / 2;

  let backgroundColor = clampLuminance(randomColor(rng), 35, 220);
  let faceColor = clampLuminance(randomColor(rng), 45, 220);

  if (Math.abs(luminance(backgroundColor) - luminance(faceColor)) < 55) {
    faceColor = luminance(backgroundColor) > 128 ? shiftColor(faceColor, -85) : shiftColor(faceColor, 85);
    faceColor = clampLuminance(faceColor, 40, 225);
  }
  if (Math.abs(luminance(backgroundColor) - luminance(faceColor)) < 40) {
    backgroundColor = luminance(faceColor) > 128 ? shiftColor(backgroundColor, -60) : shiftColor(backgroundColor, 60);
    backgroundColor = clampLuminance(backgroundColor, 30, 220);
  }

  const faceDiameter = randomInt(rng, 360, 460);
  const faceRadius = faceDiameter / 2;

  const leftEyeW = randomInt(rng, Math.round(faceDiameter * 0.16), Math.round(faceDiameter * 0.29));
  const leftEyeH = randomInt(rng, Math.round(faceDiameter * 0.15), Math.round(faceDiameter * 0.28));
  const rightEyeW = randomInt(rng, Math.round(faceDiameter * 0.16), Math.round(faceDiameter * 0.31));
  const rightEyeH = randomInt(rng, Math.round(faceDiameter * 0.15), Math.round(faceDiameter * 0.28));

  const eyeCenterY = centerY + randomRange(rng, -faceRadius * 0.4, -faceRadius * 0.1);
  const leftEyePreferredX = centerX - randomRange(rng, faceRadius * 0.25, faceRadius * 0.45);
  const rightEyePreferredX = centerX + randomRange(rng, faceRadius * 0.25, faceRadius * 0.45);

  const leftEyeBoundRadius = Math.max(leftEyeW / 2, leftEyeH / 2);
  const rightEyeBoundRadius = Math.max(rightEyeW / 2, rightEyeH / 2);

  const leftEyeCenter = constrainFeatureCenter(
    centerX,
    centerY,
    faceRadius,
    leftEyeBoundRadius,
    leftEyePreferredX,
    eyeCenterY + randomRange(rng, -faceRadius * 0.05, faceRadius * 0.05)
  );
  const rightEyeCenter = constrainFeatureCenter(
    centerX,
    centerY,
    faceRadius,
    rightEyeBoundRadius,
    rightEyePreferredX,
    eyeCenterY + randomRange(rng, -faceRadius * 0.05, faceRadius * 0.05)
  );

  const highlightSize = randomInt(rng, Math.round(faceDiameter * 0.035), Math.round(faceDiameter * 0.08));
  const highlightBoundRadius = highlightSize / 2;
  const leftHighlightCenter = constrainFeatureCenter(
    centerX,
    centerY,
    faceRadius,
    highlightBoundRadius,
    leftEyeCenter.x + randomRange(rng, -leftEyeW * 0.22, leftEyeW * 0.08),
    leftEyeCenter.y + randomRange(rng, leftEyeH * 0.1, leftEyeH * 0.28)
  );
  const rightHighlightCenter = constrainFeatureCenter(
    centerX,
    centerY,
    faceRadius,
    highlightBoundRadius,
    rightEyeCenter.x + randomRange(rng, -rightEyeW * 0.08, rightEyeW * 0.22),
    rightEyeCenter.y + randomRange(rng, rightEyeH * 0.1, rightEyeH * 0.28)
  );

  const mouthW = randomInt(rng, Math.round(faceDiameter * 0.35), Math.round(faceDiameter * 0.55));
  const mouthH = randomInt(rng, Math.round(faceDiameter * 0.18), Math.round(faceDiameter * 0.34));
  const mouthBoundRadius = Math.max(mouthW / 2, mouthH / 2);
  const mouthCenter = constrainFeatureCenter(
    centerX,
    centerY,
    faceRadius,
    mouthBoundRadius,
    centerX + randomRange(rng, -faceRadius * 0.16, faceRadius * 0.16),
    centerY + randomRange(rng, faceRadius * 0.28, faceRadius * 0.58)
  );

  return {
    seed: normalizedSeed,
    backgroundColor,
    faceColor,
    faceDiameter,
    leftEyeX: leftEyeCenter.x,
    rightEyeX: rightEyeCenter.x,
    eyeY: (leftEyeCenter.y + rightEyeCenter.y) / 2,
    leftEyeY: leftEyeCenter.y,
    rightEyeY: rightEyeCenter.y,
    leftEyeW,
    leftEyeH,
    rightEyeW,
    rightEyeH,
    leftHighlightX: leftHighlightCenter.x,
    rightHighlightX: rightHighlightCenter.x,
    highlightY: (leftHighlightCenter.y + rightHighlightCenter.y) / 2,
    leftHighlightY: leftHighlightCenter.y,
    rightHighlightY: rightHighlightCenter.y,
    highlightSize,
    mouthX: mouthCenter.x,
    mouthY: mouthCenter.y,
    mouthW,
    mouthH
  };
}

export function renderFace(p, traits) {
  p.background(...traits.backgroundColor);
  p.noStroke();
  p.fill(...traits.faceColor);
  p.circle(p.width / 2, p.height / 2, traits.faceDiameter);

  p.fill(0);
  p.ellipse(traits.leftEyeX, traits.leftEyeY, traits.leftEyeW, traits.leftEyeH);
  p.ellipse(traits.rightEyeX, traits.rightEyeY, traits.rightEyeW, traits.rightEyeH);

  p.fill(255);
  p.circle(traits.leftHighlightX, traits.leftHighlightY, traits.highlightSize);
  p.circle(traits.rightHighlightX, traits.rightHighlightY, traits.highlightSize);

  p.fill(0);
  p.ellipse(traits.mouthX, traits.mouthY, traits.mouthW, traits.mouthH);
}
