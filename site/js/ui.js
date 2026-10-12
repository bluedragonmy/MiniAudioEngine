// ============================================================
// Sound Basics · ui.js
// Small helpers shared by chapter scripts (ES module).
// ============================================================

export const $ = id => document.getElementById(id);
export const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
export const fmtHz = f => (f >= 1000 ? `${+(f / 1000).toFixed(2)} kHz` : `${Math.round(f)} Hz`);
export const fmtDb = d => (d === -Infinity ? '−∞ dB' : `${d.toFixed(1).replace('-', '−')} dB`);
export const toDb = a => (a <= 0 ? -Infinity : 20 * Math.log10(a));

// Map a 0–1000 slider to a frequency on a log scale.
export const logSlider = (min, max) => ({
  toValue: v => min * Math.pow(max / min, v / 1000),
  toSlider: f => 1000 * Math.log(f / min) / Math.log(max / min),
});

// Size a canvas for the device pixel ratio and return a cleared 2D context.
export function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  g.font = `12px ${cssVar('--mono') || 'monospace'}`;
  return { g, w, h };
}

// Draw a waveform (array of samples, roughly −1…1) across the canvas.
export function drawWaveform(canvas, samples, { color = cssVar('--wave'), scale = 1, label } = {}) {
  const { g, w, h } = setupCanvas(canvas);
  const mid = h / 2, amp = (h / 2 - 10) * scale;
  g.strokeStyle = cssVar('--grid');
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, mid + 0.5); g.lineTo(w, mid + 0.5);
  g.stroke();
  g.strokeStyle = color;
  g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i < samples.length; i++) {
    const x = (i / (samples.length - 1)) * w;
    const y = mid - Math.max(-1.2, Math.min(1.2, samples[i])) * amp;
    i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
  }
  g.stroke();
  if (label) {
    g.fillStyle = cssVar('--muted');
    g.fillText(label, 6, h - 6);
  }
}

// Wire a play/stop toggle whose label lives in [lang] spans.
export function setToggleLabel(btn, on, labels = { en: ['▶ Play', '■ Stop'], zh: ['▶ 播放', '■ 停止'] }) {
  btn.setAttribute('aria-pressed', String(on));
  btn.querySelector('[lang="en"]').textContent = labels.en[on ? 1 : 0];
  btn.querySelector('[lang="zh-Hant"]').textContent = labels.zh[on ? 1 : 0];
}

export function showAudioUnavailable() {
  document.querySelectorAll('.audio-unavailable').forEach(el => (el.hidden = false));
}

// Redraw on resize and when the colour scheme flips.
export function onRedraw(fn) {
  window.addEventListener('resize', fn);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', fn);
  document.addEventListener('langchange', fn);
}
