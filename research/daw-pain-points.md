# DAW 新手／中階使用者最常卡關的混音與製作問題

> 研究日期：2026-10-12。目的：幫 MiniAudioEngine 找一個具體的「會解釋的輔助工具」目標場景。
>
> **方法限制（請先看）**
> - **Reddit 無法直接存取**：reddit.com、old.reddit.com 跟搜尋引擎的 reddit 網域過濾都被擋，所以沒辦法讀 r/WeAreTheMusicMakers、r/mixingmastering、r/edmproduction 等版的 wiki/FAQ。Reddit 的證據只有一篇 r/audioengineering 討論串，是從第三方鏡像讀到的 [4]。**「各 subreddit FAQ 出現幾次」這種計數沒有做到。**
> - **PTT 有連上，但找不到作曲／混音相關看板**：試過 Composer、DTM、MusicProduce、compose，全部 404。正確的看板名稱沒查到，中文社群的資料等於沒有。
> - 替代的一手來源：Sound On Sound「Mix Mistakes」。作者根據幾千份讀者投稿的混音整理出來 [1][2]。另外還用了 Mixing Secrets for the Small Studio 的目錄 [3]、Gearspace、KVR、Image-Line、Ableton、Steinberg、VI-Control 論壇的討論串，以及工具廠商自己的產品頁和文件。
> - 論壇討論串大多是**從搜尋引擎的摘錄讀到的，沒有逐篇點開**。標題和重點可信，但引文是轉述。
> - 「頻率判斷」都是質性的：看有幾個獨立來源重複出現、SOS 有沒有點名、Mixing Secrets 有沒有給它一整章、有沒有商業工具專門瞄準它（等於市場訊號）。

---

## 1. 摘要

- **證據最強的卡關點是「低頻／低中頻糊掉」**，也就是 mud、kick 跟 bass 打架。SOS 有點名 [1]，Gearspace 有好幾串標題就叫 "muddy mix(es)" [5][6][7]，Ableton 論壇有 [16]，r/audioengineering 也列為「業餘」的特徵 [4]。背後的概念是**頻率遮蔽**加上**低頻累積**，但常常其實是**監聽環境**的問題 [5][24]。
- **第二多的是「整體音色和響度跟參考曲對不上」**：太亮、太暗、刺耳、比商業曲小聲。背後牽涉 tonal balance、LUFS、limiter，以及「大聲聽起來就比較好」的錯覺（loudness bias）[1][4][10][11][12][13]。
- **「在 A 系統好聽、B 系統爛」（translation）非常常見**，但根源多半是房間、耳機曲線這類**監聽**問題，訊號處理工具只能幫一部分 [21][22][23][24]。
- **相位／polarity 這類問題被低估**：疊 kick 變薄、多軌收音抵消、mono 相容性。SOS 把它列為前 10 大錯誤之一 [1]，Gearspace 有專門的討論串 [17][18]。這類問題**可以量測、可以解釋，也很適合拿 DSP 背景來做**。
- **「聽不出壓縮器在做什麼」**是典型的第 1 層（聆聽）障礙，Gearspace 好幾串都在問 [14][15]。
- **SOS 認為最常見的根源其實不在混音**：時間和音準不準（作者印象約 90% 的業餘混音卡在這），還有編曲本身就塞得太滿 [1][2]。這部分是「會解釋的混音工具」比較難幫上的。
- **現有工具分成三種**：(a) 自動修，不說原因：Neutron、Ozone、smart:EQ [25][26][27][29]；(b) 只亮紅綠燈的儀表：LEVELS、Tonal Balance Control [28][30]；(c) 脫離使用者作品的訓練：SoundGym、Syntorial [32][33]。**「針對使用者自己的音檔、在卡住的當下，用可以聽到的 A/B 證明給他看為什麼」這一塊幾乎沒人做。**

---

## 2. 常見卡關問題排行

排序依據是下表「頻率判斷依據」這一欄的證據強度，不是精確的統計。

