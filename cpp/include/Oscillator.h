#pragma once

#include <vector>

class Oscillator
{
public:
    Oscillator(double frequency, double sampleRate);

    std::vector<double> generate(int numberOfSamples);
    
    void setFrequency(double freq);
    double process();

private:
    double frequency;
    double sampleRate;
    double phase;
};