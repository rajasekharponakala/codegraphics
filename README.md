# codegraphics

Videos rendered from code by GitHub Actions, using
[HyperFrames](https://github.com/heygen-com/hyperframes) (HTML → video) and
[Remotion](https://github.com/remotion-dev/remotion) (React → video).

## Layout

| Path | What it is |
| --- | --- |
| `hyperframes/release-card/` | 8s release announcement card. Text and accent color are HyperFrames variables. |
| `remotion/src/TitleCard.tsx` | 5s animated title card. Text and colors are Zod-typed props. |
| `scripts/release-variables.mjs` | Turns a GitHub release (tag, name, bullet points) into release-card variables. |
| `.github/actions/setup-hyperframes/` | Shared setup: Node 22, FFmpeg, npm deps, render browser. |

## Workflows

| Workflow | Trigger | Output |
| --- | --- | --- |
| **Render Remotion video** (`render-remotion.yml`) | Actions tab → Run workflow, fill in title/subtitle/colors | `remotion-video` artifact (MP4) |
| **Release video** (`release-video.yml`) | Publishing a GitHub release, or run manually with a tag | MP4 attached to the release, plus an artifact |
| **Video lint** (`video-lint.yml`) | Pull requests touching `hyperframes/` or `remotion/` | Fails on HyperFrames lint/check errors or Remotion type errors; uploads key frames and a still |

The release video uses the first three `-`/`*` bullet points of the release notes as highlights
(GitHub's auto-generated notes work as-is).

## Local development

```bash
# HyperFrames (Node 22+, FFmpeg)
cd hyperframes && npm install
npm run lint && npm run check
cd release-card && npx hyperframes preview
npx hyperframes render --variables '{"version":"v1.0.0","title":"Hello"}' --output out.mp4

# Remotion
cd remotion && npm install
npm run studio
npx remotion render TitleCard out/video.mp4 --props='{"titleText":"Hello"}'
```

Remotion requires a company license for commercial use by teams above its free-tier size; see
[remotion.dev/license](https://www.remotion.dev/license). HyperFrames is Apache-2.0.
