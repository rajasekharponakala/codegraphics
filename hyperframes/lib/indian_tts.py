"""Speaks English text with an Indian English accent using Kokoro.

HyperFrames' `tts` command only offers en-us / en-gb phonemes, which keep a
British or American accent even with an Indian voice. This script phonemizes
the text as rhotic (en-us) English, rewrites the phonemes with common Indian
English features, and speaks them with an Indian Kokoro voice (hf_/hm_):

  - retroflex t and d            t -> ʈ, d -> ɖ   (but not in tʃ / dʒ)
  - tapped, rhotic r             ɹ -> ɾ, ɚ -> əɾ, ɝ -> əɾ
  - one sound for v and w        v, w -> ʋ
  - dental th                    θ -> tʰ, ð -> d
  - pure long vowels             eɪ -> eː, oʊ -> oː, ɑː -> aː

    python indian_tts.py --text "..." --voice hf_alpha --speed 1.0 --out a.wav
"""

import argparse
import os
import re

import soundfile as sf
from kokoro_onnx import Kokoro

CACHE = os.path.expanduser("~/.cache/hyperframes/tts")
MODEL = os.path.join(CACHE, "models", "kokoro-v1.0.onnx")
VOICES = os.path.join(CACHE, "voices", "voices-v1.0.bin")


def phonemize(kokoro, text):
    """Word by word: en-us phonemes (they keep the r), but where British English
    has the short o of "lot" (ɒ) and American English the long ɑː, use a short
    ɔ: Indian English says "ob-ject", not "aab-ject"."""
    words = []
    for token in text.split():
        core = token.strip(".,;:!?\"“”'’()")
        if not core:
            words.append(token)
            continue
        us = kokoro.tokenizer.phonemize(core, "en-us").strip()
        gb = kokoro.tokenizer.phonemize(core, "en-gb").strip()
        if "ɒ" in gb and "ɑː" in us:
            us = us.replace("ɑː", "ɔ", gb.count("ɒ"))
        # "birds", "first": keep the spelled r after the vowel.
        if "ɜː" in us and "r" in core.lower() and "ɹ" not in us and "ɚ" not in us:
            us = us.replace("ɜː", "ɜːɹ")
        lead = token[: token.index(core[0])]
        tail = token[token.rindex(core[-1]) + 1 :]
        words.append(lead + us + tail)
    return " ".join(words)


def indianise(ph):
    ph = ph.replace("ᵻ", "ɪ")
    # en-us flaps t/d between vowels ("water"); Indian English keeps a hard t.
    ph = ph.replace("ɾ", "t")
    ph = re.sub(r"t(?!ʃ)", "ʈ", ph)
    ph = re.sub(r"d(?!ʒ)", "ɖ", ph)
    ph = ph.replace("ɚ", "əɹ").replace("ɝ", "əɹ")
    ph = ph.replace("ɹ", "ɾ")
    ph = re.sub(r"ɾ+", "ɾ", ph)  # "our" -> aʊəɾ, not aʊəɾɾ
    ph = ph.replace("θ", "tʰ").replace("ð", "d")
    ph = ph.replace("v", "ʋ").replace("w", "ʋ")
    ph = ph.replace("eɪ", "eː").replace("oʊ", "oː").replace("ɑː", "aː")
    return ph


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True)
    parser.add_argument("--voice", default="hf_alpha")
    parser.add_argument("--speed", type=float, default=1.0)
    parser.add_argument("--out", required=True)
    parser.add_argument("--print-phonemes", action="store_true")
    args = parser.parse_args()

    kokoro = Kokoro(MODEL, VOICES)
    phonemes = indianise(phonemize(kokoro, args.text))
    if args.print_phonemes:
        print(phonemes)
    samples, rate = kokoro.create(phonemes, voice=args.voice, speed=args.speed, is_phonemes=True)
    sf.write(args.out, samples, rate)


if __name__ == "__main__":
    main()
