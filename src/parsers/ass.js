/**
 * Subtitle Master - ASS / SSA Parser
 * Parses Advanced SubStation Alpha (.ass) and SubStation Alpha (.ssa) subtitle files.
 */

import { parseTimestampToSeconds } from '../utils/time.js';

/**
 * Strips or cleans ASS override tags (e.g. {\pos(100,200)\fs40} -> "")
 * @param {string} text 
 * @param {boolean} [preserveStyleCodes=false]
 * @returns {string}
 */
export function cleanAssTags(text, preserveStyleCodes = false) {
  if (!text) return '';
  let result = text.replace(/\\N/g, '\n').replace(/\\n/g, '\n').replace(/\\h/g, ' ');
  if (!preserveStyleCodes) {
    result = result.replace(/\{[^}]*\}/g, '');
  }
  // Unescape \{ and \}
  result = result.replace(/\\\{/g, '{').replace(/\\\}/g, '}');
  return result;
}

/**
 * Parses ASS/SSA subtitle text into standardized structure.
 * @param {string} assText 
 * @param {Object} [options={}]
 * @returns {{ cues: Array, meta: Object, styles: Array, warnings: string[] }}
 */
export function parseAss(assText, options = {}) {
  const cues = [];
  const styles = [];
  const meta = {};
  const warnings = [];

  if (!assText || typeof assText !== 'string' || assText.trim() === '') {
    return { cues, meta, styles, warnings };
  }

  let text = assText;
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.substring(1);
  }
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const lines = text.split('\n');
  let currentSection = '';
  let eventFormatColumns = null;

  let autoId = 1;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine || rawLine.startsWith(';')) continue;

    // Check Section header: [Script Info], [V4+ Styles], [Events], etc.
    const sectionMatch = rawLine.match(/^\[(.*)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim().toLowerCase();
      continue;
    }

    // Section: Script Info
    if (currentSection === 'script info') {
      const colonIndex = rawLine.indexOf(':');
      if (colonIndex !== -1) {
        const key = rawLine.substring(0, colonIndex).trim();
        const value = rawLine.substring(colonIndex + 1).trim();
        meta[key] = value;
      }
    }
    // Section: Styles
    else if (currentSection === 'v4+ styles' || currentSection === 'v4 styles') {
      if (rawLine.startsWith('Format:')) {
        // Format line for styles
      } else if (rawLine.startsWith('Style:')) {
        const styleContent = rawLine.substring(6).trim();
        const parts = styleContent.split(',').map(s => s.trim());
        if (parts.length >= 2) {
          styles.push({
            name: parts[0],
            fontName: parts[1],
            fontSize: parseFloat(parts[2]) || 48,
            primaryColor: parts[3] || '&H00FFFFFF',
            outlineColor: parts[5] || '&H00000000',
            alignment: parseInt(parts[18] || parts[parts.length - 5], 10) || 2
          });
        }
      }
    }
    // Section: Events
    else if (currentSection === 'events') {
      if (rawLine.startsWith('Format:')) {
        const formatLine = rawLine.substring(7).trim();
        eventFormatColumns = formatLine.split(',').map(c => c.trim().toLowerCase());
      } else if (rawLine.startsWith('Dialogue:') || rawLine.startsWith('Comment:')) {
        const isDialogue = rawLine.startsWith('Dialogue:');
        const contentStr = rawLine.substring(rawLine.indexOf(':') + 1).trim();

        // Default columns if Format: was missing
        const columns = eventFormatColumns || ['layer', 'start', 'end', 'style', 'name', 'marginl', 'marginr', 'marginv', 'effect', 'text'];
        const textColIndex = columns.indexOf('text');
        const numColsBefore = textColIndex !== -1 ? textColIndex : columns.length - 1;

        // Split by commas, but only up to numColsBefore commas, remainder is Text
        const parts = [];
        let curr = '';
        let commaCount = 0;

        for (let c = 0; c < contentStr.length; c++) {
          const char = contentStr[c];
          if (char === ',' && commaCount < numColsBefore) {
            parts.push(curr.trim());
            curr = '';
            commaCount++;
          } else {
            curr += char;
          }
        }
        parts.push(curr.trim());

        const getCol = (colName) => {
          const idx = columns.indexOf(colName);
          return idx !== -1 && idx < parts.length ? parts[idx] : '';
        };

        const startStr = getCol('start');
        const endStr = getCol('end');
        const style = getCol('style');
        const effect = getCol('effect');
        const actor = getCol('name');
        const rawCueText = parts[parts.length - 1] || '';

        const startSec = parseTimestampToSeconds(startStr);
        const endSec = parseTimestampToSeconds(endStr);
        const cleanText = cleanAssTags(rawCueText, options.preserveStyleCodes);

        if (isDialogue) {
          cues.push({
            id: autoId++,
            start: startSec,
            end: endSec,
            text: cleanText,
            rawText: rawCueText,
            style: style || 'Default',
            settings: {
              actor,
              effect
            }
          });
        }
      }
    }
  }

  // If no sections were explicitly labeled, search for Dialogue: lines directly
  if (cues.length === 0) {
    for (const line of lines) {
      if (line.trim().startsWith('Dialogue:')) {
        const contentStr = line.substring(line.indexOf(':') + 1).trim();
        const parts = contentStr.split(',');
        if (parts.length >= 10) {
          const startStr = parts[1].trim();
          const endStr = parts[2].trim();
          const textPart = parts.slice(9).join(',').trim();
          cues.push({
            id: autoId++,
            start: parseTimestampToSeconds(startStr),
            end: parseTimestampToSeconds(endStr),
            text: cleanAssTags(textPart, options.preserveStyleCodes),
            rawText: textPart
          });
        }
      }
    }
  }

  return { cues, meta, styles, warnings };
}
