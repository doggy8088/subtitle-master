/**
 * Subtitle Master - Character Encoding Utilities
 * Reads ArrayBuffer / Uint8Array and detects UTF-8, Big5, GB18030/GBK, UTF-16LE/BE, Shift-JIS.
 */

/**
 * Common encodings supported in browsers.
 */
export const SUPPORTED_ENCODINGS = [
  { id: 'auto', name: '自動檢測 (Auto)' },
  { id: 'utf-8', name: 'UTF-8' },
  { id: 'big5', name: '繁體中文 (Big5)' },
  { id: 'gb18030', name: '簡體中文 (GB18030 / GBK)' },
  { id: 'shift-jis', name: '日文 (Shift-JIS)' },
  { id: 'euc-kr', name: '韓文 (EUC-KR)' },
  { id: 'utf-16le', name: 'UTF-16 LE' },
  { id: 'utf-16be', name: 'UTF-16 BE' },
  { id: 'windows-1252', name: '西歐語言 (ANSI / Windows-1252)' }
];

/**
 * Checks if a byte sequence starts with a UTF BOM.
 * @param {Uint8Array} bytes 
 * @returns {string|null}
 */
export function detectBOM(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return 'utf-8';
  }
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return 'utf-16le';
  }
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return 'utf-16be';
  }
  return null;
}

/**
 * Tests if the given Uint8Array is valid UTF-8.
 * @param {Uint8Array} bytes 
 * @returns {boolean}
 */
function isValidUtf8(bytes) {
  let i = 0;
  const len = bytes.length;
  while (i < len) {
    const byte = bytes[i];
    if (byte <= 0x7F) {
      i++;
    } else if (byte >= 0xC2 && byte <= 0xDF) {
      if (i + 1 >= len || (bytes[i + 1] & 0xC0) !== 0x80) return false;
      i += 2;
    } else if (byte >= 0xE0 && byte <= 0xEF) {
      if (i + 2 >= len || (bytes[i + 1] & 0xC0) !== 0x80 || (bytes[i + 2] & 0xC0) !== 0x80) return false;
      i += 3;
    } else if (byte >= 0xF0 && byte <= 0xF4) {
      if (i + 3 >= len || (bytes[i + 1] & 0xC0) !== 0x80 || (bytes[i + 2] & 0xC0) !== 0x80 || (bytes[i + 3] & 0xC0) !== 0x80) return false;
      i += 4;
    } else {
      return false;
    }
  }
  return true;
}

/**
 * Smartly decodes a file buffer into text with automatic encoding detection.
 * @param {ArrayBuffer} buffer 
 * @param {string} [preferredEncoding='auto'] 
 * @returns {{ text: string, encoding: string }}
 */
export function decodeBuffer(buffer, preferredEncoding = 'auto') {
  const bytes = new Uint8Array(buffer);

  // 1. Check specified encoding
  if (preferredEncoding && preferredEncoding !== 'auto') {
    try {
      const decoder = new TextDecoder(preferredEncoding);
      return { text: decoder.decode(bytes), encoding: preferredEncoding };
    } catch (e) {
      console.warn(`TextDecoder failed for ${preferredEncoding}, falling back to auto:`, e);
    }
  }

  // 2. Check BOM
  const bom = detectBOM(bytes);
  if (bom) {
    try {
      const decoder = new TextDecoder(bom);
      return { text: decoder.decode(bytes), encoding: bom };
    } catch (e) {}
  }

  // 3. Check UTF-8 validity
  if (isValidUtf8(bytes)) {
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      return { text: decoder.decode(bytes), encoding: 'utf-8' };
    } catch (e) {}
  }

  // 4. Try Big5 (Traditional Chinese)
  try {
    const decoderBig5 = new TextDecoder('big5', { fatal: true });
    const text = decoderBig5.decode(bytes);
    // Check if it doesn't contain too many unmapped characters
    return { text, encoding: 'big5' };
  } catch (e) {}

  // 5. Try GB18030 / GBK (Simplified Chinese)
  try {
    const decoderGbk = new TextDecoder('gb18030', { fatal: true });
    const text = decoderGbk.decode(bytes);
    return { text, encoding: 'gb18030' };
  } catch (e) {}

  // 6. Try Shift-JIS (Japanese)
  try {
    const decoderSjis = new TextDecoder('shift-jis', { fatal: true });
    const text = decoderSjis.decode(bytes);
    return { text, encoding: 'shift-jis' };
  } catch (e) {}

  // 7. Fallback to standard utf-8 without fatal error
  const fallbackDecoder = new TextDecoder('utf-8');
  return { text: fallbackDecoder.decode(bytes), encoding: 'utf-8' };
}
