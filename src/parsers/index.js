/**
 * Subtitle Master - Unified Parsers Entry Point
 */

import { detectFormat } from './detector.js';
import { parseSrt } from './srt.js';
import { parseVtt } from './vtt.js';
import { parseAss } from './ass.js';
import { parseLrc } from './lrc.js';
import { parseJson } from './json.js';
import { parseTxt } from './txt.js';

/**
 * Parses subtitle text based on specified or detected format.
 * @param {string} content 
 * @param {string} [format='auto'] 
 * @param {string} [filename=''] 
 * @param {Object} [options={}]
 * @returns {{ cues: Array, format: string, meta: Object, styles: Array, warnings: string[] }}
 */
export function parseSubtitle(content, format = 'auto', filename = '', options = {}) {
  let detectedFormat = format;
  if (!format || format === 'auto') {
    detectedFormat = detectFormat(content, filename);
  }

  let result;
  switch (detectedFormat) {
    case 'vtt':
      result = parseVtt(content);
      break;
    case 'ass':
    case 'ssa':
      result = parseAss(content, options);
      break;
    case 'lrc':
      result = parseLrc(content);
      break;
    case 'json':
      result = parseJson(content);
      break;
    case 'txt':
      result = parseTxt(content);
      break;
    case 'srt':
    default:
      result = parseSrt(content);
      detectedFormat = 'srt';
      break;
  }

  return {
    cues: result.cues || [],
    format: detectedFormat,
    meta: result.meta || {},
    styles: result.styles || [],
    warnings: result.warnings || []
  };
}

export {
  detectFormat,
  parseSrt,
  parseVtt,
  parseAss,
  parseLrc,
  parseJson,
  parseTxt
};
