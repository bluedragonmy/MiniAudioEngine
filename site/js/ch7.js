// ============================================================
// Sound Basics · ch7.js — Chapter 7: Loudness
// Demo 1: blind A/B where B is the same mix, 3 dB louder.
// Demo 2: three sounds with the same peak and very different LUFS.
// Demo 3: drive a master into a clipper, then normalise to −14 LUFS.
// Loudness is measured with the ported LoudnessMeter (BS.1770).
// ============================================================

import { $, cssVar, fmtDb, toDb, setupCanvas, setToggleLabel, onRedraw } from './ui.js';
import { DEFAULT_KIT, renderBeat, renderBass, mixStereo, dbToGain, peakOf } from './music.js';
import { LoudnessMeter } from './dsp/loudness.js';
import { AdditiveOscillator } from './dsp/oscillators.js';
import { Biquad, BiquadType } from './dsp/filters.js';

const MEASURE_SR = 48000;
const BPM = 118;
const steps = s => Array.from({ length: 16 }, (_, i) => s.includes(i));
const BEAT = { kick: steps([0, 6, 8, 11]), snare: steps([4, 12]), chat: steps([0, 2, 4, 6, 8, 10, 12, 14]), ohat: steps([7, 15]) };
const BASS = [{ step: 0, len: 2, freq: 55 }, { step: 6, len: 2, freq: 55 }, { step: 8, len: 3, freq: 65.41 }, { step: 11, len: 4, freq: 49 }];
const MASTER_TARGET = -16; // the "honest" master before any drive

// ── Rendering + measuring ───────────────────────────────────────────────────
const cache = {};
function at(sr, key, fn) {
  cache[sr] ||= {};
  return (cache[sr][key] ||= fn());
}

const scale = ([L, R], g) => [L.map(v => v * g), R.map(v => v * g)];

// Integrated LUFS of a stereo loop, measured over a few repeats so the
// 400 ms gating blocks have enough material.
function lufsAt(sr, ch, loops = 3) {
  const m = new LoudnessMeter(sr);
  for (let k = 0; k < loops; k++) for (let i = 0; i < ch[0].length; i++) m.processStereo(ch[0][i], ch[1][i]);
  return m.integrated();
}

function rawMix(sr) {
  return at(sr, 'raw', () => {
    const b = renderBeat({ pattern: BEAT, bpm: BPM, kit: DEFAULT_KIT, sr });
    const bass = renderBass({ notes: BASS, bpm: BPM, sr });
    return { stems: b.stems, bass, mix: mixStereo([
      { data: b.stems.kick, gain: dbToGain(-4) }, { data: b.stems.snare, gain: dbToGain(-5) },
      { data: b.stems.hats, gain: dbToGain(-8), pan: 0.3 }, { data: bass, gain: dbToGain(-5) },
    ]) };
  });
}

// The mix, gained so it measures MASTER_TARGET LUFS.
function master(sr) {
  return at(sr, 'master', () => {
    const { mix } = rawMix(sr);
    return scale(mix, dbToGain(MASTER_TARGET - lufsAt(sr, mix)));
  });
}

function pad(sr) {
  return at(sr, 'pad', () => {
    const n = rawMix(sr).mix[0].length;
    const out = new Float32Array(n);
    const lp = new Biquad(sr);
    lp.set(BiquadType.LowPass, 2500, 0.707);
    const oscs = [110, 164.81, 220, 277.18].map(f => { const o = new AdditiveOscillator(f, sr); o.setShape('saw'); o.setMaxHarmonics(40); return o; });
    for (let i = 0; i < n; i++) out[i] = lp.process(oscs.reduce((s, o) => s + o.process(), 0)) * 0.25;
    return [out, new Float32Array(out)];
  });
}

const normalizePeak = (ch, dbfs) => scale(ch, dbToGain(dbfs) / peakOf(...ch));

// ── Loop player shared by the demos ─────────────────────────────────────────
let player = null, playingBtn = null, buildCurrent = null;

