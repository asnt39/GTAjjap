# Harborline City Score

Six original instrumental cues created for Harborline, arranged around slow pads, sparse keys, low bass, and brushed percussion. The cue sources, MIDI pitches, rhythms, instrument synthesis and stereo mix are in `scripts/compose-city-score.py`. The game ships MP3 encodes at 24 kHz, 64 kbps stereo. The score and synthesized game effects are available under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

| Track | Used for |
| --- | --- |
| Market Lights | Streets, shops and general exploration |
| Last Ferry | Waterfront and quiet streets |
| After Hours | Night exploration and Harbor FM |
| Causeway | Driving and Harbor FM |
| Blue Beacons | Police pursuit and combat |
| Crosswind | Story and pursuit |

## Firearm sound effects

`pistol.wav`, `shotgun.wav`, and `sniper.wav` use single reports trimmed from `X_39P.wav`, `O_21P.wav`, and `W_29P.wav` in the Prepared SFX Library. Each edit mixes to mono, applies a high-pass filter and edge fades, and converts to 24 kHz PCM for spatial playback. [The Free Firearm Sound Library by Ben Jaszczak, Brian Nelson, Kevin Heras, and Matthew Nanney](https://opengameart.org/content/the-free-firearm-sound-library) · [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)

Other game sounds synthesized in Web Audio include footsteps, jumps, door latches, equipment actions, hit and blast responses, vehicle details, ambient sounds, a siren, and interface feedback. Spoken dialogue uses the locally installed Korean speech voice if enabled. [Engine and tire recording credits](../driving-audio/CREDITS.md)
