# 第 1 關：濾波器（LowPassFilter、Biquad）

檔案：`cpp/src/LowPassFilter.cpp`、`cpp/src/Biquad.cpp`

## 原理

濾波器的工作是：**對不同頻率給不同的音量**。低通濾波器讓低頻通過，把高頻調小。

數位濾波器做這件事的方法出乎意料地簡單：**把現在的輸入，跟過去的輸入、輸出混在一起**。

### 一階低通（你原本就寫好的）

```
y[n] = α · x[n] + (1 − α) · y[n−1]
```

意思是：新的輸出 = 一點點新輸入 + 大部分的舊輸出。所以輸出「追不上」快速變化的輸入，快速變化就是高頻，於是高頻被壓小了。α 越小，追得越慢，壓得越多。

這是電子學裡 RC 電路的數位版本，斜率是 **−6 dB/octave**（頻率加倍，音量少一半）。

### Biquad（二階）

```
y[n] = b0·x[n] + b1·x[n−1] + b2·x[n−2] − a1·y[n−1] − a2·y[n−2]
```

多記住了一格過去的值，就能做出更多形狀：

- 斜率變成 **−12 dB/octave**
- 可以有**共振（Q）**：在截止頻率附近凸起來
- 只要換 5 個係數，同一個結構就能變成低通、高通、peaking EQ、shelf

係數公式來自 Robert Bristow-Johnson 的 *Audio EQ Cookbook*，這是業界幾十年來的標準參考。`Biquad::set()` 裡每個 `case` 就是 cookbook 的一個公式。

## 程式碼導讀

### `LowPassFilter`

| 行 | 在做什麼 |
|---|---|
| `setCutoff()` | 從截止頻率算 α：`rc = 1/(2π·fc)`、`α = dt/(rc+dt)` |
| `process()` | 就是上面那條公式，`previousOutput` 是 y[n−1] |
| `magnitudeAt()` | 不用真的跑聲音，直接算出某個頻率會被放大幾倍。網頁上的濾波曲線就是用它畫的 |

`magnitudeAt()` 的數學：把公式寫成轉移函數 `H(z) = α / (1 − (1−α)z⁻¹)`，再把 `z = e^{jω}` 代進去取絕對值。你不需要會推導，但要知道它的意義：**「頻率響應」= 每個頻率的增益**。

### `Biquad`

| 行 | 在做什麼 |
|---|---|
| `set()` 開頭 | 算出 `w0`（截止頻率換成角度）、`alpha`（跟 Q 有關）、`A`（跟 dB 增益有關） |
| `switch` | 依類型套 cookbook 公式，得到 6 個係數 |
| `setCoefficients(nb0/na0, …)` | 全部除以 a0，讓 a0 變成 1，`process()` 就不用再除 |
| `process()` | 那條差分方程，`x1 x2 y1 y2` 是過去兩格的輸入輸出 |

## 測試在驗證什麼

| 測試 | 意義 |
|---|---|
| `1-pole: gain at cutoff ~ -3 dB` | 截止頻率的定義就是 −3 dB。量出來 −3.28 dB，因為這種 RC 離散化是近似值。**這是我一開始寫錯預期、後來改掉的地方** |
| `measured matches magnitudeAt` | 真的讓正弦波通過濾波器，量輸出振幅，必須等於公式算的值。這證明 `process()` 和 `magnitudeAt()` 是一致的 |
| `~6 dB per octave` / `~12 dB per octave` | 斜率。要在遠離 Nyquist 的地方量，靠近 Nyquist 時數位濾波器會變形（第 2 章的東西又出現了） |
| `biquad peak: -6 dB at center` | Peaking EQ 在中心頻率剛好是設定的 dB |

## 過關問題

1. 一階低通的公式裡，α 從 0.5 改成 0.05，聲音會變亮還是變暗？為什麼？
2. 「−12 dB/octave」是什麼意思？如果截止頻率是 1 kHz，4 kHz 大概會小多少 dB？
3. 為什麼 Biquad 要把所有係數除以 a0？
4. 第 6 章的「EQ 挖空：bass 在 55 Hz −9 dB」，用的是 `Biquad` 的哪一種 type？參數是什麼？（提示：看 `site/js/ch6.js` 的 `processedBass`）
5. 測試量斜率時，為什麼不在 8 kHz 和 16 kHz 之間量？
