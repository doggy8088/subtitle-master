/**
 * Subtitle Master - WebVTT Parser
 * Parses WebVTT (.vtt) subtitle files into standardized CueItem array.
 */

import { parseTimestampToSeconds } from '../utils/time.js';

/**
 * Parses WebVTT text into CueItem array.
 * @param {string} vttText 
 * @returns {{ cues: Array, warnings: string[], meta: Object }}
 */
export function parseVtt(vttText) {
  const cues = [];
  const warnings = [];
  const meta = { header: '', notes: [] };

  if (!vttText || typeof vttText !== 'string' || vttText.trim() === '') {
    return { cues, warnings, meta };
  }

  // Remove BOM and normalize line endings
  let text = vttText;
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.substring(1);
  }
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // Split by blank lines
  const blocks = text.split(/\n\s*\n+/);

  let autoId = 1;

  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b].trim();
    if (!block) continue;

    // Skip WEBVTT header block if it's purely header
    if (b === 0 && /^WEBVTT/i.test(block)) {
      meta.header = block;
      // If the first block contains cues after WEBVTT on the next lines, process the remaining lines
      const headerLines = block.split('\n');
      if (headerLines.length <= 2 && !headerLines.some(l => l.includes('-->'))) {
        continue;
      }
    }

    // Skip NOTE blocks
    if (/^NOTE(\s+.*|\n.*|$)/i.test(block)) {
      meta.notes.push(block);
      continue;
    }

    // Skip STYLE blocks
    if (/^STYLE(\s+.*|\n.*|$)/i.test(block)) {
      continue;
    }

    // Skip REGION blocks
    if (/^REGION(\s+.*|\n.*|$)/i.test(block)) {
      continue;
    }

    const lines = block.split('\n');
    let timeLineIndex = -1;
    let timeMatch = null;
    let settings = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Match timestamp: 00:00:01.234 --> 00:00:04.567 [settings...] or 01:23.456 --> 01:25.678
      const match = line.match(/((?:\d{1,2}:)?\d{2}:\d{2}[\.,]\d{3})\s*-->\s*((?:\d{1,2}:)?\d{2}:\d{2}[\.,]\d{3})(.*)/);
      if (match) {
        timeLineIndex = i;
        timeMatch = match;
        const rawSettings = match[3]?.trim();
        if (rawSettings) {
          // Parse settings like align:start size:50% line:0
          const settingParts = rawSettings.split(/\s+/);
          settingParts.forEach(part => {
            const [k, v] = part.split(':');
            if (k && v) settings[k] = v;
          });
        }
        break;
      }
    }

    if (!timeMatch) continue;

    const startSeconds = parseTimestampToSeconds(timeMatch[1]);
    const endSeconds = parseTimestampToSeconds(timeMatch[2]);

    // Text lines
    const textLines = lines.slice(timeLineIndex + 1);
    const cueText = textLines.join('\n');

    // Cue identifier
    let cueId = autoId;
    if (timeLineIndex > 0) {
      const identifier = lines[0].trim();
      if (identifier && !identifier.startsWith('WEBVTT')) {
        cueId = identifier;
      }
    }

    cues.push({
      id: cueId,
      start: startSeconds,
      end: endSeconds,
      text: cueText,
      settings: Object.keys(settings).length > 0 ? settings : undefined
    });

    autoId++;
  }

  return { cues, warnings, meta };
}
