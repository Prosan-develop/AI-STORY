/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  FileText, 
  Volume2, 
  Activity, 
  Zap, 
  Scan, 
  Mic, 
  Film,
  Layers,
  ShieldCheck,
  Smartphone,
  Cloud
} from 'lucide-react';
import { SrtItem } from './types';
import { loadStoredSrtItems, saveStoredSrtItems } from './utils/storage';
import { Header } from './components/Header';
import { StoryRecapTranslator } from './components/StoryRecapTranslator';
import { SrtEditorStudio } from './components/SrtEditorStudio';
import { MultiSpeakerTts } from './components/MultiSpeakerTts';
import { VocalRemover } from './components/VocalRemover';
import { VoiceChanger } from './components/VoiceChanger';
import { OcrImageTranslator } from './components/OcrImageTranslator';
import { SpeechToTextStudio } from './components/SpeechToTextStudio';
import { BackupModal } from './components/BackupModal';

export type MainTab = 
  | 'recap' 
  | 'srt' 
  | 'tts' 
  | 'vocal' 
  | 'voicechanger' 
  | 'ocr' 
  | 'stt';

export default function App() {
  const [appLang, setAppLang] = useState<'km' | 'en'>('km');
  const [activeTab, setActiveTab] = useState<MainTab>('recap');
  const [srtList, setSrtList] = useState<SrtItem[]>([]);
  const [isBackupOpen, setIsBackupOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const isKm = appLang === 'km';

  // Load stored SRT items on initial mount
  useEffect(() => {
    const loaded = loadStoredSrtItems();
    setSrtList(loaded);

    // Auto-sync simulation every 60s
    const timer = setInterval(() => {
      setIsSyncing(true);
      setTimeout(() => setIsSyncing(false), 1500);
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Transfer created script or speech lines directly to SRT Subtitle Studio
  const handleTransferToSrt = (newItems: SrtItem[]) => {
    setSrtList(newItems);
    saveStoredSrtItems(newItems);
    setActiveTab('srt');
  };

  // Transfer SRT to Multi-Speaker TTS Dubbing
  const handleSendToMultiSpeakerTts = (items: SrtItem[]) => {
    setSrtList(items);
    setActiveTab('tts');
  };

  const navItems = [
    {
      id: 'recap',
      labelKm: 'សម្រាយរឿង & បកប្រែ',
      labelEn: 'Story Recap & Translate',
      icon: Sparkles,
      color: 'from-amber-400 to-indigo-500',
    },
    {
      id: 'srt',
      labelKm: 'កែប្រែ SRT & វីដេអូ',
      labelEn: 'SRT Editor & Video',
      icon: Film,
      color: 'from-indigo-500 to-purple-500',
    },
    {
      id: 'tts',
      labelKm: 'សំឡេង SRT ប្រុសស្រី',
      labelEn: 'Multi-Speaker TTS',
      icon: Volume2,
      color: 'from-purple-500 to-pink-500',
    },
    {
      id: 'vocal',
      labelKm: 'កាត់សំឡេងចម្រៀង',
      labelEn: 'Vocal Remover',
      icon: Activity,
      color: 'from-cyan-400 to-blue-500',
    },
    {
      id: 'voicechanger',
      labelKm: 'កែសម្រួល & ដូរសំឡេង',
      labelEn: 'Voice Changer',
      icon: Zap,
      color: 'from-fuchsia-500 to-purple-600',
    },
    {
      id: 'ocr',
      labelKm: 'ស្កេនរូបភាព OCR',
      labelEn: 'Image OCR Translate',
      icon: Scan,
      color: 'from-amber-500 to-orange-500',
    },
    {
      id: 'stt',
      labelKm: 'Transcript សំឡេង',
      labelEn: 'Speech to Text',
      icon: Mic,
      color: 'from-emerald-400 to-teal-500',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <Header
        appLang={appLang}
        setAppLang={setAppLang}
        onOpenBackup={() => setIsBackupOpen(true)}
        isSyncing={isSyncing}
        activeTab={activeTab}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24 md:pb-12">
        {/* Navigation Tabs Bar for Desktop and Tablet */}
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 p-1.5 rounded-2xl shadow-sm overflow-x-auto scrollbar-none">
          <div className="flex space-x-1.5 min-w-max">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as MainTab)}
                  className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{isKm ? item.labelKm : item.labelEn}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Workspace Active Views */}
        <div className="transition-all duration-200">
          {activeTab === 'recap' && (
            <StoryRecapTranslator
              appLang={appLang}
              onTransferToSrt={handleTransferToSrt}
            />
          )}

          {activeTab === 'srt' && (
            <SrtEditorStudio
              appLang={appLang}
              srtList={srtList}
              setSrtList={setSrtList}
              onSendToMultiSpeakerTts={handleSendToMultiSpeakerTts}
            />
          )}

          {activeTab === 'tts' && (
            <MultiSpeakerTts
              appLang={appLang}
              srtList={srtList}
            />
          )}

          {activeTab === 'vocal' && (
            <VocalRemover appLang={appLang} />
          )}

          {activeTab === 'voicechanger' && (
            <VoiceChanger appLang={appLang} />
          )}

          {activeTab === 'ocr' && (
            <OcrImageTranslator appLang={appLang} />
          )}

          {activeTab === 'stt' && (
            <SpeechToTextStudio
              appLang={appLang}
              onTransferToSrt={handleTransferToSrt}
            />
          )}
        </div>
      </main>

      {/* Mobile Sticky Bottom Navigation Bar (iOS & Android App Feel) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-2 flex justify-around items-center text-[10px]">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as MainTab)}
              className={`flex flex-col items-center space-y-1 p-1 rounded-lg transition-colors ${
                isActive ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate max-w-[62px]">
                {isKm 
                  ? item.id === 'recap' ? 'សម្រាយ' : item.id === 'srt' ? 'SRT' : item.id === 'tts' ? 'សំឡេង' : item.id === 'vocal' ? 'កាត់ភ្លេង' : 'ដូរសំឡេង' 
                  : item.id.toUpperCase()}
              </span>
            </button>
          );
        })}

        {/* More Tab Button for mobile */}
        <button
          onClick={() => setActiveTab(activeTab === 'ocr' ? 'stt' : 'ocr')}
          className={`flex flex-col items-center space-y-1 p-1 rounded-lg transition-colors ${
            activeTab === 'ocr' || activeTab === 'stt' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scan className="w-4 h-4" />
          <span>{isKm ? 'ស្កេន/STT' : 'OCR/STT'}</span>
        </button>
      </nav>

      {/* Cloud Backup & Security Modal */}
      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        appLang={appLang}
        onBackupRestored={() => setSrtList(loadStoredSrtItems())}
      />
    </div>
  );
}
