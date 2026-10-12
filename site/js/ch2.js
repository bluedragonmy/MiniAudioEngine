// ============================================================
// Sound Basics · ch2.js — Chapter 2: Digital sound
// Demo 1: sample a sine wave — original, held samples, and the alias.
// Demo 2: sweep 100 Hz → 12 kHz at fs = 8 kHz, plotted on the fold chart.
// Demo 3: predict the alias, then listen.
// Audio chain: sine voice → SampleRateReducer worklet → output.
// ============================================================

import { aliasFrequency } from './dsp/aliasing.js';

const RATES = [2000, 4000, 8000, 11025, 16000, 22050, 44100];
const F_MIN = 100, F_MAX = 10000;
const WINDOW_MS = 5;
const LEVEL = 0.5;

const SWEEP_FS = 8000, SWEEP_FROM = 100, SWEEP_TO = 12000, SWEEP_SEC = 8;

const sliderToFreq = v => F_MIN * Math.pow(F_MAX / F_MIN, v / 1000);
const freqToSlider = f => 1000 * Math.log(f / F_MIN) / Math.log(F_MAX / F_MIN);
const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const fmtHz = f => (f >= 1000 ? `${+(f / 1000).toFixed(2)} kHz` : `${Math.round(f)} Hz`);
const $ = id => document.getElementById(id);

// ── Audio chain (shared by all three demos) ─────────────────────────────────
const audio = { voice: null, reducer: null, mode: null }; // mode: 'free' | 'sweep' | 'quiz'

async function ensureChain() {
  await Engine.start();
  if (!audio.reducer) {
    audio.reducer = Engine.createSampleRateReducer(8000);
    if (!audio.reducer) {
      document.querySelectorAll('.audio-unavailable').forEach(el => (el.hidden = false));
      return false;
    }
    audio.voice = Engine.createSine(440, audio.reducer.input);
  }
  return true;
}

function setChain(freq, rate) {
  const now = Engine.ctx.currentTime;
  audio.voice.frequency.cancelScheduledValues(now);
  audio.voice.frequency.setValueAtTime(freq, now);
  audio.reducer.targetRate.setValueAtTime(rate, now);
}

function silence() {
  if (!audio.voice) return;
  const amp = audio.voice.amplitude;
  amp.cancelScheduledValues(Engine.ctx.currentTime);
  Engine.glide(amp, 0);
  if (audio.mode === 'free') setFreeButton(false);
  if (audio.mode === 'sweep') setSweepButton(false);
  audio.mode = null;
}

// ── Canvas helper ───────────────────────────────────────────────────────────
function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  g.font = `12px ${cssVar('--mono') || 'monospace'}`;
  return { g, w, h };
}

// ── Demo 1: sample a wave ───────────────────────────────────────────────────
const free = { freq: 5000, rateIdx: 2 };
const freqSlider = $('freq'), rateSlider = $('rate'), playBtn = $('play');

// sin(2π f n/fs) lands on the same dots as ±sin(2π fa n/fs), where fa is
// the alias. The sign flips when the frequency folded past Nyquist.
function aliasSign(f, fs) {
  return (f % fs) <= fs / 2 ? 1 : -1;
}

