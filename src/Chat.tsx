import React, { useCallback, useEffect, useRef, useState } from "react";
import { Send, Mic, AlertCircle, CreditCard, X } from "lucide-react";
import type { Language } from "./App";
import type { SubscriptionStatus, ConversationMode } from "./services/types";
import useVoiceRecorder, { sendAudioToBackend } from "./hooks/useVoiceRecorder";
import { analyticsService } from "./services/AnalyticsService";
import { conversationService } from "./services/ConversationService";
import { CREDITS_PER_MODE } from "./services/types";
import InsufficientCreditsModal from "./components/InsufficientCreditsModal";
import DateSeparator from "./components/DateSeparator";
import { AudioRecorderService } from "./services/AudioRecorderService";
import { TranscriptionService } from "./services/TranscriptionService";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { Capacitor } from "@capacitor/core";
import { AuthService } from "./services/AuthService";

const WAPP_GREEN = "#25D366";
const WAPP_BUBBLE_USER = "#DCF8C6";
const WAPP_BUBBLE_BOT = "#FFFFFF";


const BACKGROUNDS: Record<string, string> = {
  initial: "https://raw.githubusercontent.com/betomacia/jesus-backend/main/public/FFONDO.jpeg",
  es: "https://raw.githubusercontent.com/betomacia/jesus-backend/main/public/FESPANOL.jpeg",
  en: "https://raw.githubusercontent.com/betomacia/jesus-backend/main/public/FINGLES.jpeg",
  pt: "https://raw.githubusercontent.com/betomacia/jesus-backend/main/public/FPORTUGUES.jpeg",
  it: "https://raw.githubusercontent.com/betomacia/jesus-backend/main/public/FITALIANO.jpeg",
  de: "https://raw.githubusercontent.com/betomacia/jesus-backend/main/public/FALEMAN.jpeg",
  fr: "https://raw.githubusercontent.com/betomacia/jesus-backend/main/public/FFRANCES.jpeg",
};

const I18N = {
  writeOrHold: {
    es: "Escribe o toca el micrófono para hablar",
    en: "Type or tap mic to talk",
    pt: "Escreva ou toque no microfone para falar",
    it: "Scrivi o tocca il microfono per parlare",
    de: "Schreibe oder tippe aufs Mikro zum Sprechen",
    fr: "Écris ou touche le micro pour parler",
  },
  send: { es: "Enviar", en: "Send", pt: "Enviar", it: "Invia", de: "Senden", fr: "Envoyer" },
  typing: {
    es: "Dios está respondiendo...",
    en: "God is responding...",
    pt: "Deus está respondendo...",
    it: "Dio sta rispondendo...",
    de: "Gott antwortet...",
    fr: "Dieu répond...",
  },
  recording: {
    es: "Grabando...",
    en: "Recording...",
    pt: "Gravando...",
    it: "Registrando...",
    de: "Aufnahme...",
    fr: "Enregistrement...",
  },
  insufficientCreditsTitle: {
    es: "Créditos insuficientes",
    en: "Insufficient credits",
    pt: "Créditos insuficientes",
    it: "Crediti insufficienti",
    de: "Unzureichende Credits",
    fr: "Crédits insuffisants",
  },
  insufficientCreditsMessage: {
    es: "No tienes suficientes créditos para enviar esta pregunta. Compra más créditos para continuar.",
    en: "You don't have enough credits to send this question. Purchase more credits to continue.",
    pt: "Você não tem créditos suficientes para enviar esta pergunta. Compre mais créditos para continuar.",
    it: "Non hai abbastanza crediti per inviare questa domanda. Acquista più crediti per continuare.",
    de: "Du hast nicht genug Credits, um diese Frage zu senden. Kaufe mehr Credits, um fortzufahren.",
    fr: "Vous n'avez pas assez de crédits pour envoyer cette question. Achetez plus de crédits pour continuer.",
  },
  buyCredits: {
    es: "Comprar créditos",
    en: "Buy credits",
    pt: "Comprar créditos",
    it: "Acquista crediti",
    de: "Credits kaufen",
    fr: "Acheter des crédits",
  },
  close: {
    es: "Cerrar",
    en: "Close",
    pt: "Fechar",
    it: "Chiudi",
    de: "Schließen",
    fr: "Fermer",
  },
  creditProtection: {
    es: "Protección de Créditos",
    en: "Credit Protection",
    pt: "Proteção de Créditos",
    it: "Protezione Crediti",
    de: "Kreditschutz",
    fr: "Protection des Crédits",
  },
  inactivityMessage: {
    es: "El video se ha pausado por inactividad para proteger tus créditos.",
    en: "Video paused due to inactivity to protect your credits.",
    pt: "O vídeo foi pausado por inatividade para proteger seus créditos.",
    it: "Il video è stato messo in pausa per inattività per proteggere i tuoi crediti.",
    de: "Video wurde wegen Inaktivität angehalten, um deine Credits zu schützen.",
    fr: "La vidéo a été mise en pause en raison d'inactivité pour protéger vos crédits.",
  },
  continueConversation: {
    es: "Continuar Conversación",
    en: "Continue Conversation",
    pt: "Continuar Conversa",
    it: "Continua Conversazione",
    de: "Gespräch fortsetzen",
    fr: "Continuer la Conversation",
  },
  closeVideo: {
    es: "Cerrar Video",
    en: "Close Video",
    pt: "Fechar Vídeo",
    it: "Chiudi Video",
    de: "Video schließen",
    fr: "Fermer la Vidéo",
  },
  microphoneError: {
    es: "No se pudo acceder al micrófono. Por favor, verifica los permisos.",
    en: "Could not access microphone. Please check permissions.",
    pt: "Não foi possível acessar o microfone. Verifique as permissões.",
    it: "Impossibile accedere al microfono. Controlla i permessi.",
    de: "Zugriff auf Mikrofon nicht möglich. Bitte Berechtigungen prüfen.",
    fr: "Impossible d'accéder au microphone. Vérifiez les autorisations.",
  },
  transcriptionError: {
    es: "Error al transcribir el audio. Intenta de nuevo.",
    en: "Error transcribing audio. Please try again.",
    pt: "Erro ao transcrever áudio. Tente novamente.",
    it: "Errore nella trascrizione audio. Riprova.",
    de: "Fehler bei der Audiotranskription. Bitte erneut versuchen.",
    fr: "Erreur lors de la transcription audio. Veuillez réessayer.",
  },
  backendError: {
    es: "Error al conectar con el servidor. Intenta de nuevo.",
    en: "Error connecting to server. Please try again.",
    pt: "Erro ao conectar com o servidor. Tente novamente.",
    it: "Errore di connessione al server. Riprova.",
    de: "Fehler bei der Serververbindung. Bitte erneut versuchen.",
    fr: "Erreur de connexion au serveur. Veuillez réessayer.",
  },
};

type Sender = "user" | "bot";
type MsgKind = "text";
type Message = { id: number; kind: MsgKind; sender: Sender; text: string; ts: Date; role?: 'user' | 'assistant' };

const fmtTime = (d: Date, lang: Language) =>
  d.toLocaleTimeString(lang === "es" ? "es-ES" : "en-US", { hour: "2-digit", minute: "2-digit" });

function splitFirstBurst(text: string) {
  if (text.length <= 1500) {
    return { first: text, rest: "" };
  }

  const m = text.slice(0, 1500).match(/(.{1200,}?[\.!\?])/s);
  if (m) {
    const first = m[0].trim();
    const rest = text.slice(first.length).trim();
    return { first, rest };
  }

  return { first: text, rest: "" };
}

