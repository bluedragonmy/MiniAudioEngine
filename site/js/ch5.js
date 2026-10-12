// ============================================================
// Sound Basics · ch5.js — Chapter 5: Drums & rhythm
// Demo 1: tweak and audition kick / snare / hi-hat.
// Demo 2: a 16-step sequencer that renders the loop with our DSP.
// ============================================================

import { $, cssVar, setupCanvas, setToggleLabel, showAudioUnavailable, onRedraw } from './ui.js';
import { DEFAULT_KIT, ROWS, renderHit, renderBeat, mixStereo } from './music.js';

const DRAW_SR = 24000;
const kit = structuredClone(DEFAULT_KIT);

// Slider units → kit values (ms sliders become seconds, % becomes 0–1)
const PARAMS = {
  'kick.start':      { get: () => kit.kick.start,             set: v => (kit.kick.start = v),             fmt: v => `${v} Hz` },
  'kick.end':        { get: () => kit.kick.end,               set: v => (kit.kick.end = v),               fmt: v => `${v} Hz` },
  'kick.pitchDecay': { get: () => kit.kick.pitchDecay * 1000, set: v => (kit.kick.pitchDecay = v / 1000), fmt: v => `${v} ms` },
  'kick.decay':      { get: () => kit.kick.decay * 1000,      set: v => (kit.kick.decay = v / 1000),      fmt: v => `${v} ms` },
  'snare.tone':      { get: () => kit.snare.tone,             set: v => (kit.snare.tone = v),             fmt: v => `${v} Hz` },
  'snare.mix':       { get: () => kit.snare.mix * 100,        set: v => (kit.snare.mix = v / 100),        fmt: v => `${v}%` },
  'snare.decay':     { get: () => kit.snare.decay * 1000,     set: v => (kit.snare.decay = v / 1000),     fmt: v => `${v} ms` },
  'hat.cutoff':      { get: () => kit.hat.cutoff,             set: v => (kit.hat.cutoff = v),             fmt: v => `${(v / 1000).toFixed(1)} kHz` },
  'hat.closed':      { get: () => kit.hat.closed * 1000,      set: v => (kit.hat.closed = v / 1000),      fmt: v => `${v} ms` },
  'hat.open':        { get: () => kit.hat.open * 1000,        set: v => (kit.hat.open = v / 1000),        fmt: v => `${v} ms` },
};

async function ready() {
  await Engine.start();
  if (!Engine.ctx) { showAudioUnavailable(); return false; }
  return true;
}

// ── Demo 1: one-shots ───────────────────────────────────────────────────────
function drawShot(canvasId, data, seconds) {
  const { g, w, h } = setupCanvas($(canvasId));
  const mid = h / 2, amp = h / 2 - 8;
  g.strokeStyle = cssVar('--grid');
  g.beginPath(); g.moveTo(0, mid + 0.5); g.lineTo(w, mid + 0.5); g.stroke();
  // min/max per pixel column
  g.fillStyle = cssVar('--wave');
  const per = data.length / w;
  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  const norm = peak > 0 ? 1 / peak : 1;
  for (let x = 0; x < w; x++) {
    let lo = 0, hi = 0;
    for (let i = Math.floor(x * per); i < Math.floor((x + 1) * per); i++) {
      if (data[i] < lo) lo = data[i];
      if (data[i] > hi) hi = data[i];
    }
    g.fillRect(x, mid - hi * norm * amp, 1, Math.max(1, (hi - lo) * norm * amp));
  }
  g.fillStyle = cssVar('--muted');
  g.fillText(`${seconds * 1000} ms`, w - 50, h - 4);
}

function drawShots() {
  drawShot('shot-kick', renderHit('kick', kit, DRAW_SR, 0.6), 0.6);
  drawShot('shot-snare', renderHit('snare', kit, DRAW_SR, 0.4), 0.4);
  drawShot('shot-hat', renderHit('ohat', kit, DRAW_SR, 0.6), 0.6);
}

let shotPlayer = null;
document.querySelectorAll('[data-hit]').forEach(b => b.addEventListener('click', async () => {
  if (!(await ready())) return;
  const sr = Engine.ctx.sampleRate;
  const kind = b.dataset.hit;
  const data = renderHit(kind, kit, sr, kind === 'ohat' ? kit.hat.open + 0.2 : 1.2);
  if (kind === 'chat' && shotPlayer) shotPlayer.stop(); // choke, by hand
  shotPlayer = Engine.playRendered([data]);
}));

document.querySelectorAll('[data-param]').forEach(input => {
  const p = PARAMS[input.dataset.param];
  const out = input.parentElement.querySelector('output');
  input.value = p.get();
  out.textContent = p.fmt(+input.value);
  input.addEventListener('input', () => {
    p.set(+input.value);
    out.textContent = p.fmt(+input.value);
    drawShots();
    scheduleRerender();
  });
});

