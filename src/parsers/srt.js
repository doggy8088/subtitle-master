/**
 * Subtitle Master - SRT Parser
 * Parses SubRip (.srt) subtitle files into standardized CueItem array.
 */

import { parseTimestampToSeconds } from '../utils/time.js';

/**
 * @typedef {Object} CueItem
 * @property {number} id
 * @property {number} start
 * @property {number} end
 * @property {string} text
 * @property {string} [rawText]
 * @property {Object} [settings]
 */

/**
 * Parses SRT text into CueItem array.
 * @param {string} srtText 
 * @returns {{ cues: CueItem[], warnings: string[] }}
 */
export function parseSrt(srtText) {
  const cues = [];
  const warnings = [];

  if (!srtText || typeof srtText !== 'string' || srtText.trim() === '') {
    return { cues, warnings };
  }

  // Remove BOM and normalize line endings
  let text = srtText;
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.substring(1);
  }
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // Split into cue blocks separated by 2 or more newlines
  const blocks = text.split(/\n\s*\n+/);

  let autoId = 1;

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trimEnd()).filter(l => l.length > 0);
    if (lines.length === 0) continue;

    let timeLineIndex = -1;
    let timeMatch = null;

    // Look for timestamp line (e.g. 00:00:01,234 --> 00:00:04,567)
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3})/);
      if (match) {
        timeLineIndex = i;
        timeMatch = match;
        break;
      }
    }

    if (!timeMatch) {
      // Could not find a valid timestamp line in this block
      continue;
    }

    const startSeconds = parseTimestampToSeconds(timeMatch[1]);
    const endSeconds = parseTimestampToSeconds(timeMatch[2]);

    // Text lines are everything after the timestamp line
    const textLines = lines.slice(timeLineIndex + 1);
    const cueText = textLines.join('\n');

    // ID can be the line before the timestamp if it was an integer
    let cueId = autoId;
    if (timeLineIndex > 0) {
      const possibleId = parseInt(lines[0].trim(), 10);
      if (!isNaN(possibleId)) {
        cueId = possibleId;
      }
    }

    cues.push({
      id: cueId,
      start: startSeconds,
      end: endSeconds,
      text: cueText
    });

    autoId++;
  }

  // If standard block splitting failed (e.g. malformed single newlines), fallback to regex scanner
  if (cues.length === 0 && /\d{1,2}:\d{2}:\d{2}[,\.]\d{3}\s*-->/.test(text)) {
    const lines = text.split('\n');
    let currentCue = null;
    let currentText = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const match = line.match(/(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3})/);

      if (match) {
        if (currentCue) {
          currentCue.text = currentText.join('\n').trim();
          cues.push(currentCue);
          currentText = [];
        }

        currentCue = {
          id: cues.length + 1,
          start: parseTimestampToSeconds(match[1]),
          end: parseTimestampToSeconds(match[2]),
          text: ''
        };
      } else if (currentCue) {
        // If line is not an ID number right before another timestamp
        const nextLineIsTimestamp = (i + 1 < lines.length) && /-->/.test(lines[i + 1]);
        if (nextLineIsTimestamp && /^\d+$/.test(line)) {
          // This line is the next cue's ID, ignore for text
        } else if (line !== '') {
          currentText.push(lines[i]);
        }
      }
    }

    if (currentCue) {
      currentCue.text = currentText.join('\n').trim();
      cues.push(currentCue);
    }
  }

  return { cues, warnings };
}
