#include "WavReader.h"
#include <fstream>
#include <iostream>
#include <cstdint>
#include <cstring>

// 讀一個 little-endian 的 sample，轉成 -1.0 ~ 1.0
static double readSample(std::ifstream& file, int bitsPerSample, bool isFloat)
{
    if (isFloat) {
        float f;
        file.read(reinterpret_cast<char*>(&f), 4);
        return f;
    }
    switch (bitsPerSample) {
        case 8: {
            uint8_t v;
            file.read(reinterpret_cast<char*>(&v), 1);
            return (static_cast<double>(v) - 128.0) / 128.0;   // 8-bit 是無號數
        }
        case 16: {
            int16_t v;
            file.read(reinterpret_cast<char*>(&v), 2);
            return v / 32768.0;
        }
        case 24: {
            uint8_t b[3];
            file.read(reinterpret_cast<char*>(b), 3);
            // 組成 32 位元再右移，讓符號位元正確延伸
            int32_t v = static_cast<int32_t>((uint32_t(b[2]) << 24) | (uint32_t(b[1]) << 16) | (uint32_t(b[0]) << 8)) >> 8;
            return v / 8388608.0;
        }
        case 32: {
            int32_t v;
            file.read(reinterpret_cast<char*>(&v), 4);
            return v / 2147483648.0;
        }
    }
    return 0.0;
}

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

    uint16_t numChannels = 0;
    uint16_t bitsPerSample = 0;
    uint32_t sampleRate = 0;
    bool isFloat = false;
    bool haveFormat = false;

    while (file.read(chunkId, 4)) {
        file.read(reinterpret_cast<char*>(&chunkSize), 4);
        std::string chunkName(chunkId, 4);

        if (chunkName == "fmt ") {
            uint16_t audioFormat;
            uint32_t byteRate;
            uint16_t blockAlign;
            file.read(reinterpret_cast<char*>(&audioFormat), 2);
            file.read(reinterpret_cast<char*>(&numChannels), 2);
            file.read(reinterpret_cast<char*>(&sampleRate), 4);
            file.read(reinterpret_cast<char*>(&byteRate), 4);
            file.read(reinterpret_cast<char*>(&blockAlign), 2);
            file.read(reinterpret_cast<char*>(&bitsPerSample), 2);
            uint32_t consumed = 16;

            // WAVE_FORMAT_EXTENSIBLE：真正的格式寫在後面的 SubFormat GUID 開頭
            if (audioFormat == 0xFFFE && chunkSize >= 40) {
                char ext[24];
                file.read(ext, 24);
                consumed += 24;
                uint16_t sub;
                std::memcpy(&sub, ext + 8, 2);
                audioFormat = sub;
            }
            if (chunkSize > consumed) file.seekg(chunkSize - consumed + (chunkSize & 1), std::ios::cur);

            isFloat = (audioFormat == 3);
            bool supported = (audioFormat == 1 && (bitsPerSample == 8 || bitsPerSample == 16 ||
                                                    bitsPerSample == 24 || bitsPerSample == 32))
                          || (isFloat && bitsPerSample == 32);
            if (!supported || numChannels == 0) {
                std::cerr << "[WavReader] Error: unsupported format (format " << audioFormat
                          << ", " << bitsPerSample << "-bit). Supported: PCM 8/16/24/32, float 32.\n";
                return false;
            }
            haveFormat = true;
        }
        else if (chunkName == "data") {
            if (!haveFormat) {
                std::cerr << "[WavReader] Error: data chunk before fmt chunk.\n";
                return false;
            }
            int numSamples = chunkSize / (numChannels * (bitsPerSample / 8));
            outSamples.assign(numSamples, 0.0);

            for (int i = 0; i < numSamples; ++i) {
                double mixedSample = 0.0;
                for (int ch = 0; ch < numChannels; ++ch) {
                    // Sum channels to mixdown to mono
                    mixedSample += readSample(file, bitsPerSample, isFloat);
                }
                outSamples[i] = mixedSample / numChannels;
            }
            outSampleRate = static_cast<double>(sampleRate);
            return true;
        }
        else {
            // Skip unknown chunk（RIFF 規定奇數長度的 chunk 後面會補一個 byte）
            file.seekg(chunkSize + (chunkSize & 1), std::ios::cur);
        }
    }

    std::cerr << "[WavReader] Error: no data chunk found.\n";
    return false;
}
