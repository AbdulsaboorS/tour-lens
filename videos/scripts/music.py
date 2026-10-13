"""An original, quiet music bed for the tour film: soft pads, a plucked arpeggio, a light pulse.

    uv run --with numpy python3 scripts/music.py <seconds> <out.wav>

96 BPM, 4/4, so the film's beat grid (cues.ts) lines up with it from frame 0.
"""
import sys
import wave

import numpy as np

seconds = float(sys.argv[1])
out = sys.argv[2]
rate = 48000
bpm = 96
beat = 60 / bpm
bar = beat * 4
n = int(seconds * rate)
t = np.arange(n) / rate
left = np.zeros(n)
right = np.zeros(n)


def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)


# Fmaj7, Am7, Dm9, Cmaj7: warm and unresolved, nothing that fights a voice.
chords = [[53, 57, 60, 64], [57, 60, 64, 67], [50, 57, 60, 64], [48, 55, 59, 64]]


def place(signal, start, pan=0.0):
    i = int(start * rate)
    if i >= n:
        return
    end = min(n, i + len(signal))
    piece = signal[: end - i]
    left[i:end] += piece * (1 - pan) / 2 * 2 ** 0.5
    right[i:end] += piece * (1 + pan) / 2 * 2 ** 0.5


bars = int(np.ceil(seconds / bar))
for index in range(bars):
    start = index * bar
    chord = chords[index % len(chords)]
    length = int(bar * rate * 1.15)
    local = np.arange(length) / rate
    envelope = np.minimum(1, local / 0.6) * np.exp(-local / 3.2)
    for k, note in enumerate(chord):
        f = hz(note)
        tone = np.sin(2 * np.pi * f * local) + 0.25 * np.sin(2 * np.pi * 2 * f * local + 0.3)
        place(0.05 * envelope * tone, start, pan=(k - 1.5) * 0.3)

    # Plucked arpeggio on eighths, from bar 2.
    if index >= 1:
        for step in range(8):
            note = chord[[0, 1, 2, 3, 2, 1, 2, 3][step]] + 12
            length = int(0.5 * rate)
            local = np.arange(length) / rate
            pluck = np.sin(2 * np.pi * hz(note) * local) * np.exp(-local / 0.16)
            place(0.035 * pluck, start + step * beat / 2, pan=0.4 if step % 2 else -0.4)

    # A soft pulse on beats 1 and 3, from bar 3.
    if index >= 2:
        for hit in (0, 2):
            length = int(0.3 * rate)
            local = np.arange(length) / rate
            sweep = 2 * np.pi * (48 * local + 60 * (1 - np.exp(-local / 0.04)) * 0.04)
            kick = np.sin(sweep) * np.exp(-local / 0.12)
            place(0.12 * kick, start + hit * beat)

fade = int(3 * rate)
ramp = np.ones(n)
ramp[-fade:] = np.linspace(1, 0, fade)
ramp[: int(0.05 * rate)] = np.linspace(0, 1, int(0.05 * rate))
mix = np.stack([left * ramp, right * ramp], axis=1)
mix /= max(1e-9, np.abs(mix).max()) / 0.8

with wave.open(out, "wb") as file:
    file.setnchannels(2)
    file.setsampwidth(2)
    file.setframerate(rate)
    file.writeframes((mix * 32767).astype("<i2").tobytes())
print(out, f"{seconds:.2f}s")
