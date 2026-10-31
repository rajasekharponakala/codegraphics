"""Composes an original ambient bed for one Short: a slow minor-key pad, a low
drone and sparse bell notes, with a synthetic reverb. Deterministic per seed.

    python music.py --seconds 54.1 --seed 1 --out music.wav
"""

import argparse
import wave

import numpy as np

SR = 48000
# i - VI - iv - V in D minor, voiced around the middle of the piano.
CHORDS = [
    [50, 53, 57, 62],  # D minor
    [46, 50, 53, 58],  # B-flat major
    [43, 50, 55, 58],  # G minor
    [45, 49, 52, 57],  # A major
]
CHORD_SECONDS = 8.0
FADE = 2.5  # crossfade between chords


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def pad_note(freq, n, t, rng):
    """Soft saw-like tone: a few detuned voices, harmonics falling off fast."""
    out = np.zeros((n, 2))
    for detune, pan in ((-0.004, 0.25), (0.0, 0.5), (0.0045, 0.75)):
        f = freq * (1 + detune)
        phase = rng.uniform(0, 2 * np.pi)
        voice = sum(np.sin(2 * np.pi * f * k * t + phase * k) / k**1.8 for k in range(1, 7))
        out[:, 0] += voice * (1 - pan)
        out[:, 1] += voice * pan
    tremolo = 1 + 0.08 * np.sin(2 * np.pi * rng.uniform(0.07, 0.15) * t + rng.uniform(0, 6))
    return out * tremolo[:, None]


def bell(freq, n, start, rng):
    """A struck tone with inharmonic partials and a long exponential decay."""
    t = np.arange(n - start) / SR
    tone = sum(a * np.sin(2 * np.pi * freq * r * t) for r, a in ((1, 1.0), (2.76, 0.35), (5.4, 0.12)))
    tone *= np.exp(-t / 1.6) * np.minimum(1, t / 0.005)
    out = np.zeros((n, 2))
    pan = rng.uniform(0.3, 0.7)
    out[start:, 0] = tone * (1 - pan)
    out[start:, 1] = tone * pan
    return out


def reverb(x, rng, seconds=3.2, wet=0.35):
    """Convolve with decaying stereo noise: a cheap, smooth hall."""
    m = int(seconds * SR)
    t = np.arange(m) / SR
    ir = rng.standard_normal((m, 2)) * np.exp(-t / (seconds / 6.9))[:, None]
    ir[: int(0.02 * SR)] = 0  # pre-delay
    size = 1 << int(np.ceil(np.log2(len(x) + m)))
    out = np.empty_like(x)
    for c in range(2):
        out[:, c] = np.fft.irfft(np.fft.rfft(x[:, c], size) * np.fft.rfft(ir[:, c], size), size)[: len(x)]
    out /= np.max(np.abs(out)) + 1e-9
    dry = x / (np.max(np.abs(x)) + 1e-9)
    return dry * (1 - wet) + out * wet


def compose(seconds, seed):
    rng = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    mix = np.zeros((n, 2))

    step = CHORD_SECONDS
    count = int(np.ceil(seconds / step)) + 1
    for i in range(count):
        chord = CHORDS[(i + seed) % len(CHORDS)]
        start = i * step - FADE
        # Raised-cosine window so neighbouring chords crossfade smoothly.
        env = np.clip((t - start) / FADE, 0, 1) * np.clip((start + step + 2 * FADE - t) / FADE, 0, 1)
        env = 0.5 - 0.5 * np.cos(np.pi * env)
        live = env > 0
        if not live.any():
            continue
        tl = t[live]
        seg = np.zeros((live.sum(), 2))
        for note in chord:
            seg += pad_note(hz(note), len(tl), tl, rng) * 0.22
        root = hz(chord[0] - 12)
        drone = np.sin(2 * np.pi * root * tl) + 0.3 * np.sin(2 * np.pi * 2 * root * tl)
        seg += drone[:, None] * 0.28
        mix[live] += seg * env[live, None]

        # One or two bell notes per chord, drawn from the chord an octave up.
        for _ in range(rng.integers(1, 3)):
            at = int((i * step + rng.uniform(0.5, step - 1)) * SR)
            if 0 <= at < n - SR:
                mix += bell(hz(rng.choice(chord) + 12), n, at, rng) * 0.18

    mix = reverb(mix, rng)
    fade_in = np.minimum(1, t / 2.0)
    fade_out = np.minimum(1, (seconds - t) / 3.0)
    mix *= (fade_in * fade_out)[:, None]
    return mix / (np.max(np.abs(mix)) + 1e-9) * 0.89  # about -1 dBFS


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--seconds", type=float, required=True)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    pcm = (compose(args.seconds, args.seed) * 32767).astype("<i2")
    with wave.open(args.out, "wb") as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(pcm.tobytes())


if __name__ == "__main__":
    main()
