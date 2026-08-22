/**
 * Subtitle Master - Time Utilities
 * Supports conversions between seconds, SRT, VTT, ASS/SSA, LRC, and formatted timestamps.
 */

/**
 * Parses any timestamp string into seconds (float).
 * Supports:
 * - SRT: "01:23:45,678" or "01:23:45.678"
 * - VTT: "01:23:45.678" or "23:45.678"
 * - ASS: "1:23:45.67" or "01:23:45.67"
 * - LRC: "01:23.45" or "01:23.456"
 * - Raw seconds: "123.45"
 * 
 * @param {string|number} timeStr 
 * @returns {number} Time in seconds
 */
export function parseTimestampToSeconds(timeStr) {
  if (typeof timeStr === 'number') {
    return Math.max(0, timeStr);
  }
  if (!timeStr || typeof timeStr !== 'string') {
    return 0;
  }

  const cleanStr = timeStr.trim().replace(/^\[|\]$/g, '');

  // Check for plain number (seconds)
  if (/^\d+(\.\d+)?$/.test(cleanStr)) {
    return parseFloat(cleanStr);
  }

  // Replace comma with period for milliseconds
  const normalized = cleanStr.replace(',', '.');

  // Match hh:mm:ss.ms or mm:ss.ms or h:mm:ss.cs
  const parts = normalized.split(':');
  
  if (parts.length === 3) {
    // [hh, mm, ss.ms]
    const hours = parseFloat(parts[0]) || 0;
    const minutes = parseFloat(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return Math.max(0, hours * 3600 + minutes * 60 + seconds);
  } else if (parts.length === 2) {
    // [mm, ss.ms]
    const minutes = parseFloat(parts[0]) || 0;
    const seconds = parseFloat(parts[1]) || 0;
    return Math.max(0, minutes * 60 + seconds);
  } else if (parts.length === 1) {
    return Math.max(0, parseFloat(parts[0]) || 0);
  }

  return 0;
}

/**
 * Formats seconds into SRT timestamp: "00:00:00,000"
 * @param {number} seconds 
 * @returns {string}
 */
export function formatSecondsToSrt(seconds) {
  const safeSeconds = Math.max(0, seconds || 0);
  const hrs = Math.floor(safeSeconds / 3600);
  const mins = Math.floor((safeSeconds % 3600) / 60);
  const secs = Math.floor(safeSeconds % 60);
  const ms = Math.round((safeSeconds - Math.floor(safeSeconds)) * 1000);

  const hh = String(hrs).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  const mmm = String(Math.min(999, ms)).padStart(3, '0');

  return `${hh}:${mm}:${ss},${mmm}`;
}

/**
 * Formats seconds into WebVTT timestamp: "00:00:00.000"
 * @param {number} seconds 
 * @returns {string}
 */
export function formatSecondsToVtt(seconds) {
  const safeSeconds = Math.max(0, seconds || 0);
  const hrs = Math.floor(safeSeconds / 3600);
  const mins = Math.floor((safeSeconds % 3600) / 60);
  const secs = Math.floor(safeSeconds % 60);
  const ms = Math.round((safeSeconds - Math.floor(safeSeconds)) * 1000);

  const hh = String(hrs).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  const mmm = String(Math.min(999, ms)).padStart(3, '0');

  return `${hh}:${mm}:${ss}.${mmm}`;
}

/**
 * Formats seconds into ASS/SSA timestamp: "0:00:00.00" (hours: unpadded single/multi digit, centiseconds: 2 digits)
 * @param {number} seconds 
 * @returns {string}
 */
export function formatSecondsToAss(seconds) {
  const safeSeconds = Math.max(0, seconds || 0);
  const hrs = Math.floor(safeSeconds / 3600);
  const mins = Math.floor((safeSeconds % 3600) / 60);
  const secs = Math.floor(safeSeconds % 60);
  const cs = Math.floor(((safeSeconds - Math.floor(safeSeconds)) * 100));

  const h = String(hrs);
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  const ccs = String(Math.min(99, cs)).padStart(2, '0');

  return `${h}:${mm}:${ss}.${ccs}`;
}

/**
 * Formats seconds into LRC timestamp: "[00:00.00]"
 * @param {number} seconds 
 * @returns {string}
 */
export function formatSecondsToLrc(seconds) {
  const safeSeconds = Math.max(0, seconds || 0);
  const mins = Math.floor(safeSeconds / 60);
  const secs = Math.floor(safeSeconds % 60);
  const cs = Math.floor(((safeSeconds - Math.floor(safeSeconds)) * 100));

  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  const ccs = String(Math.min(99, cs)).padStart(2, '0');

  return `[${mm}:${ss}.${ccs}]`;
}

/**
 * Formats seconds into friendly display format: "00:01:23.456"
 * @param {number} seconds 
 * @returns {string}
 */
export function formatSecondsToDisplay(seconds) {
  return formatSecondsToVtt(seconds);
}

/**
 * Formats duration in seconds to human readable string (e.g. "1分32秒" or "02:45")
 * @param {number} seconds 
 * @returns {string}
 */
export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(seconds || 0));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hrs > 0) {
    return `${hrs} 時 ${mins} 分 ${secs} 秒`;
  }
  if (mins > 0) {
    return `${mins} 分 ${secs} 秒`;
  }
  return `${secs} 秒`;
}

/**
 * Shifts all cues by a given offset in seconds.
 * @param {Array<{start: number, end: number, text: string}>} cues 
 * @param {number} offsetSeconds (e.g. +1.5 or -0.5)
 * @returns {Array<{start: number, end: number, text: string}>}
 */
export function shiftCues(cues, offsetSeconds) {
  if (!Array.isArray(cues) || offsetSeconds === 0) {
    return cues;
  }
  return cues.map(cue => {
    const newStart = Math.max(0, cue.start + offsetSeconds);
    const duration = Math.max(0.1, cue.end - cue.start);
    const newEnd = Math.max(newStart + 0.1, cue.end + offsetSeconds);
    return {
      ...cue,
      start: newStart,
      end: newEnd
    };
  });
}
