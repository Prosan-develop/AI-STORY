/**
 * Khmer and Multilingual Speech Synthesis & Free Local Speech-to-Text
 */

export interface AvailableVoice {
  name: string;
  lang: string;
  voice: SpeechSynthesisVoice;
}

export function getBrowserVoices(): Promise<AvailableVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return resolve([]);
    }

    let voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(
        voices.map((v) => ({
          name: v.name,
          lang: v.lang,
          voice: v,
        }))
      );
      return;
    }

    // Chrome loads voices asynchronously
    window.speechSynthesis.onvoiceschanged = () => {
      voices = window.speechSynthesis.getVoices();
      resolve(
        voices.map((v) => ({
          name: v.name,
          lang: v.lang,
          voice: v,
        }))
      );
    };

    // Timeout fallback
    setTimeout(() => {
      const current = window.speechSynthesis.getVoices();
      resolve(
        current.map((v) => ({
          name: v.name,
          lang: v.lang,
          voice: v,
        }))
      );
    }, 500);
  });
}

/**
 * Play text using browser SpeechSynthesis (free local speech, works offline)
 */
export function speakBrowserText(
  text: string,
  options?: {
    lang?: string;
    rate?: number;
    pitch?: number;
    voiceName?: string;
    onEnd?: () => void;
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return reject(new Error('SpeechSynthesis is not supported in this browser.'));
    }

    window.speechSynthesis.cancel(); // Stop any pending utterance

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? 1.0;
    utterance.pitch = options?.pitch ?? 1.0;

    // Detect language or use requested
    const lang = options?.lang || (containsKhmer(text) ? 'km-KH' : 'en-US');
    utterance.lang = lang;

    const voices = window.speechSynthesis.getVoices();
    if (options?.voiceName) {
      const found = voices.find((v) => v.name === options.voiceName);
      if (found) utterance.voice = found;
    } else {
      // Find matching language voice if any
      const matching = voices.find((v) => v.lang.startsWith(lang.slice(0, 2)));
      if (matching) utterance.voice = matching;
    }

    utterance.onend = () => {
      options?.onEnd?.();
      resolve();
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      options?.onEnd?.();
      resolve(); // graceful resolve
    };

    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function containsKhmer(text: string): boolean {
  // Khmer Unicode block: \u1780-\u17FF and \u19E0-\u19FF
  return /[\u1780-\u17FF\u19E0-\u19FF]/.test(text);
}

/**
 * Free Local Speech-to-Text using Browser Web Speech Recognition
 */
export class LocalSpeechRecognition {
  private recognition: any = null;
  public isListening: boolean = false;

  constructor(
    private onResult: (text: string, isFinal: boolean) => void,
    private onError: (err: string) => void,
    private onStatusChange?: (isListening: boolean) => void
  ) {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'km-KH'; // default Khmer, can toggle to en-US

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          this.onResult(finalTranscript, true);
        } else if (interimTranscript) {
          this.onResult(interimTranscript, false);
        }
      };

      this.recognition.onerror = (event: any) => {
        this.onError(event.error || 'Speech recognition error');
        this.isListening = false;
        this.onStatusChange?.(false);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.onStatusChange?.(false);
      };
    }
  }

  public setLanguage(lang: string) {
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  public start() {
    if (!this.recognition) {
      this.onError('Speech Recognition is not supported by your browser. Please use Chrome/Edge or Gemini Cloud Transcribe.');
      return;
    }
    try {
      this.recognition.start();
      this.isListening = true;
      this.onStatusChange?.(true);
    } catch (e: any) {
      this.onError(e.message || 'Could not start microphone recognition');
    }
  }

  public stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      this.onStatusChange?.(false);
    }
  }
}
