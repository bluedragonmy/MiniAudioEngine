// ============================================================
// Sound Basics · ch4.js — Chapter 4: ADSR envelopes
// Demo 1: shape an envelope, hold a button to play it.
// Demo 2: guess which preset you heard.
// The envelope picture is drawn by running the same ADSR class.
// ============================================================

import { $, cssVar, setupCanvas, logSlider, showAudioUnavailable, onRedraw } from './ui.js';
import { ADSR, AdsrState } from './dsp/adsr.js';

const NOTE = 220; // A3
const SOUND = { shape: 'saw', harmonics: 60, filter: 'biquad', cutoff: 2200, q: 0.9, freq: NOTE, level: 0.45 };

const PRESETS = {
  pluck: { attack: 0.003, decay: 0.35, sustain: 0.0, release: 0.15 },
  pad:   { attack: 1.2,   decay: 0.6,  sustain: 0.8, release: 1.6 },
  organ: { attack: 0.005, decay: 0.0,  sustain: 1.0, release: 0.02 },
  brass: { attack: 0.06,  decay: 0.25, sustain: 0.55, release: 0.25 },
};
const PRESET_NAMES = {
  pluck: { en: 'Pluck', zh: '撥弦' }, pad: { en: 'Pad', zh: '長音墊' },
  organ: { en: 'Organ', zh: '風琴' }, brass: { en: 'Brass stab', zh: '銅管短音' },
};
const STAGE_NAMES = ['—', 'Attack', 'Decay', 'Sustain', 'Release'];

// Slider 0 means exactly 0 s; otherwise log scale 1 ms – max.
const timeMap = max => {
  const m = logSlider(0.001, max);
  return { toValue: v => (v <= 0 ? 0 : m.toValue(v)), toSlider: s => (s <= 0 ? 0 : m.toSlider(s)) };
};
const maps = { attack: timeMap(3), decay: timeMap(3), release: timeMap(4) };

const env = { ...PRESETS.brass };
const fmtTime = s => (s < 1 ? `${Math.round(s * 1000)} ms` : `${s.toFixed(2)} s`);

// ── Synth ───────────────────────────────────────────────────────────────────
let synth = null;
async function ensureSynth() {
  await Engine.start();
  if (!synth) {
    synth = Engine.createSynth({ ...SOUND, ...env });
    if (synth) synth.onLevel(({ level, state }) => {
      $('r-level').textContent = level.toFixed(2);
      $('r-stage').textContent = STAGE_NAMES[state];
    });
  }
  if (!synth) showAudioUnavailable();
  return !!synth;
}

// ── Envelope picture ────────────────────────────────────────────────────────
const HOLD = 1.0; // seconds the key is "held" in the picture

function renderEnvelope(p, rate = 1000) {
  const a = new ADSR();
  a.setSampleRate(rate);
  a.setParameters(p.attack, p.decay, p.sustain, p.release);
  a.noteOn();
  const pts = [];
  const holdN = Math.round(Math.max(HOLD, p.attack + p.decay + 0.3) * rate);
  for (let i = 0; i < holdN; i++) pts.push(a.process());
  const releaseAt = pts.length;
  a.noteOff();
  let guard = 0;
  while (a.isActive() && guard++ < 10 * rate) pts.push(a.process());
  pts.push(0);
  return { pts, releaseAt, rate };
}

function drawEnvelope() {
  const { g, w, h } = setupCanvas($('env'));
  const { pts, releaseAt, rate } = renderEnvelope(env);
  const pad = 8, top = 14, bottom = h - 22;
  const x = i => pad + (i / (pts.length - 1)) * (w - 2 * pad);
  const y = v => bottom - v * (bottom - top);

  // key-down region
  g.fillStyle = cssVar('--accent-soft');
  g.fillRect(x(0), top, x(releaseAt) - x(0), bottom - top);
  g.fillStyle = cssVar('--muted');
  const heldLabel = t({ en: 'key held', zh: '按住琴鍵' });
  g.fillText(heldLabel, (x(0) + x(releaseAt)) / 2 - g.measureText(heldLabel).width / 2, top + 12);
  g.fillText(t({ en: 'released', zh: '放開' }), x(releaseAt) + 6, top + 12);
  g.fillText(`${(pts.length / rate).toFixed(2)} s`, w - 52, h - 6);
  g.fillText('0', pad, h - 6);

  // stage markers
  const marks = [[p => p.attack, 'A'], [p => p.attack + p.decay, 'D']];
  g.strokeStyle = cssVar('--grid');
  g.beginPath();
  for (const [fn, label] of marks) {
    const i = Math.min(Math.round(fn(env) * rate), releaseAt);
    g.moveTo(x(i) + 0.5, top); g.lineTo(x(i) + 0.5, bottom);
    g.fillText(label, x(i) - 4, h - 6);
  }
  g.moveTo(x(releaseAt) + 0.5, top); g.lineTo(x(releaseAt) + 0.5, bottom);
  g.stroke();
  g.fillText('S', x(releaseAt) - 14, h - 6);
  g.fillText('R', (x(releaseAt) + x(pts.length - 1)) / 2, h - 6);

  // the envelope
  g.strokeStyle = cssVar('--wave');
  g.lineWidth = 2.5;
  g.beginPath();
  pts.forEach((v, i) => (i === 0 ? g.moveTo(x(i), y(v)) : g.lineTo(x(i), y(v))));
  g.stroke();
}

