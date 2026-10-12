// ============================================================
// Sound Basics · dsp/drums.js
// Port of cpp/src/DrumSynth.cpp: kick, snare and hi-hat voices.
// Decay times are seconds to fall to −60 dB.
// ============================================================

import { Biquad, BiquadType } from './filters.js';
import { Noise } from './noise.js';

const TWO_PI = 2 * Math.PI;
const SILENT = 1e-4;

export function decayCoefficient(seconds, sampleRate) {
  if (seconds <= 0) return 0;
  return Math.pow(0.001, 1 / (seconds * sampleRate));
}

export class KickVoice {
  constructor(sampleRate) {
    this.sampleRate = sampleRate;
    this.pitchEnv = 0; this.ampEnv = 0; this.phase = 0; this.velocity = 1;
    this.setParams(160, 45, 0.12, 0.5);
  }

  setParams(startFreq, endFreq, pitchDecay, ampDecay) {
    this.startFreq = startFreq;
    this.endFreq = endFreq;
    this.pitchCoef = decayCoefficient(pitchDecay, this.sampleRate);
    this.ampCoef = decayCoefficient(ampDecay, this.sampleRate);
  }

  trigger(velocity = 1) {
    this.velocity = velocity;
    this.pitchEnv = 1;
    this.ampEnv = 1;
    this.phase = 0;
  }

  isActive() { return this.ampEnv > SILENT; }

  process() {
    if (!this.isActive()) return 0;
    const freq = this.endFreq + (this.startFreq - this.endFreq) * this.pitchEnv;
    const out = Math.sin(this.phase) * this.ampEnv * this.velocity;
    this.phase += TWO_PI * freq / this.sampleRate;
    if (this.phase >= TWO_PI) this.phase -= TWO_PI;
    this.pitchEnv *= this.pitchCoef;
    this.ampEnv *= this.ampCoef;
    return out;
  }
}

export class SnareVoice {
  constructor(sampleRate, seed = 1) {
    this.sampleRate = sampleRate;
    this.toneEnv = 0; this.noiseEnv = 0; this.phase = 0; this.velocity = 1;
    this.noise = new Noise(seed);
    this.highPass = new Biquad(sampleRate);
    this.highPass.set(BiquadType.HighPass, 1200, 0.707);
    this.setParams(185, 0.2, 0.6);
  }

  setParams(toneFreq, decay, noiseMix) {
    this.toneFreq = toneFreq;
    this.noiseMix = noiseMix;
    this.toneCoef = decayCoefficient(decay * 0.5, this.sampleRate);
    this.noiseCoef = decayCoefficient(decay, this.sampleRate);
  }

  trigger(velocity = 1) {
    this.velocity = velocity;
    this.toneEnv = 1;
    this.noiseEnv = 1;
    this.phase = 0;
  }

  isActive() { return this.toneEnv > SILENT || this.noiseEnv > SILENT; }

  process() {
    if (!this.isActive()) return 0;
    const tone = Math.sin(this.phase) * this.toneEnv;
    const rattle = this.highPass.process(this.noise.process()) * this.noiseEnv;
    this.phase += TWO_PI * this.toneFreq / this.sampleRate;
    if (this.phase >= TWO_PI) this.phase -= TWO_PI;
    this.toneEnv *= this.toneCoef;
    this.noiseEnv *= this.noiseCoef;
    return ((1 - this.noiseMix) * tone + this.noiseMix * rattle) * this.velocity;
  }
}

export class HatVoice {
  constructor(sampleRate, seed = 2) {
    this.sampleRate = sampleRate;
    this.chokeCoef = decayCoefficient(0.01, sampleRate);
    this.ampEnv = 0; this.choking = false; this.velocity = 1;
    this.noise = new Noise(seed);
    this.highPass = new Biquad(sampleRate);
    this.setParams(0.06, 7000);
  }

  setParams(decay, cutoff) {
    this.ampCoef = decayCoefficient(decay, this.sampleRate);
    this.highPass.set(BiquadType.HighPass, cutoff, 0.707);
  }

  trigger(velocity = 1) {
    this.velocity = velocity;
    this.ampEnv = 1;
    this.choking = false;
  }

  choke() { this.choking = true; }

  isActive() { return this.ampEnv > SILENT; }

  process() {
    if (!this.isActive()) return 0;
    const out = this.highPass.process(this.noise.process()) * this.ampEnv * this.velocity;
    this.ampEnv *= this.choking ? this.chokeCoef : this.ampCoef;
    return out;
  }
}
