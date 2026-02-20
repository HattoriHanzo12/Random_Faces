const fs = require("fs");
const path = require("path");
const { validateManifest, manifestPath, configPath, loadJson } = require("./validate_manifest");

function usage() {
  console.log(`Usage:
node src/add_mint_entry.js \\
  --slug classic-face-001 \\
  --title "Classic Face 001" \\
  --seed abc123 \\
  --inscription-id <inscription-id> \\
  --minter-address <wallet-address> \\
  [--minted-at 2026-02-20T00:00:00Z] \\
  [--image visuals/classic_face_001.png] \\
  [--explorer-url https://ordinals.com/inscription/<inscription-id>] \\
  [--dry-run]
`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    if (key === "help") {
      args.help = true;
      continue;
    }
    if (key === "dry-run") {
      args.dryRun = true;
      continue;
    }
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    args[key] = value;
    i += 1;
  }
  return args;
}

function requiredString(value, fieldName) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    throw new Error(`Missing required option --${fieldName}`);
  }
  return normalized;
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    usage();
    process.exit(1);
  }

  if (args.help) {
    usage();
    return;
  }

  let manifest = [];
  let config = {};
  try {
    manifest = loadJson(manifestPath);
    config = loadJson(configPath);
  } catch (error) {
    console.error(`Failed to load manifest/config: ${error.message}`);
    process.exit(1);
  }

  if (!Array.isArray(manifest)) {
    console.error("minted_faces.json must be a JSON array.");
    process.exit(1);
  }

  let entry;
  try {
    const inscriptionId = requiredString(args["inscription-id"], "inscription-id");
    entry = {
      slug: requiredString(args.slug, "slug"),
      title: requiredString(args.title, "title"),
      seed: requiredString(args.seed, "seed"),
      inscriptionId,
      explorerUrl: String(args["explorer-url"] || `https://ordinals.com/inscription/${inscriptionId}`).trim(),
      minterAddress: requiredString(args["minter-address"], "minter-address"),
      mintedAt: String(args["minted-at"] || new Date().toISOString()).trim()
    };

    const image = String(args.image || "").trim();
    if (image) {
      entry.image = image;
    }
  } catch (error) {
    console.error(error.message);
    usage();
    process.exit(1);
  }

  const nextManifest = [...manifest, entry];
  const { errors, maxOfficialSupply } = validateManifest(nextManifest, config);
  if (errors.length > 0) {
    console.error("Entry rejected by manifest policy:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  if (args.dryRun) {
    console.log("Dry run passed. Entry is valid and would be appended:");
    console.log(JSON.stringify(entry, null, 2));
    console.log(`Resulting count: ${nextManifest.length}/${maxOfficialSupply}`);
    return;
  }

  fs.writeFileSync(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`);
  console.log(`Added entry to ${path.relative(process.cwd(), manifestPath) || manifestPath}`);
  console.log(`Resulting count: ${nextManifest.length}/${maxOfficialSupply}`);
}

main();
