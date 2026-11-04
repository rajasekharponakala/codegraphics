#!/usr/bin/env bash
# Builds and renders one of the repo's videos. Run scripts/setup.sh first.
#
#   scripts/render.sh campaign                  G.S.R. 864(E) campaign video
#   scripts/render.sh poverty                   India poverty data explainer (World Bank brief)
#   scripts/render.sh weights                   Weight-Space Programming explainer, 59 s and full 2 min
#   scripts/render.sh papers [--episode N]      "Papers, explained" Shorts (all, or one)
#   scripts/render.sh roots [--part N] [--style glass|brutal]
#                                               Roots of Capitalism Shorts
#   scripts/render.sh release-card ['{"version":"v1.0.0","title":"..."}']
#   scripts/render.sh remotion ['{"titleText":"..."}']
#
# MP4s are written to each project's renders/ folder (gitignored).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HF="$ROOT/hyperframes"

usage() { sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; }
[ $# -ge 1 ] || { usage; exit 1; }
target="$1"
shift

if [ -x "$ROOT/.venv/bin/python" ]; then
  export HYPERFRAMES_PYTHON="${HYPERFRAMES_PYTHON:-$ROOT/.venv/bin/python}"
fi

# Builds with node, then lints and renders every folder under build/.
render_builds() {
  local project="$1"
  shift
  (cd "$HF/$project" && node build.mjs "$@")
  mkdir -p "$HF/$project/renders"
  for dir in "$HF/$project"/build/*/; do
    local name
    name="$(basename "$dir")"
    echo "==> $project/$name"
    (cd "$dir" && npx hyperframes lint >/dev/null && npx hyperframes render --output "../../renders/$name.mp4")
  done
  echo "Rendered into hyperframes/$project/renders/"
}

case "$target" in
  campaign)
    render_builds campaign-gsr864e "$@"
    ;;
  weights)
    (cd "$HF/explainer-weight-space" && node build.mjs --script script-full.json)
    render_builds explainer-weight-space "$@"
    ;;
  poverty)
    render_builds explainer-india-poverty "$@"
    ;;
  papers)
    rm -rf "$HF/shorts-papers/build"/ep*/
    render_builds shorts-papers "$@"
    ;;
  roots)
    rm -rf "$HF/shorts-roots-of-capitalism/build"/0*/
    render_builds shorts-roots-of-capitalism "$@"
    ;;
  release-card)
    vars="${1:-{\}}"
    mkdir -p "$HF/release-card/renders"
    (cd "$HF/release-card" && npx hyperframes render --variables "$vars" --strict-variables --output renders/release-card.mp4)
    echo "Rendered hyperframes/release-card/renders/release-card.mp4"
    ;;
  remotion)
    props="${1:-{\}}"
    (cd "$ROOT/remotion" && npx remotion render TitleCard out/video.mp4 --props="$props")
    echo "Rendered remotion/out/video.mp4"
    ;;
  -h | --help | help)
    usage
    ;;
  *)
    echo "Unknown project: $target" >&2
    usage
    exit 1
    ;;
esac
