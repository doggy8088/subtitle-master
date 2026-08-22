/**
 * Subtitle Master - Smart Diagnostics & Quality Inspector
 * Detects format syntax errors, unparseable cues, overlapping timestamps,
 * inverted durations, empty lines, and provides 1-click auto-repair.
 */

import { formatSecondsToVtt } from '../utils/time.js';

/**
 * @typedef {Object} DiagnosticIssue
 * @property {'syntax_error'|'syntax_arrow'|'zero_duration'|'overlap'|'empty_text'|'long_duration'|'short_duration'} type
 * @property {number} [cueIndex]
 * @property {string} message
 * @property {boolean} [fixable]
 */

/**
 * Inspects both raw input text and parsed cues for errors and quality defects.
 * @param {string} rawText 
 * @param {Array} cues 
 * @param {string} [format='auto'] 
 * @returns {{ issues: DiagnosticIssue[], health: 'none'|'perfect'|'warning'|'danger'|'error', summary: string }}
 */
export function inspectSubtitle(rawText, cues = [], format = 'auto') {
  const issues = [];
  const text = (rawText || '').trim();

  // 1. Empty input
  if (!text) {
    return {
      issues: [],
      health: 'none',
      summary: '未輸入字幕'
    };
  }

  // 2. Syntax / Format Failure (Text exists but zero cues parsed)
  if (!Array.isArray(cues) || cues.length === 0) {
    if (/\d\s*->\s*\d/.test(text)) {
      issues.push({
        type: 'syntax_arrow',
        message: '時間軸語法錯誤：發現箭頭為 "->"（標準時間格式應為 "-->"，例如 00:00:01,000 --> 00:00:04,000）',
        fixable: true
      });
    } else {
      issues.push({
        type: 'syntax_error',
        message: '格式無法解析：未找到有效的時間軸標記（例如 00:00:01,000 --> 00:00:04,000 或 [00:01.00]）',
        fixable: false
      });
    }

    return {
      issues,
      health: 'error',
      summary: '格式異常 (無法解析)'
    };
  }

  // 3. Check for malformed single arrow syntax in non-empty text that might skip cues
  if (/\d\s*->\s*\d/.test(text) && !/-->/.test(text)) {
    issues.push({
      type: 'syntax_arrow',
      message: '發現部分時間軸使用 "->" 箭頭（標準應為 "-->"）',
      fixable: true
    });
  }

  // 4. Inspect individual cues
  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const prev = i > 0 ? cues[i - 1] : null;

    // Time inversion or zero duration
    if (cue.end <= cue.start) {
      issues.push({
        type: 'zero_duration',
        cueIndex: i,
        message: `第 ${i + 1} 句時間軸倒置或時長為 0（${formatSecondsToVtt(cue.start)} ~ ${formatSecondsToVtt(cue.end)}，結束時間早於或等於開始時間）`,
        fixable: true
      });
    }

    // Time overlap with previous cue
    if (prev && cue.start < prev.end && cue.end > cue.start) {
      const overlap = prev.end - cue.start;
      issues.push({
        type: 'overlap',
        cueIndex: i,
        message: `第 ${i} 句與第 ${i + 1} 句時間軸重疊 ${overlap.toFixed(2)} 秒`,
        fixable: true
      });
    }

    // Empty text
    if (!cue.text || cue.text.trim() === '') {
      issues.push({
        type: 'empty_text',
        cueIndex: i,
        message: `第 ${i + 1} 句字幕缺少文字內容`,
        fixable: true
      });
    }

    // Excessive duration (> 15 seconds)
    if (cue.end - cue.start > 15) {
      issues.push({
        type: 'long_duration',
        cueIndex: i,
        message: `第 ${i + 1} 句字幕停留時間過長 (${(cue.end - cue.start).toFixed(1)} 秒)`,
        fixable: false
      });
    }

    // Extremely short duration (< 0.3 seconds)
    if (cue.end - cue.start < 0.3 && cue.end > cue.start) {
      issues.push({
        type: 'short_duration',
        cueIndex: i,
        message: `第 ${i + 1} 句字幕停留時間極短 (${(cue.end - cue.start).toFixed(2)} 秒，可能一閃而過)`,
        fixable: false
      });
    }
  }

  // 5. Determine health category
  let health = 'perfect';
  let summary = '品質優良';

  const criticalIssues = issues.filter(iss => iss.type === 'zero_duration' || iss.type === 'syntax_arrow' || iss.type === 'syntax_error');

  if (criticalIssues.length > 0) {
    health = 'danger';
    summary = `發現 ${issues.length} 項異常`;
  } else if (issues.length > 0) {
    health = 'warning';
    summary = `發現 ${issues.length} 項提示`;
  }

  return {
    issues,
    health,
    summary
  };
}

/**
 * Automatically repairs common syntax & timing issues.
 * @param {string} rawText
 * @param {Array} cues 
 * @returns {{ fixedText: string, fixedCues: Array, fixedCount: number }}
 */
export function autoFixSubtitle(rawText, cues = []) {
  let fixedText = rawText || '';
  let fixedCount = 0;

  // 1. Fix single arrows "->" to "-->" in raw text
  if (/\d\s*->\s*\d/.test(fixedText)) {
    fixedText = fixedText.replace(/(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3})\s*->\s*(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3})/g, '$1 --> $2');
    fixedCount++;
  }

  // 2. Fix cues timing & text
  const fixedCues = cues.map(c => ({ ...c }));

  for (let i = 0; i < fixedCues.length; i++) {
    const curr = fixedCues[i];
    const prev = i > 0 ? fixedCues[i - 1] : null;

    // Fix inverted/zero duration
    if (curr.end <= curr.start) {
      curr.end = curr.start + 2.0;
      fixedCount++;
    }

    // Fix overlap
    if (prev && curr.start < prev.end) {
      prev.end = Math.max(prev.start + 0.5, curr.start);
      fixedCount++;
    }

    // Trim whitespace
    if (curr.text) {
      const trimmed = curr.text.trim();
      if (trimmed !== curr.text) {
        curr.text = trimmed;
        fixedCount++;
      }
    }
  }

  return {
    fixedText,
    fixedCues,
    fixedCount
  };
}
