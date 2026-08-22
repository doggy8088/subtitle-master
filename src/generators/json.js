/**
 * Subtitle Master - JSON Generator
 * Generates clean, structured JSON format for developers and AI integrations.
 */

import { formatSecondsToVtt } from '../utils/time.js';

/**
 * @param {Array<{start: number, end: number, text: string}>} cues 
 * @param {Object} [options={}]
 * @returns {string}
 */
export function generateJson(cues, options = {}) {
  if (!Array.isArray(cues)) {
    return '[]';
  }

  const items = cues.map((cue, index) => ({
    id: cue.id || index + 1,
    start: Number(cue.start.toFixed(3)),
    end: Number(cue.end.toFixed(3)),
    duration: Number((cue.end - cue.start).toFixed(3)),
    startTime: formatSecondsToVtt(cue.start),
    endTime: formatSecondsToVtt(cue.end),
    text: cue.text || '',
    ...(cue.style ? { style: cue.style } : {})
  }));

  if (options.includeMeta) {
    const totalDuration = items.length > 0 ? items[items.length - 1].end : 0;
    return JSON.stringify({
      meta: {
        generator: 'Subtitle Master',
        totalCues: items.length,
        totalDuration,
        ...options.meta
      },
      cues: items
    }, null, 2);
  }

  return JSON.stringify(items, null, 2);
}
