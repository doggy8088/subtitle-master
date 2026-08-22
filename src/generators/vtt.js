/**
 * Subtitle Master - WebVTT Generator
 * Converts CueItem array into standardized WebVTT (.vtt) subtitle string.
 */

import { formatSecondsToVtt } from '../utils/time.js';

/**
 * @param {Array<{id?: string|number, start: number, end: number, text: string, settings?: Object}>} cues 
 * @param {Object} [options={}]
 * @returns {string}
 */
export function generateVtt(cues, options = {}) {
  if (!Array.isArray(cues) || cues.length === 0) {
    return 'WEBVTT\n\n';
  }

  let result = 'WEBVTT\n\n';
  const blocks = [];

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const start = formatSecondsToVtt(cue.start);
    const end = formatSecondsToVtt(cue.end);
    let text = cue.text || '';

    // Strip ASS override tags if present in text
    text = text.replace(/\{[^}]*\}/g, '').trim();

    // Format settings if any
    let settingsStr = '';
    if (cue.settings && typeof cue.settings === 'object') {
      const parts = [];
      if (cue.settings.align) parts.push(`align:${cue.settings.align}`);
      if (cue.settings.line) parts.push(`line:${cue.settings.line}`);
      if (cue.settings.position) parts.push(`position:${cue.settings.position}`);
      if (cue.settings.size) parts.push(`size:${cue.settings.size}`);
      if (parts.length > 0) settingsStr = ' ' + parts.join(' ');
    }

    blocks.push(`${start} --> ${end}${settingsStr}\n${text}`);
  }

  return result + blocks.join('\n\n') + '\n';
}