function playLoop(btn, build) {
  const offset = player ? (Engine.ctx.currentTime - player.startedAt) % player.duration : 0;
  if (player) player.stop();
  if (playingBtn && playingBtn !== btn) setToggleLabel(playingBtn, false, labelsFor(playingBtn));
  player = Engine.playRendered(build(Engine.ctx.sampleRate), { loop: true, offset });
  playingBtn = btn;
  buildCurrent = build;
  if (btn) setToggleLabel(btn, true, labelsFor(btn));
}
function stopLoop() {
  if (player) player.stop();
  if (playingBtn) setToggleLabel(playingBtn, false, labelsFor(playingBtn));
  player = null; playingBtn = null; buildCurrent = null;
}
function refreshLoop() { if (player && buildCurrent) playLoop(playingBtn, buildCurrent); }

const LABELS = {
  'ab-a': { en: ['▶ Play A', '♪ Playing A'], zh: ['▶ 播放 A', '♪ 正在播放 A'] },
  'ab-b': { en: ['▶ Play B', '♪ Playing B'], zh: ['▶ 播放 B', '♪ 正在播放 B'] },
  play3:  { en: ['▶ Play', '■ Stop'], zh: ['▶ 播放', '■ 停止'] },
};
const labelsFor = btn => LABELS[btn.id] || { en: ['▶', '■'], zh: ['▶', '■'] };

// ── Demo 1: A/B ─────────────────────────────────────────────────────────────
const ab = { matched: false, answered: false };
const B_BOOST = 3;
const buildA = sr => master(sr);
const buildB = sr => scale(master(sr), dbToGain(ab.matched ? 0 : B_BOOST));

$('ab-a').addEventListener('click', async () => { await Engine.start(); playLoop($('ab-a'), buildA); });
$('ab-b').addEventListener('click', async () => { await Engine.start(); playLoop($('ab-b'), buildB); });
$('ab-stop').addEventListener('click', stopLoop);

document.querySelectorAll('[data-prefer]').forEach(b => b.addEventListener('click', () => {
  const fb = $('ab-feedback');
  const pickedB = b.dataset.prefer === 'b';
  fb.className = 'quiz-feedback ' + (pickedB ? 'wrong' : 'right');
  fb.textContent = pickedB
    ? t({ en: `You picked the louder one, like most people. A and B are the exact same mix; B is just ${B_BOOST} dB louder.`, zh: `你選了比較大聲的那個，跟大多數人一樣。A 和 B 是一模一樣的混音，B 只是大聲了 ${B_BOOST} dB。` })
    : t({ en: `Good ears, or lucky? A and B are the exact same mix; B is just ${B_BOOST} dB louder. Most people pick B.`, zh: `耳朵很好，還是運氣好？A 和 B 是一模一樣的混音，B 只是大聲了 ${B_BOOST} dB。大多數人會選 B。` });
  $('ab-match').hidden = false;
}));

$('ab-match').addEventListener('click', () => {
  ab.matched = !ab.matched;
  $('ab-match').setAttribute('aria-pressed', String(ab.matched));
  refreshLoop();
});

// ── Demo 2: same peak, different loudness ───────────────────────────────────
const SOUNDS = [
  { id: 'snare', en: 'Snare hits alone', zh: '只有小鼓', build: sr => { const s = rawMix(sr).stems.snare; return [s, new Float32Array(s)]; } },
  { id: 'mix',  en: 'Full beat',        zh: '完整節奏', build: sr => rawMix(sr).mix },
  { id: 'pad',  en: 'Sustained chord',  zh: '持續的和弦', build: sr => pad(sr) },
];
const PEAK = -1;
const peakNormalized = (s, sr) => at(sr, `peak-${s.id}`, () => normalizePeak(s.build(sr), PEAK));