function drawSampled() {
  const { g, w, h } = setupCanvas($('sampled'));
  const fs = RATES[free.rateIdx];
  const f = free.freq;
  const fa = aliasFrequency(f, fs);
  const sign = aliasSign(f, fs);
  const mid = h / 2, amp = h / 2 - 14;
  const T = WINDOW_MS / 1000;
  const xOf = t => (t / T) * w;

  // grid
  g.strokeStyle = cssVar('--grid');
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, mid + 0.5); g.lineTo(w, mid + 0.5);
  for (let ms = 1; ms < WINDOW_MS; ms++) {
    const x = Math.round(xOf(ms / 1000)) + 0.5;
    g.moveTo(x, 0); g.lineTo(x, h);
  }
  g.stroke();
  g.fillStyle = cssVar('--muted');
  g.fillText('0 ms', 6, h - 6);
  g.fillText(`${WINDOW_MS} ms`, w - 38, h - 6);

  // original (faint)
  g.strokeStyle = cssVar('--muted');
  g.globalAlpha = 0.45;
  g.lineWidth = 1.25;
  g.beginPath();
  const steps = Math.max(w * 4, 800);
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * T;
    const y = mid - amp * Math.sin(2 * Math.PI * f * t);
    i === 0 ? g.moveTo(xOf(t), y) : g.lineTo(xOf(t), y);
  }
  g.stroke();
  g.globalAlpha = 1;

  // what you hear: the alias, through the same sample points (dashed)
  g.strokeStyle = cssVar('--good');
  g.lineWidth = 2;
  g.setLineDash([6, 5]);
  g.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * T;
    const y = mid - sign * amp * Math.sin(2 * Math.PI * fa * t);
    i === 0 ? g.moveTo(xOf(t), y) : g.lineTo(xOf(t), y);
  }
  g.stroke();
  g.setLineDash([]);

  // held samples (stairs + dots)
  const n = Math.floor(T * fs) + 1;
  g.strokeStyle = cssVar('--accent');
  g.fillStyle = cssVar('--accent');
  g.lineWidth = 2;
  g.beginPath();
  for (let k = 0; k < n; k++) {
    const t0 = k / fs, t1 = Math.min((k + 1) / fs, T);
    const y = mid - amp * Math.sin(2 * Math.PI * f * t0);
    k === 0 ? g.moveTo(xOf(t0), y) : g.lineTo(xOf(t0), y);
    g.lineTo(xOf(t1), y);
  }
  g.stroke();
  const r = n > 120 ? 1.5 : 3;
  for (let k = 0; k < n; k++) {
    const t0 = k / fs;
    g.beginPath();
    g.arc(xOf(t0), mid - amp * Math.sin(2 * Math.PI * f * t0), r, 0, 2 * Math.PI);
    g.fill();
  }
}

function updateFree() {
  const fs = RATES[free.rateIdx];
  const nyq = fs / 2;
  const fa = aliasFrequency(free.freq, fs);
  $('freq-out').textContent = fmtHz(free.freq);
  $('rate-out').textContent = fmtHz(fs);
  $('r-nyq').textContent = fmtHz(nyq);
  $('r-heard').textContent = fmtHz(fa);
  const status = $('r-status');
  const aliasing = free.freq > nyq;
  status.textContent = aliasing
    ? t({ en: '⚠ aliasing', zh: '⚠ 發生 aliasing' })
    : t({ en: '✓ captured correctly', zh: '✓ 正確記錄' });
  status.style.color = aliasing ? cssVar('--accent') : cssVar('--good');
  drawSampled();
  if (audio.mode === 'free') setChain(free.freq, fs);
}

function setFreeButton(on) {
  playBtn.setAttribute('aria-pressed', String(on));
  playBtn.querySelector('[lang="en"]').textContent = on ? '■ Stop' : '▶ Play';
  playBtn.querySelector('[lang="zh-Hant"]').textContent = on ? '■ 停止' : '▶ 播放';
}

playBtn.addEventListener('click', async () => {
  if (audio.mode === 'free') { silence(); return; }
  if (!(await ensureChain())) return;
  silence();
  audio.mode = 'free';
  setFreeButton(true);
  setChain(free.freq, RATES[free.rateIdx]);
  Engine.glide(audio.voice.amplitude, LEVEL);
});

freqSlider.addEventListener('input', () => { free.freq = Math.round(sliderToFreq(+freqSlider.value)); updateFree(); });
rateSlider.addEventListener('input', () => { free.rateIdx = +rateSlider.value; updateFree(); });

// ── Demo 2: the fold ────────────────────────────────────────────────────────
const sweepBtn = $('sweep');
let sweepStart = 0, sweepRaf = 0, sweepFreq = null;

