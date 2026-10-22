import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Sliders, 
  Play, 
  Pause, 
  Download, 
  Sparkles, 
  RotateCcw, 
  Radio, 
  User, 
  Zap, 
  Volume2, 
  AudioWaveform, 
  Activity,
  Headphones,
  Loader2
} from 'lucide-react';
import { applyVoiceEffects, audioBufferToWav } from '../utils/audioProcessor';

interface VoiceChangerProps {
  appLang: 'km' | 'en';
}

interface Preset {
  id: string;
  nameKm: string;
  nameEn: string;
  descKm: string;
  pitchFactor: number;
  playbackSpeed: number;
  icon: string;
  badge: string;
}

const PRESETS: Preset[] = [
  {
    id: 'deep-narrator',
    nameKm: 'សម្រាយរឿងប្រុស (Deep Narrator)',
    nameEn: 'Deep Movie Narrator',
    descKm: 'សំឡេងបុរសគ្រលរ ធ្ងន់ អំណាច បែបភាពយន្តហូលីវូដ',
    pitchFactor: 0.82,
    playbackSpeed: 1.0,
    icon: '🎙️',
    badge: 'Popular',
  },
  {
    id: 'female-anime',
    nameKm: 'តួស្រីស្រទន់ (Female Storyteller)',
    nameEn: 'Female Storyteller',
    descKm: 'សំឡេងស្រី ស្រាល ស្រទន់ ពិរោះរណ្តំ',
    pitchFactor: 1.28,
    playbackSpeed: 1.0,
    icon: '✨',
    badge: 'HD Clarity',
  },
  {
    id: 'robot',
    nameKm: 'មនុស្សយន្ត AI (Cyber Robot)',
    nameEn: 'Cyber Robot',
    descKm: 'សំឡេងម៉ាស៊ីនមនុស្សយន្ត បែបបច្ចេកវិទ្យាអនាគត',
    pitchFactor: 0.95,
    playbackSpeed: 1.0,
    icon: '🤖',
    badge: 'Sci-Fi',
  },
  {
    id: 'radio',
    nameKm: 'វិទ្យុទាក់ទង (Walkie-Talkie)',
    nameEn: 'Radio / Walkie-Talkie',
    descKm: 'សំឡេងបែបប៉ូលិស វិទ្យុទាក់ទង និងកងទ័ព',
    pitchFactor: 1.05,
    playbackSpeed: 1.0,
    icon: '📻',
    badge: 'Lo-Fi',
  },
  {
    id: 'cave-echo',
    nameKm: 'គុហាអេកូ (Cave Reverb)',
    nameEn: 'Cave Echo Reverb',
    descKm: 'សំឡេងបន្លឺបន្ទរក្នុងល្អាងភ្នំ ឬរោងកុនធំ',
    pitchFactor: 1.0,
    playbackSpeed: 1.0,
    icon: '🏔️',
    badge: 'Echo',
  },
  {
    id: 'giant-monster',
    nameKm: 'បិសាចយក្ស (Giant Monster)',
    nameEn: 'Giant Monster',
    descKm: 'សំឡេងយក្សរង្គោះរង្គើ គ្រហឹមគួរឱ្យភ័យខ្លាច',
    pitchFactor: 0.68,
    playbackSpeed: 0.92,
    icon: '👹',
    badge: 'Horror',
  },
];

