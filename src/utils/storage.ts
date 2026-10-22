import { BackupProjectData, SrtItem } from '../types';

const STORAGE_KEYS = {
  SRT_ITEMS: 'kromstory_srt_items',
  SAVED_RECAPS: 'kromstory_saved_recaps',
  TRANSLATION_HISTORY: 'kromstory_translation_history',
  APP_SETTINGS: 'kromstory_app_settings',
  LAST_BACKUP: 'kromstory_last_backup_time',
};

// Initial Sample Subtitles for demonstration
export const SAMPLE_SRT_ITEMS: SrtItem[] = [
  {
    id: 'sample-1',
    index: 1,
    startTime: '00:00:01,200',
    endTime: '00:00:04,800',
    speaker: 'narrator',
    speakerLabel: 'អ្នកសម្រាយ (Narrator)',
    text: 'នៅក្នុងពិភពដ៏អាថ៌កំបាំងមួយ បុរសវ័យក្មេងម្នាក់បានរកឃើញអាថ៌កំបាំងមិនគួរឱ្យជឿ...',
  },
  {
    id: 'sample-2',
    index: 2,
    startTime: '00:00:05,100',
    endTime: '00:00:08,400',
    speaker: 'male',
    speakerLabel: 'តួប្រុស (Hero)',
    text: 'ខ្ញុំមិនអាចអនុញ្ញាតឱ្យពួកគេបំផ្លាញទីក្រុងនេះជាដាច់ខាត! ខ្ញុំត្រូវតែបញ្ឈប់វា!',
  },
  {
    id: 'sample-3',
    index: 3,
    startTime: '00:00:08,900',
    endTime: '00:00:12,600',
    speaker: 'female',
    speakerLabel: 'តួស្រី (Heroine)',
    text: 'ចាំខ្ញុំផង! អ្នកមិនអាចទៅប្រឈមមុខនឹងគ្រោះថ្នាក់នេះតែម្នាក់ឯងបានទេ។',
  },
  {
    id: 'sample-4',
    index: 4,
    startTime: '00:00:13,000',
    endTime: '00:00:18,200',
    speaker: 'narrator',
    speakerLabel: 'អ្នកសម្រាយ (Narrator)',
    text: 'ហើយការប្រយុទ្ធដ៏អស្ចារ្យដើម្បីសង្គ្រោះពិភពលោកក៏បានចាប់ផ្តើមឡើង!',
  },
];

export function loadStoredSrtItems(): SrtItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SRT_ITEMS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to load SRT from storage', e);
  }
  return SAMPLE_SRT_ITEMS;
}

export function saveStoredSrtItems(items: SrtItem[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.SRT_ITEMS, JSON.stringify(items));
    localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, new Date().toISOString());
  } catch (e) {
    console.error('Failed to save SRT to storage', e);
  }
}

export function loadSavedRecaps(): { title: string; script: string; date: string }[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_RECAPS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return [
    {
      title: 'សម្រាយរឿងកុន៖ បុរសលាក់មុខ និងរូងភ្នំអាថ៌កំបាំង',
      script: 'សូមស្វាគមន៍មកកាន់ការសម្រាយរឿងកុនដ៏រំភើប! ថ្ងៃនេះយើងនឹងនាំអ្នកទាំងអស់គ្នាទៅជួបជាមួយរឿងរ៉ាវរបស់យុវជនម្នាក់...',
      date: new Date().toLocaleDateString('km-KH'),
    },
  ];
}

export function saveRecap(recap: { title: string; script: string }) {
  try {
    const existing = loadSavedRecaps();
    const updated = [
      {
        ...recap,
        date: new Date().toLocaleDateString('km-KH') + ' ' + new Date().toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit' }),
      },
      ...existing.slice(0, 20),
    ];
    localStorage.setItem(STORAGE_KEYS.SAVED_RECAPS, JSON.stringify(updated));
    localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, new Date().toISOString());
    return updated;
  } catch (e) {
    console.error(e);
    return [];
  }
}

export function exportFullBackup(): string {
  const data: BackupProjectData = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    activeProjectName: 'KromStory_AI_Backup',
    srtList: loadStoredSrtItems(),
    savedRecaps: loadSavedRecaps(),
    translationHistory: [],
  };
  return JSON.stringify(data, null, 2);
}

export function importFullBackup(jsonStr: string): boolean {
  try {
    const data: BackupProjectData = JSON.parse(jsonStr);
    if (data.srtList && Array.isArray(data.srtList)) {
      saveStoredSrtItems(data.srtList);
    }
    if (data.savedRecaps && Array.isArray(data.savedRecaps)) {
      localStorage.setItem(STORAGE_KEYS.SAVED_RECAPS, JSON.stringify(data.savedRecaps));
    }
    localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, new Date().toISOString());
    return true;
  } catch (e) {
    console.error('Import backup failed', e);
    return false;
  }
}
