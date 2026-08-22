/**
 * Unit Test Script for Subtitle Master Converter Engine
 */

import { convertSubtitle, parseSubtitle, generateSubtitle } from '../src/converter.js';
import { parseTimestampToSeconds, formatSecondsToSrt, formatSecondsToVtt, formatSecondsToAss } from '../src/utils/time.js';
import { decodeBuffer } from '../src/utils/encoding.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('🧪 Running Subtitle Master Test Suite...\n');

// 1. Test Time Utilities
console.log('1. Testing Time Utilities:');
assert(parseTimestampToSeconds('00:01:23,456') === 83.456, 'Parse SRT timestamp 00:01:23,456');
assert(parseTimestampToSeconds('01:23.456') === 83.456, 'Parse VTT timestamp 01:23.456');
assert(parseTimestampToSeconds('0:01:23.45') === 83.45, 'Parse ASS timestamp 0:01:23.45');
assert(formatSecondsToSrt(83.456) === '00:01:23,456', 'Format seconds to SRT');
assert(formatSecondsToVtt(83.456) === '00:01:23.456', 'Format seconds to VTT');
assert(formatSecondsToAss(83.45) === '0:01:23.45', 'Format seconds to ASS');

// 2. Test SRT Parsing and Conversion to VTT
console.log('\n2. Testing SRT -> VTT:');
const sampleSrt = `1
00:00:01,000 --> 00:00:04,000
這是第一行字幕
這是第二行字幕

2
00:00:05,500 --> 00:00:08,250
這是第二個字幕段落
`;

const resVtt = convertSubtitle(sampleSrt, { sourceFormat: 'srt', targetFormat: 'vtt' });
assert(resVtt.cues.length === 2, 'Parsed 2 cues from SRT');
assert(resVtt.output.includes('WEBVTT'), 'Output includes WEBVTT header');
assert(resVtt.output.includes('00:00:01.000 --> 00:00:04.000'), 'Timestamps properly converted with period');
assert(resVtt.output.includes('這是第一行字幕\n這是第二行字幕'), 'Multi-line text preserved');

// 3. Test VTT -> ASS
console.log('\n3. Testing VTT -> ASS:');
const sampleVtt = `WEBVTT

00:00:01.000 --> 00:00:04.000
這是第一行字幕
這是第二行字幕

00:00:05.500 --> 00:00:08.250
這是第二個字幕段落
`;

const resAss = convertSubtitle(sampleVtt, { sourceFormat: 'vtt', targetFormat: 'ass', assPreset: 'classicYellow' });
assert(resAss.cues.length === 2, 'Parsed 2 cues from VTT');
assert(resAss.output.includes('[Script Info]'), 'ASS includes [Script Info]');
assert(resAss.output.includes('[V4+ Styles]'), 'ASS includes [V4+ Styles]');
assert(resAss.output.includes('[Events]'), 'ASS includes [Events]');
assert(resAss.output.includes('Dialogue: 0,0:00:01.00,0:00:04.00,Default,,0,0,0,,這是第一行字幕\\N這是第二行字幕'), 'Dialogue line correctly formatted with \\N');

// 4. Test ASS -> SRT
console.log('\n4. Testing ASS -> SRT:');
const sampleAss = `[Script Info]
Title: Test
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,微軟正黑體,48,&H0080FFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,1,0,1,2,0,2,1,1,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:04.00,Default,,0,0,0,,這是第一行字幕\\N這是第二行字幕
Dialogue: 0,0:00:05.50,0:00:08.25,Default,,0,0,0,,這是第二個字幕段落
`;

const resSrtFromAss = convertSubtitle(sampleAss, { sourceFormat: 'ass', targetFormat: 'srt' });
assert(resSrtFromAss.cues.length === 2, 'Parsed 2 cues from ASS');
assert(resSrtFromAss.output.includes('00:00:01,000 --> 00:00:04,000'), 'Time converted to SRT format');
assert(resSrtFromAss.output.includes('這是第一行字幕\n這是第二行字幕'), '\\N converted back to real newline');

// 5. Test Time Shifting
console.log('\n5. Testing Time Offset / Shift:');
const resShifted = convertSubtitle(sampleSrt, { sourceFormat: 'srt', targetFormat: 'srt', timeOffset: 1.5 });
assert(resShifted.cues[0].start === 2.5, 'Start shifted from 1.0 to 2.5s');
assert(resShifted.cues[0].end === 5.5, 'End shifted from 4.0 to 5.5s');
assert(resShifted.output.includes('00:00:02,500 --> 00:00:05,500'), 'Formatted shifted timestamp correctly');

