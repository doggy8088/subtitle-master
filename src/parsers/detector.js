/**
 * Subtitle Master - Format Detector
 * Automatically detects whether subtitle content or filename is SRT, VTT, ASS, SSA, LRC, JSON, CSV, or TXT.
 */

/**
 * @typedef {'srt' | 'vtt' | 'ass' | 'ssa' | 'lrc' | 'json' | 'csv' | 'txt'} SubtitleFormat
 */

/**
 * Detects subtitle format from file extension.
 * @param {string} filename 
 * @returns {SubtitleFormat|null}
 */
export function detectFormatFromFilename(filename) {
  if (!filename || typeof filename !== 'string') return null;
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'srt':
      return 'srt';
    case 'vtt':
    case 'webvtt':
      return 'vtt';
    case 'ass':
      return 'ass';
    case 'ssa':
      return 'ssa';
    case 'lrc':
      return 'lrc';
    case 'json':
      return 'json';
    case 'csv':
      return 'csv';
    case 'txt':
      return 'txt';
    default:
      return null;
  }
}

/**
 * Detects subtitle format by analyzing string content.
 * @param {string} content 
 * @returns {{ format: SubtitleFormat, confidence: number }}
 */
export function detectFormatFromContent(content) {
  if (!content || typeof content !== 'string' || content.trim() === '') {
    return { format: 'srt', confidence: 0 };
  }

  let text = content.trim();
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.substring(1).trim();
  }

  // 1. Check WebVTT
  if (/^WEBVTT(\s+.*)?(\r?\n|$)/i.test(text)) {
    return { format: 'vtt', confidence: 1.0 };
  }

  // 2. Check ASS / SSA
  if (/\[(Script Info|V4\+? Styles|Events)\]/i.test(text) || /Dialogue:\s*\d+/i.test(text)) {
    if (/ScriptType:\s*v4\.00\+/i.test(text) || /\[V4\+ Styles\]/i.test(text)) {
      return { format: 'ass', confidence: 1.0 };
    }
    if (/ScriptType:\s*v4\.00/i.test(text) || /\[V4 Styles\]/i.test(text)) {
      return { format: 'ssa', confidence: 0.95 };
    }
    return { format: 'ass', confidence: 0.9 };
  }

  // 3. Check JSON
  if (text.startsWith('[') && text.endsWith(']')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0 && (parsed[0].text !== undefined || parsed[0].start !== undefined)) {
        return { format: 'json', confidence: 1.0 };
      }
    } catch (e) {}
  }

  // 4. Check LRC
  if (/\[\d{2}:\d{2}[\.:]\d{2,3}\]/.test(text)) {
    return { format: 'lrc', confidence: 0.95 };
  }

  // 5. Check SRT: Look for "00:00:01,234 --> 00:00:04,567" or "00:00:01.234 --> 00:00:04.567"
  if (/\d{1,2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[,\.]\d{3}/.test(text)) {
    // If it has comma separators, it's definitively SRT
    if (/\d{2}:\d{2}:\d{2},\d{3}/.test(text)) {
      return { format: 'srt', confidence: 0.98 };
    }
    // If it lacks WEBVTT header but has dot timestamps, could be SRT or VTT without header
    return { format: 'srt', confidence: 0.85 };
  }

  // 6. Check CSV
  if (/^(Index|Start|Time|#),/i.test(text) || /"\d{2}:\d{2}:\d{2}/.test(text)) {
    return { format: 'csv', confidence: 0.7 };
  }

  // Default fallback
  return { format: 'txt', confidence: 0.3 };
}

/**
 * Combined detection with filename hint and content analysis.
 * @param {string} content 
 * @param {string} [filename] 
 * @returns {SubtitleFormat}
 */
export function detectFormat(content, filename = '') {
  const fromFilename = detectFormatFromFilename(filename);
  const fromContent = detectFormatFromContent(content);

  if (fromContent.confidence >= 0.8) {
    return fromContent.format;
  }
  if (fromFilename) {
    return fromFilename;
  }
  return fromContent.format || 'srt';
}
