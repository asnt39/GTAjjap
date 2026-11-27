"""Render the six original Harborline score cues as lightweight stereo MP3s."""
from pathlib import Path
import subprocess
import numpy as np

RATE = 24000
TRACKS = {
    "market-lights": (74, 50, [0, -3, -5, -7], [0, 3, 7, 10], 0.36),
    "last-ferry": (64, 48, [0, -5, -2, -3], [0, 3, 7, 14], 0.12),
    "after-hours": (70, 53, [0, -5, -7, -2], [0, 3, 7, 9], 0.24),
    "causeway": (87, 45, [0, 3, -2, -5], [0, 3, 7, 10], 0.53),
    "blue-beacons": (101, 43, [0, 0, -2, -5], [0, 3, 7, 13], 0.78),
    "crosswind": (77, 46, [0, -2, -4, 3], [0, 3, 7, 14], 0.40),
}
OUT = Path(__file__).resolve().parent.parent / "public/assets/city-audio"


def render(name, bpm, key, roots, notes, drive):
    rng = np.random.default_rng(key)
    beat = 60 / bpm
    length = 64 * beat
    data = np.zeros((int(RATE * length), 2), dtype=np.float32)

    def add(values, at, volume, pan=0):
        start = int(at * RATE)
        available = min(len(values), len(data) - start)
        if available <= 0:
            return
        data[start:start + available] += values[:available, None] * (
            np.sqrt(np.array([(1 - pan) / 2, (1 + pan) / 2])) * volume
        )

    def voice(note, at, duration, color, volume, pan=0):
        t = np.arange(int(RATE * duration)) / RATE
        hz = 440 * 2 ** ((note - 69) / 12)
        phase = 2 * np.pi * hz * t
        if color == "pad":
            wave = np.sin(phase + .26 * np.sin(3.16 * t))
            wave += .27 * np.sin(phase * 1.003 + .21 * np.sin(phase * 2))
            wave += .08 * np.sin(phase * 2 + 1.8)
            env = (1 - np.exp(-t * 1.15)) * np.minimum(1, (duration - t) * .78)
            env *= 0.87 + .13 * np.sin(t * 2.18 + note)
        elif color == "bass":
            wave = np.sin(phase) + .17 * np.sin(2 * phase + 0.6)
            env = np.minimum(1, t * 31) * np.minimum(1, (duration - t) * 10) * np.exp(-t * .83)
        else:
            wave = np.sin(phase + .41 * np.exp(-t * 4) * np.sin(phase * 2.01))
            wave += .17 * np.exp(-t * 3.8) * np.sin(phase * 3.01)
            env = np.minimum(1, t * 92) * np.exp(-t * 1.85) * np.minimum(1, (duration - t) * 7)
        values = wave * env
        add(values, at, volume, pan)
        if color == "keys":
            add(values, at + beat * .75, volume * .21, -pan)
            add(values, at + beat * 1.51, volume * .11, pan * .71)

    for bar in range(16):
        chord = roots[(bar // 2) % len(roots)]
        at = bar * 4 * beat
        if bar % 2 == 0:
            for j, note in enumerate(notes):
                voice(key + chord + note + 12, at, 10.1 * beat, "pad", .12 - .013 * j, (-1) ** j * .48)
        for offset in [0, 1.75, 2.60] if drive > .5 else ([0, 2.65] if bar % 4 == 3 else [0]):
            voice(key + chord - 12, at + offset * beat, beat * 1.65, "bass", .19 + drive * .06)
        phrase = ((.72, 1), (2.64, 2)) if bar % 4 == 0 else ((1.54, 3),) if bar % 4 == 2 else ()
        if drive > .5 and bar % 2:
            phrase = ((.55, 2), (2.74, 1))
        for offset, index in phrase:
            note = notes[index] + key + chord + (24 if index == 3 else 12)
            voice(note, at + offset * beat, beat * 3.4, "keys", .095 - index * .009, (-1) ** (bar // 2 + index) * .45)
        if bar < 2 or drive < .2:
            continue
        for offset in [0, 2.60] if drive > .5 else [0]:
            t = np.arange(RATE // 3) / RATE
            drum = np.sin(2 * np.pi * (46*t + 1.5*(1-np.exp(-t*30)))) * np.exp(-t * 18)
            add(drum, at + offset * beat, .16 * drive)
        for i, offset in enumerate([.55, 1.55, 2.55, 3.55] if drive > .5 else [1.55, 3.58]):
            t = np.arange(RATE // 10) / RATE
            brush = np.convolve(rng.normal(size=len(t) + 5), np.ones(6) / 6, "valid")
            add(brush * np.exp(-t * 41) * np.minimum(1, t * 340), at + offset * beat,
                .044 * drive, (-1) ** i * .31)
    fade = np.minimum(1, np.arange(len(data)) / (RATE * .52))
    fade *= np.minimum(1, np.arange(len(data))[::-1] / (RATE * 1.48))
    data = np.tanh(data * 1.4) * fade[:, None]
    pcm = np.asarray(data / max(.001, np.max(np.abs(data))) * 24500, dtype="<i2")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "s16le", "-ac", "2", "-ar", str(RATE), "-i", "-",
                    "-c:a", "libmp3lame", "-b:a", "64k", str(OUT / (name + ".mp3"))], input=pcm.tobytes(), check=True)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for cue, score in TRACKS.items():
        render(cue, *score)
