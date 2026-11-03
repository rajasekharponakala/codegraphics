# Reproducing the videos

Two ways: reuse this repository with the scripts below (minutes), or rebuild the pipeline from
scratch with an AI coding agent using the prompt in Option B.

## Option A: reuse this repository

Requirements: Node 22+, FFmpeg, Python 3.10+, and about 2 GB of disk.

```bash
git clone https://github.com/rajasekharponakala/codegraphics.git
cd codegraphics
scripts/setup.sh                 # once: npm packages, .venv with Kokoro, render browser, voice model
scripts/render.sh campaign       # then any project below
```

| Command | Video | Source to edit | Output |
|---|---|---|---|
| `scripts/render.sh campaign` | G.S.R. 864(E) campaign video (59 s, Indian English voice) | `hyperframes/campaign-gsr864e/script.json` | `hyperframes/campaign-gsr864e/renders/` |
| `scripts/render.sh papers` | "Papers, explained" Shorts, episodes 1–4 | `hyperframes/shorts-papers/script.json` | `hyperframes/shorts-papers/renders/` |
| `scripts/render.sh papers --episode 2` | One episode | | |
| `scripts/render.sh roots` | Roots of Capitalism Shorts, parts 1–6 | `hyperframes/shorts-roots-of-capitalism/script.json` | `hyperframes/shorts-roots-of-capitalism/renders/` |
| `scripts/render.sh roots --part 1 --style brutal` | One part, other style | | |
| `scripts/render.sh release-card '{"version":"v1.0.0","title":"Hello"}'` | 8 s release card | `hyperframes/release-card/index.html` | `hyperframes/release-card/renders/` |
| `scripts/render.sh remotion '{"titleText":"Hello"}'` | Remotion title card | `remotion/src/TitleCard.tsx` | `remotion/out/video.mp4` |

Each narrated project's `build.mjs` turns `script.json` into one HyperFrames composition per
video under `build/` (voiceover, captions, music, scenes); `render.sh` lints and renders each one.
Rendering takes about 2–4 minutes per minute of video on a 4-core machine.

Notes:

- **Voice.** Kokoro runs locally. The campaign uses `"accent": "indian"`: `hyperframes/lib/indian_tts.py`
  rewrites the pronunciation with Indian English features for the Indian voice `hf_alpha`. If a word
  sounds wrong, add a `{shown|spoken}` override in `script.json`, e.g. `{1998|nineteen ninety-eight}`.
- **First run downloads** the Kokoro model (~330 MB) and the render browser. Remotion downloads its
  own Chrome on its first render.
- **Campaign photos** are CC BY-SA / CC0 from Wikimedia Commons; credits are in
  `hyperframes/campaign-gsr864e/POST.md`, and the video must be shared under CC BY-SA.
- **GitHub Actions** can render without a local setup: Actions → "Render campaign video",
  "Render paper Shorts" or "Render Shorts" → Run workflow; the MP4s are attached to the run.

To make a new series from a different document, copy one of the `script.json` files (same shape),
replace the text, and run its `build.mjs`.

## Option B: rebuild from scratch with a coding agent

Attach your source PDF (or paste its text), then give the agent this prompt. Replace the
bracketed parts.