function drawFold() {
  const { g, w, h } = setupCanvas($('fold'));
  const padL = 44, padB = 22, padT = 12, padR = 10;
  const pw = w - padL - padR, ph = h - padT - padB;
  const nyq = SWEEP_FS / 2;
  const x = f => padL + (f / SWEEP_TO) * pw;
  const y = f => padT + ph - (f / nyq) * ph;

  // axes + guides at Nyquist and fs
  g.strokeStyle = cssVar('--grid');
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(padL, padT); g.lineTo(padL, padT + ph); g.lineTo(padL + pw, padT + ph);
  for (const f of [nyq, SWEEP_FS]) { g.moveTo(x(f) + 0.5, padT); g.lineTo(x(f) + 0.5, padT + ph); }
  g.stroke();

  g.fillStyle = cssVar('--muted');
  g.fillText('0', padL - 14, padT + ph + 4);
  g.fillText('4k', padL - 24, padT + 10);
  for (const f of [0, 4000, 8000, 12000]) g.fillText(f ? `${f / 1000}k` : '0', x(f) - (f ? 8 : 0), h - 6);
  g.fillText('Nyquist', x(nyq) + 4, padT + 12);
  g.fillText('fs', x(SWEEP_FS) + 4, padT + 12);

  // "played" (input) on x, "heard" on y: a triangle that folds at Nyquist
  g.strokeStyle = cssVar('--accent');
  g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i <= 600; i++) {
    const f = (i / 600) * SWEEP_TO;
    const px = x(f), py = y(aliasFrequency(f, SWEEP_FS));
    i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
  }
  g.stroke();

  if (sweepFreq !== null) {
    g.fillStyle = cssVar('--good');
    g.beginPath();
    g.arc(x(sweepFreq), y(aliasFrequency(sweepFreq, SWEEP_FS)), 6, 0, 2 * Math.PI);
    g.fill();
  }
}

function setSweepButton(on) {
  sweepBtn.setAttribute('aria-pressed', String(on));
  if (!on) cancelAnimationFrame(sweepRaf);
}

function sweepFrame() {
  if (audio.mode !== 'sweep') return;
  const p = Math.min((Engine.ctx.currentTime - sweepStart) / SWEEP_SEC, 1);
  sweepFreq = SWEEP_FROM + (SWEEP_TO - SWEEP_FROM) * p;
  $('r-sweep-in').textContent = fmtHz(Math.round(sweepFreq));
  $('r-sweep-out').textContent = fmtHz(Math.round(aliasFrequency(sweepFreq, SWEEP_FS)));
  drawFold();
  if (p < 1) sweepRaf = requestAnimationFrame(sweepFrame);
  else silence();
}

sweepBtn.addEventListener('click', async () => {
  if (audio.mode === 'sweep') { silence(); return; }
  if (!(await ensureChain())) return;
  silence();
  audio.mode = 'sweep';
  setSweepButton(true);
  const now = Engine.ctx.currentTime;
  setChain(SWEEP_FROM, SWEEP_FS);
  audio.voice.frequency.linearRampToValueAtTime(SWEEP_TO, now + SWEEP_SEC);
  Engine.glide(audio.voice.amplitude, LEVEL);
  sweepStart = now;
  sweepRaf = requestAnimationFrame(sweepFrame);
});

