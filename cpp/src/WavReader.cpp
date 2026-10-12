#include "WavReader.h"
#include <fstream>
#include <iostream>
#include <cstdint>

bool WavReader::read(
    const std::string& filename,
    std::vector<double>& outSamples,
    double& outSampleRate)
{
    std::ifstream file(filename, std::ios::binary);
    if (!file.is_open()) {
        std::cerr << "[WavReader] Error: Could not open file " << filename << "\n";
        return false;
    }

    char chunkId[4];
    uint32_t chunkSize;
    
    // RIFF chunk
    file.read(chunkId, 4);
    if (std::string(chunkId, 4) != "RIFF") return false;
    file.read(reinterpret_cast<char*>(&chunkSize), 4);
    file.read(chunkId, 4);
    if (std::string(chunkId, 4) != "WAVE") return false;

    int numChannels = 1;
    int bitsPerSample = 16;
    uint32_t sampleRate = 44100;

    while (file.read(chunkId, 4)) {
        file.read(reinterpret_cast<char*>(&chunkSize), 4);
        std::string chunkName(chunkId, 4);
        
        if (chunkName == "fmt ") {
            uint16_t audioFormat;
            file.read(reinterpret_cast<char*>(&audioFormat), 2);
            file.read(reinterpret_cast<char*>(&numChannels), 2);
            file.read(reinterpret_cast<char*>(&sampleRate), 4);
            
            uint32_t byteRate;
            file.read(reinterpret_cast<char*>(&byteRate), 4);
            uint16_t blockAlign;
            file.read(reinterpret_cast<char*>(&blockAlign), 2);
            file.read(reinterpret_cast<char*>(&bitsPerSample), 2);
            
            // Skip any extra format bytes if chunkSize > 16
            if (chunkSize > 16) {
                file.seekg(chunkSize - 16, std::ios::cur);
            }
            if (audioFormat != 1) {
                std::cerr << "[WavReader] Error: Only PCM is supported.\n";
                return false;
            }
        } 
        else if (chunkName == "data") {
            int numSamples = chunkSize / (numChannels * (bitsPerSample / 8));
            outSamples.resize(numSamples, 0.0);
            
            for (int i = 0; i < numSamples; ++i) {
                double mixedSample = 0.0;
                for (int ch = 0; ch < numChannels; ++ch) {
                    double s = 0.0;
                    if (bitsPerSample == 16) {
                        int16_t val;
                        file.read(reinterpret_cast<char*>(&val), 2);
                        s = static_cast<double>(val) / 32768.0;
                    }
                    else if (bitsPerSample == 8) {
                        uint8_t val;
                        file.read(reinterpret_cast<char*>(&val), 1);
                        s = (static_cast<double>(val) - 128.0) / 128.0;
                    }
                    // Sum channels to mixdown to mono
                    mixedSample += s;
                }
                outSamples[i] = mixedSample / numChannels;
            }
            outSampleRate = static_cast<double>(sampleRate);
            break; // Read data, done
        }
        else {
            // Skip unknown chunk
            file.seekg(chunkSize, std::ios::cur);
        }
    }

    return true;
}
