# Corpus Volunteer Compute explainer: sources

Video: `renders/volunteer-compute-explainer.mp4` (1920×1080, about 1:44). For the repository README
use `renders/volunteer-compute-explainer-readme.mp4` (smaller file) and the poster JPG; see
`README-snippet.md`. Built from `script.json`, in the project page's own colours and fonts.

Source: code.swecha.org/corpus/volunteer-compute, commit 08cf3c5 (21 November 2026): `README.md`,
the English strings of the field story and tech paper (`i18n/locales/en.js`), and
`corpus-client-cli/docs/volunteer-compute/user-manual.md`.

| On screen / spoken | Value | Where |
|---|---|---|
| Pilot | 50,000 hours of Telugu audio transcribed; 80,000 book pages OCR'd | README; page hero and pilot sections |
| Green | no new servers, cooling or always-on demand; 2.1 Wh per audio-hour at 25 W | README; page green section |
| Speakers | 81 million first-language Telugu speakers (2011 Census) | page access section |
| Protocol | one queue; a device leases a record, computes locally, returns only text; devices never talk to each other | page grid section |
| Session | one record at a time; audio deleted once the text is safe; expired claims return to the pool | page session section |
| Guard | concurrency re-checked every 30 s against battery, heat, idle time and memory | page guard section |
| Models | Gonthuka ASR (wav2vec2) on audio + transcripts; Telugu BPE (65,536 tokens) and Nanochat 560M (20 layers, 2k context) on OCR text | page flow and models sections |
| Scale-up | 1M audio hours and 11M pages (20× and 137×) | README; page scale section |
| Licence | corpus, client and models under AGPL-3.0 | README; page infrastructure section |
| Join | `uv tool install --extra compute git+https://code.swecha.org/corpus/corpus-client-cli`, `corpus-client login`, `corpus-client volunteer-compute` | CLI user manual |

Discrepancy: the field story says "Join in two commands" with `uv tool install corpus-client-cli`;
the CLI user manual installs from the git URL with `--extra compute` and adds `corpus-client login`.
The video follows the manual.

Illustrations, labelled in the video: the laptop fleet, the session steps, the guard chart (its
shape follows the page's chart) and the access device grid.
