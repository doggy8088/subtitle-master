/**
 * Subtitle Master - CSV Generator
 * Generates CSV format for spreadsheet editing / translation workflows.
 */

import { formatSecondsToVtt } from '../utils/time.js';

function escapeCsvCell(val) {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * @param {Array<{start: number, end: number, text: string}>} cues 
 * @param {Object} [options={}]
 * @returns {string}
 */
export function generateCsv(cues, options = {}) {
  if (!Array.isArray(cues) || cues.length === 0) {
    return 'Index,Start Time,End Time,Duration (sec),Text\n';
  }

  const rows = [
    ['Index', 'Start Time', 'End Time', 'Duration (sec)', 'Text'].map(escapeCsvCell).join(',')
  ];

  cues.forEach((cue, index) => {
    const idx = cue.id || index + 1;
    const startStr = formatSecondsToVtt(cue.start);
    const endStr = formatSecondsToVtt(cue.end);
    const duration = (cue.end - cue.start).toFixed(3);
    const text = (cue.text || '').replace(/\{[^}]*\}/g, '');

    rows.push([idx, startStr, endStr, duration, text].map(escapeCsvCell).join(','));
  });

  return rows.join('\n') + '\n';
}
