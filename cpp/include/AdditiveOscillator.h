#pragma once

// 用一堆正弦波（泛音）疊出鋸齒波、方波、三角波。
// 只疊 Nyquist 以下的泛音，所以不會產生 aliasing（band-limited）。
class AdditiveOscillator
{
public:
    enum class Shape { Sine, Saw, Square, Triangle };

    AdditiveOscillator(double frequency, double sampleRate);

    void setFrequency(double freq);
    void setShape(Shape newShape);
    void setMaxHarmonics(int n);   // 最多疊幾個泛音

    // 第 k 個泛音（k 從 1 開始）的振幅，正負號代表相位
    static double harmonicAmplitude(Shape shape, int k);

    // 實際會疊進去的泛音數（受 maxHarmonics 和 Nyquist 限制）
    int activeHarmonics() const;

    double process();

private:
    double frequency;
    double sampleRate;
    double phase;
    Shape shape;
    int maxHarmonics;
};
