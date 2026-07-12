# Nishchay Gupta — Portfolio

Static single-page portfolio. No framework, no build step: plain HTML/CSS/JS with GSAP + Lenis (vendored in `js/vendor/`).

## Run locally

```
python -m http.server 4173
```

or `npm run serve`, then open http://localhost:4173.

## Structure

- `index.html` — the whole site
- `css/styles.css` — all styling (dark/light themes)
- `js/main.js` — animations, gallery rails, lightbox, case studies, deep links
- `js/data.js` — featured case-study content (hand-edited)
- `js/gallery-data.js` — AUTO-GENERATED, do not edit by hand
- `assets/` — everything the deployed site needs (fonts, gallery images, resume)
- `Portfolio/` — raw design originals (NOT deployed, NOT in git)
- `scripts/build_gallery.py` — scans `Portfolio/`, writes optimized web copies
  into `assets/gallery/` and regenerates `js/gallery-data.js`
- `scripts/check_assets.py` — pre-deploy check: all referenced files exist,
  nothing points at `Portfolio/`

## Updating the gallery

1. Add/remove files in `Portfolio/<category>/`
2. `npm run build:gallery` (needs Python with PyMuPDF, Pillow, pillow-heif)
3. `npm run check`
4. Hard-refresh the browser

## Deploying

Upload everything except `Portfolio/` and `scripts/` (~130 MB, dominated by
`assets/gallery/`). Any static host works. Run `npm run check` first.

## Deep links

- `#g/<item-id>` opens a gallery item in the lightbox
- `#case/<study-id>` opens a featured case study
