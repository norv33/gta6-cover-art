[![GTA 6 cover art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/norv33/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/norv33/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Vice City Cover Studio

A free offline web app that turns your photo and a caption into GTA-style cover
art: a multi-panel poster with bold display lettering and a neon sunset grade,
exported as a PNG to share.

Built for the [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01)
bounty on make.fun.

## How it works

1. Drop a photo (or pick one per panel) — it never leaves your machine.
2. Click a panel in the preview to select it, drag to pan it, scroll to zoom it.
   The hero panel defaults to a slightly upward crop so faces are not cut off.
3. Type a caption and a tag line, pick a preview size.
4. Export one size as a PNG, or all three at once as a single `covers.zip`
   (one download, since browsers routinely block the 2nd and 3rd of three
   simultaneous downloads): 1080 x 1080, 1080 x 1350, 1920 x 1080.

The sunset grade (warm top, magenta middle, violet bottom, vignette) is drawn
per panel and its strength is a slider, 0–100%. The lettering is Anton (OFL):
white fill, thick dark outline, neon underline.

## What it is made of

- `app/index.html` + `app/style.css` — the editor page (dark neon theme).
- `app/src/cover.js` — the drawing engine: diagonal panel layouts per aspect,
  sunset grade, caption lettering, deterministic grain. Written from scratch.
- `app/src/main.js` — editor wiring: photo loading, crop controls, live preview,
  PNG export.
- `app/src/shots.js` — fixed scenes for screenshots (`?shot=cover` / `?shot=editor`).
- `app/fonts/Anton-Regular.ttf` — Anton, SIL Open Font License (see `OFL.txt`).
- `app/samples/` — two sample photos made for make.fun with an image model,
  free to use.
- `vendor/makefun-app.ts` — make.fun's dossier library, unchanged.
- `main.ts` — hands `app/` and `screenshots/` to `/output` with a dossier.

## Originality

Everything here is original work: no Rockstar Games logo, wordmark, official
artwork, character or font. The caption font is Anton (OFL), the sample photos
are the kit's own image-model photos, and the poster layout, grade and lettering
were designed for this entry.

## Run it

```sh
node serve.ts   # http://localhost:8080
```

MIT licensed. See `LICENSE`.
