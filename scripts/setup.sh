#!/usr/bin/env bash
# One-time setup for every video in this repo.
#
#   scripts/setup.sh
#
# Installs: hyperframes/ and remotion/ npm packages (fonts and GSAP are copied
# into each project by hyperframes/vendor.sh), a Python venv at .venv with
# Kokoro for the voiceover, the HyperFrames render browser, and the Kokoro
# model files. Needs Node 22+, FFmpeg and Python 3.10+ already installed.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

need() { command -v "$1" >/dev/null || { echo "Missing $1: $2" >&2; exit 1; }; }
need node "install Node.js 22 or newer"
need ffmpeg "install FFmpeg (e.g. sudo apt-get install ffmpeg)"
need python3 "install Python 3.10 or newer"
node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)' \
  || { echo "Node.js 22 or newer is required (found $(node -v))" >&2; exit 1; }

echo "==> npm packages (hyperframes/)"
(cd "$ROOT/hyperframes" && npm ci)

echo "==> npm packages (remotion/)"
(cd "$ROOT/remotion" && npm ci)

echo "==> Python venv for the voiceover (.venv)"
[ -x "$ROOT/.venv/bin/python" ] || python3 -m venv "$ROOT/.venv"
"$ROOT/.venv/bin/pip" install -q kokoro-onnx soundfile

export HYPERFRAMES_PYTHON="$ROOT/.venv/bin/python"

echo "==> Render browser"
(cd "$ROOT/hyperframes" && npx hyperframes telemetry disable >/dev/null 2>&1 || true)
(cd "$ROOT/hyperframes" && npx hyperframes browser ensure)

echo "==> Kokoro voice model (downloaded once into ~/.cache/hyperframes/tts)"
(cd "$ROOT/hyperframes" && npx hyperframes tts "Setup complete." -o "$ROOT/.venv/tts-check.wav" >/dev/null)

echo
echo "Done. Render a video with: scripts/render.sh <project>   (scripts/render.sh --help)"