| # | 問題 | 使用者原話範例 | 頻率判斷依據 | 背後概念 | 「會解釋的輔助工具」能幫上忙嗎 |
|---|---|---|---|---|---|
| 1 | **混音糊、低頻一團**（kick／bass／低中頻打架） | Gearspace "Muddy mixes" 系列 [5][6][7]；Ableton 論壇 "Cleaning Up A Muddy Bass?" [16]；r/audioengineering 有人說 "Too much goddamn bass" [4] | SOS 前 10 大的「Mix mud」[1]；Mixing Secrets 第 3 章整章在講 Low-end Damage Limitation [3]；Gearspace 至少 3 串標題相同；另有 2 個商業工具專門處理遮蔽 [25][29] | 第2層：**頻率遮蔽**、低頻累積、HPF 的用途、sidechain；第1層：辨認 200–500 Hz 那種「糊」的聽感。**也可能是監聽環境**（房間的低頻駐波） | **高**。遮蔽和頻段能量疊加都量得到、畫得出來，還能做 A/B。注意：如果商業曲在同一套監聽上也糊，問題就出在房間 [24]，工具應該把這點講出來 |
| 2 | **音色平衡跟參考曲不同**（太亮、太暗、2–5 kHz 刺耳） | r/audioengineering 有人說 "no perception of mids … clash of mud, honk, and harsh" [4] | SOS 前 10 大有「Tonality misjudgements」和「Harshness」兩項 [1]；有 2 個商業產品在賣 target curve [27][28] | 第2層：tonal balance、等響度比較（Fletcher-Munson／loudness bias）、transient 造成的刺耳；第1層：拿參考曲 A/B | **高**。等響度後的頻譜差異可以算出來。工具的價值在解釋「為什麼要先把響度對齊才能比較」 |
| 3 | **太小聲、master 爆掉、LUFS 不知道要調多少** | Steinberg 論壇 "Quiet finished tracks" [10]；Image-Line 論壇有人問 master 顯示 <0 dB 卻還是 clipping [8]；KVR 有人問 "LUFS -14, is it a mandatory rule?" [11]；"Having a hard time hitting -14LUFS" [13] | 至少 4 個 DAW 或通用論壇都有獨立的討論串；FL 官方手冊特地解釋 sampler 預設 55% 音量和 master 不要超過 0 dB [9]；SOS 有一項是「Inappropriate mix-bus processing」[1] | 第2層：**gain staging**、headroom、true peak 和 inter-sample peak、**LUFS 與串流平台的響度正規化**、limiter 和 crest factor | **高**。全部都量得到，而且新手的誤解很明確（以為 -14 LUFS 是必須達到的目標 [11][12]），非常適合做成「解釋型」工具 |
| 4 | **換個系統聽就不一樣**（耳機、車上、手機） | Gearspace 有人說車上很好、耳機很悶 [21]；VI-Control 有人在耳機上剛好、在監聽喇叭上卻爆掉 [22]；BeatTips 有用 Beats 耳機混音的案例 [23] | 4 個以上的論壇有獨立討論串；Mixing Secrets 第 1、2 章整個在講監聽 [3]；r/audioengineering 有人建議多系統檢查 [4] | **監聽環境**（房間、耳機頻響曲線）、低頻感知；第2層：mono 相容性 | **中到低**。核心是監聽，不是訊號處理。工具能幫的有：mono 檢查、跟參考曲比較低頻、提醒耳機會染色。但沒辦法修房間 |
| 5 | **聽不出壓縮在做什麼** | Gearspace "Hearing compression"（2 串）[14][15]、"Learning the compressor" | Gearspace 至少 3 串；Mixing Secrets 第 3 部分有專章 [3] | 第1層：**聽 transient 和 sustain 的變化**；第2層：attack/release 和包絡、gain reduction、補償增益造成的響度錯覺 | **中到高**。把輸入和輸出包絡疊在一起畫，再加上等響度 A/B，可以直接把「聽不出來」變成「看得到、也對得上耳朵」。SoundGym 有壓縮訓練，但用的不是使用者自己的素材 [32] |
| 6 | **人聲融不進去**（太浮或太埋） | Gearspace "Mixing singing"、"Setting the vocal level" [19][20] | Gearspace 多串；SOS「Buried details」（人聲要逐字 ride level）[1] | 第2層：音量平衡、遮蔽、殘響和空間感、automation；**表演和音準**也有影響 | **中**。部分可以量（人聲和伴奏在 1–4 kHz 的遮蔽），但「坐進去」帶有很大的美學成分 |
| 7 | **相位：疊 kick 變薄、多軌收音抵消、mono 塌掉** | Gearspace "Phase issues when layering drums"、"…multiple kick and other samples" [17][18] | SOS 前 10 大「Phase misalignment」，作者說大家 "underestimate" 這個問題 [1]；Mixing Secrets 附錄專章 [3] | 第2層：**相位 vs polarity**、comb filtering、時間對齊、mono 加總 | **高**。可以精確量化（例如合成後低頻能量少了幾 dB、相關係數），也可以給出可操作的建議（翻 polarity、平移幾個 sample）。新手還常把 phase 和 polarity 搞混 [17] |
| 8 | **時間和音準不準、編曲太擠**（使用者以為是混音問題） | SOS：大部分投稿者都在懷疑自己的混音技術，但真正的問題是編曲和錄音 [2] | SOS 作者印象「90% 的業餘混音卡在」timing/tuning [1]；Mixing Secrets 第 2 部分整個在講這個 [3] | 不屬於混音 DSP；屬於編曲和表演 | **低**（對混音工具來說）。但「告訴使用者這不是 EQ 能解決的」本身就有教育價值 |
| 9 | **過度處理**（reverb 太多、外掛疊太多、寬度過頭、master bus 壓過頭） | r/audioengineering 有人說 "Just because you have the tools available doesn't mean you should use them" [4] | SOS「Wrong reverb」和「mix-bus processing」[1]；r/audioengineering 該串 [4] | 第2層：等響度 A/B（loudness bias）、mono 相容性、壓縮造成的 pumping | **中**。等響度 bypass 比較可以揭穿「只是比較大聲」的錯覺 |

