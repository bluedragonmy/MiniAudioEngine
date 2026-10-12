// ============================================================
// Sound Basics · ch1.js — Chapter 1: What is sound?
// Demo 1: a sine tone you control (frequency + volume) with a
//         10 ms snapshot of its waveform.
// Demo 2: octave buttons (110 / 220 / 440 / 880 Hz).
// Demo 3: "which one is higher?" ear quiz.
// ============================================================

'use strict';

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const F_MIN = 50, F_MAX = 2000;
const WINDOW_MS = 10; // how much time the waveform canvas shows

// Slider position (0–1000) <-> frequency, on a log scale so every
// octave gets the same slider distance — the way our ears hear pitch.
const sliderToFreq = v => F_MIN * Math.pow(F_MAX / F_MIN, v / 1000);
const freqToSlider = f => 1000 * Math.log(f / F_MIN) / Math.log(F_MAX / F_MIN);

function noteName(freq) {
  const midi = 69 + 12 * Math.log2(freq / 440);
  const nearest = Math.round(midi);
  const cents = Math.round((midi - nearest) * 100);
  const name = NOTE_NAMES[((nearest % 12) + 12) % 12] + (Math.floor(nearest / 12) - 1);
  return { name, cents };
}

const toDb = a => (a <= 0 ? -Infinity : 20 * Math.log10(a));
const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// ── State ───────────────────────────────────────────────────────────────────
const state = { freq: 220, amp: 0.5, playing: false, voice: null };

// ── Elements ────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const canvas = $('wave');
const freqSlider = $('freq'), freqOut = $('freq-out');
const ampSlider = $('amp'), ampOut = $('amp-out');
const playBtn = $('play');

// ── Waveform drawing ────────────────────────────────────────────────────────
function drawWave() {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);

  const mid = h / 2, maxH = h / 2 - 12;

  // Grid: one vertical line per millisecond, plus the zero line.
  g.strokeStyle = cssVar('--grid');
  g.lineWidth = 1;
  g.beginPath();
  for (let ms = 1; ms < WINDOW_MS; ms++) {
    const x = Math.round((ms / WINDOW_MS) * w) + 0.5;
    g.moveTo(x, 0); g.lineTo(x, h);
  }
  g.moveTo(0, mid + 0.5); g.lineTo(w, mid + 0.5);
  g.stroke();

  g.fillStyle = cssVar('--muted');
  g.font = `12px ${cssVar('--mono') || 'monospace'}`;
  g.fillText('0 ms', 6, h - 6);
  g.fillText(`${WINDOW_MS} ms`, w - 44, h - 6);

  // The wave itself: y = amplitude · sin(2π·f·t)
  g.strokeStyle = cssVar('--wave');
  g.lineWidth = 2;
  g.beginPath();
  const steps = Math.max(w * 2, 400);
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * (WINDOW_MS / 1000);
    const y = mid - state.amp * maxH * Math.sin(2 * Math.PI * state.freq * t);
    const x = (i / steps) * w;
    i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
  }
  g.stroke();
}

// ── Readouts ────────────────────────────────────────────────────────────────
function updateReadout() {
  const { name, cents } = noteName(state.freq);
  const centsTxt = cents === 0 ? '' : ` ${cents > 0 ? '+' : ''}${cents}¢`;
  const db = toDb(state.amp);

  freqOut.textContent = `${Math.round(state.freq)} Hz`;
  ampOut.textContent = `${Math.round(state.amp * 100)}%`;

  $('r-period').textContent = `${(1000 / state.freq).toFixed(2)} ms`;
  $('r-cycles').textContent = (state.freq * WINDOW_MS / 1000).toFixed(1);
  $('r-note').textContent = name + centsTxt;
  $('r-db').textContent = db === -Infinity ? '−∞ dB' : `${db.toFixed(1).replace('-', '−')} dB`;
}

function refresh() {
  updateReadout();
  drawWave();
  if (state.voice) {
    Engine.glide(state.voice.frequency, state.freq);
    Engine.glide(state.voice.amplitude, state.playing ? state.amp : 0);
  }
}

