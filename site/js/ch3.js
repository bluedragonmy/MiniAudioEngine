// ============================================================
// Sound Basics · ch3.js — Chapter 3: Timbre & harmonics
// Demo 1: pick a shape and a number of harmonics.
// Demo 2: a saw through a 1-pole or biquad low-pass.
// Pictures are rendered with the same DSP classes the worklet runs.
// ============================================================

import { $, cssVar, fmtHz, setupCanvas, drawWaveform, logSlider, setToggleLabel, showAudioUnavailable, onRedraw } from './ui.js';
import { AdditiveOscillator, harmonicAmplitude } from './dsp/oscillators.js';
import { LowPassFilter, Biquad, BiquadType } from './dsp/filters.js';

const FUND = 110;          // A2
const SR = 48000;          // for the pictures
const DEMO2_HARMONICS = 100;
const F_LO = 55, F_HI = 20000, DB_FLOOR = -48;

const cutoffMap = logSlider(80, 16000);
const qMap = logSlider(0.5, 12);

// ── Shared synth ────────────────────────────────────────────────────────────
let synth = null;
let playing = null; // 1 | 2 | null

async function ensureSynth() {
  await Engine.start();
  if (!synth) synth = Engine.createSynth({ freq: FUND, attack: 0.01, decay: 0.05, sustain: 1, release: 0.06, level: 0.45 });
  if (!synth) showAudioUnavailable();
  return !!synth;
}

function stopAll() {
  if (synth) synth.noteOff();
  if (playing) setToggleLabel($(`play${playing}`), false);
  playing = null;
}

async function toggle(demo) {
  if (playing === demo) { stopAll(); return; }
  if (!(await ensureSynth())) return;
  stopAll();
  playing = demo;
  setToggleLabel($(`play${demo}`), true);
  pushParams();
  synth.noteOn();
}

function pushParams() {
  if (!synth || !playing) return;
  if (playing === 1) {
    synth.set({ shape: d1.shape, harmonics: d1.harmonics, filter: 'none' });
  } else {
    synth.set({ shape: 'saw', harmonics: DEMO2_HARMONICS, filter: d2.filter, cutoff: d2.cutoff, q: d2.q });
  }
}

// ── Drawing ─────────────────────────────────────────────────────────────────
const xOfFreq = (f, w, pad) => pad + (Math.log(f / F_LO) / Math.log(F_HI / F_LO)) * (w - pad - 8);

