import streamlit as st
import numpy as np
import matplotlib.pyplot as plt
import wave, io

# ── Config ────────────────────────────────────────────────────────────────────
st.set_page_config(page_title="SynthForge", page_icon="🎛️",
                   layout="wide", initial_sidebar_state="expanded")

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap');
html, body, [class*="css"] { font-family: 'Inter', sans-serif; }
.stApp { background: linear-gradient(160deg,#06060f 0%,#0c0c20 100%); }
section[data-testid="stSidebar"] {
    background: rgba(7,7,22,.97) !important;
    border-right: 1px solid rgba(99,102,241,.15);
}
h1 { font-size:2.6rem!important; font-weight:800!important;
     background:linear-gradient(90deg,#6366f1,#a78bfa,#f472b6);
     -webkit-background-clip:text; -webkit-text-fill-color:transparent;
     background-clip:text; }
.sec { font-size:.62rem; font-weight:700; color:#6366f1;
       text-transform:uppercase; letter-spacing:2px;
       border-bottom:1px solid rgba(99,102,241,.2);
       padding-bottom:3px; margin-bottom:6px; }
.mbox { background:rgba(99,102,241,.07); border:1px solid rgba(99,102,241,.2);
        border-radius:12px; padding:12px 8px; text-align:center; }
.mval { font-size:1.4rem; font-weight:700; color:#a78bfa; }
.mlbl { font-size:.62rem; color:#555588; text-transform:uppercase; letter-spacing:1.5px; }
</style>
""", unsafe_allow_html=True)

# ── DSP ───────────────────────────────────────────────────────────────────────
SR = 44100

def make_wave(freq, shape, n):
    t = np.arange(n) / SR
    if shape == "Sine":     return np.sin(2*np.pi*freq*t)
    if shape == "Sawtooth": return 2*((freq*t)%1.0)-1.0
    if shape == "Square":   return np.sign(np.sin(2*np.pi*freq*t))
    return np.zeros(n)

def adsr(sig, atk, dec, sus, rel):
    n = len(sig)
    a,d,r = int(atk*SR), int(dec*SR), int(rel*SR)
    s_len = max(0, n-a-d-r)
    env, i = np.zeros(n), 0
    for seg, start, end in [(a,0.0,1.0),(d,1.0,sus),(s_len,sus,sus),(r,sus,0.0)]:
        seg = min(seg, n-i)
        if seg>0: env[i:i+seg] = np.linspace(start,end,seg)
        i += seg
    return sig*env

def lowpass(sig, cutoff):
    a = (1/SR)/(1/(2*np.pi*cutoff)+1/SR)
    out, p = np.zeros_like(sig), 0.0
    for i,s in enumerate(sig):
        p = a*s+(1-a)*p; out[i]=p
    return out

def mix(parts):
    if not parts: return np.zeros(SR)
    m = np.sum(parts, axis=0)
    pk = np.max(np.abs(m))
    return m/pk if pk>1e-9 else m

def wav_bytes(sig):
    pcm=(np.clip(sig,-1,1)*32767).astype(np.int16)
    b=io.BytesIO()
    with wave.open(b,'wb') as w:
        w.setnchannels(1); w.setsampwidth(2)
        w.setframerate(SR); w.writeframes(pcm.tobytes())
    return b.getvalue()

def fft(sig):
    v=np.abs(np.fft.rfft(sig))*2/len(sig)
    f=np.fft.rfftfreq(len(sig),1/SR)
    return f,v

# ── Presets ───────────────────────────────────────────────────────────────────
PRESETS = {
    "🥁 808 Bass": dict(
        a_on=True,  a_f=55,  a_sh="Sine",     a_g=1.0,
        b_on=False, b_f=110, b_sh="Sine",     b_g=0.0,
        c_on=False, c_f=220, c_sh="Sine",     c_g=0.0,
        fil=False, cut=500,
        atk=0.005, dec=0.4, sus=0.0, rel=0.15, dur=1.0),
    "🎸 Lead Synth": dict(
        a_on=True,  a_f=440, a_sh="Sawtooth", a_g=1.0,
        b_on=True,  b_f=442, b_sh="Sawtooth", b_g=0.5,
        c_on=False, c_f=220, c_sh="Sine",     c_g=0.0,
        fil=True, cut=2000,
        atk=0.02, dec=0.1, sus=0.75, rel=0.3, dur=2.0),
    "🚨 Alarm": dict(
        a_on=True,  a_f=880,  a_sh="Square", a_g=1.0,
        b_on=True,  b_f=1100, b_sh="Square", b_g=0.5,
        c_on=False, c_f=440,  c_sh="Square", c_g=0.0,
        fil=False, cut=3000,
        atk=0.001, dec=0.0, sus=1.0, rel=0.05, dur=2.0),
    "🚀 Sci-Fi": dict(
        a_on=True,  a_f=300, a_sh="Sawtooth", a_g=1.0,
        b_on=True,  b_f=303, b_sh="Sawtooth", b_g=1.0,
        c_on=True,  c_f=150, c_sh="Sine",     c_g=0.3,
        fil=True, cut=2500,
        atk=0.3, dec=0.2, sus=0.8, rel=0.6, dur=3.0),
    "🌊 Chill Pad": dict(
        a_on=True,  a_f=220, a_sh="Sine", a_g=1.0,
        b_on=True,  b_f=330, b_sh="Sine", b_g=0.6,
        c_on=True,  c_f=110, c_sh="Sine", c_g=0.4,
        fil=True, cut=700,
        atk=1.5, dec=0.3, sus=0.7, rel=1.5, dur=4.0),
}

DEFAULTS = dict(
    a_on=True,  a_f=440, a_sh="Sine", a_g=1.0,
    b_on=False, b_f=880, b_sh="Sine", b_g=0.5,
    c_on=False, c_f=220, c_sh="Sine", c_g=0.3,
    fil=False, cut=2000,
    atk=0.01, dec=0.1, sus=0.8, rel=0.3, dur=2.0)

for k,v in DEFAULTS.items():
    if k not in st.session_state:
        st.session_state[k] = v

# ── Header ────────────────────────────────────────────────────────────────────
st.markdown("<h1>🎛️ SynthForge</h1>", unsafe_allow_html=True)
st.markdown("<p style='color:#444466;margin-top:-10px;font-size:.9rem;'>"
            "Browser synthesizer · Built with DSP from scratch</p>",
            unsafe_allow_html=True)

# ── Presets Row ───────────────────────────────────────────────────────────────
st.markdown('<p class="sec">🎼 Presets</p>', unsafe_allow_html=True)
pcols = st.columns(len(PRESETS))
for col, (name, params) in zip(pcols, PRESETS.items()):
    if col.button(name, use_container_width=True):
        st.session_state.update(params)
        st.rerun()

st.divider()

# ── Sidebar ───────────────────────────────────────────────────────────────────
SHAPES = ["Sine", "Sawtooth", "Square"]

with st.sidebar:
    st.markdown("## ⚙️ Controls")

    # Oscillator A
    st.markdown('<p class="sec">Oscillator A</p>', unsafe_allow_html=True)
    st.session_state["a_on"] = st.toggle("Enable A", value=st.session_state["a_on"], key="_a_on")
    st.session_state["a_sh"] = st.selectbox("Shape A", SHAPES,
        index=SHAPES.index(st.session_state["a_sh"]), key="_a_sh")
    st.session_state["a_f"] = st.slider("Frequency A (Hz)", 40, 4000,
        value=int(st.session_state["a_f"]), key="_a_f")
    st.session_state["a_g"] = st.slider("Gain A", 0.0, 1.0,
        value=float(st.session_state["a_g"]), step=0.05, key="_a_g")
    st.divider()

    # Oscillator B
    st.markdown('<p class="sec">Oscillator B</p>', unsafe_allow_html=True)
    st.session_state["b_on"] = st.toggle("Enable B", value=st.session_state["b_on"], key="_b_on")
    st.session_state["b_sh"] = st.selectbox("Shape B", SHAPES,
        index=SHAPES.index(st.session_state["b_sh"]), key="_b_sh",
        disabled=not st.session_state["b_on"])
    st.session_state["b_f"] = st.slider("Frequency B (Hz)", 40, 4000,
        value=int(st.session_state["b_f"]), key="_b_f",
        disabled=not st.session_state["b_on"])
    st.session_state["b_g"] = st.slider("Gain B", 0.0, 1.0,
        value=float(st.session_state["b_g"]), step=0.05, key="_b_g",
        disabled=not st.session_state["b_on"])
    st.divider()

    # Oscillator C
    st.markdown('<p class="sec">Oscillator C</p>', unsafe_allow_html=True)
    st.session_state["c_on"] = st.toggle("Enable C", value=st.session_state["c_on"], key="_c_on")
    st.session_state["c_sh"] = st.selectbox("Shape C", SHAPES,
        index=SHAPES.index(st.session_state["c_sh"]), key="_c_sh",
        disabled=not st.session_state["c_on"])
    st.session_state["c_f"] = st.slider("Frequency C (Hz)", 40, 4000,
        value=int(st.session_state["c_f"]), key="_c_f",
        disabled=not st.session_state["c_on"])
    st.session_state["c_g"] = st.slider("Gain C", 0.0, 1.0,
        value=float(st.session_state["c_g"]), step=0.05, key="_c_g",
        disabled=not st.session_state["c_on"])
    st.divider()

    # Filter
    st.markdown('<p class="sec">Low-Pass Filter</p>', unsafe_allow_html=True)
    st.session_state["fil"] = st.toggle("Enable Filter", value=st.session_state["fil"], key="_fil")
    st.session_state["cut"] = st.slider("Cutoff (Hz)", 100, 8000,
        value=int(st.session_state["cut"]), step=50, key="_cut",
        disabled=not st.session_state["fil"])
    st.divider()

    # ADSR
    st.markdown('<p class="sec">Envelope (ADSR)</p>', unsafe_allow_html=True)
    st.session_state["atk"] = st.slider("Attack (s)",  0.001, 2.0,
        value=float(st.session_state["atk"]), step=0.01, key="_atk")
    st.session_state["dec"] = st.slider("Decay (s)",   0.0,   1.0,
        value=float(st.session_state["dec"]), step=0.01, key="_dec")
    st.session_state["sus"] = st.slider("Sustain",     0.0,   1.0,
        value=float(st.session_state["sus"]), step=0.05, key="_sus")
    st.session_state["rel"] = st.slider("Release (s)", 0.01,  2.0,
        value=float(st.session_state["rel"]), step=0.01, key="_rel")
    st.divider()

    st.markdown('<p class="sec">Playback</p>', unsafe_allow_html=True)
    st.session_state["dur"] = st.slider("Duration (s)", 0.5, 4.0,
        value=float(st.session_state["dur"]), step=0.5, key="_dur")

# ── Read State ────────────────────────────────────────────────────────────────
ss = st.session_state
N = int(SR * ss["dur"])

# ── Generate Signal ───────────────────────────────────────────────────────────
parts = []
if ss["a_on"]: parts.append(make_wave(ss["a_f"], ss["a_sh"], N) * ss["a_g"])
if ss["b_on"]: parts.append(make_wave(ss["b_f"], ss["b_sh"], N) * ss["b_g"])
if ss["c_on"]: parts.append(make_wave(ss["c_f"], ss["c_sh"], N) * ss["c_g"])

signal = mix(parts) if parts else np.zeros(N)
signal = adsr(signal, ss["atk"], ss["dec"], ss["sus"], ss["rel"])

if ss["fil"]:
    with st.spinner("Filtering…"):
        signal = lowpass(signal, ss["cut"])

# ── Metrics ───────────────────────────────────────────────────────────────────
oscs_on = sum([ss["a_on"], ss["b_on"], ss["c_on"]])
m1, m2, m3, m4 = st.columns(4)
for col, val, lbl in [
    (m1, f"{oscs_on} / 3",    "Oscillators"),
    (m2, f"{ss['cut']} Hz" if ss["fil"] else "OFF", "Filter Cutoff"),
    (m3, f"{ss['atk']:.2f}s", "Attack"),
    (m4, f"{N:,}",            "Samples"),
]:
    col.markdown(f'<div class="mbox"><div class="mval">{val}</div>'
                 f'<div class="mlbl">{lbl}</div></div>', unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# ── Plots ─────────────────────────────────────────────────────────────────────
plt.style.use("dark_background")
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 3.8))
fig.patch.set_facecolor("#06060f")

BG, SPINE, GRID = "#0c0c20", "#1e1e44", "#111130"
C1, C2 = "#818cf8", "#f472b6"

for ax in (ax1, ax2):
    ax.set_facecolor(BG)
    for sp in ax.spines.values(): sp.set_color(SPINE)
    ax.tick_params(colors="#555588"); ax.xaxis.label.set_color("#555588")
    ax.yaxis.label.set_color("#555588"); ax.title.set_color("#a78bfa")
    ax.grid(True, color=GRID, linestyle="--", linewidth=.5, alpha=.8)

# Waveform: show 20ms
w20 = min(int(SR*.02), N)
t_ms = np.arange(w20)/SR*1000
ax1.plot(t_ms, signal[:w20], color=C1, linewidth=1.4)
ax1.set_title("Waveform (20 ms)", fontsize=10, pad=8)
ax1.set_xlabel("Time (ms)"); ax1.set_ylabel("Amplitude")
ax1.set_ylim(-1.3, 1.3)

# FFT
freqs, fft_vals = fft(signal)
ax2.plot(freqs, fft_vals, color=C2, linewidth=1.2)
if ss["fil"]:
    ax2.axvline(ss["cut"], color="#fbbf24", linewidth=1,
                linestyle="--", alpha=.8, label=f"Cutoff {ss['cut']} Hz")
    ax2.legend(facecolor=BG, edgecolor=SPINE, labelcolor="#e0e0ff", fontsize=8)
ax2.set_title("Frequency Spectrum (FFT)", fontsize=10, pad=8)
ax2.set_xlabel("Frequency (Hz)"); ax2.set_ylabel("Magnitude")
ax2.set_xlim(0, min(8000, SR//2))

plt.tight_layout(pad=1.5)
st.pyplot(fig)
plt.close()

# ── Audio + Download ───────────────────────────────────────────────────────────
st.divider()
wav = wav_bytes(signal)
ca, cb = st.columns([2, 1])
with ca:
    st.markdown("**🔊 Preview**")
    st.audio(wav, format="audio/wav")
with cb:
    st.download_button("⬇️ Download WAV", wav,
                       file_name="synthforge_output.wav",
                       mime="audio/wav", use_container_width=True)

st.markdown("""<br><p style='text-align:center;color:#1a1a33;font-size:.75rem;'>
SynthForge · DSP from scratch · github.com/yourname/MiniAudioEngine</p>""",
unsafe_allow_html=True)
