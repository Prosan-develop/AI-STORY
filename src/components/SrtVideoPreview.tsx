import React, { useRef } from 'react';
import { 
  Film, 
  Video, 
  Play, 
  Pause, 
  Upload, 
  Sparkles, 
  Minimize2, 
  Maximize2, 
  Eye, 
  Sliders, 
  Palette,
  X,
  Zap
} from 'lucide-react';
import { SrtItem, SubtitleAnimationPreset } from '../types';
import { secondsToTimestamp } from '../utils/srtParser';

interface SrtVideoPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoSrc: string;
  setVideoSrc: (src: string) => void;
  videoCurrentTime: number;
  setVideoCurrentTime: (time: number) => void;
  videoDuration: number;
  isPlayingVideo: boolean;
  toggleVideoPlay: () => void;
  activeSubtitle?: SrtItem;
  focusedCue?: SrtItem | null;
  subFontSize: number;
  setSubFontSize: (size: number) => void;
  subColor: string;
  setSubColor: (col: string) => void;
  subBgStyle: 'cinema' | 'pill' | 'shadow';
  setSubBgStyle: (style: 'cinema' | 'pill' | 'shadow') => void;
  subPosition: 'bottom' | 'center' | 'top';
  setSubPosition: (pos: 'bottom' | 'center' | 'top') => void;
  animationPreset?: SubtitleAnimationPreset;
  setAnimationPreset?: (preset: SubtitleAnimationPreset) => void;
  onOpenAnimationModal?: () => void;
  isKm: boolean;
  isMini?: boolean;
  onToggleMini?: () => void;
  onCloseMini?: () => void;
}

