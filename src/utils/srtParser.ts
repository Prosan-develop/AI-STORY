import { SrtItem, SrtExportOptions } from '../types';

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
 * Format string into standard SubRip timestamp 00:00:00,000
 */
export function formatSrtTimestamp(str: string): string {
  if (!str) return '00:00:00,000';
  let cleaned = str.trim().replace('.', ',');
  const parts = cleaned.split(':');
  if (parts.length === 2) {
    cleaned = '00:' + cleaned;
  }
  const timeWithMillis = cleaned.split(',');
  if (timeWithMillis.length === 2) {
    const millis = timeWithMillis[1].padEnd(3, '0').slice(0, 3);
    return `${timeWithMillis[0]},${millis}`;
  } else {
    return `${cleaned},000`;
  }
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
 * Generate standard formatted SubRip (.srt) text format
 * Compliant with standard SubRip specification:
 * [Sequential Number]
 * [00:00:00,000 --> 00:00:00,000]
 * [Subtitle Text line(s)]
 */
export function stringifySrt(items: SrtItem[], options?: SrtExportOptions): string {
  const includeSpeakers = options?.includeSpeakerTags ?? false;
  const speakerFormat = options?.speakerPrefixFormat ?? 'brackets';
  const cleanWhitespace = options?.cleanWhitespace !== false;

  const validItems = (items || []).filter((item) => {
    if (!item) return false;
    // Don't discard cues, but ensure text is string
    return true;
  });

  return validItems
    .map((item, idx) => {
      const cueIndex = idx + 1;
      const start = formatSrtTimestamp(item.startTime);
      const end = formatSrtTimestamp(item.endTime);

      let speakerPrefix = '';
      if (includeSpeakers) {
        if (speakerFormat === 'colon') {
          if (item.speaker === 'male') speakerPrefix = 'ប្រុស: ';
          else if (item.speaker === 'female') speakerPrefix = 'ស្រី: ';
          else if (item.speaker === 'narrator') speakerPrefix = 'អ្នករៀបរាប់: ';
        } else {
          // Standard bracket format
          if (item.speaker === 'male') speakerPrefix = '[ប្រុស] ';
          else if (item.speaker === 'female') speakerPrefix = '[ស្រី] ';
          else if (item.speaker === 'narrator') speakerPrefix = '[អ្នករៀបរាប់] ';
        }
      }

      let textContent = item.text || '';
      // If user chose NOT to include speaker tags, strip out any residual tags in the text
      if (!includeSpeakers) {
        textContent = textContent
          .replace(/\[(ប្រុស|male|man)\]\s*/gi, '')
          .replace(/\[(ស្រី|female|woman)\]\s*/gi, '')
          .replace(/\[(narrator|អ្នករៀបរាប់)\]\s*/gi, '')
          .replace(/^ប្រុស\s*:\s*/i, '')
          .replace(/^ស្រី\s*:\s*/i, '')
          .replace(/^(អ្នករៀបរាប់|narrator)\s*:\s*/i, '');
      }

      if (cleanWhitespace) {
        textContent = textContent.trim();
      }

      return `${cueIndex}\n${start} --> ${end}\n${speakerPrefix}${textContent}`;
    })
    .join('\n\n') + '\n';
}

/**
 * Downloads a formatted .srt file directly to the user's device.
 * Injects UTF-8 BOM (\uFEFF) by default to guarantee Khmer Unicode & multilingual
 * characters render without corruption in VLC, Premiere Pro, CapCut, DaVinci, mobile & desktop editors.
 */
export function downloadSrtFile(
  items: SrtItem[],
  options?: SrtExportOptions
): { success: boolean; filename: string; cueCount: number; byteSize: number } {
  if (!items || items.length === 0) {
    return { success: false, filename: '', cueCount: 0, byteSize: 0 };
  }

  const formattedContent = stringifySrt(items, options);

  // Determine filename
  let filename = (options?.filename || '').trim();
  if (!filename) {
    const dateStr = new Date().toISOString().slice(0, 10);
    filename = `khs_subtitles_${dateStr}.srt`;
  }
  if (!filename.toLowerCase().endsWith('.srt')) {
    filename += '.srt';
  }

  // Prepend UTF-8 BOM to prevent corrupt characters on Windows/Media players
  const useBom = options?.addUtf8Bom !== false;
  const contentWithBom = useBom ? '\uFEFF' + formattedContent : formattedContent;

  const blob = new Blob([contentWithBom], {
    type: 'application/x-subrip;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();

  // Clean up
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 200);

  return {
    success: true,
    filename,
    cueCount: items.length,
    byteSize: blob.size,
  };
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

/**
 * Convert SRT timestamp (00:01:23,456) to ASS timestamp (0:01:23.46)
 */
export function srtTimeToAssTime(timeStr: string): string {
  const sec = timestampToSeconds(timeStr);
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  const secsInt = Math.floor(seconds);
  const centis = Math.floor((seconds - secsInt) * 100);

  const mm = String(minutes).padStart(2, '0');
  const ss = String(secsInt).padStart(2, '0');
  const cc = String(centis).padStart(2, '0');
  return `${hours}:${mm}:${ss}.${cc}`;
}

/**
 * Generate Advanced SubStation Alpha (.ass) with embedded animations
 */
export function stringifyAss(
  items: SrtItem[],
  options?: {
    preset?: string;
    fontSize?: number;
    colorHex?: string;
    position?: 'bottom' | 'center' | 'top';
  }
): string {
  const preset = options?.preset || 'fade-in';
  const fontSize = options?.fontSize || 24;
  const pos = options?.position || 'bottom';
  const alignment = pos === 'top' ? 8 : pos === 'center' ? 5 : 2;

  // Header and styles
  const header = `[Script Info]
Title: KHS AI STORYLINE Animated Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: None
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Kantumruy Pro,${fontSize * 2.2},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,2,${alignment},60,60,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events = items.map((item) => {
    const start = srtTimeToAssTime(item.startTime);
    const end = srtTimeToAssTime(item.endTime);
    let animTag = '';

    if (preset === 'fade-in') {
      animTag = '{\\fad(250,200)}';
    } else if (preset === 'pop') {
      animTag = '{\\t(0,140,\\fscx115\\fscy115)\\t(140,260,\\fscx100\\fscy100)}';
    } else if (preset === 'typewriter') {
      // Split words with karaoke timing tags
      const words = item.text.split(' ');
      const perWordDur = Math.max(10, Math.floor(180 / Math.max(1, words.length)));
      const tagged = words.map((w) => `{\\k${perWordDur}}${w}`).join(' ');
      return `Dialogue: 0,${start},${end},Default,,0,0,0,,${tagged}`;
    } else if (preset === 'slide-up') {
      const targetY = pos === 'top' ? 120 : pos === 'center' ? 540 : 960;
      animTag = `{\\move(960,${targetY + 40},960,${targetY},0,200)}`;
    } else if (preset === 'glow-pulse') {
      animTag = '{\\t(0,300,\\bord5\\3c&H00FFFF&)\\t(300,600,\\bord2\\3c&H000000&)}';
    }

    return `Dialogue: 0,${start},${end},Default,,0,0,0,,${animTag}${item.text.replace(/\n/g, '\\N')}`;
  });

  return header + events.join('\n');
}

/**
 * Generate Standalone CSS Animation code for video overlay export
 */
export function generateSubtitleCss(preset: string): string {
  return `/* KHS AI STORYLINE Subtitle CSS Overlay - Preset: ${preset} */

/* 1. Base Subtitle Container */
.khs-subtitle-overlay {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none;
  z-index: 100;
  padding: 0 24px;
}

.khs-subtitle-overlay.pos-bottom { bottom: 32px; }
.khs-subtitle-overlay.pos-center { top: 50%; transform: translateY(-50%); }
.khs-subtitle-overlay.pos-top { top: 32px; }

/* 2. Subtitle Text Box */
.khs-subtitle-text {
  font-family: 'Kantumruy Pro', system-ui, -apple-system, sans-serif;
  color: #ffffff;
  font-weight: 700;
  text-align: center;
  line-height: 1.4;
  padding: 8px 16px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.82);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
  max-width: 90%;
  will-change: transform, opacity;
}

/* 3. Animation Preset: ${preset} */
${
  preset === 'fade-in'
    ? `@keyframes khs-fade-in {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}
.khs-anim-fade-in {
  animation: khs-fade-in 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}`
    : preset === 'pop'
    ? `@keyframes khs-pop {
  0% { transform: scale(0.65); opacity: 0; }
  65% { transform: scale(1.14); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.khs-anim-pop {
  animation: khs-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}`
    : preset === 'typewriter'
    ? `@keyframes khs-typewriter-clip {
  from { clip-path: inset(0 100% 0 0); opacity: 0.5; }
  to { clip-path: inset(0 0 0 0); opacity: 1; }
}
.khs-anim-typewriter {
  animation: khs-typewriter-clip 0.45s steps(28, end) forwards;
}`
    : preset === 'slide-up'
    ? `@keyframes khs-slide-up {
  from { transform: translateY(24px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.khs-anim-slide-up {
  animation: khs-slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}`
    : preset === 'glow-pulse'
    ? `@keyframes khs-glow {
  0% { text-shadow: 0 0 4px rgba(99,102,241,0.4); }
  50% { text-shadow: 0 0 20px rgba(99,102,241,0.9), 0 0 35px rgba(236,72,153,0.7); }
  100% { text-shadow: 0 0 8px rgba(99,102,241,0.4); }
}
.khs-anim-glow-pulse {
  animation: khs-glow 1.5s infinite ease-in-out;
}`
    : `/* No animation selected */`
}
`;
}