// ── Demo 2: sequencer ───────────────────────────────────────────────────────
const LABELS = {
  kick: { en: 'Kick', zh: '大鼓' }, snare: { en: 'Snare', zh: '小鼓' },
  chat: { en: 'Cl. hat', zh: '閉合 HH' }, ohat: { en: 'Op. hat', zh: '開放 HH' },
};
const steps = s => Array.from({ length: 16 }, (_, i) => s.includes(i));
const PATTERNS = {
  house:   { bpm: 124, swing: 0,  kick: steps([0, 4, 8, 12]), snare: steps([4, 12]), chat: steps([0, 1, 3, 4, 5, 7, 8, 9, 11, 12, 13, 15]), ohat: steps([2, 6, 10, 14]) },
  boombap: { bpm: 90,  swing: 30, kick: steps([0, 7, 10]), snare: steps([4, 12]), chat: steps([0, 2, 4, 6, 8, 10, 12, 14]), ohat: steps([]) },
  rock:    { bpm: 110, swing: 0,  kick: steps([0, 8, 10]), snare: steps([4, 12]), chat: steps([0, 2, 4, 6, 8, 10, 12, 14]), ohat: steps([]) },
  clear:   { kick: steps([]), snare: steps([]), chat: steps([]), ohat: steps([]) },
};

const seq = { pattern: {}, bpm: 120, swing: 0, player: null, raf: 0 };
ROWS.forEach(r => (seq.pattern[r] = steps([])));

function buildGrid() {
  const grid = $('seq');
  grid.innerHTML = '';
  for (const row of ROWS) {
    const r = document.createElement('div');
    r.className = 'seq-row';
    r.setAttribute('role', 'row');
    const label = document.createElement('span');
    label.className = 'seq-label';
    label.innerHTML = `<span lang="en">${LABELS[row].en}</span><span lang="zh-Hant">${LABELS[row].zh}</span>`;
    r.appendChild(label);
    for (let i = 0; i < 16; i++) {
      const c = document.createElement('button');
      c.type = 'button';
      c.className = 'seq-cell' + (i % 4 === 0 ? ' beat' : '');
      c.dataset.row = row;
      c.dataset.step = i;
      c.setAttribute('aria-label', `${LABELS[row].en} step ${i + 1}`);
      c.addEventListener('click', () => {
        seq.pattern[row][i] = !seq.pattern[row][i];
        paintGrid();
        markPreset();
        scheduleRerender();
      });
      r.appendChild(c);
    }
    grid.appendChild(r);
  }
}

function paintGrid(current = -1) {
  document.querySelectorAll('.seq-cell').forEach(c => {
    const on = seq.pattern[c.dataset.row][+c.dataset.step];
    c.setAttribute('aria-pressed', String(on));
    c.classList.toggle('now', +c.dataset.step === current);
  });
}

function markPreset() {
  document.querySelectorAll('#patterns [data-pattern]').forEach(b => {
    const p = PATTERNS[b.dataset.pattern];
    const same = ROWS.every(r => p[r].every((v, i) => v === seq.pattern[r][i]));
    b.setAttribute('aria-pressed', String(same));
  });
}

function setBpmSwing() {
  $('bpm').value = seq.bpm;
  $('bpm-out').textContent = seq.bpm;
  $('swing').value = seq.swing;
  $('swing-out').textContent = `${seq.swing}%`;
}

function loadPattern(name) {
  const p = PATTERNS[name];
  ROWS.forEach(r => (seq.pattern[r] = [...p[r]]));
  if (p.bpm) seq.bpm = p.bpm;
  if (p.swing !== undefined) seq.swing = p.swing;
  setBpmSwing();
  paintGrid();
  markPreset();
  scheduleRerender();
}

function renderLoop() {
  const sr = Engine.ctx.sampleRate;
  const beat = renderBeat({ pattern: seq.pattern, bpm: seq.bpm, swing: seq.swing, kit, sr });
  const { kick, snare, hats } = beat.stems;
  return { channels: mixStereo([{ data: kick }, { data: snare }, { data: hats, pan: 0.25 }]), times: beat.times };
}

let times = [];
function startLoop(offset = 0) {
  const { channels, times: t } = renderLoop();
  times = t;
  if (seq.player) seq.player.stop();
  seq.player = Engine.playRendered(channels, { loop: true, offset });
}

let rerenderTimer = 0;
function scheduleRerender() {
  if (!seq.player) return;
  clearTimeout(rerenderTimer);
  rerenderTimer = setTimeout(() => {
    const p = seq.player;
    // keep the playhead where it is, scaled if the loop length changed
    const pos = ((Engine.ctx.currentTime - p.startedAt) % p.duration) / p.duration;
    startLoop(pos * (60 / seq.bpm) * 4);
  }, 60);
}

function drawPlayhead() {
  if (!seq.player) return;
  const p = seq.player;
  const pos = (Engine.ctx.currentTime - p.startedAt) % p.duration;
  let step = 0;
  for (let i = 0; i < 16; i++) if (times[i] <= pos) step = i;
  paintGrid(step);
  seq.raf = requestAnimationFrame(drawPlayhead);
}

$('seq-play').addEventListener('click', async () => {
  if (seq.player) {
    seq.player.stop();
    seq.player = null;
    cancelAnimationFrame(seq.raf);
    paintGrid();
    setToggleLabel($('seq-play'), false);
    return;
  }
  if (!(await ready())) return;
  startLoop(0);
  setToggleLabel($('seq-play'), true);
  drawPlayhead();
});

$('bpm').addEventListener('input', e => { seq.bpm = +e.target.value; setBpmSwing(); scheduleRerender(); });
$('swing').addEventListener('input', e => { seq.swing = +e.target.value; setBpmSwing(); scheduleRerender(); });
document.querySelectorAll('#patterns [data-pattern]').forEach(b => b.addEventListener('click', () => loadPattern(b.dataset.pattern)));

// ── Init ────────────────────────────────────────────────────────────────────
buildGrid();
loadPattern('house');
drawShots();
onRedraw(drawShots);
