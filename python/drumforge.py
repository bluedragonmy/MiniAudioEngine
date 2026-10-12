import streamlit as st
import numpy as np
import matplotlib.pyplot as plt
import wave, io

SR = 44100

st.set_page_config(page_title="DrumForge", page_icon="🥁",
                   layout="wide", initial_sidebar_state="collapsed")

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
html,body,[class*="css"]{font-family:'Inter',sans-serif;}
.stApp{background:linear-gradient(160deg,#080810 0%,#0f0f1a 100%);}
h1{font-size:2.4rem!important;font-weight:800!important;
   background:linear-gradient(90deg,#f59e0b,#ef4444,#ec4899);
   -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.drum-desc{color:#44445a;font-size:.85rem;margin-top:-8px;margin-bottom:20px;}
.sec{font-size:.6rem;font-weight:700;color:#f59e0b;text-transform:uppercase;
     letter-spacing:2px;border-bottom:1px solid rgba(245,158,11,.2);
     padding-bottom:3px;margin-bottom:8px;}
.mbox{background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.2);
      border-radius:10px;padding:10px 8px;text-align:center;}
.mval{font-size:1.3rem;font-weight:700;color:#f59e0b;}
.mlbl{font-size:.6rem;color:#44445a;text-transform:uppercase;letter-spacing:1.5px;}
</style>
""", unsafe_allow_html=True)

# ── DSP ───────────────────────────────────────────────────────────────────────
def noise(n):
    return np.random.uniform(-1.0, 1.0, n)

def sine(freq, n):
    return np.sin(2*np.pi*freq*np.arange(n)/SR)

def pitch_drop(f0, f1, sweep_t, n):
    sw = min(int(sweep_t*SR), n)
    fe = np.full(n, f1, dtype=float)
    if sw > 1:
        fe[:sw] = f0 * ((f1/max(f0,1e-9))**(np.arange(sw)/sw))
    return np.sin(2*np.pi*np.cumsum(fe)/SR)

def lp(sig, cut):
    a = (1/SR)/(1/(2*np.pi*cut)+1/SR)
    o,p = np.zeros_like(sig),0.0
    for i,s in enumerate(sig): p=a*s+(1-a)*p; o[i]=p
    return o

def hp(sig, cut):
    a = 1/(2*np.pi*(cut/SR)+1)
    o = np.zeros_like(sig); pi,po = 0.0,0.0
    for i,s in enumerate(sig):
        o[i]=a*(po+s-pi); pi=s; po=o[i]
    return o

def env(sig, atk, dec, sus, rel):
    n=len(sig); a,d,r=int(atk*SR),int(dec*SR),int(rel*SR)
    sl=max(0,n-a-d-r); e,i=np.zeros(n),0
    for sg,v0,v1 in[(a,0.,1.),(d,1.,sus),(sl,sus,sus),(r,sus,0.)]:
        sg=min(sg,n-i)
        if sg>0: e[i:i+sg]=np.linspace(v0,v1,sg)
        i+=sg
    return sig*e

def norm(sig):
    pk=np.max(np.abs(sig)); return sig/pk if pk>1e-9 else sig

def to_wav(sig):
    pcm=(np.clip(norm(sig),-1,1)*32767).astype(np.int16)
    b=io.BytesIO()
    with wave.open(b,'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())
    return b.getvalue()

# ── Drum Makers ───────────────────────────────────────────────────────────────
def make_kick(f0=200, f1=48, sw=0.25, dec=0.5, click=0.3):
    n=int(SR*(dec+0.15))
    body=pitch_drop(f0,f1,sw,n)
    ck=lp(noise(n)*click, 2500)
    return env(body+ck, 0.003, dec, 0.0, 0.08)

def make_snare(tone=190, nz=0.6, dec=0.18, snap=0.5):
    n=int(SR*(dec+0.1))
    t=sine(tone,n)*(1-nz)
    nz_sig=hp(lp(noise(n),7000),1200)*nz
    sk=int(0.004*SR); sn=noise(sk)*snap
    sig=t+nz_sig; sig[:sk]+=sn
    return env(sig,0.001,dec,0.0,0.04)

def make_clhat(dec=0.06, bright=7000):
    n=int(SR*(dec+0.04))
    return env(hp(lp(noise(n),bright*1.5),bright*0.7), 0.001,dec,0.0,0.015)

def make_ophat(dec=0.6, bright=6000):
    n=int(SR*(dec+0.1))
    return env(hp(lp(noise(n),bright*1.5),bright*0.6), 0.003,dec*0.25,0.35,dec*0.75)

def make_clap(layers=3, spread_ms=8, dec=0.28, body=0.4):
    n=int(SR*(dec+0.15))
    sig=np.zeros(n)
    for i in range(max(1,int(layers))):
        off=int(i*spread_ms*0.001*SR)
        bl=int(0.018*SR)
        burst=noise(bl)*(1-i*0.25)
        end=min(off+bl,n); sig[off:end]+=burst[:end-off]
    sig=hp(lp(sig,5000),700)
    if body>0: sig+=env(sine(200,n),0.001,0.05,0.0,0.03)*body*0.25
    return env(sig,0.001,dec,0.0,0.04)

def make_tom(f0=160, f1=65, dec=0.35, punch=0.4):
    n=int(SR*(dec+0.12))
    body=pitch_drop(f0,f1,0.12,n)
    pk=lp(noise(n)*punch*0.25,3500)
    return env(body+pk,0.003,dec,0.0,0.07)

# ── State ─────────────────────────────────────────────────────────────────────
PADS = ["🥁 Kick","🎯 Snare","🔒 Cl.HH","🔓 Op.HH","👏 Clap","🎺 Tom"]
if "pad" not in st.session_state: st.session_state["pad"]="🥁 Kick"

# ── Header ────────────────────────────────────────────────────────────────────
st.markdown("<h1>🥁 DrumForge</h1>", unsafe_allow_html=True)
st.markdown("<p class='drum-desc'>Browser drum synthesizer · Each sound built from scratch with DSP</p>",
            unsafe_allow_html=True)

# ── Pad Buttons ───────────────────────────────────────────────────────────────
pad_cols = st.columns(6)
for col, pad in zip(pad_cols, PADS):
    sel = st.session_state["pad"] == pad
    if col.button(pad, use_container_width=True,
                  type="primary" if sel else "secondary"):
        st.session_state["pad"] = pad
        st.rerun()

st.divider()
pad = st.session_state["pad"]

# ── Parameters ────────────────────────────────────────────────────────────────
if pad == "🥁 Kick":
    st.markdown('<p class="sec">808 Kick — Sine + Pitch Drop</p>', unsafe_allow_html=True)
    c1,c2,c3,c4,c5 = st.columns(5)
    f0   = c1.slider("Pitch Start (Hz)",  50,  500, 200)
    f1   = c2.slider("Pitch End (Hz)",    20,  150,  48)
    sw   = c3.slider("Sweep Time (s)",  0.05, 0.80, 0.25, 0.05)
    dec  = c4.slider("Decay (s)",       0.10, 1.50, 0.50, 0.05)
    clk  = c5.slider("Click",           0.00, 1.00, 0.30, 0.05)
    signal = make_kick(f0,f1,sw,dec,clk)
    info = f"Sine pitch drop {f0}→{f1} Hz in {sw}s · Decay {dec}s"

elif pad == "🎯 Snare":
    st.markdown('<p class="sec">Snare — Tone + White Noise</p>', unsafe_allow_html=True)
    c1,c2,c3,c4 = st.columns(4)
    tone = c1.slider("Tone (Hz)",     80, 400, 190)
    nz   = c2.slider("Noise Mix",    0.0, 1.0, 0.60, 0.05)
    dec  = c3.slider("Decay (s)",   0.05, 0.60, 0.18, 0.01)
    snap = c4.slider("Snap",         0.0, 1.0, 0.50, 0.05)
    signal = make_snare(tone,nz,dec,snap)
    info = f"Tone {tone} Hz + Noise {int(nz*100)}% · Decay {dec}s"

elif pad == "🔒 Cl.HH":
    st.markdown('<p class="sec">Closed Hi-Hat — Filtered Noise Burst</p>', unsafe_allow_html=True)
    c1,c2 = st.columns(2)
    dec    = c1.slider("Decay (s)",    0.01, 0.30, 0.06, 0.01)
    bright = c2.slider("Brightness (Hz)", 2000, 12000, 7000, 500)
    signal = make_clhat(dec,bright)
    info = f"Noise · High-pass {bright} Hz · Decay {dec}s"

elif pad == "🔓 Op.HH":
    st.markdown('<p class="sec">Open Hi-Hat — Sustained Filtered Noise</p>', unsafe_allow_html=True)
    c1,c2 = st.columns(2)
    dec    = c1.slider("Decay (s)",    0.10, 2.00, 0.60, 0.05)
    bright = c2.slider("Brightness (Hz)", 2000, 12000, 6000, 500)
    signal = make_ophat(dec,bright)
    info = f"Noise · High-pass {bright} Hz · Decay {dec}s"

elif pad == "👏 Clap":
    st.markdown('<p class="sec">Clap — Multi-layer Noise Bursts</p>', unsafe_allow_html=True)
    c1,c2,c3,c4 = st.columns(4)
    layers = c1.slider("Layers",      1,   6,   3)
    spread = c2.slider("Spread (ms)", 2,  20,   8)
    dec    = c3.slider("Decay (s)", 0.05, 0.8, 0.28, 0.01)
    body   = c4.slider("Body",      0.0, 1.0, 0.40, 0.05)
    signal = make_clap(layers,spread,dec,body)
    info = f"{layers} layers · {spread}ms spread · Decay {dec}s"

else:  # Tom
    st.markdown('<p class="sec">Tom — Pitched Sine + Pitch Drop</p>', unsafe_allow_html=True)
    c1,c2,c3,c4 = st.columns(4)
    f0  = c1.slider("Pitch Start (Hz)",  60, 400, 160)
    f1  = c2.slider("Pitch End (Hz)",    20, 120,  65)
    dec = c3.slider("Decay (s)",       0.10, 1.0, 0.35, 0.05)
    punch = c4.slider("Punch",         0.0, 1.0, 0.40, 0.05)
    signal = make_tom(f0,f1,dec,punch)
    info = f"Pitch {f0}→{f1} Hz · Decay {dec}s"

# ── Visualization ─────────────────────────────────────────────────────────────
plt.style.use("dark_background")
fig,(ax1,ax2)=plt.subplots(1,2,figsize=(13,3.2))
fig.patch.set_facecolor("#080810")
BG,SP,GR="#0f0f1a","#1e1e33","#111128"
CA,CB="#f59e0b","#ef4444"

for ax in(ax1,ax2):
    ax.set_facecolor(BG)
    for s in ax.spines.values(): s.set_color(SP)
    ax.tick_params(colors="#444466")
    ax.xaxis.label.set_color("#444466"); ax.yaxis.label.set_color("#444466")
    ax.title.set_color("#f59e0b")
    ax.grid(True,color=GR,linestyle="--",linewidth=.5,alpha=.7)

sig_n = norm(signal)
t_ms = np.arange(len(sig_n))/SR*1000
ax1.plot(t_ms,sig_n,color=CA,linewidth=1.2)
ax1.set_title(f"Waveform · {pad}",fontsize=10,pad=6)
ax1.set_xlabel("Time (ms)"); ax1.set_ylabel("Amplitude")
ax1.set_ylim(-1.3,1.3)

fv=np.abs(np.fft.rfft(sig_n))*2/len(sig_n)
ff=np.fft.rfftfreq(len(sig_n),1/SR)
ax2.plot(ff,fv,color=CB,linewidth=1.1)
ax2.set_title("Frequency Spectrum (FFT)",fontsize=10,pad=6)
ax2.set_xlabel("Frequency (Hz)"); ax2.set_ylabel("Magnitude")
ax2.set_xlim(0,min(12000,SR//2))

plt.tight_layout(pad=1.2)
st.pyplot(fig); plt.close()

# ── Info Metrics ──────────────────────────────────────────────────────────────
st.caption(f"🔬 {info} · {len(signal):,} samples · {len(signal)/SR:.2f}s")

# ── Audio + Download ───────────────────────────────────────────────────────────
st.divider()
wav = to_wav(signal)
cl, cr = st.columns([2,1])
with cl:
    st.markdown("**🔊 Preview**")
    st.audio(wav, format="audio/wav")
with cr:
    fname = pad.split()[-1].lower().replace(".","") + ".wav"
    st.download_button("⬇️ Download WAV", wav,
                       file_name=fname, mime="audio/wav",
                       use_container_width=True)

st.markdown("""<br><p style='text-align:center;color:#11112a;font-size:.72rem;'>
DrumForge · Drum synthesis from scratch · MiniAudioEngine</p>""",
unsafe_allow_html=True)
