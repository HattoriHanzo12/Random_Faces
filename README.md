# Random Faces

Random Faces is a hybrid collection site:

1. **Live Generator**: deterministic p5.js face rendering from a shareable `?seed=` URL.
2. **Minted Gallery**: static PNG faces that have already been inscribed.

The same seed always creates the same face, while a new seed creates a different face.

## Public URL Contract

1. `/?seed=<string>` is supported.
2. The seed is deterministic:
   - `/?seed=abc123` should always render the same face.
3. When no seed is provided, a random seed is generated and injected into the URL.

## Project Structure

1. `index.html`: canonical site entry with two tabs (Live Generator, Minted Gallery).
2. `js/face.js`: deterministic renderer contract:
   - `createRngFromSeed(seed)`
   - `deriveTraits(seed)`
   - `renderFace(p5Instance, traits)`
3. `js/app.js`: page controller for seed handling, URL syncing, share link copy, and PNG download.
4. `js/gallery.js`: manifest fetch and gallery card rendering.
5. `data/minted_faces.json`: source of truth for minted gallery data.
6. `visuals/`: local PNG assets used by the gallery.
7. `.github/workflows/deploy.yml`: automated `main -> gh-pages` deployment workflow.
8. `sketch.js` and `src/`: internal generation tooling, not runtime web dependencies.

## Gallery Manifest Format

Update `data/minted_faces.json` with objects in this shape:

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

Because this project uses ES modules (`js/*.js`) and `fetch` for JSON, preview through a local HTTP server:

```bash
python3 -m http.server 8000
```

Then open:

1. `http://localhost:8000/` for random seed mode.
2. `http://localhost:8000/?seed=abc123` for deterministic mode.

## Deployment Model

1. `main` is the source branch.
2. `gh-pages` is deploy-output only.
3. On each push to `main`, GitHub Actions publishes a static artifact (`index.html`, `js/`, `data/`, `visuals/`) to `gh-pages`.
4. Do not manually edit `gh-pages`.

## Inscriptions

1. Parent logic (`Visuals.js`, optional legacy parent):
   - `1783d64438889e7c632f0e402186cdcaa778d7b06b08de7dfb18d3fb76c2c9c4i0`
2. Random Face Mint 1:
   - `0373d422950c4085f7e23f5ae2860e31bd25ae73cfba27b3faeecf11495f1aa1i0`
3. Random Face Mint 2:
   - `8a8583c22b2f411bb3a05a8be51f0cb361b48d8693f9f139bd6cd78a67e1e1edi0`

## License

MIT. See `LICENSE`.
