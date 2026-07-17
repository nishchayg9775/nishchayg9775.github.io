# Nishchay Gupta — Portfolio

Static single-page portfolio built with plain HTML, CSS and JavaScript. GSAP and ScrollTrigger are self-hosted; there is no frontend build step.

## Run locally

```powershell
npm run serve
```

Then open <http://localhost:4173>.

## Project structure

- `index.html` — page structure and content
- `css/styles.css` — global tokens, responsive layouts and component styles
- `js/main.js` — interactions, animation, gallery rails, lightbox and deep links
- `js/data.js` — hand-edited featured case-study content
- `js/gallery-data.js` — generated gallery manifest; do not edit by hand
- `js/vendor/` — pinned GSAP and ScrollTrigger browser bundles
- `assets/fonts/` — self-hosted WOFF2 fonts
- `assets/profile/` — hero and About portraits
- `assets/work/` — curated case-study imagery
- `assets/gallery/` — generated, optimized gallery images and thumbnails
- `assets/Nishchay_Gupta_Resume.pdf` — downloadable résumé
- `Portfolio/` — optional local raw source tree; Git-ignored and absent from this deployment copy
- `scripts/build_gallery.py` — refreshes optimized gallery output and removes stale files
- `scripts/check_assets.py` — checks missing references, raw-source leaks and deploy orphans
- `requirements.txt` — Python dependencies for gallery maintenance

## Updating the gallery

Install the gallery tooling once:

```powershell
python -m pip install -r requirements.txt
```

Then:

1. Restore or create the local `Portfolio/` source tree with the expected category folders.
2. Add, replace or remove the raw portfolio files.
3. Run `npm run build:gallery`.
4. Run `npm run check`.
5. Update the `gallery-data.js` query version in `index.html` when deploying.

The gallery builder is an optional maintenance tool. It requires a local `Portfolio/` source tree, refreshes changed outputs, regenerates the data manifest and prunes generated images that are no longer referenced.

## Deploying

GitHub Pages serves the tracked files directly from the repository. The raw `Portfolio/` source tree is not included; runtime code only uses optimized files under `assets/`. Always run `npm run check` before publishing.

## Deep links

- `#g/<item-id>` opens a gallery item in the lightbox
- `#case/<study-id>` opens a featured case study
