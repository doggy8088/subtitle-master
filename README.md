# Subtitle Master 字幕萬用轉換大師 🎬

> 簡單、強大、極速、100% 隱私安全的萬用字幕格式轉換器。

![Subtitle Master](https://img.shields.io/badge/Subtitle-Master-6366f1?style=for-the-badge&logo=youtube&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)
![Privacy](https://img.shields.io/badge/Privacy-100%25%20Local-blue?style=for-the-badge)

整合並大幅進化 `srt2vtt` 與 `vtt2ass`，專為影片創作者、譯者、工程師與一般大眾設計的次世代字幕格式轉換工具。

---

## ✨ 核心特色

- 🔄 **全格式任意互轉**：支援 **SRT**、**WebVTT** (.vtt)、**ASS** (Advanced SubStation Alpha)、**SSA**、**LRC** (歌詞)、**JSON**、**CSV**、**TXT** (純文字文稿) 任意雙向轉換。
- ⚡ **100% 本機瀏覽器端極速處理**：檔案不經伺服器上傳，無外洩風險，秒速完成轉換。
- 🎯 **直覺極簡 UI / UX**：
  - **桌面版（單一視窗設計）**：採用 100vh 視區配置，免除整個頁面的上下/左右捲軸，操作流暢一氣呵成。
  - **手機版（觸控最佳化）**：針對行動裝置設計 Tab 切換、大尺寸點擊目標（Tap Target）與底部快速操作列。
- 📂 **拖曳上傳與智慧格式辨識**：直接將字幕檔案拖進視窗，自動判斷來源格式並推薦最佳目標格式。
- 📦 **多檔案批次轉換**：支援一次拖入多個字幕檔，一鍵轉換並打包下載為 **ZIP** 壓縮檔。
- ⏱️ **時間軸平移微調 (Time Shift)**：支援 `±0.5s`、`±1.0s` 或自訂秒數，秒修字幕影音不同步問題。
- 🎨 **ASS 字幕樣式自訂**：內建經典黃字黑邊、現代極簡白、Netflix 風格、動漫櫻花粉、科技青藍等預設集，可自訂字型大小與顏色。
- 👁️ **三合一多重預覽模式**：
  1. **原始碼檢視 (Raw Code)**：直接檢視與複製轉換結果。
  2. **表格資料檢視 (Table View)**：條列式時間戳與字幕，支援點擊直接編輯個別語句。
  3. **畫面即時預覽 (Screen Preview)**：模擬 16:9 螢幕播放效果與字幕樣式排版。
- 🌐 **字元編碼智慧解析 (Encoding)**：內建 UTF-8、Big5、GB18030/GBK、Shift-JIS、UTF-16 等自動偵測，徹底告別 Windows/舊檔亂碼問題。
- 🎉 **慶祝微互動**：複製與轉換完成時提供彩帶動畫與激勵金句，情緒價值拉滿！

---

## 🚀 支援轉換格式矩陣

| 來源格式 \ 目標格式 | SRT | WebVTT | ASS | SSA | LRC | JSON | CSV | TXT |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **SRT** | 🔄 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **WebVTT** | ✅ | 🔄 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **ASS** | ✅ | ✅ | 🔄 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **SSA** | ✅ | ✅ | ✅ | 🔄 | ✅ | ✅ | ✅ | ✅ |
| **LRC** | ✅ | ✅ | ✅ | ✅ | 🔄 | ✅ | ✅ | ✅ |
| **JSON** | ✅ | ✅ | ✅ | ✅ | ✅ | 🔄 | ✅ | ✅ |
| **TXT** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🔄 |

---

## 🛠️ 本地開發與執行

本專案採用純前端靜態架構（ES Modules + Tailwind CSS），無需繁複的編譯建置流程，可直接在現代瀏覽器或任何靜態網站主機（如 GitHub Pages）上運作。

### 1. 執行單元測試
```bash
npm test
```

### 2. 啟動本機開發伺服器
```bash
npm run dev
# 或
npx serve .
```

---

## 📁 專案架構

```text
subtitle-master/
├── index.html              # 主應用程式介面
├── favicon.ico             # 網站圖示
├── CNAME                   # 自訂網域名稱
├── .nojekyll               # GitHub Pages 靜態設定
├── package.json            # 專案資訊與指令
├── test/
│   └── converter.test.js   # 轉換引擎全功能單元測試
└── src/
    ├── app.js              # UI 核心控制器與互動邏輯
    ├── converter.js        # 核心轉換引擎與統計分析
    ├── css/
    │   └── app.css         # 自訂樣式、動畫與捲軸
    ├── parsers/            # 字幕解析器模組
    │   ├── detector.js     # 格式智慧自動檢測
    │   ├── srt.js          # SRT 解析器
    │   ├── vtt.js          # WebVTT 解析器
    │   ├── ass.js          # ASS / SSA 解析器
    │   ├── lrc.js          # LRC 歌詞解析器
    │   ├── json.js         # JSON 解析器
    │   ├── txt.js          # TXT 純文字解析器
    │   └── index.js
    ├── generators/         # 字幕產生器模組
    │   ├── srt.js          # SRT 產生器
    │   ├── vtt.js          # WebVTT 產生器
    │   ├── ass.js          # ASS 產生器 (含樣式自訂)
    │   ├── ssa.js          # SSA 產生器
    │   ├── lrc.js          # LRC 產生器
    │   ├── json.js         # JSON 產生器
    │   ├── csv.js          # CSV 產生器
    │   ├── txt.js          # TXT 產生器
    │   └── index.js
    ├── utils/              # 通用工具
    │   ├── time.js         # 時間格式轉換與時間軸平移
    │   ├── encoding.js     # 字元編碼自動偵測與解碼
    │   └── sampleSubtitles.js # 內建示範字幕
    └── ui/                 # 介面互動
        ├── confetti.js     # 彩帶粒子與慶祝彈窗
        └── toast.js        # 提示通知系統
```

---

## 👤 作者資訊

- **Will 保哥**
- Twitter: [@Will_Huang](https://twitter.com/Will_Huang)
- GitHub: [@doggy8088](https://github.com/doggy8088)
- Facebook: [Will 保哥的技術交流中心](https://www.facebook.com/will.fans)

---

## 📄 授權條款

本專案採用 [MIT License](LICENSE) 授權。
