// ============================================================
// Sound Basics · sample-rate-reducer-processor.js (AudioWorklet)
// Runs SampleRateReducer (port of cpp/src/SampleRateReducer.cpp)
// on whatever is connected to its input.
// ============================================================

import { SampleRateReducer } from '../dsp/aliasing.js';

class SampleRateReducerProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      // `sampleRate` here is the worklet global: the browser's real rate.
      { name: 'targetRate', defaultValue: 48000, minValue: 1, maxValue: 192000, automationRate: 'k-rate' },
    ];
  }

  constructor() {
    super();
    this.reducers = []; // one per channel
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    const target = parameters.targetRate[0];

    for (let c = 0; c < output.length; c++) {
      if (!this.reducers[c]) this.reducers[c] = new SampleRateReducer(sampleRate);
      const r = this.reducers[c];
      r.setTargetRate(target);
      const inCh = input[c] || input[0];
      const outCh = output[c];
      for (let n = 0; n < outCh.length; n++) {
        outCh[n] = r.process(inCh ? inCh[n] : 0);
      }
    }
    return true;
  }
}

registerProcessor('sample-rate-reducer', SampleRateReducerProcessor);
