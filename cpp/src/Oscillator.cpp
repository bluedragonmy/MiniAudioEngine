#include "Oscillator.h"
#include <cmath>

const double PI = 3.14159265358979323846;

Oscillator::Oscillator(double frequency, double sampleRate)
{
    this->frequency = frequency;
    this->sampleRate = sampleRate;
    this->phase = 0.0;
}

void Oscillator::setFrequency(double freq)
{
    this->frequency = freq;
}

double Oscillator::process()
{
    double sample = std::sin(phase);
    double phaseInc = 2.0 * PI * frequency / sampleRate;
    phase += phaseInc;
    if (phase >= 2.0 * PI) phase -= 2.0 * PI;
    return sample;
}

std::vector<double> Oscillator::generate(int numberOfSamples)
{
    std::vector<double> samples;
    samples.reserve(numberOfSamples);
    for (int n = 0; n < numberOfSamples; n++)
    {
        samples.push_back(process());
    }
    return samples;
}