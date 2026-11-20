"""Composes an original music bed for one Short. Deterministic per seed.

  ambient (default): a slow minor-key pad, a low drone and sparse bell notes.
  warm: an uplifting major-key piece at 84 BPM: felt-piano arpeggios over
        I-V-vi-IV, a simple melody, soft bass, a warm pad and a light shaker.

    python music.py --seconds 54.1 --seed 1 --out music.wav [--style warm]
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


# ---------- warm: uplifting major-key bed ----------

BPM = 84
BEAT = 60 / BPM
# I - V - vi - IV in G major, two bars each.
WARM_CHORDS = [
    [55, 59, 62, 67],  # G
    [54, 57, 62, 66],  # D / F-sharp
    [52, 55, 59, 64],  # E minor
    [52, 55, 60, 64],  # C / E
]
BARS_PER_CHORD = 2


def piano(freq, dur, vel=1.0):
    """Felt-piano-like tone: harmonics that decay faster the higher they are."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    tone = np.zeros(n)
    for k, a in ((1, 1.0), (2, 0.45), (3, 0.22), (4, 0.1), (5, 0.05)):
        f = freq * k * (1 + 0.0004 * k * k)  # slight stretch, like real strings
        tone += a * np.sin(2 * np.pi * f * t) * np.exp(-t * (1.1 + 1.6 * k))
    tone *= np.minimum(1, t / 0.004) * vel
    return tone


def place(mix, mono, at, pan):
    end = min(len(mix), at + len(mono))
    if at >= end:
        return
    seg = mono[: end - at]
    mix[at:end, 0] += seg * (1 - pan)
    mix[at:end, 1] += seg * pan


def compose_warm(seconds, seed):
    rng = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    mix = np.zeros((n, 2))
    bar = 4 * BEAT
    chord_len = BARS_PER_CHORD * bar
    eighth = BEAT / 2
    arp = [0, 1, 2, 3, 2, 1, 2, 3]  # chord-tone order per bar, in eighths
    # A small melody: one phrase per chord (beat offsets, chord-tone index, beats long).
    phrases = [
        [(0, 3, 1.5), (1.5, 2, 0.5), (2, 1, 2), (4, 2, 1), (5, 3, 3)],
        [(0, 2, 2), (2, 3, 1), (3, 2, 1), (4, 1, 4)],
        [(0, 3, 1), (1, 2, 1), (2, 3, 2), (4, 2, 1.5), (5.5, 1, 2.5)],
        [(0, 1, 1.5), (1.5, 2, 0.5), (2, 3, 2), (4, 3, 4)],
    ]
    count = int(np.ceil(seconds / chord_len)) + 1
    for c in range(count):
        chord = WARM_CHORDS[c % len(WARM_CHORDS)]
        c0 = c * chord_len
        # Arpeggio, an octave up, with gentle velocity variation.
        for b in range(BARS_PER_CHORD):
            for i, idx in enumerate(arp):
                at = c0 + b * bar + i * eighth
                if at >= seconds:
                    break
                vel = (0.9 if i % 4 == 0 else 0.6) * rng.uniform(0.85, 1.0)
                place(mix, piano(hz(chord[idx] + 12), 2.2, vel) * 0.16, int(at * SR), 0.35 + 0.3 * (idx / 3))
        # Bass on beats 1 and 3 (from bar 3 on).
        if c0 >= 2 * bar:
            for b in range(BARS_PER_CHORD * 2):
                at = c0 + b * 2 * BEAT
                f = hz(chord[0] - 24) if chord[0] > 52 else hz(chord[0] - 12)
                d = int(1.6 * SR)
                tb = np.arange(d) / SR
                tone = (np.sin(2 * np.pi * f * tb) + 0.25 * np.sin(4 * np.pi * f * tb)) * np.exp(-tb * 1.8) * np.minimum(1, tb / 0.01)
                place(mix, tone * 0.17, int(at * SR), 0.5)
        # Melody (from the second time round the progression).
        if c >= len(WARM_CHORDS):
            for off, idx, beats in phrases[c % len(phrases)]:
                at = c0 + off * BEAT
                place(mix, piano(hz(chord[idx] + 24), beats * BEAT + 1.2, 0.9) * 0.2, int(at * SR), 0.55)
        # Pad underneath, soft.
        live = (t >= c0 - 0.5) & (t < c0 + chord_len + 0.5)
        if live.any():
            tl = t[live]
            env = np.clip((tl - (c0 - 0.5)) / 0.8, 0, 1) * np.clip((c0 + chord_len + 0.5 - tl) / 0.8, 0, 1)
            seg = sum(pad_note(hz(note), len(tl), tl, rng) for note in chord[:3])
            mix[live] += seg * env[:, None] * 0.05
    # Light shaker on the off-beats after the intro.
    hit = int(0.06 * SR)
    th = np.arange(hit) / SR
    for k in range(int(seconds / eighth)):
        at = k * eighth
        if at < 4 * bar or k % 2 == 0:
            continue
        noise = rng.standard_normal(hit)
        noise = np.diff(noise, prepend=0)  # tilt towards highs
        place(mix, noise * np.exp(-th * 60) * 0.025, int(at * SR), 0.65)

    mix = reverb(mix, rng, seconds=2.4, wet=0.22)
    fade_in = np.minimum(1, t / 1.0)
    fade_out = np.minimum(1, (seconds - t) / 3.0)
    mix *= (fade_in * fade_out)[:, None]
    return mix / (np.max(np.abs(mix)) + 1e-9) * 0.89


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--seconds", type=float, required=True)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--out", required=True)
    parser.add_argument("--style", choices=["ambient", "warm"], default="ambient")
    args = parser.parse_args()
    music = compose_warm if args.style == "warm" else compose
    pcm = (music(args.seconds, args.seed) * 32767).astype("<i2")
    with wave.open(args.out, "wb") as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(pcm.tobytes())


if __name__ == "__main__":
    main()