---

## 3. 現有工具：解決了什麼、沒解決什麼

| 工具 | 解決了什麼 | 沒解決什麼（特別是「會不會解釋為什麼」） |
|---|---|---|
| **iZotope Neutron**（Mix Assistant、Unmask、Masking meter、Visual Mixer）[25][26] | 用 AI 產生起始的處理鏈；分析各軌響度並分組（Focus／Voice／Bass…），自動設定音量；Unmask 把頻譜切成 32 段，只在遮蔽發生的地方處理；Delta 按鈕可以聽處理前後的差異 | 官方文件只描述**它調了什麼**，**沒有解釋為什麼**這樣設定 [26]。Unmask 直接 "resolving conflicts for you" [25]。使用者看得到結果，學不到判斷方式 |
| **iZotope Ozone Master Assistant** [27] | 依曲風或參考曲產生 mastering preset，可以設定 LUFS 目標 | 標語是 "guides, not decides"，但頁面上沒提到任何決策解釋；處理的是最後一步，不碰混音階段的根本問題 |
| **iZotope Tonal Balance Control** [28] | 和 30 多種曲風的 target curve 比較，另有低頻 crest factor、寬度等儀表 | 告訴你「偏離了」，**沒解釋偏離會造成什麼聽感**，也沒解釋為什麼目標曲線長這樣 |
| **sonible smart:EQ 4** [29] | 自動平衡到目標 profile；最多 10 軌分前、中、後排做跨軌去遮蔽 | 沒有逐項解釋處理決策；設計目標是 "effortlessly"，也就是省力，不是學習 |
| **Mastering The Mix LEVELS** [30] | 檢查 true peak、LUFS、相位相關、低頻寬度、DR、LRA；有問題就亮紅燈 | 回饋主要是**紅綠燈和圖示**，旁邊附簡短的操作建議（例如「逐軌 mute 直到變綠」）；概念層的解釋要另外去看手冊 |
| **RoEx Mix Check Studio** [31] | 上傳整首混音，依曲風產生報告：EQ 平衡、動態、響度、寬度 | 頁面說是 "actionable feedback"，但**沒提到解釋原因**（未實測報告內容，**無法驗證**）；而且是離線上傳，不在 DAW 工作流程裡 |
| **SoundGym** [32] | 每天的耳朵訓練遊戲：頻率、壓縮、panning、空間 | **跟使用者自己的作品無關**，看起來不整合 DAW；練完不一定知道怎麼套用到自己的歌 |
| **Syntorial** [33] | 用耳朵學合成器的參數，190 多課互動練習 | 只教合成器，不教混音 |
| **Ableton Learning Music** [34] | 在瀏覽器裡學節奏、音階、和弦、曲式 | **不涵蓋混音**（EQ、壓縮、gain 都沒有）。這個「瀏覽器內互動教學」的形式值得參考 |
| **Mixing Secrets for the Small Studio**（Mike Senior 的書）[3][35] | 最完整的「為什麼」：監聽、低頻、平衡、EQ、壓縮、相位、gain management | 是書，不會分析使用者的音檔，也沒辦法在卡住的當下給回饋 |
| **SOS Mix Rescue** [2] | 真人工程師處理讀者的混音，並解釋原因 | 不能規模化，要等，一次只處理一首 |

