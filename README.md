# MiniAudioEngine

A from-scratch audio DSP project, and **Sound Basics**: an interactive, bilingual (English / 繁體中文) guide that teaches music-production beginners what their DAW is actually doing.

Each chapter explains one idea, lets you hear and see it in the browser, and then tells you where to try it in your own DAW.

## Sound Basics (`site/`)

| # | Chapter | Status |
|---|---|---|
| 01 | What is sound? (frequency, amplitude, dB) | ✅ |
| 02 | Digital sound (sample rate, aliasing) | ✅ |
| 03 | Timbre & harmonics (waveforms, filters) | ✅ |
| 04 | The shape of a sound (ADSR) | ✅ |
| 05 | Drums & rhythm | ✅ |
| 06 | Mixing basics (levels, pan, EQ, masking) | ✅ |
| 07 | Loudness (LUFS, normalization) | ✅ |

The audio is our own DSP rather than the browser's built-in nodes. DSP is written in C++ first (`cpp/`, with tests in `cpp/tests/`), then ported line for line to AudioWorklets in `site/js/`. The JS ports run the same test cases as the C++ originals:

```sh
sh cpp/tests/run_tests.sh                 # C++
node site/js/dsp/aliasing.test.mjs        # JS ports
node site/js/dsp/dsp.test.mjs
```

| DSP module (`cpp/src/`) | JS port (`site/js/`) | Used in |
|---|---|---|
| `Oscillator` | `audio/oscillator-processor.js` | ch1 |
| `SampleRateReducer` | `dsp/aliasing.js` | ch2 |
| `AdditiveOscillator` | `dsp/oscillators.js` | ch3–7 |
| `LowPassFilter`, `Biquad` | `dsp/filters.js` | ch3, ch5–7 |
| `ADSR` | `dsp/adsr.js` | ch4–7 |
| `Noise`, `DrumSynth` | `dsp/noise.js`, `dsp/drums.js` | ch5–7 |
| `LoudnessMeter` (ITU-R BS.1770 / EBU R128) | `dsp/loudness.js` | ch7 |

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
