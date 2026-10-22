import React from 'react';
import { 
  Sparkles, 
  Cloud, 
  ShieldCheck, 
  Download, 
  Upload, 
  Languages, 
  RefreshCw,
  Sliders,
  Laptop
} from 'lucide-react';

interface HeaderProps {
  appLang: 'km' | 'en';
  setAppLang: (lang: 'km' | 'en') => void;
  onOpenBackup: () => void;
  isSyncing: boolean;
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = ({
  appLang,
  setAppLang,
  onOpenBackup,
  isSyncing,
}) => {
  const isKm = appLang === 'km';

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold tracking-tight text-lg bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
                KromStory <span className="text-indigo-400">AI</span>
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Studio Pro
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              {isKm 
                ? 'កម្មវិធីសម្រាយរឿង • បកប្រែសំឡេង • កែសម្រួល SRT & វីដេអូ' 
                : 'AI Story Explainer • Vocal Remover • SRT Subtitle Studio'}
            </p>
          </div>
        </div>

        {/* Status Indicators & Action Tools */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Cloud Sync & Security Badge */}
          <button
            onClick={onOpenBackup}
            title={isKm ? 'ការបម្រុងទុកទិន្នន័យលើពពក និងប្រព័ន្ធសុវត្ថិភាព' : 'Cloud Backup & Data Security'}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-300 hover:text-white transition-all shadow-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isSyncing ? 'bg-amber-400' : 'bg-emerald-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isSyncing ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
            </span>
            <Cloud className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline font-medium">
              {isSyncing ? (isKm ? 'កំពុង Sync...' : 'Syncing...') : (isKm ? 'ពពក & សុវត្ថិភាព' : 'Cloud Sync')}
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 hidden lg:inline" />
          </button>

          {/* Language Toggle (Khmer / English) */}
          <button
            onClick={() => setAppLang(appLang === 'km' ? 'en' : 'km')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-semibold text-indigo-200 transition-colors"
            title="ប្ដូរភាសា / Switch Language"
          >
            <Languages className="w-3.5 h-3.5 text-indigo-400" />
            <span>{appLang === 'km' ? 'ភាសាខ្មែរ (KM)' : 'English (EN)'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
