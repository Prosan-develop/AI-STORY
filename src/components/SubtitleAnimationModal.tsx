import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Download, 
  Copy, 
  Check, 
  Play, 
  Code2, 
  FileCode, 
  Layers, 
  Film,
  Zap,
  Sliders,
  Type
} from 'lucide-react';
import { SubtitleAnimationPreset, SrtItem } from '../types';
import { stringifyAss, generateSubtitleCss } from '../utils/srtParser';

interface SubtitleAnimationModalProps {
  isOpen: boolean;
  onClose: () => void;
  srtList: SrtItem[];
  currentPreset: SubtitleAnimationPreset;
  onSelectPreset: (preset: SubtitleAnimationPreset) => void;
  subFontSize: number;
  subColor: string;
  subPosition: 'bottom' | 'center' | 'top';
  isKm: boolean;
}

export const SubtitleAnimationModal: React.FC<SubtitleAnimationModalProps> = ({
  isOpen,
  onClose,
  srtList,
  currentPreset,
  onSelectPreset,
  subFontSize,
  subColor,
  subPosition,
  isKm,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'css' | 'ass'>('preview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string>(
    isKm ? 'ជំរាបសួរ! នេះជា Subtitle ចលនាបែប Animation' : 'Hello! This is an animated video subtitle preview.'
  );
  const [replayKey, setReplayKey] = useState<number>(0);

  if (!isOpen) return null;

  const presetsList: { id: SubtitleAnimationPreset; nameKm: string; nameEn: string; desc: string; icon: string }[] = [
    {
      id: 'fade-in',
      nameKm: 'Fade-In (កុនធម្មជាតិ)',
      nameEn: 'Cinematic Fade-In',
      desc: isKm ? 'អក្សររសាត់ចេញមកយ៉ាងស្រទន់ សក្តិសមសម្រាប់ភាពយន្ត' : 'Smooth cinematic opacity fade',
      icon: '✨',
    },
    {
      id: 'pop',
      nameKm: 'Pop / Spring (TikTok & Reels)',
      nameEn: 'Viral Pop / Spring',
      desc: isKm ? 'អក្សរលោតរីកធំហើយត្រឡប់មកទំហំដើម ទាក់ទាញខ្លាំង' : 'Punchy dynamic bounce pop for shorts',
      icon: '💥',
    },
    {
      id: 'typewriter',
      nameKm: 'Typewriter (វាយអក្សរ)',
      nameEn: 'Typewriter Reveal',
      desc: isKm ? 'អក្សរបង្ហាញម្តងមួយតួ/មួយពាក្យ ដូចម៉ាស៊ីនអង្គុលីលេខ' : 'Sequential kinetic typewriter text reveal',
      icon: '⌨️',
    },
    {
      id: 'slide-up',
      nameKm: 'Slide-Up (រំកិលឡើងលើ)',
      nameEn: 'Smooth Slide-Up',
      desc: isKm ? 'អក្សររំកិលពីក្រោមឡើងលើដោយរលូន' : 'Smooth upward transition with deceleration',
      icon: '🚀',
    },
    {
      id: 'glow-pulse',
      nameKm: 'Glow / Neon (ភ្លើងណេអុង)',
      nameEn: 'Neon Glow Pulse',
      desc: isKm ? 'អក្សរភ្លឺចែងចាំងពណ៌ស្វាយ-ខៀវ បែប Sci-Fi' : 'Vibrant glowing drop shadow pulse',
      icon: '🌟',
    },
    {
      id: 'none',
      nameKm: 'None (អក្សរធម្មតា)',
      nameEn: 'Static Standard',
      desc: isKm ? 'អក្សរធម្មតាគ្មានចលនា' : 'Standard clean static subtitle display',
      icon: '⏹️',
    },
  ];

  const generatedCss = generateSubtitleCss(currentPreset);
  const generatedAss = stringifyAss(srtList, {
    preset: currentPreset,
    fontSize: subFontSize,
    colorHex: subColor,
    position: subPosition,
  });

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadAss = () => {
    const blob = new Blob([generatedAss], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `animated_subtitles_${currentPreset}.ass`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCss = () => {
    const blob = new Blob([generatedCss], { type: 'text/css;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subtitle_animation_${currentPreset}.css`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getAnimationClass = (preset: SubtitleAnimationPreset) => {
    switch (preset) {
      case 'fade-in': return 'sub-anim-fade-in';
      case 'pop': return 'sub-anim-pop';
      case 'typewriter': return 'sub-anim-typewriter';
      case 'slide-up': return 'sub-anim-slide-up';
      case 'glow-pulse': return 'sub-anim-glow-pulse';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 text-white space-y-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20">
              <Zap className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>{isKm ? 'កំណត់ចលនា Subtitle (Animation Presets & Export)' : 'Subtitle Animation Presets & CSS Generator'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                  CSS & .ASS
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {isKm 
                  ? 'ជ្រើសរើសចលនា Fade-in, Pop, Typewriter សម្រាប់វីដេអូ និងទាញយកកូដ CSS / ឯកសារ .ASS' 
                  : 'Select animated subtitle effects and export CSS keyframes or .ASS files for video editors'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition-all ${
              activeTab === 'preview'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isKm ? '🎬 ជ្រើសរើស & Preview ចលនា' : '🎬 Select & Live Preview'}
          </button>
          <button
            onClick={() => setActiveTab('css')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition-all ${
              activeTab === 'css'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isKm ? '💻 កូដ CSS Overlay' : '💻 CSS Overlay Code'}
          </button>
          <button
            onClick={() => setActiveTab('ass')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition-all ${
              activeTab === 'ass'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isKm ? '📦 ឯកសារ .ASS (Premiere/CapCut)' : '📦 .ASS Subtitle File'}
          </button>
        </div>

        {/* TAB 1: PRESET SELECTION & LIVE PREVIEW */}
        {activeTab === 'preview' && (
          <div className="space-y-5 overflow-y-auto pr-1 flex-1">
            {/* Interactive Live Screen Box */}
            <div className="relative aspect-[21/9] bg-gradient-to-br from-slate-950 via-slate-900 to-black rounded-2xl border-2 border-slate-800 flex flex-col items-center justify-center p-6 overflow-hidden shadow-inner group">
              <span className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                Live Effect: {currentPreset}
              </span>

              {/* Replay trigger button */}
              <button
                onClick={() => setReplayKey((k) => k + 1)}
                className="absolute top-3 right-3 flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold border border-indigo-500/30 cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{isKm ? 'ចាក់ឡើងវិញ (Replay)' : 'Replay'}</span>
              </button>

              {/* The Subtitle Element with active animation */}
              <div key={replayKey} className="text-center max-w-[90%]">
                <span
                  style={{
                    fontSize: `${subFontSize * 1.1}px`,
                    color: subColor,
                  }}
                  className={`inline-block font-bold px-4 py-2 rounded-xl leading-relaxed bg-black/85 border border-white/10 shadow-2xl ${getAnimationClass(
                    currentPreset
                  )}`}
                >
                  {previewText}
                </span>
              </div>
            </div>

            {/* Editable Preview Text Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 flex items-center space-x-1">
                <Type className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isKm ? 'សាកល្បងជាមួយអត្ថបទផ្ទាល់ខ្លួន:' : 'Test with custom text:'}</span>
              </label>
              <input
                type="text"
                value={previewText}
                onChange={(e) => {
                  setPreviewText(e.target.value);
                  setReplayKey((k) => k + 1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Presets Grid */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                {isKm ? 'ជ្រើសរើសប្រភេទចលនា (Select Animation Preset):' : 'Select Animation Preset:'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {presetsList.map((p) => {
                  const isSelected = currentPreset === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        onSelectPreset(p.id);
                        setReplayKey((k) => k + 1);
                      }}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/40 shadow-lg shadow-purple-500/20'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xl">{p.icon}</span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center text-[10px]">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-white">{isKm ? p.nameKm : p.nameEn}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{p.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CSS OVERLAY CODE */}
        {activeTab === 'css' && (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{isKm ? 'កូដ CSS សម្រាប់បញ្ចូលក្នុង OBS, Web Player ឬ Video Tool' : 'CSS code for web players, OBS Studio, and video engines'}</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleCopy(generatedCss, 'css')}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer"
                >
                  {copiedKey === 'css' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'css' ? (isKm ? 'បានចម្លង!' : 'Copied!') : (isKm ? 'ចម្លង CSS' : 'Copy CSS')}</span>
                </button>
                <button
                  onClick={handleDownloadCss}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isKm ? 'ទាញយក .css' : 'Download .css'}</span>
                </button>
              </div>
            </div>

            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] font-mono text-indigo-200 overflow-x-auto leading-relaxed max-h-[340px]">
              {generatedCss}
            </pre>
          </div>
        )}

        {/* TAB 3: ASS SUBTITLE EXPORT */}
        {activeTab === 'ass' && (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{isKm ? 'ឯកសារ .ASS ជាមួយ Animation Tags សម្រាប់ Premiere Pro, CapCut, DaVinci Resolve, និង FFmpeg' : 'Advanced SubStation Alpha (.ass) format with built-in animation tags'}</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleCopy(generatedAss, 'ass')}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer"
                >
                  {copiedKey === 'ass' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'ass' ? (isKm ? 'បានចម្លង!' : 'Copied!') : (isKm ? 'ចម្លង' : 'Copy')}</span>
                </button>
                <button
                  onClick={handleDownloadAss}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isKm ? 'ទាញយក .ass' : 'Download .ass'}</span>
                </button>
              </div>
            </div>

            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed max-h-[340px]">
              {generatedAss.slice(0, 3000)}
              {generatedAss.length > 3000 ? '\n... (more dialogue cues truncated in preview)' : ''}
            </pre>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
          <span className="text-slate-400">
            {isKm ? 'Preset បច្ចុប្បន្ន:' : 'Active preset:'} <strong className="text-purple-300 capitalize">{currentPreset}</strong>
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            {isKm ? 'រួចរាល់' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
