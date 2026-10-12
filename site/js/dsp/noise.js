// ============================================================
// Sound Basics · dsp/noise.js
// Port of cpp/src/Noise.cpp (xorshift32). `>>> 0` keeps the state an
// unsigned 32-bit integer, like uint32_t in C++, so both versions
// produce exactly the same numbers for the same seed.
// ============================================================

export class Noise {
  constructor(seed = 1) {
    this.state = (seed >>> 0) === 0 ? 1 : seed >>> 0;
  }

  process() {
    let s = this.state;
    s = (s ^ (s << 13)) >>> 0;
    s = (s ^ (s >>> 17)) >>> 0;
    s = (s ^ (s << 5)) >>> 0;
    this.state = s;
    return (s / 4294967296) * 2 - 1;
  }
}
