#pragma once

#include <cstdint>

// 白噪音（xorshift32 亂數）。同一個 seed 每次都產生同一串數字，
// 所以 C++ 和 JS 版本可以用同一組測試互相比對。
class Noise
{
public:
    explicit Noise(uint32_t seed = 1);

    // -1.0 ~ 1.0
    double process();

private:
    uint32_t state;
};
