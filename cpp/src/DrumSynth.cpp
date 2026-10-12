#include "DrumSynth.h"

#include <cmath>

const double TWO_PI = 6.28318530717958647692;
const double SILENT = 1e-4;   // -80 dB 以下當作已經結束

double decayCoefficient(double seconds, double sampleRate)
{
    // 每個取樣乘上 coef，經過 seconds · sampleRate 個取樣後剛好變成 0.001
    if (seconds <= 0.0) return 0.0;
    return std::pow(0.001, 1.0 / (seconds * sampleRate));
}

// ── Kick ─────────────────────────────────────────────────────────────────────

KickVoice::KickVoice(double sampleRate)
    : sampleRate(sampleRate), startFreq(160), endFreq(45),
      pitchCoef(0), ampCoef(0), pitchEnv(0), ampEnv(0), phase(0), velocity(1)
{
    setParams(160, 45, 0.12, 0.5);
}

void KickVoice::setParams(double start, double end, double pitchDecay, double ampDecay)
{
    startFreq = start;
    endFreq = end;
    pitchCoef = decayCoefficient(pitchDecay, sampleRate);
    ampCoef = decayCoefficient(ampDecay, sampleRate);
}

void KickVoice::trigger(double v)
{
    velocity = v;
    pitchEnv = 1.0;
    ampEnv = 1.0;
    phase = 0.0;   // 每次都從 0 開始，打擊感才會一致
}

bool KickVoice::isActive() const { return ampEnv > SILENT; }

double KickVoice::process()
{
    if (!isActive()) return 0.0;
    // 音高 = 終點 + (起點 - 終點) × 音高包絡，包絡從 1 指數掉到 0
    double freq = endFreq + (startFreq - endFreq) * pitchEnv;
    double out = std::sin(phase) * ampEnv * velocity;
    phase += TWO_PI * freq / sampleRate;
    if (phase >= TWO_PI) phase -= TWO_PI;
    pitchEnv *= pitchCoef;
    ampEnv *= ampCoef;
    return out;
}

// ── Snare ────────────────────────────────────────────────────────────────────

SnareVoice::SnareVoice(double sampleRate, unsigned seed)
    : sampleRate(sampleRate), toneFreq(185), noiseMix(0.6),
      toneCoef(0), noiseCoef(0), toneEnv(0), noiseEnv(0), phase(0), velocity(1),
      noise(seed), highPass(sampleRate)
{
    highPass.set(Biquad::Type::HighPass, 1200.0, 0.707);
    setParams(185, 0.2, 0.6);
}

void SnareVoice::setParams(double freq, double decay, double mix)
{
    toneFreq = freq;
    noiseMix = mix;
    toneCoef = decayCoefficient(decay * 0.5, sampleRate);   // 鼓皮比響弦收得快
    noiseCoef = decayCoefficient(decay, sampleRate);
}

void SnareVoice::trigger(double v)
{
    velocity = v;
    toneEnv = 1.0;
    noiseEnv = 1.0;
    phase = 0.0;
}

bool SnareVoice::isActive() const { return toneEnv > SILENT || noiseEnv > SILENT; }

double SnareVoice::process()
{
    if (!isActive()) return 0.0;
    double tone = std::sin(phase) * toneEnv;
    double rattle = highPass.process(noise.process()) * noiseEnv;
    phase += TWO_PI * toneFreq / sampleRate;
    if (phase >= TWO_PI) phase -= TWO_PI;
    toneEnv *= toneCoef;
    noiseEnv *= noiseCoef;
    return ((1.0 - noiseMix) * tone + noiseMix * rattle) * velocity;
}

// ── Hi-hat ───────────────────────────────────────────────────────────────────

HatVoice::HatVoice(double sampleRate, unsigned seed)
    : sampleRate(sampleRate), ampCoef(0), chokeCoef(decayCoefficient(0.01, sampleRate)),
      ampEnv(0), choking(false), velocity(1), noise(seed), highPass(sampleRate)
{
    setParams(0.06, 7000);
}

void HatVoice::setParams(double decay, double cutoff)
{
    ampCoef = decayCoefficient(decay, sampleRate);
    highPass.set(Biquad::Type::HighPass, cutoff, 0.707);
}

void HatVoice::trigger(double v)
{
    velocity = v;
    ampEnv = 1.0;
    choking = false;
}

void HatVoice::choke() { choking = true; }

bool HatVoice::isActive() const { return ampEnv > SILENT; }

double HatVoice::process()
{
    if (!isActive()) return 0.0;
    double out = highPass.process(noise.process()) * ampEnv * velocity;
    ampEnv *= choking ? chokeCoef : ampCoef;
    return out;
}