// ── Demo 3: predict the alias ───────────────────────────────────────────────
const QUIZ_FS = 8000;
const QUIZ_FREQS = [4500, 5000, 5500, 6000, 6500, 7000, 7500, 9000, 9500, 10000, 11000];
const quiz = { f: 0, answer: 0, answered: false, right: 0, total: 0 };
const fb = $('quiz-feedback');

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function newQuestion() {
  let f;
  do { f = QUIZ_FREQS[Math.floor(Math.random() * QUIZ_FREQS.length)]; } while (f === quiz.f);
  quiz.f = f;
  quiz.answer = aliasFrequency(f, QUIZ_FS);
  quiz.answered = false;

  // Correct answer, the "no aliasing" answer, and two plausible wrong ones.
  const pool = [f - QUIZ_FS / 2, quiz.answer + 1000, quiz.answer - 1000, quiz.answer + 500, quiz.answer - 500]
    .filter(v => v > 0 && v !== quiz.answer && v !== f);
  const options = shuffle([quiz.answer, f, ...shuffle([...new Set(pool)]).slice(0, 2)]);

  $('quiz-freq').textContent = fmtHz(f);
  const box = $('quiz-options');
  box.innerHTML = '';
  for (const v of options) {
    const b = document.createElement('button');
    b.className = 'btn';
    b.type = 'button';
    b.textContent = fmtHz(v);
    b.addEventListener('click', () => answer(v));
    box.appendChild(b);
  }
  fb.textContent = '';
  fb.className = 'quiz-feedback';
}

async function playQuizTone() {
  if (!(await ensureChain())) return;
  silence();
  audio.mode = 'quiz';
  setChain(quiz.f, QUIZ_FS);
  const amp = audio.voice.amplitude;
  const now = Engine.ctx.currentTime;
  amp.setValueAtTime(0, now);
  amp.linearRampToValueAtTime(LEVEL, now + 0.03);
  amp.setValueAtTime(LEVEL, now + 1.2);
  amp.linearRampToValueAtTime(0, now + 1.25);
  setTimeout(() => { if (audio.mode === 'quiz') audio.mode = null; }, 1300);
}

function answer(v) {
  if (quiz.answered) return;
  quiz.answered = true;
  quiz.total++;
  const correct = v === quiz.answer;
  if (correct) quiz.right++;
  fb.className = 'quiz-feedback ' + (correct ? 'right' : 'wrong');
  const why = t({
    en: `${fmtHz(quiz.f)} is ${fmtHz(Math.abs(quiz.f - QUIZ_FS / 2))} ${quiz.f > QUIZ_FS / 2 ? 'above' : 'below'} Nyquist (4 kHz)`,
    zh: `${fmtHz(quiz.f)} 比 Nyquist（4 kHz）${quiz.f > QUIZ_FS / 2 ? '高' : '低'} ${fmtHz(Math.abs(quiz.f - QUIZ_FS / 2))}`,
  });
  fb.textContent = (correct ? t({ en: 'Correct! ', zh: '答對了！' }) : t({ en: `Not quite — it's ${fmtHz(quiz.answer)}. `, zh: `差一點，答案是 ${fmtHz(quiz.answer)}。` }))
    + (quiz.f < QUIZ_FS
      ? why + t({ en: ', so it folds back to ', zh: '，所以折回到 ' }) + fmtHz(quiz.answer) + t({ en: '.', zh: '。' })
      : t({ en: `Above the sample rate it wraps around first: ${fmtHz(quiz.f)} − 8 kHz = ${fmtHz(quiz.answer)}.`, zh: `超過取樣率時會先繞一圈：${fmtHz(quiz.f)} − 8 kHz = ${fmtHz(quiz.answer)}。` }))
    + t({ en: ` Score: ${quiz.right}/${quiz.total}`, zh: ` 得分：${quiz.right}/${quiz.total}` });
  playQuizTone();
}

$('quiz-listen').addEventListener('click', playQuizTone);
$('quiz-next').addEventListener('click', () => { if (audio.mode === 'quiz') silence(); newQuestion(); });

// ── Init ────────────────────────────────────────────────────────────────────
freqSlider.value = freqToSlider(free.freq);
rateSlider.value = free.rateIdx;
updateFree();
drawFold();
newQuestion();

function redrawAll() { drawSampled(); drawFold(); }
window.addEventListener('resize', redrawAll);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redrawAll);
// Readouts contain translated text; refresh them when the language flips.
document.addEventListener('langchange', () => { updateFree(); });
