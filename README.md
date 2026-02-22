# Random Faces

Random Faces is a deterministic classic-face generator with two outputs:

1. A live seeded preview + shareable URL.
2. Mint-ready HTML export for recursive inscription flow.

Canonical render/export size is `800x800`.

## Live Generator

URL contract:

1. `/?seed=<string>` always renders the same face.
2. `/` auto-generates a seed and writes it to the URL.

Controls:

1. Seed input + `Apply Seed`
2. `Refresh Face`
3. `Copy Share Link`
4. `Download PNG` (reference image)
5. `Download Mint HTML` (inscription payload, gated by logic inscription config)

## Renderer Contract

`js/face.js` exports:

1. `createRngFromSeed(seed)`
2. `deriveTraits(seed)`
3. `renderFace(ctx, traits, size)`
4. `renderFromSeed(canvas, seed, size)`

The renderer is classic flat style:

1. Flat background
2. Filled face circle
3. Two black eyes
4. White highlights
5. Black mouth ellipse

Feature placement is constrained to keep eyes/highlights/mouth inside the face circle.

## Recursive Mint Flow (Option 2)

1. Inscribe the renderer logic file once (shared logic inscription based on `js/face.js`).
2. Set its inscription ID in `data/inscription_config.json` as `logicInscriptionId`.
3. In the app, pick a seed and click `Download Mint HTML`.
4. Upload that HTML file in UniSat to mint.
5. Keep `Download PNG` output as visual reference for parity checks.

The exported mint HTML references the shared logic inscription via `/content/<logicInscriptionId>` and renders the selected seed.

## Data Contracts

`data/inscription_config.json`:

```json
{
  "logicInscriptionId": "",
  "maxOfficialSupply": 100,
  "rendererVersion": "classic-seeded-v1"
}
```

`data/minted_faces.json` entry format:

```json
{
  "slug": "classic-face-001",
  "title": "Classic Face 001",
  "seed": "abc123",
  "image": "visuals/classic_face_001.png",
  "inscriptionId": "replace-with-inscription-idi0",
  "explorerUrl": "https://ordinals.com/inscription/replace-with-inscription-idi0",
  "minterAddress": "replace-with-wallet-address",
  "mintedAt": "2026-02-20T00:00:00Z"
}
```

Notes:

1. `image` is optional (gallery will render from `seed` if image is absent).
2. Official collection policy is one mint per wallet, first come first served.
3. Official supply cap defaults to `100`.

## Validation And CI

Manifest rules are enforced by `src/validate_manifest.js`:

1. Required fields present for each entry.
2. Unique `slug`.
3. Unique `inscriptionId`.
4. Unique `minterAddress` (one mint per wallet).
5. Total entries must not exceed `maxOfficialSupply`.

Run locally:

```bash
node src/validate_manifest.js
```

### Add Mint Entry Helper

Use the helper to append a mint entry and enforce all policy rules before write:

```bash
node src/add_mint_entry.js \
  --slug classic-face-001 \
  --title "Classic Face 001" \
  --seed abc123 \
  --inscription-id replace-with-inscription-idi0 \
  --minter-address replace-with-wallet-address \
  --minted-at 2026-02-20T00:00:00Z \
  --image visuals/classic_face_001.png
```

Notes:

1. `--explorer-url` is optional (defaults to `https://ordinals.com/inscription/<inscription-id>`).
2. `--image` is optional.
3. Add `--dry-run` to validate without writing.

## Local Preview

```bash
python3 -m http.server 8000
```

Open:

1. `http://localhost:8000/`
2. `http://localhost:8000/?seed=abc123`

## Deployment Model

1. `main` is source of truth.
2. `gh-pages` is deploy artifact only.
3. Push to `main` runs manifest validation and deploys to GitHub Pages.

## Automatic Mint Watcher (Detect + Review)

The repo now includes a scheduled GitHub Actions watcher that scans for new recursive HTML inscriptions referencing the current renderer logic inscription (`data/inscription_config.json.logicInscriptionId`).

Behavior:

1. Detects candidate mints via Hiro metadata (`recursive` + `recursion_refs`) with a lookback window.
2. Fetches inscription HTML from `ordinals.com/content/<inscriptionId>` and parses:
   - seed (`const seed = "..."`)
   - renderer logic import (`/content/<logicInscriptionId>`)
3. Applies official collection policy checks using `src/validate_manifest.js`.
4. Creates/updates a single draft PR on branch `codex/mint-watch-inbox` with proposed `data/minted_faces.json` additions (review required).
5. Updates a rolling GitHub issue digest (`Mint Watch Inbox`) and optionally posts a matching digest comment to Linear.

Important:

1. No auto-merge.
2. No direct edits to `main`.
3. Gallery only updates after a human reviews and merges the draft PR.
4. Detection may lag due to Hiro/Ordinals indexer delays.

### Watcher Workflow

Workflow file:

1. `.github/workflows/mint_watch.yml`

Triggers:

1. `schedule` (every 5 minutes)
2. `workflow_dispatch`

### Optional Repo Variables / Secrets

Repository Variables (`Settings -> Secrets and variables -> Actions -> Variables`):

1. `LINEAR_NOTIFY_ISSUE_ID` (default `CLA-30`)
2. `MINT_WATCH_LOOKBACK_HOURS` (default `72`)
3. `MINT_WATCH_MAX_PAGES` (default `10`)
4. `MINT_WATCH_CONFIRMATIONS` (default `1`)

Repository Secret:

1. `LINEAR_API_KEY` (optional; if unset, GitHub digest/PR still work and Linear is skipped)

### Local Dry Run (Watcher)

You can run the watcher locally to inspect detections without editing tracked files:

```bash
node src/mint_watch.js --lookback-hours 24 --max-pages 2
```

Outputs are written to `.mint-watch/` (gitignored), including:

1. `.mint-watch/result.json`
2. `.mint-watch/proposed_minted_faces.json`
3. `.mint-watch/issue_digest.md`
4. `.mint-watch/pr_body.md`
5. `.mint-watch/summary.md`

## License

MIT. See `LICENSE`.
