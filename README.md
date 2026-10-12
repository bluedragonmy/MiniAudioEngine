# MiniAudioEngine

A from-scratch audio DSP project, and **Sound Basics**: an interactive, bilingual (English / 繁體中文) guide that teaches music-production beginners what their DAW is actually doing.

Each chapter explains one idea, lets you hear and see it in the browser, and then tells you where to try it in your own DAW.

## Sound Basics (`site/`)

| # | Chapter | Status |
|---|---|---|
| 01 | What is sound? (frequency, amplitude, dB) | ✅ |
| 02 | Digital sound (sample rate, aliasing) | planned |
| 03 | Timbre & harmonics (waveforms, filters) | planned |
| 04 | The shape of a sound (ADSR) | planned |
| 05 | Drums & rhythm | planned |
| 06 | Mixing basics (levels, pan, EQ, masking) | planned |
| 07 | Loudness (LUFS, normalization) | planned |

The audio is our own DSP rather than the browser's built-in nodes: chapter 1's tone runs in an AudioWorklet that ports [`cpp/src/Oscillator.cpp`](cpp/src/Oscillator.cpp) sample by sample.

### Run locally

AudioWorklets need to be served over HTTP (opening the file directly falls back to the browser's built-in oscillator):

```sh
python -m http.server 8000 --directory site
```

Then open <http://localhost:8000>.

## Repository layout

```
site/     Sound Basics, the interactive guide (plain HTML/CSS/JS, no build step)
cpp/      C++ DSP engine: oscillator, low-pass filter, ADSR, drum voice/sampler, WAV I/O
python/   DSP experiments (sampling & aliasing, filters) and Streamlit prototypes
web/      DrumForge MK2, a browser drum machine (to become chapter 5)
research/ Notes on what beginners struggle with in DAWs
```
