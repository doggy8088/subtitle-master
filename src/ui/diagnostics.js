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
 * @property {boolean} fixable
 * @property {string} [searchHint]
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
        message: '時間軸箭頭語法錯誤：發現誤寫為 "->"（標準時間格式應為 "-->"，例如 00:00:01,000 --> 00:00:04,000）',
        fixable: true,
        searchHint: '->'
      });
    } else {
      issues.push({
        type: 'syntax_error',
        message: '格式無法解析：未找到有效字幕時間軸（請確認格式，例如 00:00:01,000 --> 00:00:04,000 或 [00:01.00]）',
        fixable: false,
        searchHint: text.slice(0, 30)
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
      message: '發現部分時間軸使用 "->" 箭頭（標準應為 "-->"），可能導致部分語句遺漏',
      fixable: true,
      searchHint: '->'
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
        fixable: true,
        searchHint: cue.text ? cue.text.split('\n')[0] : ''
      });
    }

    // Time overlap with previous cue
    if (prev && cue.start < prev.end && cue.end > cue.start) {
      const overlap = prev.end - cue.start;
      issues.push({
        type: 'overlap',
        cueIndex: i,
        message: `第 ${i} 句與第 ${i + 1} 句時間軸重疊 ${overlap.toFixed(2)} 秒`,
        fixable: true,
        searchHint: cue.text ? cue.text.split('\n')[0] : ''
      });
    }

    // Empty text
    if (!cue.text || cue.text.trim() === '') {
      issues.push({
        type: 'empty_text',
        cueIndex: i,
        message: `第 ${i + 1} 句字幕缺少文字內容`,
        fixable: true,
        searchHint: ''
      });
    }

    // Excessive duration (> 15 seconds)
    if (cue.end - cue.start > 15) {
      issues.push({
        type: 'long_duration',
        cueIndex: i,
        message: `第 ${i + 1} 句字幕停留時間過長 (${(cue.end - cue.start).toFixed(1)} 秒)`,
        fixable: false,
        searchHint: cue.text ? cue.text.split('\n')[0] : ''
      });
    }

    // Extremely short duration (< 0.3 seconds)
    if (cue.end - cue.start < 0.3 && cue.end > cue.start) {
      issues.push({
        type: 'short_duration',
        cueIndex: i,
        message: `第 ${i + 1} 句字幕停留時間極短 (${(cue.end - cue.start).toFixed(2)} 秒，可能一閃而過)`,
        fixable: false,
        searchHint: cue.text ? cue.text.split('\n')[0] : ''
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

/**
 * Calculates start and end character offsets in raw source text for an issue.
 * @param {string} rawText 
 * @param {DiagnosticIssue} issue 
 * @param {Array} cues 
 * @returns {{ start: number, end: number } | null}
 */
export function locateIssueInText(rawText, issue, cues = []) {
  if (!rawText) return null;

  // 1. Syntax arrow issue
  if (issue.type === 'syntax_arrow') {
    const match = rawText.match(/\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3}\s*->\s*\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3}/);
    if (match) {
      const idx = rawText.indexOf(match[0]);
      return { start: idx, end: idx + match[0].length };
    }
    const arrowIdx = rawText.indexOf('->');
    if (arrowIdx !== -1) {
      return { start: Math.max(0, arrowIdx - 10), end: Math.min(rawText.length, arrowIdx + 12) };
    }
  }

  // 2. Syntax error issue
  if (issue.type === 'syntax_error') {
    return { start: 0, end: Math.min(rawText.length, 50) };
  }

  // 3. Issues with cueIndex
  if (issue.cueIndex !== undefined && cues && cues[issue.cueIndex]) {
    const cue = cues[issue.cueIndex];

    // Search by cue text
    if (cue.text && cue.text.trim()) {
      const firstLine = cue.text.split('\n')[0].trim();
      const textIdx = rawText.indexOf(firstLine);
      if (textIdx !== -1) {
        // Include line before text (timestamp line)
        const beforeText = rawText.substring(0, textIdx);
        const lastLineBreak = beforeText.lastIndexOf('\n', beforeText.lastIndexOf('\n') - 1);
        const startPos = lastLineBreak !== -1 ? lastLineBreak + 1 : 0;
        return { start: startPos, end: textIdx + firstLine.length };
      }
    }

    // Search by searchHint
    if (issue.searchHint) {
      const hintIdx = rawText.indexOf(issue.searchHint);
      if (hintIdx !== -1) {
        return { start: hintIdx, end: hintIdx + issue.searchHint.length };
      }
    }

    // Search by cue ID number on a single line (e.g. \n2\n)
    const idRegex = new RegExp(`(^|\\n)\\s*${issue.cueIndex + 1}\\s*\\n`);
    const idMatch = rawText.match(idRegex);
    if (idMatch) {
      const startPos = idMatch.index + idMatch[1].length;
      return { start: startPos, end: Math.min(rawText.length, startPos + 60) };
    }
  }

  return null;
}
