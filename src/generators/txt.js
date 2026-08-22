/**
 * Subtitle Master - TXT / Plain Text Generator
 * Supports pure transcript mode (no timestamps) and timestamped transcript mode.
 */

import { formatSecondsToVtt } from '../utils/time.js';

/**
 * @param {Array<{start: number, end: number, text: string}>} cues 
 * @param {Object} [options={}]
 * @param {boolean} [options.withTimestamps=false]
 * @param {boolean} [options.compactParagraphs=false]
 * @returns {string}
 */
export function generateTxt(cues, options = {}) {
  if (!Array.isArray(cues) || cues.length === 0) {
    return '';
  }

  const withTimestamps = !!options.withTimestamps;
  const lines = [];

  for (const cue of cues) {
    let cleanText = (cue.text || '').replace(/\{[^}]*\}/g, '').trim();
    if (!cleanText) continue;

    if (withTimestamps) {
      const timeStr = formatSecondsToVtt(cue.start).replace(/\.000$/, '');
      lines.push(`[${timeStr}] ${cleanText}`);
    } else {
      lines.push(cleanText);
    }
  }

  if (options.compactParagraphs) {
    return lines.join(' ');
  }

  return lines.join('\n') + '\n';
}