---

## 4. 缺口分析

1. **「自動修」和「解釋」是分開的**：會分析你音檔的工具（Neutron、smart:EQ、Ozone）不解釋原因；會解釋的資源（書、SOS、SoundGym）又不分析你的音檔。**中間那塊，也就是「拿使用者自己的素材，指出問題、解釋概念、讓他聽到證據」，幾乎沒有人做。**
2. **儀表只說「哪裡錯」，不說「錯會聽起來怎樣」**：LEVELS 和 TBC 的紅燈不會帶使用者去聽那個問題。第 1 層（聆聽）的訓練缺少「看到 → 聽到」的連結。
3. **等響度 A/B 被嚴重低估**：loudness bias 會誤導壓縮、EQ、master 判斷 [1][4]。幾乎每個工具都只把它當成附帶的 bypass 按鈕，沒有當成教學核心。
4. **「這不是 DSP 的問題」的分流沒人做**：房間和監聽 [24]、編曲和表演 [1][2] 是大宗，但所有外掛都假設 EQ 和壓縮能解決。誠實說「這個問題你該去調房間或改編曲」的工具本身就是一個差異化點。
5. **相位和 polarity**：可以精確量化，新手的誤解又很具體（phase 跟 polarity 分不清 [17]），市面上的工具大多只提供相關係數錶（LEVELS），沒有「為什麼變薄、該平移幾個 sample」的解釋。

---

## 5. 3 個最值得做的具體場景

### 場景 A：疊 kick 或 kick+bass 的「低頻為什麼變薄或變糊」診斷器

- **誰**：用 FL Studio 或 Ableton 做 EDM、hip-hop 的 bedroom producer，混音經驗 0–2 年。
- **在做什麼**：疊兩個 kick sample，或 kick 加 808／bass。
- **卡在哪**：疊完反而變薄（相位抵消），或是低頻一團（遮蔽），但分不出是哪一種，只會亂加 EQ 或 sidechain [16][17][18]。
- **工具怎麼幫**：輸入兩軌 → 分別計算 20–200 Hz 各頻段的能量，再跟「合成後」的能量比較。如果合成後低於能量相加，就是**抵消**，標示是哪幾個頻段、少了幾 dB。提供 polarity 翻轉和 ±N sample 平移的滑桿，即時聽、即時看低頻能量回升。如果沒有抵消但兩軌在同一段都很強，就判定為**遮蔽**，解釋 HPF 和 sidechain 各自在處理什麼。每個結論都附一句白話和一個「按這裡聽差別」的 A/B。
- **跟現有程式碼的連結**：`cpp/src/DrumVoice.cpp` 和 `SamplerEngine.cpp` 可以合成「已知相位差」的 kick 當作測試資料，確定答案是對的；web 版的 live FFT（`web/app.js`）直接拿來畫頻段能量；Web Audio 負責即時 A/B 和平移。
- **MVP**：單一網頁，拖進兩個 wav，畫出單軌和合成的低頻能量條，加上 polarity、平移控制和三種判定文字（抵消／遮蔽／沒問題）。不用做外掛。
- **如何驗證**：找 5–8 位 FL 或 Ableton 新手（Discord 群組、學校社團）。問：「上次疊 kick 或 kick+808 覺得怪，你怎麼處理的？花多久？」再讓他們用 MVP 跑自己的素材，問：「看完你能不能說出為什麼變薄？下次會先做什麼？」驗證的重點是**能不能講出原因**，不是聲音變好。

