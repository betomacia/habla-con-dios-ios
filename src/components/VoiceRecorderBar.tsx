// ======================================================
// 🎙️ VoiceRecorderBar.tsx
// Componente tipo WhatsApp Voice Message
// Permite grabar, escuchar, borrar o enviar un audio
// con soporte visual de ondas (useVoiceRecorder).
// ======================================================

import React, { useState, useRef, useEffect } from "react";
import { Mic, Play, Pause, Trash2, Send } from "lucide-react";
import useVoiceRecorder, { sendAudioToBackend } from "../hooks/useVoiceRecorder";

type Lang = "es" | "en" | "pt" | "it" | "de" | "ca" | "fr";

export default function VoiceRecorderBar({
  lang,
  backendUrl,
  onSendText,
}: {
  lang: Lang;
  backendUrl: string;
  onSendText: (text: string) => void;
}) {
  const { supported, recording, start, pause, cancel, audioUrl, canvasRef, getTranscript, remainingTime } =
    useVoiceRecorder(lang);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wasRecordingRef = useRef(false);
  const onSendTextRef = useRef(onSendText);
  const getTranscriptRef = useRef(getTranscript);
  const cancelRef = useRef(cancel);

  // Mantener refs actualizadas
  useEffect(() => {
    onSendTextRef.current = onSendText;
    getTranscriptRef.current = getTranscript;
    cancelRef.current = cancel;
  }, [onSendText, getTranscript, cancel]);

  // Detectar cuando la grabación se detiene (manual o automáticamente)
  useEffect(() => {
    const handleRecordingStop = async () => {
      if (wasRecordingRef.current && !recording) {
        // La grabación acaba de detenerse
        console.log('🛑 Grabación detenida, obteniendo transcripción...');
        const transcript = await getTranscriptRef.current();
        console.log('📝 Transcripción obtenida (auto-send):', transcript);

        if (transcript && transcript.trim()) {
          console.log('✅ Enviando mensaje automáticamente...');
          onSendTextRef.current(transcript);
          // Limpiar después de enviar
          cancelRef.current();
          setPlaying(false);
        } else {
          console.log('⚠️ No hay transcripción para enviar');
        }
      }
      wasRecordingRef.current = recording;
    };

    handleRecordingStop();
  }, [recording]);

  // 🎙️ Toggle grabación - click para iniciar/detener
  const handleToggleRecording = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();

    if (recording) {
      // Detener (el useEffect se encargará de enviar)
      console.log("🛑 DETENIENDO GRABACIÓN (manual)");
      await pause();
    } else {
      // Iniciar grabación
      console.log("🎤 INICIANDO GRABACIÓN");
      if (supported) await start();
    }
  };

  // ▶️ Reproduce el audio grabado
  const handlePlay = () => {
    if (!audioUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  // ❌ Cancela la grabación
  const handleCancel = () => {
    cancel();
    setPlaying(false);
  };

  // 📤 Envía el audio al backend (y opcionalmente transcribe)
  const handleSend = async () => {
    if (!audioUrl) return;
    const transcript =
      (await getTranscript()) || (await sendAudioToBackend(audioUrl, backendUrl, lang));
    if (transcript) onSendText(transcript);
    handleCancel();
  };

  return (
    <div className="flex flex-col items-center p-3 bg-white/80 backdrop-blur-md rounded-2xl shadow-lg mt-2">
      {/* Canvas con ondas */}
      <canvas
        ref={canvasRef}
        className="rounded-lg bg-gray-50 mb-3 border border-gray-200 w-[80vw] max-w-[260px] h-[60px]"
      />

      {/* Estado 1: grabando */}
      {recording && (
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm font-medium text-gray-600">
            {remainingTime}s restantes
          </div>
          <button
            onClick={handleToggleRecording}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white font-semibold rounded-full shadow active:scale-95"
          >
            <Mic className="w-5 h-5 animate-pulse" />
            {lang === "es" ? "🔴 Presiona para detener" : "🔴 Click to stop"}
          </button>
        </div>
      )}

      {/* Estado 2: grabado (play, borrar, enviar) */}
      {!recording && audioUrl && (
        <div className="flex items-center gap-4">
          <button
            onClick={handlePlay}
            className="p-3 bg-emerald-600 text-white rounded-full shadow active:scale-95"
            title={playing ? "Pausar" : "Reproducir"}
          >
            {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>

          <button
            onClick={handleCancel}
            className="p-3 bg-gray-300 text-gray-800 rounded-full shadow active:scale-95"
            title="Borrar"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          <button
            onClick={handleSend}
            className="p-3 bg-emerald-600 text-white rounded-full shadow active:scale-95"
            title="Enviar"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Estado 3: listo para grabar */}
      {!recording && !audioUrl && (
        <button
          onClick={handleToggleRecording}
          className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white font-semibold rounded-full shadow active:scale-95"
        >
          <Mic className="w-5 h-5" />
          {lang === "es" ? "Presiona para grabar" : "Click to record"}
        </button>
      )}
    </div>
  );
}
