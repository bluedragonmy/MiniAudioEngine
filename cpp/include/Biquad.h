#pragma once

// 二階 IIR 濾波器（biquad），係數公式來自 Robert Bristow-Johnson 的
// "Audio EQ Cookbook"。DAW 裡大部分的 EQ 頻段都是一個 biquad。
//
//   y[n] = b0·x[n] + b1·x[n-1] + b2·x[n-2] - a1·y[n-1] - a2·y[n-2]
class Biquad
{
public:
    enum class Type { LowPass, HighPass, Peaking, LowShelf, HighShelf };

    Biquad(double sampleRate);

    // freq：截止頻率／中心頻率，q：寬度（0.707 = 最平），gainDb：Peaking/Shelf 用
    void set(Type type, double freq, double q, double gainDb = 0.0);

    // 直接指定係數（已經除以 a0）
    void setCoefficients(double b0, double b1, double b2, double a1, double a2);

    double process(double input);
    void reset();

    double magnitudeAt(double freq) const;

private:
    double sampleRate;
    double b0, b1, b2, a1, a2;
    double x1, x2, y1, y2;
};
