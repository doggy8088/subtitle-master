/**
 * Subtitle Master - TXT / Plain Text Parser
 * Parses plain text lines with optional timestamps [00:01:23] or line-by-line dialogues.
 */

import { parseTimestampToSeconds } from '../utils/time.js';

/**
 * Parses plain text or transcript into cues.
 * @param {string} txt 
 * @returns {{ cues: Array, warnings: string[] }}
 */
export function parseTxt(txt) {
  const cues = [];
  const warnings = [];

  if (!txt || typeof txt !== 'string' || txt.trim() === '') {
    return { cues, warnings };
  }

  let text = txt;
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.substring(1);
  }
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let currentTime = 0;
  const defaultDuration = 3.0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line starts with timestamp like [00:01:23] or (00:01:23) or 00:01:23
    const match = line.match(/^\[?\(?(\d{1,2}:\d{2}(?::\d{2})?(?:[\.,]\d{1,3})?)\)?\]?\s*(.*)$/);
    if (match) {
      const timeSec = parseTimestampToSeconds(match[1]);
      const textContent = match[2].trim();
      if (textContent) {
        cues.push({
          id: cues.length + 1,
          start: timeSec,
          end: timeSec + defaultDuration,
          text: textContent
        });
        currentTime = timeSec + defaultDuration;
        continue;
      }
    }

    // Otherwise standard line
    cues.push({
      id: cues.length + 1,
      start: currentTime,
      end: currentTime + defaultDuration,
      text: line
    });
    currentTime += defaultDuration + 0.5;
  }

  return { cues, warnings };
}
