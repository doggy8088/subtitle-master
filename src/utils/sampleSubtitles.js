/**
 * Subtitle Master - Sample Subtitles for Testing and Demonstrations
 */

export const SAMPLE_SUBTITLES = {
  srt: `1
00:00:01,200 --> 00:00:04,500
歡迎使用 Subtitle Master 字幕萬用轉換大師！
這是一個專為影片創作者與工程師設計的工具。

2
00:00:04,800 --> 00:00:08,350
支援 SRT、VTT、ASS、SSA、LRC、JSON 等多種格式互轉，
完全在瀏覽器本機端執行，保護您的隱私安全。

3
00:00:08,800 --> 00:00:12,600
您可以直接拖曳檔案上傳、自訂 ASS 字幕樣式，
或是進行時間軸平移微調！🚀
`,

  vtt: `WEBVTT

00:00:01.200 --> 00:00:04.500
歡迎使用 Subtitle Master 字幕萬用轉換大師！
這是一個專為影片創作者與工程師設計的工具。

00:00:04.800 --> 00:00:08.350
支援 SRT、VTT、ASS、SSA、LRC、JSON 等多種格式互轉，
完全在瀏覽器本機端執行，保護您的隱私安全。

00:00:08.800 --> 00:00:12.600
您可以直接拖曳檔案上傳、自訂 ASS 字幕樣式，
或是進行時間軸平移微調！🚀
`,

  ass: `[Script Info]
Title: Subtitle Master 示範
ScriptType: v4.00+
WrapStyle: 0
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,微軟正黑體,52,&H0000FFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2.5,1.2,2,40,40,45,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.20,0:00:04.50,Default,,0,0,0,,歡迎使用 Subtitle Master 字幕萬用轉換大師！\\N這是一個專為影片創作者與工程師設計的工具。
Dialogue: 0,0:00:04.80,0:00:08.35,Default,,0,0,0,,支援 SRT、VTT、ASS、SSA、LRC、JSON 等多種格式互轉，\\N完全在瀏覽器本機端執行，保護您的隱私安全。
Dialogue: 0,0:00:08.80,0:00:12.60,Default,,0,0,0,,您可以直接拖曳檔案上傳、自訂 ASS 字幕樣式，\\N或是進行時間軸平移微調！🚀
`,

  lrc: `[ti:Subtitle Master]
[ar:Will 保哥]
[00:01.20]歡迎使用 Subtitle Master 字幕萬用轉換大師！
[00:04.80]支援 SRT、VTT、ASS、LRC 等多種格式任意互轉
[00:08.80]完全在瀏覽器本機執行，保護您的隱私安全！🚀
`
};
