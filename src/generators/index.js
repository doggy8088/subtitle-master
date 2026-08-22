/**
 * Subtitle Master - Unified Generators Entry Point
 */

import { generateSrt } from './srt.js';
import { generateVtt } from './vtt.js';
import { generateAss, ASS_PRESETS } from './ass.js';
import { generateSsa } from './ssa.js';
import { generateLrc } from './lrc.js';
import { generateJson } from './json.js';
import { generateCsv } from './csv.js';
import { generateTxt } from './txt.js';

/**
 * Generates subtitle content for the specified target format.
 * @param {Array<{start: number, end: number, text: string}>} cues 
 * @param {string} targetFormat - 'srt' | 'vtt' | 'ass' | 'ssa' | 'lrc' | 'json' | 'csv' | 'txt'
 * @param {Object} [options={}]
 * @returns {string}
 */
export function generateSubtitle(cues, targetFormat, options = {}) {
  switch (targetFormat?.toLowerCase()) {
    case 'vtt':
    case 'webvtt':
      return generateVtt(cues, options);
    case 'ass':
      return generateAss(cues, options);
    case 'ssa':
      return generateSsa(cues, options);
    case 'lrc':
      return generateLrc(cues, options);
    case 'json':
      return generateJson(cues, options);
    case 'csv':
      return generateCsv(cues, options);
    case 'txt':
    case 'text':
      return generateTxt(cues, options);
    case 'srt':
    default:
      return generateSrt(cues, options);
  }
}

/**
 * Gets the standard file extension for a subtitle format.
 * @param {string} format 
 * @returns {string}
 */
export function getFormatExtension(format) {
  switch (format?.toLowerCase()) {
    case 'vtt':
      return '.vtt';
    case 'ass':
      return '.ass';
    case 'ssa':
      return '.ssa';
    case 'lrc':
      return '.lrc';
    case 'json':
      return '.json';
    case 'csv':
      return '.csv';
    case 'txt':
      return '.txt';
    case 'srt':
    default:
      return '.srt';
  }
}

/**
 * Gets the MIME type for downloading a subtitle format.
 * @param {string} format 
 * @returns {string}
 */
export function getFormatMimeType(format) {
  switch (format?.toLowerCase()) {
    case 'vtt':
      return 'text/vtt;charset=utf-8';
    case 'json':
      return 'application/json;charset=utf-8';
    case 'csv':
      return 'text/csv;charset=utf-8';
    case 'ass':
    case 'ssa':
    case 'lrc':
    case 'srt':
    case 'txt':
    default:
      return 'text/plain;charset=utf-8';
  }
}

export {
  generateSrt,
  generateVtt,
  generateAss,
  generateSsa,
  generateLrc,
  generateJson,
  generateCsv,
  generateTxt,
  ASS_PRESETS
};
