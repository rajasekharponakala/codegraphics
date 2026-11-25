# Pulmonology lecture explainer: content notes

Video: `renders/pulmonology-vqd.mp4` (2:19, 1920×1080, for projection in a lecture). Built from
`script.json`. Covers the brief's introduction and Section 1, "Core respiratory physiology:
ventilation, perfusion and diffusion". Voice: Kokoro `bm_george` (British English); music kept low
(-18 dB) for a lecture room. Diagrams are schematic and drawn for this video.

## Values used (typical resting adult, standard respiratory physiology teaching values)

These were not given in the brief; they are added from standard teaching and should be checked
by the lecturer against the course text before use.

| On screen / spoken | Value |
|---|---|
| Tidal volume / anatomical dead space / alveolar portion | 500 / 150 / 350 mL |
| Respiratory rate | 12 breaths/min → alveolar ventilation ≈ 4.2 L/min |
| Pulmonary blood flow | ≈ 5 L/min (the whole right-ventricular output) |
| Mean pulmonary vs systemic arterial pressure | ≈ 15 vs ≈ 95 mmHg |
| Fick's law of diffusion | V̇gas ∝ A × D × (P1 − P2) / T |
| Alveolar surface area / blood–gas barrier | 50–100 m² / < 0.5 µm |
| Capillary transit at rest / O₂ equilibration | ≈ 0.75 s / ≈ 0.25 s; PO₂ ≈ 40 → 100 mmHg |
| Overall V̇/Q̇ | ≈ 4 / 5 ≈ 0.8 |
| Shunt / dead space examples | pneumonia, atelectasis / pulmonary embolism |

The "thickened membrane" curve is illustrative (no specific disease values).

## Extending to the next sections

Add beats to `script.json` (each with `label`, `big`, `sub`, `say` and a `scene`) and, for new
diagrams, a scene function in `build.mjs`. Render with `scripts/render.sh pulmonology`.
