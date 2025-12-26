type Lang = "es" | "en" | "pt" | "it" | "de" | "ca" | "fr";

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
      isFinal: boolean;
    };
    length: number;
  };
}

interface WebSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => WebSpeechRecognition;
    webkitSpeechRecognition: new () => WebSpeechRecognition;
  }
}

export class WebSpeechRecognitionService {
  private recognition: WebSpeechRecognition | null = null;
  private partialCallback: ((transcript: string) => void) | null = null;
  private isRecording = false;
  private fullTranscript = '';
  private stopPromiseResolve: (() => void) | null = null;

  static isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  async available(): Promise<{ available: boolean }> {
    return { available: WebSpeechRecognitionService.isSupported() };
  }

  async requestPermissions(): Promise<void> {
    return Promise.resolve();
  }

  async addListener(event: string, callback: (data: { matches: string[] }) => void): Promise<void> {
    if (event === 'partialResults') {
      this.partialCallback = (transcript: string) => {
        callback({ matches: [transcript] });
      };
    }
    return Promise.resolve();
  }

  async removeAllListeners(): Promise<void> {
    this.partialCallback = null;
    return Promise.resolve();
  }

  async start(options: { language: string; maxResults?: number; partialResults?: boolean; popup?: boolean }): Promise<void> {
    if (!WebSpeechRecognitionService.isSupported()) {
      throw new Error('Web Speech API not supported');
    }

    if (this.isRecording && this.recognition) {
      console.warn('[WebSpeechRecognition] Ya está grabando, deteniendo primero');
      this.recognition.stop();
      this.isRecording = false;
    }

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognitionClass();

    this.recognition.continuous = true;
    this.recognition.interimResults = options.partialResults ?? true;
    this.recognition.lang = options.language;

    this.fullTranscript = '';

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      console.log('[WebSpeechRecognition] 🔔 onresult disparado, resultIndex:', event.resultIndex, 'length:', event.results.length);

      let finalTranscripts = '';
      let interimTranscript = '';

      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscripts += transcript + ' ';
          console.log('[WebSpeechRecognition] 🎯 FINAL[' + i + ']:', transcript);
        } else {
          interimTranscript += transcript;
          console.log('[WebSpeechRecognition] 📝 INTERIM[' + i + ']:', transcript);
        }
      }

      if (finalTranscripts) {
        this.fullTranscript = finalTranscripts;
      }

      const currentTranscript = this.fullTranscript + interimTranscript;
      console.log('[WebSpeechRecognition] 📊 fullTranscript:', this.fullTranscript);
      console.log('[WebSpeechRecognition] 📊 currentTranscript:', currentTranscript);

      if (this.partialCallback && currentTranscript.trim()) {
        this.partialCallback(currentTranscript.trim());
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('[WebSpeechRecognition] Error:', event.error);
      this.isRecording = false;
    };

    this.recognition.onend = () => {
      console.log('[WebSpeechRecognition] Ended');
      this.isRecording = false;
      if (this.stopPromiseResolve) {
        this.stopPromiseResolve();
        this.stopPromiseResolve = null;
      }
    };

    try {
      this.recognition.start();
      this.isRecording = true;
      console.log('[WebSpeechRecognition] ✅ Iniciado con idioma:', options.language);
    } catch (error) {
      console.error('[WebSpeechRecognition] Error al iniciar:', error);
      this.isRecording = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.recognition && this.isRecording) {
      console.log('[WebSpeechRecognition] 🛑 Deteniendo...');

      const stopPromise = new Promise<void>((resolve) => {
        this.stopPromiseResolve = resolve;
      });

      this.recognition.stop();

      await stopPromise;

      console.log('[WebSpeechRecognition] 🛑 Detenido. Transcripción final:', this.fullTranscript);
    }
  }

  getFullTranscript(): string {
    return this.fullTranscript.trim();
  }

  clearTranscript(): void {
    this.fullTranscript = '';
  }
}

export const webSpeechRecognition = new WebSpeechRecognitionService();