// ── Demo 1: play / stop ─────────────────────────────────────────────────────
async function setPlaying(on) {
  await Engine.start();
  if (!state.voice) state.voice = Engine.createSine(state.freq);
  state.playing = on;
  playBtn.setAttribute('aria-pressed', String(on));
  playBtn.querySelector('[lang="en"]').textContent = on ? '■ Stop' : '▶ Play';
  playBtn.querySelector('[lang="zh-Hant"]').textContent = on ? '■ 停止' : '▶ 播放';
  refresh();
  $('dsp-note').hidden = !Engine.usingOwnDsp;
}

playBtn.addEventListener('click', () => setPlaying(!state.playing));

freqSlider.addEventListener('input', () => {
  state.freq = sliderToFreq(+freqSlider.value);
  refresh();
});
ampSlider.addEventListener('input', () => {
  state.amp = +ampSlider.value / 100;
  refresh();
});

// ── Demo 2: octave buttons ──────────────────────────────────────────────────
document.querySelectorAll('[data-octave]').forEach(btn => {
  btn.addEventListener('click', async () => {
    state.freq = +btn.dataset.octave;
    freqSlider.value = freqToSlider(state.freq);
    if (!state.playing) await setPlaying(true);
    refresh();
    document.querySelectorAll('[data-octave]').forEach(b =>
      b.setAttribute('aria-pressed', String(b === btn)));
  });
});

// ── Demo 3: which one is higher? ────────────────────────────────────────────
const quiz = { a: 0, b: 0, answered: true, right: 0, total: 0 };
const fb = $('quiz-feedback');

function newRound() {
  // Base note between A3 and A4, second note 1–4 semitones away.
  const base = 220 * Math.pow(2, Math.floor(Math.random() * 12) / 12);
  const step = (1 + Math.floor(Math.random() * 4)) * (Math.random() < 0.5 ? -1 : 1);
  quiz.a = base;
  quiz.b = base * Math.pow(2, step / 12);
  quiz.answered = false;
  fb.textContent = '';
  fb.className = 'quiz-feedback';
}

async function playPair() {
  await Engine.start();
  if (state.playing) await setPlaying(false);
  Engine.playTone(quiz.a, { at: 0, duration: 0.6 });
  Engine.playTone(quiz.b, { at: 0.8, duration: 0.6 });
}

$('quiz-play').addEventListener('click', async () => {
  if (quiz.answered) newRound();
  await playPair();
});

document.querySelectorAll('[data-answer]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (quiz.answered) {
      fb.className = 'quiz-feedback';
      fb.textContent = t({ en: 'Press "Play the two tones" first.', zh: '先按「播放兩個音」。' });
      return;
    }
    const firstIsHigher = quiz.a > quiz.b;
    const correct = (btn.dataset.answer === 'first') === firstIsHigher;
    const semis = Math.round(Math.abs(12 * Math.log2(quiz.b / quiz.a)));
    quiz.answered = true;
    quiz.total++;
    if (correct) quiz.right++;
    fb.className = 'quiz-feedback ' + (correct ? 'right' : 'wrong');
    fb.textContent = (correct
      ? t({ en: 'Correct! ', zh: '答對了！' })
      : t({ en: 'Not quite. ', zh: '差一點。' }))
      + t({
        en: `${Math.round(quiz.a)} Hz → ${Math.round(quiz.b)} Hz (${semis} semitone${semis > 1 ? 's' : ''} apart). Score: ${quiz.right}/${quiz.total}`,
        zh: `${Math.round(quiz.a)} Hz → ${Math.round(quiz.b)} Hz（相差 ${semis} 個半音）。得分：${quiz.right}/${quiz.total}`,
      });
  });
});

// ── Init ────────────────────────────────────────────────────────────────────
freqSlider.value = freqToSlider(state.freq);
ampSlider.value = state.amp * 100;
refresh();
window.addEventListener('resize', drawWave);
// Colors come from CSS tokens, so redraw if the theme flips.
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', drawWave);
