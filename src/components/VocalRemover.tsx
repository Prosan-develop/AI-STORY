import React, { useState, useRef, useEffect } from 'react';
import { 
  Sliders, 
  Upload, 
  Download, 
  Play, 
  Pause, 
  RotateCcw, 
  Music, 
  Mic, 
  MicOff, 
  Sparkles, 
  Volume2, 
  Activity,
  Layers,
  Radio,
  Loader2
} from 'lucide-react';
import { processVocalSeparation, audioBufferToWav } from '../utils/audioProcessor';

interface VocalRemoverProps {
  appLang: 'km' | 'en';
}

export const VocalRemover: React.FC<VocalRemoverProps> = ({ appLang }) => {
  const isKm = appLang === 'km';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Audio Context & State
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('song_sample.mp3');
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sliders:
  // balance: -1.0 = Pure Instrumental (Karaoke), 0.0 = Original, +1.0 = Pure Vocals (Acappella)
  const [balance, setBalance] = useState<number>(-0.8);
  const [bassPreserve, setBassPreserve] = useState<number>(0.65);

  // Audio nodes for live playback
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseOffsetRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Processed buffer cache
  const processedBufferRef = useRef<AudioBuffer | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // Update processed buffer whenever balance or bassPreserve changes
  useEffect(() => {
    if (!audioBuffer) return;
    let isCancelled = false;

    processVocalSeparation(audioBuffer, balance, bassPreserve).then((processed) => {
      if (!isCancelled) {
        processedBufferRef.current = processed;
        // If currently playing, restart with new buffer
        if (isPlaying) {
          restartPlaybackAtCurrentTime();
        }
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [balance, bassPreserve, audioBuffer]);

  // Load Synthesized Demo Stereo Track
  const loadDemoTrack = async () => {
    setIsLoading(true);
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;

      const sampleRate = ctx.sampleRate;
      const length = sampleRate * 12; // 12 seconds
      const buffer = ctx.createBuffer(2, length, sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);

      // Generate a rich stereo mix:
      // Center vocal (sine melody with vibrato) + Stereo chords & drums
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;

        // 1. Center Vocal (Lead Voice melody)
        const vocalPitch = 330 + 100 * Math.sin(t * 1.5) + 3 * Math.sin(t * 30);
        const vocal = 0.3 * Math.sin(2 * Math.PI * vocalPitch * t);

        // 2. Left Instrumental (Synth Arp 220Hz)
        const chordL = 0.2 * Math.sin(2 * Math.PI * 220 * t + Math.sin(t * 8));

        // 3. Right Instrumental (Synth Arp 277Hz)
        const chordR = 0.2 * Math.sin(2 * Math.PI * 277 * t + Math.sin(t * 8));

        // 4. Bass kick (Center low)
        const kickBeat = (t * 2) % 1;
        const kick = Math.exp(-kickBeat * 15) * 0.4 * Math.sin(2 * Math.PI * 65 * t);

        left[i] = vocal + chordL + kick;
        right[i] = vocal + chordR + kick;
      }

      setAudioBuffer(buffer);
      setDuration(buffer.duration);
      setFileName('Demo_Stereo_Song.wav');
      pauseOffsetRef.current = 0;
      setCurrentTime(0);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Upload custom audio file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);
    stopPlayback();

    try {
      const arrayBuffer = await file.arrayBuffer();
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;

      const decoded = await ctx.decodeAudioData(arrayBuffer);
      setAudioBuffer(decoded);
      setDuration(decoded.duration);
      pauseOffsetRef.current = 0;
      setCurrentTime(0);
    } catch (err: any) {
      alert('Failed to decode audio file. Please try MP3 or WAV format.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const startPlayback = (offsetSec: number) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const buf = processedBufferRef.current || audioBuffer;
    if (!buf) return;

    const source = ctx.createBufferSource();
    source.buffer = buf;

    const gain = ctx.createGain();
    gain.gain.value = 1.0;
    source.connect(gain);
    gain.connect(ctx.destination);

    source.start(0, offsetSec);
    startTimeRef.current = ctx.currentTime - offsetSec;
    sourceNodeRef.current = source;
    gainNodeRef.current = gain;
    setIsPlaying(true);

    source.onended = () => {
      // Natural finish check
      if (ctx.currentTime - startTimeRef.current >= buf.duration - 0.2) {
        setIsPlaying(false);
        pauseOffsetRef.current = 0;
        setCurrentTime(0);
      }
    };

    drawVisualizer();
  };

  const stopPlayback = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {}
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (!audioBuffer) {
      loadDemoTrack();
      return;
    }

    if (isPlaying) {
      if (audioCtxRef.current) {
        pauseOffsetRef.current = audioCtxRef.current.currentTime - startTimeRef.current;
      }
      stopPlayback();
    } else {
      startPlayback(pauseOffsetRef.current);
    }
  };

  const restartPlaybackAtCurrentTime = () => {
    if (!audioCtxRef.current) return;
    const currentOffset = audioCtxRef.current.currentTime - startTimeRef.current;
    stopPlayback();
    startPlayback(currentOffset);
  };

  const handleSeek = (newTime: number) => {
    pauseOffsetRef.current = newTime;
    setCurrentTime(newTime);
    if (isPlaying) {
      stopPlayback();
      startPlayback(newTime);
    }
  };

  // Canvas Waveform Animation
  const drawVisualizer = () => {
    if (!canvasRef.current || !audioBuffer) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Track playhead
    if (isPlaying && audioCtxRef.current) {
      const cur = audioCtxRef.current.currentTime - startTimeRef.current;
      setCurrentTime(Math.min(duration, cur));
    }

    ctx.clearRect(0, 0, width, height);

    // Draw baseline
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Draw simplified waveform bars
    const channel = audioBuffer.getChannelData(0);
    const step = Math.ceil(channel.length / width);
    const amp = height / 2;

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = channel[i * step + j] || 0;
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }

      // Bar color depending on playhead
      const progressX = (currentTime / (duration || 1)) * width;
      if (i < progressX) {
        ctx.fillStyle = balance < 0 ? '#38bdf8' : balance > 0 ? '#f472b6' : '#818cf8';
      } else {
        ctx.fillStyle = '#475569';
      }

      const barHeight = Math.max(2, (max - min) * amp * 0.9);
      ctx.fillRect(i, height / 2 - barHeight / 2, 1, barHeight);
    }

    // Playhead line
    const playheadX = (currentTime / (duration || 1)) * width;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(playheadX, 0, 2, height);

    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(drawVisualizer);
    }
  };

  useEffect(() => {
    drawVisualizer();
  }, [audioBuffer, currentTime, isPlaying, balance]);

  // Export processed WAV
  const handleExportWav = async () => {
    if (!audioBuffer) return;
    setIsLoading(true);
    try {
      const processed = await processVocalSeparation(audioBuffer, balance, bassPreserve);
      const wavBlob = audioBufferToWav(processed);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      const type = balance < 0 ? 'Instrumental_Karaoke' : balance > 0 ? 'Isolated_Vocals' : 'Remixed';
      a.download = `${fileName.replace(/\.[^/.]+$/, '')}_${type}.wav`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('Export failed: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>{isKm ? 'កាត់សំឡេងចម្រៀង & ដកភ្លេង (Vocal Remover Studio)' : 'AI Vocal Remover & Audio Separator'}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  DSP M/S Engine
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {isKm 
                  ? 'បំបែកសំឡេងអ្នកច្រៀង (Acappella) ឬដកសំឡេងចេញយកតែភ្លេង (Karaoke Backing Track)' 
                  : 'Isolate vocal track or remove vocals to create pure instrumental karaoke tracks'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <input
              type="file"
              accept="audio/*"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isKm ? 'បញ្ចូលបទចម្រៀង' : 'Upload Song'}</span>
            </button>

            <button
              onClick={loadDemoTrack}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-xs font-semibold text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isKm ? 'សាកល្បងបទគំរូ' : 'Load Demo Track'}</span>
            </button>
          </div>
        </div>

        {/* Waveform Canvas Viewport */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
              <Music className="w-4 h-4 text-cyan-400" />
              <span className="truncate max-w-[240px] sm:max-w-md">{fileName}</span>
            </span>
            <span className="font-mono">
              {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')} /{' '}
              {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
            </span>
          </div>

          <div className="relative h-28 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center p-2">
            <canvas
              ref={canvasRef}
              width={800}
              height={110}
              className="w-full h-full cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const ratio = clickX / rect.width;
                handleSeek(ratio * duration);
              }}
            />
          </div>
        </div>

        {/* Transport Controls (Play, Pause, Restart) */}
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={() => handleSeek(0)}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            title={isKm ? 'សារឡើងវិញ' : 'Restart'}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            disabled={isLoading}
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button
            onClick={handleExportWav}
            disabled={!audioBuffer || isLoading}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>{isKm ? 'ទាញយក WAV' : 'Export WAV'}</span>
          </button>
        </div>

        {/* Real-time Vocal vs Instrumental Balance Slider */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MicOff className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-200">
                {isKm ? 'កម្រិតបំបែកសំឡេង (Separation Balance)' : 'Separation Balance'}
              </span>
            </div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                balance < -0.1
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : balance > 0.1
                  ? 'bg-pink-500/20 text-pink-300'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {balance <= -0.1
                ? `${Math.round(Math.abs(balance) * 100)}% Instrumental (Karaoke)`
                : balance >= 0.1
                ? `${Math.round(balance * 100)}% Isolated Vocals (Acappella)`
                : 'Original Stereo'}
            </span>
          </div>

          <div className="space-y-1">
            <input
              type="range"
              min={-1}
              max={1}
              step={0.05}
              value={balance}
              onChange={(e) => setBalance(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
              <span className="text-cyan-400">🎤 ដកសំឡេង (Pure Instrumental)</span>
              <span className="text-slate-500">បទដើម (0%)</span>
              <span className="text-pink-400">🗣️ យកតែសំឡេង (Pure Vocals)</span>
            </div>
          </div>

          {/* Sub-bass retention */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <label className="text-xs text-slate-400 flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isKm ? 'រក្សាសំឡេងបាស & Kick Drum (Bass Preserve)' : 'Sub-bass Retention:'}</span>
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={bassPreserve}
              onChange={(e) => setBassPreserve(parseFloat(e.target.value))}
              className="w-36 accent-indigo-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