export default function Chat({
  lang,
  welcome,
  initialMessages = [],
  backendUrl,
  chatTopPx,
  ttsChannel,
  wsReady,
  chatEnabled,
  audioEnabled,
  jesusEnabled,
  sessionId,
  livetalkSessionId,
  clearAudioQueue,
  startAvatarWebRTC,
  stopAvatarWebRTC,
  diagnosePeerState,
  onForceReconnect,
  onConversationStart,
  onConversationEnd,
  onAudioStart,
  onAudioEnd,
  userName,
  userGender,
  deviceId,
  subscription,
  currentMode,
  canAsk,
  reloadSubscription,
  onSubscriptionUpdated,
  onChangeMode,
  onOpenSubscriptionPanel,
  onLogout,
  onContact,
  onPlayingStateChange,
  isChatReady = true,
  isJesusSpeaking = false,
  resetInactivityTimer,
  setUserIsRecording,
  setUserHasText,
}: {
  lang: Language;
  welcome: string;
  initialMessages?: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>;
  backendUrl: string;
  chatTopPx: number;
  ttsChannel: { send: (payload: any) => void; readyState?: string } | null;
  wsReady: boolean;
  chatEnabled: boolean;
  audioEnabled: boolean;
  jesusEnabled: boolean;
  sessionId: string;
  livetalkSessionId: number | null;
  clearAudioQueue?: () => void;
  startAvatarWebRTC?: () => Promise<number | null>;
  stopAvatarWebRTC?: () => void;
  diagnosePeerState?: () => void;
  onForceReconnect?: () => Promise<number | null>;
  onConversationStart?: () => void;
  onConversationEnd?: () => void;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
  userName: string;
  userGender: "male" | "female";
  deviceId: string;
  subscription: SubscriptionStatus;
  currentMode: ConversationMode;
  canAsk: (mode: ConversationMode) => Promise<boolean>;
  reloadSubscription: () => Promise<void>;
  onSubscriptionUpdated: (newSubscription: SubscriptionStatus) => void;
  onPlayingStateChange?: (isPlaying: boolean) => void;
  onChangeMode: (mode: ConversationMode) => Promise<void>;
  onOpenSubscriptionPanel: () => void;
  onLogout: () => void;
  onContact: () => void;
  isChatReady?: boolean;
  isJesusSpeaking?: boolean;
  resetInactivityTimer?: () => void;
  setUserIsRecording?: (isRecording: boolean) => void;
  setUserHasText?: (hasText: boolean) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showInsufficientCredits, setShowInsufficientCredits] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const conversationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const creditsConsumedRef = useRef<boolean>(false);
  const questionStartTimeRef = useRef<number>(0);
  const currentUserMessageRef = useRef<string>("");
  const currentAssistantMessageRef = useRef<string>("");
  const isInitialLoadRef = useRef<boolean>(true);

  // ✅ Cargar historial inicial y escuchar cambios en initialMessages
  useEffect(() => {
    console.log('[Chat] 🔄 useEffect initialMessages triggered');
    console.log('[Chat] 📊 initialMessages.length:', initialMessages?.length || 0);

    if (initialMessages && initialMessages.length > 0) {
      console.log('[Chat] 📜 Procesando mensajes desde initialMessages...');

      const historyMessages: Message[] = initialMessages.map((msg, idx) => ({
        id: idx + 1,
        kind: "text" as const,
        sender: msg.role === 'user' ? 'user' as const : 'bot' as const,
        text: msg.content,
        ts: new Date(msg.timestamp),
        role: msg.role
      }));

      console.log('[Chat] 📦 Historial procesado:', historyMessages.length, 'mensajes');
      setMessages(historyMessages);
      console.log('[Chat] ✅ Mensajes históricos establecidos');

      // Posicionar al final ANTES de hacer visible (sin animación)
      requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
        console.log('[Chat] 📍 Scroll posicionado al final (invisible)');

        // Marcar como cargado después de posicionar
        setTimeout(() => {
          setIsHistoryLoaded(true);
          console.log('[Chat] ✅ Historial marcado como cargado y visible');
        }, 50);
      });
    } else {
      console.log('[Chat] ℹ️ No hay initialMessages para cargar');
      // Si no hay mensajes, marcar como cargado inmediatamente
      setIsHistoryLoaded(true);
    }
  }, [initialMessages, initialMessages.length]);


  const { supported, recording, start, pause, cancel, canvasRef, getTranscript } = useVoiceRecorder(lang);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isAndroid, setIsAndroid] = useState(false);
  const audioRecorder = useRef(new AudioRecorderService());
  const transcriptionService = useRef(new TranscriptionService());
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wasRecordingRef = useRef(false);
  const manualStopRef = useRef(false);

  useEffect(() => {
    setIsAndroid(AudioRecorderService.isAndroid());
  }, []);

  useEffect(() => {
    if (isChatReady && isHistoryLoaded) {
      // Scroll instantáneo en carga inicial, smooth para nuevos mensajes
      const behavior = isInitialLoadRef.current ? "instant" : "smooth";
      chatEndRef.current?.scrollIntoView({ behavior: behavior as ScrollBehavior });

      // Después de la primera carga, usar smooth
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
      }
    }
  }, [messages, isTyping, isChatReady, isHistoryLoaded]);

  // Scroll al final cuando cambia el modo o se activa el chat
  useEffect(() => {
    if (chatEnabled && isHistoryLoaded && messages.length > 0) {
      console.log('[Chat] 📍 Modo chat activado - posicionando al final');
      requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
      });
    }
  }, [chatEnabled, currentMode]);

  // Notificar cambios en el estado de reproducción
  useEffect(() => {
    if (onPlayingStateChange) {
      onPlayingStateChange(isPlaying);
    }
  }, [isPlaying, onPlayingStateChange]);

  // Monitorear créditos y cerrar WebRTC inmediatamente cuando lleguen a 0
  useEffect(() => {
    if (currentMode === 'video-chat' && subscription.creditsRemaining === 0 && subscription.creditsTotal > 0) {
      console.log('[Chat] 🚨 CRÉDITOS AGOTADOS - Cerrando WebRTC inmediatamente');

      setIsPlaying(false);

      // Cerrar WebRTC
      console.log('[Chat] 🔌 Cerrando WebRTC - stopAvatarWebRTC disponible?', !!stopAvatarWebRTC);
      if (stopAvatarWebRTC) {
        stopAvatarWebRTC();
        console.log('[Chat] ✅ WebRTC cerrado por créditos agotados');
      } else {
        console.error('[Chat] ❌ stopAvatarWebRTC NO está disponible!');
      }

      // Mostrar modal
      setShowInsufficientCredits(true);
    }
  }, [subscription.creditsRemaining, subscription.creditsTotal, currentMode, stopAvatarWebRTC]);


  const addMsg = (m: Omit<Message, "id" | "ts">) => {
    const full: Message = { ...m, id: Date.now() + Math.random(), ts: new Date() };
    console.log('[Chat] 📨 addMsg called:', {
      sender: full.sender,
      role: full.role,
      text: full.text.substring(0, 50) + '...'
    });
    setMessages((p) => {
      const newMessages = [...p, full];
      console.log('[Chat] 📊 Total messages now:', newMessages.length);
      return newMessages;
    });
  };

  async function waitForChannelReady(maxAttempts = 20, delayMs = 200): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      const derived = wsReady ? "open" : (ttsChannel?.readyState ?? "closed");
      if (wsReady || derived === "open") return true;
      await new Promise((r) => setTimeout(r, delayMs));
    }
    return false;
  }

  // Registrar en analytics después de consumir créditos
  const logQuestionAnalytics = async (mode: ConversationMode) => {
    try {
      const responseTime = (Date.now() - questionStartTimeRef.current) / 1000;
      const creditsConsumed = CREDITS_PER_MODE[mode];

      await analyticsService.logQuestion({
        device_id: deviceId,
        language: lang,
        mode_used: mode,
        credits_consumed: creditsConsumed,
        subscription_tier: subscription.tier,
        response_time: responseTime,
        question_text: currentUserMessageRef.current || '',
        response_text: currentAssistantMessageRef.current || ''
      });
    } catch (error) {
      console.error('[Chat] ❌ Error logging analytics:', error);
    }
  };

  // Guardar conversación (solo para usuarios PAID)
  const saveConversation = async (mode: ConversationMode) => {
    try {
      if (!currentUserMessageRef.current || !currentAssistantMessageRef.current) {
        console.log('[Chat] ⚠️ No messages to save');
        return;
      }

      const creditsUsed = CREDITS_PER_MODE[mode];

      console.log('[Conversation] 💾 Guardando conversación:');
      console.log('  - device_id:', deviceId);
      console.log('  - mode:', mode);
      console.log('  - user_message (COMPLETO):', currentUserMessageRef.current);
      console.log('  - assistant_message:', currentAssistantMessageRef.current.substring(0, 50) + '...');
      console.log('  - credits_used:', creditsUsed);
      console.log('  - session_id:', sessionId);

      const now = new Date();
      const clientTimestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      await conversationService.saveConversation({
        device_id: deviceId,
        user_message: currentUserMessageRef.current,
        assistant_message: currentAssistantMessageRef.current,
        language: lang,
        mode: mode,
        credits_used: creditsUsed,
        session_id: sessionId,
        client_timestamp: clientTimestamp
      });

      console.log('[Conversation] ✅ Conversación guardada exitosamente');
    } catch (error) {
      console.error('[Chat] ❌ Error saving conversation:', error);
    }
  };


  // Timer de inactividad - estas funciones son placeholders
  // La lógica real está en App.tsx, aquí solo se llaman para mantener compatibilidad
  const startInactivityTimer = () => {
    console.log('[Chat] ⏰ startInactivityTimer llamado (manejado en App.tsx)');
  };

  const stopInactivityTimer = () => {
    console.log('[Chat] 🛑 stopInactivityTimer llamado (manejado en App.tsx)');
  };



  async function askBackend(userText: string) {
    console.log('[Chat] 🚀🚀🚀 askBackend() INICIADO 🚀🚀🚀');
    console.log('[Chat] 📍 Versión del código: 2025-12-04-BACKEND-ONLY-CREDITS');

    try {
      if (clearAudioQueue) {
        clearAudioQueue();
      }

      // Registrar sessionId en servidor de voz ANTES de enviar al backend (solo en chat-audio)
      console.log('[Chat] 🔍 DIAGNÓSTICO - Verificando condiciones para registrar sessionId:');
      console.log(`  - currentMode: ${currentMode}`);
      console.log(`  - Es chat-audio: ${currentMode === 'chat-audio'}`);
      console.log(`  - ttsChannel existe: ${!!ttsChannel}`);
      console.log(`  - ttsChannel.send es función: ${typeof ttsChannel?.send === 'function'}`);
      console.log(`  - wsReady: ${wsReady}`);

      if (currentMode === 'chat-audio' && ttsChannel && typeof ttsChannel.send === 'function') {
        console.log('[Chat] ✅ Condiciones cumplidas - esperando canal listo...');
        const ready = await waitForChannelReady();
        console.log('[Chat] 📡 Canal WebSocket ready:', ready);

        if (ready) {
          const payload = { sessionId: sessionId };
          console.log('[Chat] 📤 ENVIANDO payload al WebSocket:', payload);
          ttsChannel.send(JSON.stringify(payload));
          console.log('[Chat] 📝 SessionId registrado en servidor de voz (chat-audio):', sessionId);
        } else {
          console.warn('[Chat] ⚠️ WebSocket no está listo para registrar sessionId');
        }
      } else {
        console.log('[Chat] ❌ Condiciones NO cumplidas - NO se registrará sessionId');
      }

      // Usar livetalkSessionId (del WebRTC) si está disponible, para que backend y LiveTalking sincronicen
      const finalSessionId = livetalkSessionId || sessionId;
      console.log(`[Chat] 🔑 /api/ask - SessionIds disponibles:`);
      console.log(`  - livetalkSessionId (WebRTC): ${livetalkSessionId}`);
      console.log(`  - sessionId (deviceId): ${sessionId}`);
      console.log(`  - Usando: ${finalSessionId}`);
      console.log(`[Chat] ⚠️ CRÍTICO: sessionId DEBE ser = deviceId (NO cambiar nunca)`);

      // Obtener token JWT para autenticación
      console.log('[Chat] 🔐 Obteniendo token JWT para /api/ask');
      const token = await AuthService.getToken(deviceId);
      console.log('[Chat] ✅ Token obtenido:', token ? 'Token válido' : 'Sin token');

      const r = await fetch(`${backendUrl}/api/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        credentials: "omit",
        body: JSON.stringify({
          message: userText,
          sessionId: finalSessionId,
          lang,
          mode: currentMode,
          deviceId,
          hour: new Date().getHours(),
          localDate: new Date().toLocaleDateString('en-CA'),
        }),
      });

      const data = await r.json();
      console.log('[Chat] 📝 askBackend response data:', {
        message: data?.message?.substring(0, 50),
        role: data?.role,
        question: data?.question,
        hasBible: !!(data?.bible?.text)
      });

      const msg = String(data?.message || "").trim();
      const verse =
        data?.bible?.text && data?.bible?.ref
          ? `${String(data.bible.text).trim()} (${String(data.bible.ref).trim()})`
          : "";

      // CRÍTICO: Buscar pregunta de seguimiento en TODOS los campos posibles
      // (igual que en /api/transcribe para consistencia)
      let followUpQ = String(
        data?.followUpQuestion ||
        data?.nextQuestion ||
        data?.follow_up_question ||
        data?.followup_question ||
        ""
      ).trim();

      // Si no hay pregunta específica, usar el campo question
      if (!followUpQ && data?.question) {
        followUpQ = String(data.question).trim();
      }

      console.log('[Chat] 🔍 /api/ask - Pregunta de seguimiento:', followUpQ || 'NINGUNA');

      const fullText = [msg, verse, followUpQ].filter(Boolean).join("\n\n").trim();
      const audioText = [msg, verse, followUpQ].filter(Boolean).join(" ").trim();
      const role = data?.role || 'assistant';
      console.log('[Chat] 🎯 Role determined:', role);

      if (!fullText) {
        setTimeout(() => {
          setIsTyping(false);
          setIsPlaying(false);
          addMsg({ sender: "bot", kind: "text", text: "Estoy contigo. ¿Qué te gustaría compartir?", role: 'assistant' });
        }, 2000);
        return;
      }

      // Guardar mensajes para la conversación
      currentAssistantMessageRef.current = fullText;

      setTimeout(() => {
        setIsTyping(false);
        // El backend devuelve role='assistant' para la respuesta de Jesús
        const sender = role === 'user' ? 'user' : 'bot';
        console.log('[Chat] ➕ Agregando mensaje con role:', role, 'sender:', sender);
        addMsg({ sender, kind: "text", text: fullText, role });
      }, 2000);

      // Si no hay audio/jesus, habilitar input inmediatamente
      if (!(audioEnabled || jesusEnabled)) {
        // Registrar en analytics (los créditos ya se descontaron al inicio)
        await logQuestionAnalytics(currentMode);

        // Guardar conversación después de analytics (fire and forget)
        saveConversation(currentMode);

        setTimeout(() => setIsPlaying(false), 2500);
      }

      console.log('[Chat] 🔍 /api/ask - Verificando si continuar con audio/video:');
      console.log(`  - audioEnabled: ${audioEnabled}`);
      console.log(`  - jesusEnabled: ${jesusEnabled}`);
      console.log(`  - Continuar: ${audioEnabled || jesusEnabled}`);

      if (!(audioEnabled || jesusEnabled)) {
        console.log('[Chat] ⏹️ /api/ask - No audio/video - retornando');
        return;
      }

      // CRÍTICO: jesusEnabled y audioEnabled funcionan IGUAL
      // Solo difieren en callbacks de video (onConversationStart, timers)
      const ready = await waitForChannelReady();
      if (!ready || !ttsChannel || typeof ttsChannel.send !== "function") {
        console.error("[Chat] ❌ Canal TTS no está listo");
        setIsPlaying(false);
        return;
      }

      if (jesusEnabled) {
        console.log('[Chat] 🎬 /api/ask - Modo Jesus On activado');
        if (onConversationStart) {
          onConversationStart();
        }
        if (onConversationEnd) {
          if (conversationTimerRef.current) clearTimeout(conversationTimerRef.current);
          conversationTimerRef.current = setTimeout(() => {
            console.log("[Chat] ⏱️ Timer de conversación expirado (90s)");
            onConversationEnd();
            setIsPlaying(false);
          }, 90_000);
        }
        if (currentMode === 'video-chat' || currentMode === 'video') {
          startInactivityTimer();
        }
      }

      // CRÍTICO: Guardar conversación INMEDIATAMENTE después de recibir respuesta
      // NO esperar a que termine el audio (si el usuario hace otra pregunta, el ref cambiaría)
      await logQuestionAnalytics(currentMode);
      saveConversation(currentMode);
      console.log('[Chat] ✅ Conversación guardada inmediatamente (antes de reproducir audio)');

      if (onAudioStart) {
        onAudioStart();
      }

      console.log(`[Chat] 📝 /api/ask - audioText: "${audioText.substring(0, 100)}..."`);

      const { first, rest } = splitFirstBurst(audioText);

      // Solo enviar al WebSocket si NO es modo chat-audio
      // En modo chat-audio, el backend ya envía el audio al servidor de voz
      if (currentMode !== 'chat-audio') {
        const payload = {
          text: first,
          lang,
          route: "audio_on",
          sessionId: jesusEnabled ? livetalkSessionId : sessionId,
        };
        ttsChannel.send(JSON.stringify(payload));
        console.log(`[Chat] ✅ Texto enviado a ${jesusEnabled ? 'AVATAR' : 'VOZ'} WebSocket con sessionId: ${payload.sessionId}`);
      } else {
        console.log(`[Chat] ⏭️ Modo chat-audio: NO enviando al WebSocket (backend lo hace)`);
      }

      // Calcular duración estimada total incluyendo TODA la reproducción (respuesta + cita bíblica)
      // Usar 100ms por carácter + buffer de 3 segundos para asegurar que termine toda la reproducción
      const totalTextLength = audioText.length;
      const baseEstimation = totalTextLength * 100;
      const bufferTime = 3000;
      const estimatedDuration = baseEstimation + bufferTime;

      console.log(`[Chat] ⏱️ Duración estimada total: ${estimatedDuration}ms (${totalTextLength} caracteres + ${bufferTime}ms buffer)`);
      console.log(`[Chat] 🔒 Bloqueando menú y micrófono durante reproducción completa`);

      // Solo desbloquear después de que termine TODA la reproducción
      setTimeout(() => {
        console.log(`[Chat] ✅ Reproducción completa finalizada - desbloqueando`);
        setIsPlaying(false);

        if (onAudioEnd) {
          onAudioEnd();
        }
      }, estimatedDuration);

      if (rest && currentMode !== 'chat-audio') {
        setTimeout(() => {
          try {
            const payloadRest = {
              text: rest,
              lang,
              route: "audio_on",
              sessionId: jesusEnabled ? livetalkSessionId : sessionId,
            };
            ttsChannel.send(JSON.stringify(payloadRest));
            console.log(`[Chat] ✅ Resto de texto enviado con sessionId: ${payloadRest.sessionId}`);
          } catch (err) {
            console.error("[Chat] ❌ Error enviando resto:", err);
          }
        }, 50);
      }
    } catch (err) {
      console.error("[Chat] ❌ Error en askBackend:", err);
      setIsTyping(false);
      setIsPlaying(false);

      // Si es CONNECTION_LOST, intentar reconectar
      if (err instanceof Error && err.message === 'CONNECTION_LOST') {
        console.warn("[Chat] ⚠️ Conexión perdida con el backend, forzando reconexion...");

        // Notificar al usuario
        const reconnectMsg = lang === 'es' ? 'Reconectando con el avatar, un momento...' :
                            lang === 'en' ? 'Reconnecting with avatar, one moment...' :
                            lang === 'pt' ? 'Reconectando com o avatar, um momento...' :
                            lang === 'it' ? 'Riconnessione con l\'avatar, un momento...' :
                            lang === 'de' ? 'Verbindung zum Avatar wird wiederhergestellt...' :
                            'Reconnexion avec l\'avatar, un instant...';

        addMsg({ sender: "bot", kind: "text", text: reconnectMsg });

        // Forzar cierre de la conexión WebRTC actual
        if (onForceReconnect) {
          console.log("[Chat] 🔄 Forzando reconexion completa del WebRTC...");
          const newSessionId = await onForceReconnect();

          if (newSessionId) {
            console.log("[Chat] ✅ Reconectado exitosamente con sessionId:", newSessionId);
            const successMsg = lang === 'es' ? 'Conexión restablecida. Por favor, repite tu pregunta.' :
                              lang === 'en' ? 'Connection restored. Please repeat your question.' :
                              lang === 'pt' ? 'Conexão restabelecida. Por favor, repita sua pergunta.' :
                              lang === 'it' ? 'Connessione ripristinata. Per favore, ripeti la tua domanda.' :
                              lang === 'de' ? 'Verbindung wiederhergestellt. Bitte wiederholen Sie Ihre Frage.' :
                              'Connexion rétablie. Veuillez répéter votre question.';
            addMsg({ sender: "bot", kind: "text", text: successMsg });
            return;
          }
        }

        const errorMsg = lang === 'es' ? 'No pude reconectar. Por favor, recarga la página.' :
                        lang === 'en' ? 'Could not reconnect. Please reload the page.' :
                        lang === 'pt' ? 'Não consegui reconectar. Por favor, recarregue a página.' :
                        lang === 'it' ? 'Impossibile riconnettersi. Per favore, ricarica la pagina.' :
                        lang === 'de' ? 'Verbindung konnte nicht wiederhergestellt werden. Bitte laden Sie die Seite neu.' :
                        'Impossible de se reconnecter. Veuillez recharger la page.';
        addMsg({ sender: "bot", kind: "text", text: errorMsg });
      } else {
        const defaultMsg = lang === 'es' ? 'Estoy contigo. ¿Qué te gustaría compartir?' :
                          lang === 'en' ? 'I\'m with you. What would you like to share?' :
                          lang === 'pt' ? 'Estou contigo. O que você gostaria de compartilhar?' :
                          lang === 'it' ? 'Sono con te. Cosa vorresti condividere?' :
                          lang === 'de' ? 'Ich bin bei dir. Was möchtest du teilen?' :
                          'Je suis avec toi. Que voudrais-tu partager?';
        addMsg({ sender: "bot", kind: "text", text: defaultMsg });
      }
    }
  }

  const sendText = async () => {
    const t = text.trim();
    if (!t) return;

    // Resetear timer de inactividad cuando el usuario envía un mensaje
    if (resetInactivityTimer) resetInactivityTimer();

    console.log('[Chat] sendText - Checking credits for mode:', currentMode);
    const hasEnoughCredits = await canAsk(currentMode);
    console.log('[Chat] sendText - hasEnoughCredits:', hasEnoughCredits);

    if (!hasEnoughCredits) {
      console.warn('[Chat] sendText - Insufficient credits, cerrando WebRTC y mostrando modal');
      console.log('[Chat] 🔌 Cerrando WebRTC - stopAvatarWebRTC disponible?', !!stopAvatarWebRTC);
      if (stopAvatarWebRTC) {
        stopAvatarWebRTC();
        console.log('[Chat] ✅ WebRTC cerrado desde sendText');
      } else {
        console.error('[Chat] ❌ stopAvatarWebRTC NO está disponible!');
      }
      // 🔄 Recargar créditos desde BD antes de mostrar modal
      console.log('[Chat] 🔄 Recargando créditos desde BD antes de mostrar modal...');
      await reloadSubscription();
      console.log('[Chat] ✅ Créditos actualizados desde BD');
      setShowInsufficientCredits(true);
      return;
    }

    console.log('[Chat] sendText - Proceeding with message');
    setText("");
    // Notificar que ya no hay texto (permite reiniciar timer cuando termine el audio)
    if (setUserHasText) setUserHasText(false);
    addMsg({ sender: "user", kind: "text", text: t });
    setIsTyping(true);
    setIsPlaying(true);

    // Resetear flag de créditos consumidos y registrar tiempo de inicio
    creditsConsumedRef.current = false;
    questionStartTimeRef.current = Date.now();

    // Guardar mensaje del usuario
    currentUserMessageRef.current = t;

    try {
      await askBackend(t);

      // Timeout de seguridad: si después de 30s no se ha reseteado, forzar reset
      setTimeout(() => {
        console.log('[Chat] Safety timeout - resetting isPlaying');
        setIsPlaying(false);
      }, 30000);
    } catch (error) {
      console.error('[Chat] sendText - Error:', error);
      setIsPlaying(false);
      setIsTyping(false);
    }
  };

  // Mantener presionado - inicia grabación
  const handleStartRecording = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Notificar que el usuario está grabando (DETIENE timer de inactividad)
    if (setUserIsRecording) setUserIsRecording(true);

    if (isAndroid) {
      if (!isRecordingAudio) {
        try {
          await audioRecorder.current.startRecording();
          setIsRecordingAudio(true);
          setRecordingDuration(0);

          recordingTimerRef.current = setInterval(() => {
            setRecordingDuration(prev => prev + 1);
          }, 1000);

          console.log('[Chat] 🎙️ Android - Iniciando grabación para Whisper');
        } catch (error: any) {
          console.error('[Chat] Error iniciando grabación:', error);
          const errorMessage = error?.message || I18N.microphoneError[lang];
          addMsg({ sender: "bot", kind: "text", text: errorMessage });
        }
      }
    } else {
      if (supported && !recording) await start();
    }
  };

  // Soltar - detiene y envía
  const handleStopRecording = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Notificar que el usuario terminó de grabar
    if (setUserIsRecording) setUserIsRecording(false);

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    if (isAndroid && isRecordingAudio) {
      try {
        setIsRecordingAudio(false);
        setIsTyping(true);
        console.log('[Chat] 🛑 Android - Deteniendo grabación');

        const audioBlob = await audioRecorder.current.stopRecording();
        console.log('[Chat] ✅ Android - Grabación detenida, audio obtenido');
        console.log('[Chat] 📤 Android - Enviando audio a Whisper + procesando');

        const hasEnoughCredits = await canAsk(currentMode);
        if (!hasEnoughCredits) {
          console.warn('[Chat] handleStopRecording - Insufficient credits');
          if (stopAvatarWebRTC) {
            stopAvatarWebRTC();
          }
          // 🔄 Recargar créditos desde BD antes de mostrar modal
          console.log('[Chat] 🔄 Recargando créditos desde BD antes de mostrar modal...');
          await reloadSubscription();
          console.log('[Chat] ✅ Créditos actualizados desde BD');
          setShowInsufficientCredits(true);
          setIsTyping(false);
          return;
        }

        // Registrar sessionId en servidor de voz ANTES de enviar al backend (solo en chat-audio)
        console.log('[Chat] 🔍 DIAGNÓSTICO (audio) - Verificando condiciones para registrar sessionId:');
        console.log(`  - currentMode: ${currentMode}`);
        console.log(`  - Es chat-audio: ${currentMode === 'chat-audio'}`);
        console.log(`  - ttsChannel existe: ${!!ttsChannel}`);
        console.log(`  - ttsChannel.send es función: ${typeof ttsChannel?.send === 'function'}`);
        console.log(`  - wsReady: ${wsReady}`);

        if (currentMode === 'chat-audio' && ttsChannel && typeof ttsChannel.send === 'function') {
          console.log('[Chat] ✅ Condiciones cumplidas (audio) - esperando canal listo...');
          const ready = await waitForChannelReady();
          console.log('[Chat] 📡 Canal WebSocket ready (audio):', ready);

          if (ready) {
            const payload = { sessionId: sessionId };
            console.log('[Chat] 📤 ENVIANDO payload al WebSocket (audio):', payload);
            ttsChannel.send(JSON.stringify(payload));
            console.log('[Chat] 📝 SessionId registrado en servidor de voz (chat-audio/audio):', sessionId);
          } else {
            console.warn('[Chat] ⚠️ WebSocket no está listo para registrar sessionId (audio)');
          }
        } else {
          console.log('[Chat] ❌ Condiciones NO cumplidas (audio) - NO se registrará sessionId');
        }

        // Validar que deviceId no esté vacío
        if (!deviceId || deviceId.trim() === '') {
          console.error('[Chat] ❌ CRÍTICO: deviceId está vacío en handleStopRecording');
          throw new Error('DeviceId no disponible');
        }

        // Usar livetalkSessionId (del WebRTC) si está disponible, para que backend y LiveTalking sincronicen
        const finalSessionId = livetalkSessionId || sessionId;
        console.log(`[Chat] 🔑 /api/transcribe - SessionIds disponibles:`);
        console.log(`  - livetalkSessionId (WebRTC): ${livetalkSessionId}`);
        console.log(`  - sessionId (deviceId): ${sessionId}`);
        console.log(`  - Usando: ${finalSessionId}`);
        console.log(`  - deviceId: ${deviceId} (length: ${deviceId.length})`);
        console.log(`[Chat] ⚠️ CRÍTICO: sessionId DEBE ser = deviceId (NO cambiar nunca)`);

        const result = await transcriptionService.current.transcribe(
          audioBlob,
          lang,
          currentMode,
          finalSessionId,
          deviceId
        );

        console.log('[Chat] ✅ Whisper transcription + GPT response - RESPUESTA COMPLETA:');
        console.log(JSON.stringify(result, null, 2));
        console.log('[Chat] 🎬 Estado al recibir respuesta:');
        console.log(`  - currentMode: ${currentMode}`);
        console.log(`  - jesusEnabled: ${jesusEnabled}`);
        console.log(`  - audioEnabled: ${audioEnabled}`);
        console.log('[Chat] 📝 Campos de backend:');
        console.log(`  - role: ${result.role}`);
        console.log(`  - question: ${result.question}`);
        console.log(`  - message: ${result.message?.substring(0, 100)}`);
        console.log(`  - bible: ${JSON.stringify(result.bible)}`);
        console.log(`  - followUpQuestion: ${result.followUpQuestion}`);
        console.log(`  - nextQuestion: ${(result as any).nextQuestion}`);
        console.log(`  - follow_up_question: ${(result as any).follow_up_question}`);

        // IMPORTANTE: El backend puede devolver la pregunta de seguimiento en diferentes campos:
        // - followUpQuestion (esperado)
        // - nextQuestion (alternativo)
        // - follow_up_question (snake_case)
        // - dentro de response.question si es diferente de la transcripción

        // 1. Agregar transcripción como mensaje del usuario
        // CRÍTICO: Usar result.transcription primero para evitar usar mensaje anterior
        const userTranscription = result.transcription || result.question || '';
        console.log('[Chat] 🔍 Transcripción del usuario:', {
          transcription: result.transcription,
          question: result.question,
          usando: userTranscription
        });
        if (userTranscription.trim()) {
          console.log('[Chat] ➕ Agregando mensaje del USUARIO (transcripción):', userTranscription);
          addMsg({ sender: "user", kind: "text", text: userTranscription, role: 'user' });
        }

        // 2. Formatear mensaje del asistente: message + bible + followUpQuestion
        if (result.message?.trim()) {
          const msg = String(result.message || "").trim();
          const verse =
            result.bible?.text && result.bible?.ref
              ? `${String(result.bible.text).trim()} (${String(result.bible.ref).trim()})`
              : "";

          // Buscar pregunta de seguimiento en múltiples campos posibles
          let followUpQ = String(
            result.followUpQuestion ||
            (result as any).nextQuestion ||
            (result as any).follow_up_question ||
            (result as any).followup_question ||
            ""
          ).trim();

          // Si no se encuentra en campos directos, buscar en estructuras anidadas
          if (!followUpQ && (result as any).response?.question) {
            followUpQ = String((result as any).response.question).trim();
            console.log('[Chat] 🔍 Pregunta encontrada en response.question:', followUpQ);
          }

          // Si aún no hay pregunta, buscar en el campo question solo si es diferente de la transcripción
          if (!followUpQ && result.question && result.question !== userTranscription) {
            followUpQ = String(result.question).trim();
            console.log('[Chat] 🔍 Usando result.question como pregunta de seguimiento:', followUpQ);
          }

          console.log('[Chat] 🔍 Pregunta de seguimiento final:', followUpQ || 'NINGUNA');

          // Para el chat: mostrar todo junto con saltos de línea
          const fullText = [msg, verse, followUpQ].filter(Boolean).join("\n\n").trim();

          // Para el audio: unir con espacios
          const audioText = [msg, verse, followUpQ].filter(Boolean).join(" ").trim();

          console.log('[Chat] 📝 Texto completo formateado:');
          console.log('  - Mensaje:', msg.substring(0, 50) + '...');
          console.log('  - Versículo:', verse.substring(0, 50) + (verse.length > 50 ? '...' : ''));
          console.log('  - Pregunta seguimiento:', followUpQ || 'NO INCLUIDA');
          console.log('[Chat] ➕ Agregando mensaje del ASISTENTE (formato completo):', fullText.substring(0, 100));

          addMsg({ sender: "bot", kind: "text", text: fullText, role: 'assistant' });
          setIsTyping(false);
          setIsPlaying(true);
          creditsConsumedRef.current = false;
          questionStartTimeRef.current = Date.now();
          currentUserMessageRef.current = userTranscription;
          currentAssistantMessageRef.current = fullText;

          if (!(audioEnabled || jesusEnabled)) {
            // Registrar en analytics y guardar conversación (los créditos ya se descontaron al inicio)
            await logQuestionAnalytics(currentMode);
            saveConversation(currentMode);

            setTimeout(() => setIsPlaying(false), 2500);
          }

          console.log('[Chat] 🔍 Verificando si continuar con audio/video:');
          console.log(`  - audioEnabled: ${audioEnabled}`);
          console.log(`  - jesusEnabled: ${jesusEnabled}`);
          console.log(`  - Continuar: ${audioEnabled || jesusEnabled}`);

          if (!(audioEnabled || jesusEnabled)) {
            console.log('[Chat] ⏹️ No audio/video - retornando');
            return;
          }

          // CRÍTICO: jesusEnabled y audioEnabled funcionan IGUAL
          // Solo difieren en callbacks de video (onConversationStart, timers)
          const ready = await waitForChannelReady();
          if (!ready || !ttsChannel || typeof ttsChannel.send !== "function") {
            console.error("[Chat] ❌ Canal TTS no está listo");
            setIsPlaying(false);
            return;
          }

          if (jesusEnabled) {
            console.log('[Chat] 🎬 /api/transcribe - Modo Jesus On activado');
            console.log(`[Chat] 🔗 /api/transcribe - SessionId: ${finalSessionId}`);
            if (onConversationStart) {
              onConversationStart();
            }
            if (onConversationEnd) {
              if (conversationTimerRef.current) clearTimeout(conversationTimerRef.current);
              conversationTimerRef.current = setTimeout(() => {
                console.log("[Chat] ⏱️ Timer de conversación expirado (90s)");
                onConversationEnd();
                setIsPlaying(false);
              }, 90_000);
            }
            if (currentMode === 'video-chat' || currentMode === 'video') {
              startInactivityTimer();
            }
          }

          if (onAudioStart) {
            onAudioStart();
          }

          console.log(`[Chat] 📝 /api/transcribe - audioText: "${audioText.substring(0, 100)}..."`);

          const { first, rest } = splitFirstBurst(audioText);

          // Solo enviar al WebSocket si NO es modo chat-audio
          // En modo chat-audio, el backend ya envía el audio al servidor de voz
          if (currentMode !== 'chat-audio') {
            const payload = {
              text: first,
              lang,
              route: "audio_on",
              sessionId: livetalkSessionId || sessionId,
            };
            ttsChannel.send(JSON.stringify(payload));
            console.log(`[Chat] ✅ Texto enviado a ${jesusEnabled ? 'AVATAR' : 'VOZ'} WebSocket`);
          } else {
            console.log(`[Chat] ⏭️ Modo chat-audio: NO enviando al WebSocket (backend lo hace)`);
          }

          // Calcular duración estimada total incluyendo TODA la reproducción (respuesta + cita bíblica)
          // Usar 100ms por carácter + buffer de 3 segundos para asegurar que termine toda la reproducción
          const totalTextLength = audioText.length;
          const baseEstimation = totalTextLength * 100;
          const bufferTime = 3000;
          const estimatedDuration = baseEstimation + bufferTime;

          console.log(`[Chat] ⏱️ Duración estimada total: ${estimatedDuration}ms (${totalTextLength} caracteres + ${bufferTime}ms buffer)`);
          console.log(`[Chat] 🔒 Bloqueando menú y micrófono durante reproducción completa`);

          // Solo desbloquear después de que termine TODA la reproducción
          setTimeout(async () => {
            console.log(`[Chat] ✅ Reproducción completa finalizada - desbloqueando`);
            setIsPlaying(false);

            if (onAudioEnd) {
              onAudioEnd();
            }

            // Registrar en analytics y guardar conversación (los créditos ya se descontaron al inicio)
            await logQuestionAnalytics(currentMode);
            saveConversation(currentMode);
          }, estimatedDuration);

          if (rest && currentMode !== 'chat-audio') {
            setTimeout(() => {
              try {
                const payloadRest = {
                  text: rest,
                  lang,
                  route: "audio_on",
                  sessionId: livetalkSessionId || sessionId,
                };
                ttsChannel.send(JSON.stringify(payloadRest));
              } catch (err) {
                console.error("[Chat] ❌ Error enviando resto:", err);
              }
            }, 50);
          }
        } else {
          setIsTyping(false);
        }

      } catch (error) {
        console.error('[Chat] Error Android Whisper:', error);
        setIsRecordingAudio(false);
        setIsTyping(false);
        setIsPlaying(false);
        addMsg({ sender: "bot", kind: "text", text: I18N.transcriptionError[lang] });
      }
    } else if (recording) {
      // Marcar como detención manual ANTES de pausar
      manualStopRef.current = true;
      await pause();
      const transcript = await getTranscript();
      if (transcript) {
        console.log('[Chat] ✅ iOS - Transcripción obtenida:', transcript);

        const hasEnoughCredits = await canAsk(currentMode);
        if (!hasEnoughCredits) {
          console.warn('[Chat] handleStopRecording - Insufficient credits');
          if (stopAvatarWebRTC) {
            stopAvatarWebRTC();
          }
          // 🔄 Recargar créditos desde BD antes de mostrar modal
          console.log('[Chat] 🔄 Recargando créditos desde BD antes de mostrar modal...');
          await reloadSubscription();
          console.log('[Chat] ✅ Créditos actualizados desde BD');
          setShowInsufficientCredits(true);
          return;
        }

        addMsg({ sender: "user", kind: "text", text: transcript });
        setIsTyping(true);
        setIsPlaying(true);
        creditsConsumedRef.current = false;
        questionStartTimeRef.current = Date.now();
        currentUserMessageRef.current = transcript;

        try {
          await askBackend(transcript);
          setTimeout(() => {
            console.log('[Chat] Safety timeout - resetting isPlaying');
            setIsPlaying(false);
          }, 30000);
        } catch (error) {
          console.error('[Chat] handleStopRecording - Error:', error);
          setIsPlaying(false);
          setIsTyping(false);
        }
      }
    }
  };

  // Click simple - toggle grabación (iniciar o detener)
  const handleToggleRecording = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isAndroid) {
      if (isRecordingAudio) {
        await handleStopRecording(e);
      } else {
        await handleStartRecording(e);
      }
    } else if (recording) {
      // Marcar como detención manual ANTES de pausar
      manualStopRef.current = true;
      // Notificar que el usuario terminó de grabar
      if (setUserIsRecording) setUserIsRecording(false);
      await pause();
      console.log('[Chat] 📱 iOS - Grabación detenida, obteniendo transcripción...');
      const transcript = await getTranscript();
      console.log('[Chat] 📱 iOS - Transcripción obtenida:', {
        hasTranscript: !!transcript,
        length: transcript?.length || 0,
        value: transcript || '(vacío)'
      });

      if (transcript && transcript.trim()) {
        console.log('[Chat] 🛑 iOS Toggle STOP - enviando:', transcript);

        const hasEnoughCredits = await canAsk(currentMode);
        if (!hasEnoughCredits) {
          console.warn('[Chat] handleToggleRecording - Insufficient credits');
          if (stopAvatarWebRTC) {
            stopAvatarWebRTC();
          }
          // 🔄 Recargar créditos desde BD antes de mostrar modal
          console.log('[Chat] 🔄 Recargando créditos desde BD antes de mostrar modal...');
          await reloadSubscription();
          console.log('[Chat] ✅ Créditos actualizados desde BD');
          setShowInsufficientCredits(true);
          return;
        }

        addMsg({ sender: "user", kind: "text", text: transcript });
        setIsTyping(true);
        setIsPlaying(true);
        creditsConsumedRef.current = false;
        questionStartTimeRef.current = Date.now();
        currentUserMessageRef.current = transcript;

        try {
          await askBackend(transcript);
          setTimeout(() => {
            console.log('[Chat] Safety timeout - resetting isPlaying');
            setIsPlaying(false);
          }, 30000);
        } catch (error) {
          console.error('[Chat] handleToggleRecording - Error:', error);
          setIsPlaying(false);
          setIsTyping(false);
        }
      } else {
        console.warn('[Chat] ⚠️ iOS - Transcripción vacía, no se envía mensaje');
      }
    } else {
      console.log('[Chat] 🎤 iOS Toggle START - iniciando grabación');
      // Notificar que el usuario está grabando (DETIENE timer de inactividad)
      if (setUserIsRecording) setUserIsRecording(true);
      if (supported) await start();
    }
  };

  const handleCancelRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    audioRecorder.current.cancelRecording();
    setIsRecordingAudio(false);
    // Notificar que el usuario terminó de grabar
    if (setUserIsRecording) setUserIsRecording(false);
    setRecordingDuration(0);
  };

  useEffect(() => {
    return () => {
      if (conversationTimerRef.current) clearTimeout(conversationTimerRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  // useEffect para detectar stop automático (timer 30s)
  useEffect(() => {
    const handleAutoStop = async () => {
      // Detectar cambio de true → false (grabación terminó)
      if (wasRecordingRef.current && !recording) {
        // Si fue detención manual, solo resetear la bandera
        if (manualStopRef.current) {
          console.log('[Chat] 🛑 Stop manual detectado - NO procesar automáticamente');
          manualStopRef.current = false;
          wasRecordingRef.current = recording;
          return;
        }

        console.log('[Chat] ⏰ Grabación detenida automáticamente, procesando...');

        const transcript = await getTranscript();
        if (transcript && transcript.trim()) {
          console.log('[Chat] 📤 Enviando transcripción automática:', transcript);

          // Verificar créditos
          const hasEnoughCredits = await canAsk(currentMode);
          if (!hasEnoughCredits) {
            console.log('[Chat] ❌ Sin créditos suficientes');
            if (stopAvatarWebRTC) {
              stopAvatarWebRTC();
            }
            // 🔄 Recargar créditos desde BD antes de mostrar modal
            console.log('[Chat] 🔄 Recargando créditos desde BD antes de mostrar modal...');
            await reloadSubscription();
            console.log('[Chat] ✅ Créditos actualizados desde BD');
            setShowInsufficientCredits(true);
            return;
          }

          // Enviar mensaje
          addMsg({ sender: "user", kind: "text", text: transcript });
          setIsTyping(true);
          setIsPlaying(true);
          creditsConsumedRef.current = false;
          questionStartTimeRef.current = Date.now();
          currentUserMessageRef.current = transcript;
          await askBackend(transcript);
        } else {
          console.log('[Chat] ⚠️ No hay transcripción para enviar');
        }
      }
      wasRecordingRef.current = recording;
    };

    handleAutoStop();
  }, [recording]);

  const bg = BACKGROUNDS[lang] || BACKGROUNDS.initial;

  return (
    <div
      className="w-full h-screen overflow-hidden"
      style={{ background: "transparent" }}
      onClick={() => { if (resetInactivityTimer) resetInactivityTimer(); }}
      onTouchStart={() => { if (resetInactivityTimer) resetInactivityTimer(); }}
    >
      {!jesusEnabled && (
        <>
          <div
            className="fixed inset-0 -z-10"
            style={{
              backgroundImage: `url(${bg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
          <div className="fixed inset-0 -z-10 bg-black/10" />
        </>
      )}

      {(!jesusEnabled || chatEnabled) && (
        <div
          className="fixed left-0 right-0"
          style={{
            top: `${chatTopPx}px`,
            bottom: 76,
            zIndex: 40,
            background: "transparent"
          }}
        >
          <div
            className="h-full overflow-y-auto overflow-x-hidden px-3 pb-safe scrollbar-hide"
            style={{
              WebkitOverflowScrolling: "touch",
              opacity: isChatReady && isHistoryLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start'
            }}
          >
            {isChatReady && (() => {
              // Mostrar todos los mensajes y permitir scroll
              const displayMessages = messages;

              return displayMessages.map((m, idx) => {
                const displayRole = m.role || (m.sender === "user" ? "user" : "assistant");
                const isUserMessage = displayRole === "user";

                // En modo video, no mostrar separador de fecha
                const showDateSeparator = !jesusEnabled && (idx === 0 ||
                  (displayMessages[idx - 1] && displayMessages[idx - 1].ts.toDateString() !== m.ts.toDateString()));

                return (
                  <React.Fragment key={m.id}>
                    {showDateSeparator && <DateSeparator date={m.ts} language={lang} />}
                    <div
                      className={`mb-2 flex ${isUserMessage ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`${jesusEnabled && chatEnabled ? 'max-w-[85%]' : 'max-w-[78%]'} rounded-lg shadow`}
                        style={{
                          backgroundColor: isUserMessage ? WAPP_BUBBLE_USER : WAPP_BUBBLE_BOT,
                          padding: jesusEnabled && chatEnabled ? '8px 12px' : '8px 12px'
                        }}
                      >
                        <p
                          className="leading-relaxed whitespace-pre-wrap text-gray-900"
                          style={{
                            fontSize: jesusEnabled && chatEnabled ? '0.9rem' : '1rem'
                          }}
                        >
                          {m.text}
                        </p>
                        {!jesusEnabled && (
                          <p className="text-[0.625rem] sm:text-xs text-gray-500 mt-1 text-right">
                            {fmtTime(m.ts, lang)}
                          </p>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              });
            })()}

            {isTyping && (
              <div className="mb-2 flex justify-start">
                <div
                  className={`${jesusEnabled && chatEnabled ? 'max-w-[85%]' : 'max-w-[78%]'} rounded-lg shadow bg-white`}
                  style={{ padding: jesusEnabled && chatEnabled ? '6px 12px' : '8px 12px' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span
                      className="text-gray-500 italic"
                      style={{ fontSize: jesusEnabled && chatEnabled ? '0.8rem' : '0.875rem' }}
                    >
                      {I18N.typing[lang]}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>
      )}

      {(chatEnabled || jesusEnabled) && (
        <div
          className="fixed left-0 right-0 pb-safe"
          style={{ bottom: 8, zIndex: 45, background: "transparent" }}
        >
          <div className="w-full max-w-[90vw] sm:max-w-[680px] mx-auto px-2">
            <canvas
              ref={canvasRef}
              width={320}
              height={60}
              style={{ display: "none", position: "absolute" }}
            />

            {(
              <div className="flex flex-col gap-2">
                {isRecordingAudio && (
                  <div
                    className="text-white px-4 py-2 rounded-2xl flex items-center justify-between shadow-lg"
                    style={{
                      backgroundColor: jesusEnabled && chatEnabled ? 'rgba(239, 68, 68, 0.95)' : '#EF4444'
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                      <span className="font-medium">{I18N.recording[lang]} {recordingDuration}s</span>
                    </div>
                    <button
                      onClick={handleCancelRecording}
                      className="p-1 hover:bg-red-600 rounded-full transition-colors"
                      title={I18N.close[lang]}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <div
                    className="flex-1 rounded-3xl px-3 py-2 flex items-center gap-2 shadow"
                    style={{
                      backgroundColor: jesusEnabled && chatEnabled ? 'rgba(255, 255, 255, 0.95)' : 'white'
                    }}
                  >
                    <textarea
                      className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500 resize-none leading-6"
                      style={{
                        fontSize: jesusEnabled && chatEnabled ? '0.95rem' : '1rem',
                        maxHeight: jesusEnabled && chatEnabled ? '15vh' : '20vh'
                      }}
                      rows={1}
                      value={text}
                      onChange={(e) => {
                        const newText = e.target.value;
                        setText(newText);
                        // Notificar si hay texto (DETIENE timer de inactividad)
                        if (setUserHasText) setUserHasText(newText.trim().length > 0);
                      }}
                      placeholder={I18N.writeOrHold[lang]}
                      disabled={isRecordingAudio}
                    />
                  </div>
                  {text.trim() ? (
                    <button
                      onTouchStart={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!isPlaying) {
                          sendText();
                        }
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        sendText();
                      }}
                      disabled={isPlaying}
                      className="w-12 h-12 rounded-full flex items-center justify-center shadow active:scale-95 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: WAPP_GREEN, userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'manipulation' }}
                      title={I18N.send[lang]}
                    >
                      <Send className="w-5 h-5 text-white" style={{ pointerEvents: 'none' }} />
                    </button>
                  ) : (
                    <button
                      onTouchStart={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!(isPlaying && !recording && !isRecordingAudio)) {
                          handleToggleRecording(e);
                        }
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleToggleRecording(e);
                      }}
                      disabled={isPlaying && !recording && !isRecordingAudio}
                      className="w-12 h-12 rounded-full flex items-center justify-center shadow active:scale-95 flex-shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: (recording || isRecordingAudio) ? '#EF4444' : WAPP_GREEN, userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'manipulation' }}
                      title={(recording || isRecordingAudio) ? "Detener grabación" : "Grabar audio"}
                    >
                      {(recording || isRecordingAudio) ? (
                        <div className="w-4 h-4 bg-white rounded-sm" style={{ pointerEvents: 'none' }} />
                      ) : (
                        <Mic className="w-5 h-5 text-white" style={{ pointerEvents: 'none' }} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de créditos insuficientes */}
      {showInsufficientCredits && (
        <InsufficientCreditsModal
          language={lang}
          subscription={subscription}
          currentMode={currentMode}
          deviceId={deviceId}
          onClose={() => {
            setShowInsufficientCredits(false);
          }}
          onChangeMode={async (mode) => {
            setShowInsufficientCredits(false);
            await onChangeMode(mode);
          }}
          onRecharge={() => {
            setShowInsufficientCredits(false);
            onOpenSubscriptionPanel();
          }}
          onContact={() => {
            setShowInsufficientCredits(false);
            onContact();
          }}
          onLogout={() => {
            setShowInsufficientCredits(false);
            onLogout();
          }}
        />
      )}

      {/* Modal de inactividad ahora manejado en App.tsx (modal blanco) */}
    </div>
  );
}