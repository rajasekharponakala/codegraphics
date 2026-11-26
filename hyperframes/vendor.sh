#!/usr/bin/env bash
# Copies runtime assets from node_modules into each composition's vendor/ folder,
# so renders never depend on a CDN.
set -euo pipefail
cd "$(dirname "$0")"
for project in release-card shorts-roots-of-capitalism shorts-papers campaign-gsr864e explainer-india-poverty explainer-weight-space explainer-masala-lab explainer-ai-workbench campaign-medical-camps explainer-volunteer-compute explainer-early-indians explainer-telugudanam explainer-telugu-findings explainer-pulmonology explainer-food-politics; do
  mkdir -p "$project/vendor"
  cp node_modules/gsap/dist/gsap.min.js "$project/vendor/"
done
for fonts in shorts-roots-of-capitalism/vendor shorts-papers/vendor campaign-gsr864e/vendor explainer-india-poverty/vendor; do
  cp node_modules/@fontsource/playfair-display/files/playfair-display-latin-{700,900}-normal.woff2 "$fonts/"
  cp node_modules/@fontsource/inter/files/inter-latin-{400,600}-normal.woff2 "$fonts/"
done
# The weight-space explainer uses the blog post's own fonts.
fonts=explainer-weight-space/vendor
cp node_modules/@fontsource/source-sans-3/files/source-sans-3-latin-{400,600,800}-normal.woff2 "$fonts/"
cp node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-{400,700}-normal.woff2 "$fonts/"
# The Masala Lab Atlas explainer (the site's own fonts) and the AI Workbench pitch.
for fonts in explainer-masala-lab/vendor explainer-ai-workbench/vendor; do
cp node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-{500,700}-normal.woff2 "$fonts/"
cp node_modules/@fontsource/inter/files/inter-latin-{500,700}-normal.woff2 "$fonts/"
cp node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-{400,700}-normal.woff2 "$fonts/"
done
# The Swecha medical-camps campaign.
fonts=campaign-medical-camps/vendor
cp node_modules/@fontsource/source-sans-3/files/source-sans-3-latin-{600,800}-normal.woff2 "$fonts/"
cp node_modules/@fontsource/caveat/files/caveat-latin-700-normal.woff2 "$fonts/"
cp node_modules/@fontsource/inter/files/inter-latin-{500,700}-normal.woff2 "$fonts/"
# The volunteer-compute explainer uses the project page's fonts.
fonts=explainer-volunteer-compute/vendor
cp node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-{normal,italic}.woff2 "$fonts/"
cp node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-{500,700}-normal.woff2 "$fonts/"
cp node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-{400,700}-normal.woff2 "$fonts/"
# The Early Indians atlas Short uses the site's fonts.
fonts=explainer-early-indians/vendor
cp node_modules/@fontsource/fraunces/files/fraunces-latin-{600,700}-normal.woff2 "$fonts/"
cp node_modules/@fontsource/inter/files/inter-latin-{500,700}-normal.woff2 "$fonts/"
# The Telugudanam Short uses the site's fonts, including Noto Sans Telugu.
for fonts in explainer-telugudanam/vendor explainer-telugu-findings/vendor; do
cp node_modules/@fontsource/noto-sans-telugu/files/noto-sans-telugu-telugu-{600,800}-normal.woff2 "$fonts/"
cp node_modules/@fontsource/playfair-display/files/playfair-display-latin-{700,800}-normal.woff2 "$fonts/"
cp node_modules/@fontsource/inter/files/inter-latin-{500,700}-normal.woff2 "$fonts/"
done
# The pulmonology lecture explainer.
fonts=explainer-pulmonology/vendor
cp node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-{500,700}-normal.woff2 "$fonts/"
cp node_modules/@fontsource/inter/files/inter-latin-{500,700}-normal.woff2 "$fonts/"
cp node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-{400,700}-normal.woff2 "$fonts/"
# The Plate & Power explainer uses the companion site's fonts.
fonts=explainer-food-politics/vendor
cp node_modules/@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-{700,800}-normal.woff2 "$fonts/"
cp node_modules/@fontsource/dm-sans/files/dm-sans-latin-{500,700}-normal.woff2 "$fonts/"
cp node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-{500,600}-normal.woff2 "$fonts/"
