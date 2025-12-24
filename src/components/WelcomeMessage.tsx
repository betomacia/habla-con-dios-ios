import { useEffect, useRef } from "react";
import { Volume2 } from "lucide-react";

interface Props {
  language: string;
  name: string;
  message: string;
  question: string;
  onContinue: () => void;
  onReset: () => void;
  /** Canal WebRTC opcional ya activo */
  ttsChannel?: RTCDataChannel | null;
}

/**
 * 🎙️ WelcomeMessage con voz integrada (PCM chunks desde servidor TTS)
 * Compatible con WebRTC y fallback REST /tts/stream.
 */
export default function WelcomeMessage({
  language,
  name,
  message,
  question,
  onContinue,
  onReset,
  ttsChannel,
}: Props) {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getText = (key: string) => {
    const texts: Record<string, Record<string, string>> = {
      continueBtn: {
        es: "Continuar",
        en: "Continue",
        pt: "Continuar",
        it: "Continua",
        de: "Weiter",
        ca: "Continuar",
        fr: "Continuer",
      },
      backBtn: {
        es: "Volver",
        en: "Back",
        pt: "Voltar",
        it: "Indietro",
        de: "Zurück",
        ca: "Tornar",
        fr: "Retour",
      },
    };
    return texts[key]?.[language] || texts[key]?.["es"] || "";
  };

  /** 🔊 reproduce audio PCM con baja latencia */
  async function playPCM(base64PCM: string, sr = 24000) {
    try {
      if (!audioCtxRef.current)
        audioCtxRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)({
          sampleRate: sr,
        });

      const ctx = audioCtxRef.current;
      const bin = Uint8Array.from(atob(base64PCM), (c) => c.charCodeAt(0)).buffer;
      const buffer = await ctx.decodeAudioData(bin);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start();
    } catch (err) {
      console.error("[Welcome TTS] Error decodificando audio:", err);
    }
  }

  /** 🚀 Lógica de reproducción automática */
  useEffect(() => {
    if (!message?.trim()) return;

    const texto = `${name ? name + ", " : ""}${message} ${
      question ? question : ""
    }`.trim();

    // --- 🔗 Si hay canal WebRTC activo ---
    if (ttsChannel && ttsChannel.readyState === "open") {
      console.log("[Welcome] Enviando mensaje TTS por WebRTC");
      try {
        ttsChannel.send(
          JSON.stringify({
            text: texto,
            lang: language,
            route: "audio_on",
            sessionId: `welcome-${Date.now()}`,
          })
        );
      } catch (err) {
        console.error("[Welcome] Error enviando por WebRTC:", err);
      }
      return;
    }

    // --- 🌐 Si no hay WebRTC, usar REST stream ---
    (async () => {
      try {
        console.log("[Welcome] Fallback /tts/stream");
        const response = await fetch("https://voz.movilive.es/tts/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: texto, lang: language }),
        });

        if (!response.body) {
          console.error("[Welcome] ❌ No hay stream en respuesta");
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        async function process({ done, value }: any): Promise<void> {
          if (done) {
            console.log("[Welcome] 🏁 Transmisión finalizada");
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const event = JSON.parse(line);
              // acepta tanto "audio" como "data"
              const base64 = event.audio || event.data;
              if (event.event === "chunk" && base64) {
                await playPCM(base64, event.sample_rate || 24000);
              }
            } catch (err) {
              console.warn("[Welcome] Error procesando chunk:", err);
            }
          }

          return reader.read().then(process);
        }

        await reader.read().then(process);
      } catch (err) {
        console.error("[Welcome] ❌ Error general:", err);
      }
    })();

    return () => {
      try {
        audioCtxRef.current?.close();
      } catch {}
    };
  }, [message, question, language, name, ttsChannel]);

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-6">
      {/* Ícono de audio */}
      <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-full mb-4 mx-auto">
        <Volume2 className="w-9 h-9 text-white" />
      </div>

      {/* Mensaje personalizado */}
      <div className="mb-6 text-center">
        <p className="text-lg text-gray-800 mb-4 whitespace-pre-line">
          {message}
        </p>

        {question && (
          <p className="text-base text-gray-700 italic">{question}</p>
        )}
      </div>

      {/* Botones */}
      <div className="space-y-3">
        <button
          onClick={onContinue}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-150 shadow-lg hover:shadow-xl text-base"
        >
          {getText("continueBtn")}
        </button>

        <button
          onClick={onReset}
          className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-8 rounded-xl transition-all duration-150 text-sm"
        >
          {getText("backBtn")}
        </button>
      </div>
    </div>
  );
}