### 場景 B：「為什麼我的歌比參考曲小聲或悶」等響度參考比對器

- **誰**：剛完成第一批作品、準備丟上 SoundCloud 或串流平台的新手。
- **在做什麼**：把自己的 mixdown 跟一首喜歡的商業曲比較。
- **卡在哪**：覺得自己的比較小聲、比較悶，於是在 master 疊 limiter 直到爆掉；或是被「-14 LUFS」搞混 [8][10][11][12][13]。
- **工具怎麼幫**：(1) 算出兩首的 integrated／short-term LUFS、true peak、crest factor，**先解釋「你的 mix 還沒 master，比響度不公平」**[24]；(2) 把兩首**對齊響度**後再比 1/3 倍頻程的平均頻譜，標出差最多的頻段，翻成白話（例如「200–400 Hz 多了 4 dB，這通常聽起來是糊」）；(3) 提供等響度切換播放，讓使用者親耳確認 loudness bias；(4) 解釋串流正規化：太大聲會被調小，crest factor 被壓掉的東西不會回來。
- **跟現有程式碼的連結**：FFT 視覺化可以直接沿用。LUFS 需要 K-weighting（兩個 biquad），可以從現有的 1-pole `LowPassFilter` 延伸成 biquad 類別，在 C++ 跟 Python 都實作，用 Python lab 做對照驗證。
- **MVP**：網頁，上傳「我的混音」和「參考曲」兩個檔案，輸出 4 個數字（LUFS-I、TP、crest、響度差）加一張等響度後的頻譜差異圖，再附 3 條自動產生的白話解釋。
- **如何驗證**：問 5–8 位剛發過作品的人：「發之前你怎麼決定音量？有沒有拿參考曲比過？怎麼比的？」用完 MVP 後再問：「你現在會怎麼解釋 -14 LUFS？」也可以跟 RoEx Mix Check 的報告對照，看哪一個讓人比較懂 [31]。

### 場景 C：用自己素材練的「壓縮器聽力教練」

- **誰**：已經會在 DAW 掛壓縮器、但只會套 preset 的新手。
- **在做什麼**：在鼓或人聲上掛 compressor。
- **卡在哪**：聽不出壓縮前後的差別，只看到 gain reduction 表在跳 [14][15]；又會被 makeup gain 讓聲音「變好」的錯覺騙。
- **工具怎麼幫**：載入使用者自己的鼓或人聲 → 內建一個簡單的 compressor。即時畫出**輸入包絡、輸出包絡和 gain reduction 曲線**疊在一起，標出「transient 被削掉的地方」和「sustain 被拉起來的地方」。A/B 一律**自動等響度**。最後出小測驗：「這兩段哪個 attack 比較快？」用的是**使用者自己的素材**，這是和 SoundGym 的差別 [32]。
- **跟現有程式碼的連結**：`ADSR.cpp` 的包絡概念可以直接延伸成 envelope follower 和 compressor 的 attack/release。這是新的 C++ DSP 模組，符合專案的學習路線。web 端顯示波形和包絡。
- **MVP**：網頁版，單一 wav 加 4 個參數（threshold、ratio、attack、release），顯示包絡疊圖和等響度 A/B，附 5 題聽力小測驗。
- **如何驗證**：前測和後測。同一批人先做 5 題「哪一段有壓縮、attack 快還是慢」，用 MVP 練 15 分鐘後再做一次，看正確率。另外問：「你現在怎麼決定 attack？」

**優先順序建議**：A（範圍最小、最能發揮 DSP 背景、市場上缺口最明確）→ B（需求面最廣）→ C（教學價值高，但要先把 compressor 寫出來）。三個都先做成網頁 MVP，等驗證有效再考慮 VST/CLAP 外掛。

---

## 6. 來源

