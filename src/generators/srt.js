/**
 * Subtitle Master - SRT Generator
 * Converts CueItem array into standardized SubRip (.srt) subtitle string.
 */

import { formatSecondsToSrt } from '../utils/time.js';

/**
 * @param {Array<{start: number, end: number, text: string}>} cues 
 * @param {Object} [options={}]
 * @returns {string}
 */
export function generateSrt(cues, options = {}) {
  if (!Array.isArray(cues) || cues.length === 0) {
    return '';
  }

  const output = [];

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const index = i + 1;
    const start = formatSecondsToSrt(cue.start);
    const end = formatSecondsToSrt(cue.end);
    let text = cue.text || '';

    // Strip ASS override tags if present in text
    text = text.replace(/\{[^}]*\}/g, '').trim();

    output.push(`${index}\n${start} --> ${end}\n${text}`);
  }

  return output.join('\n\n') + '\n';
}
