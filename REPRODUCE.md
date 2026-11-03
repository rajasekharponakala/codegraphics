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

Each prompt below is a full brief for Claude Code, Codex, Cursor or a similar agent. They carry the
decisions and fixes from this repository, so the agent does not repeat the same mistakes. Replace
the bracketed parts.

| Prompt | Input | Makes | Built here as |
|---|---|---|---|
| [B1](#b1-document--shorts-series) | A long document (PDF) | A series of narrated Shorts with maps | `shorts-roots-of-capitalism/` |
| [B2](#b2-research-paper--explainer-short) | One research paper (PDF) per episode | An explainer Short with redrawn diagrams | `shorts-papers/` |
| [B3](#b3-campaign-web-page--campaign-video) | A campaign web page + its images | A one-minute campaign video | `campaign-gsr864e/` |
| [B4](#b4-starter-repo-github-workflows-for-video) | An empty repository | HyperFrames + Remotion projects and render workflows | `release-card/`, `remotion/`, `.github/workflows/` |

### B1. Document → Shorts series

Attach your source PDF (or paste its text), then give the agent this prompt.

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

### B2. Research paper → explainer Short

Start a series once (first episode), then reuse the same prompt per episode with the next paper.
Attach the paper's PDF; arXiv and publisher sites may be blocked for the agent.

```text
Make Episode [N] of a YouTube Shorts series called "[Papers, explained]": one Short per landmark
paper, in order. This episode: [paper title], attached as a PDF. Use HyperFrames (npm
"hyperframes", HTML → MP4) and keep all content in script.json with a build.mjs that generates the
composition. Commit as you go.

ACCURACY
- Read the whole paper first. Every number, name and claim on screen or in the narration must come
  from it; note the section, table or figure each one comes from. Do not use outside knowledge
  (for example the "too dangerous to release" story for GPT-2 is from a blog post, not the paper).
- Where the paper does not say something (which colour is which attention head, the actual
  attention weights), do not invent it: label invented values "illustration, not from the paper".
- Check the licence. Show the paper's own figures only if it is CC BY (ACL Anthology, JMLR);
  otherwise redraw every diagram in your own style.
- Name things as the paper does (GPT-1's paper never says "GPT"; say "later known as").
- Bar charts that do not start at 0 must say so on screen.

LANGUAGE: ASD-STE100 Simplified Technical English for the narration and captions
- Max 20 words per sentence, one topic per sentence, active voice, simple present or past tense.
- No -ing forms (except technical names), "each/all" instead of "every".
- Keep technical names exactly as the paper writes them (Transformer, attention, BLEU).
- Tell me the script was checked against the main rules, not certified with an STE dictionary.

STRUCTURE (≤ 60 s, 1080×1920)
- Hook on screen from frame 0 (it is the thumbnail), then 5 beats, then an end card with the full
  citation, "all diagrams redrawn" and a one-line teaser for the next episode.
- Each beat: a big headline (number or 1–3 words), a short label, one spoken sentence, a diagram.
- Series continuity: reuse one example sentence across episodes (we used the paper's own Figure 4
  sentence, "The Law will never be perfect…"), the same colours, and callbacks to earlier episodes.

LOOK: neo-brutalism
- Cream graph-paper background, flat yellow/red/blue blocks, 5–6 px black outlines, hard offset
  shadows, serif display headings, sans text, captions in a white box with the spoken word in yellow.
- Fonts and GSAP installed from npm and copied into the project (no CDN).
- Shorts safe zones: header below ~190 px, cards anchored to a bottom line so a two-line headline
  grows up, captions near y≈1400, nothing important below ~1550 px.

VOICE, CAPTIONS, MUSIC
- Kokoro via `npx hyperframes tts` (pip install kokoro-onnx soundfile; HYPERFRAMES_PYTHON).
  Write years as {2017|twenty seventeen}: captions show the first form, the voice says the second.
  Check how Kokoro reads acronyms (BLEU, GPU, GPT-2) with its phonemizer before writing the script.
- Captions one line (≤ 4 words / 24 characters), timed to pauses detected in each clip; keep
  boundaries in order (a caption must never get a negative duration) and keep lone words like
  "Then," with the next group.
- An original music bed ducked under the voice; final mix at -14 LUFS.

QUALITY
- Lint and check every build, render, then look at frames from every scene: overlapping labels,
  text under the card, animations that finish after their scene ends, tiny text.
- Write a post kit: caption under 100 characters, description in the same STE style with the
  citation and arXiv link, a pinned comment that asks a question, and tags.
```

### B3. Campaign web page → campaign video

Give the agent the page's HTML (or URL) and a zip of its images.

```text
Make a one-minute vertical campaign video (1080×1920, ≤ 60 s) from the attached campaign page
[HTML] and its images [zip], to post on YouTube Shorts, Instagram Reels and X before the deadline
[date]. Use HyperFrames, with all text in script.json and a build.mjs.

ACCURACY
- Use only claims the page makes, with its clause or rule numbers. Quote only words the page
  quotes; never invent surrounding wording of a law or document.
- Keep the page's own terms (e.g. "rodents and lagomorphs") and its honest caveats (e.g. "some
  parts of the draft are better").
- Do not claim people "signed" or "endorse" anything unless the page says so. If it lists them as
  "speaking out", say that.

IMAGES AND RIGHTS
- Use the page's CC-licensed photos and credit every one (author, licence) on the end card and in
  the description. CC BY-SA photos make the video CC BY-SA too; say so in the description.
- Stills of creators come from their own posts: label them as theirs ("their views are their
  own"), tag them when posting, and remove any that object.
- Photos are small: put a blurred, darkened copy full-screen behind each scene and the sharp
  photo as a framed card, rather than stretching it.

SCENES
- Hook from frame 0, one scene per key problem with its clause number (a grid of affected
  animals, the struck-out clause, a table with the missing row in red), a scene for the people
  speaking out, the full list of asks, then a call to action with the deadline, email and site,
  over a collage of the photos.
- Make sure full-screen layers of the last scene sit behind the captions, and stamps do not cover
  titles.

VOICE: [Indian English] female
- Kokoro hf_alpha with hyperframes/lib/indian_tts.py from this repo: en-us phonemes, the British
  short o where American has ɑː ("ob-ject", not "aab-ject"), the spelled r kept, then retroflex
  t/d, tapped r, v/w → ʋ, dental th, pure vowels. Send me a short sample of each candidate voice
  before rendering, and fix any word I say is wrong.
- Better but needs setup: Google Cloud TTS en-IN voices (API key) or AI4Bharat Indic Parler-TTS
  (needs huggingface.co).
- Original music bed, ducked; -14 LUFS.

Finish with the MP4 and a post kit: caption under 100 characters, description with all photo
credits and the licence, and a pinned comment with the action and deadline.
```

### B4. Starter repo: GitHub workflows for video

```text
Set up this empty repository for rendering videos from code with GitHub Actions, using both
HyperFrames (HTML → MP4) and Remotion (React → MP4), side by side in hyperframes/ and remotion/.

1. hyperframes/release-card: an 8 s 1920×1080 release card whose text and accent colour are
   data-composition-variables. Install GSAP and fonts from npm and copy them in at install time.
2. remotion/: a TitleCard composition with Zod-typed props. Pin every Remotion package to the same
   version and zod to the version Remotion asks for.
3. Workflows:
   - render-remotion.yml: workflow_dispatch form inputs → props JSON → MP4 artifact.
   - release-video.yml: on a published release, turn its tag, name and first three bullet points
     into variables, render the release card, attach the MP4 to the release.
   - video-lint.yml: on pull requests, hyperframes lint + check and Remotion type check, with key
     frames uploaded for review.
   - A shared composite action that installs Node 22, FFmpeg, npm packages and the render browser.
4. Render each one locally and look at a frame before pushing.

Known quirks: `hyperframes render --variables-file` (v0.8.x) fails with "io.readFile is not a
function", so pass --variables "$(cat file.json)"; Remotion downloads its own Chrome on first render.
```

## Tips

- One part first: ask the agent to build and render one Short (Part 1, Episode 1), review it, then do the rest.
- Upload source files (PDFs, image zips) instead of links: many sites are blocked for cloud agents.
- Ask for a voice sample before the full render, and name any mispronounced word.
- Rendering takes about 1.5× the video length per part on a 4-core machine.
- Listen before posting: the music is generated, and levels were checked by measurement.
