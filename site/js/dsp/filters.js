// ============================================================
// Sound Basics · dsp/filters.js
// Ports of cpp/src/LowPassFilter.cpp and cpp/src/Biquad.cpp.
// ============================================================

const TWO_PI = 2 * Math.PI;

// One-pole RC low-pass: y[n] = alpha·x[n] + (1 − alpha)·y[n−1], −6 dB/octave
export class LowPassFilter {
  constructor(cutoffHz, sampleRate) {
    this.sampleRate = sampleRate;
    this.alpha = 1;
    this.previousOutput = 0;
    this.setCutoff(cutoffHz);
  }

  setCutoff(cutoffHz) {
    const dt = 1 / this.sampleRate;
    const rc = 1 / (TWO_PI * cutoffHz);
    this.alpha = dt / (rc + dt);
  }

  process(input) {
    const output = this.alpha * input + (1 - this.alpha) * this.previousOutput;
    this.previousOutput = output;
    return output;
  }

  reset() { this.previousOutput = 0; }

  magnitudeAt(freq) {
    const w = TWO_PI * freq / this.sampleRate;
    const b = 1 - this.alpha;
    const re = 1 - b * Math.cos(w);
    const im = b * Math.sin(w);
    return this.alpha / Math.sqrt(re * re + im * im);
  }
}

// RBJ "Audio EQ Cookbook" biquad.
export const BiquadType = Object.freeze({
  LowPass: 'lowpass', HighPass: 'highpass', Peaking: 'peaking',
  LowShelf: 'lowshelf', HighShelf: 'highshelf',
});

export class Biquad {
  constructor(sampleRate) {
    this.sampleRate = sampleRate;
    this.b0 = 1; this.b1 = 0; this.b2 = 0; this.a1 = 0; this.a2 = 0;
    this.x1 = 0; this.x2 = 0; this.y1 = 0; this.y2 = 0;
  }

  set(type, freq, q, gainDb = 0) {
    const w0 = TWO_PI * freq / this.sampleRate;
    const cw = Math.cos(w0);
    const sw = Math.sin(w0);
    const alpha = sw / (2 * q);
    const A = Math.pow(10, gainDb / 40);

    let nb0 = 1, nb1 = 0, nb2 = 0, na0 = 1, na1 = 0, na2 = 0;

    switch (type) {
      case BiquadType.LowPass:
        nb0 = (1 - cw) / 2;  nb1 = 1 - cw;    nb2 = (1 - cw) / 2;
        na0 = 1 + alpha;     na1 = -2 * cw;   na2 = 1 - alpha;
        break;
      case BiquadType.HighPass:
        nb0 = (1 + cw) / 2;  nb1 = -(1 + cw); nb2 = (1 + cw) / 2;
        na0 = 1 + alpha;     na1 = -2 * cw;   na2 = 1 - alpha;
        break;
      case BiquadType.Peaking:
        nb0 = 1 + alpha * A; nb1 = -2 * cw;   nb2 = 1 - alpha * A;
        na0 = 1 + alpha / A; na1 = -2 * cw;   na2 = 1 - alpha / A;
        break;
      case BiquadType.LowShelf: {
        const s = 2 * Math.sqrt(A) * alpha;
        nb0 = A * ((A + 1) - (A - 1) * cw + s);
        nb1 = 2 * A * ((A - 1) - (A + 1) * cw);
        nb2 = A * ((A + 1) - (A - 1) * cw - s);
        na0 = (A + 1) + (A - 1) * cw + s;
        na1 = -2 * ((A - 1) + (A + 1) * cw);
        na2 = (A + 1) + (A - 1) * cw - s;
        break;
      }
      case BiquadType.HighShelf: {
        const s = 2 * Math.sqrt(A) * alpha;
        nb0 = A * ((A + 1) + (A - 1) * cw + s);
        nb1 = -2 * A * ((A - 1) + (A + 1) * cw);
        nb2 = A * ((A + 1) + (A - 1) * cw - s);
        na0 = (A + 1) - (A - 1) * cw + s;
        na1 = 2 * ((A - 1) - (A + 1) * cw);
        na2 = (A + 1) - (A - 1) * cw - s;
        break;
      }
    }

    this.setCoefficients(nb0 / na0, nb1 / na0, nb2 / na0, na1 / na0, na2 / na0);
  }

  setCoefficients(b0, b1, b2, a1, a2) {
    this.b0 = b0; this.b1 = b1; this.b2 = b2; this.a1 = a1; this.a2 = a2;
  }

  process(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x;
    this.y2 = this.y1; this.y1 = y;
    return y;
  }

  reset() { this.x1 = this.x2 = this.y1 = this.y2 = 0; }

  magnitudeAt(freq) {
    const w = TWO_PI * freq / this.sampleRate;
    const c1 = Math.cos(w), s1 = Math.sin(w);
    const c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
    const nr = this.b0 + this.b1 * c1 + this.b2 * c2, ni = -(this.b1 * s1 + this.b2 * s2);
    const dr = 1 + this.a1 * c1 + this.a2 * c2, di = -(this.a1 * s1 + this.a2 * s2);
    return Math.sqrt((nr * nr + ni * ni) / (dr * dr + di * di));
  }
}
