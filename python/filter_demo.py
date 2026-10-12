import numpy as np
import matplotlib.pyplot as plt


# =========================
# Settings
# =========================

sample_rate = 48000
duration = 0.02

low_freq = 440
high_freq = 5000

alpha = 0.05


# =========================
# Generate time
# =========================

t = np.arange(
    0,
    duration,
    1 / sample_rate
)


# =========================
# Generate two sine waves
# =========================

low = np.sin(2 * np.pi * low_freq * t)

high = np.sin(2 * np.pi * high_freq * t)


# =========================
# Mix
# =========================

input_signal = low + high


# =========================
# Low-pass filter
# =========================

output_signal = np.zeros_like(input_signal)

previous_output = 0.0

for i in range(len(input_signal)):

    input_sample = input_signal[i]

    output = (
        alpha * input_sample
        + (1 - alpha) * previous_output
    )

    output_signal[i] = output

    previous_output = output


# =========================
# Plot
# =========================

plt.figure()

plt.plot(t, input_signal)

plt.title("Before Filter")

plt.xlabel("Time (seconds)")
plt.ylabel("Amplitude")

plt.show()


plt.figure()

plt.plot(t, output_signal)

plt.title("After Low-pass Filter")

plt.xlabel("Time (seconds)")
plt.ylabel("Amplitude")

plt.show()
# =========================
# FFT
# =========================

def plot_spectrum(signal, title):

    spectrum = np.fft.rfft(signal)

    frequencies = np.fft.rfftfreq(
        len(signal),
        1 / sample_rate
    )

    magnitude = np.abs(spectrum)

    plt.figure()

    plt.plot(frequencies, magnitude)

    plt.xlim(0, 8000)

    plt.title(title)

    plt.xlabel("Frequency (Hz)")
    plt.ylabel("Magnitude")

    plt.show()


plot_spectrum(
    input_signal,
    "Before Filter - Spectrum"
)

plot_spectrum(
    output_signal,
    "After Filter - Spectrum"
)