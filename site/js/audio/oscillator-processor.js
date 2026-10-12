// ============================================================
// Sound Basics · oscillator-processor.js (AudioWorklet)
// A JavaScript port of cpp/src/Oscillator.cpp: a phase-accumulator
// sine oscillator computed one sample at a time, instead of the
// browser's built-in OscillatorNode.
// ============================================================

const TWO_PI = 2 * Math.PI;

class SineOscillatorProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      // Smoothed by the main thread with setTargetAtTime, so slider
      // moves don't click.
      { name: 'frequency', defaultValue: 440, minValue: 1, maxValue: 20000, automationRate: 'a-rate' },
      { name: 'amplitude', defaultValue: 0,   minValue: 0, maxValue: 1,     automationRate: 'a-rate' },
    ];
  }

  constructor() {
    super();
    this.phase = 0;
  }

  process(inputs, outputs, parameters) {
    const out = outputs[0];
    const freq = parameters.frequency;
    const amp = parameters.amplitude;
    const ch0 = out[0];

    for (let n = 0; n < ch0.length; n++) {
      const f = freq.length > 1 ? freq[n] : freq[0];
      const a = amp.length > 1 ? amp[n] : amp[0];

      // Same as Oscillator::process(): output sin(phase), then advance
      // phase by 2π·f/sampleRate and wrap it into [0, 2π).
      ch0[n] = a * Math.sin(this.phase);
      this.phase += TWO_PI * f / sampleRate;
      if (this.phase >= TWO_PI) this.phase -= TWO_PI;
    }

    for (let c = 1; c < out.length; c++) out[c].set(ch0);
    return true;
  }
}

registerProcessor('sine-oscillator', SineOscillatorProcessor);
