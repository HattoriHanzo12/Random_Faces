# Random Faces

Random Faces uses a classic p5-style live renderer plus a minted PNG gallery.

## Live Generator

1. Deterministic URL contract is preserved:
   - `/?seed=<string>` always renders the same face.
   - `/` auto-generates a seed and writes it to the URL.
2. Canonical render/export size is `800x800`.
3. Generator controls are intentionally simple:
   - Seed input + `Apply Seed`
   - `Refresh Face`
   - `Copy Share Link`
   - `Download PNG`

## Renderer Contract

`js/face.js` exports:

1. `createRngFromSeed(seed)`
2. `deriveTraits(seed)`
3. `renderFace(p5Instance, traits)`

The renderer follows the snippet-first classic style:

1. Flat background
2. Filled face circle
3. Two black eyes (ellipse variation allowed)
4. White highlights
5. Black mouth ellipse

No gradients, stars, accessories, brows, or overlays are used in classic mode.

## Project Structure

1. `index.html`: site entry and UI
2. `js/app.js`: seed/URL/UI controller
3. `js/face.js`: classic deterministic renderer
4. `js/gallery.js`: minted gallery loader
5. `data/minted_faces.json`: gallery source of truth
6. `visuals/`: minted PNG assets
7. `.github/workflows/deploy.yml`: `main -> gh-pages` deployment

## Gallery Manifest Format

Use this object shape in `data/minted_faces.json`:

```json
{
  "slug": "random-face-mint-1",
  "title": "Random Face Mint 1",
  "image": "visuals/random_face_mint_1.png",
  "inscriptionId": "0373...i0",
  "explorerUrl": "https://ordinals.com/inscription/0373...i0"
}
```

## Local Preview

Run:

```bash
python3 -m http.server 8000
```

Open:

1. `http://localhost:8000/`
2. `http://localhost:8000/?seed=abc123`

## Deployment Model

1. `main` is the source branch.
2. `gh-pages` is deploy output only.
3. Push to `main` triggers GitHub Actions deployment.

## License

MIT. See `LICENSE`.
