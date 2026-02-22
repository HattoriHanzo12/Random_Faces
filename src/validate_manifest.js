const fs = require("fs");
const path = require("path");

const manifestPath = path.join(__dirname, "..", "data", "minted_faces.json");
const configPath = path.join(__dirname, "..", "data", "inscription_config.json");

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasValidDate(value) {
  if (!isNonEmptyString(value)) {
    return false;
  }
  return !Number.isNaN(new Date(value).getTime());
}

function isLikelyInscriptionId(value) {
  return /^[a-f0-9]{64}i\d+$/i.test(String(value || "").trim());
}

function isHttpsUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function isSafeVisualPath(value) {
  const normalized = String(value || "").trim().replaceAll("\\", "/");
  if (!normalized) {
    return false;
  }
  if (!normalized.startsWith("visuals/")) {
    return false;
  }
  if (normalized.includes("..")) {
    return false;
  }
  if (/^(?:[a-z]+:)?\/\//i.test(normalized)) {
    return false;
  }
  return true;
}

function hasNoWhitespace(value) {
  return !/\s/.test(String(value || ""));
}

function validateManifest(manifest, config = {}) {
  const errors = [];

  if (!Array.isArray(manifest)) {
    return {
      errors: ["Manifest must be a JSON array."],
      maxOfficialSupply: 100,
      uniqueWalletCount: 0
    };
  }

  const maxOfficialSupply = Number.isFinite(Number(config.maxOfficialSupply))
    ? Math.max(1, Math.floor(Number(config.maxOfficialSupply)))
    : 100;

  const logicInscriptionId = String(config.logicInscriptionId || "").trim();
  if (logicInscriptionId && !isLikelyInscriptionId(logicInscriptionId)) {
    errors.push("data/inscription_config.json field \"logicInscriptionId\" is not a valid inscription ID.");
  }

  if (manifest.length > maxOfficialSupply) {
    errors.push(
      `Minted entries exceed maxOfficialSupply (${manifest.length}/${maxOfficialSupply}).`
    );
  }

  const seenSlugs = new Set();
  const seenInscriptions = new Set();
  const seenWallets = new Set();
  let previousMintedAt = null;

  manifest.forEach((item, index) => {
    const prefix = `entry ${index + 1}`;

    if (!item || typeof item !== "object") {
      errors.push(`${prefix} must be an object.`);
      return;
    }

    const requiredFields = [
      "slug",
      "title",
      "seed",
      "inscriptionId",
      "explorerUrl",
      "minterAddress",
      "mintedAt"
    ];

    requiredFields.forEach((field) => {
      if (!isNonEmptyString(item[field])) {
        errors.push(`${prefix} missing required field "${field}".`);
      }
    });

    if (item.image !== undefined && typeof item.image !== "string") {
      errors.push(`${prefix} optional field "image" must be a string when provided.`);
    }

    if (isNonEmptyString(item.explorerUrl) && !isHttpsUrl(item.explorerUrl)) {
      errors.push(`${prefix} field "explorerUrl" must be a valid https URL.`);
    }

    if (typeof item.image === "string" && item.image.trim() && !isSafeVisualPath(item.image)) {
      errors.push(`${prefix} field "image" must be a safe repo-relative path under visuals/.`);
    }

    if (isNonEmptyString(item.mintedAt)) {
      if (!hasValidDate(item.mintedAt)) {
        errors.push(`${prefix} field "mintedAt" must be a valid date string.`);
      } else {
        const timestamp = new Date(item.mintedAt).getTime();
        if (previousMintedAt !== null && timestamp < previousMintedAt) {
          errors.push(
            `${prefix} breaks first-come ordering (mintedAt must be ascending across manifest entries).`
          );
        }
        previousMintedAt = timestamp;
      }
    }

    if (isNonEmptyString(item.slug)) {
      if (item.slug.length > 120 || /[\/\\]/.test(item.slug) || !hasNoWhitespace(item.slug)) {
        errors.push(`${prefix} field "slug" contains unsafe characters.`);
      }
      const key = item.slug.trim().toLowerCase();
      if (seenSlugs.has(key)) {
        errors.push(`${prefix} has duplicate slug "${item.slug}".`);
      }
      seenSlugs.add(key);
    }

    if (isNonEmptyString(item.seed)) {
      if (item.seed.length > 64) {
        errors.push(`${prefix} field "seed" exceeds 64 characters.`);
      }
      if (/[\u0000-\u001f\u007f]/.test(item.seed)) {
        errors.push(`${prefix} field "seed" contains control characters.`);
      }
    }

    if (isNonEmptyString(item.inscriptionId)) {
      if (!isLikelyInscriptionId(item.inscriptionId)) {
        errors.push(`${prefix} field "inscriptionId" is not a valid inscription ID.`);
      }
      const key = item.inscriptionId.trim().toLowerCase();
      if (seenInscriptions.has(key)) {
        errors.push(`${prefix} has duplicate inscriptionId "${item.inscriptionId}".`);
      }
      seenInscriptions.add(key);
    }

    if (isNonEmptyString(item.minterAddress)) {
      if (!hasNoWhitespace(item.minterAddress) || item.minterAddress.length > 128) {
        errors.push(`${prefix} field "minterAddress" contains unsafe formatting.`);
      }
      const key = item.minterAddress.trim().toLowerCase();
      if (seenWallets.has(key)) {
        errors.push(
          `${prefix} violates one-mint-per-wallet policy (duplicate minterAddress "${item.minterAddress}").`
        );
      }
      seenWallets.add(key);
    }
  });

  return {
    errors,
    maxOfficialSupply,
    uniqueWalletCount: seenWallets.size
  };
}

function fail(errors) {
  console.error("Manifest validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

function main() {
  let manifest = [];
  let config = {};

  try {
    manifest = loadJson(manifestPath);
  } catch (error) {
    fail([`Could not parse ${manifestPath}: ${error.message}`]);
  }

  try {
    config = loadJson(configPath);
  } catch (error) {
    fail([`Could not parse ${configPath}: ${error.message}`]);
  }

  const { errors, maxOfficialSupply, uniqueWalletCount } = validateManifest(manifest, config);

  if (errors.length > 0) {
    fail(errors);
  }

  console.log(
    `Manifest validation passed (${manifest.length}/${maxOfficialSupply} official mints, ${uniqueWalletCount} unique wallet(s)).`
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  validateManifest,
  manifestPath,
  configPath,
  loadJson
};
