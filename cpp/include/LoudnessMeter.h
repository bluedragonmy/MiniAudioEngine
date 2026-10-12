#pragma once

#include "Biquad.h"

#include <vector>

// 響度表（ITU-R BS.1770 / EBU R128），單聲道或立體聲。
// 串流平台（Spotify、YouTube…）就是用這個 LUFS 數字來調整歌曲音量。
//
// 流程：K-weighting 濾波（模擬人耳）→ 取平方平均 → 換算成 LUFS
//   LUFS = -0.691 + 10·log10(平方平均)
class LoudnessMeter
{
public:
    explicit LoudnessMeter(double sampleRate);

    void process(double input);                     // 單聲道
    void processStereo(double left, double right);  // 立體聲：左右能量相加
    void reset();

    double momentary() const;    // 最近 400 ms
    double shortTerm() const;    // 最近 3 s
    double integrated() const;   // 從頭到現在，含 gating

private:
    double sampleRate;
    Biquad shelf;      // 第 1 段：高頻架（耳朵對 2 kHz 以上比較敏感）
    Biquad highPass;   // 第 2 段：濾掉 ~40 Hz 以下（耳朵對極低頻不敏感）
    Biquad shelfR, highPassR;   // 右聲道用的同一組濾波器

    int samplesPerBlock;              // 100 ms
    int blockCount;                   // 目前這個 100 ms 已累積幾個取樣
    double blockSum;                  // 目前這個 100 ms 的平方和
    std::vector<double> blocks;       // 每個完整 100 ms 的平方平均
    std::vector<double> gatingBlocks; // 每 100 ms 一個、長 400 ms 的區塊（重疊 75%）

    double meanOfLast(int n) const;
    void addEnergy(double energy);
};

// 平方平均 → LUFS
double toLufs(double meanSquare);
