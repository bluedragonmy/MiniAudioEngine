#pragma once

#include <string>
#include <vector>

class WavWriter
{
public:
    static void write(
        const std::string& filename,
        const std::vector<double>& samples,
        double sampleRate,
        int numChannels = 1
    );
};
