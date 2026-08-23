/**
 * Subtitle Master - Smart Diagnostics & Quality Inspector
 * Detects format syntax errors, unparseable cues, overlapping timestamps,
 * inverted durations, empty lines, and provides 1-click auto-repair.
 */

import { formatSecondsToVtt } from '../utils/time.js';
import { generateSubtitle } from '../generators/index.js';
import { parseSubtitle, detectFormat } from '../parsers/index.js';

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
 * Deletes empty subtitle segments, fixes inverted/zero durations, fixes overlapping timestamps,
 * fixes malformed arrow syntax, and regenerates valid subtitle text.
 * @param {string} rawText
 * @param {Array} [cues=[]]
 * @param {string} [format='auto']
 * @returns {{ fixedText: string, fixedCues: Array, fixedCount: number }}
 */
export function autoFixSubtitle(rawText, cues = [], format = 'auto') {
  let fixedText = rawText || '';
  let fixedCount = 0;

  // 1. Fix single arrows "->" to "-->" in raw text
  if (/\d\s*->\s*\d/.test(fixedText)) {
    const arrowFixed = fixedText.replace(/(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3})\s*->\s*(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3})/g, '$1 --> $2');
    if (arrowFixed !== fixedText) {
      fixedText = arrowFixed;
      fixedCount++;
    }
  }

  // 2. Obtain working cues
  let workingCues = Array.isArray(cues) && cues.length > 0 ? cues.map(c => ({ ...c })) : [];

  // If cues was empty or arrow was fixed, try parsing from fixedText
  if (workingCues.length === 0 && fixedText.trim()) {
    const parsed = parseSubtitle(fixedText, format);
    if (parsed.cues && parsed.cues.length > 0) {
      workingCues = parsed.cues.map(c => ({ ...c }));
    }
  }

  const fixedCues = [];

  // 3. Process cues: drop empty cues, fix inverted/zero duration, fix overlap, trim whitespace
  for (let i = 0; i < workingCues.length; i++) {
    const curr = workingCues[i];
    const textTrimmed = (curr.text || '').trim();

    // Remove empty cue segments
    if (!textTrimmed) {
      fixedCount++;
      continue;
    }

    if (textTrimmed !== curr.text) {
      curr.text = textTrimmed;
      fixedCount++;
    }

    // Fix inverted/zero duration
    if (curr.end <= curr.start) {
      curr.end = curr.start + 2.0;
      fixedCount++;
    }

    // Fix overlap with previous valid cue
    if (fixedCues.length > 0) {
      const prev = fixedCues[fixedCues.length - 1];
      if (curr.start < prev.end) {
        prev.end = Math.max(prev.start + 0.5, curr.start);
        fixedCount++;
      }
    }

    fixedCues.push(curr);
  }

  // 4. If any cues were processed or format is known, regenerate the clean subtitle text
  if (workingCues.length > 0 || fixedCount > 0) {
    let targetFmt = format;
    if (!targetFmt || targetFmt === 'auto') {
      targetFmt = detectFormat(fixedText) || 'srt';
    }
    const regenerated = generateSubtitle(fixedCues, targetFmt);
    if (regenerated !== undefined) {
      fixedText = regenerated;
    }
  }

  return {
    fixedText,
    fixedCues,
    fixedCount
  };
}

/**
 * Accurately finds the start and end character offsets of a cue or diagnostic issue in rawText.
 * Handles SRT, WebVTT, ASS/SSA, LRC, and malformed syntax with high precision.
 * @param {string} rawText 
 * @param {DiagnosticIssue} issue 
 * @param {Array} cues 
 * @returns {{ start: number, end: number } | null}
 */
