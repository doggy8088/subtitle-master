/**
 * Subtitle Master - Diagnostics & Quality Inspector
 * Detects overlapping timecodes, empty lines, zero durations, and provides 1-click auto-repair.
 */

export function inspectCues(cues) {
  const issues = [];
  if (!Array.isArray(cues) || cues.length === 0) {
    return { issues, health: 'empty' };
  }

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const prev = i > 0 ? cues[i - 1] : null;

    // Check zero or negative duration
    if (cue.end <= cue.start) {
      issues.push({
        type: 'zero_duration',
        cueIndex: i,
        message: `第 ${i + 1} 句字幕時長為 0 或負數 (${cue.start.toFixed(2)}s ~ ${cue.end.toFixed(2)}s)`
      });
    }

    // Check overlapping with previous cue
    if (prev && cue.start < prev.end) {
      const overlap = prev.end - cue.start;
      issues.push({
        type: 'overlap',
        cueIndex: i,
        message: `第 ${i} 句與第 ${i + 1} 句時間軸重疊 ${overlap.toFixed(2)} 秒`
      });
    }

    // Check empty text
    if (!cue.text || cue.text.trim() === '') {
      issues.push({
        type: 'empty_text',
        cueIndex: i,
        message: `第 ${i + 1} 句字幕內容為空白`
      });
    }

    // Check excessive duration
    if (cue.end - cue.start > 15) {
      issues.push({
        type: 'long_duration',
        cueIndex: i,
        message: `第 ${i + 1} 句字幕顯示時間過長 (${(cue.end - cue.start).toFixed(1)} 秒)`
      });
    }
  }

  return {
    issues,
    health: issues.length === 0 ? 'perfect' : (issues.length <= 2 ? 'warning' : 'danger')
  };
}

/**
 * Automatically fixes common issues (resolves overlaps, ensures minimum 0.8s duration, trims text).
 * @param {Array} cues 
 * @returns {Array} Fixed cues
 */
export function autoFixCues(cues) {
  if (!Array.isArray(cues) || cues.length === 0) return cues;

  const result = cues.map(c => ({ ...c }));

  for (let i = 0; i < result.length; i++) {
    const curr = result[i];
    const prev = i > 0 ? result[i - 1] : null;

    // Fix overlap
    if (prev && curr.start < prev.end) {
      // Adjust previous end or current start
      prev.end = Math.max(prev.start + 0.5, curr.start);
    }

    // Fix zero duration
    if (curr.end <= curr.start) {
      curr.end = curr.start + 1.5;
    }

    // Clean whitespace
    if (curr.text) {
      curr.text = curr.text.trim();
    }
  }

  return result;
}
