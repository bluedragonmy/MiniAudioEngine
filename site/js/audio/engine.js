// ============================================================
// Sound Basics · engine.js
// Shared audio setup for every chapter. Creates the AudioContext on
// the first user gesture and hands out sine voices that run on our
// own AudioWorklet oscillator (a port of cpp/src/Oscillator.cpp).
// If the worklet can't load (e.g. the page was opened as file://),
// it falls back to the browser's OscillatorNode with the same API.
// ============================================================

const Engine = (() => {
  // Overall output ceiling so no demo can be painfully loud.
  const MASTER_LEVEL = 0.3;
  const SMOOTH = 0.015; // seconds; time constant for parameter changes

  let ctx = null;
  let master = null;
  let workletReady = false;
  let starting = null;

  function moduleUrl(file) {
    // Resolve relative to this script, so it works from any page depth.
    const self = document.querySelector('script[src*="audio/engine.js"]');
    return new URL(file, self.src).href;
  }

  async function start() {
    if (ctx) {
      if (ctx.state === 'suspended') await ctx.resume();
      return ctx;
    }
    if (starting) return starting;
    starting = (async () => {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = MASTER_LEVEL;
      master.connect(ctx.destination);
      try {
        await ctx.audioWorklet.addModule(moduleUrl('oscillator-processor.js'));
        await ctx.audioWorklet.addModule(moduleUrl('sample-rate-reducer-processor.js'));
        workletReady = true;
      } catch (err) {
        console.warn('[engine] AudioWorklet unavailable, using OscillatorNode fallback:', err);
      }
      return ctx;
    })();
    return starting;
  }

  // A sine voice: { frequency: AudioParam, amplitude: AudioParam, stop() }
  // Pass `dest` (e.g. a reducer's input) to route it somewhere other than the output.
  function createSine(freq = 440, dest = master) {
    if (workletReady) {
      const node = new AudioWorkletNode(ctx, 'sine-oscillator', { outputChannelCount: [2] });
      node.parameters.get('frequency').value = freq;
      node.connect(dest);
      return {
        frequency: node.parameters.get('frequency'),
        amplitude: node.parameters.get('amplitude'),
        stop() { node.disconnect(); },
      };
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.value = 0;
    osc.connect(gain).connect(dest);
    osc.start();
    return {
      frequency: osc.frequency,
      amplitude: gain.gain,
      stop() { osc.stop(); gain.disconnect(); },
    };
  }

  // Sample-rate reducer (needs the worklet; there is no built-in fallback).
  // Returns { input: AudioNode, targetRate: AudioParam, stop() } or null.
  function createSampleRateReducer(targetRate = 8000) {
    if (!workletReady) return null;
    const node = new AudioWorkletNode(ctx, 'sample-rate-reducer', { outputChannelCount: [2] });
    node.parameters.get('targetRate').value = targetRate;
    node.connect(master);
    return {
      input: node,
      targetRate: node.parameters.get('targetRate'),
      stop() { node.disconnect(); },
    };
  }

  // Glide a parameter to a new value without clicks.
  function glide(param, value) {
    param.setTargetAtTime(value, ctx.currentTime, SMOOTH);
  }

  // Fire-and-forget tone with a short fade in/out.
  function playTone(freq, { at = 0, duration = 0.6, level = 0.8 } = {}) {
    const voice = createSine(freq);
    const t0 = ctx.currentTime + 0.02 + at;
    const amp = voice.amplitude;
    amp.setValueAtTime(0, t0);
    amp.linearRampToValueAtTime(level, t0 + 0.02);
    amp.setValueAtTime(level, t0 + duration - 0.05);
    amp.linearRampToValueAtTime(0, t0 + duration);
    setTimeout(() => voice.stop(), (at + duration + 0.2) * 1000);
  }

  return {
    start, createSine, createSampleRateReducer, glide, playTone,
    get ctx() { return ctx; },
    get usingOwnDsp() { return workletReady; },
  };
})();
