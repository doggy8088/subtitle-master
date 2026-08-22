/**
 * Subtitle Master - JSON Parser
 * Parses JSON format subtitle data.
 */

import { parseTimestampToSeconds } from '../utils/time.js';

/**
 * Parses JSON subtitle array or object.
 * Supports format:
 * [ { "start": 1.23, "end": 4.56, "text": "Hello" }, ... ]
 * or
 * { "cues": [ ... ], "meta": { ... } }
 * @param {string} jsonText 
 * @returns {{ cues: Array, warnings: string[], meta: Object }}
 */
export function parseJson(jsonText) {
  const cues = [];
  const warnings = [];
  let meta = {};

  if (!jsonText || typeof jsonText !== 'string' || jsonText.trim() === '') {
    return { cues, warnings, meta };
  }

  try {
    const data = JSON.parse(jsonText);
    let rawCues = [];

    if (Array.isArray(data)) {
      rawCues = data;
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.cues)) {
        rawCues = data.cues;
      } else if (Array.isArray(data.subtitles)) {
        rawCues = data.subtitles;
      } else if (Array.isArray(data.segments)) {
        rawCues = data.segments;
      }
      if (data.meta) meta = data.meta;
    }

    rawCues.forEach((item, index) => {
      const start = item.start !== undefined ? parseTimestampToSeconds(item.start) : (item.startTime ? parseTimestampToSeconds(item.startTime) : 0);
      const end = item.end !== undefined ? parseTimestampToSeconds(item.end) : (item.endTime ? parseTimestampToSeconds(item.endTime) : start + (item.duration || 3));
      const text = item.text || item.content || item.sentence || '';

      cues.push({
        id: item.id || index + 1,
        start,
        end: Math.max(start + 0.1, end),
        text: String(text).trim(),
        style: item.style
      });
    });
  } catch (e) {
    warnings.push(`JSON 解析錯誤: ${e.message}`);
  }

  return { cues, warnings, meta };
}