// bars: [{ f, db }]; curve: f => dB (filter response), optional
function drawSpectrum(canvas, bars, curve) {
  const { g, w, h } = setupCanvas(canvas);
  const pad = 34, top = 8, bottom = h - 20;
  const yOfDb = d => top + (Math.min(0, Math.max(DB_FLOOR, d)) / DB_FLOOR) * (bottom - top);

  g.strokeStyle = cssVar('--grid');
  g.lineWidth = 1;
  g.fillStyle = cssVar('--muted');
  g.beginPath();
  for (const d of [0, -12, -24, -36, -48]) {
    const y = Math.round(yOfDb(d)) + 0.5;
    g.moveTo(pad, y); g.lineTo(w - 8, y);
    g.fillText(`${d}`, 2, y + 4);
  }
  for (const f of [100, 1000, 10000]) {
    const x = Math.round(xOfFreq(f, w, pad)) + 0.5;
    g.moveTo(x, top); g.lineTo(x, bottom);
  }
  g.stroke();
  for (const [f, label] of [[100, '100'], [1000, '1k'], [10000, '10k']]) {
    g.fillText(label, xOfFreq(f, w, pad) - 8, h - 5);
  }
  g.fillText('dB', 2, h - 5);

  if (curve) {
    g.strokeStyle = cssVar('--muted');
    g.lineWidth = 1.5;
    g.setLineDash([4, 4]);
    g.beginPath();
    for (let i = 0; i <= 300; i++) {
      const f = F_LO * Math.pow(F_HI / F_LO, i / 300);
      const x = xOfFreq(f, w, pad);
      const d = curve(f);
      // the resonant peak can rise above 0 dB: let it show, but keep it on-canvas
      const y = Math.max(2, d > 0 ? top - (d / -DB_FLOOR) * (bottom - top) : yOfDb(d));
      i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
    g.setLineDash([]);
  }

  g.strokeStyle = cssVar('--accent');
  g.fillStyle = cssVar('--accent');
  g.lineWidth = 2;
  for (const { f, db } of bars) {
    if (f > F_HI || db <= DB_FLOOR) continue;
    const x = xOfFreq(f, w, pad);
    const y = yOfDb(db);
    g.beginPath(); g.moveTo(x, bottom); g.lineTo(x, y); g.stroke();
    g.beginPath(); g.arc(x, y, 2.5, 0, 2 * Math.PI); g.fill();
  }
}

// Two cycles of a waveform, after letting any filter settle.
function renderCycles(shape, harmonics, filterFn = x => x) {
  const osc = new AdditiveOscillator(FUND, SR);
  osc.setShape(shape);
  osc.setMaxHarmonics(harmonics);
  for (let i = 0; i < 4800; i++) filterFn(osc.process());
  // Settle ends at an arbitrary phase; render until the phase wraps to 0.
  let prevPhase = osc.phase;
  for (let i = 0; i < SR / FUND + 2; i++) {
    filterFn(osc.process());
    if (osc.phase < prevPhase) break;
    prevPhase = osc.phase;
  }
  const n = Math.round(2 * SR / FUND);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = filterFn(osc.process());
  return out;
}

// ── Demo 1 ──────────────────────────────────────────────────────────────────
const d1 = { shape: 'saw', harmonics: 8 };

function harmonicBars(shape, count, gainAt = () => 1) {
  const ref = Math.abs(harmonicAmplitude(shape, 1));
  const bars = [];
  for (let k = 1; k <= count; k++) {
    const a = Math.abs(harmonicAmplitude(shape, k));
    if (a === 0) continue;
    bars.push({ f: k * FUND, db: 20 * Math.log10((a / ref) * gainAt(k * FUND)) });
  }
  return bars;
}

function updateDemo1() {
  $('harm1-out').textContent = d1.harmonics;
  document.querySelectorAll('#shapes1 [data-shape]').forEach(b =>
    b.setAttribute('aria-pressed', String(b.dataset.shape === d1.shape)));
  drawWaveform($('wave1'), renderCycles(d1.shape, d1.harmonics), { scale: 0.8, label: t({ en: '2 cycles of A2 (110 Hz)', zh: 'A2（110 Hz）的 2 個週期' }) });
  drawSpectrum($('spec1'), harmonicBars(d1.shape, d1.harmonics));
  if (playing === 1) pushParams();
}

document.querySelectorAll('#shapes1 [data-shape]').forEach(b =>
  b.addEventListener('click', () => { d1.shape = b.dataset.shape; updateDemo1(); }));
$('harm1').addEventListener('input', e => { d1.harmonics = +e.target.value; updateDemo1(); });
$('play1').addEventListener('click', () => toggle(1));

// ── Demo 2 ──────────────────────────────────────────────────────────────────
const d2 = { filter: 'biquad', cutoff: 1200, q: 0.707 };

function makeFilter() {
  if (d2.filter === 'onepole') {
    const f = new LowPassFilter(d2.cutoff, SR);
    return { process: x => f.process(x), gain: fr => f.magnitudeAt(fr) };
  }
  if (d2.filter === 'biquad') {
    const f = new Biquad(SR);
    f.set(BiquadType.LowPass, d2.cutoff, d2.q);
    return { process: x => f.process(x), gain: fr => f.magnitudeAt(fr) };
  }
  return { process: x => x, gain: () => 1 };
}

function updateDemo2() {
  $('cutoff2-out').textContent = fmtHz(d2.cutoff);
  $('q2-out').textContent = d2.q.toFixed(2);
  $('q2').disabled = d2.filter !== 'biquad';
  $('cutoff2').disabled = d2.filter === 'none';
  document.querySelectorAll('#filters2 [data-filter]').forEach(b =>
    b.setAttribute('aria-pressed', String(b.dataset.filter === d2.filter)));

  const filt = makeFilter();
  drawWaveform($('wave2'), renderCycles('saw', DEMO2_HARMONICS, filt.process), { scale: 0.8, label: t({ en: 'saw, 2 cycles', zh: '鋸齒波，2 個週期' }) });
  const curveFilter = makeFilter(); // fresh object: magnitudeAt doesn't depend on state
  drawSpectrum($('spec2'), harmonicBars('saw', DEMO2_HARMONICS, curveFilter.gain),
    d2.filter === 'none' ? null : f => 20 * Math.log10(curveFilter.gain(f)));
  if (playing === 2) pushParams();
}

document.querySelectorAll('#filters2 [data-filter]').forEach(b =>
  b.addEventListener('click', () => { d2.filter = b.dataset.filter; updateDemo2(); }));
$('cutoff2').addEventListener('input', e => { d2.cutoff = cutoffMap.toValue(+e.target.value); updateDemo2(); });
$('q2').addEventListener('input', e => { d2.q = qMap.toValue(+e.target.value); updateDemo2(); });
$('play2').addEventListener('click', () => toggle(2));

// ── Init ────────────────────────────────────────────────────────────────────
$('harm1').value = d1.harmonics;
$('cutoff2').value = cutoffMap.toSlider(d2.cutoff);
$('q2').value = qMap.toSlider(d2.q);
updateDemo1();
updateDemo2();
onRedraw(() => { updateDemo1(); updateDemo2(); });
