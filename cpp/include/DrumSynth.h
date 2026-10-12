#pragma once

#include "Biquad.h"
#include "Noise.h"

// 三種合成鼓聲。每一種都是「聲音來源 × 衰減包絡」：
//   Kick  = 正弦波，音高從高快速掉到低
//   Snare = 正弦波（鼓皮）+ 高通噪音（響弦）
//   Hat   = 高通噪音，很短
//
// 衰減時間的定義：音量掉到 -60 dB（千分之一）所需的秒數。

class KickVoice
{
public:
    explicit KickVoice(double sampleRate);

    void setParams(double startFreq, double endFreq, double pitchDecay, double ampDecay);
    void trigger(double velocity = 1.0);
    bool isActive() const;
    double process();

private:
    double sampleRate;
    double startFreq, endFreq;
    double pitchCoef, ampCoef;
    double pitchEnv, ampEnv;
    double phase;
    double velocity;
};

class SnareVoice
{
public:
    explicit SnareVoice(double sampleRate, unsigned seed = 1);

    void setParams(double toneFreq, double decay, double noiseMix);
    void trigger(double velocity = 1.0);
    bool isActive() const;
    double process();

private:
    double sampleRate;
    double toneFreq, noiseMix;
    double toneCoef, noiseCoef;
    double toneEnv, noiseEnv;
    double phase;
    double velocity;
    Noise noise;
    Biquad highPass;
};

class HatVoice
{
public:
    explicit HatVoice(double sampleRate, unsigned seed = 2);

    void setParams(double decay, double cutoff);
    void trigger(double velocity = 1.0);
    void choke();   // 立刻快速收掉（closed hat 切掉 open hat 用）
    bool isActive() const;
    double process();

private:
    double sampleRate;
    double ampCoef, chokeCoef;
    double ampEnv;
    bool choking;
    double velocity;
    Noise noise;
    Biquad highPass;
};

// 衰減時間（秒，到 -60 dB）→ 每個取樣要乘的係數
double decayCoefficient(double seconds, double sampleRate);
