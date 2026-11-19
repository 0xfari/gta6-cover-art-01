# Sunset Cover Studio — GTA-style poster maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/0xfari/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/0xfari/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns your own photo and a caption into cover art
in the style of GTA 6's posters: a multi-panel layout with diagonal cuts,
bold poster lettering with a hard shadow, and a Vice City sunset or neon
colour grade — exported as a PNG to share. It runs entirely in a desktop
browser from its own static files: photos never leave the machine.

Load up to three photos (or try the three built-in samples), arrange them
across three, two or one diagonal panels, crop and position each panel by
dragging, write and edit the caption, pick a grade (Sunset, Neon, Noir),
and export in the common post sizes: 1080×1080, 1080×1350, 1920×1080.
Three steps from a photo to a PNG.

Everything here is original: no Rockstar Games logo, artwork or font.
The three sample photos were drawn from scratch with Pillow for this app.

## Run it

Serve `app/` with any static server and open it in desktop Chrome:

```sh
python3 -m http.server 8080 -d app
```

Then open http://localhost:8080. No build step, no network requests.

## The program

`main.ts` (Node 22, standard library only) copies `app/` and
`screenshots/` into `$MAKEFUN_OUTPUT_DIR` (default `/output`) and writes
`dossier.json` there with `buildDossier` from `vendor/makefun-app.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Two runs produce byte-identical output.

## The screenshots

`screenshots/` holds four JPEGs taken with the app itself:

- `1-cover-wide.jpg` — an exported 1920×1080 cover (Sunset Pier, Sunset grade)
- `2-editor.jpg` — the editor with a photo loaded (Neon Street)
- `3-cover-square.jpg` — an exported 1080×1080 cover (Palm Dusk, Neon grade)
- `4-cover-portrait.jpg` — an exported 1080×1350 cover (Neon Street, Neon grade)

License: MIT.
