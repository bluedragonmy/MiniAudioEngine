// ============================================================
// Sound Basics · ch6.js — Chapter 6: Mixing basics
// Demo 1: four-track mixer (fader, pan, mute) into a clipping master.
// Demo 2: kick vs bass masking — EQ carve and sidechain ducking.
// Demo 3: layering two kicks — delay and polarity.
// ============================================================

import { $, cssVar, fmtDb, toDb, setupCanvas, setToggleLabel, onRedraw } from './ui.js';
import { DEFAULT_KIT, renderBeat, renderBass, renderHit, mixStereo, dbToGain, peakOf } from './music.js';
import { Biquad, BiquadType } from './dsp/filters.js';

const steps = s => Array.from({ length: 16 }, (_, i) => s.includes(i));
const BPM = 122;
const BEAT = { kick: steps([0, 4, 8, 12]), snare: steps([4, 12]), chat: steps([0, 2, 3, 6, 8, 10, 11, 14]), ohat: steps([]) };
const BASS_NOTES = [
  { step: 0, len: 3.5, freq: 55 }, { step: 4, len: 3.5, freq: 55 },
  { step: 8, len: 3.5, freq: 49 }, { step: 12, len: 3.5, freq: 41.2 },
];

// ── Shared rendering ────────────────────────────────────────────────────────
const cache = {};
function stemsAt(sr) {
  if (!cache[sr]) {
    const beat = renderBeat({ pattern: BEAT, bpm: BPM, kit: DEFAULT_KIT, sr });
    cache[sr] = { ...beat.stems, bass: renderBass({ notes: BASS_NOTES, bpm: BPM, sr }) };
  }
  return cache[sr];
}

function processedBass(sr, { eq, duck }) {
  const { bass, kick } = stemsAt(sr);
  const out = new Float32Array(bass);
  if (eq) {
    const f = new Biquad(sr);
    f.set(BiquadType.Peaking, 55, 1.0, -9);
    for (let i = 0; i < out.length; i++) out[i] = f.process(out[i]);
  }
  if (duck) {
    // Envelope follower on the kick: jumps up instantly, falls over ~150 ms.
    // Bass gain = 1 − depth × (kick envelope, normalised).
    const rel = Math.exp(-1 / (0.15 * sr));
    const peak = peakOf(kick) || 1;
    let env = 0;
    // run twice so the loop's start already "knows" the previous bar's last kick
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < kick.length; i++) {
        const a = Math.abs(kick[i]) / peak;
        env = a > env ? a : env * rel;
        if (pass === 1) out[i] *= 1 - 0.85 * Math.min(1, env * 1.5);
      }
    }
  }
  return out;
}

// Loop player that can be re-mixed while playing without losing its place.
function makeLooper(btn, buildChannels) {
  const state = { player: null };
  const start = (offset = 0) => {
    const ch = buildChannels(Engine.ctx.sampleRate);
    if (state.player) state.player.stop();
    state.player = Engine.playRendered(ch, { loop: true, offset });
  };
  state.refresh = () => {
    if (!state.player) return;
    const p = state.player;
    start((Engine.ctx.currentTime - p.startedAt) % p.duration);
  };
  state.stop = () => {
    if (state.player) state.player.stop();
    state.player = null;
    setToggleLabel(btn, false);
  };
  btn.addEventListener('click', async () => {
    if (state.player) { state.stop(); return; }
    await Engine.start();
    loopers.forEach(l => l !== state && l.stop());
    start(0);
    setToggleLabel(btn, true);
    if (state.onStart) state.onStart();
  });
  loopers.push(state);
  return state;
}
const loopers = [];

// ── Demo 1: mixer ───────────────────────────────────────────────────────────
const TRACKS = [
  { id: 'kick',  en: 'Kick',   zh: '大鼓',    db: -4, pan: 0 },
  { id: 'snare', en: 'Snare',  zh: '小鼓',    db: -5, pan: 0 },
  { id: 'hats',  en: 'Hi-hats', zh: 'Hi-hat', db: -8, pan: 30 },
  { id: 'bass',  en: 'Bass',   zh: 'Bass',    db: -5, pan: 0 },
];
const mix = {};
const resetMix = () => TRACKS.forEach(t => (mix[t.id] = { db: t.db, pan: t.pan, mute: false }));
resetMix();

