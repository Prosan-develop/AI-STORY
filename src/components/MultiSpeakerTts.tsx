import React, { useState } from 'react';
import { 
  Volume2, 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  Sparkles, 
  User, 
  Mic, 
  Radio, 
  Loader2, 
  Check, 
  Music,
  Sliders
} from 'lucide-react';
import { SrtItem } from '../types';
import { speakBrowserText, stopSpeaking } from '../utils/khmerSpeech';

interface MultiSpeakerTtsProps {
  appLang: 'km' | 'en';
  srtList: SrtItem[];
}

export const MultiSpeakerTts: React.FC<MultiSpeakerTtsProps> = ({
  appLang,
  srtList,
}) => {
  const isKm = appLang === 'km';

  // Voice Actor Configurations
  const [maleVoice, setMaleVoice] = useState<string>('Puck'); // or 'Fenrir'
  const [femaleVoice, setFemaleVoice] = useState<string>('Kore'); // or 'Zephyr'
  const [narratorVoice, setNarratorVoice] = useState<string>('Charon'); // or browser
  const [engineMode, setEngineMode] = useState<'gemini' | 'browser'>('gemini');

  // Generation States
  const [isGeneratingAll, setIsGeneratingAll] = useState<boolean>(false);
  const [currentProgressIndex, setCurrentProgressIndex] = useState<number>(0);
  const [generatedAudios, setGeneratedAudios] = useState<{ [id: string]: string }>({});
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);

  // Play a specific cue audio (either Gemini WAV or Browser WebSpeech)
  const handlePlayLine = async (cue: SrtItem) => {
    // If currently playing, stop it
    if (activePlayingId === cue.id) {
      if (audioPlayer) {
        audioPlayer.pause();
      }
      stopSpeaking();
      setActivePlayingId(null);
      return;
    }

    // If pre-generated Gemini audio exists
    if (generatedAudios[cue.id]) {
      const audio = new Audio(generatedAudios[cue.id]);
      setAudioPlayer(audio);
      setActivePlayingId(cue.id);
      audio.onended = () => setActivePlayingId(null);
      audio.onerror = () => setActivePlayingId(null);
      audio.play();
      return;
    }

    // If Gemini engine selected, fetch TTS
    if (engineMode === 'gemini') {
      setActivePlayingId(cue.id);
      try {
        const chosenVoice =
          cue.speaker === 'male'
            ? maleVoice
            : cue.speaker === 'female'
            ? femaleVoice
            : narratorVoice;

        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: cue.text,
            voice: chosenVoice,
            style:
              cue.speaker === 'male'
                ? 'Energetic male character, confident'
                : cue.speaker === 'female'
                ? 'Warm, expressive female voice'
                : 'Dramatic, clear movie narrator',
          }),
        });

        const data = await res.json();
        if (data.audioBase64) {
          const audioUrl = `data:audio/wav;base64,${data.audioBase64}`;
          setGeneratedAudios((prev) => ({ ...prev, [cue.id]: audioUrl }));
          const audio = new Audio(audioUrl);
          setAudioPlayer(audio);
          audio.onended = () => setActivePlayingId(null);
          audio.play();
        } else {
          // Fallback to browser WebSpeech
          fallbackBrowserSpeak(cue);
        }
      } catch (err) {
        console.warn('Gemini TTS error, falling back to Web Speech', err);
        fallbackBrowserSpeak(cue);
      }
    } else {
      // Free Browser engine
      fallbackBrowserSpeak(cue);
    }
  };

  const fallbackBrowserSpeak = (cue: SrtItem) => {
    setActivePlayingId(cue.id);
    speakBrowserText(cue.text, {
      pitch: cue.speaker === 'female' ? 1.3 : cue.speaker === 'male' ? 0.8 : 1.0,
      rate: 1.0,
      onEnd: () => setActivePlayingId(null),
    }).catch(() => setActivePlayingId(null));
  };

  // Generate All Audio sequentially
  const handleGenerateAllVoices = async () => {
    if (srtList.length === 0) return;
    setIsGeneratingAll(true);
    setCurrentProgressIndex(0);

    for (let i = 0; i < srtList.length; i++) {
      const cue = srtList[i];
      setCurrentProgressIndex(i + 1);

      if (generatedAudios[cue.id]) continue; // already generated

      try {
        const chosenVoice =
          cue.speaker === 'male'
            ? maleVoice
            : cue.speaker === 'female'
            ? femaleVoice
            : narratorVoice;

        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: cue.text,
            voice: chosenVoice,
          }),
        });
        const data = await res.json();
        if (data.audioBase64) {
          const audioUrl = `data:audio/wav;base64,${data.audioBase64}`;
          setGeneratedAudios((prev) => ({ ...prev, [cue.id]: audioUrl }));
        }
      } catch (e) {
        console.error('TTS error on cue', i, e);
      }
    }

    setIsGeneratingAll(false);
  };

  // Download cue audio
  const handleDownloadCueAudio = (cueId: string, index: number) => {
    const url = generatedAudios[cueId];
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice_cue_${index}.wav`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isKm ? 'បង្កើតសំឡេងអានបែងចែកប្រុសស្រី (Multi-Speaker TTS)' : 'Multi-Speaker Voice Studio'}
              </h3>
              <p className="text-xs text-slate-400">
                {isKm 
                  ? 'បែងចែកសំឡេងតួប្រុស តួស្រី និងអ្នករៀបរាប់ ដោយស្វ័យប្រវត្តិតាមជួរ Subtitle' 
                  : 'Automatically cast Male, Female, and Narrator voice actors for each subtitle line'}
              </p>
            </div>
          </div>

          {/* Engine Selector */}
          <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setEngineMode('gemini')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                engineMode === 'gemini'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 inline mr-1 text-amber-300" />
              Gemini Studio TTS
            </button>
            <button
              onClick={() => setEngineMode('browser')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                engineMode === 'browser'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5 inline mr-1 text-cyan-400" />
              {isKm ? 'ម៉ាស៊ីន Free (Local)' : 'Free Local Engine'}
            </button>
          </div>
        </div>

        {/* 3 Voice Actor Casting Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Male Voice Actor */}
          <div className="bg-slate-950/70 border border-blue-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 flex items-center space-x-1.5">
                <User className="w-4 h-4" />
                <span>{isKm ? 'តួប្រុស (Male Actor)' : 'Male Character'}</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                {srtList.filter((c) => c.speaker === 'male').length} {isKm ? 'ជួរ' : 'lines'}
              </span>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 block mb-1">
                {isKm ? 'សម្លេង AI (Voice Profile)' : 'Voice Profile'}
              </label>
              <select
                value={maleVoice}
                onChange={(e) => setMaleVoice(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-blue-200 focus:outline-none"
              >
                <option value="Puck">Puck - យុវជនក្លាហាន រស់រវើក (Energetic Male)</option>
                <option value="Fenrir">Fenrir - មេបញ្ជាការ ម៉ឺងម៉ាត់ (Deep & Authoritative)</option>
                <option value="Charon">Charon - សំឡេងគ្រលរ ធ្ងន់ (Warm Low Male)</option>
              </select>
            </div>
          </div>

          {/* 2. Female Voice Actor */}
          <div className="bg-slate-950/70 border border-pink-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-pink-400 flex items-center space-x-1.5">
                <User className="w-4 h-4" />
                <span>{isKm ? 'តួស្រី (Female Actor)' : 'Female Character'}</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-300 border border-pink-500/20">
                {srtList.filter((c) => c.speaker === 'female').length} {isKm ? 'ជួរ' : 'lines'}
              </span>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 block mb-1">
                {isKm ? 'សម្លេង AI (Voice Profile)' : 'Voice Profile'}
              </label>
              <select
                value={femaleVoice}
                onChange={(e) => setFemaleVoice(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-pink-200 focus:outline-none"
              >
                <option value="Kore">Kore - សំឡេងកក់ក្តៅ ផ្អែមទន់ (Warm & Expressive)</option>
                <option value="Zephyr">Zephyr - សំឡេងស្រទន់ ពិរោះ (Gentle & Calming)</option>
              </select>
            </div>
          </div>

          {/* 3. Narrator Actor */}
          <div className="bg-slate-950/70 border border-emerald-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                <Volume2 className="w-4 h-4" />
                <span>{isKm ? 'អ្នករៀបរាប់ (Narrator)' : 'Story Narrator'}</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                {srtList.filter((c) => c.speaker === 'narrator').length} {isKm ? 'ជួរ' : 'lines'}
              </span>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 block mb-1">
                {isKm ? 'សម្លេង AI (Voice Profile)' : 'Voice Profile'}
              </label>
              <select
                value={narratorVoice}
                onChange={(e) => setNarratorVoice(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-emerald-200 focus:outline-none"
              >
                <option value="Charon">Charon - អធិប្បាយភាពយន្ត (Cinematic Narrator)</option>
                <option value="Fenrir">Fenrir - កុនផ្សងព្រេង (Epic Epic Storyteller)</option>
                <option value="Kore">Kore - រឿងមនោសញ្ចេតនា (Narrative Host)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Button: Batch Generate All Cues */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="text-xs text-slate-400">
            {isGeneratingAll && (
              <span className="flex items-center space-x-2 text-indigo-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isKm ? `កំពុងបង្កើតសំឡេង ${currentProgressIndex}/${srtList.length}...` : `Generating ${currentProgressIndex}/${srtList.length}...`}</span>
              </span>
            )}
          </div>

          <button
            onClick={handleGenerateAllVoices}
            disabled={isGeneratingAll || srtList.length === 0}
            className="flex items-center space-x-2 py-2.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isGeneratingAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isKm ? 'កំពុងបង្កើត...' : 'Generating Audio...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{isKm ? 'បង្កើតសំឡេងគ្រប់ជួរទាំងអស់ (Generate All)' : 'Generate All Voices'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Subtitles Voice Playback List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h4 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
          <Music className="w-4 h-4 text-indigo-400" />
          <span>{isKm ? 'បញ្ជីសំឡេងតាមជួរ Subtitle' : 'Subtitle Audio Tracks'}</span>
        </h4>

        <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
          {srtList.map((cue) => {
            const isPlaying = activePlayingId === cue.id;
            const hasGeminiAudio = Boolean(generatedAudios[cue.id]);

            return (
              <div
                key={cue.id}
                className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 transition-all ${
                  isPlaying
                    ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500/50'
                    : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-[220px]">
                  <button
                    onClick={() => handlePlayLine(cue)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                      isPlaying
                        ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/30'
                        : 'bg-slate-800 text-indigo-400 hover:bg-slate-700 border-slate-700'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>

                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-mono text-slate-500">#{cue.index}</span>
                      <span className="text-[11px] font-mono text-slate-400">{cue.startTime}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.2 rounded ${
                          cue.speaker === 'male'
                            ? 'bg-blue-950 text-blue-400 border border-blue-800'
                            : cue.speaker === 'female'
                            ? 'bg-pink-950 text-pink-400 border border-pink-800'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        }`}
                      >
                        {cue.speaker === 'male' ? 'ប្រុស' : cue.speaker === 'female' ? 'ស្រី' : 'សម្រាយ'}
                      </span>
                      {hasGeminiAudio && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          HD WAV
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-200 line-clamp-1">{cue.text}</p>
                  </div>
                </div>

                {/* Right Download / Audio actions */}
                <div className="flex items-center space-x-2">
                  {hasGeminiAudio && (
                    <button
                      onClick={() => handleDownloadCueAudio(cue.id, cue.index)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
                      title={isKm ? 'ទាញយកសំឡេង WAV' : 'Download WAV'}
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