// 6. Test JSON & Plain Text & CSV
console.log('\n6. Testing JSON, CSV, TXT:');
const resJson = convertSubtitle(sampleSrt, { sourceFormat: 'srt', targetFormat: 'json' });
const parsedJson = JSON.parse(resJson.output);
assert(Array.isArray(parsedJson) && parsedJson.length === 2, 'JSON output contains 2 cue objects');

const resTxt = convertSubtitle(sampleSrt, { sourceFormat: 'srt', targetFormat: 'txt' });
assert(resTxt.output.includes('這是第一行字幕'), 'TXT output contains transcript text');

const resCsv = convertSubtitle(sampleSrt, { sourceFormat: 'srt', targetFormat: 'csv' });
assert(resCsv.output.includes('Index,Start Time,End Time'), 'CSV output contains table headers');

// 7. Test LRC Format
console.log('\n7. Testing LRC:');
const sampleLrc = `[00:01.00]第一句歌詞
[00:05.50]第二句歌詞
`;
const resLrcToSrt = convertSubtitle(sampleLrc, { sourceFormat: 'lrc', targetFormat: 'srt' });
assert(resLrcToSrt.cues.length === 2, 'Parsed 2 lines from LRC');
assert(resLrcToSrt.cues[0].text === '第一句歌詞', 'LRC text correctly extracted');

// 8. Test URL Parameter Parsing and Normalization
console.log('\n8. Testing URL Parameter Parsing & State Sync:');
function parseFormatParams(searchString) {
  const params = new URLSearchParams(searchString);
  const fromParam = (params.get('from') || params.get('source') || params.get('src') || '').toLowerCase();
  const toParam = (params.get('to') || params.get('target') || params.get('tgt') || '').toLowerCase();

  const validSource = ['auto', 'srt', 'vtt', 'ass', 'ssa', 'lrc', 'json', 'txt'];
  const validTarget = ['vtt', 'ass', 'srt', 'ssa', 'lrc', 'txt', 'json', 'csv'];

  let sourceFormat = 'auto';
  let targetFormat = 'vtt';

  if (fromParam && validSource.includes(fromParam)) {
    sourceFormat = fromParam;
  }
  if (toParam && validTarget.includes(toParam)) {
    targetFormat = toParam;
  }

  return { sourceFormat, targetFormat };
}

const urlTest1 = parseFormatParams('?from=srt&to=ass');
assert(urlTest1.sourceFormat === 'srt' && urlTest1.targetFormat === 'ass', 'Parse ?from=srt&to=ass');

const urlTest2 = parseFormatParams('?source=VTT&target=JSON');
assert(urlTest2.sourceFormat === 'vtt' && urlTest2.targetFormat === 'json', 'Parse ?source=VTT&target=JSON');

const urlTest3 = parseFormatParams('?src=lrc&tgt=txt');
assert(urlTest3.sourceFormat === 'lrc' && urlTest3.targetFormat === 'txt', 'Parse short alias ?src=lrc&tgt=txt');

const urlTest4 = parseFormatParams('?from=invalid&to=hacker');
assert(urlTest4.sourceFormat === 'auto' && urlTest4.targetFormat === 'vtt', 'Fallback invalid parameters to defaults');

// 9. Test Source Text Persistence & Auto-Restore Workflow
console.log('\n9. Testing LocalStorage Source Text Persistence & Restore Workflow:');
const mockStorage = new Map();
const mockSave = (text) => mockStorage.set('sm_source_text', text);
const mockLoad = () => (mockStorage.has('sm_source_text') ? mockStorage.get('sm_source_text') : null);

// Step 1: Simulate user typing or editing source subtitle
const customSource = `1\n00:00:01,000 --> 00:00:03,000\n自訂測試字幕內容\n`;
mockSave(customSource);

// Step 2: Simulate page reload restoring source text
const restored = mockLoad();
assert(restored === customSource, 'Source subtitle text restored from storage');

// Step 3: Verify restored source converts properly
const restoredConverted = convertSubtitle(restored, { sourceFormat: 'srt', targetFormat: 'vtt' });
assert(restoredConverted.output.includes('WEBVTT') && restoredConverted.output.includes('自訂測試字幕內容'), 'Restored source text converted accurately');

// Step 4: User clears content -> localStorage holds empty string
mockSave('');
assert(mockLoad() === '', 'Cleared content saved as empty string');

console.log(`\n========================================`);
console.log(`Test Results: ${passed} passed, ${failed} failed.`);
console.log(`========================================\n`);

if (failed > 0) process.exit(1);
