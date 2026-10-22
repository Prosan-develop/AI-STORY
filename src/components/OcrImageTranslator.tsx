import React, { useState, useRef } from 'react';
import { 
  Scan, 
  Camera, 
  Upload, 
  Volume2, 
  Copy, 
  Check, 
  Sparkles, 
  Layers, 
  Eye, 
  EyeOff, 
  Loader2, 
  BookOpen, 
  Languages 
} from 'lucide-react';
import { OcrResult, OcrTextBlock } from '../types';
import { speakBrowserText } from '../utils/khmerSpeech';

interface OcrImageTranslatorProps {
  appLang: 'km' | 'en';
}

export const OcrImageTranslator: React.FC<OcrImageTranslatorProps> = ({ appLang }) => {
  const isKm = appLang === 'km';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // States
  const [imagePreview, setImagePreview] = useState<string>('');
  const [targetLang, setTargetLang] = useState<string>('Khmer');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Handle Image File Selection
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      setImagePreview(b64);
      setOcrResult(null);
      setSelectedBlockIndex(null);
    };
    reader.readAsDataURL(file);
  };

  // Load Built-in Demo Comic/Story Page
  const loadDemoImage = () => {
    // Generate a high-contrast canvas with dialogue bubbles to test
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Dark cinematic comic panel background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 800, 600);

      // Panel borders
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.strokeRect(30, 30, 740, 260);
      ctx.strokeRect(30, 310, 740, 260);

      // Bubble 1 (Dialogue)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(60, 60, 320, 80, 20);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('Look over there! The portal', 80, 95);
      ctx.fillText('is opening right now!', 80, 120);

      // Bubble 2 (Heroine Response)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(420, 120, 330, 80, 20);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('We must hurry before the guardian', 440, 155);
      ctx.fillText('detects our presence!', 440, 180);

      // Panel 2 Narration box
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(60, 340, 680, 60);
      ctx.fillStyle = '#000000';
      ctx.font = 'italic 18px sans-serif';
      ctx.fillText('Chapter 1: The forgotten ruins awaken after a thousand years of silence...', 80, 375);

      const url = canvas.toDataURL('image/jpeg');
      setImagePreview(url);
      setOcrResult(null);
    }
  };

  // Run AI OCR & Translation
  const handleScanAndTranslate = async () => {
    if (!imagePreview) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/ocr-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imagePreview,
          targetLang,
        }),
      });

      const data = await res.json();
      if (data && Array.isArray(data.blocks)) {
        setOcrResult(data);
        if (data.blocks.length > 0) {
          setSelectedBlockIndex(0);
        }
      } else {
        alert(data.error || 'Failed to scan image');
      }
    } catch (e: any) {
      console.error(e);
      alert('Error during OCR: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Play Speech
  const playSpeech = (text: string) => {
    speakBrowserText(text, { rate: 1.0 });
  };

  const copyText = (txt: string, key: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>{isKm ? 'ស្កេនរូបភាព & បកប្រែរក្សាទម្រង់ដើម (Layout-Preserving OCR)' : 'Layout-Preserving OCR Translator'}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Multimodal Gemini
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {isKm 
                  ? 'ស្កេនទំព័ររឿងកំប្លែង សៀវភៅ ឬរូបថត subtitle ដោយរក្សាទីតាំងប្រអប់អត្ថបទដើម' 
                  : 'Scan comic pages, books, or screenshots while preserving spatial dialogue bubble coordinates'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden"
            />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={cameraInputRef}
              onChange={handleImageUpload}
              className="hidden"
            />

            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isKm ? 'ថតរូប' : 'Camera'}</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isKm ? 'បញ្ចូលរូបភាព' : 'Upload Image'}</span>
            </button>

            <button
              onClick={loadDemoImage}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-xs font-semibold text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{isKm ? 'ទំព័រគំរូ' : 'Sample Comic'}</span>
            </button>
          </div>
        </div>

        {/* Scan Bar: Language Selector & Scan Trigger */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold text-slate-400">
              {isKm ? 'បកប្រែទៅជាភាសា:' : 'Translate To:'}
            </span>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-indigo-300 focus:outline-none"
            >
              <option value="Khmer">ភាសាខ្មែរ (Khmer)</option>
              <option value="English">English</option>
              <option value="Thai">ภาษาไทย (Thai)</option>
              <option value="Chinese">中文 (Chinese)</option>
              <option value="Vietnamese">Tiếng Việt</option>
            </select>
          </div>

          <div className="flex items-center space-x-3">
            {ocrResult && (
              <button
                onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white"
              >
                {showBoundingBoxes ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4" />}
                <span>{isKm ? 'បង្ហាញប្រអប់ទីតាំង' : 'Show Boxes'}</span>
              </button>
            )}

            <button
              onClick={handleScanAndTranslate}
              disabled={isLoading || !imagePreview}
              className="flex items-center space-x-2 py-2 px-5 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-amber-600/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isKm ? 'AI កំពុងស្កេន...' : 'Scanning & Translating...'}</span>
                </>
              ) : (
                <>
                  <Scan className="w-4 h-4" />
                  <span>{isKm ? 'ស្កេន & បកប្រែភ្លាមៗ' : 'Scan & Translate'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dual Panel: Image Overlay Canvas Viewport + Detected Text Blocks List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Interactive Image Canvas with Bounding Boxes */}
          <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-3 flex items-center justify-center min-h-[380px] overflow-hidden relative">
            {imagePreview ? (
              <div className="relative inline-block max-w-full">
                <img
                  src={imagePreview}
                  alt="Scan target"
                  className="max-h-[500px] w-auto object-contain rounded-xl shadow-lg"
                />

                {/* OVERLAY BOUNDING BOXES (Normalized coordinates 0 to 1000) */}
                {showBoundingBoxes &&
                  ocrResult?.blocks?.map((block, idx) => {
                    const [ymin, xmin, ymax, xmax] = block.box_2d || [0, 0, 0, 0];
                    const top = `${(ymin / 1000) * 100}%`;
                    const left = `${(xmin / 1000) * 100}%`;
                    const width = `${((xmax - xmin) / 1000) * 100}%`;
                    const height = `${((ymax - ymin) / 1000) * 100}%`;
                    const isSelected = selectedBlockIndex === idx;

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedBlockIndex(idx)}
                        style={{ top, left, width, height }}
                        className={`absolute rounded cursor-pointer transition-all border-2 ${
                          isSelected
                            ? 'border-amber-400 bg-amber-500/25 ring-2 ring-amber-400/50 shadow-lg'
                            : 'border-indigo-400/80 bg-indigo-500/15 hover:border-indigo-300'
                        }`}
                      >
                        {/* Number Pin Tag */}
                        <span className="absolute -top-3 -left-3 w-5 h-5 rounded-full bg-amber-500 text-black font-extrabold text-[10px] flex items-center justify-center shadow-md">
                          {idx + 1}
                        </span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center p-8 text-slate-500">
                <Scan className="w-12 h-12 mx-auto text-slate-700 mb-2" />
                <p className="text-xs">{isKm ? 'សូមបញ្ចូលរូបភាព ឬចុច "ទំព័រគំរូ" ដើម្បីសាកល្បង' : 'Upload an image or click "Sample Comic" to start scanning'}</p>
              </div>
            )}
          </div>

          {/* Right: Block Breakdown & Side-by-Side Translated Reader */}
          <div className="lg:col-span-5 space-y-4">
            {ocrResult ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-200">
                    {isKm ? `បានរកឃើញ ${ocrResult.blocks.length} ប្រអប់អត្ថបទ` : `Detected ${ocrResult.blocks.length} text regions`}
                  </span>
                  {ocrResult.summary && (
                    <span className="text-[11px] text-indigo-400 truncate max-w-[180px]">
                      {ocrResult.summary}
                    </span>
                  )}
                </div>

                {/* List of text blocks */}
                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {ocrResult.blocks.map((b, idx) => {
                    const isSelected = selectedBlockIndex === idx;

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedBlockIndex(idx)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-slate-900 border-amber-500/80 ring-1 ring-amber-500/50'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-amber-400 flex items-center space-x-1.5">
                            <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 text-[10px] flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="capitalize">{b.category || 'Dialogue'}</span>
                          </span>

                          <div className="flex items-center space-x-1">
                            {/* Read Aloud Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                playSpeech(b.translatedText);
                              }}
                              className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                              title={isKm ? 'ស្តាប់សំឡេងអាន' : 'Listen'}
                            >
                              <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                            </button>

                            {/* Copy button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyText(b.translatedText, `block-${idx}`);
                              }}
                              className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                              title={isKm ? 'ចម្លង' : 'Copy'}
                            >
                              {copiedKey === `block-${idx}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Original Text */}
                        <p className="text-xs text-slate-400 italic mb-1.5 line-clamp-2">
                          "{b.originalText}"
                        </p>

                        {/* Translated Khmer Text */}
                        <p className="text-sm font-semibold text-slate-100 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                          {b.translatedText}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[300px] border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center p-6 text-center text-slate-500">
                <BookOpen className="w-10 h-10 text-slate-700 mb-2" />
                <p className="text-xs">{isKm ? 'អត្ថបទដែលស្កេនបាននឹងបង្ហាញនៅទីនេះ ជាមួយការបកប្រែជាភាសាខ្មែរ' : 'Detected comic and book dialogues will appear here with translations'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
