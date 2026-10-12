# MiniAudioEngine

A from-scratch audio DSP project, and **Sound Basics**: an interactive, bilingual (English / 繁體中文) guide that teaches music-production beginners what their DAW is actually doing.

Each chapter explains one idea, lets you hear and see it in the browser, and then tells you where to try it in your own DAW.

**Live site:** _(add the GitHub Pages URL here after the first deploy — see [Deploy](#deploy))_

## Sound Basics (`site/`)

| # | Chapter | What you can do |
|---|---|---|
| 01 | What is sound? | Change frequency and amplitude of a tone; octave buttons; pitch ear test |
| 02 | Digital sound | Sample a wave and watch the alias appear; hear a sweep fold at Nyquist; predict-the-alias quiz |
| 03 | Timbre & harmonics | Build saw / square / triangle from harmonics; filter a saw with 6 or 12 dB/oct and resonance |
| 04 | The shape of a sound | Shape an ADSR and play it; guess-the-envelope quiz |
| 05 | Drums & rhythm | Tune a synthesized kick, snare and hi-hat; 16-step sequencer with swing and choke |
| 06 | Mixing basics | Four-track mixer that clips at 0 dBFS; fix kick/bass masking with EQ or sidechain; phase cancellation |
| 07 | Loudness | Blind A/B (louder wins); same peak, different LUFS; what streaming normalization does to a loud master |

## Our own DSP, tested twice

The audio is not the browser's built-in nodes. Every DSP module is written in C++ first, tested, then ported line for line to JavaScript. The JS ports run **the same test cases** and print **identical output**, which CI checks on every push.

| DSP module (`cpp/src/`) | JS port (`site/js/`) | Used in |
|---|---|---|
| `Oscillator` | `audio/oscillator-processor.js` | ch1 |
| `SampleRateReducer` | `dsp/aliasing.js` | ch2 |
| `AdditiveOscillator` (band-limited) | `dsp/oscillators.js` | ch3–7 |
| `LowPassFilter`, `Biquad` (RBJ cookbook) | `dsp/filters.js` | ch3, ch5–7 |
| `ADSR` | `dsp/adsr.js` | ch4–7 |
| `Noise` (xorshift32), `DrumSynth` | `dsp/noise.js`, `dsp/drums.js` | ch5–7 |
| `LoudnessMeter` (ITU-R BS.1770 / EBU R128) | `dsp/loudness.js` | ch7 |

Some things the tests pin down:

- The loudness meter reads the BS.1770 reference value: a 997 Hz sine at 0 dBFS is −3.01 LUFS (at 48 kHz and 44.1 kHz), and gating ignores quiet passages.
- Filters: −3 dB at cutoff, 6 / 12 dB per octave, and the measured gain of a real sine through the filter matches the analytic frequency response.
- The additive oscillator converges to the known Fourier-series values and never places a harmonic at or above Nyquist.
- `SampleRateReducer` updates exactly 7000 times per second at a non-integer 48000 → 7000 ratio (integer accumulator, no float drift).

```sh
sh cpp/tests/run_tests.sh             # C++ (DSP, aliasing, WAV I/O, sampler engine)
node site/js/dsp/aliasing.test.mjs    # JS ports
node site/js/dsp/dsp.test.mjs
```

Built with GCC 6.3 (MinGW) and checked on GCC in CI. In VS Code: *Run Task → run tests / build main / serve site*.

## Run locally

AudioWorklets need the page served over HTTP:

```sh
python -m http.server 8000 --directory site
```

Then open <http://localhost:8000>. Add `?lang=zh-Hant` to start in Chinese.

## Deploy

`.github/workflows/ci.yml` runs all tests and, on a push to `main`/`master`, publishes `site/` to GitHub Pages.

1. Create an empty repository on GitHub (no README), then:
   ```sh
   git remote add origin https://github.com/<you>/MiniAudioEngine.git
   git push -u origin master
   ```
2. On GitHub: **Settings → Pages → Source: GitHub Actions**.
3. The site appears at `https://<you>.github.io/MiniAudioEngine/` after the workflow finishes. Put that link at the top of this README.

## How this was made

<!-- Draft: edit this section so it says what you did in your own words. -->

I wrote the original C++ engine (oscillator, low-pass filter, ADSR, drum voice / sampler, WAV I/O), the Python sampling and aliasing labs, [DrumForge](https://github.com/bluedragonmy/drumforge), and `SampleRateReducer`.

I used an AI assistant (Claude) for the site shell and chapter pages, the JavaScript ports, the later DSP modules and their tests, and code review of my own modules (it found and fixed bugs in `ADSR`, `WavWriter`, `DrumVoice` and `SamplerEngine`). I'm working through every module in [`docs/study/`](docs/study/README.md) so I can explain each one myself.

## Repository layout

```
site/       Sound Basics, the interactive guide (plain HTML/CSS/JS, no build step)
cpp/        C++ DSP engine and tests (cpp/tests/run_tests.sh)
python/     DSP experiments (sampling & aliasing, filters) and Streamlit prototypes
docs/study/ Study notes for each DSP module, with checkpoint questions (繁體中文)
research/   Notes on what beginners struggle with in DAWs
web/        DrumForge (separate repository, ignored here)
```
