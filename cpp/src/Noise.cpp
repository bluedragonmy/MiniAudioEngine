#include "Noise.h"

Noise::Noise(uint32_t seed)
    : state(seed == 0 ? 1 : seed)   // xorshift 的 state 不能是 0
{
}

double Noise::process()
{
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return (state / 4294967296.0) * 2.0 - 1.0;
}
