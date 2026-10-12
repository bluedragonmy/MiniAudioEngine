#pragma once

class LowPassFilter
{
public:
    LowPassFilter(double cutoffHz, double sampleRate);

    double process(double input);

private:
    double alpha;
    double previousOutput;
};