// ── Controls ────────────────────────────────────────────────────────────────
function updateControls() {
  $('atk').value = maps.attack.toSlider(env.attack);
  $('dec').value = maps.decay.toSlider(env.decay);
  $('sus').value = Math.round(env.sustain * 100);
  $('rel').value = maps.release.toSlider(env.release);
  refresh();
}

function refresh() {
  $('atk-out').textContent = fmtTime(env.attack);
  $('dec-out').textContent = fmtTime(env.decay);
  $('sus-out').textContent = `${Math.round(env.sustain * 100)}%`;
  $('rel-out').textContent = fmtTime(env.release);
  document.querySelectorAll('#presets [data-preset]').forEach(b => {
    const p = PRESETS[b.dataset.preset];
    const same = Object.keys(p).every(k => Math.abs(p[k] - env[k]) < 1e-9);
    b.setAttribute('aria-pressed', String(same));
  });
  drawEnvelope();
  if (synth) synth.set(env);
}

$('atk').addEventListener('input', e => { env.attack = maps.attack.toValue(+e.target.value); refresh(); });
$('dec').addEventListener('input', e => { env.decay = maps.decay.toValue(+e.target.value); refresh(); });
$('sus').addEventListener('input', e => { env.sustain = +e.target.value / 100; refresh(); });
$('rel').addEventListener('input', e => { env.release = maps.release.toValue(+e.target.value); refresh(); });
document.querySelectorAll('#presets [data-preset]').forEach(b =>
  b.addEventListener('click', () => { Object.assign(env, PRESETS[b.dataset.preset]); updateControls(); }));

// ── Hold to play ────────────────────────────────────────────────────────────
const hold = $('hold');
let held = false;

async function press() {
  if (held) return;
  held = true;
  hold.setAttribute('aria-pressed', 'true');
  if (!(await ensureSynth())) return;
  synth.set({ ...SOUND, ...env });
  if (held) synth.noteOn();
}
function release() {
  if (!held) return;
  held = false;
  hold.setAttribute('aria-pressed', 'false');
  if (synth) synth.noteOff();
}

hold.addEventListener('pointerdown', e => { hold.setPointerCapture(e.pointerId); press(); });
hold.addEventListener('pointerup', release);
hold.addEventListener('pointercancel', release);
hold.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(); } });
hold.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); release(); } });
hold.addEventListener('contextmenu', e => e.preventDefault());

// ── Quiz ────────────────────────────────────────────────────────────────────
const quiz = { answer: null, answered: true, right: 0, total: 0 };
const fb = $('quiz-feedback');
let quizTimer = 0;

$('quiz-play').addEventListener('click', async () => {
  if (!(await ensureSynth())) return;
  if (quiz.answered) {
    const names = Object.keys(PRESETS);
    let pick;
    do { pick = names[Math.floor(Math.random() * names.length)]; } while (pick === quiz.answer && Math.random() < 0.7);
    quiz.answer = pick;
    quiz.answered = false;
    fb.textContent = '';
    fb.className = 'quiz-feedback';
  }
  release();
  clearTimeout(quizTimer);
  synth.set({ ...SOUND, ...PRESETS[quiz.answer] });
  synth.noteOn();
  quizTimer = setTimeout(() => { synth.noteOff(); synth.set(env); }, 1000);
});

document.querySelectorAll('[data-answer]').forEach(b => b.addEventListener('click', () => {
  if (quiz.answered) {
    fb.className = 'quiz-feedback';
    fb.textContent = t({ en: 'Press "Play a note" first.', zh: '先按「播放一個音」。' });
    return;
  }
  quiz.answered = true;
  quiz.total++;
  const correct = b.dataset.answer === quiz.answer;
  if (correct) quiz.right++;
  fb.className = 'quiz-feedback ' + (correct ? 'right' : 'wrong');
  fb.textContent = (correct ? t({ en: 'Correct! ', zh: '答對了！' }) : t({ en: `It was ${PRESET_NAMES[quiz.answer].en}. `, zh: `答案是${PRESET_NAMES[quiz.answer].zh}。` }))
    + t({ en: `Score: ${quiz.right}/${quiz.total}`, zh: `得分：${quiz.right}/${quiz.total}` });
}));

// ── Init ────────────────────────────────────────────────────────────────────
updateControls();
onRedraw(drawEnvelope);
