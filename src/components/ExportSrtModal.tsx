import React, { useState, useMemo } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  FileText, 
  CheckCircle2, 
  Layers, 
  Sparkles, 
  ShieldCheck, 
  Sliders, 
  Code2,
  HardDriveDownload,
  Clock,
  Hash
} from 'lucide-react';
import { SrtItem, SrtExportOptions } from '../types';
import { stringifySrt, downloadSrtFile, timestampToSeconds, secondsToTimestamp } from '../utils/srtParser';

interface ExportSrtModalProps {
  isOpen: boolean;
  onClose: () => void;
  srtList: SrtItem[];
  selectedIds?: Set<string>;
  isKm: boolean;
  onSuccessNotification?: (message: string) => void;
}

export const ExportSrtModal: React.FC<ExportSrtModalProps> = ({
  isOpen,
  onClose,
  srtList,
  selectedIds,
  isKm,
  onSuccessNotification,
}) => {
  const [includeSpeakerTags, setIncludeSpeakerTags] = useState<boolean>(false);
  const [speakerFormat, setSpeakerFormat] = useState<'brackets' | 'colon'>('brackets');
  const [exportScope, setExportScope] = useState<'all' | 'selected'>('all');
  const [customFilename, setCustomFilename] = useState<string>('khs_subtitles');
  const [copied, setCopied] = useState<boolean>(false);
  const [justDownloaded, setJustDownloaded] = useState<boolean>(false);

  // Selected items vs all items
  const selectedCues = useMemo(() => {
    if (!selectedIds || selectedIds.size === 0) return [];
    return srtList.filter((cue) => selectedIds.has(cue.id));
  }, [srtList, selectedIds]);

  const targetCues = useMemo(() => {
    if (exportScope === 'selected' && selectedCues.length > 0) {
      return selectedCues;
    }
    return srtList;
  }, [exportScope, selectedCues, srtList]);

  // Formatted preview text
  const exportOptions: SrtExportOptions = useMemo(() => ({
    includeSpeakerTags,
    speakerPrefixFormat: speakerFormat,
    filename: customFilename,
    addUtf8Bom: true,
    cleanWhitespace: true,
    reindexSequentially: true,
  }), [includeSpeakerTags, speakerFormat, customFilename]);

  const formattedSrtContent = useMemo(() => {
    return stringifySrt(targetCues, exportOptions);
  }, [targetCues, exportOptions]);

  // Summary statistics
  const stats = useMemo(() => {
    const cueCount = targetCues.length;
    let totalChars = 0;
    let totalWords = 0;
    let maxEndSec = 0;

    targetCues.forEach((c) => {
      const text = c.text || '';
      totalChars += text.length;
      totalWords += text.trim().split(/\s+/).filter(Boolean).length;
      const endSec = timestampToSeconds(c.endTime);
      if (endSec > maxEndSec) maxEndSec = endSec;
    });

    const byteLength = new Blob(['\uFEFF' + formattedSrtContent]).size;

    return {
      cueCount,
      totalChars,
      totalWords,
      duration: secondsToTimestamp(maxEndSec).split(',')[0],
      fileSizeKb: (byteLength / 1024).toFixed(1),
    };
  }, [targetCues, formattedSrtContent]);

  if (!isOpen) return null;

  // Perform Direct Download to Device
  const handleDownload = () => {
    if (targetCues.length === 0) {
      alert(isKm ? 'សូមបញ្ចូល ឬបង្កើត Subtitle ជាមុនសិន!' : 'No subtitles to export. Please add or create subtitles first.');
      return;
    }

    const result = downloadSrtFile(targetCues, {
      ...exportOptions,
      filename: customFilename.trim() || 'khs_subtitles',
    });

    if (result.success) {
      setJustDownloaded(true);
      const successMsg = isKm
        ? `បានទាញយកឯកសារ "${result.filename}" (${result.cueCount} ជួរ) ទៅកាន់ Device របស់អ្នកដោយជោគជ័យ!`
        : `Successfully exported "${result.filename}" (${result.cueCount} cues) directly to your device!`;
      
      if (onSuccessNotification) {
        onSuccessNotification(successMsg);
      }

      setTimeout(() => {
        setJustDownloaded(false);
      }, 3500);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedSrtContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl shadow-emerald-500/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
              <HardDriveDownload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white flex items-center space-x-2">
                <span>{isKm ? 'ទាញយកឯកសារ Subtitle (.SRT) ទៅកាន់ Device' : 'Export Formatted .SRT to Device'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold font-mono">
                  SubRip Standard
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isKm 
                  ? 'ទាញយកឯកសារ .SRT ដែលបានកែសម្រួលរួចរាល់ ជាមួយទម្រង់ត្រឹមត្រូវ និង UTF-8 BOM សម្រាប់ទូរស័ព្ទ និងកុំព្យូទ័រ' 
                  : 'Export all edited subtitle lines as a strictly formatted .srt file with UTF-8 BOM encoding'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                <Hash className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isKm ? 'ចំនួនជួរ Subtitle' : 'Total Cues'}</span>
              </span>
              <p className="text-lg font-bold text-slate-100 mt-0.5 font-mono">
                {stats.cueCount} <span className="text-xs font-normal text-slate-500">{isKm ? 'ជួរ' : 'cues'}</span>
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isKm ? 'រយៈពេលសរុប' : 'Total Duration'}</span>
              </span>
              <p className="text-lg font-bold text-slate-100 mt-0.5 font-mono">
                {stats.duration}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>{isKm ? 'ទំហំឯកសារ' : 'File Size'}</span>
              </span>
              <p className="text-lg font-bold text-slate-100 mt-0.5 font-mono">
                ~{stats.fileSizeKb} <span className="text-xs font-normal text-slate-500">KB</span>
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isKm ? 'ការបំលែងតួអក្សរ' : 'Encoding'}</span>
              </span>
              <p className="text-xs font-bold text-indigo-300 mt-1 font-mono">
                UTF-8 + BOM
              </p>
            </div>
          </div>

          {/* Options Configuration */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 flex items-center space-x-2">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isKm ? 'ការកំណត់សម្រាប់ការទាញយក (Export Settings)' : 'Export Configuration'}</span>
            </h4>

            {/* Filename Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>{isKm ? 'ឈ្មោះឯកសារ (Filename):' : 'Filename:'}</span>
                <span className="text-[11px] text-slate-500 font-mono">.srt</span>
              </label>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={customFilename}
                    onChange={(e) => setCustomFilename(e.target.value.replace(/\.srt$/i, ''))}
                    placeholder="khs_subtitles"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">.srt</span>
                </div>
                {/* Filename Presets */}
                <div className="hidden sm:flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => setCustomFilename(`khs_story_${Date.now().toString().slice(-4)}`)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 transition-colors cursor-pointer"
                  >
                    {isKm ? 'ឈ្មោះរឿង' : 'Story'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomFilename(`subtitles_${new Date().toISOString().slice(0, 10)}`)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 transition-colors cursor-pointer"
                  >
                    {isKm ? 'កាលបរិច្ឆេទ' : 'Today'}
                  </button>
                </div>
              </div>
            </div>

            {/* Export Scope (All vs Selected) */}
            {selectedCues.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  {isKm ? 'ជ្រើសរើសជួរដែលត្រូវទាញយក (Scope):' : 'Export Scope:'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportScope('all')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      exportScope === 'all'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>{isKm ? 'ទាំងអស់ (All Edited)' : 'All Edited Items'}</span>
                      <span className="font-mono text-[10px]">{srtList.length} cues</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {isKm ? 'ទាញយក Subtitle គ្រប់ជួរទាំងអស់' : 'Export every cue in timeline'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportScope('selected')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      exportScope === 'selected'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>{isKm ? 'តែជួរដែលបានជ្រើស' : 'Selected Cues Only'}</span>
                      <span className="font-mono text-[10px]">{selectedCues.length} cues</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {isKm ? `ទាញយកតែ ${selectedCues.length} ជួរដែលបានធីក` : `Export only the ${selectedCues.length} selected items`}
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Speaker Tag Toggle */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                {isKm ? 'ទម្រង់អត្ថបទ និងស្លាកតួអង្គ (Speaker Tags):' : 'Speaker Tag Format:'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIncludeSpeakerTags(false)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    !includeSpeakerTags
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>{isKm ? 'ស្អាតគ្មានស្លាក (Standard Clean)' : 'Clean Text (Standard)'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {isKm ? 'សក្តិសមសម្រាប់ YouTube, Premiere, CapCut, VLC និងវីដេអូទូទៅ' : 'Best for Premiere, CapCut, YouTube, VLC and video players'}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setIncludeSpeakerTags(true)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    includeSpeakerTags
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                    <span>{isKm ? 'មានស្លាក [ប្រុស] / [ស្រី] (Dubbing)' : 'Include Speaker Tags'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {isKm ? 'រក្សាស្លាកសម្គាល់តួអង្គ សម្រាប់អ្នកបញ្ចូលសំឡេងអាន' : 'Includes [ប្រុស], [ស្រី], [អ្នករៀបរាប់] for voice actors'}
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* Formatted .SRT Code Live Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center space-x-1.5">
                <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isKm ? 'មើលទម្រង់ឯកសារ .SRT ផ្ទាល់ (File Preview):' : 'Formatted .SRT File Preview:'}</span>
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center space-x-1 text-slate-400 hover:text-emerald-300 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[11px]">{copied ? (isKm ? 'បានចម្លង!' : 'Copied!') : (isKm ? 'ចម្លងអត្ថបទ' : 'Copy SRT')}</span>
              </button>
            </div>

            <div className="relative rounded-2xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-slate-300 max-h-48 overflow-y-auto whitespace-pre leading-relaxed select-all">
              {formattedSrtContent || (isKm ? '# គ្មានទិន្នន័យ Subtitle' : '# No subtitles to display')}
            </div>
          </div>

          {justDownloaded && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-2 text-emerald-300 text-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>
                {isKm 
                  ? `ឯកសារ "${customFilename}.srt" ត្រូវបានទាញយកទៅកាន់ Device របស់អ្នករួចរាល់ហើយ!` 
                  : `"${customFilename}.srt" has been downloaded to your device!`}
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer with Direct Download Button */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400 hidden sm:block">
            {isKm ? 'ឯកសារត្រូវរក្សាទុកជាទម្រង់ .srt ស្តង់ដារ (SubRip)' : 'Saved as standard SubRip .srt format'}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              {isKm ? 'បិទ' : 'Close'}
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? (isKm ? 'បានចម្លង!' : 'Copied!') : (isKm ? 'ចម្លងអត្ថបទ' : 'Copy')}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>
                {isKm ? 'ទាញយក .SRT ទៅក្នុង Device' : 'Download .SRT to Device'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
