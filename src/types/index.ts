export type LanguageCode =
  | 'km'
  | 'en'
  | 'zh'
  | 'th'
  | 'vi'
  | 'ja'
  | 'ko'
  | 'fr'
  | 'es';

export type SubtitleAnimationPreset = 
  | 'none'
  | 'fade-in'
  | 'pop'
  | 'typewriter'
  | 'slide-up'
  | 'glow-pulse';

export interface SrtExportOptions {
  includeSpeakerTags?: boolean;
  speakerPrefixFormat?: 'brackets' | 'colon' | 'none'; // [ប្រុស] vs ប្រុស: vs none
  filename?: string;
  addUtf8Bom?: boolean;
  cleanWhitespace?: boolean;
  reindexSequentially?: boolean;
}

export interface SrtItem {
  id: string;
  index: number;
  startTime: string; // "00:00:01,000"
  endTime: string;   // "00:00:04,500"
  speaker: 'male' | 'female' | 'narrator' | 'other';
  speakerLabel?: string;
  text: string;
  audioUrl?: string;
  isGeneratingAudio?: boolean;
}

export interface StoryRecapResult {
  hook: string;
  fullScript: string;
  suggestedTitles: string[];
  hashtags: string[];
  estimatedDurationMinutes: number;
}

export interface OcrTextBlock {
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000
  originalText: string;
  translatedText: string;
  category: 'dialogue' | 'narration' | 'heading' | 'sound_effect' | 'caption' | 'subtitle';
}

export interface OcrResult {
  summary: string;
  totalBlocksFound: number;
  blocks: OcrTextBlock[];
}

export interface VoicePreset {
  id: string;
  nameKhmer: string;
  nameEn: string;
  pitch: number;    // semitones, e.g. -12 to +12
  playbackRate: number; // 0.5 to 2.0
  reverb: boolean;
  filterType?: BiquadFilterType;
  filterFreq?: number;
  description: string;
  iconName: string;
}

export interface BackupProjectData {
  version: string;
  timestamp: string;
  activeProjectName: string;
  srtList: SrtItem[];
  savedRecaps: { title: string; script: string; date: string }[];
  translationHistory: { source: string; target: string; original: string; translated: string; date: string }[];
}
