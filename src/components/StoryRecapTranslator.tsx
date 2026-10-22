import React, { useState } from 'react';
import { 
  Wand2, 
  Languages, 
  Volume2, 
  Copy, 
  Check, 
  FileText, 
  Share2, 
  SendHorizontal, 
  BookmarkCheck, 
  Clock, 
  Sparkles, 
  Layers,
  ArrowRightLeft,
  Loader2,
  StopCircle
} from 'lucide-react';
import { StoryRecapResult, SrtItem } from '../types';
import { speakBrowserText, stopSpeaking } from '../utils/khmerSpeech';
import { saveRecap } from '../utils/storage';

interface StoryRecapTranslatorProps {
  appLang: 'km' | 'en';
  onTransferToSrt: (items: SrtItem[]) => void;
}

export const StoryRecapTranslator: React.FC<StoryRecapTranslatorProps> = ({
  appLang,
  onTransferToSrt,
}) => {
  const isKm = appLang === 'km';
  const [activeSubTab, setActiveSubTab] = useState<'recap' | 'translate'>('recap');

  // Story Recap States
  const [plotInput, setPlotInput] = useState<string>(
    `យុវជនម្នាក់ឈ្មោះ សុខា គឺជាអ្នកសរសេរកូដធម្មតាម្នាក់នៅក្នុងទីក្រុងភ្នំពេញ។ ថ្ងៃមួយពេលដែលគាត់កំពុងជួសជុលម៉ាស៊ីនកុំព្យូទ័រចាស់មួយ គាត់បានប្រទះឃើញឯកសារសម្ងាត់ដែលបង្ហាញពីផែនការបច្ចេកវិទ្យាសិប្បនិម្មិត (AI) ដែលអាចគ្រប់គ្រងប្រព័ន្ធថាមពលទូទាំងប្រទេស។ ស្រាប់តែមានក្រុមបុរសអាថ៌កំបាំងស្លៀកពាក់ខ្មៅមកតាមដានគាត់...`
  );
  const [selectedGenre, setSelectedGenre] = useState<string>('Suspense & Thriller (រន្ធត់ & អាថ៌កំបាំង)');
  const [selectedStyle, setSelectedStyle] = useState<string>('Viral 60s TikTok/Reels Recap (ទាក់ទាញខ្លាំង)');
  const [recapLanguage, setRecapLanguage] = useState<string>('Khmer');
  const [isGeneratingRecap, setIsGeneratingRecap] = useState<boolean>(false);
  const [recapResult, setRecapResult] = useState<StoryRecapResult | null>(null);

  // Translation States
  const [transSourceText, setTransSourceText] = useState<string>(
    'Artificial Intelligence is revolutionizing storytelling, video editing, and language translation worldwide.'
  );
  const [transSourceLang, setTransSourceLang] = useState<string>('English');
  const [transTargetLang, setTransTargetLang] = useState<string>('Khmer');
  const [transTone, setTransTone] = useState<string>('Natural & Cinematic (ធម្មជាតិ & កុន)');
  const [translatedResult, setTranslatedResult] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);

  // Audio Playback
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Generate Story Recap
  const handleGenerateRecap = async () => {
    if (!plotInput.trim()) return;
    setIsGeneratingRecap(true);
    try {
      const res = await fetch('/api/story-recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plotText: plotInput,
          genre: selectedGenre,
          style: selectedStyle,
          language: recapLanguage,
        }),
      });
      const data = await res.json();
      if (data && data.fullScript) {
        setRecapResult(data);
      } else {
        alert(data.error || 'Failed to generate recap');
      }
    } catch (e: any) {
      console.error(e);
      alert('Error generating recap: ' + e.message);
    } finally {
      setIsGeneratingRecap(false);
    }
  };

  // Translate Text
  const handleTranslate = async () => {
    if (!transSourceText.trim()) return;
    setIsTranslating(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: transSourceText,
          sourceLang: transSourceLang,
          targetLang: transTargetLang,
          tone: transTone,
        }),
      });
      const data = await res.json();
      if (data && data.translatedText) {
        setTranslatedResult(data.translatedText);
      } else {
        alert(data.error || 'Translation failed');
      }
    } catch (e: any) {
      console.error(e);
      alert('Translation error: ' + e.message);
    } finally {
      setIsTranslating(false);
    }
  };

  // Read with Web Speech or Gemini TTS
  const handlePlayVoice = (text: string) => {
    if (isPlayingAudio) {
      stopSpeaking();
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);
    speakBrowserText(text, {
      rate: 1.0,
      pitch: 1.0,
      onEnd: () => setIsPlayingAudio(false),
    }).catch(() => setIsPlayingAudio(false));
  };

  // Save to project history
  const handleSaveRecap = () => {
    if (!recapResult) return;
    const title = recapResult.suggestedTitles[0] || 'សម្រាយរឿង AI Project';
    saveRecap({
      title,
      script: `${recapResult.hook}\n\n${recapResult.fullScript}`,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Convert Recap Script to SRT Subtitle Cues
  const handleConvertToSrt = () => {
    if (!recapResult) return;
    const fullText = `${recapResult.hook}\n${recapResult.fullScript}`;
    // Split by punctuation or line breaks
    const sentences = fullText
      .split(/(?<=[.!?។\n])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2);

    let currentTime = 1.0;
    const newItems: SrtItem[] = sentences.map((sent, idx) => {
      // Estimate duration: ~3.5 words or 25 chars per 2 seconds
      const duration = Math.max(2.5, Math.min(6.5, sent.length * 0.08));
      const start = currentTime;
      const end = currentTime + duration;
      currentTime = end + 0.3; // brief pause

      // Helper to format 00:00:00,000
      const fmt = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        const ms = Math.floor((sec - Math.floor(sec)) * 1000);
        return `00:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
      };

      return {
        id: `gen-srt-${idx}-${Date.now()}`,
        index: idx + 1,
        startTime: fmt(start),
        endTime: fmt(end),
        speaker: 'narrator',
        speakerLabel: 'អ្នកសម្រាយ (Narrator)',
        text: sent,
      };
    });

    onTransferToSrt(newItems);
  };

  return (
    <div className="space-y-6">
      {/* Sub tabs: Story Recap vs Universal Translator */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveSubTab('recap')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeSubTab === 'recap'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{isKm ? 'សម្រាយរឿងកុន AI (Story Recap Studio)' : 'AI Story Recap Studio'}</span>
          </button>
          <button
            onClick={() => setActiveSubTab('translate')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeSubTab === 'translate'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Languages className="w-4 h-4 text-indigo-400" />
            <span>{isKm ? 'បកប្រែអត្ថបទ & រឿង (Universal Translator)' : 'Universal Translator'}</span>
          </button>
        </div>
      </div>

      {/* 1. STORY RECAP TAB */}
      {activeSubTab === 'recap' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Config & Input Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>{isKm ? 'បញ្ចូលសាច់រឿង ឬសង្ខេបកុន (Plot / Synopsis)' : 'Input Plot / Synopsis'}</span>
                </label>
                <span className="text-xs text-slate-500">{plotInput.length} {isKm ? 'តួអក្សរ' : 'chars'}</span>
              </div>

              <textarea
                value={plotInput}
                onChange={(e) => setPlotInput(e.target.value)}
                rows={6}
                placeholder={isKm ? 'បញ្ចូលសេចក្តីសង្ខេបរឿង ឈុតឆាក ឬអត្ថបទរឿងនៅទីនេះ...' : 'Paste story synopsis, screenplay notes, or scene dialogue here...'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-600"
              />

              {/* Genre / Tone selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                    {isKm ? 'ប្រភេទរឿង (Genre)' : 'Genre'}
                  </label>
                  <select
                    value={selectedGenre}
                    onChange={(e) => setSelectedGenre(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Suspense & Thriller (រន្ធត់ & អាថ៌កំបាំង)">រន្ធត់ & អាថ៌កំបាំង (Thriller)</option>
                    <option value="Action & Sci-Fi (ប្រយុទ្ធ & វិទ្យាសាស្ត្រ)">ប្រយុទ្ធ & វិទ្យាសាស្ត្រ (Sci-Fi)</option>
                    <option value="Emotional Drama (មនោសញ្ចេតនា)">មនោសញ្ចេតនា (Drama)</option>
                    <option value="Comedy & Humor (កំប្លុកកំប្លែង)">កំប្លុកកំប្លែង (Comedy)</option>
                    <option value="Crime & Investigation (ស៊ើបអង្កេត)">ស៊ើបអង្កេត (Investigation)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                    {isKm ? 'ទម្រង់វីដេអូ (Style)' : 'Video Style'}
                  </label>
                  <select
                    value={selectedStyle}
                    onChange={(e) => setSelectedStyle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Viral 60s TikTok/Reels Recap (ទាក់ទាញខ្លាំង)">TikTok / Reels 60s (Viral Hook)</option>
                    <option value="Full YouTube Story Breakdown (ក្បោះក្បាយ)">YouTube Story Breakdown (5-10m)</option>
                    <option value="Fast Facebook Video Recap (រហ័ស)">Facebook Video Style</option>
                    <option value="Epic Movie Narrative (អធិប្បាយភាពយន្ត)">Epic Movie Narrative</option>
                  </select>
                </div>
              </div>

              {/* Language selection */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                  {isKm ? 'ភាសាអធិប្បាយ (Recap Language)' : 'Narrative Language'}
                </label>
                <select
                  value={recapLanguage}
                  onChange={(e) => setRecapLanguage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Khmer">ភាសាខ្មែរ (Khmer - Standard Storyteller)</option>
                  <option value="English">English (Hollywood Style)</option>
                  <option value="Thai">ภาษาไทย (Thai)</option>
                  <option value="Chinese">中文 (Chinese)</option>
                  <option value="Vietnamese">Tiếng Việt (Vietnamese)</option>
                </select>
              </div>

              {/* Action Generate Button */}
              <button
                onClick={handleGenerateRecap}
                disabled={isGeneratingRecap || !plotInput.trim()}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isGeneratingRecap ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>{isKm ? 'AI កំពុងរៀបរៀងសាច់រឿង...' : 'AI is scripting recap...'}</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 text-amber-300" />
                    <span>{isKm ? 'បង្កើតស្គ្រីបសម្រាយរឿង AI ភ្លាមៗ' : 'Generate AI Story Recap'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Script Output Column */}
          <div className="lg:col-span-7">
            {recapResult ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5 animate-in fade-in duration-300">
                {/* Header Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {isKm ? 'សម្រាយរួចរាល់' : 'Ready'} • ~{recapResult.estimatedDurationMinutes || 2} {isKm ? 'នាទី' : 'min'}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1.5 line-clamp-1">
                      {recapResult.suggestedTitles[0] || 'ស្គ្រីបសម្រាយរឿង'}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Speak Button */}
                    <button
                      onClick={() => handlePlayVoice(`${recapResult.hook}. ${recapResult.fullScript}`)}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        isPlayingAudio
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                      }`}
                    >
                      {isPlayingAudio ? (
                        <>
                          <StopCircle className="w-3.5 h-3.5 text-rose-400" />
                          <span>{isKm ? 'បញ្ឈប់អាន' : 'Stop'}</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{isKm ? 'ស្តាប់សំឡេងអាន' : 'Listen'}</span>
                        </>
                      )}
                    </button>

                    {/* Copy Button */}
                    <button
                      onClick={() => copyToClipboard(`${recapResult.hook}\n\n${recapResult.fullScript}`, 'fullScript')}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                      title={isKm ? 'ចម្លងស្គ្រីប' : 'Copy'}
                    >
                      {copiedKey === 'fullScript' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>

                    {/* Save to Project */}
                    <button
                      onClick={handleSaveRecap}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                      title={isKm ? 'រក្សាទុក' : 'Save'}
                    >
                      <BookmarkCheck className={`w-4 h-4 ${savedSuccess ? 'text-emerald-400' : 'text-slate-400'}`} />
                    </button>
                  </div>
                </div>

                {/* Hook Box */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    🔥 {isKm ? 'ពាក្យបើកឆាកទាក់ទាញ (5-Second Hook)' : '5-Second Hook'}
                  </span>
                  <p className="text-sm font-medium text-amber-100 leading-relaxed">
                    {recapResult.hook}
                  </p>
                </div>

                {/* Full Narration Script */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400">
                    {isKm ? 'ស្គ្រីបអធិប្បាយពេញលេញ (Full Narration Script)' : 'Full Narration Script'}
                  </span>
                  <div className="max-h-72 overflow-y-auto p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-sm text-slate-200 leading-relaxed whitespace-pre-line font-normal selection:bg-indigo-500 selection:text-white">
                    {recapResult.fullScript}
                  </div>
                </div>

                {/* Titles & Hashtags */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="font-semibold text-indigo-400 block mb-1.5">
                      🎬 {isKm ? 'ចំណងជើងស្នើរសុំ (Suggested Titles)' : 'Suggested Titles'}
                    </span>
                    <ul className="space-y-1 text-slate-300">
                      {recapResult.suggestedTitles?.map((t, idx) => (
                        <li key={idx} className="truncate">• {t}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="font-semibold text-purple-400 block mb-1.5">
                      🏷️ {isKm ? 'Hashtags សំខាន់ៗ' : 'Hashtags'}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {recapResult.hashtags?.map((tag, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[11px]">
                          {tag.startsWith('#') ? tag : `#${tag}`}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bridge to SRT Subtitles Action */}
                <div className="pt-2">
                  <button
                    onClick={handleConvertToSrt}
                    className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 border border-indigo-500/40 hover:border-indigo-500 text-indigo-200 hover:text-white text-xs font-bold transition-all shadow-md group cursor-pointer"
                  >
                    <Layers className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                    <span>
                      {isKm 
                        ? 'បញ្ជូនស្គ្រីបនេះទៅបង្កើតជា Subtitle SRT ភ្លាមៗ' 
                        : 'Transfer this script to SRT Subtitle Editor & Video Studio'}
                    </span>
                    <SendHorizontal className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[360px] bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <Wand2 className="w-12 h-12 text-slate-700 mb-3" />
                <h4 className="text-base font-semibold text-slate-400 mb-1">
                  {isKm ? 'មិនទាន់មានស្គ្រីបនៅឡើយទេ' : 'No Recap Generated Yet'}
                </h4>
                <p className="text-xs max-w-sm text-slate-600">
                  {isKm 
                    ? 'បញ្ចូលសេចក្តីសង្ខេបរឿងនៅផ្នែកខាងឆ្វេង រួចចុច "បង្កើតស្គ្រីបសម្រាយរឿង" ដើម្បីទទួលស្គ្រីបសម្រាយរឿងកុនដ៏ទាក់ទាញ' 
                    : 'Enter your story plot on the left and click "Generate AI Story Recap" to create an engaging movie recap script.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. UNIVERSAL TRANSLATOR TAB */}
      {activeSubTab === 'translate' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          {/* Language and Tone Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              {/* Source Lang */}
              <select
                value={transSourceLang}
                onChange={(e) => setTransSourceLang(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Auto">Auto Detect (ស្វ័យប្រវត្តិ)</option>
                <option value="English">English</option>
                <option value="Khmer">ភាសាខ្មែរ (Khmer)</option>
                <option value="Chinese">中文 (Chinese)</option>
                <option value="Thai">ภาษาไทย (Thai)</option>
                <option value="Vietnamese">Tiếng Việt (Vietnamese)</option>
                <option value="Japanese">日本語 (Japanese)</option>
                <option value="Korean">한국어 (Korean)</option>
                <option value="French">Français (French)</option>
                <option value="Spanish">Español (Spanish)</option>
              </select>

              <button
                onClick={() => {
                  const temp = transSourceLang;
                  setTransSourceLang(transTargetLang);
                  setTransTargetLang(temp === 'Auto' ? 'English' : temp);
                  setTransSourceText(translatedResult);
                  setTranslatedResult(transSourceText);
                }}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
                title="ដូរបញ្ច្រាសភាសា / Swap"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>

              {/* Target Lang */}
              <select
                value={transTargetLang}
                onChange={(e) => setTransTargetLang(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Khmer">ភាសាខ្មែរ (Khmer)</option>
                <option value="English">English</option>
                <option value="Thai">ภาษาไทย (Thai)</option>
                <option value="Chinese">中文 (Chinese)</option>
                <option value="Vietnamese">Tiếng Việt (Vietnamese)</option>
                <option value="Japanese">日本語 (Japanese)</option>
                <option value="Korean">한국어 (Korean)</option>
                <option value="French">Français (French)</option>
                <option value="Spanish">Español (Spanish)</option>
              </select>
            </div>

            {/* Tone selector */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 hidden sm:inline">{isKm ? 'សំនៀង (Tone):' : 'Tone:'}</span>
              <select
                value={transTone}
                onChange={(e) => setTransTone(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
              >
                <option value="Natural & Cinematic (ធម្មជាតិ & កុន)">Natural & Cinematic</option>
                <option value="Formal & Document (ផ្លូវការ)">Formal & Document</option>
                <option value="Casual & Conversational (សន្ទនាប្រចាំថ្ងៃ)">Casual Conversation</option>
                <option value="Literary & Novel (អក្សរសិល្ប៍ / ប្រលោមលោក)">Literary / Novel</option>
              </select>
            </div>
          </div>

          {/* Dual Translation Panes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Source Pane */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{isKm ? 'អត្ថបទដើម' : 'Original Text'}</span>
                <span>{transSourceText.length} chars</span>
              </div>
              <textarea
                value={transSourceText}
                onChange={(e) => setTransSourceText(e.target.value)}
                rows={9}
                placeholder={isKm ? 'វាយបញ្ចូល ឬបិទភ្ជាប់អត្ថបទនៅទីនេះ...' : 'Enter or paste text here...'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
              />
            </div>

            {/* Translated Pane */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="text-indigo-400 font-semibold">{isKm ? 'លទ្ធផលបកប្រែ' : 'Translated Text'}</span>
                {translatedResult && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePlayVoice(translatedResult)}
                      className="p-1 text-slate-400 hover:text-white"
                      title={isKm ? 'ស្តាប់សំឡេងអាន' : 'Listen'}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => copyToClipboard(translatedResult, 'trans')}
                      className="p-1 text-slate-400 hover:text-white"
                      title={isKm ? 'ចម្លង' : 'Copy'}
                    >
                      {copiedKey === 'trans' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>
              <div className="w-full min-h-[220px] bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 leading-relaxed selection:bg-indigo-500 selection:text-white whitespace-pre-wrap">
                {isTranslating ? (
                  <div className="flex items-center justify-center h-48 space-x-2 text-indigo-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-xs">{isKm ? 'AI កំពុងបកប្រែ...' : 'Translating...'}</span>
                  </div>
                ) : (
                  translatedResult || (
                    <span className="text-slate-600 italic">
                      {isKm ? 'លទ្ធផលបកប្រែនឹងបង្ហាញនៅទីនេះ...' : 'Translation will appear here...'}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <button
              onClick={handleTranslate}
              disabled={isTranslating || !transSourceText.trim()}
              className="flex items-center space-x-2 py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isKm ? 'កំពុងបកប្រែ...' : 'Translating...'}</span>
                </>
              ) : (
                <>
                  <Languages className="w-4 h-4" />
                  <span>{isKm ? 'បកប្រែឥឡូវនេះ (Translate)' : 'Translate Now'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
