/**
 * Shared timecode parsing utilities.
 *
 * Supports the following input formats:
 *   MM:SS:FF  — minutes, seconds, frames (as displayed in the timeline ruler)
 *   HH:MM:SS  — hours, minutes, seconds (standard video timecode)
 *   M:SS.f    — minutes, seconds, tenths (legacy editor format)
 *   M:SS      — minutes, seconds
 *   <number>  — plain seconds (or frames, caller decides)
 */

/**
 * Parse a timecode string to a **frame number**.
 *
 * Three-part format (A:B:C) is treated as MM:SS:FF — where C is the
 * frame offset within the second. This matches what the timeline ruler
 * displays (fmtTime in TimelinePanel).
 */
export function parseTimecodeToFrames(input: string, fps: number): number | null {
  const t = input.trim().replace(/s$/i, "");

  // MM:SS:FF  (three colon-separated parts)
  const threeMatch = t.match(/^(\d+):(\d{1,2}):(\d{1,2})$/);
  if (threeMatch) {
    const mm = parseInt(threeMatch[1]);
    const ss = parseInt(threeMatch[2]);
    const ff = parseInt(threeMatch[3]);
    if (ss >= 60) return null;
    return Math.round((mm * 60 + ss) * fps) + ff;
  }

  // M:SS.f  or  M:SS
  const colonMatch = t.match(/^(\d+):(\d{1,2})(?:\.(\d))?$/);
  if (colonMatch) {
    const mins = parseInt(colonMatch[1]);
    const secs = parseInt(colonMatch[2]);
    const tenth = colonMatch[3] ? parseInt(colonMatch[3]) : 0;
    if (secs >= 60) return null;
    return Math.round((mins * 60 + secs + tenth / 10) * fps);
  }

  // Plain number — treated as seconds
  const numMatch = t.match(/^(\d+(?:\.\d+)?)$/);
  if (numMatch) return Math.round(parseFloat(numMatch[1]) * fps);

  return null;
}

/**
 * Parse a timecode string to **seconds**.
 *
 * Supports HH:MM:SS, M:SS.f, M:SS, and plain numbers.
 */
export function parseTimecodeToSeconds(input: string): number | null {
  const t = input.trim();

  // HH:MM:SS
  const hhmmss = t.match(/^(\d+):(\d{2}):(\d{2})$/);
  if (hhmmss) {
    return parseInt(hhmmss[1]) * 3600 + parseInt(hhmmss[2]) * 60 + parseInt(hhmmss[3]);
  }

  // M:SS.f  or  M:SS
  const mss = t.match(/^(\d+):(\d{1,2})(?:\.(\d))?$/);
  if (mss) {
    const secs = parseInt(mss[2]);
    if (secs >= 60) return null;
    return parseInt(mss[1]) * 60 + secs + (mss[3] ? parseInt(mss[3]) / 10 : 0);
  }

  // Plain number
  const num = t.match(/^(\d+(?:\.\d+)?)$/);
  if (num) return parseFloat(num[1]);

  return null;
}
