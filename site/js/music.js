// ============================================================
// Sound Basics · music.js
// Renders drum hits, beats and bass lines with the ported DSP.
// Used by chapters 5–7. Everything is computed sample by sample
// into Float32Arrays, then played with Engine.playRendered().
// ============================================================

import { KickVoice, SnareVoice, HatVoice } from './dsp/drums.js';
import { AdditiveOscillator } from './dsp/oscillators.js';
import { Biquad, BiquadType } from './dsp/filters.js';
import { ADSR } from './dsp/adsr.js';

export const DEFAULT_KIT = {
  kick:  { start: 160, end: 45, pitchDecay: 0.12, decay: 0.5 },
  snare: { tone: 185, mix: 0.6, decay: 0.2 },
  hat:   { cutoff: 7000, closed: 0.06, open: 0.5 },
};

export const ROWS = ['kick', 'snare', 'chat', 'ohat'];
export const ROW_GAIN = { kick: 0.9, snare: 0.6, chat: 0.3, ohat: 0.3 };

function makeVoices(kit, sr) {
  const kick = new KickVoice(sr);
  kick.setParams(kit.kick.start, kit.kick.end, kit.kick.pitchDecay, kit.kick.decay);
  const snare = new SnareVoice(sr, 7);
  snare.setParams(kit.snare.tone, kit.snare.decay, kit.snare.mix);
  const chat = new HatVoice(sr, 11);
  chat.setParams(kit.hat.closed, kit.hat.cutoff);
  const ohat = new HatVoice(sr, 13);
  ohat.setParams(kit.hat.open, kit.hat.cutoff);
  return { kick, snare, chat, ohat };
}

// A single hit, `seconds` long.
export function renderHit(kind, kit, sr, seconds = 1) {
  const v = makeVoices(kit, sr)[kind];
  v.trigger(1);
  const out = new Float32Array(Math.round(seconds * sr));
  for (let i = 0; i < out.length; i++) out[i] = v.process() * ROW_GAIN[kind];
  return out;
}

// Seconds from bar start for each of the 16 steps, with swing applied
// to every second 16th note.
export function stepTimes(bpm, swing = 0) {
  const step = 60 / bpm / 4;
  return Array.from({ length: 16 }, (_, i) => i * step + (i % 2 === 1 ? (swing / 100) * step * 0.5 : 0));
}

// One bar of `pattern` ({ kick: [16 bools], ... }), looped seamlessly:
// tails that run past the bar end are wrapped back onto the start.
// Returns { stems: { kick, snare, hats }, length, sr, times }.
export function renderBeat({ pattern, bpm, swing = 0, kit = DEFAULT_KIT, sr, bars = 1 }) {
  const times = stepTimes(bpm, swing);
  const barLen = Math.round((60 / bpm) * 4 * sr);
  const length = barLen * bars;
  const tail = Math.round(1.5 * sr);
  const v = makeVoices(kit, sr);

  // Trigger sample index -> list of rows
  const triggers = new Map();
  for (let b = 0; b < bars; b++) {
    for (const row of ROWS) {
      (pattern[row] || []).forEach((on, i) => {
        if (!on) return;
        const at = b * barLen + Math.round(times[i] * sr);
        if (!triggers.has(at)) triggers.set(at, []);
        triggers.get(at).push(row);
      });
    }
  }

  const stems = { kick: new Float32Array(length), snare: new Float32Array(length), hats: new Float32Array(length) };
  const target = { kick: stems.kick, snare: stems.snare, chat: stems.hats, ohat: stems.hats };

  for (let i = 0; i < length + tail; i++) {
    const hits = triggers.get(i);
    if (hits) {
      for (const row of hits) {
        if (row === 'chat') v.ohat.choke();   // closed hat chokes the open hat
        v[row].trigger(1);
      }
    }
    const j = i % length;
    for (const row of ROWS) {
      const s = v[row].process();
      if (s !== 0) target[row][j] += s * ROW_GAIN[row];
    }
  }
  return { stems, length, sr, times };
}

// A simple bass line: saw through a low-pass, with an ADSR per note.
// notes: [{ step, len, freq }] on the 16-step grid, one bar.
export function renderBass({ notes, bpm, sr, bars = 1, cutoff = 600, swing = 0 }) {
  const times = stepTimes(bpm, swing);
  const stepLen = 60 / bpm / 4;
  const barLen = Math.round((60 / bpm) * 4 * sr);
  const length = barLen * bars;
  const out = new Float32Array(length);
  const osc = new AdditiveOscillator(55, sr);
  osc.setShape('saw');
  osc.setMaxHarmonics(40);
  const lp = new Biquad(sr);
  lp.set(BiquadType.LowPass, cutoff, 0.8);
  const env = new ADSR();
  env.setSampleRate(sr);
  env.setParameters(0.004, 0.15, 0.7, 0.05);

  const events = [];
  for (let b = 0; b < bars; b++) {
    for (const n of notes) {
      const on = b * barLen + Math.round(times[n.step] * sr);
      events.push({ at: on, type: 'on', freq: n.freq });
      events.push({ at: on + Math.round(n.len * stepLen * sr), type: 'off' });
    }
  }
  events.sort((a, b) => a.at - b.at);
  let e = 0;
  for (let i = 0; i < length; i++) {
    while (e < events.length && events[e].at <= i) {
      const ev = events[e++];
      if (ev.type === 'on') { osc.setFrequency(ev.freq); env.noteOn(); } else env.noteOff();
    }
    out[i] = lp.process(osc.process()) * env.process() * 0.5;
  }
  return out;
}

// Sum mono tracks with gain (linear) and constant-power pan (−1…1).
// Returns [left, right]. Pan law matches cpp/src/DrumVoice.cpp.
export function mixStereo(tracks) {
  const n = tracks[0].data.length;
  const L = new Float32Array(n), R = new Float32Array(n);
  for (const { data, gain = 1, pan = 0 } of tracks) {
    const p = (Math.max(-1, Math.min(1, pan)) + 1) / 2;
    const gl = Math.cos(p * Math.PI / 2) * gain, gr = Math.sin(p * Math.PI / 2) * gain;
    for (let i = 0; i < n; i++) { L[i] += data[i] * gl; R[i] += data[i] * gr; }
  }
  return [L, R];
}

export const dbToGain = db => Math.pow(10, db / 20);

export function peakOf(...channels) {
  let p = 0;
  for (const ch of channels) for (let i = 0; i < ch.length; i++) { const a = Math.abs(ch[i]); if (a > p) p = a; }
  return p;
}