export const SrtVideoPreview: React.FC<SrtVideoPreviewProps> = ({
  videoRef,
  videoSrc,
  setVideoSrc,
  videoCurrentTime,
  setVideoCurrentTime,
  videoDuration,
  isPlayingVideo,
  toggleVideoPlay,
  activeSubtitle,
  focusedCue,
  subFontSize,
  setSubFontSize,
  subColor,
  setSubColor,
  subBgStyle,
  setSubBgStyle,
  subPosition,
  setSubPosition,
  animationPreset = 'fade-in',
  setAnimationPreset,
  onOpenAnimationModal,
  isKm,
  isMini = false,
  onToggleMini,
  onCloseMini,
}) => {
  const videoInputRef = useRef<HTMLInputElement>(null);

  // If user is focused on a specific cue, prioritize displaying that cue in real-time
  const displayedSubtitle = focusedCue || activeSubtitle;

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  const loadDemoVideo = () => {
    setVideoSrc('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
  };

  const getAnimClass = () => {
    switch (animationPreset) {
      case 'fade-in': return 'sub-anim-fade-in';
      case 'pop': return 'sub-anim-pop';
      case 'typewriter': return 'sub-anim-typewriter';
      case 'slide-up': return 'sub-anim-slide-up';
      case 'glow-pulse': return 'sub-anim-glow-pulse';
      default: return '';
    }
  };

  // Mini Floating Picture-in-Picture layout
  if (isMini) {
    return (
      <div className="fixed bottom-6 right-6 z-40 w-80 sm:w-96 bg-slate-900/95 border-2 border-indigo-500/70 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
        {/* Mini Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-950/80 border-b border-slate-800 text-xs">
          <div className="flex items-center space-x-1.5 text-indigo-300 font-bold">
            <Film className="w-3.5 h-3.5" />
            <span>{isKm ? 'វីដេអូ Preview (ផ្ទាល់)' : 'Real-time Video Preview'}</span>
          </div>

          <div className="flex items-center space-x-1">
            {onOpenAnimationModal && (
              <button
                onClick={onOpenAnimationModal}
                className="p-1 rounded-md text-amber-400 hover:bg-slate-800"
                title={isKm ? 'ចលនា & កូដ CSS' : 'Animations & CSS'}
              >
                <Zap className="w-3.5 h-3.5" />
              </button>
            )}
            {onToggleMini && (
              <button
                onClick={onToggleMini}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
                title={isKm ? 'ពង្រីក' : 'Expand'}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
            {onCloseMini && (
              <button
                onClick={onCloseMini}
                className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                title={isKm ? 'បិទ Mini Player' : 'Close Mini Preview'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Mini Video Viewport with Live Subtitle Overlay */}
        <div className="relative aspect-video bg-black flex items-center justify-center group overflow-hidden">
          {videoSrc ? (
            <video
              ref={videoRef}
              src={videoSrc}
              onClick={toggleVideoPlay}
              className="w-full h-full object-contain cursor-pointer"
              playsInline
            />
          ) : (
            <div className="text-center p-3 text-slate-500 space-y-1">
              <p className="text-[11px]">{isKm ? 'មិនទាន់មានវីដេអូ' : 'No video selected'}</p>
              <button
                onClick={loadDemoVideo}
                className="px-2 py-0.5 rounded bg-indigo-600/30 text-[10px] text-indigo-300 font-semibold"
              >
                {isKm ? 'បើកវីដេអូគំរូ' : 'Load Demo'}
              </button>
            </div>
          )}

          {/* REAL-TIME ANIMATED SUBTITLE OVERLAY */}
          {displayedSubtitle && (
            <div
              className={`absolute left-0 right-0 px-2 text-center pointer-events-none transition-all duration-150 z-20 ${
                subPosition === 'top'
                  ? 'top-2'
                  : subPosition === 'center'
                  ? 'top-1/2 -translate-y-1/2'
                  : 'bottom-2'
              }`}
            >
              <span
                key={displayedSubtitle.id + (focusedCue ? '-edit' : '')}
                style={{
                  fontSize: `${Math.max(12, subFontSize * 0.75)}px`,
                  color: subColor,
                }}
                className={`inline-block font-semibold px-2 py-0.5 rounded leading-tight max-w-[95%] transition-all ${
                  subBgStyle === 'cinema'
                    ? 'bg-black/85 shadow-md border border-white/10'
                    : subBgStyle === 'pill'
                    ? 'bg-indigo-950/90 text-indigo-100 border border-indigo-500/40'
                    : 'drop-shadow-[0_2px_4px_rgba(0,0,0,1)]'
                } ${getAnimClass()}`}
              >
                {displayedSubtitle.speaker !== 'narrator' && (
                  <span className="text-[10px] opacity-75 mr-1 font-normal">
                    [{displayedSubtitle.speaker === 'male' ? (isKm ? 'ប្រុស' : 'Male') : (isKm ? 'ស្រី' : 'Female')}]:
                  </span>
                )}
                {displayedSubtitle.text}
              </span>
            </div>
          )}

          {/* Play/Pause icon button on hover */}
          {videoSrc && (
            <button
              onClick={toggleVideoPlay}
              className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm cursor-pointer"
            >
              {isPlayingVideo ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5 fill-current" />}
            </button>
          )}
        </div>

        {/* Mini Progress Scrub Bar */}
        <div className="px-3 py-2 bg-slate-950/90 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleVideoPlay}
              className="text-indigo-400 hover:text-white"
            >
              {isPlayingVideo ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            </button>
            <span className="font-mono text-[10px]">
              {secondsToTimestamp(videoCurrentTime)}
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 capitalize">
              {animationPreset}
            </span>
            {displayedSubtitle && (
              <span className="text-[10px] text-emerald-400 font-semibold truncate max-w-[120px]">
                {focusedCue ? `Preview: #${displayedSubtitle.index}` : `Live: #${displayedSubtitle.index}`}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Standard Docked Sidebar Video Preview layout
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
      {/* Viewport Top Header */}
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

      {/* Main Video Viewport Container with Synchronized Subtitle Overlay */}
      <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center group shadow-inner">
        {videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            onClick={toggleVideoPlay}
            className="w-full h-full object-contain cursor-pointer"
            playsInline
          />
        ) : (
          <div className="text-center p-6 text-slate-500 space-y-2">
            <Video className="w-12 h-12 mx-auto text-slate-700" />
            <p className="text-xs">{isKm ? 'សូមបញ្ចូលវីដេអូរបស់អ្នក ឬចុច "វីដេអូគំរូ"' : 'Upload a video file or click "Demo Video" to test subtitles'}</p>
            <button
              onClick={loadDemoVideo}
              className="px-3 py-1 rounded-lg bg-indigo-600 text-xs font-semibold text-white shadow-md cursor-pointer"
            >
              {isKm ? 'ផ្ទុកវីដេអូគំរូភ្លាមៗ' : 'Load Demo Video'}
            </button>
          </div>
        )}

        {/* DYNAMIC REAL-TIME ANIMATED SUBTITLE OVERLAY */}
        {displayedSubtitle && (
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
              key={displayedSubtitle.id + (focusedCue ? '-edit' : '')}
              style={{
                fontSize: `${subFontSize}px`,
                color: subColor,
              }}
              className={`inline-block font-semibold px-4 py-1.5 rounded-lg leading-snug max-w-[90%] transition-all ${
                subBgStyle === 'cinema'
                  ? 'bg-black/85 shadow-md shadow-black/50 border border-white/10'
                  : subBgStyle === 'pill'
                  ? 'bg-indigo-950/90 text-indigo-100 border border-indigo-500/40'
                  : 'drop-shadow-[0_2px_4px_rgba(0,0,0,1)]'
              } ${getAnimClass()}`}
            >
              {displayedSubtitle.speaker !== 'narrator' && (
                <span className="text-xs opacity-75 mr-1 font-normal">
                  [{displayedSubtitle.speaker === 'male' ? (isKm ? 'ប្រុស' : 'Male') : (isKm ? 'ស្រី' : 'Female')}]:
                </span>
              )}
              {displayedSubtitle.text}
            </span>
          </div>
        )}

        {/* Play / Pause overlay indicator on hover */}
        {videoSrc && (
          <button
            onClick={toggleVideoPlay}
            className="absolute bottom-2 left-2 p-2 rounded-lg bg-black/60 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            {isPlayingVideo ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        )}

        {/* Live Cue Focus Indicator Pill */}
        {focusedCue && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-500/80 text-white text-[10px] font-bold shadow-md backdrop-blur-sm flex items-center space-x-1 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            <span>{isKm ? `កំពុងកែជួរ #${focusedCue.index}` : `Live editing #${focusedCue.index}`}</span>
          </div>
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
      <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-300 flex items-center space-x-1">
            <Palette className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isKm ? 'រចនាទម្រង់ Subtitle លើវីដេអូ' : 'Subtitle Display Style'}</span>
          </span>

          <div className="flex items-center space-x-2">
            {onOpenAnimationModal && (
              <button
                onClick={onOpenAnimationModal}
                className="text-[11px] text-amber-300 hover:text-amber-200 font-semibold flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 cursor-pointer shadow-sm"
              >
                <Zap className="w-3 h-3" />
                <span>{isKm ? 'ចលនា & កូដ CSS' : 'CSS Effects'}</span>
              </button>
            )}

            {onToggleMini && (
              <button
                onClick={onToggleMini}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer"
              >
                <Minimize2 className="w-3 h-3" />
                <span>{isKm ? 'ផ្ទាំងតូច (PiP)' : 'Mini Player'}</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Customizer Dropdowns: Font Size, Box Style, Position, and Animation Preset */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* 1. Animation Preset Selector */}
          <div>
            <label className="text-[10px] text-amber-400 font-bold block mb-1">
              ✨ {isKm ? 'ចលនា (Animation)' : 'Animation'}
            </label>
            <select
              value={animationPreset}
              onChange={(e) => setAnimationPreset?.(e.target.value as SubtitleAnimationPreset)}
              className="w-full bg-slate-900 border border-amber-500/40 rounded-lg p-1 text-[11px] text-amber-200 font-semibold focus:outline-none"
            >
              <option value="fade-in">Fade-In (កុន)</option>
              <option value="pop">Pop (TikTok/Reels)</option>
              <option value="typewriter">Typewriter (វាយអក្សរ)</option>
              <option value="slide-up">Slide-Up (រំកិល)</option>
              <option value="glow-pulse">Glow (ភ្លើងណេអុង)</option>
              <option value="none">None (ធម្មតា)</option>
            </select>
          </div>

          {/* 2. Font Size */}
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

          {/* 3. Box Style */}
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

          {/* 4. Position */}
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
    </div>
  );
};