export const VoiceChanger: React.FC<VoiceChangerProps> = ({ appLang }) => {
  const isKm = appLang === 'km';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [selectedPreset, setSelectedPreset] = useState<string>('deep-narrator');
  const [pitchFactor, setPitchFactor] = useState<number>(0.82);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Recording
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

  // Live Mic Monitor
  const [isMonitoringLive, setIsMonitoringLive] = useState<boolean>(false);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const liveCtxRef = useRef<AudioContext | null>(null);

  // Audio Playback
  const [originalBuffer, setOriginalBuffer] = useState<AudioBuffer | null>(null);
  const [processedBuffer, setProcessedBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Load preset defaults
  const handleSelectPreset = (preset: Preset) => {
    setSelectedPreset(preset.id);
    setPitchFactor(preset.pitchFactor);
    setPlaybackSpeed(preset.playbackSpeed);
  };

  // Process effects whenever buffer or controls change
  useEffect(() => {
    if (!originalBuffer) return;
    setIsProcessing(true);
    applyVoiceEffects(originalBuffer, selectedPreset, pitchFactor, playbackSpeed)
      .then((res) => {
        setProcessedBuffer(res);
        setIsProcessing(false);
      })
      .catch((e) => {
        console.error(e);
        setIsProcessing(false);
      });
  }, [originalBuffer, selectedPreset, pitchFactor, playbackSpeed]);

  // Start Mic Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const arrayBuf = await blob.arrayBuffer();
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const decoded = await ctx.decodeAudioData(arrayBuf);
        setOriginalBuffer(decoded);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      alert('Microphone access denied: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordTimerRef.current);
    }
  };

  // Upload file
  const handleUploadAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuf = await file.arrayBuffer();
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const decoded = await ctx.decodeAudioData(arrayBuf);
      setOriginalBuffer(decoded);
    } catch (err) {
      alert('Failed to load audio file.');
    }
  };

  // Play / Pause
  const togglePlay = () => {
    if (!processedBuffer && !originalBuffer) {
      // Create a short speech synth sample
      return;
    }

    if (isPlaying) {
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
        } catch (e) {}
      }
      setIsPlaying(false);
    } else {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const source = ctx.createBufferSource();
      source.buffer = processedBuffer || originalBuffer;
      source.connect(ctx.destination);
      source.start(0);
      sourceNodeRef.current = source;
      setIsPlaying(true);
      source.onended = () => setIsPlaying(false);
    }
  };

  // Export Modified Audio
  const handleExportWav = () => {
    const buf = processedBuffer || originalBuffer;
    if (!buf) return;
    const blob = audioBufferToWav(buf);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice_modulated_${selectedPreset}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>{isKm ? 'ស្ទូឌីយោកែសម្រួល & ដូរសំឡេង (Voice Changer Studio)' : 'AI Voice Changer & Modulation'}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  DSP Pitch & Formant
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {isKm 
                  ? 'បំប្លែងសំឡេងរបស់អ្នកទៅជាសំឡេងសម្រាយរឿងប្រុស សំឡេងតួស្រី មនុស្សយន្ត ឬសំឡេងវិទ្យុ' 
                  : 'Transform your voice into deep male narrator, anime character, robotic cyborg, or radio dispatch'}
              </p>
            </div>
          </div>

          {/* Record / Upload Buttons */}
          <div className="flex items-center space-x-2">
            <input
              type="file"
              accept="audio/*"
              ref={fileInputRef}
              onChange={handleUploadAudio}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              {isKm ? 'បញ្ចូលសំឡេង' : 'Upload Audio'}
            </button>

            {isRecording ? (
              <button
                onClick={stopRecording}
                className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-600/30 animate-pulse cursor-pointer"
              >
                <MicOff className="w-4 h-4" />
                <span>{isKm ? `បញ្ឈប់ថត (${recordingSeconds}s)` : `Stop (${recordingSeconds}s)`}</span>
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                <span>{isKm ? 'ថតសំឡេងផ្ទាល់' : 'Record Mic'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Preset Cards Grid */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-300 block">
            {isKm ? 'ជ្រើសរើសទម្រង់សម្លេង (Select Voice Preset):' : 'Select Voice Preset:'}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PRESETS.map((p) => {
              const isSelected = selectedPreset === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectPreset(p)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/40 shadow-md'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-2xl">{p.icon}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {p.badge}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white">{isKm ? p.nameKm : p.nameEn}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{p.descKm}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fine Tuning Controls */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
          <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
            <Sliders className="w-4 h-4 text-purple-400" />
            <span>{isKm ? 'កែសម្រួលលម្អិត (Fine Tuning Pitch & Speed)' : 'Fine Tuning'}</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Pitch Factor */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">{isKm ? 'កម្រិតសំនៀង (Pitch Shift)' : 'Pitch Shift'}</span>
                <span className="font-mono text-purple-400 font-bold">{pitchFactor.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={1.6}
                step={0.02}
                value={pitchFactor}
                onChange={(e) => setPitchFactor(parseFloat(e.target.value))}
                className="w-full accent-purple-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>គ្រលរ / ធ្ងន់ (0.5x Deep)</span>
                <span>ធម្មតា (1.0x)</span>
                <span>ស្រួច / ខ្ពស់ (1.6x High)</span>
              </div>
            </div>

            {/* Playback Speed */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">{isKm ? 'ល្បឿននិយាយ (Speed)' : 'Playback Speed'}</span>
                <span className="font-mono text-indigo-400 font-bold">{playbackSpeed.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.7}
                max={1.5}
                step={0.05}
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="w-full accent-indigo-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>យឺត (0.7x Slow)</span>
                <span>ធម្មតា (1.0x)</span>
                <span>លឿន (1.5x Fast)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Audio Player and Export */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex items-center space-x-3">
            <button
              onClick={togglePlay}
              disabled={!originalBuffer && !processedBuffer}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 transition-all disabled:opacity-40 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? (isKm ? 'ផ្អាកស្តាប់' : 'Pause') : (isKm ? 'ស្តាប់សំឡេងកែប្រែ' : 'Preview Modulated Voice')}</span>
            </button>

            {isProcessing && (
              <span className="flex items-center space-x-1.5 text-xs text-purple-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{isKm ? 'កំពុង Render សំឡេង...' : 'Processing audio...'}</span>
              </span>
            )}
          </div>

          <button
            onClick={handleExportWav}
            disabled={!originalBuffer && !processedBuffer}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>{isKm ? 'ទាញយក WAV' : 'Download WAV'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
