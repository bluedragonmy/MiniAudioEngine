// Mirror of cpp/tests/test_dsp.cpp: same cases, same expected values.
// Run: node site/js/dsp/dsp.test.mjs

import { LowPassFilter, Biquad, BiquadType } from './filters.js';
import { AdditiveOscillator, Shape } from './oscillators.js';
import { Noise } from './noise.js';
import { KickVoice, SnareVoice, HatVoice, decayCoefficient } from './drums.js';
import { ADSR } from './adsr.js';
import { LoudnessMeter } from './loudness.js';

const SR = 48000;
let failures = 0;

function check(name, ok, got) {
  if (!ok) failures++;
  console.log(`${name.padEnd(48)} ${Number(got).toFixed(5).padStart(12)}  ${ok ? 'OK' : 'WRONG'}`);
}
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const db = x => 20 * Math.log10(x);

function measuredGain(filter, freq) {
  let peak = 0;
  for (let i = 0; i < SR; i++) {
    const y = filter(Math.sin(2 * Math.PI * freq * i / SR));
    if (i > SR - SR / 10 && Math.abs(y) > peak) peak = Math.abs(y);
  }
  return peak;
}

// ── LowPassFilter (1-pole) ─────────────────────────────────────────────────
{
  const lp = new LowPassFilter(1000, SR);
  const predicted = lp.magnitudeAt(1000);
  const measured = measuredGain(x => lp.process(x), 1000);
  check('1-pole: gain at cutoff ~ -3 dB', near(db(predicted), -3.0, 0.5), db(predicted));
  check('1-pole: measured matches magnitudeAt', near(measured, predicted, 0.002), measured);
  const lp2 = new LowPassFilter(100, SR);
  const slope = db(lp2.magnitudeAt(1000) / lp2.magnitudeAt(2000));
  check('1-pole: ~6 dB per octave above cutoff', near(slope, 6.0, 0.5), slope);
}

// ── Biquad ─────────────────────────────────────────────────────────────────
{
  const lp = new Biquad(SR);
  lp.set(BiquadType.LowPass, 1000, 0.7071);
  check('biquad LP: -3 dB at cutoff (Q=0.707)', near(db(lp.magnitudeAt(1000)), -3.01, 0.05), db(lp.magnitudeAt(1000)));
  const lp200 = new Biquad(SR);
  lp200.set(BiquadType.LowPass, 200, 0.7071);
  const slope = db(lp200.magnitudeAt(2000) / lp200.magnitudeAt(4000));
  check('biquad LP: ~12 dB per octave', near(slope, 12.0, 0.5), slope);
  const measured = measuredGain(x => lp.process(x), 2000);
  check('biquad LP: measured matches magnitudeAt', near(measured, lp.magnitudeAt(2000), 0.002), measured);

  const hp = new Biquad(SR);
  hp.set(BiquadType.HighPass, 100, 0.7071);
  check('biquad HP: passes 5 kHz', near(hp.magnitudeAt(5000), 1.0, 0.01), hp.magnitudeAt(5000));
  check('biquad HP: cuts 25 Hz by > 20 dB', db(hp.magnitudeAt(25)) < -20, db(hp.magnitudeAt(25)));

  const pk = new Biquad(SR);
  pk.set(BiquadType.Peaking, 60, 1.0, -6.0);
  check('biquad peak: -6 dB at center', near(db(pk.magnitudeAt(60)), -6.0, 0.01), db(pk.magnitudeAt(60)));
  check('biquad peak: 0 dB far away (2 kHz)', near(db(pk.magnitudeAt(2000)), 0.0, 0.05), db(pk.magnitudeAt(2000)));
}

// ── AdditiveOscillator ─────────────────────────────────────────────────────
{
  // Same idea as the C++ test (value at a quarter cycle), but we jump the
  // phase straight to π/2 instead of running 100,000 samples to get there.
  const valueAtQuarter = shape => {
    const o = new AdditiveOscillator(1, 4 * 100000);
    o.setShape(shape);
    o.setMaxHarmonics(2001);
    o.phase = Math.PI / 2;
    return o.process();
  };
  const saw = valueAtQuarter(Shape.Saw);
  const sq = valueAtQuarter(Shape.Square);
  const tri = valueAtQuarter(Shape.Triangle);
  check('additive saw at 1/4 cycle = 0.5', near(saw, 0.5, 0.01), saw);
  check('additive square at 1/4 cycle = 1', near(sq, 1.0, 0.01), sq);
  check('additive triangle at 1/4 cycle = 1', near(tri, 1.0, 0.01), tri);

  check('band-limit: 5 kHz @ 48k keeps 4 harmonics', new AdditiveOscillator(5000, SR).activeHarmonics() === 4, new AdditiveOscillator(5000, SR).activeHarmonics());
  check('band-limit: 6 kHz excludes harmonic at Nyquist', new AdditiveOscillator(6000, SR).activeHarmonics() === 3, new AdditiveOscillator(6000, SR).activeHarmonics());
  const o3 = new AdditiveOscillator(100, SR);
  o3.setMaxHarmonics(16);
  check('maxHarmonics caps the count', o3.activeHarmonics() === 16, o3.activeHarmonics());
}

