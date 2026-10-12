#pragma once

// 取樣後實際聽到的頻率：超過 Nyquist (fs/2) 的頻率會「折回來」
double aliasFrequency(double f, double fs);

// 用 sample-and-hold 模擬較低的取樣率（不加 anti-aliasing filter，
// 所以會產生 aliasing —— 這正是我們想聽到的）
class SampleRateReducer
{
public:
    SampleRateReducer(double hostRate);

    // 要模擬的取樣率，限制在 1 ~ hostRate 之間
    void setTargetRate(double fs);

    double process(double input);

private:
    double hostRate;
    double targetRate;
    double acc;   // 以 hostRate 為單位累加，整數取樣率時沒有浮點誤差
    double held;
};
