// Build & run (from the repo root):
//   g++ -std=c++17 -Wall -Icpp/include cpp/tests/test_aliasing.cpp cpp/src/SampleRateReducer.cpp -o build/test_aliasing
//   ./build/test_aliasing

#include "SampleRateReducer.h"

#include <iostream>

int main()
{
    int failures = 0;

    // 測試 1：aliasFrequency，fs = 8000
    double inputs[]   = {1000, 3000, 4000, 5000, 7000, 8000, 9000, -5000};
    double expected[] = {1000, 3000, 4000, 3000, 1000,    0, 1000,  3000};
    for (int i = 0; i < 8; i++) {
        double got = aliasFrequency(inputs[i], 8000);
        bool ok = got == expected[i];
        if (!ok) failures++;
        std::cout << inputs[i] << " -> " << got << (ok ? " OK" : " WRONG") << "\n";
    }

    // 測試 2：6 倍降頻，每 6 個輸出值相同
    SampleRateReducer a(48000);
    a.setTargetRate(8000);
    double exp2[] = {1, 1, 1, 1, 1, 1, 7, 7, 7, 7, 7, 7};
    bool ok2 = true;
    for (int i = 1; i <= 12; i++)
        if (a.process(i) != exp2[i - 1]) ok2 = false;
    if (!ok2) failures++;
    std::cout << "6x " << (ok2 ? "OK" : "WRONG") << "\n";

    // 測試 3：target == host，輸出等於輸入
    SampleRateReducer b(48000);
    b.setTargetRate(48000);
    bool ok3 = true;
    for (int i = 1; i <= 6; i++)
        if (b.process(i) != i) ok3 = false;
    if (!ok3) failures++;
    std::cout << "same " << (ok3 ? "OK" : "WRONG") << "\n";

    // 測試 4：不整除的比例 (48000 -> 7000)，一秒內剛好更新 7000 次
    SampleRateReducer c(48000);
    c.setTargetRate(7000);
    double last = -1;
    int updates = 0;
    for (int i = 1; i <= 48000; i++) {
        double v = c.process(i);
        if (v != last) { updates++; last = v; }
    }
    bool ok4 = updates == 7000;
    if (!ok4) failures++;
    std::cout << "48000->7000 updates/s = " << updates << (ok4 ? " OK" : " WRONG") << "\n";

    std::cout << (failures == 0 ? "ALL PASSED" : "FAILED") << "\n";
    return failures == 0 ? 0 : 1;
}