// ── Noise ──────────────────────────────────────────────────────────────────
{
  const n = new Noise(1);
  const first = n.process(), second = n.process();
  check('noise seed 1: 1st value', near(first, -0.99987410, 1e-8), first);
  check('noise seed 1: 2nd value', near(second, -0.96850514, 1e-8), second);
  const m = new Noise(12345);
  let sum = 0, sumSq = 0;
  for (let i = 0; i < 100000; i++) { const v = m.process(); sum += v; sumSq += v * v; }
  check('noise: mean ~ 0', near(sum / 100000, 0, 0.01), sum / 100000);
  check('noise: variance ~ 1/3 (uniform)', near(sumSq / 100000, 1 / 3, 0.01), sumSq / 100000);
}

// ── Drums ──────────────────────────────────────────────────────────────────
{
  const kick = new KickVoice(SR);
  kick.setParams(160, 45, 0.12, 0.5);
  kick.trigger();
  const crossings = (from, to) => {
    let c = 0, prev = 0;
    for (let i = from; i < to; i++) {
      const v = kick.process();
      if (i > from && ((prev < 0) !== (v < 0))) c++;
      prev = v;
    }
    return c;
  };
  const early = crossings(0, 2400);
  crossings(2400, 12000);
  const late = crossings(12000, 14400);
  check('kick: pitch drops (early crossings > late)', early > late, early - late);
  let n = 0;
  while (kick.isActive() && n < SR * 2) { kick.process(); n++; }
  check('kick: falls silent after ~decay time', !kick.isActive() && n < SR * 0.7, (n + 14400) / SR);

  const a = new SnareVoice(SR, 7), b = new SnareVoice(SR, 7);
  a.trigger(); b.trigger();
  let same = true, peak = 0;
  for (let i = 0; i < 4800; i++) {
    const va = a.process(), vb = b.process();
    if (va !== vb) same = false;
    if (Math.abs(va) > peak) peak = Math.abs(va);
  }
  check('snare: same seed -> identical output', same, same ? 1 : 0);
  check('snare: peak within [-1, 1]', peak <= 1, peak);

  const hat = new HatVoice(SR);
  hat.setParams(0.5, 7000);
  hat.trigger();
  for (let i = 0; i < 480; i++) hat.process();
  hat.choke();
  let m = 0;
  while (hat.isActive() && m < SR) { hat.process(); m++; }
  check('hat: choke silences within 20 ms', m < SR * 0.02, m / SR);

  const c1 = decayCoefficient(0.5, SR);
  check('decayCoefficient reaches -60 dB at t', near(Math.pow(c1, 0.5 * SR), 0.001, 1e-9), Math.pow(c1, 0.5 * SR));
}

// ── ADSR ───────────────────────────────────────────────────────────────────
{
  const env = new ADSR();
  env.setSampleRate(SR);
  env.setParameters(0.01, 0.1, 0.5, 0.2);
  env.noteOn();
  let v = 0;
  for (let i = 0; i < 480; i++) v = env.process();
  check('adsr: peak 1.0 after attack', near(v, 1, 1e-6), v);
  for (let i = 0; i < 4800 + 10; i++) v = env.process();
  check('adsr: holds sustain 0.5', near(v, 0.5, 1e-6), v);
  env.noteOff();
  let r = 0;
  while (env.isActive() && r < SR) { env.process(); r++; }
  check('adsr: release ends after ~200 ms', near(r / SR, 0.2, 0.002), r / SR);

  const instant = new ADSR();
  instant.setSampleRate(SR);
  instant.setParameters(0, 0, 0.3, 0.1);
  instant.noteOn();
  for (let i = 0; i < 10; i++) v = instant.process();
  check('adsr: decay 0 jumps to sustain', near(v, 0.3, 1e-9), v);
}

// ── LoudnessMeter ──────────────────────────────────────────────────────────
{
  const sineLufs = (amp, sr) => {
    const m = new LoudnessMeter(sr);
    for (let i = 0; i < sr * 5; i++) m.process(amp * Math.sin(2 * Math.PI * 997 * i / sr));
    return m.integrated();
  };
  const l0 = sineLufs(1, 48000), l20 = sineLufs(0.1, 48000), l441 = sineLufs(1, 44100);
  check('lufs: 997 Hz 0 dBFS sine = -3.01 (48k)', near(l0, -3.01, 0.05), l0);
  check('lufs: -20 dBFS sine = -23.01', near(l20, -23.01, 0.05), l20);
  check('lufs: same at 44.1 kHz', near(l441, -3.01, 0.05), l441);

  const m = new LoudnessMeter(48000);
  for (let i = 0; i < 48000 * 5; i++) m.process(Math.sin(2 * Math.PI * 997 * i / 48000));
  for (let i = 0; i < 48000 * 5; i++) m.process(0.001 * Math.sin(2 * Math.PI * 997 * i / 48000));
  const gated = m.integrated();
  check('lufs: relative gate ignores quiet part', near(gated, -3.01, 0.2), gated);
  check('lufs: momentary follows the quiet part', near(m.momentary(), -63.01, 0.1), m.momentary());

  const st = new LoudnessMeter(48000);
  for (let i = 0; i < 48000 * 5; i++) {
    const s = Math.sin(2 * Math.PI * 997 * i / 48000);
    st.processStereo(s, s);
  }
  check('lufs: same sine in L and R = 0.00', near(st.integrated(), 0.0, 0.05), st.integrated());
}

console.log(failures === 0 ? 'ALL PASSED' : 'FAILED');
process.exitCode = failures === 0 ? 0 : 1;
