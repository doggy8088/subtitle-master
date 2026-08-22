/**
 * Subtitle Master - Conversion Engine Core
 * Coordinates parsing, time shifting, style processing, generation, and statistics.
 */

import { parseSubtitle, detectFormat } from './parsers/index.js';
import { generateSubtitle, getFormatExtension, getFormatMimeType, ASS_PRESETS } from './generators/index.js';
import { shiftCues, formatDuration } from './utils/time.js';

/**
 * @typedef {Object} ConversionOptions
 * @property {string} [sourceFormat='auto']
 * @property {string} [targetFormat='vtt']
 * @property {number} [timeOffset=0] - In seconds
 * @property {string} [assPreset='classicYellow']
 * @property {Object} [assCustomStyle]
 * @property {boolean} [txtWithTimestamps=false]
 * @property {string} [filename='']
 */

/**
 * Subtitle Statistics
 * @typedef {Object} SubtitleStats
 * @property {number} cueCount
 * @property {number} lineCount
 * @property {number} charCount
 * @property {number} durationSeconds
 * @property {string} durationFormatted
 * @property {string} detectedSourceFormat
 */

/**
 * Converts raw subtitle text from source format to target format.
 * @param {string} rawContent 
 * @param {ConversionOptions} options 
 * @returns {{ output: string, cues: Array, stats: SubtitleStats, warnings: string[] }}
 */
export function convertSubtitle(rawContent, options = {}) {
  const sourceFormat = options.sourceFormat || 'auto';
  const targetFormat = options.targetFormat || 'vtt';
  const timeOffset = parseFloat(options.timeOffset) || 0;
  const filename = options.filename || '';

  if (!rawContent || typeof rawContent !== 'string' || rawContent.trim() === '') {
    return {
      output: targetFormat === 'vtt' ? 'WEBVTT\n\n' : '',
      cues: [],
      stats: {
        cueCount: 0,
        lineCount: 0,
        charCount: 0,
        durationSeconds: 0,
        durationFormatted: '0 秒',
        detectedSourceFormat: 'srt'
      },
      warnings: []
    };
  }

  // 1. Parse source text
  const parseResult = parseSubtitle(rawContent, sourceFormat, filename);
  let cues = parseResult.cues;

  // 2. Apply time offset if any
  if (timeOffset !== 0) {
    cues = shiftCues(cues, timeOffset);
  }

  // 3. Generate target format output
  const genOptions = {
    preset: options.assPreset || 'classicYellow',
    style: options.assCustomStyle,
    withTimestamps: !!options.txtWithTimestamps,
    title: filename ? filename.replace(/\.[^/.]+$/, '') : 'Converted Subtitle'
  };

  const output = generateSubtitle(cues, targetFormat, genOptions);

  // 4. Compute statistics
  const cueCount = cues.length;
  let totalChars = 0;
  cues.forEach(c => { totalChars += (c.text || '').length; });

  const durationSeconds = cues.length > 0 ? (cues[cues.length - 1].end - cues[0].start) : 0;

  const stats = {
    cueCount,
    lineCount: cues.length,
    charCount: totalChars,
    durationSeconds: Math.max(0, durationSeconds),
    durationFormatted: formatDuration(durationSeconds),
    detectedSourceFormat: parseResult.format
  };

  return {
    output,
    cues,
    stats,
    warnings: parseResult.warnings
  };
}

export {
  parseSubtitle,
  generateSubtitle,
  detectFormat,
  getFormatExtension,
  getFormatMimeType,
  ASS_PRESETS
};
