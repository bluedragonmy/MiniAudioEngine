#pragma once

// 一階 RC 低通濾波器：y[n] = alpha * x[n] + (1 - alpha) * y[n-1]
// 斜率 -6 dB/octave
class LowPassFilter
{
public:
    LowPassFilter(double cutoffHz, double sampleRate);

    void setCutoff(double cutoffHz);
    double process(double input);
    void reset();

    // 頻率響應：輸入 freq 的正弦波，輸出振幅是輸入的幾倍
    double magnitudeAt(double freq) const;

private:
    double sampleRate;
    double alpha;
    double previousOutput;
};
