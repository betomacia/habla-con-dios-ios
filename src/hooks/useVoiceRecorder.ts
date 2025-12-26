import { useCallback, useEffect, useRef, useState } from "react";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { webSpeechRecognition, WebSpeechRecognitionService } from '../services/WebSpeechRecognition';

type Lang = "es" | "en" | "pt" | "it" | "de" | "ca" | "fr";

type UseVoiceRecorder = {
  supported: boolean;
  recording: boolean;
  start: () => Promise<void>;
  pause: () => Promise<void>;
  cancel: () => void;
  startedAt: number | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  audioUrl: string | null;
  getTranscript: () => Promise<string>;
  remainingTime: number;
};

const LANG_TO_BCP47: Record<Lang, string> = {
  es: "es-ES",
  en: "en-US",
  pt: "pt-BR",
  it: "it-IT",
  de: "de-DE",
  fr: "fr-FR",
  ca: "es-ES"
};

const MAX_RECORDING_TIME = 30; // segundos

export default function useVoiceRecorder(lang: Lang): UseVoiceRecorder {
  const [supported, setSupported] = useState<boolean>(true);
  const [recording, setRecording] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [isWeb, setIsWeb] = useState<boolean>(false);
  const [remainingTime, setRemainingTime] = useState<number>(MAX_RECORDING_TIME);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transcriptRef = useRef<string>("");
  const accumulatedTranscriptRef = useRef<string>("");
  const currentChunkRef = useRef<string>("");
  const isWebRef = useRef<boolean>(false);
  const shouldKeepRecordingRef = useRef<boolean>(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoPauseCallbackRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    (async () => {
      const isWebPlatform = WebSpeechRecognitionService.isSupported();
      setIsWeb(isWebPlatform);
      isWebRef.current = isWebPlatform;

      if (isWebPlatform) {
        setSupported(true);
        console.log('[useVoiceRecorder] 🌐 Usando Web Speech API');
      } else {
        try {
          const { available } = await SpeechRecognition.available();
          setSupported(available);
          console.log('[useVoiceRecorder] 📱 Usando Capacitor Speech Recognition');
        } catch (error) {
          console.error('[useVoiceRecorder] Capacitor no disponible:', error);
          setSupported(false);
        }
      }
    })();

    return () => {
      shouldKeepRecordingRef.current = false;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      if (maxTimeTimeoutRef.current) {
        clearTimeout(maxTimeTimeoutRef.current);
        maxTimeTimeoutRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (isWebRef.current) {
        webSpeechRecognition.stop().catch(console.error);
        webSpeechRecognition.removeAllListeners().catch(console.error);
      } else {
        SpeechRecognition.stop().catch(() => {});
        SpeechRecognition.removeAllListeners().catch(() => {});
      }
    };
  }, []);

  const start = useCallback(async () => {
    try {
      console.log('[useVoiceRecorder] 🎤 Iniciando...', lang, isWeb ? '(Web)' : '(Native)');

      shouldKeepRecordingRef.current = true;
      transcriptRef.current = '';
      accumulatedTranscriptRef.current = '';
      currentChunkRef.current = '';

      if (isWeb) {
        const { available } = await webSpeechRecognition.available();
        if (!available) {
          console.error('[useVoiceRecorder] Web Speech API no disponible');
          return;
        }

        await webSpeechRecognition.requestPermissions();
        await webSpeechRecognition.removeAllListeners();

        await webSpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
          if (data.matches && data.matches.length > 0) {
            transcriptRef.current = data.matches[0];
            console.log('[useVoiceRecorder] 📝', data.matches[0]);
          }
        });

        await webSpeechRecognition.start({
          language: LANG_TO_BCP47[lang],
          maxResults: 1,
          partialResults: true,
          popup: false
        });
      } else {
        console.log('[useVoiceRecorder] 📱 iOS - Verificando disponibilidad...');
        const { available } = await SpeechRecognition.available();
        console.log('[useVoiceRecorder] 📱 iOS - Disponible:', available);
        if (!available) {
          console.error('[useVoiceRecorder] Capacitor Speech Recognition no disponible');
          return;
        }

        console.log('[useVoiceRecorder] 📱 iOS - Solicitando permisos...');
        const permissions = await SpeechRecognition.requestPermissions();
        console.log('[useVoiceRecorder] 📱 iOS - Permisos:', permissions);

        console.log('[useVoiceRecorder] 📱 iOS - Removiendo listeners anteriores...');
        await SpeechRecognition.removeAllListeners();

        await SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
          console.log('[useVoiceRecorder] 📱 iOS partialResults recibido:', data);
          if (data.matches && data.matches.length > 0) {
            const latestResult = data.matches[data.matches.length - 1];
            currentChunkRef.current = latestResult;
            console.log('[useVoiceRecorder] 📝 Chunk actual:', latestResult);
          } else {
            console.warn('[useVoiceRecorder] ⚠️ iOS partialResults sin matches');
          }
        });

        await SpeechRecognition.addListener('end', () => {
          console.log('[useVoiceRecorder] 🎧 END detectado');
          if (shouldKeepRecordingRef.current) {
            if (currentChunkRef.current.trim()) {
              accumulatedTranscriptRef.current = (accumulatedTranscriptRef.current + " " + currentChunkRef.current).trim();
              transcriptRef.current = accumulatedTranscriptRef.current;
              console.log('[useVoiceRecorder] 💾 Guardado chunk:', currentChunkRef.current);
              console.log('[useVoiceRecorder] 💾 Acumulado total:', accumulatedTranscriptRef.current);
              currentChunkRef.current = '';
            }
            console.log('[useVoiceRecorder] 🔄 Auto-detenido por Android, reiniciando en 50ms...');
            if (restartTimeoutRef.current) {
              clearTimeout(restartTimeoutRef.current);
            }
            restartTimeoutRef.current = setTimeout(async () => {
              if (shouldKeepRecordingRef.current) {
                try {
                  console.log('[useVoiceRecorder] 🔄 Reiniciando reconocimiento...');
                  await SpeechRecognition.start({
                    language: LANG_TO_BCP47[lang],
                    maxResults: 5,
                    partialResults: true,
                    popup: false
                  });
                  console.log('[useVoiceRecorder] ✅ Reiniciado exitosamente');
                } catch (error) {
                  console.error('[useVoiceRecorder] ❌ Error al reiniciar:', error);
                  setRecording(false);
                  setStartedAt(null);
                  shouldKeepRecordingRef.current = false;
                }
              }
            }, 50);
          }
        });

        console.log('[useVoiceRecorder] 📱 iOS - Iniciando reconocimiento con:', {
          language: LANG_TO_BCP47[lang],
          maxResults: 5,
          partialResults: true,
          popup: false
        });
        await SpeechRecognition.start({
          language: LANG_TO_BCP47[lang],
          maxResults: 5,
          partialResults: true,
          popup: false
        });
        console.log('[useVoiceRecorder] 📱 iOS - Reconocimiento iniciado exitosamente');
      }

      setRecording(true);
      setStartedAt(Date.now());
      setRemainingTime(MAX_RECORDING_TIME);

      // Timer de cuenta regresiva (actualiza cada segundo)
      countdownIntervalRef.current = setInterval(() => {
        setRemainingTime(prev => {
          const newTime = Math.max(0, prev - 1);
          return newTime;
        });
      }, 1000);

      // Timer de 30 segundos para auto-detener
      maxTimeTimeoutRef.current = setTimeout(async () => {
        console.log('[useVoiceRecorder] ⏰ Tiempo máximo alcanzado (30s), deteniendo automáticamente...');
        if (autoPauseCallbackRef.current) {
          await autoPauseCallbackRef.current();
        }
      }, MAX_RECORDING_TIME * 1000);

      console.log('[useVoiceRecorder] ✅ Iniciado');
    } catch (error) {
      console.error('[useVoiceRecorder] Error:', error);
      setRecording(false);
      setStartedAt(null);
    }
  }, [lang, isWeb]);

  const pause = useCallback(async () => {
    try {
      console.log('[useVoiceRecorder] 🛑 Deteniendo...', isWeb ? '(Web)' : '(Native iOS)');

      shouldKeepRecordingRef.current = false;

      // Limpiar todos los timers
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      if (maxTimeTimeoutRef.current) {
        clearTimeout(maxTimeTimeoutRef.current);
        maxTimeTimeoutRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }

      if (isWeb) {
        await webSpeechRecognition.stop();
        await webSpeechRecognition.removeAllListeners();
      } else {
        console.log('[useVoiceRecorder] 📱 iOS - Deteniendo reconocimiento...');
        console.log('[useVoiceRecorder] 📱 iOS - Estado antes de detener:', {
          currentChunk: currentChunkRef.current || '(vacío)',
          accumulated: accumulatedTranscriptRef.current || '(vacío)'
        });
        await SpeechRecognition.stop();
        await SpeechRecognition.removeAllListeners();
        console.log('[useVoiceRecorder] 📱 iOS - Reconocimiento detenido');
      }

      setRecording(false);
      setStartedAt(null);
      setRemainingTime(MAX_RECORDING_TIME);

      console.log('[useVoiceRecorder] ✅ Final:', transcriptRef.current || '(vacío)');
    } catch (error) {
      console.error('[useVoiceRecorder] Error:', error);
      setRecording(false);
      setStartedAt(null);
    }
  }, [isWeb]);

  const cancel = useCallback(async () => {
    try {
      console.log('[useVoiceRecorder] ❌ Cancelando...');

      shouldKeepRecordingRef.current = false;

      // Limpiar todos los timers
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      if (maxTimeTimeoutRef.current) {
        clearTimeout(maxTimeTimeoutRef.current);
        maxTimeTimeoutRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }

      if (isWeb) {
        await webSpeechRecognition.stop();
        await webSpeechRecognition.removeAllListeners();
        webSpeechRecognition.clearTranscript();
      } else {
        await SpeechRecognition.stop();
        await SpeechRecognition.removeAllListeners();
      }

      setRecording(false);
      setStartedAt(null);
      setRemainingTime(MAX_RECORDING_TIME);
      transcriptRef.current = "";
      accumulatedTranscriptRef.current = "";
      currentChunkRef.current = "";
      setAudioUrl(null);
    } catch (error) {
      console.error('[useVoiceRecorder] Error al cancelar:', error);
    }
  }, [isWeb]);

  const getTranscript = useCallback(async (): Promise<string> => {
    if (isWeb) {
      const transcript = webSpeechRecognition.getFullTranscript();
      console.log("[useVoiceRecorder] 📝 getTranscript (Web):", transcript || "(vacío)");
      return transcript;
    } else {
      console.log("[useVoiceRecorder] 📱 iOS getTranscript - Estado:");
      console.log("  - currentChunkRef:", currentChunkRef.current || "(vacío)");
      console.log("  - accumulatedTranscriptRef:", accumulatedTranscriptRef.current || "(vacío)");
      console.log("  - transcriptRef:", transcriptRef.current || "(vacío)");

      if (currentChunkRef.current.trim()) {
        accumulatedTranscriptRef.current = (accumulatedTranscriptRef.current + " " + currentChunkRef.current).trim();
        console.log("[useVoiceRecorder] 💾 Guardando último chunk:", currentChunkRef.current);
        currentChunkRef.current = '';
      }
      transcriptRef.current = accumulatedTranscriptRef.current;
      console.log("[useVoiceRecorder] 📝 getTranscript (Native) FINAL:", transcriptRef.current || "(vacío)");
      return transcriptRef.current.trim();
    }
  }, [isWeb]);

  // Actualizar el ref de auto-pause cuando cambie la función pause
  useEffect(() => {
    autoPauseCallbackRef.current = pause;
  }, [pause]);

  return {
    supported,
    recording,
    start,
    pause,
    cancel,
    startedAt,
    canvasRef,
    audioUrl,
    getTranscript,
    remainingTime,
  };
}

export async function sendAudioToBackend(
  audioUrl: string,
  backendUrl: string,
  lang: Lang
): Promise<string> {
  try {
    const blob = await fetch(audioUrl).then(r => r.blob());
    const formData = new FormData();
    formData.append("audio", blob, "audio.webm");
    formData.append("lang", lang);

    const res = await fetch(`${backendUrl}/stt`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(`Backend STT error: ${res.status}`);
    const json = await res.json();
    return json.text || "";
  } catch (err) {
    console.error("[sendAudioToBackend] error:", err);
    return "";
  }
}
