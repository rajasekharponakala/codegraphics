# Reproducing the Shorts pipeline

Two ways: reuse this repository (minutes), or rebuild it from scratch with an AI coding agent
using the prompt below (works with Claude Code, Codex, Cursor, etc.).

## Option A: reuse this repository

Requirements: Node 22+, FFmpeg, Python 3.10+.

```bash
git clone https://github.com/rajasekharponakala/codegraphics.git
cd codegraphics/hyperframes
npm install                          # also copies GSAP + fonts into vendor/ (vendor.sh)
python3 -m venv ../.venv && ../.venv/bin/pip install kokoro-onnx soundfile
export HYPERFRAMES_PYTHON=$PWD/../.venv/bin/python
npx hyperframes browser ensure

cd shorts-roots-of-capitalism
node build.mjs                       # voiceover, music, captions, maps -> build/<slug>/
for d in build/*/; do (cd "$d" && npx hyperframes render --output "../../renders/$(basename "$d").mp4"); done
```

To make a series from a different document, replace `script.json` (same shape) and add any new
places to `PLACES` in `build.mjs`. Or push to GitHub and run **Actions → Render Shorts**.

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
