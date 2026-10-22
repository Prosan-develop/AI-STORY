import { SrtItem } from '../types';

/**
 * Parses raw SRT content into SrtItem array
 */
export function parseSrt(srtContent: string): SrtItem[] {
  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const blocks = normalized.split(/\n\n+/);
  const items: SrtItem[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const lines = blocks[i].split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    let index = i + 1;
    let timeLineIndex = 0;

    // First line is usually number index
    if (/^\d+$/.test(lines[0])) {
      index = parseInt(lines[0], 10);
      timeLineIndex = 1;
    }

    const timeLine = lines[timeLineIndex];
    if (!timeLine || !timeLine.includes('-->')) continue;

    const [startRaw, endRaw] = timeLine.split('-->').map((s) => s.trim());
    const startTime = formatSrtTimestamp(startRaw);
    const endTime = formatSrtTimestamp(endRaw);

    const textLines = lines.slice(timeLineIndex + 1);
    let fullText = textLines.join('\n');

    // Detect speaker tag e.g. [ប្រុស], [ស្រី], [Alex]:, Narrator:
    let speaker: SrtItem['speaker'] = 'narrator';
    let speakerLabel = '';

    if (/\[(ប្រុស|male|man)\]/i.test(fullText) || /^ប្រុស\s*:/i.test(fullText)) {
      speaker = 'male';
      speakerLabel = 'ប្រុស (Male)';
      fullText = fullText.replace(/\[(ប្រុស|male|man)\]/gi, '').replace(/^ប្រុស\s*:\s*/i, '').trim();
    } else if (/\[(ស្រី|female|woman)\]/i.test(fullText) || /^ស្រី\s*:/i.test(fullText)) {
      speaker = 'female';
      speakerLabel = 'ស្រី (Female)';
      fullText = fullText.replace(/\[(ស្រី|female|woman)\]/gi, '').replace(/^ស្រី\s*:\s*/i, '').trim();
    } else if (/\[(narrator|អ្នករៀបរាប់)\]/i.test(fullText) || /^(អ្នករៀបរាប់|narrator)\s*:/i.test(fullText)) {
      speaker = 'narrator';
      speakerLabel = 'អ្នកសម្រាយ (Narrator)';
      fullText = fullText.replace(/\[(narrator|អ្នករៀបរាប់)\]/gi, '').replace(/^(អ្នករៀបរាប់|narrator)\s*:\s*/i, '').trim();
    }

    items.push({
      id: `srt-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
      index,
      startTime,
      endTime,
      speaker,
      speakerLabel,
      text: fullText,
    });
  }

  return items;
}

/**
 * Format string into standard 00:00:00,000
 */
function formatSrtTimestamp(str: string): string {
  if (!str) return '00:00:00,000';
  // Standardize comma vs dot
  let cleaned = str.replace('.', ',');
  // If no hours, add them
  const parts = cleaned.split(':');
  if (parts.length === 2) {
    cleaned = '00:' + cleaned;
  }
  return cleaned;
}

/**
 * Convert SRT timestamp (00:01:23,456) to seconds (float)
 */
export function timestampToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const cleaned = timeStr.replace(',', '.');
  const parts = cleaned.split(':');
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]) || 0;
    const minutes = parseFloat(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }
  return parseFloat(timeStr) || 0;
}

/**
 * Convert seconds (float) to SRT timestamp string (00:01:23,456)
 */
export function secondsToTimestamp(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
  const hours = Math.floor(totalSeconds / 3600);
  const remainder = totalSeconds % 3600;
  const minutes = Math.floor(remainder / 60);
  const seconds = remainder % 60;
  const secsInt = Math.floor(seconds);
  const millis = Math.round((seconds - secsInt) * 1000);

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(secsInt).padStart(2, '0');
  const mmm = String(millis).padStart(3, '0');

  return `${hh}:${mm}:${ss},${mmm}`;
}

/**
 * Generate standard SRT text format
 */
export function stringifySrt(items: SrtItem[]): string {
  return items
    .map((item, idx) => {
      let speakerPrefix = '';
      if (item.speaker === 'male') speakerPrefix = '[ប្រុស] ';
      else if (item.speaker === 'female') speakerPrefix = '[ស្រី] ';
      else if (item.speaker === 'narrator') speakerPrefix = '[អ្នករៀបរាប់] ';

      return `${idx + 1}\n${item.startTime} --> ${item.endTime}\n${speakerPrefix}${item.text}`;
    })
    .join('\n\n');
}

/**
 * Generate WebVTT (.vtt) text format
 */
export function stringifyVtt(items: SrtItem[]): string {
  const body = items
    .map((item, idx) => {
      const vttStart = item.startTime.replace(',', '.');
      const vttEnd = item.endTime.replace(',', '.');
      return `${idx + 1}\n${vttStart} --> ${vttEnd}\n${item.text}`;
    })
    .join('\n\n');

  return `WEBVTT\n\n${body}`;
}

/**
 * Shift all cues by deltaSeconds (can be positive or negative)
 */
export function shiftSrtTiming(items: SrtItem[], deltaSeconds: number): SrtItem[] {
  return items.map((item) => {
    const startSec = Math.max(0, timestampToSeconds(item.startTime) + deltaSeconds);
    const endSec = Math.max(startSec + 0.1, timestampToSeconds(item.endTime) + deltaSeconds);
    return {
      ...item,
      startTime: secondsToTimestamp(startSec),
      endTime: secondsToTimestamp(endSec),
    };
  });
}
