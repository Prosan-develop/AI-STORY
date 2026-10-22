import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  Plus, 
  Trash2, 
  Copy, 
  Languages, 
  Play, 
  Pause, 
  Clock, 
  Video, 
  Volume2, 
  Sparkles, 
  Loader2, 
  Check, 
  Film, 
  CheckSquare, 
  Square, 
  Users, 
  CheckCircle2, 
  Eye, 
  Minimize2, 
  Maximize2 
} from 'lucide-react';
import { SrtItem } from '../types';
import { 
  parseSrt, 
  stringifySrt, 
  stringifyVtt, 
  shiftSrtTiming, 
  timestampToSeconds, 
  secondsToTimestamp 
} from '../utils/srtParser';
import { saveStoredSrtItems } from '../utils/storage';
import { speakBrowserText, stopSpeaking } from '../utils/khmerSpeech';
import { SrtVideoPreview } from './SrtVideoPreview';
import { AutoAlignTimingModal } from './AutoAlignTimingModal';

interface SrtEditorStudioProps {
  appLang: 'km' | 'en';
  srtList: SrtItem[];
  setSrtList: React.Dispatch<React.SetStateAction<SrtItem[]>>;
  onSendToMultiSpeakerTts: (items: SrtItem[]) => void;
}

export const SrtEditorStudio: React.FC<SrtEditorStudioProps> = ({
  appLang,
  srtList,
  setSrtList,
  onSendToMultiSpeakerTts,
}) => {
  const isKm = appLang === 'km';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Video State (Preload standard demo video so preview is active immediately)
  const [videoSrc, setVideoSrc] = useState<string>(
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  );
  const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);

  // Subtitle Overlay Styling
  const [subFontSize, setSubFontSize] = useState<number>(20);
  const [subColor, setSubColor] = useState<string>('#ffffff');
  const [subBgStyle, setSubBgStyle] = useState<'cinema' | 'pill' | 'shadow'>('cinema');
  const [subPosition, setSubPosition] = useState<'bottom' | 'center' | 'top'>('bottom');

  // Real-time Editing Preview Cue
  const [focusedCue, setFocusedCue] = useState<SrtItem | null>(null);

  // Floating Mini Video Preview (Picture-in-Picture)
  const [isMiniPreviewVisible, setIsMiniPreviewVisible] = useState<boolean>(false);

  // Multi-Selection State for Batch Processing
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Batch Translation Settings
  const [isTranslatingBatch, setIsTranslatingBatch] = useState<boolean>(false);
  const [targetSrtLang, setTargetSrtLang] = useState<string>('Khmer');
  const [sourceSrtLang, setSourceSrtLang] = useState<string>('Auto');
  const [translationTone, setTranslationTone] = useState<string>('Cinematic Movie Dialogue');
  const [activePlayingCueId, setActivePlayingCueId] = useState<string | null>(null);
  const [batchSuccessMessage, setBatchSuccessMessage] = useState<string | null>(null);

  // Auto-Align Timings Modal State
  const [isAutoAlignOpen, setIsAutoAlignOpen] = useState<boolean>(false);

  // Currently active subtitle on video according to timeline
  const activeSubtitle = srtList.find((cue) => {
    const s = timestampToSeconds(cue.startTime);
    const e = timestampToSeconds(cue.endTime);
    return videoCurrentTime >= s && videoCurrentTime <= e;
  });

  // Attach Video event listeners
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const onTimeUpdate = () => {
      setVideoCurrentTime(videoEl.currentTime);
    };

    const onLoadedMeta = () => {
      setVideoDuration(videoEl.duration);
    };

    const onEnded = () => {
      setIsPlayingVideo(false);
    };

    videoEl.addEventListener('timeupdate', onTimeUpdate);
    videoEl.addEventListener('loadedmetadata', onLoadedMeta);
    videoEl.addEventListener('ended', onEnded);

    return () => {
      videoEl.removeEventListener('timeupdate', onTimeUpdate);
      videoEl.removeEventListener('loadedmetadata', onLoadedMeta);
      videoEl.removeEventListener('ended', onEnded);
    };
  }, [videoSrc]);

  // Toggle Video Play/Pause
  const toggleVideoPlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlayingVideo(true);
    } else {
      videoRef.current.pause();
      setIsPlayingVideo(false);
    }
  };

  // Jump Video to Cue and highlight preview
  const jumpVideoToCue = (cue: SrtItem) => {
    const sec = timestampToSeconds(cue.startTime);
    setFocusedCue(cue);
    if (videoRef.current) {
      videoRef.current.currentTime = sec;
      videoRef.current.play();
      setIsPlayingVideo(true);
    } else {
      setVideoCurrentTime(sec);
    }
  };

  // Import .SRT File
  const handleSrtFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const parsed = parseSrt(content);
        if (parsed.length > 0) {
          setSrtList(parsed);
          saveStoredSrtItems(parsed);
          setSelectedIds(new Set());
        } else {
          alert('Could not parse SRT file');
        }
      }
    };
    reader.readAsText(file);
  };

  // Export SRT
  const exportSrtFile = () => {
    const str = stringifySrt(srtList);
    const blob = new Blob([str], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subtitles_${Date.now()}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export VTT
  const exportVttFile = () => {
    const str = stringifyVtt(srtList);
    const blob = new Blob([str], { type: 'text/vtt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subtitles_${Date.now()}.vtt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Add New Cue
  const handleAddCue = () => {
    const last = srtList[srtList.length - 1];
    let startSec = 0;
    if (last) {
      startSec = timestampToSeconds(last.endTime) + 0.5;
    }
    const endSec = startSec + 3.0;

    const newCue: SrtItem = {
      id: `cue-${Date.now()}`,
      index: srtList.length + 1,
      startTime: secondsToTimestamp(startSec),
      endTime: secondsToTimestamp(endSec),
      speaker: 'narrator',
      speakerLabel: 'អ្នករៀបរាប់ (Narrator)',
      text: isKm ? 'អត្ថបទ Subtitle ថ្មី...' : 'New subtitle line...',
    };

    const updated = [...srtList, newCue];
    setSrtList(updated);
    saveStoredSrtItems(updated);
    setFocusedCue(newCue);
  };

  // Update Cue Field and sync real-time preview
  const handleUpdateCue = (id: string, field: keyof SrtItem, val: any) => {
    const updated = srtList.map((cue) => {
      if (cue.id === id) {
        const modified = { ...cue, [field]: val };
        if (field === 'text') {
          setFocusedCue(modified);
        }
        return modified;
      }
      return cue;
    });
    setSrtList(updated);
    saveStoredSrtItems(updated);
  };

  // Delete Single Cue
  const handleDeleteCue = (id: string) => {
    const filtered = srtList.filter((c) => c.id !== id);
    const reindexed = filtered.map((c, i) => ({ ...c, index: i + 1 }));
    setSrtList(reindexed);
    saveStoredSrtItems(reindexed);
    if (selectedIds.has(id)) {
      const next = new Set(selectedIds);
      next.delete(id);
      setSelectedIds(next);
    }
    if (focusedCue?.id === id) {
      setFocusedCue(null);
    }
  };

  // Duplicate Cue
  const handleDuplicateCue = (item: SrtItem) => {
    const startSec = timestampToSeconds(item.endTime) + 0.2;
    const duration = Math.max(1, timestampToSeconds(item.endTime) - timestampToSeconds(item.startTime));
    const endSec = startSec + duration;

    const newCue: SrtItem = {
      ...item,
      id: `cue-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      index: srtList.length + 1,
      startTime: secondsToTimestamp(startSec),
      endTime: secondsToTimestamp(endSec),
    };

    const updated = [...srtList, newCue];
    setSrtList(updated);
    saveStoredSrtItems(updated);
    setFocusedCue(newCue);
  };

  // Shift timing for all cues
  const handleShiftTiming = (delta: number) => {
    const shifted = shiftSrtTiming(srtList, delta);
    setSrtList(shifted);
    saveStoredSrtItems(shifted);
  };

  // Play Individual Cue TTS
  const handlePlayCueSpeech = (cue: SrtItem) => {
    if (activePlayingCueId === cue.id) {
      stopSpeaking();
      setActivePlayingCueId(null);
      return;
    }
    setActivePlayingCueId(cue.id);
    speakBrowserText(cue.text, {
      pitch: cue.speaker === 'female' ? 1.25 : cue.speaker === 'male' ? 0.85 : 1.0,
      rate: 1.0,
      onEnd: () => setActivePlayingCueId(null),
    }).catch(() => setActivePlayingCueId(null));
  };

  // -------------------------------------------------------------
  // MULTI-SELECTION & BATCH PROCESSING TOOLS
  // -------------------------------------------------------------

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    const all = new Set(srtList.map((item) => item.id));
    setSelectedIds(all);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleInvertSelection = () => {
    const next = new Set<string>();
    srtList.forEach((item) => {
      if (!selectedIds.has(item.id)) {
        next.add(item.id);
      }
    });
    setSelectedIds(next);
  };

  const handleSelectBySpeaker = (role: 'male' | 'female' | 'narrator') => {
    const next = new Set(selectedIds);
    srtList.forEach((item) => {
      if (item.speaker === role) {
        next.add(item.id);
      }
    });
    setSelectedIds(next);
  };

  // Batch Auto-Translate Selected Lines simultaneously via Gemini API
  const handleBatchTranslateSelected = async () => {
    const targetItems = selectedIds.size > 0 
      ? srtList.filter((item) => selectedIds.has(item.id))
      : srtList;

    if (targetItems.length === 0) return;

    setIsTranslatingBatch(true);
    setBatchSuccessMessage(null);

    try {
      const res = await fetch('/api/translate-srt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          srtItems: targetItems,
          targetLang: targetSrtLang,
          sourceLang: sourceSrtLang,
          tone: translationTone,
        }),
      });

      const data = await res.json();
      if (data && Array.isArray(data.srtItems)) {
        const transMap = new Map<string, string>();
        data.srtItems.forEach((trans: any, idx: number) => {
          if (trans.id) {
            transMap.set(String(trans.id), trans.text);
          } else if (targetItems[idx]) {
            transMap.set(targetItems[idx].id, trans.text);
          }
        });

        const merged = srtList.map((orig) => {
          if (transMap.has(orig.id)) {
            return {
              ...orig,
              text: transMap.get(orig.id) || orig.text,
            };
          }
          return orig;
        });

        setSrtList(merged);
        saveStoredSrtItems(merged);

        const count = targetItems.length;
        setBatchSuccessMessage(
          isKm 
            ? `បានបកប្រែ ${count} ជួរទៅជា ${targetSrtLang} ដោយជោគជ័យ!` 
            : `Successfully auto-translated ${count} lines to ${targetSrtLang}!`
        );
        setTimeout(() => setBatchSuccessMessage(null), 4000);
      } else {
        alert(data.error || 'Failed to translate selected lines.');
      }
    } catch (e: any) {
      console.error(e);
      alert('Error translating selected SRT lines: ' + e.message);
    } finally {
      setIsTranslatingBatch(false);
    }
  };

  const handleBatchDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    const confirmMsg = isKm 
      ? `តើអ្នកប្រាកដជាចង់លុប ${selectedIds.size} ជួរដែលបានជ្រើសរើសនេះមែនទេ?` 
      : `Are you sure you want to delete ${selectedIds.size} selected lines?`;
    
    if (window.confirm(confirmMsg)) {
      const filtered = srtList.filter((c) => !selectedIds.has(c.id));
      const reindexed = filtered.map((c, i) => ({ ...c, index: i + 1 }));
      setSrtList(reindexed);
      saveStoredSrtItems(reindexed);
      setSelectedIds(new Set());
    }
  };

  const handleBatchAssignSpeaker = (role: 'male' | 'female' | 'narrator') => {
    if (selectedIds.size === 0) return;
    const updated = srtList.map((cue) => {
      if (selectedIds.has(cue.id)) {
        return {
          ...cue,
          speaker: role,
          speakerLabel: role === 'male' ? 'ប្រុស (Male)' : role === 'female' ? 'ស្រី (Female)' : 'អ្នកសម្រាយ (Narrator)',
        };
      }
      return cue;
    });
    setSrtList(updated);
    saveStoredSrtItems(updated);
  };

  const handleBatchShiftTiming = (delta: number) => {
    if (selectedIds.size === 0) {
      handleShiftTiming(delta);
      return;
    }
    const updated = srtList.map((cue) => {
      if (selectedIds.has(cue.id)) {
        const startSec = Math.max(0, timestampToSeconds(cue.startTime) + delta);
        const endSec = Math.max(startSec + 0.1, timestampToSeconds(cue.endTime) + delta);
        return {
          ...cue,
          startTime: secondsToTimestamp(startSec),
          endTime: secondsToTimestamp(endSec),
        };
      }
      return cue;
    });
    setSrtList(updated);
    saveStoredSrtItems(updated);
  };

  const isAllSelected = srtList.length > 0 && selectedIds.size === srtList.length;
  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-6 relative">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          <h3 className="font-bold text-slate-100 text-sm sm:text-base">
            {isKm ? 'ស្ទូឌីយោ Subtitle SRT & វីដេអូ' : 'SRT Subtitle & Video Studio'}
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            {srtList.length} {isKm ? 'ជួរ' : 'cues'}
          </span>
          {selectedCount > 0 && (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold animate-in fade-in">
              {isKm ? `បានជ្រើសរើស ${selectedCount} ជួរ` : `${selectedCount} selected`}
            </span>
          )}
        </div>

        {/* Buttons: Floating Mini Preview toggle, Import, Export, Add Cue */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Auto-Align Timings with Scene Cuts & Audio Silence Gaps via Gemini API */}
          <button
            onClick={() => setIsAutoAlignOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all cursor-pointer shadow-sm"
            title={isKm ? 'តម្រឹមម៉ោង Subtitle ស្វ័យប្រវត្តិតាម Scene Cuts & Silence Gaps ដោយប្រើ Gemini API' : 'Auto-align subtitle start and end times to match scene cuts & silence gaps using Gemini API'}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isKm ? 'តម្រឹមម៉ោង AI (Auto-Align)' : 'AI Auto-Align'}</span>
          </button>

          {/* Toggle Floating Mini Preview Button */}
          <button
            onClick={() => setIsMiniPreviewVisible(!isMiniPreviewVisible)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              isMiniPreviewVisible
                ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-md shadow-purple-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title={isKm ? 'បើកផ្ទាំងវីដេអូ Preview តូចបណ្តែត (Picture-in-Picture)' : 'Toggle Floating Mini Video Preview'}
          >
            <Eye className="w-3.5 h-3.5 text-purple-400" />
            <span>{isKm ? (isMiniPreviewVisible ? 'បិទ Mini Preview' : 'ផ្ទាំង Preview តូច (PiP)') : (isMiniPreviewVisible ? 'Hide Mini Preview' : 'Mini Video Preview')}</span>
          </button>

          <input
            type="file"
            accept=".srt,.txt"
            ref={fileInputRef}
            onChange={handleSrtFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isKm ? 'បញ្ចូល .SRT' : 'Import .SRT'}</span>
          </button>

          <button
            onClick={exportSrtFile}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>.SRT</span>
          </button>

          <button
            onClick={exportVttFile}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>.VTT</span>
          </button>

          <button
            onClick={handleAddCue}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isKm ? 'ថែម Subtitle' : 'Add Cue'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Video Preview in Sticky Sidebar + Subtitles Editor with Batch Tool */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Dedicated Sticky Video Preview Sidebar Component */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
          <SrtVideoPreview
            videoRef={videoRef}
            videoSrc={videoSrc}
            setVideoSrc={setVideoSrc}
            videoCurrentTime={videoCurrentTime}
            setVideoCurrentTime={setVideoCurrentTime}
            videoDuration={videoDuration}
            isPlayingVideo={isPlayingVideo}
            toggleVideoPlay={toggleVideoPlay}
            activeSubtitle={activeSubtitle}
            focusedCue={focusedCue}
            subFontSize={subFontSize}
            setSubFontSize={setSubFontSize}
            subColor={subColor}
            setSubColor={setSubColor}
            subBgStyle={subBgStyle}
            setSubBgStyle={setSubBgStyle}
            subPosition={subPosition}
            setSubPosition={setSubPosition}
            isKm={isKm}
            onToggleMini={() => setIsMiniPreviewVisible(true)}
          />

          {/* Timing Shift Panel */}
          <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs shadow-sm">
            <span className="text-slate-400 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{isKm ? 'រំកិលម៉ោងទាំងអស់:' : 'Sync Shift (All):'}</span>
            </span>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => handleShiftTiming(-1.0)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                title="-1.0 second"
              >
                -1.0s
              </button>
              <button
                onClick={() => handleShiftTiming(-0.5)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                title="-0.5 second"
              >
                -0.5s
              </button>
              <button
                onClick={() => handleShiftTiming(0.5)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                title="+0.5 second"
              >
                +0.5s
              </button>
              <button
                onClick={() => handleShiftTiming(1.0)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                title="+1.0 second"
              >
                +1.0s
              </button>
            </div>
          </div>

          {/* Quick Action: Send to Multi-Speaker TTS dubbing */}
          <button
            onClick={() => onSendToMultiSpeakerTts(srtList)}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-200 text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <Volume2 className="w-4 h-4 text-purple-400" />
            <span>{isKm ? 'បង្កើតសំឡេងអានបែងចែកប្រុសស្រី (Dubbing)' : 'Generate Multi-Speaker Voice Dubbing'}</span>
          </button>
        </div>

        {/* Right: Subtitle Entries Editor Form with BATCH AUTO-TRANSLATE */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* ========================================================= */}
          {/* BATCH SELECTION & AUTO-TRANSLATION TOOLBAR */}
          {/* ========================================================= */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center space-x-2">
                    <span>{isKm ? 'ឧបករណ៍បកប្រែជាក្រុម (Batch Auto-Translate)' : 'Batch Selection & Auto-Translate Tool'}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                      Gemini API
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {selectedCount > 0 
                      ? (isKm ? `បានជ្រើសរើស ${selectedCount} ជួរ (ចុចដើម្បីបកប្រែដំណាលគ្នា)` : `${selectedCount} lines selected for simultaneous translation`)
                      : (isKm ? 'ជ្រើសរើសជួរខាងក្រោម ឬចុច "ជ្រើសទាំងអស់" ដើម្បីបកប្រែជាក្រុម' : 'Select lines below to translate simultaneously, or select all')}
                  </p>
                </div>
              </div>

              {/* Quick Select Actions */}
              <div className="flex items-center space-x-1.5 text-xs">
                <button
                  onClick={isAllSelected ? handleDeselectAll : handleSelectAll}
                  className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                    isAllSelected 
                      ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                  title={isKm ? 'ជ្រើសរើសទាំងអស់ / ដោះការជ្រើសរើស' : 'Select All / Deselect'}
                >
                  {isAllSelected ? <CheckSquare className="w-3.5 h-3.5 text-indigo-400" /> : <Square className="w-3.5 h-3.5" />}
                  <span>{isAllSelected ? (isKm ? 'ដោះការជ្រើស' : 'Deselect All') : (isKm ? 'ជ្រើសទាំងអស់' : 'Select All')}</span>
                </button>

                {selectedCount > 0 && (
                  <button
                    onClick={handleInvertSelection}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium cursor-pointer"
                    title={isKm ? 'ជ្រើសបញ្ច្រាស' : 'Invert Selection'}
                  >
                    {isKm ? 'បញ្ច្រាស' : 'Invert'}
                  </button>
                )}

                {/* Filter/Select by speaker role */}
                <div className="relative group">
                  <button
                    className="flex items-center space-x-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs cursor-pointer"
                    title={isKm ? 'ជ្រើសតាមតួអង្គ' : 'Filter by Speaker'}
                  >
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span className="hidden sm:inline">{isKm ? 'តាមតួ' : 'Role'}</span>
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-1.5 space-y-1 z-30 hidden group-hover:block">
                    <button
                      onClick={() => handleSelectBySpeaker('male')}
                      className="w-full text-left px-2.5 py-1 rounded-lg text-xs text-blue-300 hover:bg-blue-950/60"
                    >
                      {isKm ? '• ជ្រើសរើសតួប្រុស (Male)' : '• Select Male lines'}
                    </button>
                    <button
                      onClick={() => handleSelectBySpeaker('female')}
                      className="w-full text-left px-2.5 py-1 rounded-lg text-xs text-pink-300 hover:bg-pink-950/60"
                    >
                      {isKm ? '• ជ្រើសរើសតួស្រី (Female)' : '• Select Female lines'}
                    </button>
                    <button
                      onClick={() => handleSelectBySpeaker('narrator')}
                      className="w-full text-left px-2.5 py-1 rounded-lg text-xs text-emerald-300 hover:bg-emerald-950/60"
                    >
                      {isKm ? '• ជ្រើសរើសអ្នកសម្រាយ (Narrator)' : '• Select Narrator'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Translation Controls Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs">
              {/* Target Language */}
              <div className="sm:col-span-5 flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-medium whitespace-nowrap">{isKm ? 'ភាសា:' : 'To:'}</span>
                <select
                  value={targetSrtLang}
                  onChange={(e) => setTargetSrtLang(e.target.value)}
                  className="w-full bg-transparent text-indigo-300 font-semibold focus:outline-none"
                >
                  <option value="Khmer">ភាសាខ្មែរ (Khmer)</option>
                  <option value="English">English</option>
                  <option value="Thai">ภาษาไทย (Thai)</option>
                  <option value="Chinese">中文 (Chinese)</option>
                  <option value="Vietnamese">Tiếng Việt (Vietnamese)</option>
                  <option value="Japanese">日本語 (Japanese)</option>
                  <option value="Korean">한국어 (Korean)</option>
                  <option value="French">Français</option>
                  <option value="Spanish">Español</option>
                </select>
              </div>

              {/* Translation Tone */}
              <div className="sm:col-span-4 flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-medium whitespace-nowrap">{isKm ? 'សំនៀង:' : 'Tone:'}</span>
                <select
                  value={translationTone}
                  onChange={(e) => setTranslationTone(e.target.value)}
                  className="w-full bg-transparent text-slate-300 focus:outline-none"
                >
                  <option value="Cinematic Movie Dialogue">Cinematic Dialogue (កុនធម្មជាតិ)</option>
                  <option value="Concise Subtitles">Concise Subtitles (ខ្លីខ្លឹម ស៊ីមាត់)</option>
                  <option value="Formal & Precise">Formal (ផ្លូវការ & ច្បាស់)</option>
                  <option value="Dramatic & Emotional">Dramatic (រំជួលចិត្ត)</option>
                </select>
              </div>

              {/* Primary Batch Action Button */}
              <div className="sm:col-span-3">
                <button
                  onClick={handleBatchTranslateSelected}
                  disabled={isTranslatingBatch || srtList.length === 0}
                  className="w-full h-full min-h-[34px] flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isTranslatingBatch ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>{isKm ? 'កំពុងបកប្រែ...' : 'Translating...'}</span>
                    </>
                  ) : (
                    <>
                      <Languages className="w-3.5 h-3.5 text-indigo-200" />
                      <span>
                        {selectedCount > 0 
                          ? (isKm ? `បកប្រែ (${selectedCount})` : `Translate (${selectedCount})`)
                          : (isKm ? 'បកប្រែទាំងអស់' : 'Translate All')}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Success notification banner */}
            {batchSuccessMessage && (
              <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{batchSuccessMessage}</span>
              </div>
            )}

            {/* Additional Secondary Batch Actions when rows are selected */}
            {selectedCount > 0 && (
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-1.5 text-slate-400">
                  <span>{isKm ? 'សកម្មភាពលើជួរដែលបានជ្រើស:' : 'Actions for selected:'}</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {/* Batch Assign Role */}
                  <div className="flex items-center space-x-1 bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                    <button
                      onClick={() => handleBatchAssignSpeaker('male')}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold text-blue-300 hover:bg-blue-900/40"
                      title={isKm ? 'ប្តូរជាតួប្រុស' : 'Set to Male'}
                    >
                      {isKm ? 'ប្រុស' : 'Male'}
                    </button>
                    <button
                      onClick={() => handleBatchAssignSpeaker('female')}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold text-pink-300 hover:bg-pink-900/40"
                      title={isKm ? 'ប្តូរជាតួស្រី' : 'Set to Female'}
                    >
                      {isKm ? 'ស្រី' : 'Female'}
                    </button>
                    <button
                      onClick={() => handleBatchAssignSpeaker('narrator')}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold text-emerald-300 hover:bg-emerald-900/40"
                      title={isKm ? 'ប្តូរជាអ្នកសម្រាយ' : 'Set to Narrator'}
                    >
                      {isKm ? 'សម្រាយ' : 'Narrator'}
                    </button>
                  </div>

                  {/* Batch Time Shift */}
                  <div className="flex items-center space-x-1 bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-[11px]">
                    <button
                      onClick={() => handleBatchShiftTiming(-0.5)}
                      className="px-1.5 py-0.5 rounded text-slate-300 hover:bg-slate-800 font-mono"
                      title={isKm ? 'រំកិលថយក្រោយ 0.5 វិនាទី' : 'Shift -0.5s'}
                    >
                      -0.5s
                    </button>
                    <button
                      onClick={() => handleBatchShiftTiming(0.5)}
                      className="px-1.5 py-0.5 rounded text-slate-300 hover:bg-slate-800 font-mono"
                      title={isKm ? 'រំកិលទៅមុខ 0.5 វិនាទី' : 'Shift +0.5s'}
                    >
                      +0.5s
                    </button>
                  </div>

                  {/* Batch Delete */}
                  <button
                    onClick={handleBatchDeleteSelected}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3 text-rose-400" />
                    <span>{isKm ? `លុប (${selectedCount})` : `Delete (${selectedCount})`}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* Cues List with Real-Time Video Preview Synchronization */}
          {/* ========================================================= */}
          <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
            {srtList.map((cue) => {
              const isSelected = selectedIds.has(cue.id);
              const isActiveInVideo = activeSubtitle?.id === cue.id;
              const isBeingEdited = focusedCue?.id === cue.id;

              return (
                <div
                  key={cue.id}
                  className={`bg-slate-900 border rounded-xl p-3.5 transition-all ${
                    isBeingEdited
                      ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-slate-900 shadow-md'
                      : isSelected
                      ? 'border-indigo-500 bg-indigo-950/20 ring-1 ring-indigo-500/40 shadow-sm'
                      : isActiveInVideo
                      ? 'border-amber-500 ring-1 ring-amber-500/50 bg-slate-900/95'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Row Header: Checkbox, Index, Timestamps, Jump Preview, Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
                    <div className="flex items-center space-x-2">
                      {/* Batch Selection Checkbox */}
                      <button
                        onClick={() => toggleSelect(cue.id)}
                        className={`p-1 rounded-md transition-colors cursor-pointer ${
                          isSelected
                            ? 'text-indigo-400 bg-indigo-500/20'
                            : 'text-slate-500 hover:text-slate-300 bg-slate-800/60'
                        }`}
                        title={isSelected ? (isKm ? 'ដោះការជ្រើសរើស' : 'Deselect') : (isKm ? 'ជ្រើសរើសជួរនេះ' : 'Select for batch')}
                      >
                        {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4" />}
                      </button>

                      <span className="font-bold text-slate-400 w-5 text-center font-mono">#{cue.index}</span>

                      {/* Start Time */}
                      <input
                        type="text"
                        value={cue.startTime}
                        onChange={(e) => handleUpdateCue(cue.id, 'startTime', e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 font-mono text-[11px] w-24 text-center focus:ring-1 focus:ring-indigo-500"
                      />

                      <span className="text-slate-500">→</span>

                      {/* End Time */}
                      <input
                        type="text"
                        value={cue.endTime}
                        onChange={(e) => handleUpdateCue(cue.id, 'endTime', e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 font-mono text-[11px] w-24 text-center focus:ring-1 focus:ring-indigo-500"
                      />

                      {/* Live Video Preview Button for this Cue */}
                      <button
                        onClick={() => jumpVideoToCue(cue)}
                        title={isKm ? 'មើល Subtitle នេះលើវីដេអូផ្ទាល់' : 'Preview this subtitle on video'}
                        className="flex items-center space-x-1 px-2 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold cursor-pointer text-[11px]"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span className="hidden sm:inline">{isKm ? 'មើលលើវីដេអូ' : 'Preview'}</span>
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Speaker Selector */}
                      <select
                        value={cue.speaker}
                        onChange={(e) => handleUpdateCue(cue.id, 'speaker', e.target.value)}
                        className={`rounded px-2 py-1 text-[11px] font-semibold border ${
                          cue.speaker === 'male'
                            ? 'bg-blue-950/60 text-blue-300 border-blue-500/40'
                            : cue.speaker === 'female'
                            ? 'bg-pink-950/60 text-pink-300 border-pink-500/40'
                            : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        <option value="narrator">{isKm ? 'អ្នករៀបរាប់ (Narrator)' : 'Narrator'}</option>
                        <option value="male">{isKm ? 'តួប្រុស (Male)' : 'Male'}</option>
                        <option value="female">{isKm ? 'តួស្រី (Female)' : 'Female'}</option>
                      </select>

                      {/* Listen Button */}
                      <button
                        onClick={() => handlePlayCueSpeech(cue)}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          activePlayingCueId === cue.id
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                        }`}
                        title={isKm ? 'ស្តាប់សំឡេងជួរនេះ' : 'Listen line audio'}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Duplicate Cue */}
                      <button
                        onClick={() => handleDuplicateCue(cue)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700 cursor-pointer"
                        title={isKm ? 'ថតចម្លង' : 'Duplicate'}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Cue */}
                      <button
                        onClick={() => handleDeleteCue(cue.id)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-700 cursor-pointer"
                        title={isKm ? 'លុប' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Subtitle Text Content with Real-Time Video Reflection on Typing */}
                  <div className="relative">
                    <textarea
                      value={cue.text}
                      onFocus={() => {
                        setFocusedCue(cue);
                        // Align video to this cue's timing for visual preview
                        if (videoRef.current) {
                          videoRef.current.currentTime = timestampToSeconds(cue.startTime);
                        }
                      }}
                      onChange={(e) => {
                        handleUpdateCue(cue.id, 'text', e.target.value);
                      }}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600 resize-none font-medium"
                    />
                    {isBeingEdited && (
                      <span className="absolute bottom-2 right-2 text-[10px] text-emerald-400 font-semibold bg-slate-900/90 px-1.5 py-0.5 rounded border border-emerald-500/30">
                        {isKm ? '⚡ Live on Video' : '⚡ Live on Video'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {srtList.length === 0 && (
              <div className="text-center p-8 border border-dashed border-slate-800 rounded-2xl text-slate-500">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">{isKm ? 'គ្មាន Subtitle នៅឡើយទេ។ ចុច "ថែម Subtitle" ឬ "បញ្ចូល .SRT"' : 'No subtitles yet. Click Add Cue or Import .SRT'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Picture-in-Picture Mini Video Preview Widget */}
      {isMiniPreviewVisible && (
        <SrtVideoPreview
          videoRef={videoRef}
          videoSrc={videoSrc}
          setVideoSrc={setVideoSrc}
          videoCurrentTime={videoCurrentTime}
          setVideoCurrentTime={setVideoCurrentTime}
          videoDuration={videoDuration}
          isPlayingVideo={isPlayingVideo}
          toggleVideoPlay={toggleVideoPlay}
          activeSubtitle={activeSubtitle}
          focusedCue={focusedCue}
          subFontSize={subFontSize}
          setSubFontSize={setSubFontSize}
          subColor={subColor}
          setSubColor={setSubColor}
          subBgStyle={subBgStyle}
          setSubBgStyle={setSubBgStyle}
          subPosition={subPosition}
          setSubPosition={setSubPosition}
          isKm={isKm}
          isMini={true}
          onCloseMini={() => setIsMiniPreviewVisible(false)}
        />
      )}

      {/* Auto-Align Timings Modal (Scene cuts & Audio silence gaps via Gemini API) */}
      <AutoAlignTimingModal
        isOpen={isAutoAlignOpen}
        onClose={() => setIsAutoAlignOpen(false)}
        srtList={srtList}
        onApplyTimings={(adjustedItems) => {
          setSrtList(adjustedItems);
          saveStoredSrtItems(adjustedItems);
        }}
        appLang={appLang}
        videoRef={videoRef}
        videoDuration={videoDuration}
      />
    </div>
  );
};
