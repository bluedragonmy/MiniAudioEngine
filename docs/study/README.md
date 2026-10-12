# 學習筆記：搞懂每一關

這個資料夾是寫給你自己看的，不是網站內容。每一份筆記對應一組 DSP 模組，結構都一樣：

1. **原理**：這個東西在做什麼、為什麼這樣做
2. **程式碼導讀**：一行一行對照 `cpp/src/` 裡的程式
3. **測試在驗證什麼**：`cpp/tests/test_dsp.cpp` 裡對應的檢查
4. **過關問題**：你能用自己的話回答，這一關就算過了

## 建議順序

| 關 | 筆記 | 模組 | 網站章節 |
|---|---|---|---|
| 1 ✅ | [01-filters.md](01-filters.md) | `LowPassFilter`、`Biquad` | 第 3、6 章 |
| 2 ⏳ | [02-additive.md](02-additive.md) | `AdditiveOscillator` | 第 3 章 |
| 3 | [03-adsr.md](03-adsr.md) | `ADSR`（含我修掉的 bug） | 第 4 章 |
| 4 | [04-noise-drums.md](04-noise-drums.md) | `Noise`、`DrumSynth` | 第 5 章 |
| 5 | [05-mixing.md](05-mixing.md) | 聲像、削波、sidechain、相位 | 第 6 章 |
| 6 | [06-loudness.md](06-loudness.md) | `LoudnessMeter` | 第 7 章 |

`SampleRateReducer`（第 2 章）是你自己寫的，所以沒有筆記。

## 進度（2026-10-13）

- 第 1 關已過。
- 第 2 關做到「能疊幾個泛音」：記得是跟 **Nyquist（取樣率 ÷ 2）** 比，而且**剛好等於 Nyquist 也不行**。
  下次從 `02-additive.md` 的過關問題 2 開始。

## 怎麼用

- 一邊讀筆記，一邊開著對應的 `.cpp` 檔。
- 每關最後的「過關問題」，先自己試著回答（用講的或寫下來都行），再跟我對答案。
- 卡住就問我。

## 跑測試

```sh
sh cpp/tests/run_tests.sh          # C++
node site/js/dsp/dsp.test.mjs      # JS（輸出應該和 C++ 一字不差）
```

改任何 DSP 程式之後都跑一次。想確認自己真的懂，可以故意改壞一個地方，猜猜看哪個測試會失敗，再跑跑看。
