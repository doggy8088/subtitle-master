/**
 * Subtitle Master - LRC Generator
 * Converts CueItem array into standardized Lyric (.lrc) string.
 */

import { formatSecondsToLrc } from '../utils/time.js';

/**
 * @param {Array<{start: number, end: number, text: string}>} cues 
 * @param {Object} [options={}]
 * @returns {string}
 */
export function generateLrc(cues, options = {}) {
  if (!Array.isArray(cues) || cues.length === 0) {
    return '';
  }

  const lines = [];
  if (options.title) lines.push(`[ti:${options.title}]`);
  if (options.artist) lines.push(`[ar:${options.artist}]`);
  lines.push('[by:Subtitle Master]');

  for (const cue of cues) {
    const timeTag = formatSecondsToLrc(cue.start);
    // LRC lines are typically single-line text
    const cleanText = (cue.text || '').replace(/\{[^}]*\}/g, '').replace(/\r?\n/g, ' ').trim();
    lines.push(`${timeTag}${cleanText}`);
  }

  return lines.join('\n') + '\n';
}