export function locateIssueInText(rawText, issue, cues = []) {
  if (!rawText || typeof rawText !== 'string') return null;

  const text = rawText;

  // 1. If issue is malformed arrow (-> instead of -->)
  if (issue.type === 'syntax_arrow') {
    const arrowRegex = /(\d{1,2}:\d{2}(?::\d{2})?[,\.]\d{1,3})\s*->\s*(\d{1,2}:\d{2}(?::\d{2})?[,\.]\d{1,3})/g;
    let match;
    let targetMatch = null;
    let count = 0;
    const targetIdx = issue.cueIndex !== undefined ? issue.cueIndex : 0;

    while ((match = arrowRegex.exec(text)) !== null) {
      if (count === targetIdx || targetMatch === null) {
        targetMatch = match;
      }
      if (count === targetIdx) break;
      count++;
    }

    if (targetMatch) {
      let lineStart = text.lastIndexOf('\n', targetMatch.index);
      lineStart = lineStart === -1 ? 0 : lineStart + 1;

      // Check if line before is an integer ID
      if (lineStart > 1) {
        const prevLineBreak = text.lastIndexOf('\n', lineStart - 2);
        const prevLineStart = prevLineBreak === -1 ? 0 : prevLineBreak + 1;
        const prevLineText = text.substring(prevLineStart, lineStart - 1).trim();
        if (/^\d+$/.test(prevLineText)) {
          lineStart = prevLineStart;
        }
      }

      let blockEnd = text.indexOf('\n\n', targetMatch.index);
      if (blockEnd === -1) blockEnd = text.indexOf('\r\n\r\n', targetMatch.index);
      if (blockEnd === -1) blockEnd = text.length;

      return { start: lineStart, end: blockEnd };
    }

    const simpleArrow = text.indexOf('->');
    if (simpleArrow !== -1) {
      const lStart = text.lastIndexOf('\n', simpleArrow);
      const lEnd = text.indexOf('\n', simpleArrow);
      return {
        start: lStart === -1 ? 0 : lStart + 1,
        end: lEnd === -1 ? text.length : lEnd
      };
    }
  }

  // 2. If issue is general syntax error (unparseable)
  if (issue.type === 'syntax_error') {
    const match = text.match(/\S+/);
    if (match) {
      const lineStart = text.lastIndexOf('\n', match.index);
      const lineEnd = text.indexOf('\n', match.index);
      return {
        start: lineStart === -1 ? 0 : lineStart + 1,
        end: lineEnd === -1 ? text.length : lineEnd
      };
    }
    return { start: 0, end: Math.min(text.length, 50) };
  }

  // 3. For any issue with a cueIndex (zero_duration, overlap, empty_text, long_duration, short_duration, etc.)
  if (issue.cueIndex !== undefined && issue.cueIndex >= 0) {
    const k = issue.cueIndex;

    // Check Format A: ASS / SSA format (Dialogue: lines)
    if (/\[Events\]|Dialogue:/i.test(text)) {
      const dialogueRegex = /^[ \t]*Dialogue:[^\n]*/gim;
      let match;
      let dIndex = 0;
      while ((match = dialogueRegex.exec(text)) !== null) {
        if (dIndex === k) {
          return { start: match.index, end: match.index + match[0].length };
        }
        dIndex++;
      }
    }

    // Check Format B: LRC format ([mm:ss.xx] lines)
    if (/\[\d{1,2}:\d{2}[.\:]\d{2,3}\]/.test(text)) {
      const lrcRegex = /^[ \t]*\[\d{1,2}:\d{2}[.\:]\d{2,3}\][^\n]*/gm;
      let match;
      let lIndex = 0;
      while ((match = lrcRegex.exec(text)) !== null) {
        if (lIndex === k) {
          return { start: match.index, end: match.index + match[0].length };
        }
        lIndex++;
      }
    }

    // Check Format C: SRT / WebVTT standard timestamp lines (-->)
    const timecodeRegex = /(\d{1,2}:\d{2}(?::\d{2})?[,\.]\d{1,3})\s*(-->|->)\s*(\d{1,2}:\d{2}(?::\d{2})?[,\.]\d{1,3})/g;
    let match;
    let tIndex = 0;
    while ((match = timecodeRegex.exec(text)) !== null) {
      if (tIndex === k) {
        // Find start of cue block
        let blockStart = text.lastIndexOf('\n', match.index);
        blockStart = blockStart === -1 ? 0 : blockStart + 1;

        // Check if preceding line is a numeric ID (e.g. "1", "2") or cue ID tag
        if (blockStart > 1) {
          const prevLineBreak = text.lastIndexOf('\n', blockStart - 2);
          const prevLineStart = prevLineBreak === -1 ? 0 : prevLineBreak + 1;
          const prevLineContent = text.substring(prevLineStart, blockStart - 1).trim();
          if (/^\d+$/.test(prevLineContent) || (prevLineContent.length > 0 && !prevLineContent.includes('-->') && !prevLineContent.startsWith('WEBVTT'))) {
            blockStart = prevLineStart;
          }
        }

        // Find end of cue block (next double newline or next timestamp line or EOF)
        let blockEnd = text.indexOf('\n\n', match.index);
        if (blockEnd === -1) blockEnd = text.indexOf('\r\n\r\n', match.index);
        if (blockEnd === -1) blockEnd = text.length;

        return { start: blockStart, end: blockEnd };
      }
      tIndex++;
    }

    // Fallback: Search sequentially by cue text
    if (cues && cues[k] && cues[k].text) {
      const cueText = cues[k].text.trim().split('\n')[0].trim();
      if (cueText) {
        let searchFrom = 0;
        for (let prevIdx = 0; prevIdx < k; prevIdx++) {
          if (cues[prevIdx] && cues[prevIdx].text) {
            const prevText = cues[prevIdx].text.trim().split('\n')[0].trim();
            if (prevText) {
              const found = text.indexOf(prevText, searchFrom);
              if (found !== -1) searchFrom = found + prevText.length;
            }
          }
        }
        const textPos = text.indexOf(cueText, searchFrom);
        if (textPos !== -1) {
          let lineStart = text.lastIndexOf('\n', textPos);
          lineStart = lineStart === -1 ? 0 : lineStart + 1;
          let lineEnd = text.indexOf('\n', textPos);
          lineEnd = lineEnd === -1 ? text.length : lineEnd;
          return { start: lineStart, end: lineEnd };
        }
      }
    }
  }

  return null;
}
