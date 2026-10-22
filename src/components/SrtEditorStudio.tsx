import React, { useState, useRef } from 'react';
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
  ListFilter,
  Users,
  FastForward,
  Rewind,
  CheckCircle2,
  AlertCircle
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
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Video State
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);

  // Subtitle Overlay Styling
  const [subFontSize, setSubFontSize] = useState<number>(20);
  const [subColor, setSubColor] = useState<string>('#ffffff');
  const [subBgStyle, setSubBgStyle] = useState<'cinema' | 'pill' | 'shadow'>('cinema');
  const [subPosition, setSubPosition] = useState<'bottom' | 'center' | 'top'>('bottom');

  // Multi-Selection State for Batch Processing
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Batch Translation Settings
  const [isTranslatingBatch, setIsTranslatingBatch] = useState<boolean>(false);
  const [targetSrtLang, setTargetSrtLang] = useState<string>('Khmer');
  const [sourceSrtLang, setSourceSrtLang] = useState<string>('Auto');
  const [translationTone, setTranslationTone] = useState<string>('Cinematic Movie Dialogue');
  const [activePlayingCueId, setActivePlayingCueId] = useState<string | null>(null);
  const [batchSuccessMessage, setBatchSuccessMessage] = useState<string | null>(null);

  // Currently active subtitle on video
  const activeSubtitle = srtList.find((cue) => {
    const s = timestampToSeconds(cue.startTime);
    const e = timestampToSeconds(cue.endTime);
    return videoCurrentTime >= s && videoCurrentTime <= e;
  });

  // Handle Video Time Update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setVideoCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  };

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

  // Jump Video to Cue
  const jumpVideoToCue = (timeStr: string) => {
    const sec = timestampToSeconds(timeStr);
    if (videoRef.current) {
      videoRef.current.currentTime = sec;
      videoRef.current.play();
      setIsPlayingVideo(true);
    } else {
      setVideoCurrentTime(sec);
    }
  };

  // Upload Video File
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  // Load Built-in Demo Video
  const loadDemoVideo = () => {
    setVideoSrc('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
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
  };

  // Update Cue Field
  const handleUpdateCue = (id: string, field: keyof SrtItem, val: any) => {
    const updated = srtList.map((cue) => {
      if (cue.id === id) {
        return { ...cue, [field]: val };
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
    // Also remove from selection if present
    if (selectedIds.has(id)) {
      const next = new Set(selectedIds);
      next.delete(id);
      setSelectedIds(next);
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

  // Toggle single item selection
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Select all lines
  const handleSelectAll = () => {
    const all = new Set(srtList.map((item) => item.id));
    setSelectedIds(all);
  };

  // Deselect all lines
  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Invert selection
  const handleInvertSelection = () => {
    const next = new Set<string>();
    srtList.forEach((item) => {
      if (!selectedIds.has(item.id)) {
        next.add(item.id);
      }
    });
    setSelectedIds(next);
  };

  // Select by speaker role
  const handleSelectBySpeaker = (role: 'male' | 'female' | 'narrator') => {
    const next = new Set(selectedIds);
    srtList.forEach((item) => {
      if (item.speaker === role) {
        next.add(item.id);
      }
    });
    setSelectedIds(next);
  };

  // Batch Auto-Translate Selected Lines (Simultaneously via Gemini API)
  const handleBatchTranslateSelected = async () => {
    // If none selected, default to all cues
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
        // Create lookup dictionary by id or index
        const transMap = new Map<string, string>();
        data.srtItems.forEach((trans: any, idx: number) => {
          if (trans.id) {
            transMap.set(String(trans.id), trans.text);
          } else if (targetItems[idx]) {
            transMap.set(targetItems[idx].id, trans.text);
          }
        });

        // Merge updated translations back into srtList
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

  // Batch delete selected lines
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

  // Batch assign speaker role to selected lines
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

  // Batch time shift for selected lines only
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
    <div className="space-y-6">
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

        {/* Buttons: Import, Export, Add Cue */}
        <div className="flex flex-wrap items-center gap-2">
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

      {/* Main Grid: Video Player with Subtitle Overlay + SRT Editor Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Video Player with Real-time Subtitle Overlay */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <Film className="w-4 h-4 text-purple-400" />
                <span>{isKm ? 'ទស្សនាវីដេអូ & Subtitle ផ្ទាល់' : 'Live Video Subtitle Player'}</span>
              </span>

              {/* Video upload or demo */}
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  accept="video/*"
                  ref={videoInputRef}
                  onChange={handleVideoUpload}
                  className="hidden"
                />
                <button
                  onClick={() => videoInputRef.current?.click()}
                  className="px-2 py-1 rounded-lg bg-slate-800 text-[11px] text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
                >
                  {isKm ? 'ជ្រើសរើសវីដេអូ' : 'Choose Video'}
                </button>
                <button
                  onClick={loadDemoVideo}
                  className="px-2 py-1 rounded-lg bg-indigo-600/20 text-[11px] text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 cursor-pointer"
                >
                  {isKm ? 'វីដេអូគំរូ' : 'Demo Video'}
                </button>
              </div>
            </div>

            {/* Video Viewport Container with Synchronized Subtitle Overlay */}
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center group shadow-inner">
              {videoSrc ? (
                <video
                  ref={videoRef}
                  src={videoSrc}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onClick={toggleVideoPlay}
                  className="w-full h-full object-contain cursor-pointer"
                  playsInline
                />
              ) : (
                <div className="text-center p-6 text-slate-500">
                  <Video className="w-12 h-12 mx-auto text-slate-700 mb-2" />
                  <p className="text-xs">{isKm ? 'សូមបញ្ចូលវីដេអូរបស់អ្នក ឬចុច "វីដេអូគំរូ"' : 'Upload a video file or click "Demo Video" to test subtitles'}</p>
                </div>
              )}

              {/* DYNAMIC SUBTITLE OVERLAY */}
              {activeSubtitle && (
                <div
                  className={`absolute left-0 right-0 px-4 text-center pointer-events-none transition-all duration-150 z-20 ${
                    subPosition === 'top'
                      ? 'top-4'
                      : subPosition === 'center'
                      ? 'top-1/2 -translate-y-1/2'
                      : 'bottom-4'
                  }`}
                >
                  <span
                    style={{
                      fontSize: `${subFontSize}px`,
                      color: subColor,
                    }}
                    className={`inline-block font-semibold px-3 py-1 rounded-lg leading-snug max-w-[90%] transition-all ${
                      subBgStyle === 'cinema'
                        ? 'bg-black/80 shadow-md shadow-black/50 border border-white/10'
                        : subBgStyle === 'pill'
                        ? 'bg-indigo-950/90 text-indigo-100 border border-indigo-500/40'
                        : 'drop-shadow-[0_2px_4px_rgba(0,0,0,1)]'
                    }`}
                  >
                    {activeSubtitle.speaker !== 'narrator' && (
                      <span className="text-xs opacity-75 mr-1 font-normal">
                        [{activeSubtitle.speaker === 'male' ? (isKm ? 'ប្រុស' : 'Male') : (isKm ? 'ស្រី' : 'Female')}]:
                      </span>
                    )}
                    {activeSubtitle.text}
                  </span>
                </div>
              )}

              {/* Play / Pause overlay indicator on hover */}
              {videoSrc && (
                <button
                  onClick={toggleVideoPlay}
                  className="absolute bottom-2 left-2 p-2 rounded-lg bg-black/60 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {isPlayingVideo ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              )}
            </div>

            {/* Video Timeline & Scrubbing */}
            {videoSrc && (
              <div className="space-y-1">
                <input
                  type="range"
                  min={0}
                  max={videoDuration || 100}
                  step={0.1}
                  value={videoCurrentTime}
                  onChange={(e) => {
                    const sec = parseFloat(e.target.value);
                    if (videoRef.current) {
                      videoRef.current.currentTime = sec;
                      setVideoCurrentTime(sec);
                    }
                  }}
                  className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>{secondsToTimestamp(videoCurrentTime)}</span>
                  <span>{secondsToTimestamp(videoDuration)}</span>
                </div>
              </div>
            )}

            {/* Subtitle Customizer Bar */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2 text-xs">
              <span className="font-semibold text-slate-300 block">
                🎨 {isKm ? 'រចនាទម្រង់ Subtitle លើវីដេអូ' : 'Subtitle Display Style'}
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">{isKm ? 'ទំហំអក្សរ' : 'Font Size'}</label>
                  <select
                    value={subFontSize}
                    onChange={(e) => setSubFontSize(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1 text-[11px] text-slate-200"
                  >
                    <option value={15}>Small (15px)</option>
                    <option value={20}>Medium (20px)</option>
                    <option value={26}>Large (26px)</option>
                    <option value={32}>Extra (32px)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">{isKm ? 'ផ្ទៃខាងក្រោយ' : 'Box Style'}</label>
                  <select
                    value={subBgStyle}
                    onChange={(e) => setSubBgStyle(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1 text-[11px] text-slate-200"
                  >
                    <option value="cinema">Cinema Black</option>
                    <option value="pill">Indigo Glow</option>
                    <option value="shadow">Shadow Only</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">{isKm ? 'ទីតាំង' : 'Position'}</label>
                  <select
                    value={subPosition}
                    onChange={(e) => setSubPosition(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1 text-[11px] text-slate-200"
                  >
                    <option value="bottom">Bottom (ក្រោម)</option>
                    <option value="center">Center (កណ្តាល)</option>
                    <option value="top">Top (លើ)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Action: Send to Multi-Speaker TTS dubbing */}
            <button
              onClick={() => onSendToMultiSpeakerTts(srtList)}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-200 text-xs font-bold transition-all cursor-pointer"
            >
              <Volume2 className="w-4 h-4 text-purple-400" />
              <span>{isKm ? 'បង្កើតសំឡេងអានបែងចែកប្រុសស្រី (Dubbing)' : 'Generate Multi-Speaker Voice Dubbing'}</span>
            </button>
          </div>
        </div>

        {/* Right: Subtitle Entries Editor Form with BATCH PROCESSING TOOL */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* ========================================================= */}
          {/* POWERFUL BATCH SELECTION & AUTO-TRANSLATION TOOLBAR */}
          {/* ========================================================= */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3.5">
            {/* Header: Batch Mode Status & Selection Counters */}
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
          {/* Cues List with Interactive Multi-Selection Checkboxes */}
          {/* ========================================================= */}
          <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
            {srtList.map((cue) => {
              const isSelected = selectedIds.has(cue.id);
              const isActiveInVideo = activeSubtitle?.id === cue.id;

              return (
                <div
                  key={cue.id}
                  className={`bg-slate-900 border rounded-xl p-3.5 transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/20 ring-1 ring-indigo-500/40 shadow-sm'
                      : isActiveInVideo
                      ? 'border-amber-500 ring-1 ring-amber-500/50 bg-slate-900/95'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Row Header: Selection Checkbox, Index, Timestamps, Speaker Role, Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
                    <div className="flex items-center space-x-2">
                      {/* BATCH SELECTION CHECKBOX */}
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

                      {/* Jump Video Button */}
                      <button
                        onClick={() => jumpVideoToCue(cue.startTime)}
                        title={isKm ? 'រំកិលវីដេអូទៅពេលនេះ' : 'Jump video to this cue'}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-400 cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Speaker Selector (Male / Female / Narrator) */}
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

                  {/* Subtitle Text Content */}
                  <textarea
                    value={cue.text}
                    onChange={(e) => handleUpdateCue(cue.id, 'text', e.target.value)}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600 resize-none font-medium"
                  />
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
    </div>
  );
};
