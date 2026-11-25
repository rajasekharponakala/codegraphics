"""Speaks Telugu text with a Piper (VITS) Telugu voice, on CPU.

Same command line as indian_tts.py, so lib/shorts.mjs can send each narration
segment to whichever engine its language needs: English to Kokoro (with the
Indian English rewrite), Telugu to Piper.

Voices (rhasspy/piper-voices, te_IN, medium quality, 22.05 kHz):
  padmavathi  female, trained on AI4Bharat IndicVoices-R (CC-BY-4.0)
  venkatesh   male,   trained on AI4Bharat IndicVoices-R (CC-BY-4.0)
  maya        female, fine-tuned from Piper's English "lessac" voice on
              IIT Madras Indic TTS data (check that dataset's licence)

The .onnx and .onnx.json files are downloaded once into ~/.cache/piper/te.

    python telugu_tts.py --text "..." --voice padmavathi --speed 1.0 --out a.wav
"""

import argparse
import os
import urllib.request
import wave

from piper import PiperVoice, SynthesisConfig

CACHE = os.path.expanduser("~/.cache/piper/te")
REPO = "https://huggingface.co/rhasspy/piper-voices/resolve/main/te/te_IN"


def model_path(voice):
    os.makedirs(CACHE, exist_ok=True)
    base = os.path.join(CACHE, f"te_IN-{voice}-medium.onnx")
    for ext in ("", ".json"):
        path = base + ext
        if not os.path.exists(path):
            urllib.request.urlretrieve(f"{REPO}/{voice}/medium/te_IN-{voice}-medium.onnx{ext}", path)
    return base


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True)
    parser.add_argument("--voice", default="padmavathi")
    parser.add_argument("--speed", type=float, default=1.0)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    voice = PiperVoice.load(model_path(args.voice))
    config = SynthesisConfig(length_scale=1.0 / args.speed)
    with wave.open(args.out, "wb") as wav:
        voice.synthesize_wav(args.text, wav, syn_config=config)


if __name__ == "__main__":
    main()
