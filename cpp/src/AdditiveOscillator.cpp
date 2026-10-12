#include "AdditiveOscillator.h"

#include <cmath>

const double PI = 3.14159265358979323846;

AdditiveOscillator::AdditiveOscillator(double frequency, double sampleRate)
    : frequency(frequency), sampleRate(sampleRate), phase(0.0),
      shape(Shape::Saw), maxHarmonics(32)
{
}

void AdditiveOscillator::setFrequency(double freq) { frequency = freq; }
void AdditiveOscillator::setShape(Shape newShape) { shape = newShape; }
void AdditiveOscillator::setMaxHarmonics(int n) { maxHarmonics = n < 1 ? 1 : n; }

double AdditiveOscillator::harmonicAmplitude(Shape shape, int k)
{
    switch (shape) {
        case Shape::Sine:
            return k == 1 ? 1.0 : 0.0;
        case Shape::Saw:
            // (2/π) · (-1)^(k+1) / k，所有泛音
            return (2.0 / PI) * ((k % 2 == 1) ? 1.0 : -1.0) / k;
        case Shape::Square:
            // (4/π) / k，只有奇數泛音
            return (k % 2 == 1) ? (4.0 / PI) / k : 0.0;
        case Shape::Triangle:
            // (8/π²) · (-1)^((k-1)/2) / k²，只有奇數泛音，衰減得比方波快
            if (k % 2 == 0) return 0.0;
            return (8.0 / (PI * PI)) * (((k - 1) / 2) % 2 == 0 ? 1.0 : -1.0) / (double(k) * k);
    }
    return 0.0;
}

int AdditiveOscillator::activeHarmonics() const
{
    // 第 k 個泛音的頻率是 k · frequency，要小於 Nyquist
    int byNyquist = static_cast<int>(std::ceil((sampleRate / 2.0) / frequency)) - 1;
    return byNyquist < maxHarmonics ? byNyquist : maxHarmonics;
}

double AdditiveOscillator::process()
{
    double sample = 0.0;
    int n = activeHarmonics();
    for (int k = 1; k <= n; k++) {
        double a = harmonicAmplitude(shape, k);
        if (a != 0.0) sample += a * std::sin(k * phase);
    }
    phase += 2.0 * PI * frequency / sampleRate;
    if (phase >= 2.0 * PI) phase -= 2.0 * PI;
    return sample;
}
