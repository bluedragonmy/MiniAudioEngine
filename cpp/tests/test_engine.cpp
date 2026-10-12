// Tests for WAV I/O, DrumVoice and SamplerEngine (the original engine code).
// Build & run (from the repo root):
//   sh cpp/tests/run_tests.sh

#include "DrumVoice.h"
#include "SamplerEngine.h"
#include "WavReader.h"
#include "WavWriter.h"

#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <fstream>
#include <vector>

static int failures = 0;

static void check(const char* name, bool ok, double got)
{
    if (!ok) failures++;
    std::printf("%-48s %12.5f  %s\n", name, got, ok ? "OK" : "WRONG");
}

static bool near(double a, double b, double tol) { return std::fabs(a - b) <= tol; }

// 手寫一個最簡單的 WAV 檔，用來測 WavReader 讀 24-bit 和 float
static void writeRaw(const char* path, uint16_t format, uint16_t bits, const std::vector<uint8_t>& data)
{
    std::ofstream f(path, std::ios::binary);
    uint32_t sr = 48000, dataSize = static_cast<uint32_t>(data.size()), riffSize = 36 + dataSize;
    uint16_t ch = 1, align = bits / 8;
    uint32_t byteRate = sr * align, fmtSize = 16;
    f.write("RIFF", 4); f.write(reinterpret_cast<char*>(&riffSize), 4); f.write("WAVE", 4);
    f.write("fmt ", 4); f.write(reinterpret_cast<char*>(&fmtSize), 4);
    f.write(reinterpret_cast<char*>(&format), 2); f.write(reinterpret_cast<char*>(&ch), 2);
    f.write(reinterpret_cast<char*>(&sr), 4); f.write(reinterpret_cast<char*>(&byteRate), 4);
    f.write(reinterpret_cast<char*>(&align), 2); f.write(reinterpret_cast<char*>(&bits), 2);
    f.write("data", 4); f.write(reinterpret_cast<char*>(&dataSize), 4);
    f.write(reinterpret_cast<const char*>(data.data()), data.size());
}

static int zeroCrossings(const std::vector<double>& x)
{
    int c = 0;
    for (size_t i = 1; i < x.size(); i++) if ((x[i - 1] < 0) != (x[i] < 0)) c++;
    return c;
}

int main()
{
    // ── WavWriter：超過 ±1 要被削掉，不能溢位翻轉 ────────────────────────────
    {
        WavWriter::write("build/test_clip.wav", {1.5, -1.5, 0.5}, 48000);
        std::vector<double> s; double sr = 0;
        bool ok = WavReader::read("build/test_clip.wav", s, sr);
        check("wav write/read round trip", ok && s.size() == 3 && sr == 48000, s.size());
        check("writer clips +1.5 to ~+1 (no wrap)", ok && near(s[0], 1.0, 0.001), ok ? s[0] : 0);
        check("writer clips -1.5 to ~-1 (no wrap)", ok && near(s[1], -1.0, 0.001), ok ? s[1] : 0);
        check("0.5 survives", ok && near(s[2], 0.5, 0.001), ok ? s[2] : 0);
    }

    // ── WavReader：24-bit 和 32-bit float ───────────────────────────────────
    {
        // 24-bit：+0.5 = 0x400000，-0.5 = 0xC00000（little-endian）
        writeRaw("build/test_24.wav", 1, 24, {0x00, 0x00, 0x40, 0x00, 0x00, 0xC0});
        std::vector<double> s; double sr = 0;
        bool ok = WavReader::read("build/test_24.wav", s, sr);
        check("24-bit: +0.5", ok && s.size() == 2 && near(s[0], 0.5, 1e-6), ok ? s[0] : 0);
        check("24-bit: -0.5 (sign extension)", ok && s.size() == 2 && near(s[1], -0.5, 1e-6), ok ? s[1] : 0);

        float vals[2] = {0.25f, -0.75f};
        std::vector<uint8_t> bytes(8);
        std::memcpy(bytes.data(), vals, 8);
        writeRaw("build/test_f32.wav", 3, 32, bytes);
        ok = WavReader::read("build/test_f32.wav", s, sr);
        check("float32: 0.25 / -0.75", ok && s.size() == 2 && near(s[0], 0.25, 1e-7) && near(s[1], -0.75, 1e-7), ok ? s[1] : 0);

        writeRaw("build/test_bad.wav", 2, 4, {0, 0});  // ADPCM：不支援
        check("unsupported format returns false", !WavReader::read("build/test_bad.wav", s, sr), 0);
    }

    // ── DrumVoice：Synth 模式的 setPitch 要有作用 ────────────────────────────
    {
        auto render = [](double semitones) {
            DrumVoice v(48000);
            v.setSynthFrequency(100);
            v.setPitch(semitones);
            v.setEnvelope(0.0, 0.0, 1.0, 0.0);
            v.noteOn();
            std::vector<double> out(48000);
            for (auto& s : out) { double r; v.process(s, r); }
            return out;
        };
        int base = zeroCrossings(render(0)), octave = zeroCrossings(render(12));
        check("synth pitch +12 st doubles frequency", near(octave, 2.0 * base, 4), static_cast<double>(octave) / base);
    }

    // ── SamplerEngine：連續算圖不能帶著上一次的殘響 ─────────────────────────
    {
        SamplerEngine engine(48000);
        DrumVoice v(48000);
        v.setSynthFrequency(80);
        v.setEnvelope(0.001, 0.2, 0.0, 0.3);
        engine.addPad("kick", v);
        engine.scheduleNoteOn(0.0, "kick");
        engine.scheduleNoteOn(0.5, "kick");

        auto a = engine.renderStem("kick", 1.0);
        auto b = engine.renderStem("kick", 1.0);
        auto m1 = engine.renderMaster(1.0);
        auto m2 = engine.renderMaster(1.0);
        double diffStem = 0, diffMaster = 0;
        for (size_t i = 0; i < a.size(); i++) diffStem = std::fmax(diffStem, std::fabs(a[i] - b[i]));
        for (size_t i = 0; i < m1.size(); i++) diffMaster = std::fmax(diffMaster, std::fabs(m1[i] - m2[i]));
        check("renderStem twice gives identical audio", diffStem < 1e-9, diffStem);
        check("renderMaster twice gives identical audio", diffMaster < 1e-9, diffMaster);
        check("stem starts silent before first hit", std::fabs(a[0]) < 1e-9, a[0]);
    }

    std::printf("%s\n", failures == 0 ? "ALL PASSED" : "FAILED");
    return failures == 0 ? 0 : 1;
}
