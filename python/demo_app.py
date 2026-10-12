import streamlit as st
import numpy as np
import matplotlib.pyplot as plt
import wave
import io

# ─── Page Configuration ───────────────────────────────────────────────────────
st.set_page_config(
    page_title="MiniAudioEngine",
    page_icon="🎛️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ─── Custom CSS ───────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');

html, body, [class*="css"] {
    font-family: 'Inter', sans-serif;
}

.stApp {
    background: linear-gradient(135deg, #07071a 0%, #0f0f2d 100%);
}

section[data-testid="stSidebar"] {
    background: rgba(10, 10, 40, 0.95);
    border-right: 1px solid rgba(108, 99, 255, 0.2);
}

.metric-card {
    background: rgba(108, 99, 255, 0.08);
    border: 1px solid rgba(108, 99, 255, 0.25);
    border-radius: 14px;
    padding: 18px 12px;
    text-align: center;
    margin-bottom: 8px;
}

.metric-value {
    font-size: 1.7rem;
    font-weight: 700;
    color: #a78bfa;
    line-height: 1;
}

.metric-label {
    font-size: 0.72rem;
    color: #666699;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-top: 4px;
}

.section-label {
    font-size: 0.7rem;
    color: #7c6ef0;
    text-transform: uppercase;
    letter-spacing: 2px;
    font-weight: 600;
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid rgba(108,99,255,0.2);
}

h1 {
    font-size: 2.2rem !important;
    font-weight: 800 !important;
    background: linear-gradient(90deg, #818cf8, #a78bfa, #f472b6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0 !important;
}

.subtitle {
    color: #555577;
    font-size: 0.9rem;
    margin-top: -6px;
    margin-bottom: 20px;
}

.stAudio {
    border-radius: 12px;
    overflow: hidden;
}
</style>
""", unsafe_allow_html=True)


# ─── DSP Functions ────────────────────────────────────────────────────────────

def generate_sine(freq: float, sample_rate: int, duration: float) -> np.ndarray:
    """Oscillator: 產生正弦波 PCM samples"""
    n = int(sample_rate * duration)
    t = np.arange(n) / sample_rate
    return np.sin(2.0 * np.pi * freq * t)


def apply_lowpass(samples: np.ndarray, cutoff: float, sample_rate: int) -> np.ndarray:
    """Low-pass Filter: y[n] = alpha*x[n] + (1-alpha)*y[n-1]"""
    dt = 1.0 / sample_rate
    rc = 1.0 / (2.0 * np.pi * cutoff)
    alpha = dt / (rc + dt)

    output = np.zeros_like(samples)
    prev = 0.0
    for i, s in enumerate(samples):
        prev = alpha * s + (1.0 - alpha) * prev
        output[i] = prev
    return output


def normalize(signal: np.ndarray) -> np.ndarray:
    peak = np.max(np.abs(signal))
    return signal / peak if peak > 0 else signal


def to_wav_bytes(samples: np.ndarray, sample_rate: int) -> bytes:
    """把 -1.0~+1.0 的 samples 轉成 WAV bytes"""
    pcm = (np.clip(samples, -1.0, 1.0) * 32767).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        w.writeframes(pcm.tobytes())
    return buf.getvalue()


def compute_fft(samples: np.ndarray, sample_rate: int):
    fft_vals = np.abs(np.fft.rfft(samples)) * 2.0 / len(samples)
    freqs = np.fft.rfftfreq(len(samples), d=1.0 / sample_rate)
    return freqs, fft_vals


# ─── Header ───────────────────────────────────────────────────────────────────
st.markdown("<h1>🎛️ MiniAudioEngine</h1>", unsafe_allow_html=True)
st.markdown(
    "<p class='subtitle'>Interactive DSP playground · Built from scratch in C++ & Python</p>",
    unsafe_allow_html=True
)

# ─── Sidebar ──────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("## ⚙️ Controls")

    SAMPLE_RATE = 44100

    # Oscillator A
    st.markdown('<p class="section-label">Oscillator A</p>', unsafe_allow_html=True)
    freq_a = st.slider("Frequency A (Hz)", 50, 8000, 440, step=10, key="freq_a")
    gain_a = st.slider("Gain A", 0.0, 1.0, 1.0, step=0.05, key="gain_a")

    st.divider()

    # Oscillator B
    st.markdown('<p class="section-label">Oscillator B</p>', unsafe_allow_html=True)
    enable_b = st.toggle("Enable Oscillator B", value=True, key="enable_b")
    freq_b = st.slider("Frequency B (Hz)", 50, 8000, 5000, step=10,
                        disabled=not enable_b, key="freq_b")
    gain_b = st.slider("Gain B", 0.0, 1.0, 0.6, step=0.05,
                        disabled=not enable_b, key="gain_b")

    st.divider()

    # Low-pass Filter
    st.markdown('<p class="section-label">Low-Pass Filter</p>', unsafe_allow_html=True)
    enable_filter = st.toggle("Enable Filter", value=False, key="enable_filter")
    cutoff = st.slider("Cutoff Frequency (Hz)", 100, 8000, 1000, step=50,
                        disabled=not enable_filter, key="cutoff")

    st.divider()

    # Playback settings
    st.markdown('<p class="section-label">Playback</p>', unsafe_allow_html=True)
    duration = st.slider("Duration (seconds)", 0.5, 4.0, 2.0, step=0.5, key="duration")

# ─── Signal Generation ────────────────────────────────────────────────────────
signal_a = generate_sine(freq_a, SAMPLE_RATE, duration) * gain_a

if enable_b:
    signal_b = generate_sine(freq_b, SAMPLE_RATE, duration) * gain_b
    raw_signal = normalize(signal_a + signal_b)
else:
    raw_signal = signal_a

if enable_filter:
    with st.spinner("Applying Low-Pass Filter..."):
        processed_signal = apply_lowpass(raw_signal, cutoff, SAMPLE_RATE)
        # 不做 normalize：保留 filter 壓掉高頻後的音量變化
        # 這樣你才能真正聽出 filter 的效果
else:
    processed_signal = raw_signal

# ─── Metrics Row ──────────────────────────────────────────────────────────────
c1, c2, c3, c4 = st.columns(4)

with c1:
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-value">{freq_a} Hz</div>
        <div class="metric-label">Oscillator A</div>
    </div>""", unsafe_allow_html=True)

with c2:
    b_label = f"{freq_b} Hz" if enable_b else "OFF"
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-value">{b_label}</div>
        <div class="metric-label">Oscillator B</div>
    </div>""", unsafe_allow_html=True)

with c3:
    f_label = f"{cutoff} Hz" if enable_filter else "OFF"
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-value">{f_label}</div>
        <div class="metric-label">Filter Cutoff</div>
    </div>""", unsafe_allow_html=True)

with c4:
    total_samples = int(SAMPLE_RATE * duration)
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-value">{total_samples:,}</div>
        <div class="metric-label">Total Samples</div>
    </div>""", unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# ─── Plots ────────────────────────────────────────────────────────────────────
plt.style.use('dark_background')
fig, axes = plt.subplots(1, 2, figsize=(14, 4))
fig.patch.set_facecolor('#07071a')

GRID_COLOR = '#1a1a44'
SPINE_COLOR = '#2a2a55'
TICK_COLOR = '#666699'
COLOR_BEFORE = '#818cf8'
COLOR_AFTER = '#f472b6'
COLOR_CUTOFF = '#fbbf24'

for ax in axes:
    ax.set_facecolor('#0f0f2d')
    for spine in ax.spines.values():
        spine.set_color(SPINE_COLOR)
    ax.tick_params(colors=TICK_COLOR)
    ax.xaxis.label.set_color(TICK_COLOR)
    ax.yaxis.label.set_color(TICK_COLOR)
    ax.title.set_color('#a78bfa')
    ax.grid(True, color=GRID_COLOR, linestyle='--', linewidth=0.6, alpha=0.7)

# Waveform
display_n = min(int(SAMPLE_RATE * 0.01), len(raw_signal))  # 10ms
t_ms = np.arange(display_n) / SAMPLE_RATE * 1000

axes[0].plot(t_ms, raw_signal[:display_n],
             color=COLOR_BEFORE, linewidth=1.5, alpha=0.85, label='Before Filter')
if enable_filter:
    axes[0].plot(t_ms, processed_signal[:display_n],
                 color=COLOR_AFTER, linewidth=1.8, label='After Filter')
axes[0].set_title('Waveform (10 ms window)', fontsize=11, pad=10)
axes[0].set_xlabel('Time (ms)')
axes[0].set_ylabel('Amplitude')
axes[0].set_ylim(-1.3, 1.3)
axes[0].legend(facecolor='#0f0f2d', edgecolor=SPINE_COLOR,
               labelcolor='#c4c4ee', fontsize=9)

# FFT Spectrum
freqs_raw, fft_raw = compute_fft(raw_signal, SAMPLE_RATE)
axes[1].plot(freqs_raw, fft_raw,
             color=COLOR_BEFORE, linewidth=1.5, alpha=0.85, label='Before Filter')
if enable_filter:
    freqs_proc, fft_proc = compute_fft(processed_signal, SAMPLE_RATE)
    axes[1].plot(freqs_proc, fft_proc,
                 color=COLOR_AFTER, linewidth=1.8, label='After Filter')
    axes[1].axvline(x=cutoff, color=COLOR_CUTOFF, linewidth=1.2,
                    linestyle='--', alpha=0.8, label=f'Cutoff ({cutoff} Hz)')
axes[1].set_title('Frequency Spectrum (FFT)', fontsize=11, pad=10)
axes[1].set_xlabel('Frequency (Hz)')
axes[1].set_ylabel('Magnitude')
axes[1].set_xlim(0, min(10000, SAMPLE_RATE // 2))
axes[1].legend(facecolor='#0f0f2d', edgecolor=SPINE_COLOR,
               labelcolor='#c4c4ee', fontsize=9)

plt.tight_layout(pad=2.0)
st.pyplot(fig)
plt.close()

# ─── Audio Players ────────────────────────────────────────────────────────────
st.markdown("---")
col_l, col_r = st.columns(2)

with col_l:
    st.markdown("**🔵 Before Filter**")
    wav_before = to_wav_bytes(raw_signal, SAMPLE_RATE)
    st.audio(wav_before, format='audio/wav')
    st.download_button("⬇️ Download", wav_before,
                       file_name="before_filter.wav", mime="audio/wav",
                       key="dl_before")

with col_r:
    if enable_filter:
        st.markdown("**🔴 After Low-Pass Filter**")
        wav_after = to_wav_bytes(processed_signal, SAMPLE_RATE)
        st.audio(wav_after, format='audio/wav')
        st.download_button("⬇️ Download", wav_after,
                           file_name="after_filter.wav", mime="audio/wav",
                           key="dl_after")
    else:
        st.markdown("**🎚️ Filter is OFF**")
        st.info("Enable the Low-Pass Filter in the sidebar to hear the difference.")

# ─── Footer ───────────────────────────────────────────────────────────────────
st.markdown("""
<br>
<p style='text-align:center; color:#2a2a55; font-size:0.78rem;'>
    MiniAudioEngine · DSP from scratch · C++ + Python
</p>
""", unsafe_allow_html=True)
