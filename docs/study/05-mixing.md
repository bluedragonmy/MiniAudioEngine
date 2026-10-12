# 第 5 關：混音的訊號處理

檔案：`site/js/music.js`（`mixStereo`）、`site/js/ch6.js`（`processedBass`、`layer`、`mixedAndClipped`）

這一關的程式只有 JS，因為它們是「把模組組合起來」，不是新的 DSP 模組。但每個概念都很小，你可以試著用 C++ 重寫一次當練習。

## 1. 混音 = 加法

多軌混音在數學上就是**逐個取樣相加**：

```
master[i] = kick[i] × g_kick + snare[i] × g_snare + ...
```

推桿的 dB 換成倍數：`gain = 10^(dB/20)`（第 1 章的公式反過來）。

## 2. 等功率聲像

```js
p  = (pan + 1) / 2;           // −1…1 → 0…1
gL = cos(p × π/2);
gR = sin(p × π/2);
```

置中時 `gL = gR = 0.707`（−3 dB），不是 0.5。為什麼？因為 `0.707² + 0.707² = 1`：左右的**能量**加起來不變，所以把聲音從左移到右時，聽起來一樣大聲。這個公式跟你 `DrumVoice::setPan()` 裡的一樣。

## 3. 削波

```js
out = max(−1, min(1, x));
```

任何超過 ±1 的值被硬切。第 6 章的 master 和第 7 章的「drive」都是用這個。被切掉的尖角就是新的高頻泛音，聽起來是破音。

順帶一提：你原本的 `WavWriter` 沒有做這一步，超過 ±1 的值轉 `int16_t` 時會**溢位翻轉**（+1.1 變成很大的負數），比削波更難聽。現在已經修好了（先夾在 ±1 再轉換），測試在 `cpp/tests/test_engine.cpp`。

## 4. Sidechain（包絡追蹤）

```js
env = a > env ? a : env × rel;            // 追蹤 kick 的音量
bass[i] *= 1 − 0.85 × min(1, env × 1.5);   // kick 越大，bass 越小
```

- **包絡追蹤器（envelope follower）**：輸入變大時立刻跟上，變小時慢慢放（`rel` 是 150 ms 的指數衰減）。這就是壓縮器內部偵測音量的方法。
- 用 kick 的音量去控制 bass 的音量，就是 sidechain。

`processedBass` 跑兩遍（`pass`），因為 loop 的開頭需要知道上一小節最後一下 kick 的包絡，否則 loop 接縫處會跳一下。

## 5. 相位抵消

```js
b[i] = sign × a[i − d];      // 延遲 d 個取樣，sign = ±1
sum[i] = a[i] + b[i];
```

- `d = 0, sign = +1`：完全同相，振幅加倍，**+6 dB**。
- `d = 0, sign = −1`：完全反相，**完全抵消**。
- 延遲半個週期：在那個頻率反相。kick 尾巴約 45 Hz，週期約 22 ms，延遲約 11 ms 時低頻抵消最嚴重。

網頁顯示的「疊加後比單一 kick」= `20·log10(RMS(sum) / RMS(a))`。

## 過關問題

1. 推桿從 0 dB 拉到 −6 dB，波形振幅變成幾倍？
2. 為什麼置中時左右都是 0.707 而不是 0.5？
3. 包絡追蹤器為什麼要「上升快、下降慢」？如果兩個都很快會怎樣？
4. 兩個一模一樣的 kick 疊加，為什麼是 +6 dB 而不是 +3 dB？（提示：振幅加倍 vs 能量加倍）
5. 打開 `cpp/src/WavWriter.cpp`，找到修掉溢位的那一行。如果把它拿掉，`test_engine` 的哪個測試會失敗？
