// ============================================================
// Sound Basics · dsp/aliasing.js
// Line-for-line port of cpp/src/SampleRateReducer.cpp.
// Shared by the AudioWorklet (audio) and the chapter page (readouts),
// and tested by aliasing.test.mjs.
// ============================================================

// The frequency you actually hear after sampling at fs:
// anything above Nyquist (fs/2) folds back down.
export function aliasFrequency(f, fs) {
  f = Math.abs(f);
  const r = f % fs;
  if (r <= fs / 2) return r;
  return fs - r;
}

// Simulates a lower sample rate with sample-and-hold. No anti-aliasing
// filter on purpose — the aliasing is what we want to hear.
export class SampleRateReducer {
  constructor(hostRate) {
    this.hostRate = hostRate;
    this.targetRate = hostRate;
    this.acc = hostRate; // counted in units of hostRate: exact for integer rates
    this.held = 0;
  }

  setTargetRate(fs) {
    this.targetRate = Math.max(1, Math.min(fs, this.hostRate));
  }

  process(input) {
    // Check first: when the accumulator is full, take a new sample
    if (this.acc >= this.hostRate) {
      this.held = input;
      this.acc -= this.hostRate;
    }
    // then accumulate
    this.acc += this.targetRate;
    return this.held;
  }
}
