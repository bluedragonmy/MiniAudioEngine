#include "SampleRateReducer.h"

#include <algorithm>
#include <cmath>

double aliasFrequency(double f, double fs)
{
    f = std::fabs(f);
    double r = std::fmod(f, fs);
    if (r <= fs / 2) return r;
    return fs - r;
}

SampleRateReducer::SampleRateReducer(double hostRate)
    : hostRate(hostRate), targetRate(hostRate), acc(hostRate), held(0.0)
{
}

void SampleRateReducer::setTargetRate(double fs)
{
    targetRate = std::max(1.0, std::min(fs, hostRate));
}

double SampleRateReducer::process(double input)
{
    // 先判斷：累加器滿了就取新的值
    if (acc >= hostRate) {
        held = input;
        acc -= hostRate;
    }
    // 再累加
    acc += targetRate;
    return held;
}