function buildMixer() {
  const root = $('mixer');
  root.innerHTML = '';
  for (const tr of TRACKS) {
    const el = document.createElement('div');
    el.className = 'strip';
    el.innerHTML = `
      <div class="strip-head">
        <span><span lang="en">${tr.en}</span><span lang="zh-Hant">${tr.zh}</span></span>
        <button class="btn" type="button" data-mute="${tr.id}" aria-pressed="false" style="padding:2px 10px;font-size:13px">M</button>
      </div>
      <div class="controls">
        <div class="control">
          <label for="f-${tr.id}"><span lang="en">Fader</span><span lang="zh-Hant">推桿</span></label>
          <input type="range" id="f-${tr.id}" min="-24" max="6" step="0.5" data-fader="${tr.id}" />
          <output for="f-${tr.id}"></output>
        </div>
        <div class="control">
          <label for="p-${tr.id}"><span lang="en">Pan</span><span lang="zh-Hant">聲像</span></label>
          <input type="range" id="p-${tr.id}" min="-100" max="100" step="1" data-pan="${tr.id}" />
          <output for="p-${tr.id}"></output>
        </div>
      </div>`;
    root.appendChild(el);
  }
  root.querySelectorAll('[data-fader]').forEach(i => i.addEventListener('input', () => { mix[i.dataset.fader].db = +i.value; updateMixer(); }));
  root.querySelectorAll('[data-pan]').forEach(i => i.addEventListener('input', () => { mix[i.dataset.pan].pan = +i.value; updateMixer(); }));
  root.querySelectorAll('[data-mute]').forEach(b => b.addEventListener('click', () => { mix[b.dataset.mute].mute = !mix[b.dataset.mute].mute; updateMixer(); }));
}

const fmtPan = p => (p === 0 ? 'C' : p < 0 ? `L${-p}` : `R${p}`);

function mixdown(sr) {
  const s = stemsAt(sr);
  const tracks = TRACKS.map(t => ({
    data: s[t.id],
    gain: mix[t.id].mute ? 0 : dbToGain(mix[t.id].db),
    pan: mix[t.id].pan / 100,
  }));
  return mixStereo(tracks);
}

// Per-50 ms peaks of the (unclipped) mix, for the meter animation.
let meterBlocks = { L: [], R: [], block: 1 };
function computeMeter(L, R, sr) {
  const block = Math.round(sr * 0.05);
  const pk = ch => { const out = []; for (let i = 0; i < ch.length; i += block) out.push(peakOf(ch.subarray(i, i + block))); return out; };
  meterBlocks = { L: pk(L), R: pk(R), block, sr };
}

let lastPeak = 0;
function mixedAndClipped(sr) {
  const [L, R] = mixdown(sr);
  lastPeak = peakOf(L, R);
  computeMeter(L, R, sr);
  // The master output can't go past 0 dBFS: hard clip, like a fixed-point output.
  for (const ch of [L, R]) for (let i = 0; i < ch.length; i++) ch[i] = Math.max(-1, Math.min(1, ch[i]));
  return [L, R];
}

function updateMixer() {
  for (const t of TRACKS) {
    const m = mix[t.id];
    const f = $(`f-${t.id}`), p = $(`p-${t.id}`);
    f.value = m.db; p.value = m.pan;
    f.parentElement.querySelector('output').textContent = `${m.db > 0 ? '+' : ''}${m.db.toFixed(1)} dB`;
    p.parentElement.querySelector('output').textContent = fmtPan(m.pan);
    document.querySelector(`[data-mute="${t.id}"]`).setAttribute('aria-pressed', String(m.mute));
  }
  // Peak numbers come from a 24 kHz render so they show before you press play.
  const [L, R] = mixdown(24000);
  const peakDb = toDb(peakOf(L, R));
  $('master-peak').textContent = `peak ${fmtDb(peakDb)}FS`;
  const note = $('clip-note');
  if (peakDb > 0) {
    note.textContent = t({ en: `Clipping: the peaks go ${peakDb.toFixed(1)} dB past 0 dBFS and get chopped off.`, zh: `削波中：波峰超過 0 dBFS ${peakDb.toFixed(1)} dB，被削掉了。` });
    note.style.color = cssVar('--accent');
  } else {
    note.textContent = t({ en: `Headroom: ${(-peakDb).toFixed(1)} dB below 0 dBFS.`, zh: `餘裕：距離 0 dBFS 還有 ${(-peakDb).toFixed(1)} dB。` });
    note.style.color = cssVar('--good');
  }
  mixLooper.refresh();
}

const mixLooper = makeLooper($('play1'), mixedAndClipped);
mixLooper.onStart = function meterLoop() {
  if (!mixLooper.player) { setMeter(0, 0); return; }
  const p = mixLooper.player;
  const pos = (Engine.ctx.currentTime - p.startedAt) % p.duration;
  const idx = Math.floor((pos * meterBlocks.sr) / meterBlocks.block);
  setMeter(meterBlocks.L[idx] || 0, meterBlocks.R[idx] || 0);
  requestAnimationFrame(meterLoop);
};

function setMeter(l, r) {
  for (const [id, v] of [['meter-l', l], ['meter-r', r]]) {
    const el = $(id);
    const d = toDb(v);
    const pct = d === -Infinity ? 0 : Math.max(0, Math.min(100, ((d + 48) / 48) * 100));
    el.firstElementChild.style.width = `${pct}%`;
    el.classList.toggle('hot', v > 1);
  }
}

$('reset1').addEventListener('click', () => { resetMix(); updateMixer(); });

