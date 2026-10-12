// ============================================================
// Sound Basics · dsp/loudness.js
// Port of cpp/src/LoudnessMeter.cpp: ITU-R BS.1770 / EBU R128
// loudness (LUFS), mono or stereo. K-weighting → mean square → LUFS.
// ============================================================

import { Biquad } from './filters.js';

export function toLufs(meanSquare) {
  if (meanSquare <= 0) return -Infinity;
  return -0.691 + 10 * Math.log10(meanSquare);
}

export class LoudnessMeter {
  constructor(sampleRate) {
    this.sampleRate = sampleRate;
    this.shelf = new Biquad(sampleRate);
    this.highPass = new Biquad(sampleRate);
    this.samplesPerBlock = Math.round(sampleRate * 0.1);
    this.blockCount = 0;
    this.blockSum = 0;
    this.blocks = [];
    this.gatingBlocks = [];

    // Stage 1: high shelf, about +4 dB
    {
      const f0 = 1681.974450955533;
      const G = 3.999843853973347;
      const Q = 0.7071752369554196;
      const K = Math.tan(Math.PI * f0 / sampleRate);
      const Vh = Math.pow(10, G / 20);
      const Vb = Math.pow(Vh, 0.4996667741545416);
      const a0 = 1 + K / Q + K * K;
      this.shelf.setCoefficients(
        (Vh + Vb * K / Q + K * K) / a0,
        2 * (K * K - Vh) / a0,
        (Vh - Vb * K / Q + K * K) / a0,
        2 * (K * K - 1) / a0,
        (1 - K / Q + K * K) / a0);
    }
    // Stage 2: high-pass (RLB weighting)
    {
      const f0 = 38.13547087602444;
      const Q = 0.5003270373238773;
      const K = Math.tan(Math.PI * f0 / sampleRate);
      const a0 = 1 + K / Q + K * K;
      this.highPass.setCoefficients(1, -2, 1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0);
    }
    // The same two filters again for the right channel.
    const copy = f => { const c = new Biquad(sampleRate); c.setCoefficients(f.b0, f.b1, f.b2, f.a1, f.a2); return c; };
    this.shelfR = copy(this.shelf);
    this.highPassR = copy(this.highPass);
  }

  reset() {
    this.shelf.reset();
    this.highPass.reset();
    this.shelfR.reset();
    this.highPassR.reset();
    this.blockCount = 0;
    this.blockSum = 0;
    this.blocks = [];
    this.gatingBlocks = [];
  }

  process(input) {
    const y = this.highPass.process(this.shelf.process(input));
    this.addEnergy(y * y);
  }

  // BS.1770: left and right both weigh 1.0, so their energies just add.
  processStereo(left, right) {
    const yl = this.highPass.process(this.shelf.process(left));
    const yr = this.highPassR.process(this.shelfR.process(right));
    this.addEnergy(yl * yl + yr * yr);
  }

  addEnergy(energy) {
    this.blockSum += energy;
    if (++this.blockCount < this.samplesPerBlock) return;

    this.blocks.push(this.blockSum / this.samplesPerBlock);
    this.blockCount = 0;
    this.blockSum = 0;

    if (this.blocks.length >= 4) this.gatingBlocks.push(this.meanOfLast(4));
  }

  meanOfLast(n) {
    const count = this.blocks.length;
    if (count === 0) return 0;
    if (n > count) n = count;
    let sum = 0;
    for (let i = count - n; i < count; i++) sum += this.blocks[i];
    return sum / n;
  }

  momentary() { return toLufs(this.meanOfLast(4)); }
  shortTerm() { return toLufs(this.meanOfLast(30)); }

  integrated() {
    let sum = 0, n = 0;
    for (const b of this.gatingBlocks) {
      if (toLufs(b) > -70) { sum += b; n++; }
    }
    if (n === 0) return -Infinity;

    const relativeGate = toLufs(sum / n) - 10;
    let sum2 = 0, n2 = 0;
    for (const b of this.gatingBlocks) {
      const l = toLufs(b);
      if (l > -70 && l > relativeGate) { sum2 += b; n2++; }
    }
    return n2 === 0 ? -Infinity : toLufs(sum2 / n2);
  }
}