1. Sound On Sound, "Mix Mistakes"（10 大錯誤；「90%」為作者印象）— https://www.soundonsound.com/techniques/mix-mistakes
2. Sound On Sound, Mix Rescue 系列 — https://www.soundonsound.com/techniques/mix-rescue
3. Mixing Secrets for the Small Studio（第 1 版）目錄 — https://descubridor.academia.cl/Record/18580/TOC
4. r/audioengineering "What is something that immediately signals amateur work?"（第三方鏡像）— https://reddit.sentinel-team.org/posts/1sojgr8/snapshots/2026-04-18T09%3A38%3A51.46032Z
5. Gearspace, "Muddy mixes" — https://gearspace.com/threads/muddy-mixes.624161/
6. Gearspace, "Muddy mixes" — https://gearspace.com/threads/muddy-mixes.1449113/
7. Gearspace, "Muddy mix" — https://gearspace.com/threads/muddy-mix.860119/
8. Image-Line 論壇, "Clipping problems with master fader" — https://forum.image-line.com/viewtopic.php?p=169914
9. FL Studio 官方手冊, Mixing levels — https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/mixer_levelsandmixing.htm
10. Steinberg 論壇, "Quiet finished tracks" — https://forums.steinberg.net/t/quiet-finished-tracks/612315
11. KVR, "LUFS -14, is it a mandatory rule?" — https://www.kvraudio.com/forum/viewtopic.php?p=7875459
12. Gearspace, "Right LUFS" — https://gearspace.com/threads/right-lufs.1234255/
13. The Gear Forum, "Having a hard time hitting -14LUFS" — https://thegearforum.com/threads/having-a-hard-time-hitting-14lufs.4402/page-3
14. Gearspace, "Hearing compression" — https://gearspace.com/threads/hearing-compression.542534/
15. Gearspace, "Hearing compression" — https://gearspace.com/threads/hearing-compression.815017/
16. Ableton 論壇, "Cleaning Up A Muddy Bass?" — https://forum.ableton.com/viewtopic.php?p=1383910
17. Gearspace, "Phase issues when layering drums" — https://gearspace.com/threads/phase-issues-when-layering-drums.428558/
18. Gearspace, "Phase issues when using multiple kick and other samples" — https://gearspace.com/threads/phase-issues-when-using-multiple-kick-and-other-samples.1133092/
19. Gearspace, "Mixing singing" — https://gearspace.com/threads/mixing-singing.475703/
20. Gearspace, "Setting the vocal level" — https://gearspace.com/threads/setting-the-vocal-level.68158/
21. Gearspace, translation 討論（車上 vs 耳機）— https://gearspace.com/threads/query.138291/
22. VI-Control, "Mixing and music transference between different mediums" — https://vi-control.net/community/threads/mixing-and-music-transference-between-different-mediums-audio-devices.106046/
23. BeatTips, "When You Mix with Headphones, the Key is Translation" — https://beattips.com/when-you-mix-with-headphones-the-key-is-translation/
24. VI-Control, "Why does my mix sound muddy if it sounded ok in my headphone/monitors" — https://vi-control.net/community/threads/why-does-my-mix-sound-muddy-if-it-sounded-ok-in-my-headphone-monitors.104142/page-3
25. iZotope Neutron 產品頁 — https://www.izotope.com/en/products/neutron.html
26. iZotope Neutron 4 Assistant 說明文件 — https://s3.amazonaws.com/izotopedownloads/docs/neutron4/en/assistant/index.html
27. iZotope Ozone 產品頁 — https://www.izotope.com/en/products/ozone.html
28. iZotope Tonal Balance Control 產品頁 — https://www.izotope.com/en/products/tonal-balance-control.html
29. sonible smart:EQ 4 — https://www.sonible.com/smarteq4/
30. Mastering The Mix LEVELS — https://www.masteringthemix.com/products/levels
31. RoEx Mix Check Studio — https://mixcheckstudio.roexaudio.com/
32. SoundGym — https://www.soundgym.co/
33. Syntorial — https://www.syntorial.com/
34. Ableton Learning Music — https://learningmusic.ableton.com/
35. Sound On Sound, Mixing Secrets 書評 — https://www.soundonsound.com/reviews/mixing-secrets-small-studio
