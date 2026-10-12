# 第 4 關：噪音與合成鼓（Noise、DrumSynth）

檔案：`cpp/src/Noise.cpp`、`cpp/src/DrumSynth.cpp`

## 原理

### 噪音

白噪音 = 每個取樣都是一個隨機數。因為完全沒有規律，所以**所有頻率都有**，聽起來像「噓——」。

我們用 **xorshift32** 產生亂數：

```cpp
state ^= state << 13;
state ^= state >> 17;
state ^= state << 5;
```

三次「位移再 XOR」就把 32 位元的狀態打亂。為什麼不用 `rand()`？

- **可重現**：同一個 seed 永遠產生同一串數字，測試才能檢查「兩次輸出完全相同」。
- **跨語言一致**：C++ 和 JS 都能精確實作，所以兩邊的測試可以比對**同一個數字**（`-0.99987410`）。JS 的 `Math.random()` 做不到。

JS 版本要注意：JS 的位元運算是 32 位元**有號**整數，所以每一步都要 `>>> 0` 轉回無號，右移也要用 `>>>`（無號右移）而不是 `>>`。

### 三種鼓

每種鼓都是「**聲音來源 × 衰減包絡**」：

| 鼓 | 來源 | 特色 |
|---|---|---|
| Kick | 正弦波 | 音高從 `startFreq` 指數掉到 `endFreq` |
| Snare | 正弦波（鼓皮）＋ 高通 1.2 kHz 的噪音（響弦） | 鼓皮收得比響弦快（`decay * 0.5`） |
| Hat | 高通的噪音 | 很短；`choke()` 讓它在 10 ms 內收掉 |

### 指數衰減

```cpp
coef = pow(0.001, 1.0 / (seconds * sampleRate));
env *= coef;   // 每個取樣
```

乘 `seconds × sampleRate` 次之後剛好變成 0.001（−60 dB）。指數衰減在 dB 上是一條直線，跟真實樂器自然消失的方式很像。對照第 3 關的 ADSR 是線性的。

## 程式碼導讀

| 位置 | 在做什麼 |
|---|---|
| `decayCoefficient()` | 上面的公式 |
| `KickVoice::process()` | `freq = end + (start − end) × pitchEnv`：音高包絡從 1 掉到 0，音高就從 start 滑到 end |
| `KickVoice::trigger()` | `phase = 0`：每次都從同一個相位開始，打擊感才會一致（試試看不歸零會怎樣） |
| `SnareVoice::process()` | `(1 − mix) × 鼓皮 + mix × 響弦` |
| `HatVoice::process()` | `choking` 為 true 時改用 10 ms 的係數 |

## 測試在驗證什麼

| 測試 | 意義 |
|---|---|
| `noise seed 1: 1st value` | 和 JS 對照的固定值 |
| `noise: mean ~ 0`、`variance ~ 1/3` | −1 到 1 的均勻分佈，平均 0、變異數 1/3 |
| `kick: pitch drops` | 前 50 ms 的過零點比 250–300 ms 多 → 音高在下降 |
| `snare: same seed -> identical output` | 可重現 |
| `hat: choke silences within 20 ms` | choke 有效 |

## 過關問題

1. 為什麼 hi-hat 用「高通」濾噪音，而不是低通？
2. Kick 的 `pitchDecay` 從 120 ms 改成 10 ms，聲音會變怎樣？改成 400 ms 呢？
3. `decayCoefficient(0.5, 48000)` 大約是多少？（不用精確，說出「非常接近 1 的數」並解釋為什麼）
4. JS 的 noise 為什麼要寫 `>>> 0`？拿掉會怎樣？
5. 真實鼓組裡，閉合 hi-hat 為什麼會切掉開放 hi-hat 的聲音？`choke()` 怎麼模擬這件事？
