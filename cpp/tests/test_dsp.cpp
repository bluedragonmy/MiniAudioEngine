// Tests for the DSP used by chapters 3–7.
// Build & run (from the repo root):
//   sh cpp/tests/run_tests.sh
//
// Every case here is mirrored in site/js/dsp/dsp.test.mjs.

#include "ADSR.h"
#include "AdditiveOscillator.h"
#include "Biquad.h"
#include "DrumSynth.h"
#include "LoudnessMeter.h"
#include "LowPassFilter.h"
#include "Noise.h"

#include <cmath>
#include <cstdio>
#include <functional>

const double PI = 3.14159265358979323846;
const double SR = 48000.0;

static int failures = 0;

static void check(const char* name, bool ok, double got)
{
    if (!ok) failures++;
    std::printf("%-48s %12.5f  %s\n", name, got, ok ? "OK" : "WRONG");
}

static bool near(double a, double b, double tol) { return std::fabs(a - b) <= tol; }

// 讓 freq 的正弦波通過 filter 1 秒，回傳最後 100 ms 的峰值（= 穩態增益）
static double measuredGain(const std::function<double(double)>& filter, double freq)
{
    double peak = 0.0;
    int n = static_cast<int>(SR);
    for (int i = 0; i < n; i++) {
        double y = filter(std::sin(2 * PI * freq * i / SR));
        if (i > n - SR / 10 && std::fabs(y) > peak) peak = std::fabs(y);
    }
    return peak;
}

