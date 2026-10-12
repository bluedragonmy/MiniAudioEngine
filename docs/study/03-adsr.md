# 第 3 關：ADSR 包絡

檔案：`cpp/src/ADSR.cpp`（你原本寫的）

## 原理

ADSR 是一個**狀態機**：

```
Idle ──noteOn──▶ Attack ──到 1.0──▶ Decay ──到 sustain──▶ Sustain
                   ▲                                         │
                   └────────noteOn（重新觸發）──────────────┐ │ noteOff
                                                            │ ▼
Idle ◀──────────────────到 0───────────────────────────── Release
```

每個取樣呼叫一次 `process()`，依目前的狀態把 `currentLevel` 加一點或減一點。「加多少」就是 rate：

```
attackRate  = 1 / (attackTime × sampleRate)          每個取樣加這麼多，attackTime 秒後到 1
decayRate   = (1 − sustain) / (decayTime × sampleRate)
releaseRate = currentLevel / (releaseTime × sampleRate)   ← 在 noteOff 當下才算
```

這是**線性**包絡。很多合成器用指數曲線（聽起來比較自然），第 5 章的鼓聲用的就是指數衰減（`decayCoefficient()`），可以比較看看。

## 你寫得好的地方

- `noteOn()` 不把 `currentLevel` 歸零，而是從目前的位置開始 attack，**重新觸發時不會爆音**。
- `noteOff()` 用「當下的 level」重新算 releaseRate，所以在 attack 一半放開，release 時間仍然正確。

## 我修掉的 bug

```cpp
// 原本
decayRate = (decayTime > 0.0) ? (...) : 0.0;
// 現在
decayRate = (decayTime > 0.0) ? (...) : 1.0;
```

decay = 0 時，原本 decayRate 是 0，在 Decay 狀態每個取樣減 0，**永遠降不到 sustain**，音量卡在最大值。第 4 章網頁可以把 decay 拉到 0，所以這個 bug 會被碰到。改成 1.0 之後，第一個取樣就降到 sustain（因為 `<= sustainLevel` 會被夾住）。這跟 attack、release 處理 0 的方式一致。

新的測試：`adsr: decay 0 jumps to sustain`。

另外修了 `-Wreorder` 警告：初始化列表的順序改成和成員宣告的順序一致。

## 測試在驗證什麼

| 測試 | 意義 |
|---|---|
| `peak 1.0 after attack` | 10 ms attack、48 kHz → 480 個取樣後剛好到 1 |
| `holds sustain 0.5` | decay 結束後停在 sustain |
| `release ends after ~200 ms` | release 時間正確 |
| `decay 0 jumps to sustain` | 上面那個 bug |

## 過關問題

1. 為什麼 sustain 是「音量」，而其他三個是「時間」？
2. attack 設 0 時，`attackRate` 是多少？為什麼第 4 章說這可能會有爆音？
3. 如果在 attack 進行到一半（level = 0.4）時放開琴鍵，release 會花多久？為什麼？
4. 用自己的話解釋 decay = 0 的 bug：在哪個狀態、哪一行、為什麼卡住？
5. 第 4 章的「撥弦」預設 sustain 是 0。按住不放的話，聲音會怎樣？對照狀態機說明。
