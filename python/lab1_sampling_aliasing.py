import matplotlib
matplotlib.use('Agg')
import numpy as np
import matplotlib.pyplot as plt
import wave
import io

def generate_sine(freq: float, sample_rate: int, duration: float = 1.0) -> tuple[np.ndarray, np.ndarray]:
    """生成特定頻率與採樣率的正弦波，回傳 (時間軸, 訊號數值)"""
    t = np.arange(0, duration, 1.0 / sample_rate)
    signal = np.sin(2.0 * np.pi * freq * t)
    return t, signal

def plot_sampling_rate_experiment():
    """實驗 1A: 觀察不同 Sampling Rate 對 440 Hz 正弦波波形重建的影響"""
    freq = 440.0
    duration = 0.01  # 顯示 10ms (約 4.4 個週期)
    sample_rates = [44100, 8000, 1000, 500]

    fig, axes = plt.subplots(len(sample_rates), 1, figsize=(10, 8), sharex=True)
    fig.suptitle(f"Lab 1A: Sampling Rate Effect on {freq} Hz Sine Wave", fontsize=14, color='#a78bfa')
    plt.style.use('dark_background')

    for ax, sr in zip(axes, sample_rates):
        t, signal = generate_sine(freq, sr, duration)
        nyquist = sr / 2.0
        
        # 畫出連續信號參考線 (用高採樣率模擬)
        t_ref, signal_ref = generate_sine(freq, 44100, duration)
        ax.plot(t_ref * 1000, signal_ref, color='#555588', linestyle='--', alpha=0.5, label='Original Analog Ref')
        
        # 畫出離散採樣點與內插折線
        ax.plot(t * 1000, signal, 'o-', color='#818cf8', linewidth=1.5, markersize=4, label=f'Sampled (Fs={sr}Hz)')
        ax.set_ylabel("Amplitude")
        ax.grid(True, color='#1e1e44', linestyle='--')
        ax.legend(loc="upper right", facecolor='#0f0f2d', edgecolor='#2a2a55', labelcolor='#c4c4ee')
        
        status = "OK" if nyquist > freq else "⚠️ ALIASING DETECTED!"
        ax.set_title(f"Fs = {sr} Hz (Nyquist = {nyquist} Hz) -> {status}", fontsize=10, color='#fbbf24' if nyquist <= freq else '#a78bfa')

    axes[-1].set_xlabel("Time (ms)")
    plt.tight_layout()
    plt.savefig("lab1_sampling_rate.png", dpi=150)
    print("[OK] Saved lab1_sampling_rate.png")
    plt.show()

def plot_aliasing_experiment():
    """實驗 1B: 在固定 Fs = 8000 Hz 下，測試超過 Nyquist (4000 Hz) 的輸入頻率"""
    sr = 8000
    nyquist = sr / 2.0  # 4000 Hz
    duration = 1.0
    input_freqs = [1000, 3000, 5000, 7000]

    fig, axes = plt.subplots(len(input_freqs), 2, figsize=(12, 10))
    fig.suptitle(f"Lab 1B: Aliasing in Spectral Domain (Fs = {sr} Hz, Nyquist = {nyquist} Hz)", fontsize=14, color='#a78bfa')

    for i, fin in enumerate(input_freqs):
        t, signal = generate_sine(fin, sr, duration)
        
        # 時域圖 (前 5ms)
        ax_t = axes[i, 0]
        show_samples = int(0.005 * sr)
        ax_t.plot(t[:show_samples] * 1000, signal[:show_samples], 'o-', color='#f472b6')
        ax_t.set_title(f"Input Freq = {fin} Hz (Time Domain)", fontsize=10, color='#e0e0ff')
        ax_t.set_xlabel("Time (ms)")
        ax_t.set_ylabel("Amplitude")
        ax_t.grid(True, color='#1e1e44', linestyle='--')

        # 頻域 FFT 圖
        ax_f = axes[i, 1]
        fft_vals = np.abs(np.fft.rfft(signal)) * 2.0 / len(signal)
        freqs = np.fft.rfftfreq(len(signal), 1.0 / sr)
        
        # 尋找測得的峰值頻率 (Measured Peak Frequency)
        peak_idx = np.argmax(fft_vals)
        measured_freq = freqs[peak_idx]

        ax_f.plot(freqs, fft_vals, color='#fbbf24', linewidth=1.5)
        ax_f.axvline(nyquist, color='#ef4444', linestyle='--', label=f'Nyquist Limit ({nyquist} Hz)')
        ax_f.set_title(f"Measured Peak: {measured_freq:.0f} Hz (Expected Aliased: {abs(sr - fin) if fin > nyquist else fin} Hz)", 
                       fontsize=10, color='#fbbf24' if fin > nyquist else '#a78bfa')
        ax_f.set_xlabel("Frequency (Hz)")
        ax_f.set_ylabel("Magnitude")
        ax_f.set_xlim(0, nyquist)
        ax_f.grid(True, color='#1e1e44', linestyle='--')
        ax_f.legend(loc="upper right", facecolor='#0f0f2d', edgecolor='#2a2a55', labelcolor='#c4c4ee')

    plt.tight_layout()
    plt.savefig("lab1_aliasing_spectrum.png", dpi=150)
    print("[OK] Saved lab1_aliasing_spectrum.png")
    plt.show()

def generate_chirp_aliasing_wav():
    """實驗 1C: 生成 100 Hz -> 7000 Hz 的 Chirp 音訊（Fs=8000Hz），可聽到頻率折返現象"""
    sr = 8000
    duration = 5.0
    t = np.linspace(0, duration, int(sr * duration))
    
    # 掃頻：100 Hz 到 7000 Hz
    f0, f1 = 100.0, 7000.0
    phase = 2.0 * np.pi * (f0 * t + (f1 - f0) / (2.0 * duration) * (t ** 2))
    chirp = np.sin(phase)
    
    pcm = (np.clip(chirp, -1.0, 1.0) * 32767).astype(np.int16)
    with wave.open("python/chirp_aliasing_demo.wav", 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())
    print("[OK] Generated python/chirp_aliasing_demo.wav (Fs=8000Hz, Sweep 100Hz -> 7000Hz)")

if __name__ == "__main__":
    print("=== MiniAudioEngine DSP Lab 1: Sampling & Aliasing ===")
    plot_sampling_rate_experiment()
    plot_aliasing_experiment()
    generate_chirp_aliasing_wav()
