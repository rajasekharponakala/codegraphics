# codegraphics

Videos rendered from code by GitHub Actions, using
[HyperFrames](https://github.com/heygen-com/hyperframes) (HTML → video) and
[Remotion](https://github.com/remotion-dev/remotion) (React → video).

## Layout

| Path | What it is |
| --- | --- |
| `hyperframes/release-card/` | 8s release announcement card. Text and accent color are HyperFrames variables. |
| `hyperframes/shorts-roots-of-capitalism/` | 6-part YouTube Shorts series (1080×1920, 39s each). `script.json` holds one row of text per part. |
| `remotion/src/TitleCard.tsx` | 5s animated title card. Text and colors are Zod-typed props. |
| `scripts/release-variables.mjs` | Turns a GitHub release (tag, name, bullet points) into release-card variables. |
| `.github/actions/setup-hyperframes/` | Shared setup: Node 22, FFmpeg, npm deps, render browser. |

## Workflows

| Workflow | Trigger | Output |
| --- | --- | --- |
| **Render Remotion video** (`render-remotion.yml`) | Actions tab → Run workflow, fill in title/subtitle/colors | `remotion-video` artifact (MP4) |
| **Release video** (`release-video.yml`) | Publishing a GitHub release, or run manually with a tag | MP4 attached to the release, plus an artifact |
| **Render Shorts** (`render-shorts.yml`) | Push to `hyperframes/shorts-roots-of-capitalism/`, or run manually | `shorts-roots-of-capitalism` artifact with one MP4 per part |
| **Video lint** (`video-lint.yml`) | Pull requests touching `hyperframes/` or `remotion/` | Fails on HyperFrames lint/check errors or Remotion type errors; uploads key frames and a still |

The release video uses the first three `-`/`*` bullet points of the release notes as highlights
(GitHub's auto-generated notes work as-is).

## Shorts: The Roots of Capitalism

Adapted from *The Roots of Capitalism: Slavery and the Sugar Trade* by Prabir Purkayastha
(Tricontinental: Institute for Social Research, Studies on Historical Materialism no. 1), which is
licensed [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). Every figure in
`script.json` is taken from the study; each video ends with the attribution card. The NonCommercial
term means these Shorts must not be monetized.

To change a part, edit its row in `script.json` (headline `bNBig` + one-line `bNText` for beats 1–5)
and push; the workflow re-renders all parts.

## Local development

```bash
# HyperFrames (Node 22+, FFmpeg)
cd hyperframes && npm install
npm run lint && npm run check
cd release-card && npx hyperframes preview
npx hyperframes render --variables '{"version":"v1.0.0","title":"Hello"}' --output out.mp4
cd ../shorts-roots-of-capitalism && npx hyperframes render --batch script.json --output "renders/{slug}.mp4"

# Remotion
cd remotion && npm install
npm run studio
npx remotion render TitleCard out/video.mp4 --props='{"titleText":"Hello"}'
```

Remotion requires a company license for commercial use by teams above its free-tier size; see
[remotion.dev/license](https://www.remotion.dev/license). HyperFrames is Apache-2.0.
