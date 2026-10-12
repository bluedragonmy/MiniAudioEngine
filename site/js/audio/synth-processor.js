// ============================================================
// Sound Basics · synth-processor.js (AudioWorklet)
// A one-voice subtractive synth built from the ported DSP:
//   AdditiveOscillator → (1-pole | biquad) low-pass → ADSR → out
// Controlled with port messages:
//   { type: 'params', ...fields }  { type: 'noteOn' }  { type: 'noteOff' }
// Posts { level } back ~30×/s so the page can animate the envelope.
// ============================================================

import { AdditiveOscillator } from '../dsp/oscillators.js';
import { LowPassFilter, Biquad, BiquadType } from '../dsp/filters.js';
import { ADSR } from '../dsp/adsr.js';

class SynthProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.osc = new AdditiveOscillator(110, sampleRate);
    this.onePole = new LowPassFilter(20000, sampleRate);
    this.biquad = new Biquad(sampleRate);
    this.env = new ADSR();
    this.env.setSampleRate(sampleRate);

    this.p = {
      shape: 'saw', freq: 110, harmonics: 64,
      filter: 'none', cutoff: 20000, q: 0.707,
      attack: 0.01, decay: 0.1, sustain: 1, release: 0.1,
      level: 0.5,
    };
    this.apply();

    this.reportEvery = Math.round(sampleRate / 30 / 128);
    this.blocks = 0;
    this.port.onmessage = e => this.onMessage(e.data);
  }

  onMessage(msg) {
    if (msg.type === 'params') {
      const { type, ...fields } = msg;
      Object.assign(this.p, fields);
      this.apply();
    } else if (msg.type === 'noteOn') {
      this.env.noteOn();
    } else if (msg.type === 'noteOff') {
      this.env.noteOff();
    }
  }

  apply() {
    const p = this.p;
    this.osc.setShape(p.shape);
    this.osc.setFrequency(p.freq);
    this.osc.setMaxHarmonics(p.harmonics);
    const cutoff = Math.min(p.cutoff, sampleRate * 0.45);
    this.onePole.setCutoff(cutoff);
    this.biquad.set(BiquadType.LowPass, cutoff, p.q);
    this.env.setParameters(p.attack, p.decay, p.sustain, p.release);
  }

  process(inputs, outputs) {
    const out = outputs[0];
    const ch0 = out[0];
    const p = this.p;
    let level = 0;

    for (let n = 0; n < ch0.length; n++) {
      let x = this.osc.process();
      if (p.filter === 'onepole') x = this.onePole.process(x);
      else if (p.filter === 'biquad') x = this.biquad.process(x);
      level = this.env.process();
      ch0[n] = x * level * p.level;
    }
    for (let c = 1; c < out.length; c++) out[c].set(ch0);

    if (++this.blocks >= this.reportEvery) {
      this.blocks = 0;
      this.port.postMessage({ level, state: this.env.currentState });
    }
    return true;
  }
}

registerProcessor('synth', SynthProcessor);
