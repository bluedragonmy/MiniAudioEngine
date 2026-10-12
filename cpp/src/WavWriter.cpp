#include "WavWriter.h"

#include <fstream>
#include <cstdint>

void WavWriter::write(
    const std::string& filename,
    const std::vector<double>& samples,
    double sampleRate,
    int numChannels)
{
    int NUM_CHANNELS   = numChannels;
    int BITS_PER_SAMPLE = 16;     // 16-bit
    int SAMPLE_RATE    = static_cast<int>(sampleRate);
    int NUM_SAMPLES    = static_cast<int>(samples.size() / NUM_CHANNELS);

    // 計算各種大小
    int byteRate   = SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
    int blockAlign = NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
    int dataSize   = NUM_SAMPLES * blockAlign;
    int chunkSize  = 36 + dataSize;

    std::ofstream file(filename, std::ios::binary);

    // --- WAV Header（標頭）---
    file.write("RIFF", 4);
    file.write(reinterpret_cast<char*>(&chunkSize), 4);
    file.write("WAVE", 4);
    file.write("fmt ", 4);

    int subchunk1Size = 16;
    int16_t audioFormat = 1;  // PCM = 1
    file.write(reinterpret_cast<char*>(&subchunk1Size),  4);
    file.write(reinterpret_cast<char*>(&audioFormat),    2);
    int16_t numChannels = NUM_CHANNELS;
    file.write(reinterpret_cast<char*>(&numChannels),    2);
    file.write(reinterpret_cast<char*>(&SAMPLE_RATE),    4);
    file.write(reinterpret_cast<char*>(&byteRate),       4);
    int16_t blockAlignS = blockAlign;
    file.write(reinterpret_cast<char*>(&blockAlignS),    2);
    int16_t bitsPerSample = BITS_PER_SAMPLE;
    file.write(reinterpret_cast<char*>(&bitsPerSample),  2);

    // --- 數據區塊（data chunk）---
    file.write("data", 4);
    file.write(reinterpret_cast<char*>(&dataSize), 4);

    // --- 把 -1.0~+1.0 轉成 16-bit 整數並寫入 ---
    for (double s : samples)
    {
        int16_t pcm = static_cast<int16_t>(s * 32767.0);
        file.write(reinterpret_cast<char*>(&pcm), 2);
    }

    file.close();
}
