# codegraphics

Videos rendered from code by GitHub Actions (see [REPRODUCE.md](REPRODUCE.md) to rebuild them), using
[HyperFrames](https://github.com/heygen-com/hyperframes) (HTML → video) and
[Remotion](https://github.com/remotion-dev/remotion) (React → video).

## Layout

| Path | What it is |
| --- | --- |
| `hyperframes/release-card/` | 8s release announcement card. Text and accent color are HyperFrames variables. |
| `hyperframes/shorts-roots-of-capitalism/` | 6-part YouTube Shorts series (1080×1920, 54–60s each) with voiceover, word-timed captions and maps. `script.json` holds the narration and map scenes; `build.mjs` turns it into one composition per part. |
| `hyperframes/shorts-papers/` | "Papers, explained" Shorts: one per landmark paper, narrated in ASD-STE100 Simplified Technical English with redrawn neo-brutalist diagrams. Episode 1: *Attention Is All You Need*. |
| `hyperframes/lib/` | Shared Shorts machinery: Kokoro voiceover, caption timing, music bed (`music.py`), ducking and loudness. |
| `remotion/src/TitleCard.tsx` | 5s animated title card. Text and colors are Zod-typed props. |
| `scripts/release-variables.mjs` | Turns a GitHub release (tag, name, bullet points) into release-card variables. |
| `.github/actions/setup-hyperframes/` | Shared setup: Node 22, FFmpeg, npm deps, render browser. |

## Workflows

| Workflow | Trigger | Output |
| --- | --- | --- |
| **Render Remotion video** (`render-remotion.yml`) | Actions tab → Run workflow, fill in title/subtitle/colors | `remotion-video` artifact (MP4) |
| **Release video** (`release-video.yml`) | Publishing a GitHub release, or run manually with a tag | MP4 attached to the release, plus an artifact |
| **Render Shorts** (`render-shorts.yml`) | Push to `hyperframes/shorts-roots-of-capitalism/`, or run manually (choose style and part) | `shorts-roots-of-capitalism` artifact with one MP4 per part |
| **Render paper Shorts** (`render-papers.yml`) | Push to `hyperframes/shorts-papers/`, or run manually (choose episode) | `shorts-papers` artifact with one MP4 per episode |
| **Video lint** (`video-lint.yml`) | Pull requests touching `hyperframes/` or `remotion/` | Fails on HyperFrames lint/check errors or Remotion type errors; uploads key frames and a still |

The release video uses the first three `-`/`*` bullet points of the release notes as highlights
(GitHub's auto-generated notes work as-is).

## Shorts: The Roots of Capitalism

Adapted from *The Roots of Capitalism: Slavery and the Sugar Trade* by Prabir Purkayastha
(Tricontinental: Institute for Social Research, Studies on Historical Materialism no. 1), which is
licensed [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). Every figure in
`script.json` is taken from the study; each video ends with the attribution card. The NonCommercial
term means these Shorts must not be monetized.

### How a Short is built

`node build.mjs [--part N] [--style glass|brutal]` writes `build/<slug>/` for each part:

- **Voiceover**: each segment's `say` text is spoken by Kokoro (`hyperframes tts`, voice `bm_george`).
  Years use `{1226|twelve twenty-six}`: captions show the first form, the voice reads the second.
- **Music**: `../lib/music.py` composes an original ambient bed per part (D minor pad, drone and bells; seeded,
  so each part has its own variation). A sidechain compressor ducks it about 16 dB under the voice and
  lets it rise in the pauses and over the end card. Set `"music": false` in `script.json` to drop it,
  or change `gainDb` to rebalance. The final mix is normalised to -14 LUFS for YouTube.
- **Timing**: every beat lasts as long as its narration, so editing text re-times the video.
- **Captions**: word-by-word, pinned to the pauses detected in the audio; words within a clause are
  spaced by syllables.
- **Maps**: Natural Earth 1:50m data in the Mollweide projection (the study's own choice over Mercator).
  A beat's `map` sets the view box `[west, south, east, north]`, the `points` to pin (see `PLACES` in
  `build.mjs`) and `routes` drawn between them.
- **Style**: `glass` (frosted cards over the map) or `brutal` (flat colour, thick outlines, hard shadows),
  defined in `shorts.css`.

Kokoro needs Python with `pip install kokoro-onnx soundfile`; point `HYPERFRAMES_PYTHON` at that
interpreter.

## Local development

```bash
# HyperFrames (Node 22+, FFmpeg)
cd hyperframes && npm install
npm run lint && npm run check
cd release-card && npx hyperframes preview
npx hyperframes render --variables '{"version":"v1.0.0","title":"Hello"}' --output out.mp4
cd ../shorts-roots-of-capitalism && node build.mjs --part 1 && (cd build/01-sugar-built-capitalism && npx hyperframes preview)

# Remotion
cd remotion && npm install
npm run studio
npx remotion render TitleCard out/video.mp4 --props='{"titleText":"Hello"}'
```

Remotion requires a company license for commercial use by teams above its free-tier size; see
[remotion.dev/license](https://www.remotion.dev/license). HyperFrames is Apache-2.0.
