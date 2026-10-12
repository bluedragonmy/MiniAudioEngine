#include "LowPassFilter.h"

#include <cmath>

const double TWO_PI = 6.28318530717958647692;

LowPassFilter::LowPassFilter(double cutoffHz, double sampleRate)
    : sampleRate(sampleRate), alpha(1.0), previousOutput(0.0)
{
    setCutoff(cutoffHz);
}

void LowPassFilter::setCutoff(double cutoffHz)
{
    // alpha 決定 filter 的反應速度
    // alpha 越小 → 反應越慢 → 高頻被壓得越多
    double dt = 1.0 / sampleRate;
    double rc = 1.0 / (TWO_PI * cutoffHz);
    alpha = dt / (rc + dt);
}

double LowPassFilter::process(double input)
{
    // y[n] = alpha * x[n] + (1 - alpha) * y[n-1]
    double output = alpha * input + (1.0 - alpha) * previousOutput;
    previousOutput = output;
    return output;
}

void LowPassFilter::reset()
{
    previousOutput = 0.0;
}

double LowPassFilter::magnitudeAt(double freq) const
{
    // H(z) = alpha / (1 - (1 - alpha) z^-1)，代入 z = e^{jw}
    double w = TWO_PI * freq / sampleRate;
    double b = 1.0 - alpha;
    double re = 1.0 - b * std::cos(w);
    double im = b * std::sin(w);
    return alpha / std::sqrt(re * re + im * im);
}