```text
Turn the attached document into a series of YouTube Shorts, rendered by code and by GitHub
Actions. Use HyperFrames (npm "hyperframes", HTML → MP4). Work in a git repository and commit
as you go.

SOURCE AND ACCURACY
- Read the whole document first. Note its license; if it is NonCommercial (e.g. CC BY-NC),
  tell me the videos must not be monetized and put an attribution end card on every video:
  title, author, publisher, license name and URL, "text condensed and narrated for video".
- Every number, date, name and claim on screen or in narration must come from the document,
  word for word in meaning. Do not add outside facts. Where a punchy hook would overstate the
  source, soften it to match.
- Do not use the document's artwork or logos unless its license clearly covers them.

SERIES STRUCTURE
- [6] parts, each under 60 seconds, 1080×1920, one idea per part.
- Each part: a hook (on screen from frame 0, because frame 0 is the Shorts thumbnail), five
  beats, then the attribution end card (at least 6 s).
- Each beat has: a big headline (a number or 1–3 words), a short label, one spoken sentence
  ("say"), and a map scene.
- Keep all content in a data file (script.json). A build script (build.mjs) generates one
  HyperFrames composition per part from it. Generated files go in a gitignored build/ folder.

VOICEOVER
- Use `npx hyperframes tts` (local Kokoro model, voice [bm_george], free). It needs
  `pip install kokoro-onnx soundfile`; point HYPERFRAMES_PYTHON at that Python.
- Generate one clip per segment (hook, each beat, outro), cache clips by a hash of the text,
  and lay them on a timeline with ~0.45 s gaps. Each beat lasts exactly as long as its
  narration, so editing the text re-times the video.
- Kokoro reads "1226" as "one thousand two hundred…". Support markup like
  {1226|twelve twenty-six}: captions show the first form, the voice speaks the second.

CAPTIONS
- Word-by-word captions, one line at a time (max 4 words / 24 characters, break after
  punctuation), with the spoken word highlighted.
- Timing: if `hyperframes transcribe` works (it downloads Whisper models from huggingface.co),
  use its word timestamps. Otherwise detect pauses in each clip with ffmpeg silencedetect, pin
  each clause (text between punctuation) to the matching pause, and spread words inside a
  clause by syllable count (count digits as ~2 syllables each). Verify against the detected
  pauses.

MAPS
- Every beat gets a map: Natural Earth via the npm package world-atlas (countries-50m so small
  islands appear), drawn with d3-geo + d3-geo-projection in the Mollweide projection (not
  Mercator), pre-rendered to SVG at build time.
- A map scene = view box [west, south, east, north] + named pins + routes between pins. Keep a
  gazetteer of place coordinates in the build script. Routes are great-circle lines that draw
  on (animated stroke-dashoffset); pins pop in; maps crossfade between beats with a slow zoom.
- Place pin labels at the first free corner around the pin so close places never overlap.

DESIGN
- Two selectable styles in one stylesheet, chosen by <html data-style>:
  "glass" (frosted translucent cards with backdrop-filter blur over the map, teal + gold) and
  "brutal" (neo-brutalism: flat colours, thick black borders, hard offset shadows).
  Default to glass for serious subjects.
- Respect Shorts safe zones: header below ~190 px, cards bottom-anchored (so a two-line
  headline grows upward, never into the captions), captions around y≈1400, nothing important
  below ~1550 px or in the right-hand button column.
- Serif display face for headlines, sans for text. Install fonts (@fontsource) and GSAP from
  npm and copy them into the project at install time. Do not load them from a CDN: headless
  rendering may not reach it.

MUSIC
- Compose an original ambient bed in Python/numpy (no licensing issues): slow minor-key pad,
  low drone, sparse bells, synthetic reverb, seeded per part.
- Duck it under the voice with ffmpeg sidechaincompress keyed on the narration (about 16 dB
  under speech, rising in pauses and over the end card), then normalise the final mix to
  -14 LUFS with a single gain plus a limiter at about -1 dBFS.

QUALITY CHECKS (do these yourself before showing me anything)
- Run `npx hyperframes lint` and `npx hyperframes check` on each built part; fix errors.
- Render, then extract frames across each video and look at them: overlapping labels,
  captions colliding with cards, text cut off, empty first frame.
- Measure loudness (ffmpeg ebur128) and confirm voice/music balance in a speech and a pause.

GITHUB ACTIONS
- Workflow "Render Shorts": on push to the Shorts folder and on workflow_dispatch (inputs:
  style, part). Steps: checkout, Node 22, apt install ffmpeg, npm ci,
  `npx hyperframes browser ensure`, Python + kokoro-onnx venv, cache ~/.cache/hyperframes/tts,
  build, lint + render each part, upload the MP4s as an artifact.

Known HyperFrames quirk (v0.8.x): `render --variables-file` fails with "io.readFile is not a
function"; pass JSON inline with --variables "$(cat file.json)" instead.

Finish by sending me the rendered MP4s and a short summary of what to check before posting.
```

## Tips

- One part first: ask the agent to build and render Part 1, review it, then do the rest.
- Rendering takes about 1.5× the video length per part on a 4-core machine.
- Listen before posting: the music is generated, and levels were checked by measurement.
