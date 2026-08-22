/**
 * Subtitle Master - LRC Parser
 * Parses Lyric (.lrc) files into CueItem array.
 */

import { parseTimestampToSeconds } from '../utils/time.js';

/**
 * Parses LRC lyrics into CueItem array.
 * @param {string} lrcText 
 * @returns {{ cues: Array, warnings: string[], meta: Object }}
 */
export function parseLrc(lrcText) {
  const cues = [];
  const warnings = [];
  const meta = {};

  if (!lrcText || typeof lrcText !== 'string' || lrcText.trim() === '') {
    return { cues, warnings, meta };
  }

  let text = lrcText;
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.substring(1);
  }
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const lines = text.split('\n');
  const tempCues = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check metadata tags: [ar: Artist], [ti: Title], [al: Album]
    const metaMatch = trimmed.match(/^\[([a-zA-Z]+):(.*)\]$/);
    if (metaMatch) {
      meta[metaMatch[1].toLowerCase()] = metaMatch[2].trim();
      continue;
    }

    // Match all timestamps in line: e.g. [00:12.34][00:24.56]Some lyric
    const timeMatches = [...trimmed.matchAll(/\[(\d{1,2}:\d{2}[\.:]\d{2,3})\]/g)];
    if (timeMatches.length > 0) {
      const lyricText = trimmed.replace(/\[\d{1,2}:\d{2}[\.:]\d{2,3}\]/g, '').trim();
      for (const m of timeMatches) {
        const startSec = parseTimestampToSeconds(m[1]);
        tempCues.push({
          start: startSec,
          text: lyricText
        });
      }
    }
  }

  // Sort by start time
  tempCues.sort((a, b) => a.start - b.start);

  // Assign end times: next cue start time or default duration
  for (let i = 0; i < tempCues.length; i++) {
    const current = tempCues[i];
    const next = tempCues[i + 1];
    const defaultDuration = 4.0;
    const end = next ? Math.min(next.start, current.start + 10) : current.start + defaultDuration;

    cues.push({
      id: i + 1,
      start: current.start,
      end: Math.max(current.start + 0.5, end),
      text: current.text
    });
  }

  return { cues, warnings, meta };
}
