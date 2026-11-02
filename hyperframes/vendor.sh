#!/usr/bin/env bash
# Copies runtime assets from node_modules into each composition's vendor/ folder,
# so renders never depend on a CDN.
set -euo pipefail
cd "$(dirname "$0")"
for project in release-card shorts-roots-of-capitalism shorts-papers campaign-gsr864e; do
  mkdir -p "$project/vendor"
  cp node_modules/gsap/dist/gsap.min.js "$project/vendor/"
done
for fonts in shorts-roots-of-capitalism/vendor shorts-papers/vendor campaign-gsr864e/vendor; do
  cp node_modules/@fontsource/playfair-display/files/playfair-display-latin-{700,900}-normal.woff2 "$fonts/"
  cp node_modules/@fontsource/inter/files/inter-latin-{400,600}-normal.woff2 "$fonts/"
done
