#include "LoudnessMeter.h"

#include <cmath>

const double PI = 3.14159265358979323846;

double toLufs(double meanSquare)
{
    if (meanSquare <= 0.0) return -INFINITY;
    return -0.691 + 10.0 * std::log10(meanSquare);
}

LoudnessMeter::LoudnessMeter(double sampleRate)
    : sampleRate(sampleRate), shelf(sampleRate), highPass(sampleRate),
      shelfR(sampleRate), highPassR(sampleRate),
      samplesPerBlock(static_cast<int>(std::lround(sampleRate * 0.1))),
      blockCount(0), blockSum(0.0)
{
    // K-weighting 係數。BS.1770 只給了 48 kHz 的數字，這裡用和 libebur128
    // 相同的類比原型公式，換算成任意取樣率（48 kHz 時與標準完全一致）。

    // 第 1 段：high shelf，約 +4 dB
    {
        double f0 = 1681.974450955533;
        double G = 3.999843853973347;
        double Q = 0.7071752369554196;
        double K = std::tan(PI * f0 / sampleRate);
        double Vh = std::pow(10.0, G / 20.0);
        double Vb = std::pow(Vh, 0.4996667741545416);
        double a0 = 1.0 + K / Q + K * K;
        shelf.setCoefficients(
            (Vh + Vb * K / Q + K * K) / a0,
            2.0 * (K * K - Vh) / a0,
            (Vh - Vb * K / Q + K * K) / a0,
            2.0 * (K * K - 1.0) / a0,
            (1.0 - K / Q + K * K) / a0);
    }
    // 第 2 段：high-pass（RLB weighting）
    {
        double f0 = 38.13547087602444;
        double Q = 0.5003270373238773;
        double K = std::tan(PI * f0 / sampleRate);
        double a0 = 1.0 + K / Q + K * K;
        highPass.setCoefficients(
            1.0, -2.0, 1.0,
            2.0 * (K * K - 1.0) / a0,
            (1.0 - K / Q + K * K) / a0);
    }
    shelfR = shelf;
    highPassR = highPass;
}

void LoudnessMeter::reset()
{
    shelf.reset();
    highPass.reset();
    shelfR.reset();
    highPassR.reset();
    blockCount = 0;
    blockSum = 0.0;
    blocks.clear();
    gatingBlocks.clear();
}

void LoudnessMeter::process(double input)
{
    double y = highPass.process(shelf.process(input));
    addEnergy(y * y);
}

void LoudnessMeter::processStereo(double left, double right)
{
    // BS.1770：左右聲道的權重都是 1.0，能量直接相加
    double yl = highPass.process(shelf.process(left));
    double yr = highPassR.process(shelfR.process(right));
    addEnergy(yl * yl + yr * yr);
}

void LoudnessMeter::addEnergy(double energy)
{
    blockSum += energy;
    if (++blockCount < samplesPerBlock) return;

    // 滿 100 ms：存起來
    blocks.push_back(blockSum / samplesPerBlock);
    blockCount = 0;
    blockSum = 0.0;

    // 每 100 ms 產生一個 400 ms 的 gating 區塊
    if (blocks.size() >= 4) gatingBlocks.push_back(meanOfLast(4));
}

double LoudnessMeter::meanOfLast(int n) const
{
    int count = static_cast<int>(blocks.size());
    if (count == 0) return 0.0;
    if (n > count) n = count;
    double sum = 0.0;
    for (int i = count - n; i < count; i++) sum += blocks[i];
    return sum / n;
}

double LoudnessMeter::momentary() const { return toLufs(meanOfLast(4)); }
double LoudnessMeter::shortTerm() const { return toLufs(meanOfLast(30)); }

double LoudnessMeter::integrated() const
{
    // 1) 絕對 gate：-70 LUFS 以下的區塊（幾乎無聲）不算
    double sum = 0.0;
    int n = 0;
    for (double b : gatingBlocks) {
        if (toLufs(b) > -70.0) { sum += b; n++; }
    }
    if (n == 0) return -INFINITY;

    // 2) 相對 gate：比第 1 步的平均再小 10 LU 的區塊也不算
    double relativeGate = toLufs(sum / n) - 10.0;
    double sum2 = 0.0;
    int n2 = 0;
    for (double b : gatingBlocks) {
        double l = toLufs(b);
        if (l > -70.0 && l > relativeGate) { sum2 += b; n2++; }
    }
    return n2 == 0 ? -INFINITY : toLufs(sum2 / n2);
}
