"""Render the six original Harborline score cues as lightweight stereo MP3s."""
from pathlib import Path
import subprocess
import numpy as np

RATE = 24000
TRACKS = {
    "market-lights": (78, 50, [0, -3, -5, -7], [0, 3, 7, 10], 0.45),
    "last-ferry": (66, 48, [0, -5, 2, -3], [0, 4, 7, 11], 0.15),
    "after-hours": (71, 53, [0, -4, -7, -2], [0, 3, 7, 9], 0.25),
    "causeway": (96, 45, [0, 3, -2, -5], [0, 3, 7, 10], 0.62),
    "blue-beacons": (109, 43, [0, 0, -2, -5], [0, 3, 7, 13], 0.77),
    "crosswind": (83, 46, [0, -2, -4, 3], [0, 3, 7, 14], 0.40),
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
            wave += .12 * np.sin(phase * 2 + 1.8)
            env = (1 - np.exp(-t * 1.15)) * np.minimum(1, (duration - t) * .78)
            env *= 0.87 + .13 * np.sin(t * 2.18 + note)
        elif color == "bass":
            wave = np.sin(phase) + .28 * np.sin(2 * phase + 0.6)
            env = np.minimum(1, t * 33) * np.minimum(1, (duration - t) * 15) * np.exp(-t * 1.32)
        else:
            wave = np.sin(phase + .69 * np.exp(-t * 4) * np.sin(phase * 2.01))
            wave += .28 * np.exp(-t * 4.0) * np.sin(phase * 3.01)
            env = np.minimum(1, t * 125) * np.exp(-t * 2.35) * np.minimum(1, (duration - t) * 9)
        values = wave * env
        add(values, at, volume, pan)
        if color == "keys":
            add(values, at + beat * .75, volume * .24, -pan)
            add(values, at + beat * 1.51, volume * .13, pan * .71)

    for bar in range(16):
        chord = roots[(bar // 2) % len(roots)]
        at = bar * 4 * beat
        if bar % 2 == 0:
            for j, note in enumerate(notes):
                voice(key + chord + note + 12 + 12 * (j == 3), at, 9.55 * beat, "pad", .10 + .016 * j, (-1) ** j * .42)
        for i, offset in enumerate([0, 1.75, 2.5] if drive > .5 else [0, 2.5]):
            voice(key + chord - 12 + (12 if i == 2 and bar % 4 == 3 else 0), at + offset * beat, beat * .98, "bass", .23)
        for j, offset in enumerate([.44, 1.5, 2.75, 3.48] if bar % 3 != 1 else [.77, 2.31]):
            note = notes[(j + bar + (bar % 3)) % 4] + key + chord + 24
            voice(note, at + offset * beat, beat * 2.8, "keys", (.11 - .014 * (j % 3)) * (.5 if bar < 2 else 1), (-1) ** (j + bar) * .42)
        if bar < 2:
            continue
        for offset in [0, 2.49] if drive > .5 else [0, 3.02]:
            t = np.arange(RATE // 4) / RATE
            drum = np.sin(2 * np.pi * (43*t + 2.7*(1-np.exp(-t*26)))) * np.exp(-t * 19)
            add(drum, at + offset * beat, .21 * drive)
        for i in range(8):
            t = np.arange(RATE // 17) / RATE
            metal = np.diff(rng.normal(size=len(t) + 1))
            add(metal * np.exp(-t * (65 + (i % 3) * 13)), at + (i * .5 + (.065 if i % 2 else 0)) * beat,
                .028 * drive * (1 if i % 2 else .52), (-1) ** i * .34)
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