function buildTable() {
  const rows = SOUNDS.map(s => ({ s, l: lufsAt(MEASURE_SR, peakNormalized(s, MEASURE_SR)) }));
  const root = $('loud-table');
  root.innerHTML = `<div class="loud-row loud-head">
      <span></span><span><span lang="en">Sound</span><span lang="zh-Hant">聲音</span></span>
      <span><span lang="en">Peak</span><span lang="zh-Hant">峰值</span></span><span>LUFS</span></div>`;
  for (const { s, l } of rows) {
    const pct = Math.max(2, Math.min(100, ((l + 30) / 30) * 100)); // −30…0 LUFS
    const row = document.createElement('div');
    row.className = 'loud-row';
    row.innerHTML = `
      <button class="btn" type="button" data-play="${s.id}" aria-label="Play ${s.en}">▶</button>
      <span><span lang="en">${s.en}</span><span lang="zh-Hant">${s.zh}</span></span>
      <span class="mono">${fmtDb(PEAK)}FS</span>
      <span class="loud-bar"><span style="width:${pct}%"></span><b class="mono">${l.toFixed(1)}</b></span>`;
    root.appendChild(row);
  }
  root.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', async () => {
    await Engine.start();
    const s = SOUNDS.find(x => x.id === b.dataset.play);
    stopLoop();
    Engine.playRendered(peakNormalized(s, Engine.ctx.sampleRate));
  }));
}

// ── Demo 3: master it loud ──────────────────────────────────────────────────
const m3 = { drive: 0, normalized: false };
const SPOTIFY = -14;

function driven(sr) {
  const g = dbToGain(m3.drive);
  return master(sr).map(ch => ch.map(v => Math.max(-1, Math.min(1, v * g))));
}

function update3() {
  $('drive-out').textContent = `+${m3.drive.toFixed(1)} dB`;
  const ch = driven(MEASURE_SR);
  const l = lufsAt(MEASURE_SR, ch);
  const turn = SPOTIFY - l;
  $('r-up').textContent = `${l.toFixed(1)} LUFS`;
  $('r-norm').textContent = turn < 0
    ? t({ en: `down ${(-turn).toFixed(1)} dB`, zh: `調小 ${(-turn).toFixed(1)} dB` })
    : t({ en: `up to ${turn.toFixed(1)} dB (if peaks allow)`, zh: `最多調大 ${turn.toFixed(1)} dB（峰值允許的話）` });
  drawMaster(ch[0], turn);
  refreshLoop3();
}

function drawMaster(data, turn) {
  const { g, w, h } = setupCanvas($('master-wave'));
  const mid = h / 2, amp = h / 2 - 12;
  const view = m3.normalized ? Math.min(1, dbToGain(turn)) : 1;
  g.strokeStyle = cssVar('--grid');
  g.beginPath();
  for (const y of [mid - amp, mid, mid + amp]) { g.moveTo(0, Math.round(y) + 0.5); g.lineTo(w, Math.round(y) + 0.5); }
  g.stroke();
  g.fillStyle = cssVar('--muted');
  g.fillText('0 dBFS', 4, mid - amp - 2);
  g.fillStyle = cssVar('--wave');
  const per = data.length / w;
  for (let x = 0; x < w; x++) {
    let lo = 0, hi = 0;
    for (let i = Math.floor(x * per); i < Math.floor((x + 1) * per); i++) {
      if (data[i] < lo) lo = data[i];
      if (data[i] > hi) hi = data[i];
    }
    g.fillRect(x, mid - hi * view * amp, 1, Math.max(1, (hi - lo) * view * amp));
  }
}

const build3 = sr => {
  const ch = driven(sr);
  if (!m3.normalized) return ch;
  const turn = SPOTIFY - lufsAt(sr, ch);
  return scale(ch, dbToGain(Math.min(turn, 0))); // only turn down; boosting depends on peak headroom
};
function refreshLoop3() { if (playingBtn === $('play3')) refreshLoop(); }

$('drive').addEventListener('input', e => { m3.drive = +e.target.value; update3(); });
$('m-norm').addEventListener('click', () => {
  m3.normalized = !m3.normalized;
  $('m-norm').setAttribute('aria-pressed', String(m3.normalized));
  update3();
});
$('play3').addEventListener('click', async () => {
  if (playingBtn === $('play3')) { stopLoop(); return; }
  await Engine.start();
  stopLoop();
  playLoop($('play3'), build3);
});

// ── Init ────────────────────────────────────────────────────────────────────
$('drive').value = 0;
buildTable();
update3();
onRedraw(() => { buildTable(); update3(); });
