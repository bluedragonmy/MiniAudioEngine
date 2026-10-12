#pragma once

#include <string>
#include <vector>

class WavReader
{
public:
    // 讀取 WAV 檔案。若檔案為多聲道，預設會將其 Mixdown 轉為單聲道儲存
    // (為了方便後續當成 Sampler 音源，我們統一轉為單聲道 buffer 儲存)
    static bool read(
        const std::string& filename,
        std::vector<double>& outSamples,
        double& outSampleRate
    );
};
