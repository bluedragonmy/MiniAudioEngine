#include "Oscillator.h"
#include "WavWriter.h"
#include "LowPassFilter.h"

#include <iostream>
#include <vector>

int main()
{
    const double sampleRate = 44100.0;
    const double duration   = 2.0;
    const int    numSamples = static_cast<int>(sampleRate * duration);

    // --- Oscillator A: 440 Hz（低頻）---
    Oscillator oscA(440.0, sampleRate);
    std::vector<double> samplesA = oscA.generate(numSamples);

    // --- Oscillator B: 5000 Hz（高頻，刺耳）---
    Oscillator oscB(5000.0, sampleRate);
    std::vector<double> samplesB = oscB.generate(numSamples);

    // --- Mix: 兩個加在一起，各乘 0.5 避免超過範圍 ---
    std::vector<double> mixed(numSamples);
    for (int i = 0; i < numSamples; i++)
    {
        mixed[i] = (samplesA[i] + samplesB[i]) * 0.5;
    }

    // --- 寫出 Filter 前的 WAV ---
    WavWriter::write("output/before_filter.wav", mixed, sampleRate);
    std::cout << "[OK] output/before_filter.wav (440 Hz + 5000 Hz)\n";

    // --- Low-pass Filter，cutoff = 1000 Hz ---
    // 低於 1000 Hz 的頻率通過，高於的被壓掉
    LowPassFilter filter(1000.0, sampleRate);

    std::vector<double> filtered(numSamples);
    for (int i = 0; i < numSamples; i++)
    {
        filtered[i] = filter.process(mixed[i]);
    }

    // --- 寫出 Filter 後的 WAV ---
    WavWriter::write("output/after_filter.wav", filtered, sampleRate);
    std::cout << "[OK] output/after_filter.wav  (5000 Hz 被壓掉)\n";

    return 0;
}
