import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Upload, 
  FileText, 
  Copy, 
  Check, 
  Sparkles, 
  Laptop, 
  Cloud, 
  SendHorizontal, 
  Loader2, 
  Volume2,
  StopCircle
} from 'lucide-react';
import { SrtItem } from '../types';
import { LocalSpeechRecognition, speakBrowserText, stopSpeaking } from '../utils/khmerSpeech';

interface SpeechToTextStudioProps {
  appLang: 'km' | 'en';
  onTransferToSrt: (items: SrtItem[]) => void;
}

export const SpeechToTextStudio: React.FC<SpeechToTextStudioProps> = ({
  appLang,
  onTransferToSrt,
}) => {
  const isKm = appLang === 'km';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mode: 'local' (Free for low-spec PC) vs 'gemini' (Gemini 3.5 Transcribe)
  const [engineMode, setEngineMode] = useState<'local' | 'gemini'>('local');

  // Local STT state
  const [isLocalListening, setIsLocalListening] = useState<boolean>(false);
  const [localTranscript, setLocalTranscript] = useState<string>('');
  const [localLang, setLocalLang] = useState<string>('km-KH');
  const recognizerRef = useRef<LocalSpeechRecognition | null>(null);

  // Gemini Cloud Audio Upload State
  const [audioBase64, setAudioBase64] = useState<string>('');
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [isGeminiTranscribing, setIsGeminiTranscribing] = useState<boolean>(false);
  const [geminiResultText, setGeminiResultText] = useState<string>('');
  const [geminiSrtEntries, setGeminiSrtEntries] = useState<SrtItem[]>([]);

  const [copied, setCopied] = useState<boolean>(false);

  // Initialize Local Web Speech Recognizer
  useEffect(() => {
    recognizerRef.current = new LocalSpeechRecognition(
      (text, isFinal) => {
        setLocalTranscript((prev) => (isFinal ? prev + ' ' + text : prev + ' ' + text));
      },
      (err) => {
        console.warn('Speech recognition error:', err);
      },
      (status) => {
        setIsLocalListening(status);
      }
    );
    recognizerRef.current.setLanguage(localLang);

    return () => {
      recognizerRef.current?.stop();
    };
  }, [localLang]);

  // Toggle Local Microphone Listening
  const toggleLocalMic = () => {
    if (!recognizerRef.current) return;
    if (isLocalListening) {
      recognizerRef.current.stop();
    } else {
      recognizerRef.current.start();
    }
  };

  // Upload Audio for Gemini Transcribe
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      setAudioBase64(b64);
    };
    reader.readAsDataURL(file);
  };

  // Run Gemini Cloud Transcribe
  const handleGeminiTranscribe = async () => {
    if (!audioBase64) return;
    setIsGeminiTranscribing(true);

    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          mimeType: 'audio/mp3',
          languageHint: isKm ? 'Khmer' : 'English',
        }),
      });

      const data = await res.json();
      if (data && data.fullText) {
        setGeminiResultText(data.fullText);
        if (Array.isArray(data.srtEntries) && data.srtEntries.length > 0) {
          const formatted: SrtItem[] = data.srtEntries.map((item: any, i: number) => ({
            id: `transcribe-srt-${Date.now()}-${i}`,
            index: i + 1,
            startTime: item.startTime || `00:00:0${i * 3},000`,
            endTime: item.endTime || `00:00:0${i * 3 + 3},000`,
            speaker: item.speaker?.includes('ស្រី') ? 'female' : item.speaker?.includes('ប្រុស') ? 'male' : 'narrator',
            speakerLabel: item.speaker || 'Speaker',
            text: item.text,
          }));
          setGeminiSrtEntries(formatted);
        }
      } else {
        alert(data.error || 'Failed to transcribe audio.');
      }
    } catch (e: any) {
      console.error(e);
      alert('Transcription error: ' + e.message);
    } finally {
      setIsGeminiTranscribing(false);
    }
  };

  // Send Transcribed Lines to SRT Editor
  const handleSendToSrtEditor = () => {
    if (geminiSrtEntries.length > 0) {
      onTransferToSrt(geminiSrtEntries);
      return;
    }

    const currentText = engineMode === 'local' ? localTranscript : geminiResultText;
    if (!currentText.trim()) return;

    const sentences = currentText
      .split(/(?<=[.!?។\n])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1);

    let curTime = 1.0;
    const items: SrtItem[] = sentences.map((sent, idx) => {
      const duration = Math.max(2.0, Math.min(6.0, sent.length * 0.08));
      const s = curTime;
      const e = curTime + duration;
      curTime = e + 0.4;

      const fmt = (sec: number) => {
        const m = Math.floor(sec / 60);
        const sc = Math.floor(sec % 60);
        const ms = Math.floor((sec - Math.floor(sec)) * 1000);
        return `00:${String(m).padStart(2, '0')}:${String(sc).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
      };

      return {
        id: `speech-cue-${Date.now()}-${idx}`,
        index: idx + 1,
        startTime: fmt(s),
        endTime: fmt(e),
        speaker: 'narrator',
        speakerLabel: 'អ្នកនិយាយ',
        text: sent,
      };
    });

    onTransferToSrt(items);
  };

  const copyText = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>{isKm ? 'បំលែងសំឡេងជាអក្សរ (Speech-to-Text Studio)' : 'AI Speech-to-Text Studio'}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Dual Engine
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {isKm 
                  ? 'ម៉ាស៊ីន Free Local សម្រាប់កុំព្យូទ័រកម្លាំងខ្សោយ & Gemini AI Transcribe សម្រាប់សម្លេងច្បាស់ល្អ' 
                  : 'Fast zero-latency local dictation for low-spec devices and Gemini 3.5 AI audio transcription'}
              </p>
            </div>
          </div>

          {/* Engine Selector */}
          <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setEngineMode('local')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                engineMode === 'local'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>{isKm ? 'Free Local (កុំព្យូទ័រទាប)' : 'Free Local Engine'}</span>
            </button>
            <button
              onClick={() => setEngineMode('gemini')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                engineMode === 'gemini'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Gemini 3.5 AI</span>
            </button>
          </div>
        </div>

        {/* 1. LOCAL FREE ENGINE */}
        {engineMode === 'local' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-semibold text-slate-400">
                  {isKm ? 'ភាសានិយាយ (Speech Language):' : 'Speech Language:'}
                </span>
                <select
                  value={localLang}
                  onChange={(e) => setLocalLang(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-emerald-300 focus:outline-none"
                >
                  <option value="km-KH">ភាសាខ្មែរ (Khmer km-KH)</option>
                  <option value="en-US">English (US en-US)</option>
                  <option value="th-TH">ภาษาไทย (Thai th-TH)</option>
                  <option value="zh-CN">中文 (Mandarin zh-CN)</option>
                </select>
              </div>

              {/* Record Mic Button */}
              <button
                onClick={toggleLocalMic}
                className={`flex items-center space-x-2 py-2 px-5 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer ${
                  isLocalListening
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                }`}
              >
                {isLocalListening ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>{isKm ? 'កំពុងស្តាប់... (ចុចដើម្បីបញ្ឈប់)' : 'Listening... (Click to stop)'}</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>{isKm ? 'ចុចដើម្បីនិយាយ (Start Dictation)' : 'Start Speaking'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Transcript Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{isKm ? 'អត្ថបទនិយាយផ្ទាល់ (Real-time Transcript)' : 'Real-time Transcript'}</span>
                {localTranscript && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setLocalTranscript('')}
                      className="text-slate-500 hover:text-slate-300"
                    >
                      {isKm ? 'សម្អាត' : 'Clear'}
                    </button>
                    <button
                      onClick={() => copyText(localTranscript)}
                      className="text-slate-400 hover:text-white flex items-center space-x-1"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>

              <div className="w-full min-h-[180px] bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 leading-relaxed font-normal selection:bg-emerald-500">
                {localTranscript || (
                  <span className="text-slate-600 italic">
                    {isLocalListening
                      ? (isKm ? 'កំពុងស្តាប់សំឡេង... សូមនិយាយចូលមីក្រូហ្វូន' : 'Listening... Please speak into microphone')
                      : (isKm ? 'ចុច "ចុចដើម្បីនិយាយ" ដើម្បីចាប់ផ្តើមបម្លែងសំឡេងជាអក្សរដោយមិនអស់ថ្លៃសេវា...' : 'Click "Start Speaking" to begin dictation...')}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. GEMINI CLOUD ENGINE */}
        {engineMode === 'gemini' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
              <input
                type="file"
                accept="audio/*"
                ref={fileInputRef}
                onChange={handleAudioUpload}
                className="hidden"
              />

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isKm ? 'ជ្រើសរើស Audio File (mp3, wav)' : 'Choose Audio File'}</span>
                </button>
                {audioFileName && (
                  <span className="text-xs text-slate-400 truncate max-w-[200px]">{audioFileName}</span>
                )}
              </div>

              <button
                onClick={handleGeminiTranscribe}
                disabled={isGeminiTranscribing || !audioBase64}
                className="flex items-center space-x-2 py-2 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isGeminiTranscribing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isKm ? 'AI កំពុង Transcribe...' : 'AI Transcribing...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>{isKm ? 'Transcribe ជាអក្សរ & SRT' : 'Transcribe to Text & SRT'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Gemini Result Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="text-indigo-400 font-semibold">{isKm ? 'លទ្ធផលអត្ថបទពី Gemini Transcribe' : 'Gemini AI Transcript'}</span>
                {geminiResultText && (
                  <button
                    onClick={() => copyText(geminiResultText)}
                    className="text-slate-400 hover:text-white flex items-center space-x-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              <div className="w-full min-h-[180px] bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 leading-relaxed font-normal selection:bg-indigo-500">
                {geminiResultText || (
                  <span className="text-slate-600 italic">
                    {isKm ? 'សូមបញ្ចូល file សំឡេង រួចចុច "Transcribe ជាអក្សរ & SRT"...' : 'Upload an audio file and click Transcribe to view full text and timestamps...'}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Transfer to Subtitle Studio Button */}
        <div className="pt-2">
          <button
            onClick={handleSendToSrtEditor}
            disabled={!(localTranscript || geminiResultText)}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 border border-emerald-500/40 hover:border-emerald-500 text-emerald-200 hover:text-white text-xs font-bold transition-all shadow-md disabled:opacity-40 cursor-pointer"
          >
            <SendHorizontal className="w-4 h-4 text-emerald-400" />
            <span>
              {isKm 
                ? 'បញ្ជូនអត្ថបទនេះទៅបង្កើតជា Subtitle SRT ភ្លាមៗ (Send to SRT Studio)' 
                : 'Send transcript directly to SRT Subtitle Editor'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