int main()
{
    // ── LowPassFilter (1-pole) ───────────────────────────────────────────────
    {
        LowPassFilter lp(1000, SR);
        double predicted = lp.magnitudeAt(1000);
        double measured = measuredGain([&](double x) { return lp.process(x); }, 1000);
        // 這種 RC 離散化在 cutoff 不是剛好 -3 dB（約 -3.3 dB），是近似值
        check("1-pole: gain at cutoff ~ -3 dB", near(20 * std::log10(predicted), -3.0, 0.5), 20 * std::log10(predicted));
        check("1-pole: measured matches magnitudeAt", near(measured, predicted, 0.002), measured);
        // 斜率要在遠離 Nyquist 的地方量，靠近 Nyquist 時離散濾波器會變形
        LowPassFilter lp2(100, SR);
        double g1k = lp2.magnitudeAt(1000), g2k = lp2.magnitudeAt(2000);
        check("1-pole: ~6 dB per octave above cutoff", near(20 * std::log10(g1k / g2k), 6.0, 0.5), 20 * std::log10(g1k / g2k));
    }

    // ── Biquad ───────────────────────────────────────────────────────────────
    {
        Biquad lp(SR);
        lp.set(Biquad::Type::LowPass, 1000, 0.7071);
        check("biquad LP: -3 dB at cutoff (Q=0.707)", near(20 * std::log10(lp.magnitudeAt(1000)), -3.01, 0.05), 20 * std::log10(lp.magnitudeAt(1000)));
        Biquad lp200(SR);
        lp200.set(Biquad::Type::LowPass, 200, 0.7071);
        double slope = 20 * std::log10(lp200.magnitudeAt(2000) / lp200.magnitudeAt(4000));
        check("biquad LP: ~12 dB per octave", near(slope, 12.0, 0.5), slope);
        double measured = measuredGain([&](double x) { return lp.process(x); }, 2000);
        check("biquad LP: measured matches magnitudeAt", near(measured, lp.magnitudeAt(2000), 0.002), measured);

        Biquad hp(SR);
        hp.set(Biquad::Type::HighPass, 100, 0.7071);
        check("biquad HP: passes 5 kHz", near(hp.magnitudeAt(5000), 1.0, 0.01), hp.magnitudeAt(5000));
        check("biquad HP: cuts 25 Hz by > 20 dB", 20 * std::log10(hp.magnitudeAt(25)) < -20, 20 * std::log10(hp.magnitudeAt(25)));

        Biquad pk(SR);
        pk.set(Biquad::Type::Peaking, 60, 1.0, -6.0);
        check("biquad peak: -6 dB at center", near(20 * std::log10(pk.magnitudeAt(60)), -6.0, 0.01), 20 * std::log10(pk.magnitudeAt(60)));
        check("biquad peak: 0 dB far away (2 kHz)", near(20 * std::log10(pk.magnitudeAt(2000)), 0.0, 0.05), 20 * std::log10(pk.magnitudeAt(2000)));
    }

    // ── AdditiveOscillator ───────────────────────────────────────────────────
    {
        // Fourier 級數在 x = π/2（四分之一週期）的已知值
        auto valueAtQuarter = [](AdditiveOscillator::Shape s) {
            AdditiveOscillator o(1.0, 4.0 * 100000);  // f=1 Hz：泛音不受 Nyquist 限制
            o.setShape(s);
            o.setMaxHarmonics(2001);
            for (int i = 0; i < 100000; i++) o.process();  // 走到 1/4 週期
            return o.process();
        };
        double saw = valueAtQuarter(AdditiveOscillator::Shape::Saw);
        double sq = valueAtQuarter(AdditiveOscillator::Shape::Square);
        double tri = valueAtQuarter(AdditiveOscillator::Shape::Triangle);
        check("additive saw at 1/4 cycle = 0.5", near(saw, 0.5, 0.01), saw);
        check("additive square at 1/4 cycle = 1", near(sq, 1.0, 0.01), sq);
        check("additive triangle at 1/4 cycle = 1", near(tri, 1.0, 0.01), tri);

        AdditiveOscillator o(5000, SR);
        check("band-limit: 5 kHz @ 48k keeps 4 harmonics", o.activeHarmonics() == 4, o.activeHarmonics());
        AdditiveOscillator o2(6000, SR);
        check("band-limit: 6 kHz excludes harmonic at Nyquist", o2.activeHarmonics() == 3, o2.activeHarmonics());
        AdditiveOscillator o3(100, SR);
        o3.setMaxHarmonics(16);
        check("maxHarmonics caps the count", o3.activeHarmonics() == 16, o3.activeHarmonics());
    }

    // ── Noise ────────────────────────────────────────────────────────────────
    {
        Noise n(1);
        double first = n.process();
        double second = n.process();
        check("noise seed 1: 1st value", near(first, -0.99987410, 1e-8), first);
        check("noise seed 1: 2nd value", near(second, -0.96850514, 1e-8), second);
        Noise m(12345);
        double sum = 0, sumSq = 0;
        for (int i = 0; i < 100000; i++) { double v = m.process(); sum += v; sumSq += v * v; }
        check("noise: mean ~ 0", near(sum / 100000, 0.0, 0.01), sum / 100000);
        check("noise: variance ~ 1/3 (uniform)", near(sumSq / 100000, 1.0 / 3.0, 0.01), sumSq / 100000);
    }

    // ── Drums ────────────────────────────────────────────────────────────────
    {
        KickVoice kick(SR);
        kick.setParams(160, 45, 0.12, 0.5);
        kick.trigger();
        // 數過零點：前 50 ms 的音高應該比 250–300 ms 高
        auto crossings = [&](int from, int to) {
            int c = 0; double prev = 0;
            for (int i = from; i < to; i++) {
                double v = kick.process();
                if (i > from && ((prev < 0) != (v < 0))) c++;
                prev = v;
            }
            return c;
        };
        int early = crossings(0, 2400);            // 0–50 ms
        crossings(2400, 12000);                    // skip to 250 ms
        int late = crossings(12000, 14400);        // 250–300 ms
        check("kick: pitch drops (early crossings > late)", early > late, early - late);
        int n = 0;
        while (kick.isActive() && n < SR * 2) { kick.process(); n++; }
        check("kick: falls silent after ~decay time", !kick.isActive() && n < SR * 0.7, (n + 14400) / SR);

        SnareVoice a(SR, 7), b(SR, 7);
        a.trigger(); b.trigger();
        bool same = true; double peak = 0;
        for (int i = 0; i < 4800; i++) {
            double va = a.process(), vb = b.process();
            if (va != vb) same = false;
            if (std::fabs(va) > peak) peak = std::fabs(va);
        }
        check("snare: same seed -> identical output", same, same);
        check("snare: peak within [-1, 1]", peak <= 1.0, peak);

        HatVoice hat(SR);
        hat.setParams(0.5, 7000);
        hat.trigger();
        for (int i = 0; i < 480; i++) hat.process();
        hat.choke();
        int m = 0;
        while (hat.isActive() && m < SR) { hat.process(); m++; }
        check("hat: choke silences within 20 ms", m < SR * 0.02, m / SR);

        double c1 = decayCoefficient(0.5, SR);
        check("decayCoefficient reaches -60 dB at t", near(std::pow(c1, 0.5 * SR), 0.001, 1e-9), std::pow(c1, 0.5 * SR));
    }

    // ── ADSR ─────────────────────────────────────────────────────────────────
    {
        ADSR env;
        env.setSampleRate(SR);
        env.setParameters(0.01, 0.1, 0.5, 0.2);
        env.noteOn();
        double v = 0;
        for (int i = 0; i < 480; i++) v = env.process();              // 10 ms attack
        check("adsr: peak 1.0 after attack", near(v, 1.0, 1e-6), v);
        for (int i = 0; i < 4800 + 10; i++) v = env.process();         // 100 ms decay
        check("adsr: holds sustain 0.5", near(v, 0.5, 1e-6), v);
        env.noteOff();
        int r = 0;
        while (env.isActive() && r < SR) { env.process(); r++; }
        check("adsr: release ends after ~200 ms", near(r / SR, 0.2, 0.002), r / SR);

        ADSR instant;
        instant.setSampleRate(SR);
        instant.setParameters(0.0, 0.0, 0.3, 0.1);
        instant.noteOn();
        for (int i = 0; i < 10; i++) v = instant.process();
        check("adsr: decay 0 jumps to sustain", near(v, 0.3, 1e-9), v);
    }

    // ── LoudnessMeter (BS.1770) ──────────────────────────────────────────────
    {
        // 標準規定：997 Hz、0 dBFS 正弦波 → -3.01 LUFS
        auto sineLufs = [](double amp, double sr) {
            LoudnessMeter m(sr);
            for (int i = 0; i < sr * 5; i++) m.process(amp * std::sin(2 * PI * 997 * i / sr));
            return m.integrated();
        };
        double l0 = sineLufs(1.0, 48000);
        double l20 = sineLufs(0.1, 48000);
        double l441 = sineLufs(1.0, 44100);
        check("lufs: 997 Hz 0 dBFS sine = -3.01 (48k)", near(l0, -3.01, 0.05), l0);
        check("lufs: -20 dBFS sine = -23.01", near(l20, -23.01, 0.05), l20);
        check("lufs: same at 44.1 kHz", near(l441, -3.01, 0.05), l441);

        // gating：後面 5 秒很安靜 (-60 dBFS)。沒有 gating 會掉到約 -6 LUFS；
        // 有 gating 只剩交界處幾個半大聲的區塊會稍微拉低一點
        LoudnessMeter m(48000);
        for (int i = 0; i < 48000 * 5; i++) m.process(std::sin(2 * PI * 997 * i / 48000.0));
        for (int i = 0; i < 48000 * 5; i++) m.process(0.001 * std::sin(2 * PI * 997 * i / 48000.0));
        double gated = m.integrated();
        check("lufs: relative gate ignores quiet part", near(gated, -3.01, 0.2), gated);
        double mom = m.momentary();
        check("lufs: momentary follows the quiet part", near(mom, -63.01, 0.1), mom);

        // 立體聲：兩聲道都放 0 dBFS 正弦波 → 每聲道 -3.01，相加後 0.00 LUFS
        LoudnessMeter st(48000);
        for (int i = 0; i < 48000 * 5; i++) {
            double s = std::sin(2 * PI * 997 * i / 48000.0);
            st.processStereo(s, s);
        }
        double stereo = st.integrated();
        check("lufs: same sine in L and R = 0.00", near(stereo, 0.0, 0.05), stereo);
    }

    std::printf("%s\n", failures == 0 ? "ALL PASSED" : "FAILED");
    return failures == 0 ? 0 : 1;
}
