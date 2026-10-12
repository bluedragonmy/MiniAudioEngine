// ============================================================
// Sound Basics · dsp/oscillators.js
// Port of cpp/src/AdditiveOscillator.cpp: saw / square / triangle
// built from sine harmonics, only those below Nyquist (band-limited).
// ============================================================

export const Shape = Object.freeze({ Sine: 'sine', Saw: 'saw', Square: 'square', Triangle: 'triangle' });

const PI = Math.PI;

export function harmonicAmplitude(shape, k) {
  switch (shape) {
    case Shape.Sine:
      return k === 1 ? 1 : 0;
    case Shape.Saw:
      return (2 / PI) * (k % 2 === 1 ? 1 : -1) / k;
    case Shape.Square:
      return k % 2 === 1 ? (4 / PI) / k : 0;
    case Shape.Triangle:
      if (k % 2 === 0) return 0;
      return (8 / (PI * PI)) * (((k - 1) / 2) % 2 === 0 ? 1 : -1) / (k * k);
  }
  return 0;
}

export class AdditiveOscillator {
  constructor(frequency, sampleRate) {
    this.frequency = frequency;
    this.sampleRate = sampleRate;
    this.phase = 0;
    this.shape = Shape.Saw;
    this.maxHarmonics = 32;
  }

  setFrequency(freq) { this.frequency = freq; }
  setShape(shape) { this.shape = shape; }
  setMaxHarmonics(n) { this.maxHarmonics = n < 1 ? 1 : n; }

  activeHarmonics() {
    const byNyquist = Math.ceil((this.sampleRate / 2) / this.frequency) - 1;
    return byNyquist < this.maxHarmonics ? byNyquist : this.maxHarmonics;
  }

  process() {
    let sample = 0;
    const n = this.activeHarmonics();
    for (let k = 1; k <= n; k++) {
      const a = harmonicAmplitude(this.shape, k);
      if (a !== 0) sample += a * Math.sin(k * this.phase);
    }
    this.phase += 2 * PI * this.frequency / this.sampleRate;
    if (this.phase >= 2 * PI) this.phase -= 2 * PI;
    return sample;
  }
}