// ── Demo 2: kick vs bass ────────────────────────────────────────────────────
const low = { eq: false, duck: false };

function drawLowEnd() {
  const sr = 24000;
  const { kick } = stemsAt(sr);
  const bass = processedBass(sr, low);
  const n = Math.round((60 / BPM) * sr * 2); // two beats
  const { g, w, h } = setupCanvas($('lowend'));
  const bottom = h - 18, top = 10;

  const follow = (data, color) => {
    const rel = Math.exp(-1 / (0.04 * sr));
    let e = 0;
    g.strokeStyle = color;
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const a = Math.abs(data[i]);
      e = a > e ? a : e * rel;
      const x = (i / n) * w, y = bottom - Math.min(1, e) * (bottom - top);
      i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
  };
  g.strokeStyle = cssVar('--grid');
  g.beginPath(); g.moveTo(0, bottom + 0.5); g.lineTo(w, bottom + 0.5);
  g.moveTo(w / 2 + 0.5, top); g.lineTo(w / 2 + 0.5, bottom); g.stroke();
  g.fillStyle = cssVar('--muted');
  g.fillText(t({ en: 'beat 1', zh: '第 1 拍' }), 4, h - 4);
  g.fillText(t({ en: 'beat 2', zh: '第 2 拍' }), w / 2 + 4, h - 4);
  follow(bass, cssVar('--good'));
  follow(kick, cssVar('--accent'));
}

const lowLooper = makeLooper($('play2'), sr => {
  const { kick } = stemsAt(sr);
  return mixStereo([{ data: kick, gain: dbToGain(-3) }, { data: processedBass(sr, low), gain: dbToGain(-2) }]);
});

for (const [id, key] of [['t-eq', 'eq'], ['t-duck', 'duck']]) {
  $(id).addEventListener('click', () => {
    low[key] = !low[key];
    $(id).setAttribute('aria-pressed', String(low[key]));
    drawLowEnd();
    lowLooper.refresh();
  });
}

// ── Demo 3: phase ───────────────────────────────────────────────────────────
const ph = { delayMs: 0, flip: false };

function layer(sr) {
  const a = renderHit('kick', DEFAULT_KIT, sr, 0.6);
  const d = Math.round((ph.delayMs / 1000) * sr);
  const s = ph.flip ? -1 : 1;
  const b = new Float32Array(a.length);
  for (let i = d; i < a.length; i++) b[i] = s * a[i - d];
  const sum = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) sum[i] = a[i] + b[i];
  return { a, b, sum };
}

const rms = x => Math.sqrt(x.reduce((acc, v) => acc + v * v, 0) / x.length);

function drawPhase() {
  const sr = 24000;
  const { a, b, sum } = layer(sr);
  const n = Math.round(0.08 * sr);
  const { g, w, h } = setupCanvas($('phase'));
  const mid = h / 2, amp = (h / 2 - 10) / 2;
  g.strokeStyle = cssVar('--grid');
  g.beginPath(); g.moveTo(0, mid + 0.5); g.lineTo(w, mid + 0.5); g.stroke();
  const line = (data, color, width, dash = []) => {
    g.strokeStyle = color; g.lineWidth = width; g.setLineDash(dash);
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * w, y = mid - data[i] * amp;
      i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke(); g.setLineDash([]);
  };
  g.globalAlpha = 0.6;
  line(a, cssVar('--muted'), 1.25);
  line(b, cssVar('--good'), 1.5, [5, 4]);
  g.globalAlpha = 1;
  line(sum, cssVar('--accent'), 2.5);
  g.fillStyle = cssVar('--muted');
  g.fillText('80 ms', w - 44, h - 6);

  $('delay-out').textContent = `${ph.delayMs.toFixed(1)} ms`;
  const ratio = toDb(rms(sum) / rms(a));
  $('r-layer').textContent = ratio === -Infinity ? t({ en: 'silence (full cancellation)', zh: '無聲（完全抵消）' }) : `${ratio > 0 ? '+' : ''}${ratio.toFixed(1)} dB`;
  $('r-layer').style.color = ratio < 3 ? cssVar('--accent') : '';
}

$('delay').addEventListener('input', e => { ph.delayMs = +e.target.value / 10; drawPhase(); });
$('t-flip').addEventListener('click', () => {
  ph.flip = !ph.flip;
  $('t-flip').setAttribute('aria-pressed', String(ph.flip));
  drawPhase();
});
$('play3').addEventListener('click', async () => { await Engine.start(); Engine.playRendered([layer(Engine.ctx.sampleRate).sum]); });
$('play3a').addEventListener('click', async () => { await Engine.start(); Engine.playRendered([layer(Engine.ctx.sampleRate).a]); });

// ── Init ────────────────────────────────────────────────────────────────────
buildMixer();
updateMixer();
drawLowEnd();
$('delay').value = 0;
drawPhase();
onRedraw(() => { updateMixer(); drawLowEnd(); drawPhase(); });
