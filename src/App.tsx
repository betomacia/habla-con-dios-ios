import React, { useEffect, useRef, useState, useCallback } from "react";
import { CircleUser as UserCircle, Check, ChevronLeft, WifiOff, Clock, AlertCircle, MessageSquare } from "lucide-react";
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import Chat from "./Chat";
import Menu from "./components/Menu";
import AvatarVideo from "./components/AvatarVideo";
import InsufficientCreditsModal from "./components/InsufficientCreditsModal";
import ContactForm from "./components/ContactForm";
import { StorageService } from './services/StorageService';
import { usePersistedUser } from "./hooks/usePersistedUser";
import { useCredits } from "./hooks/useCredits";
import LegalAcceptance from "./components/LegalAcceptance";
import PlanSelection from "./components/PlanSelection";
import { WelcomeService } from "./services/WelcomeService";
import type { ConversationMode, SubscriptionTier } from "./services/types";
import { versionService } from './services/VersionService';
import { UpdateModal } from './components/UpdateModal';
import { SubscriptionService } from './services/SubscriptionService';
import { BillingService } from './services/BillingService';
import { conversationService } from './services/ConversationService';
import { AuthService } from './services/AuthService';
import { AvatarResourceService } from './services/AvatarResourceService';

// ===== Endpoints
const BACKEND_URL = "https://backend.movilive.es";
const AVATAR_OFFER_URLS = [
  "https://backend.movilive.es/api/avatar/offer",
  "https://avatar.movilive.es/videostream",
];

export const CHAT_TOP_PX = 150;
export const CHAT_TOP_JESUS_MODE_PX = 540; // Más espacio para el video de Jesús
export type Language = "es" | "en" | "pt" | "it" | "de" | "fr";

// === Fondos locales
const BACKGROUNDS: Record<string, string> = {
  initial: "/FFONDO.jpeg",
  es: "/FESPANOL.jpeg",
  en: "/FINGLES.jpeg",
  pt: "/FBRASILERO.jpeg",
  it: "/FITALIANO.jpeg",
  de: "/FALEMAN.jpeg",
  fr: "/FFRANCES.jpeg",
};

const GRADIENTS: Record<string, string> = {
  initial: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  es: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  en: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  pt: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  it: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
  de: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
  fr: "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
};

const SYSTEM_MESSAGES = {
  reconnecting: {
    es: "Reconectando audio...",
    en: "Reconnecting audio...",
    pt: "Reconectando áudio...",
    it: "Riconnessione audio...",
    de: "Audio wird wiederverbunden...",
    fr: "Reconnexion audio...",
  },
  welcomeFallback: {
    es: "Hola. ¿Qué te gustaría compartir hoy?",
    en: "Hello. What would you like to share today?",
    pt: "Olá. O que você gostaria de compartilhar hoje?",
    it: "Ciao. Cosa vorresti condividere oggi?",
    de: "Hallo. Was möchten Sie heute teilen?",
    fr: "Bonjour. Que souhaitez-vous partager aujourd'hui?",
  },
  conversationStart: {
    es: "[Inicio de conversación]",
    en: "[Conversation start]",
    pt: "[Início de conversa]",
    it: "[Inizio conversazione]",
    de: "[Gesprächsbeginn]",
    fr: "[Début de conversation]",
  },
};

// ===== Error Boundary
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { err?: any }> {
  constructor(props: any) { super(props); this.state = { err: undefined }; }
  static getDerivedStateFromError(err: any) { return { err }; }
  componentDidCatch(err: any, info: any) { console.error("[UI] Error atrapado:", err, info); }
  render() {
    if (this.state.err) {
      return (
        <div style={{ position: "fixed", inset: 0, background: "#000", color: "#fff", padding: 16 }}>
          <b>Se produjo un error en la UI</b>
          <pre style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>{String(this.state.err)}</pre>
        </div>
      );
    }
    return this.props.children as any;
  }
}

function useBackground(screen: "language" | "terms" | "privacy" | "form" | "plans" | "chat" | "connecting", lang: Language) {
  const key = screen === "language" ? "initial" : lang;
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const src = BACKGROUNDS[key] || BACKGROUNDS.initial;
    const img = new Image();
    img.onload = () => setLoaded(true);
    img.onerror = () => setLoaded(false);
    img.src = src;
  }, [key]);
  const src = BACKGROUNDS[key] || BACKGROUNDS.initial;
  const style: React.CSSProperties = {
    zIndex: 0,
    backgroundImage: loaded ? `url(${src})` : GRADIENTS[key],
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    transition: "background-image 0.5s ease",
  };
  return { style };
}

function LanguageSelection({ onSelect }: { onSelect: (l: Language) => void }) {
  const langs = [
    ["es", "Español", "🇪🇸"],
    ["en", "English", "🇺🇸"],
    ["pt", "Português", "🇵🇹"],
    ["it", "Italiano", "🇮🇹"],
    ["de", "Deutsch", "🇩🇪"],
    ["fr", "Français", "🇫🇷"],
  ] as const;
  return (
    <div className="w-full max-w-xs">
      <div className="space-y-4">
        {langs.map(([code, name, flag]) => (
          <button
            key={code}
            onClick={() => onSelect(code as Language)}
            className="w-full flex items-center justify-center gap-4 py-5 px-6 rounded-2xl bg-black/55 hover:bg-black/70 active:scale-95 transition text-white border border-white/15"
          >
            <span className="text-4xl leading-none">{flag}</span>
            <span className="text-xl font-semibold">{name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const USER_FORM_I18N = {
  title: {
    es: "Información Personal",
    en: "Personal Information",
    pt: "Informações Pessoais",
    it: "Informazioni Personali",
    de: "Persönliche Informationen",
    fr: "Informations Personnelles",
  },
  subtitle: {
    es: "Completa tus datos para continuar",
    en: "Complete your details to continue",
    pt: "Complete seus dados para continuar",
    it: "Completa i tuoi dati per continuare",
    de: "Vervollständigen Sie Ihre Daten, um fortzufahren",
    fr: "Complétez vos informations pour continuer",
  },
  nameLabel: {
    es: "Nombre",
    en: "Name",
    pt: "Nome",
    it: "Nome",
    de: "Name",
    fr: "Nom",
  },
  namePlaceholder: {
    es: "Ingresa tu nombre",
    en: "Enter your name",
    pt: "Digite seu nome",
    it: "Inserisci il tuo nome",
    de: "Geben Sie Ihren Namen ein",
    fr: "Entrez votre nom",
  },
  genderLabel: {
    es: "Género",
    en: "Gender",
    pt: "Gênero",
    it: "Genere",
    de: "Geschlecht",
    fr: "Genre",
  },
  male: {
    es: "Masculino",
    en: "Male",
    pt: "Masculino",
    it: "Maschile",
    de: "Männlich",
    fr: "Masculin",
  },
  female: {
    es: "Femenino",
    en: "Female",
    pt: "Feminino",
    it: "Femminile",
    de: "Weiblich",
    fr: "Féminin",
  },
  submit: {
    es: "Aceptar y habilitar audio",
    en: "Accept and enable audio",
    pt: "Aceitar e habilitar áudio",
    it: "Accetta e abilita audio",
    de: "Akzeptieren und Audio aktivieren",
    fr: "Accepter et activer l'audio",
  },
  submitting: {
    es: "Conectando...",
    en: "Connecting...",
    pt: "Conectando...",
    it: "Connessione...",
    de: "Verbindung wird hergestellt...",
    fr: "Connexion...",
  },
  back: {
    es: "Volver",
    en: "Back",
    pt: "Voltar",
    it: "Indietro",
    de: "Zurück",
    fr: "Retour",
  },
};

function UserForm({
  lang,
  onSubmit,
  loading,
  onBack,
}: {
  lang: Language;
  onSubmit: (name: string, gender: string) => void;
  loading: boolean;
  onBack: () => void;
}) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const t = {
    title: USER_FORM_I18N.title[lang],
    subtitle: USER_FORM_I18N.subtitle[lang],
    nameLabel: USER_FORM_I18N.nameLabel[lang],
    namePlaceholder: USER_FORM_I18N.namePlaceholder[lang],
    genderLabel: USER_FORM_I18N.genderLabel[lang],
    male: USER_FORM_I18N.male[lang],
    female: USER_FORM_I18N.female[lang],
    submit: USER_FORM_I18N.submit[lang],
    submitting: USER_FORM_I18N.submitting[lang],
    back: USER_FORM_I18N.back[lang],
  };
  return (
    <div className="w-full max-w-md mt-12">
      <div className="bg-black/60 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-2xl">
        <div className="flex items-center mb-4">
          <button
            onClick={onBack}
            className="mr-2 rounded-full p-2 bg-black/50 hover:bg-black/70 border border-white/10"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        </div>
        <div className="flex flex-col items-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-full mb-3">
            <UserCircle className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-1 text-white drop-shadow">{t.title}</h1>
          <p className="text-sm text-white/90 drop-shadow">{t.subtitle}</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">{t.nameLabel}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              disabled={loading}
              className="w-full px-4 py-3 text-2xl rounded-xl bg-white/20 text-white placeholder-white/60 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-60"
              style={{ color: "#FFFFFF" }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-2">{t.genderLabel}</label>
            <div className="grid grid-cols-2 gap-3">
              {[{ value: "male", label: t.male }, { value: "female", label: t.female }].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => !loading && setGender(opt.value)}
                  className={`p-3.5 rounded-xl border transition ${
                    gender === opt.value
                      ? "bg-white text-black border-white"
                      : "bg-white/20 text-white border-white/30 hover:bg-white/30"
                  } ${loading ? "opacity-60" : ""}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => !loading && name.trim() && gender && onSubmit(name.trim(), gender)}
            disabled={loading || !name.trim() || !gender}
            className="w-full flex items-center justify-center gap-2 bg-white text-black font-semibold py-3.5 px-6 rounded-xl shadow disabled:bg-white/40 disabled:text-black/50 active:scale-95 transition"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                {t.submitting}
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                {t.submit}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =======================
   Reproductor: PCM16 24k → Float32 @ ctx.sampleRate (48k) + playHead
   ======================= */
class AudioQueuePlayer {
  private ctx: AudioContext;
  private playHead = 0;
  private pcmRate = 24000;
  private pcmChannels = 1;
  private onAudioStart?: () => void;
  private onAudioEnd?: () => void;
  private isPlaying = false;
  private endTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(ctx?: AudioContext, onAudioStart?: () => void, onAudioEnd?: () => void) {
    this.ctx = ctx || new AudioContext();
    // iOS: resumir AudioContext para permitir reproducción
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(e => console.warn('[PLAYER] Error resumiendo contexto:', e));
    }
    this.onAudioStart = onAudioStart;
    this.onAudioEnd = onAudioEnd;
  }

  setFormat(sampleRate?: number, channels?: number) {
    if (sampleRate && sampleRate > 0) this.pcmRate = sampleRate;
    if (channels && (channels === 1 || channels === 2)) this.pcmChannels = channels;
    console.log(`[PLAYER] fmt: ${this.pcmChannels}ch @ ${this.pcmRate}Hz (ctx=${this.ctx.sampleRate}Hz)`);
  }

  private resampleFloat32(src: Float32Array, inRate: number, outRate: number): Float32Array {
    if (inRate === outRate) return src;
    const ratio = outRate / inRate;
    const outLen = Math.ceil(src.length * ratio);
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const t = i / ratio;
      const i0 = Math.floor(t);
      const i1 = Math.min(i0 + 1, src.length - 1);
      const frac = t - i0;
      const s0 = src[i0];
      const s1 = src[i1];
      out[i] = s0 + (s1 - s0) * frac;
    }
    return out;
  }

  private scheduleFloat(floatData: Float32Array) {
    if (!floatData || !floatData.length) return;
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, floatData.length, sr);
    buf.copyToChannel(floatData, 0);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.ctx.destination);

    const now = this.ctx.currentTime + 0.02;
    this.playHead = Math.max(this.playHead, now);

    // Notificar inicio de audio SOLO la primera vez
    if (!this.isPlaying && this.onAudioStart) {
      console.log('[PLAYER] 🔊 Iniciando reproducción de audio');
      this.isPlaying = true;
      this.onAudioStart();
    }

    // Cancelar timer anterior si existe
    if (this.endTimer) {
      clearTimeout(this.endTimer);
      this.endTimer = null;
    }

    src.start(this.playHead);
    this.playHead += buf.duration;

    // Programar fin de audio después de 2 segundos de silencio
    // (esto permite que lleguen más chunks sin llamar a onAudioEnd)
    src.onended = () => {
      if (this.endTimer) {
        clearTimeout(this.endTimer);
      }

      this.endTimer = setTimeout(() => {
        if (this.isPlaying && this.onAudioEnd) {
          console.log('[PLAYER] 🔇 Reproducción de audio finalizada (2s de silencio)');
          this.isPlaying = false;
          this.onAudioEnd();
        }
      }, 2000);
    };
  }

  async enqueuePCM16(int16: Int16Array, channels?: number, sampleRate?: number) {
    // iOS: asegurar que el contexto está activo antes de reproducir
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume().catch(e => console.warn('[PLAYER] Error resumiendo contexto:', e));
    }
    if (sampleRate || channels) this.setFormat(sampleRate, channels);
    const ch = channels ?? this.pcmChannels;
    const sr = sampleRate ?? this.pcmRate;

    if (ch === 2) {
      const frames = Math.floor(int16.length / 2);
      const mono = new Float32Array(frames);
      for (let i = 0, f = 0; f < frames; f++, i += 2) {
        mono[f] = ((int16[i] + int16[i + 1]) / 2) / 32768.0;
      }
      const f32 = this.resampleFloat32(mono, sr, this.ctx.sampleRate);
      this.scheduleFloat(f32);
    } else {
      const mono = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) mono[i] = int16[i] / 32768.0;
      const f32 = this.resampleFloat32(mono, sr, this.ctx.sampleRate);
      this.scheduleFloat(f32);
    }
  }

  async resume() {
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }
}

/* =======================
   Cliente WS TTS
   ======================= */
class TTSWSClient {
  private url: string;
  private deviceId: string;
  private sessionId: string;
  private ws: WebSocket | null = null;
  private player: AudioQueuePlayer;
  private onReady: (r: boolean) => void;
  private onDone: () => void;
  private reconnectTimer: any = null;
  private remoteRate = 24000;
  private remoteChannels = 1;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private onConnectionError: (() => void) | null = null;

  constructor(url: string, deviceId: string, sessionId: string, player: AudioQueuePlayer, onReady: (r: boolean)=>void, onDone: ()=>void, onConnectionError?: () => void) {
    this.url = url;
    this.deviceId = deviceId;
    this.sessionId = sessionId;
    this.player = player;
    this.onReady = onReady;
    this.onDone = onDone;
    this.onConnectionError = onConnectionError || null;
  }

  async connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;

    const token = await AuthService.getToken(this.deviceId);
    const wsUrl = `${this.url}?token=${token}`;
    this.ws = new WebSocket(wsUrl);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      // Registrar sessionId en servidor T4
      this.ws!.send(JSON.stringify({ sessionId: this.sessionId }));
      console.log('[TTS WS] Conectado y sessionId enviado:', this.sessionId);
      this.onReady(true);
      const unlock = () => { this.player.resume(); document.removeEventListener("click", unlock); document.removeEventListener("touchstart", unlock); };
      document.addEventListener("click", unlock, { once: true });
      document.addEventListener("touchstart", unlock, { once: true });
    };

    this.ws.onclose = () => {
      this.onReady(false);
      this.reconnectAttempts++;

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        console.log(`[TTS WS] Reconexión intento ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect().catch(err => {
              console.error('[TTS WS] Error en reconexión:', err);
            });
          }, 1500);
        }
      } else {
        console.log('[TTS WS] Máximo de intentos alcanzado, notificando error');
        if (this.onConnectionError) {
          this.onConnectionError();
        }
        this.reconnectAttempts = 0;
      }
    };

    this.ws.onerror = () => {};

    this.ws.onmessage = async (ev) => {
      if (ev.data instanceof Blob || ev.data instanceof ArrayBuffer) {
        const ab = ev.data instanceof Blob ? await ev.data.arrayBuffer() : ev.data;
        const pcm16 = new Int16Array(ab);
        await this.player.enqueuePCM16(pcm16, this.remoteChannels, this.remoteRate);
      } else {
        try {
          const data = JSON.parse(ev.data);
          if (data.type === "start") {
            if (typeof data.sample_rate === "number") this.remoteRate = data.sample_rate;
            if (typeof data.channels === "number") this.remoteChannels = data.channels;
            this.player.setFormat(this.remoteRate, this.remoteChannels);
            console.log(`[WS] start: ${this.remoteChannels}ch @ ${this.remoteRate}Hz`);
          } else if (data.type === "end") {
            this.onDone();
          } else if (data.error) {
            console.error("[WS] error:", data.error);
            this.onDone();
          }
        } catch {}
      }
    };
  }

  synthesize(payload: { text: string; lang: Language; sessionId?: string }) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WS not ready");
    }
    const msg = {
      text: payload.text,
      voice_id: "jesus_default",
      speed: 1.0,
      lang: payload.lang,
      sessionId: payload.sessionId,
    };
    this.ws.send(JSON.stringify(msg));
  }

  readyState(): "open" | "connecting" | "closed" {
    if (!this.ws) return "closed";
    return this.ws.readyState === WebSocket.OPEN ? "open" :
           this.ws.readyState === WebSocket.CONNECTING ? "connecting" : "closed";
  }

  resetReconnectAttempts() {
    this.reconnectAttempts = 0;
  }
}

export default function App() {
  console.log("🔥 APP VERSIÓN 2025-11-21 19:15 🔥");

  // ===== PERSISTENCIA =====
  const {
    userData,
    isConfigured,
    hasAcceptedTerms,
    hasAcceptedPrivacy,
    lastMode,
    acceptTerms,
    acceptPrivacy,
    saveUser,
    saveLastMode,
    logout,
    deviceId,
    deviceIdLoaded
  } = usePersistedUser();

  // ===== SISTEMA DE CRÉDITOS =====
  // Solo inicializar cuando deviceId esté listo
  const {
    subscription,
    loading: creditsLoading,
    hasCredits,
    needsSubscription,
    canAsk,
    updateSubscription,
    questionsRemaining,
    reload: reloadSubscription,
  } = useCredits(deviceIdLoaded ? deviceId : '', BACKEND_URL);

  // NOTA: BillingService.initialize() se llama ahora solo en PlanSelection.tsx
  // para evitar errores de conexión al iniciar la app

  // Fondo base negro
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "app-base-bg";
    style.textContent = `html,body,#root{background:#000;margin:0;padding:0}`;
    document.head.appendChild(style);
    return () => {
      try { document.head.removeChild(style); } catch {}
    };
  }, []);

  const [screen, setScreen] = useState<"language" | "terms" | "privacy" | "form" | "plans" | "connecting" | "chat">("language");
  const [lang, setLang] = useState<Language>("es");
  const { style: bgStyle } = useBackground(screen, lang);

  // Estados generales
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [welcome, setWelcome] = useState("");
  const [hasShownWelcomeThisSession, setHasShownWelcomeThisSession] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [jesusEnabled, setJesusEnabled] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>>([]);
  const [isChatReady, setIsChatReady] = useState(false);

  // Estados de versión
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);

  // Estados de verificación inicial
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);
  const [isReturningUser, setIsReturningUser] = useState(false);

  // Señales de conexión
  const [ttsReady, setTtsReady] = useState(false);
  const [hasAvatarStream, setHasAvatarStream] = useState(false);

  // Sistema de inactividad
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [showGoodbyeModal, setShowGoodbyeModal] = useState(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAudioTimeRef = useRef<number>(Date.now());
  const audioActiveRef = useRef(false);
  const [audioMonitorKey, setAudioMonitorKey] = useState(0); // Para forzar reinicio del monitor
  const [isPlayingAudio, setIsPlayingAudio] = useState(false); // Estado de reproducción para bloquear menú

  // Sistema de reconexión
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [showConnectionError, setShowConnectionError] = useState(false);
  const [showInsufficientCreditsModal, setShowInsufficientCreditsModal] = useState(false);
  const [allowCloseModal, setAllowCloseModal] = useState(true); // Si es false, el modal es obligatorio
  const [showContactForm, setShowContactForm] = useState(false);
  const intentionalDisconnectRef = useRef(false); // Bandera para desconexiones intencionadas (protector de consumo, etc.)

  // Log del estado de subscription cada vez que cambia
  useEffect(() => {
    console.log('[App] 📊 Estado subscription actualizado:', {
      tier: subscription.tier,
      creditsRemaining: subscription.creditsRemaining,
      renewalDate: subscription.renewalDate
    });
  }, [subscription]);

  // Sessiones - Generar sessionId único basado en deviceId + timestamp
  // CRÍTICO: Mismo sessionId para WebRTC y mensajes
  const [sessionId, setSessionId] = useState<string>('');
  const [livetalkSessionId, setLivetalkSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string>(''); // ✅ Ref para acceder al sessionId actual en callbacks

  // Inicializar sessionId ÚNICO cuando deviceId esté disponible
  useEffect(() => {
    if (deviceId && !sessionId) {
      const uniqueSessionId = `${deviceId}-${Date.now()}`;
      console.log('[App] 🔑 Generando sessionId único:', uniqueSessionId);
      setSessionId(uniqueSessionId);
      sessionIdRef.current = uniqueSessionId; // ✅ Actualizar ref inmediatamente
    }
  }, [deviceId, sessionId]);

  // Mantener ref sincronizado con state
  useEffect(() => {
    if (sessionId) {
      sessionIdRef.current = sessionId;
      console.log('[App] 🔑 sessionIdRef actualizado:', sessionId);
    }
  }, [sessionId]);

  // Refs de conexión AVATAR
  const avatarPcRef = useRef<RTCPeerConnection | null>(null);
  const avatarDcRef = useRef<RTCDataChannel | null>(null);
  const avatarStreamRef = useRef<MediaStream | null>(null);
  const avatarConnectingRef = useRef(false);

  const jesusEnabledRef = useRef(jesusEnabled);
  const hasAvatarStreamRef = useRef(false);
  const avatarResourceServiceRef = useRef(new AvatarResourceService(BACKEND_URL));
  const previousModeRef = useRef<ConversationMode | null>(null);

  useEffect(() => { jesusEnabledRef.current = jesusEnabled; }, [jesusEnabled]);
  useEffect(() => { hasAvatarStreamRef.current = hasAvatarStream; }, [hasAvatarStream]);

  // ===== VERIFICAR SUSCRIPCIÓN AL INICIO =====
  useEffect(() => {
    async function initializeApp() {
      if (!deviceIdLoaded) {
        console.log('[App] ⏳ Esperando deviceId...');
        return;
      }

      console.log('[App] 🔍 Verificando suscripción existente...');
      setIsCheckingSubscription(true);

      // ⚠️ Verificar PRIMERO si hay datos en localStorage para evitar crear registros fantasma
      const storedData = localStorage.getItem('jesus_avatar_user_data');
      const hasLocalData = !!storedData;

      console.log('[App] 📦 ¿Hay datos locales?:', hasLocalData);

      if (!hasLocalData) {
        console.log('[App] 📭 Sin datos locales → Verificando backend con deviceId...');
        try {
          const subscriptionService = new SubscriptionService(BACKEND_URL);
          const result = await subscriptionService.checkUserHasPlan(deviceId);
          console.log('[App] 📊 Resultado backend:', result);

          if (result.user_name && result.language && result.gender) {
            console.log('[App] ✅ Usuario existe en backend → Restaurando datos');
            saveUser({
              name: result.user_name,
              gender: result.gender as "male" | "female",
            });
            setLang(result.language);
            setIsReturningUser(true);
            const savedMode = result.last_mode || 'video-chat';
            await handleChangeMode(savedMode as ConversationMode);
            setScreen('chat');
            setIsCheckingSubscription(false);
            return;
          }
        } catch (error) {
          console.error('[App] ⚠️ Error verificando backend:', error);
        }
        setScreen('language');
        setIsCheckingSubscription(false);
        return;
      }

      // Usuario tiene datos locales → Verificar en backend (UNA sola vez aquí)
      const initTimeout = setTimeout(() => {
        console.warn('[App] ⚠️ Timeout de inicialización - continuando con pantalla de idioma');
        setScreen('language');
        setIsCheckingSubscription(false);
      }, 10000);

      try {
        const subscriptionService = new SubscriptionService(BACKEND_URL);
        const planCheck = await subscriptionService.checkUserHasPlan(deviceId);
        clearTimeout(initTimeout);

        console.log('[App] 📊 Resultado de verificación:', planCheck);

        if (!planCheck.has_plan) {
          // USUARIO NUEVO (404 del backend) - NO EXISTE EN LA BD
          console.log('[App] 🆕 Usuario nuevo detectado → Iniciando onboarding');
          setScreen("language");
          setIsCheckingSubscription(false);
        } else {
          // USUARIO EXISTE EN BACKEND
          // Verificar si tiene datos completos
          const hasCompleteData =
            planCheck.user_name &&
            planCheck.gender &&
            planCheck.language;

          if (!hasCompleteData) {
            // Usuario con cuenta creada pero sin datos → Onboarding completo
            console.log('[App] 🆕 Usuario con cuenta creada pero datos incompletos → Onboarding completo');
            setScreen("language");
            setIsCheckingSubscription(false);
          } else {
            // DATOS COMPLETOS → Usuario recurrente
            console.log('[App] ✅ Usuario recurrente detectado');
            console.log('[App] 💾 Cargando datos desde backend:', {
              name: planCheck.user_name,
              gender: planCheck.gender,
              language: planCheck.language,
              credits: planCheck.credits_remaining
            });

            // Marcar como usuario recurrente
            setIsReturningUser(true);

            // Guardar en localStorage
            saveUser({
              name: planCheck.user_name,
              gender: planCheck.gender as "male" | "female",
              language: planCheck.language as Language
            });

            // Aceptar términos automáticamente (usuario ya existente)
            acceptTerms();
            acceptPrivacy();

            setLang(planCheck.language as Language);

            // Actualizar créditos
            updateSubscription({
              ...subscription,
              creditsRemaining: planCheck.credits_remaining,
              creditsTotal: planCheck.credits_total || subscription.creditsTotal,
              tier: planCheck.tier || subscription.tier,
            });

            // Cargar último modo
            let savedMode = planCheck.last_mode || 'chat';
            if (savedMode === 'video-chat') {
              const localMode = StorageService.getLastMode();
              if (localMode === 'video') {
                savedMode = 'video';
              }
            }
            console.log('[App] 🎨 Modo guardado:', savedMode);
            StorageService.saveLastMode(savedMode);
            saveLastMode(savedMode as ConversationMode);

            // Configurar modos
            setChatEnabled(savedMode === 'chat' || savedMode === 'chat-audio' || savedMode === 'video-chat');
            setAudioEnabled(savedMode === 'chat-audio');
            setJesusEnabled(savedMode === 'video-chat' || savedMode === 'video');

            // Inicializar TTS solo para modo chat-audio (NO para video-chat o video)
            if (savedMode === 'chat-audio') {
              await initTTS();
            }

            // Cargar historial de conversaciones para TODOS los modos
            console.log('[App] 📜 Cargando historial de conversaciones...');
            try {
              const subscriptionService = new SubscriptionService(BACKEND_URL);
              const historyData = await subscriptionService.getChatHistory(deviceId, 60);
              console.log('[App] 🔍 Respuesta de getChatHistory:', historyData);

              if (historyData && historyData.messages && historyData.messages.length > 0) {
                console.log('[App] 🔍 Mensajes recibidos:', historyData.messages.length);

                const formattedHistory = historyData.messages.flatMap(msg => [
                  { role: 'user' as const, content: msg.user_message, timestamp: msg.created_at },
                  { role: 'assistant' as const, content: msg.assistant_message, timestamp: msg.created_at }
                ]);

                console.log('[App] 🔍 Historial formateado:', formattedHistory.length, 'mensajes');
                setChatHistory(formattedHistory);
                console.log('[App] ✅ Historial cargado');
              } else {
                console.log('[App] ℹ️ Sin historial previo');
              }
            } catch (error) {
              console.error('[App] ❌ Error cargando historial:', error);
            }

            // Ir a pantalla correspondiente según el modo
            if (savedMode === 'video-chat' || savedMode === 'video') {
              console.log('[App] 🎬 Usuario recurrente con modo video → ir a connecting para iniciar WebRTC');
              setScreen("connecting");  // Esto activará el useEffect de WebRTC
            } else {
              console.log('[App] 💬 Usuario recurrente con modo chat → ir directo a chat');
              setScreen("chat");

              // Cargar bienvenida para modo chat/chat-audio
              if (!hasShownWelcomeThisSession) {
                const welcomeService = new WelcomeService(BACKEND_URL);
                const currentMode = savedMode === 'chat-audio' ? 'chat-audio' : 'chat';
                try {
              const welcomeData = await welcomeService.getWelcome(
    lang,
    planCheck.user_name,
    planCheck.gender,
    deviceId,
    currentMode,
    sessionIdRef.current
);
                  if (welcomeData) {
                    const welcomeText = welcomeService.formatWelcomeText(welcomeData);
                    setWelcome(welcomeText);
                    setHasShownWelcomeThisSession(true);
                    setChatHistory(prev => [...prev, {
                      role: 'assistant',
                      content: welcomeText,
                      timestamp: new Date().toISOString()
                    }]);
                    console.log('[App] ✅ Bienvenida cargada para modo chat');

                    // Guardar en BD con timestamp del dispositivo
                    const now = new Date();
                    const clientTimestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
                    await conversationService.saveConversation({
                      device_id: deviceId,
                      user_message: '[Inicio de conversación]',
                      assistant_message: `${welcomeData.message} ${welcomeData.response} ${welcomeData.question}`.trim(),
                      language: lang,
                      mode: currentMode,
                      credits_used: 0,
                      session_id: welcomeData.sessionId || sessionIdRef.current,
                      bible: welcomeData.bible,
                      client_timestamp: clientTimestamp
                    });
                    console.log('[Welcome] ✅ Bienvenida guardada en BD');
                  }
                } catch (error) {
                  console.error('[App] ❌ Error cargando bienvenida:', error);
                }
              }
            }

            setIsCheckingSubscription(false);
            setIsChatReady(true);
          }
        }
      } catch (error) {
        console.error('[App] ❌ Error en verificación inicial:', error);
        clearTimeout(initTimeout);

        // NO ir a chat, forzar onboarding completo
        console.log('[App] 🔄 Error de red o usuario no existe, forzando onboarding');
        localStorage.removeItem('jesus_avatar_user_data');
        setScreen('language');
        setIsCheckingSubscription(false);
      }
    }

    initializeApp();
  }, [deviceId, deviceIdLoaded]);

  // ===== CARGAR WELCOME AUTOMÁTICO =====
  useEffect(() => {
    // Cargar welcome cuando el historial está vacío
    if (isConfigured && userData && screen === "chat" && (chatEnabled || audioEnabled) && chatHistory.length === 0) {
      console.log('[App] 🔄 useEffect: Cargando welcome...');
      console.log('[App] 📄 userData:', {
        language: userData.language,
        name: userData.name,
        gender: userData.gender
      });

      // Determinar el modo correcto
      const currentMode = audioEnabled ? 'chat-audio' : 'chat';
      console.log('[App] 🎯 Modo detectado:', currentMode);

      async function loadWelcome() {
        // Verificar si ya se mostró la bienvenida en esta sesión
        if (hasShownWelcomeThisSession) {
          console.log('[App] ⏭️ Bienvenida ya mostrada en esta sesión, saltando...');
          return;
        }

        const welcomeService = new WelcomeService(BACKEND_URL);
        try {
          const welcomeData = await welcomeService.getWelcome(
            userData.language,
            userData.name,
            userData.gender,
            deviceId,
            currentMode,
            sessionId
          );

          console.log('[App] 📦 useEffect welcomeData:', welcomeData ? 'YES' : 'NULL');

          if (welcomeData) {
            const text = welcomeService.formatWelcomeText(welcomeData);
            console.log('[App] ✅ useEffect: Welcome seteado:', text.substring(0, 50));
            setWelcome(text);
            setHasShownWelcomeThisSession(true);

            // Agregar bienvenida al chat
            setChatHistory(prev => [...prev, {
              role: 'assistant',
              content: text,
              timestamp: new Date().toISOString()
            }]);
            console.log('[App] ✅ Bienvenida agregada al chat');

            try {
              console.log('[Welcome] 💾 Guardando bienvenida en BD...');
              const now = new Date();
              const clientTimestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
              await conversationService.saveConversation({
                device_id: deviceId,
                user_message: SYSTEM_MESSAGES.conversationStart[userData.language as Language] || SYSTEM_MESSAGES.conversationStart.en,
                assistant_message: `${welcomeData.message} ${welcomeData.response} ${welcomeData.question}`.trim(),
                language: userData.language,
                mode: currentMode,
                credits_used: 0,
                session_id: welcomeData.sessionId,
                bible: welcomeData.bible,
                client_timestamp: clientTimestamp
              });
              console.log('[Welcome] ✅ Bienvenida guardada en BD');
            } catch (error) {
              console.error('[Welcome] ❌ Error guardando bienvenida en BD:', error);
            }
          } else {
            console.warn('[App] ⚠️ useEffect: welcomeData null, usando fallback');
            setWelcome(welcomeService.getFallbackWelcome(userData.language));
          }
        } catch (error) {
          console.error('[App] ❌ useEffect error:', error);
          console.error('[App] Error cargando welcome:', error);
          setWelcome(welcomeService.getFallbackWelcome(userData.language));
        }
      }
      loadWelcome();
    }
  }, [isConfigured, userData, screen, chatEnabled, audioEnabled, chatHistory.length]);

  // ===== VERIFICAR VERSIÓN DE LA APP =====
  useEffect(() => {
    const checkAppVersion = async () => {
      console.log('[App] 🔍 Verificando versión de la app...');
      const versionCheck = await versionService.checkVersion(lang || 'es');

      if (versionCheck) {
        console.log('[App] 📱 Version check:', versionCheck);

        if (versionCheck.forceUpdate || versionCheck.updateAvailable) {
          setUpdateInfo(versionCheck);
          setShowUpdateModal(true);
        }
      }
    };

    if (lang) {
      checkAppVersion();
    }
  }, [lang]);

  // ====== TTS WebSocket Client ======
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playerRef = useRef<AudioQueuePlayer | null>(null);
  const ttsWSRef = useRef<TTSWSClient | null>(null);
  const chatSessionPortRef = useRef<number | null>(null);

  const tryProcessQueue = useCallback(() => {
    if ((window as any).__ttsBusy__) return;
    const queue: Array<{ text: string; lang: Language; sessionId?: string }> = (window as any).__outQueue__ || [];
    const item = queue.shift();
    (window as any).__outQueue__ = queue;
    if (!item) return;

    const canVideo =
      jesusEnabledRef.current &&
      hasAvatarStreamRef.current &&
      avatarDcRef.current?.readyState === "open";

    try {
      if (canVideo && avatarDcRef.current) {
        avatarDcRef.current.send(JSON.stringify({ text: item.text, lang: item.lang, sessionId: item.sessionId }));
        (window as any).__ttsBusy__ = true;
        console.log("[MUX] ▶️ Texto enviado a AVATAR");
      } else if (ttsWSRef.current && ttsWSRef.current.readyState() === "open") {
        ttsWSRef.current.synthesize(item);
        (window as any).__ttsBusy__ = true;
        console.log("[MUX] ▶️ Texto enviado a VOZ (WS)");
      } else {
        console.warn("[MUX] ❌ No hay canal abierto, reintento…");
        queue.unshift(item);
        (window as any).__outQueue__ = queue;
        setTimeout(tryProcessQueue, 300);
      }
    } catch (e) {
      console.error("[MUX] ❌ error enviando:", e);
      (window as any).__ttsBusy__ = false;
      queue.unshift(item);
      (window as any).__outQueue__ = queue;
      setTimeout(tryProcessQueue, 600);
    }
  }, []);

  // ===== AVATAR: stopAvatarWebRTC (movido aquí para usarlo en startInactivityTimer) =====
  const stopAvatarWebRTC = useCallback((preserveSessionId: boolean = false) => {
    console.log('[Avatar] 🔌 Cerrando WebRTC...', preserveSessionId ? '(preservando sessionId)' : '');

    // Marcar como desconexión intencional si se preserva el sessionId (protector de consumo, etc.)
    if (preserveSessionId) {
      intentionalDisconnectRef.current = true;
      console.log('[Avatar] 🔔 Marcado como desconexión intencional (no mostrar error de conexión)');
    }

    // 🔓 LIBERAR RECURSOS DEL BACKEND si estamos en modo video
    if (jesusEnabledRef.current && deviceId && sessionId) {
      console.log('[Avatar] 🔓 Liberando recursos de video en el backend');
      avatarResourceServiceRef.current.releaseVideoResources(deviceId, sessionId);
    }

    try {
      avatarPcRef.current?.close();
    } catch (e) {
      console.error('[Avatar] Error cerrando WebRTC:', e);
    }
    avatarPcRef.current = null;
    avatarDcRef.current = null;
    avatarStreamRef.current = null;
    setHasAvatarStream(false);

    // Solo limpiar sessionId si NO queremos preservarlo
    if (!preserveSessionId) {
      setLivetalkSessionId(null);
      console.log('[Avatar] ✅ WebRTC cerrado, sessionId limpiado, Jesús desactivado');
    } else {
      console.log('[Avatar] ✅ WebRTC cerrado, sessionId PRESERVADO para reconexión');
    }

    setJesusEnabled(false);
    jesusEnabledRef.current = false;
  }, [deviceId, sessionId]);

  // ===== Sistema de detección de inactividad =====
  // Protector de consumo - llamar al backend para penalización
  const applyInactivityPenalty = useCallback(async () => {
    try {
      console.log('[Inactivity] 💰 Aplicando penalización por inactividad...');
      const token = await AuthService.getToken(deviceId);
      const response = await fetch(`${BACKEND_URL}/api/subscription/inactivity-penalty`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ deviceId })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[Inactivity] ✅ Penalización aplicada, créditos restantes:', data.credits_remaining);
        // Actualizar créditos con el valor del backend
        await reloadSubscription();
      } else {
        console.error('[Inactivity] ❌ Error del servidor:', response.status);
      }
    } catch (error) {
      console.error('[Inactivity] ❌ Error aplicando penalización:', error);
    }
  }, [deviceId, reloadSubscription]);

  const startInactivityTimer = useCallback(() => {
    // Limpiar timer existente si hay alguno
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    // Solo activar timer si jesusEnabled está activo
    if (!jesusEnabledRef.current || !hasAvatarStreamRef.current) {
      console.log('[Inactivity] ⚠️ Timer NO iniciado - jesusEnabled:', jesusEnabledRef.current, 'hasStream:', hasAvatarStreamRef.current);
      return;
    }

    console.log('[Inactivity] ⏰ Iniciando timer de 50 segundos...');
    const startTime = Date.now();

    inactivityTimerRef.current = setTimeout(async () => {
      const endTime = Date.now();
      const elapsedSeconds = Math.round((endTime - startTime) / 1000);
      console.log('[Inactivity] ⏱️ Timer cumplido después de', elapsedSeconds, 'segundos');
      console.log('[Inactivity] 🛑 Protector de consumo activado');

      // 1. APLICAR PENALIZACIÓN EN BACKEND (descuenta 6 créditos)
      await applyInactivityPenalty();

      // 2. MARCAR COMO DESCONEXIÓN INTENCIONAL INMEDIATAMENTE
      intentionalDisconnectRef.current = true;
      console.log('[Inactivity] 🔔 Marcado como desconexión intencional (protector de consumo)');

      // 3. MOSTRAR MODAL PRIMERO (antes de cerrar WebRTC)
      console.log('[Inactivity] 📱 Mostrando modal de protección');
      setShowInactivityModal(true);

      // 4. ESPERAR 2 SEGUNDOS y luego CERRAR WebRTC
      console.log('[Inactivity] ⏳ Esperando 2 segundos antes de cerrar WebRTC...');
      setTimeout(() => {
        console.log('[Inactivity] 🔌 Cerrando WebRTC para dejar de consumir...');
        stopAvatarWebRTC(true); // true = preservar sessionId para reconexión
        setJesusEnabled(false);
        jesusEnabledRef.current = false;
        setHasAvatarStream(false);
        hasAvatarStreamRef.current = false;
        console.log('[Inactivity] ✅ WebRTC cerrado');
      }, 2000);

      // Limpiar referencia del timer
      inactivityTimerRef.current = null;
    }, 50000); // 50 segundos

    console.log('[Inactivity] ✅ Timer de 50s iniciado a las', new Date(startTime).toLocaleTimeString());
  }, [stopAvatarWebRTC, applyInactivityPenalty]);

  const resetInactivityTimer = useCallback(() => {
    console.log('[Inactivity] 🔄 Timer reseteado');
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  const handleAudioStart = useCallback(() => {
    console.log('[Inactivity] 🔊 Audio iniciado');
    audioActiveRef.current = true;
    lastAudioTimeRef.current = Date.now();
    setIsPlayingAudio(true);
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const welcomePlayingRef = useRef(false);
  const welcomeCreditsDeductedRef = useRef(false);
  const modeRestoredRef = useRef(false);
  const webrtcInitializedRef = useRef(false);  // Para evitar múltiples inicios de WebRTC

  const handleAudioEnd = useCallback(async () => {
    const now = Date.now();
    console.log('[Inactivity] 🔇 Audio terminado a las', new Date(now).toLocaleTimeString());
    audioActiveRef.current = false;
    setIsPlayingAudio(false);

    // Si era la bienvenida, marcar como completada
    if (welcomePlayingRef.current && !welcomeCreditsDeductedRef.current) {
      console.log('[Welcome] 🎉 Bienvenida finalizada (audio)');
      welcomeCreditsDeductedRef.current = true;
      welcomePlayingRef.current = false;
    }

    // Esperar 10 segundos después de que el audio termine antes de iniciar timer de inactividad
    console.log('[Inactivity] ⏳ Esperando 10 segundos antes de iniciar timer de 50s');
    setTimeout(() => {
      // Solo iniciar timer si sigue sin audio y Jesús está activo
      if (!audioActiveRef.current && jesusEnabledRef.current && hasAvatarStreamRef.current) {
        const timerStart = Date.now();
        console.log('[Inactivity] ⏰ Han pasado 10s. Iniciando timer de 50s a las', new Date(timerStart).toLocaleTimeString());
        startInactivityTimer();
      } else {
        console.log('[Inactivity] ❌ No se inicia timer - audioActive:', audioActiveRef.current, 'jesusEnabled:', jesusEnabledRef.current, 'hasStream:', hasAvatarStreamRef.current);
      }
    }, 10000);
  }, [startInactivityTimer, audioEnabled, subscription.creditsRemaining]);

  const getChatSessionPort = useCallback(async (): Promise<number> => {
    // Si ya tenemos un puerto guardado, usarlo
    if (chatSessionPortRef.current !== null) {
      console.log('[TTS] Usando puerto guardado:', chatSessionPortRef.current);
      return chatSessionPortRef.current;
    }

    try {
      const token = await AuthService.getToken(deviceId);
      const response = await fetch(`${BACKEND_URL}/api/chat-session/init`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ sessionId: sessionIdRef.current })
      });

      if (!response.ok) {
        throw new Error(`Error al obtener puerto: ${response.status}`);
      }

      const data = await response.json();
      const port = data.port || 8001;

      // Guardar el puerto para reutilizarlo
      chatSessionPortRef.current = port;
      console.log('[TTS] Puerto asignado desde backend:', port);

      return port;
    } catch (error) {
      console.error('[TTS] Error al obtener puerto, usando 8001 por defecto:', error);
      chatSessionPortRef.current = 8001;
      return 8001;
    }
  }, [deviceId]);

  // iOS: función para desbloquear audio con interacción del usuario
  const unlockAudio = useCallback(async () => {
    try {
      const ctx = new AudioContext();
      await ctx.resume();
      console.log('[Audio] ✅ Audio desbloqueado para iOS');
      ctx.close();
    } catch (error) {
      console.warn('[Audio] ⚠️ Error desbloqueando audio:', error);
    }
  }, []);

  const initTTS = useCallback(async () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
      // iOS: resumir contexto inmediatamente
      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume().catch(e => console.warn('[TTS] Error resumiendo contexto:', e));
      }
    }
    if (!playerRef.current) {
      playerRef.current = new AudioQueuePlayer(
        audioCtxRef.current,
        handleAudioStart,
        handleAudioEnd
      );
    }
    if (!ttsWSRef.current) {
      // Obtener puerto dinámico del backend
      const port = await getChatSessionPort();
      const dynamicTtsUrl = `wss://voz.movilive.es/ws/${port}`;
      console.log('[TTS] Usando URL dinámica:', dynamicTtsUrl);

      ttsWSRef.current = new TTSWSClient(
        dynamicTtsUrl,
        deviceId,
        sessionIdRef.current,
        playerRef.current,
        (r) => setTtsReady(r),
        () => { (window as any).__ttsBusy__ = false; tryProcessQueue(); },
        () => {
          console.log('[App] Error de conexión TTS WebSocket');
          setShowConnectionError(true);
        }
      );
    }
    await ttsWSRef.current.connect().catch(err => {
      console.error('[App] Error al conectar TTS WebSocket:', err);
      setShowConnectionError(true);
    });
  }, [tryProcessQueue, handleAudioStart, handleAudioEnd, deviceId, getChatSessionPort]);

  // ===== Control del timer de inactividad =====
  useEffect(() => {
    if (hasAvatarStream && jesusEnabled) {
      console.log('[Inactivity] 🎬 Video cargado con Jesús activo');
      console.log('[Inactivity] 🔍 Estado actual - jesusEnabled:', jesusEnabled, 'hasAvatarStream:', hasAvatarStream, 'audioActive:', audioActiveRef.current);

      // Si no hay audio activo, iniciar timer después de 10 segundos
      if (!audioActiveRef.current) {
        console.log('[Inactivity] ⏳ No hay audio activo, iniciando timer en 10 segundos...');
        setTimeout(() => {
          if (!audioActiveRef.current && jesusEnabledRef.current && hasAvatarStreamRef.current) {
            console.log('[Inactivity] ⏰ Iniciando timer de 50s desde useEffect');
            startInactivityTimer();
          } else {
            console.log('[Inactivity] ❌ Condiciones cambiaron, no se inicia timer');
          }
        }, 10000);
      } else {
        console.log('[Inactivity] 🔊 Hay audio activo, esperando a que termine...');
      }
    } else if (!jesusEnabled) {
      // Si Jesús se desactiva, limpiar timer
      console.log('[Inactivity] 🛑 Jesús desactivado, limpiando timer');
      resetInactivityTimer();
    }
  }, [hasAvatarStream, jesusEnabled, resetInactivityTimer, startInactivityTimer]);

  // ===== Monitorear audio del video WebRTC con Web Audio API =====
  useEffect(() => {
    if (!hasAvatarStream || !jesusEnabled) return;

    const vid = document.getElementById("avatar-video") as HTMLVideoElement | null;
    if (!vid || !vid.srcObject) {
      console.log('[Inactivity] ⚠️ No video element o srcObject disponible');
      return;
    }

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let checkInterval: NodeJS.Timeout | null = null;
    let silenceTimeout: NodeJS.Timeout | null = null;
    let isCurrentlyPlayingAudio = false;

    try {
      // Crear contexto de audio
      audioContext = new AudioContext();
      const stream = vid.srcObject as MediaStream;
      const source = audioContext.createMediaStreamSource(stream);

      // Crear analizador
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Función para detectar si hay audio activo
      const detectAudio = () => {
        if (!analyser) return;

        analyser.getByteFrequencyData(dataArray);

        // Calcular el nivel promedio de audio
        const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;

        // Umbral para considerar que hay audio (ajustable)
        const threshold = 5;
        const hasAudio = average > threshold;

        if (hasAudio) {
          // Hay audio activo
          if (!isCurrentlyPlayingAudio) {
            console.log('[Inactivity] 🔊 Audio WebRTC DETECTADO (nivel:', Math.round(average), ')');
            isCurrentlyPlayingAudio = true;
            handleAudioStart();
          }

          // Cancelar timeout de silencio si existe
          if (silenceTimeout) {
            clearTimeout(silenceTimeout);
            silenceTimeout = null;
          }

          // Establecer nuevo timeout para detectar cuando termine
          silenceTimeout = setTimeout(() => {
            if (isCurrentlyPlayingAudio) {
              console.log('[Inactivity] 🔇 Audio WebRTC TERMINADO (silencio detectado)');
              isCurrentlyPlayingAudio = false;
              handleAudioEnd();
            }
          }, 3000); // 3 segundos de silencio (Jesús habla pausado)
        }
      };

      // Verificar cada 100ms para detección rápida
      checkInterval = setInterval(detectAudio, 100);

      console.log('[Inactivity] ✅ Monitor de audio WebRTC iniciado');

    } catch (error) {
      console.error('[Inactivity] ❌ Error configurando monitor de audio:', error);
    }

    return () => {
      console.log('[Inactivity] 🧹 Limpiando monitor de audio WebRTC');
      if (checkInterval) clearInterval(checkInterval);
      if (silenceTimeout) clearTimeout(silenceTimeout);
      if (analyser) analyser.disconnect();
      if (audioContext) audioContext.close();
    };
  }, [hasAvatarStream, jesusEnabled, handleAudioStart, handleAudioEnd, audioMonitorKey]);

  // ===== Detector de congelamiento/stuttering del video =====
  useEffect(() => {
    console.log('[Video Monitor] 🔍 useEffect ejecutándose...');
    console.log('[Video Monitor] jesusEnabled:', jesusEnabled, '| hasAvatarStream:', hasAvatarStream);

    if (!jesusEnabled || !hasAvatarStream) {
      console.log('[Video Monitor] ❌ Detector NO iniciado (condiciones no cumplidas)');
      return;
    }

    const video = document.getElementById("avatar-video") as HTMLVideoElement | null;
    console.log('[Video Monitor] Video element:', video ? 'ENCONTRADO ✅' : 'NO ENCONTRADO ❌');

    if (!video) {
      console.log('[Video Monitor] ❌ Detector NO iniciado (video element no encontrado)');
      return;
    }

    console.log('[Video Monitor] currentTime inicial:', video.currentTime, '| readyState:', video.readyState);
    console.log('[Video Monitor] showConnectionError inicial:', showConnectionError);

    let lastTime = video.currentTime;
    let checkCount = 0;
    let problemsInWindow: number[] = []; // Timestamps de cada problema

    console.log('[Video Monitor] ✅ Detector INICIADO con ventana de 15 segundos (10 segundos de gracia)');

    const checkInterval = setInterval(() => {
      const currentTime = video.currentTime;
      const timeDiff = currentTime - lastTime;
      const now = Date.now();

      checkCount++;

      // Período de gracia (10 segundos)
      if (checkCount <= 20) {
        console.log(`[Video Monitor] Check #${checkCount}/20 (gracia) | currentTime: ${currentTime.toFixed(2)}s | timeDiff: ${timeDiff.toFixed(2)}s`);
        lastTime = currentTime;
        if (checkCount === 20) {
          console.log('[Video Monitor] ✅ Período de gracia completado, iniciando monitoreo activo');
        }
        return;
      }

      // Limpiar problemas viejos (mayores a 15 segundos)
      const oldCount = problemsInWindow.length;
      problemsInWindow = problemsInWindow.filter(t => now - t < 15000);
      if (oldCount !== problemsInWindow.length) {
        console.log(`[Video Monitor] 🧹 Limpieza: ${oldCount} → ${problemsInWindow.length} problemas en ventana`);
      }

      // Detectar congelamiento (video no avanza) o stuttering (avanza muy poco)
      let hasProblem = false;
      if (timeDiff < 0.1) {
        console.log(`[Video Monitor] 🔴 CONGELADO! timeDiff=${timeDiff.toFixed(2)}s < 0.1s`);
        hasProblem = true;
      } else if (timeDiff < 0.3) {
        console.log(`[Video Monitor] ⚠️ STUTTERING! timeDiff=${timeDiff.toFixed(2)}s < 0.3s`);
        hasProblem = true;
      } else {
        console.log(`[Video Monitor] ✅ OK timeDiff=${timeDiff.toFixed(2)}s`);
      }

      // Agregar problema a la ventana
      if (hasProblem) {
        problemsInWindow.push(now);
        console.log(`[Video Monitor] 📊 Problemas en últimos 15s: ${problemsInWindow.length}/8`);
      }

      // Si hay 8 o más problemas en 15 segundos → Mostrar cartel (solo si no es desconexión intencional)
      if (problemsInWindow.length >= 8 && !showConnectionError && !intentionalDisconnectRef.current) {
        console.log(`[Video Monitor] 🚨 UMBRAL ALCANZADO! ${problemsInWindow.length} problemas en 15 segundos`);
        console.log('[Video Monitor] 🔴 ACTIVANDO CARTEL DE CONEXIÓN INESTABLE');

        // PRIMERO: Cerrar WebRTC para detener el video entrecortado
        try {
          console.log('[Video Monitor] Cerrando avatarPcRef.current...');
          avatarPcRef.current?.close();
          avatarPcRef.current = null;
          avatarDcRef.current = null;
          avatarStreamRef.current = null;
          console.log('[Video Monitor] ✅ WebRTC cerrado');
        } catch (e) {
          console.error('[Video Monitor] ❌ Error cerrando WebRTC:', e);
        }

        console.log('[Video Monitor] Desactivando hasAvatarStream y jesusEnabled...');
        setHasAvatarStream(false);
        setJesusEnabled(false);

        console.log('[Video Monitor] Mostrando cartel...');
        setShowConnectionError(true);

        console.log('[Video Monitor] ✅ CARTEL ACTIVADO');
      } else if (problemsInWindow.length >= 8 && intentionalDisconnectRef.current) {
        console.log('[Video Monitor] ℹ️ Desconexión intencional detectada - NO mostrar cartel de error');
      }

      lastTime = currentTime;
    }, 500); // Revisar cada 500ms

    return () => {
      clearInterval(checkInterval);
      console.log('[Video Monitor] 🧹 Detector de congelamiento/stuttering limpiado');
    };
  }, [jesusEnabled, hasAvatarStream, showConnectionError]);

  // ===== Ocultar cartel de carga solo cuando hay stream
  useEffect(() => {
    if (avatarLoading && hasAvatarStream && screen === 'connecting') {
      console.log('[App] ✅ Stream detectado, esperando 8s antes de ocultar cartel');
      const timeoutId = setTimeout(() => {
        console.log('[App] ✅ Ocultando cartel de carga');
        setScreen('chat');
        setAvatarLoading(false);
        setIsChatReady(true);
      }, 8000);

      return () => clearTimeout(timeoutId);
    }
  }, [hasAvatarStream, avatarLoading, screen]);

  // ===== Limpiar bandera de desconexión intencional cuando el stream esté estable
  useEffect(() => {
    if (hasAvatarStream && intentionalDisconnectRef.current) {
      console.log('[App] ⏳ Stream activo, esperando 3s para limpiar bandera de desconexión intencional...');
      const timeoutId = setTimeout(() => {
        intentionalDisconnectRef.current = false;
        console.log('[App] 🔔 Bandera de desconexión intencional limpiada (stream estable)');
      }, 3000);

      return () => clearTimeout(timeoutId);
    }
  }, [hasAvatarStream]);

  // ===== Timeout de seguridad: si después de 20 segundos no hay stream, mostrar error
  useEffect(() => {
    if (!avatarLoading || screen !== 'connecting') return;

    const timeoutId = setTimeout(() => {
      if (!hasAvatarStream && avatarLoading) {
        console.log('[App] ⏰ Timeout de 20s alcanzado sin stream, mostrando error');
        setShowConnectionError(true);
        setAvatarLoading(false);
        setScreen('chat');
      }
    }, 20000);

    return () => clearTimeout(timeoutId);
  }, [avatarLoading, screen, hasAvatarStream]);

  // ===== Ocultar cartel cuando se muestre el modal de error
  useEffect(() => {
    if (showConnectionError && avatarLoading) {
      console.log('[App] ❌ Error de conexión detectado, ocultando cartel de carga');
      setAvatarLoading(false);
      if (screen === 'connecting') {
        setScreen('chat');
      }
    }
  }, [showConnectionError, avatarLoading, screen]);

  // ===== Objeto MUX expuesto a <Chat>
  const ttsShimRef = useRef<any>(null);
  if (!ttsShimRef.current) {
    (window as any).__outQueue__ = [];
    (window as any).__ttsBusy__ = false;
    ttsShimRef.current = {
      get readyState() {
        const wsState = ttsWSRef.current?.readyState?.() ?? "closed";
        const avatarOpen = avatarDcRef.current && avatarDcRef.current.readyState === "open";
        return (wsState === "open" || avatarOpen) ? "open" : "connecting";
      },
      send: (payload: any) => {
        console.log('[TTS Shim] 🚀🚀🚀 send() LLAMADO 🚀🚀🚀');
        console.log('[TTS Shim] 📦 Payload recibido:', payload);
        console.log('[TTS Shim] 📦 Tipo de payload:', typeof payload);

        try {
          const data = typeof payload === "string" ? JSON.parse(payload) : payload;
          console.log('[TTS Shim] 📦 Data parseada:', data);
          console.log('[TTS Shim] 🔍 data.text:', data?.text);
          console.log('[TTS Shim] 🔍 data.sessionId:', data?.sessionId);

          // Si hay texto, agregarlo a la cola de síntesis
          if (data && data.text) {
            console.log('[TTS Shim] ✅ Tiene texto - agregando a cola');
            const q: Array<{ text: string; lang: Language; sessionId?: string }> = (window as any).__outQueue__;
            q.push({ text: data.text, lang: data.lang, sessionId: data.sessionId });
            (window as any).__outQueue__ = q;
            tryProcessQueue();
          }
          // Si solo hay sessionId (registro), enviarlo directo al WebSocket
          else if (data && data.sessionId) {
            console.log('[TTS Shim] 📝 Registrando sessionId en servidor de voz:', data.sessionId);
            console.log('[TTS Shim] 🔍 ttsWSRef.current:', ttsWSRef.current);
            console.log('[TTS Shim] 🔍 ttsWSRef.current?.ws:', ttsWSRef.current?.ws);
            console.log('[TTS Shim] 🔍 ttsWSRef.current?.ws.readyState:', ttsWSRef.current?.ws?.readyState);
            console.log('[TTS Shim] 🔍 avatarDcRef.current:', avatarDcRef.current);

            // Enviar por WebSocket si está disponible (acceder al .ws interno)
            if (ttsWSRef.current?.ws && ttsWSRef.current.ws.readyState === WebSocket.OPEN) {
              console.log('[TTS Shim] 📤 Enviando por WebSocket (ws interno)...');
              ttsWSRef.current.ws.send(JSON.stringify({ sessionId: data.sessionId }));
              console.log('[TTS Shim] ✅ SessionId enviado por WebSocket');
            }
            // O por DataChannel si está disponible
            else if (avatarDcRef.current?.readyState === 'open') {
              console.log('[TTS Shim] 📤 Enviando por DataChannel...');
              avatarDcRef.current.send(JSON.stringify({ sessionId: data.sessionId }));
              console.log('[TTS Shim] ✅ SessionId enviado por DataChannel');
            } else {
              console.warn('[TTS Shim] ⚠️ No hay canal disponible para enviar sessionId');
              console.warn('[TTS Shim] ⚠️ WebSocket state:', ttsWSRef.current?.ws?.readyState);
              console.warn('[TTS Shim] ⚠️ DataChannel state:', avatarDcRef.current?.readyState);
            }
          } else {
            console.warn('[TTS Shim] ⚠️ Payload sin texto ni sessionId:', data);
          }
        } catch (e) {
          console.error('[TTS Shim] ❌ Error:', e);
        }
      },
    };
  } else {
    ttsShimRef.current.send = (payload: any) => {
      console.log('[TTS Shim] 🚀🚀🚀 send() LLAMADO (else branch) 🚀🚀🚀');
      console.log('[TTS Shim] 📦 Payload recibido:', payload);
      console.log('[TTS Shim] 📦 Tipo de payload:', typeof payload);

      try {
        const data = typeof payload === "string" ? JSON.parse(payload) : payload;
        console.log('[TTS Shim] 📦 Data parseada:', data);
        console.log('[TTS Shim] 🔍 data.text:', data?.text);
        console.log('[TTS Shim] 🔍 data.sessionId:', data?.sessionId);

        // Si hay texto, agregarlo a la cola de síntesis
        if (data && data.text) {
          console.log('[TTS Shim] ✅ Tiene texto - agregando a cola');
          const q: Array<{ text: string; lang: Language; sessionId?: string }> = (window as any).__outQueue__;
          q.push({ text: data.text, lang: data.lang, sessionId: data.sessionId });
          (window as any).__outQueue__ = q;
          tryProcessQueue();
        }
        // Si solo hay sessionId (registro), enviarlo directo al WebSocket
        else if (data && data.sessionId) {
          console.log('[TTS Shim] 📝 Registrando sessionId en servidor de voz:', data.sessionId);
          console.log('[TTS Shim] 🔍 ttsWSRef.current:', ttsWSRef.current);
          console.log('[TTS Shim] 🔍 ttsWSRef.current?.ws:', ttsWSRef.current?.ws);
          console.log('[TTS Shim] 🔍 ttsWSRef.current?.ws.readyState:', ttsWSRef.current?.ws?.readyState);
          console.log('[TTS Shim] 🔍 avatarDcRef.current:', avatarDcRef.current);

          // Enviar por WebSocket si está disponible (acceder al .ws interno)
          if (ttsWSRef.current?.ws && ttsWSRef.current.ws.readyState === WebSocket.OPEN) {
            console.log('[TTS Shim] 📤 Enviando por WebSocket (ws interno)...');
            ttsWSRef.current.ws.send(JSON.stringify({ sessionId: data.sessionId }));
            console.log('[TTS Shim] ✅ SessionId enviado por WebSocket');
          }
          // O por DataChannel si está disponible
          else if (avatarDcRef.current?.readyState === 'open') {
            console.log('[TTS Shim] 📤 Enviando por DataChannel...');
            avatarDcRef.current.send(JSON.stringify({ sessionId: data.sessionId }));
            console.log('[TTS Shim] ✅ SessionId enviado por DataChannel');
          } else {
            console.warn('[TTS Shim] ⚠️ No hay canal disponible para enviar sessionId');
            console.warn('[TTS Shim] ⚠️ WebSocket state:', ttsWSRef.current?.ws?.readyState);
            console.warn('[TTS Shim] ⚠️ DataChannel state:', avatarDcRef.current?.readyState);
          }
        } else {
          console.warn('[TTS Shim] ⚠️ Payload sin texto ni sessionId:', data);
        }
      } catch (e) {
        console.error('[TTS Shim] ❌ Error:', e);
      }
    };
  }

  // ===== AVATAR: WebRTC
  async function negotiateAvatarPC(pc: RTCPeerConnection, deviceId: string, sessionId: string) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    let lastErr: any = null;
    for (const url of AVATAR_OFFER_URLS) {
      try {
        console.log(`[Avatar] 🔄 Negociando con: ${url}`);
        console.log(`[Avatar] 🔑 Enviando sessionId al servidor: ${sessionId}`);

        // Agregar timeout de 15 segundos para evitar bloqueos
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const token = await AuthService.getToken(deviceId);
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sdp: offer.sdp,
            type: offer.type,
            token: token,
            sessionid: sessionId  // ✅ minúsculas - el servidor LiveTalking busca "sessionid"
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!r.ok) {
          lastErr = new Error(`HTTP ${r.status} at ${url}`);
          console.warn(`[Avatar] ⚠️ Falló ${url}: ${r.status}`);
          continue;
        }
        const data = await r.json();
        await pc.setRemoteDescription(new RTCSessionDescription({ type: data.type, sdp: data.sdp }));
        console.log(`[Avatar] ✅ Negociación exitosa con ${url}`);
        console.log(`[Avatar] 🔑 SessionId usado: ${sessionId} (generado por cliente)`);
        // ✅ Retornar el sessionId que NOSOTROS enviamos, no el del servidor
        return sessionId;
      } catch (e) {
        lastErr = e;
        if ((e as Error).name === 'AbortError') {
          console.error(`[Avatar] ⏱️ Timeout en ${url} (15s)`);
        } else {
          console.error(`[Avatar] ❌ Error en ${url}:`, e);
        }
      }
    }
    console.error('[Avatar] ❌ Todos los endpoints fallaron');
    throw lastErr || new Error("Negotiation failed");
  }

  const startAvatarWebRTC = useCallback(async (): Promise<string | null> => {
    if (avatarConnectingRef.current) {
      console.log("[Avatar] ⏳ Ya hay una conexión en proceso");
      return null;
    }
    if (avatarPcRef.current && avatarPcRef.current.connectionState === "connected") {
      console.log("[Avatar] ✅ Ya hay conexión activa");
      return null;
    }

    // NO limpiar la bandera aquí, se limpiará cuando el stream esté estable
    if (intentionalDisconnectRef.current) {
      console.log("[Avatar] ℹ️ Reconexión después de desconexión intencional (bandera aún activa)");
    }

    if (avatarPcRef.current) {
      try { avatarPcRef.current.close(); } catch {}
      avatarPcRef.current = null;
      avatarStreamRef.current = null;
    }
    avatarConnectingRef.current = true;
    console.log("[Avatar] 🚀 Iniciando WebRTC...");

    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
        bundlePolicy: "max-bundle",
      });
      avatarPcRef.current = pc;

      pc.addTransceiver("audio", { direction: "recvonly" });
      pc.addTransceiver("video", { direction: "recvonly" });
      pc.ontrack = (event) => {
        console.log("[Avatar] 🎬 CRÍTICO: Track recibido desde LiveTalking");
        console.log(`[Avatar]   - Track kind: ${event.track.kind}`);
        console.log(`[Avatar]   - Track id: ${event.track.id}`);
        console.log(`[Avatar]   - Track enabled: ${event.track.enabled}`);
        console.log(`[Avatar]   - Track readyState: ${event.track.readyState}`);
        console.log(`[Avatar]   - Streams count: ${event.streams?.length || 0}`);

        if (event.streams && event.streams[0]) {
          console.log(`[Avatar]   - Stream id: ${event.streams[0].id}`);
          console.log(`[Avatar]   - Audio tracks: ${event.streams[0].getAudioTracks().length}`);
          console.log(`[Avatar]   - Video tracks: ${event.streams[0].getVideoTracks().length}`);

          avatarStreamRef.current = event.streams[0];
          setHasAvatarStream(true);
          console.log("[Avatar] ✅ Stream establecido, hasAvatarStream=true");

          const vid = document.getElementById("avatar-video") as HTMLVideoElement | null;
          if (vid) {
            console.log("[Avatar] 📺 Asignando stream a video element");
            vid.srcObject = avatarStreamRef.current;
            vid.muted = false;
            vid.volume = 1.0;
            vid.play().catch((err) => {
              console.error("[Avatar] ❌ Error al reproducir video:", err);
            });
          } else {
            console.error("[Avatar] ❌ Video element NO encontrado");
          }
          console.log("[Avatar] ✅ stream listo");
        } else {
          console.error("[Avatar] ❌ NO hay streams en el track event");
        }
      };
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("[Avatar] 🧊 ICE candidate recibido");
        } else {
          console.log("[Avatar] 🧊 ICE gathering completado");
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("[Avatar] 🧊 ICE estado:", pc.iceConnectionState);
        console.log(`[Avatar]   - Timestamp: ${new Date().toISOString()}`);
      };

      pc.onconnectionstatechange = () => {
        console.log("[Avatar] 📡 Connection estado:", pc.connectionState);
        console.log(`[Avatar]   - Timestamp: ${new Date().toISOString()}`);
        console.log(`[Avatar]   - SignalingState: ${pc.signalingState}`);
        console.log(`[Avatar]   - ICE state: ${pc.iceConnectionState}`);

        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "closed" ||
          pc.connectionState === "disconnected"
        ) {
          console.log("[Avatar] ⚠️ Conexión perdida, pero manteniendo stream visible");
          // NO marcar como false - el video sigue siendo visible aunque la conexión se cierre
          // setHasAvatarStream(false);
        }
      };

      const dc = pc.createDataChannel("tts", { ordered: true });
      avatarDcRef.current = dc;
      dc.onopen = () => {
        console.log("[Avatar] ✅ DC abierto para TTS");

        // CRÍTICO: Registrar sessionId en servidor de voz ANTES de cualquier síntesis
        const currentSessionId = sessionIdRef.current;
        if (currentSessionId) {
          console.log("[Avatar] 📤 Registrando sessionId en servidor de voz:", currentSessionId);
          dc.send(JSON.stringify({ sessionId: currentSessionId }));
          console.log("[Avatar] ✅ SessionId registrado en servidor");
        } else {
          console.warn("[Avatar] ⚠️ No hay sessionId para registrar");
        }

        setTtsReady(true);
        tryProcessQueue();
      };
      dc.onclose = () => {
        console.log("[Avatar] 🔌 DC avatar cerrado");
        if (ttsWSRef.current?.readyState() !== "open") setTtsReady(false);
      };
      dc.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.event === "done") {
            console.log("[Avatar] ✅ done");
            (window as any).__ttsBusy__ = false;
            tryProcessQueue();
          }
        } catch {}
      };

      // ✅ Usar sessionIdRef.current para obtener el sessionId actual
      const currentSessionId = sessionIdRef.current;
      console.log('[Avatar] 🔑 Usando sessionId del ref:', currentSessionId);

      if (!currentSessionId) {
        console.error('[Avatar] ❌ sessionId está vacío en ref, abortando WebRTC');
        throw new Error('sessionId no disponible');
      }

      const sid = await negotiateAvatarPC(pc, deviceId, currentSessionId);
      if (sid) {
        console.log(`[Avatar] ✅ sessionId=${sid}`);
        // Actualizar livetalkSessionId con el sessionId generado por nosotros
        setLivetalkSessionId(sid);
      }
      return sid;
    } catch (e) {
      console.error("[Avatar] ❌ error:", e);
      avatarPcRef.current = null;
      avatarDcRef.current = null;
      setHasAvatarStream(false);
      if (ttsWSRef.current?.readyState() !== "open") setTtsReady(false);

      // Manejar error de conexión
      handleConnectionError();

      return null;
    } finally {
      avatarConnectingRef.current = false;
    }
  }, [tryProcessQueue, deviceId]);

  // ===== Diagnóstico del estado del peer =====
  const diagnosePeerState = useCallback(() => {
    console.log("[Avatar] 🔍 DIAGNÓSTICO DE PEER:");
    if (!avatarPcRef.current) {
      console.log("[Avatar]   ❌ NO hay peer (avatarPcRef.current es null)");
      return;
    }

    const pc = avatarPcRef.current;
    console.log(`[Avatar]   - connectionState: ${pc.connectionState}`);
    console.log(`[Avatar]   - iceConnectionState: ${pc.iceConnectionState}`);
    console.log(`[Avatar]   - signalingState: ${pc.signalingState}`);
    console.log(`[Avatar]   - hasAvatarStream: ${!!avatarStreamRef.current}`);

    const transceivers = pc.getTransceivers();
    console.log(`[Avatar]   - Transceivers count: ${transceivers.length}`);
    transceivers.forEach((t, idx) => {
      console.log(`[Avatar]     [${idx}] ${t.mid} - ${t.receiver.track?.kind} - direction: ${t.direction} - currentDirection: ${t.currentDirection}`);
    });
  }, []);

  // ===== Forzar reconexión WebRTC =====
  const forceReconnectWebRTC = useCallback(async (): Promise<string | null> => {
    console.log("[Avatar] 🔄 Forzando reconexión - cerrando conexión existente...");

    // Cerrar conexión actual completamente
    if (avatarPcRef.current) {
      try {
        avatarPcRef.current.close();
        console.log("[Avatar] ✅ Conexión WebRTC cerrada");
      } catch (e) {
        console.error("[Avatar] ⚠️ Error cerrando conexión:", e);
      }
      avatarPcRef.current = null;
      avatarDcRef.current = null;
      avatarStreamRef.current = null;
    }

    // Resetear estados
    setHasAvatarStream(false);
    avatarConnectingRef.current = false;

    // Esperar un momento antes de reconectar
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Iniciar nueva conexión
    console.log("[Avatar] 🚀 Iniciando nueva conexión WebRTC...");
    return await startAvatarWebRTC();
  }, [startAvatarWebRTC]);

  // ===== Bienvenida (BACKEND) =====
  async function onFormSubmit(name: string, gender: string) {
    setLoading(true);

    // 1. Guardar en localStorage primero
    const saved = saveUser({
      name,
      gender: gender as "male" | "female",
      language: lang
    });

    if (!saved) {
      console.error('[App] ❌ Error guardando usuario en localStorage');
      setLoading(false);
      return;
    }

    console.log('[App] 📤 Usuario guardado en localStorage');
    console.log('[App] 👤 Datos:', { name, gender, lang });
    console.log('[App] 🆔 deviceId:', deviceId);

    // 2. Crear/Actualizar usuario en backend
    // Si el backend ya creó el usuario automáticamente, createUser hará UPDATE
    // NO llamar a /api/welcome todavía - se llamará después de verificar créditos
    try {
      console.log('[App] 📝 Creando/Actualizando usuario en backend...');
      const subscriptionService = new SubscriptionService(BACKEND_URL);

      // Asegurar que el registro existe en la BD antes de actualizar
      console.log('[App] 📝 Asegurando registro existe en backend...');
      await subscriptionService.checkUserHasPlan(deviceId);

      let status;
      try {
        status = await subscriptionService.createUser(
          deviceId,
          name,
          gender,
          lang
        );
        console.log('[App] ✅ Usuario creado/actualizado en backend:', status);
      } catch (createError: any) {
        // Si el usuario ya existe (409), actualizar datos
        if (createError.message === 'User already exists') {
          console.log('[App] ℹ️ Usuario ya existe, actualizando datos...');
          status = await subscriptionService.updateUser(
            deviceId,
            name,
            gender,
            lang
          );
          console.log('[App] ✅ Usuario actualizado:', status);
        } else {
          throw createError;
        }
      }

      // Actualizar estado local de suscripción
      updateSubscription(status);

      setLoading(false);

      // Ir a selección de planes (usuario con 12 créditos)
      console.log('[App] ➡️ Usuario completó registro → Ir a selección de planes');
      setIsCheckingSubscription(false);
      setScreen("plans");

    } catch (error) {
      console.error('[App] ❌ Error en onFormSubmit:', error);
      setWelcome(SYSTEM_MESSAGES.welcomeFallback[lang]);
      setLoading(false);
      setIsCheckingSubscription(false);
      setScreen("plans");
    }
  }

  // ===== LOGOUT =====
  const handleLogout = async () => {
    console.log('[App] 🚪 Iniciando cierre de aplicación...');

    // Limpiar recursos
    try { avatarPcRef.current?.close(); } catch {}
    avatarStreamRef.current = null;
    setHasAvatarStream(false);
    setJesusEnabled(false);
    setWelcome('');

    if (Capacitor.isNativePlatform()) {
      const platform = Capacitor.getPlatform();
      if (platform === 'ios') {
        // iOS: mostrar modal de despedida (no puede cerrar la app)
        console.log('[App] 🍎 iOS detectado, mostrando modal de despedida');
        setShowGoodbyeModal(true);
      } else {
        // Android: cerrar app directamente
        console.log('[App] 🤖 Android detectado, cerrando app...');
        logout();
        await CapacitorApp.exitApp();
      }
    } else {
      // Web: recargar
      logout();
      window.location.reload();
    }
  };

  // ===== Cerrar sesión por inactividad =====
  const handleSuspendInactivity = async () => {
    console.log('[Inactivity] 🚪 Cerrando sesión por solicitud del usuario');

    // Limpiar recursos
    try { avatarPcRef.current?.close(); } catch {}
    avatarStreamRef.current = null;
    setHasAvatarStream(false);
    setJesusEnabled(false);
    setWelcome('');

    if (Capacitor.isNativePlatform()) {
      const platform = Capacitor.getPlatform();
      if (platform === 'ios') {
        // iOS: mostrar modal de despedida (no puede cerrar la app)
        console.log('[Inactivity] 🍎 iOS detectado, mostrando modal de despedida');
        setShowInactivityModal(false);
        setShowGoodbyeModal(true);
      } else {
        // Android: cerrar app directamente
        console.log('[Inactivity] 🤖 Android detectado, cerrando app...');
        logout();
        await CapacitorApp.exitApp();
      }
    } else {
      // Web: recargar
      logout();
      window.location.reload();
    }
  };

  // ===== Reanudar después de inactividad =====
  const handleResumeInactivity = async () => {
    console.log('[Inactivity] ▶️ Reanudando conexión');

    // Cerrar modal
    setShowInactivityModal(false);
    resetInactivityTimer();

    // Reiniciar estado de audio
    audioActiveRef.current = false;
    lastAudioTimeRef.current = Date.now();
    console.log('[Inactivity] 🔄 Estado de audio reiniciado');

    // Mostrar cartel PRIMERO para tapar mientras carga
    setScreen("connecting");
    console.log('[Inactivity] 🕐 Cartel "connecting" mostrado');

    // Pequeña pausa para que el cartel se renderice
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      console.log('[Inactivity] 🔄 Activando jesusEnabled...');
      setJesusEnabled(true);
      jesusEnabledRef.current = true;

      console.log('[Inactivity] 🔌 Iniciando WebRTC...');
      const sid = await startAvatarWebRTC();

      if (sid) {
        setLivetalkSessionId(sid);
        console.log('[Inactivity] ✅ WebRTC reconectado con sessionId:', sid);

        // Esperar 3 segundos para que el stream esté estable y luego reiniciar el monitor
        setTimeout(() => {
          setAudioMonitorKey(prev => prev + 1);
          console.log('[Inactivity] 🔄 Monitor de audio reiniciado después de 3s');
        }, 3000);

        // Esperar 9 segundos antes de volver al chat
        setTimeout(() => {
          console.log('[Inactivity] ⏱️ Transición a chat después de 9s');
          setScreen("chat");

          // CRÍTICO: Después de volver al chat, verificar activamente durante 10 segundos si hay audio
          console.log('[Inactivity] 🔍 Iniciando verificación de 10 segundos sin audio...');
          const startVerification = Date.now();
          const verificationDuration = 10000;
          let audioDetectedDuringVerification = false;

          const verificationInterval = setInterval(() => {
            const elapsed = Date.now() - startVerification;

            if (audioActiveRef.current) {
              console.log('[Inactivity] 🔊 Audio detectado durante verificación, cancelando timer');
              audioDetectedDuringVerification = true;
              clearInterval(verificationInterval);
              return;
            }

            if (elapsed >= verificationDuration) {
              clearInterval(verificationInterval);

              if (!audioDetectedDuringVerification && !audioActiveRef.current && jesusEnabledRef.current && hasAvatarStreamRef.current) {
                console.log('[Inactivity] ✅ 10 segundos sin audio confirmados, iniciando timer de 50s');
                startInactivityTimer();
              } else {
                console.log('[Inactivity] ❌ Condiciones no cumplidas para iniciar timer');
                console.log('[Inactivity]   - audioDetected:', audioDetectedDuringVerification);
                console.log('[Inactivity]   - audioActive:', audioActiveRef.current);
                console.log('[Inactivity]   - jesusEnabled:', jesusEnabledRef.current);
                console.log('[Inactivity]   - hasStream:', hasAvatarStreamRef.current);
              }
            } else {
              // Log cada segundo
              if (elapsed % 1000 < 500) {
                console.log(`[Inactivity] ⏳ Verificando silencio... ${Math.round(elapsed / 1000)}s/${verificationDuration / 1000}s`);
              }
            }
          }, 500);
        }, 6000);
      } else {
        console.error('[Inactivity] ❌ No se obtuvo sessionId');
        setScreen("chat");
      }
    } catch (error) {
      console.error('[Inactivity] ❌ Error al reconectar:', error);
      setScreen("chat");
    }
  };

  // ===== Manejar errores de conexión con 3 intentos
  const handleConnectionError = useCallback(async () => {
    const currentAttempts = reconnectAttempts + 1;
    setReconnectAttempts(currentAttempts);

    if (currentAttempts < 3) {
      // Intentos 1 y 2: Reconectar silenciosamente
      console.log(`[Reconnect] Intento ${currentAttempts}/3`);
      try {
        await startAvatarWebRTC();
        setReconnectAttempts(0); // Reset si tuvo éxito
      } catch (error) {
        // Falla silenciosa, volverá a intentar en el próximo error
        console.warn(`[Reconnect] Fallo intento ${currentAttempts}:`, error);
      }
    } else {
      // Intento 3: Mostrar cartel
      console.log('[Reconnect] Tercer intento fallido, mostrando cartel');
      setShowConnectionError(true);
      setReconnectAttempts(0); // Reset para futuro
    }
  }, [reconnectAttempts, startAvatarWebRTC]);

  // ===== Conectar TTS WS al elegir idioma
  const handleLangSelect = async (l: Language) => {
    setLang(l);
    setScreen("terms");
  };

  // ===== Manejar selección de plan
  const handlePlanSelect = async (tier: SubscriptionTier) => {
    console.log('[App] ========== PLAN SELECCIONADO ==========');
    console.log('[App] Tier:', tier);
    console.log('[App] Welcome disponible:', !!welcome);
    console.log('[App] Estado actual:', {
      screen,
      loading,
      jesusEnabled,
      hasAvatarStream
    });

    // Si viene de una compra (tier != 'free' y tier == currentTier), es compra de créditos extra o upgrade
    // Recargar datos y restaurar modo anterior
    if (tier !== 'free' && tier === subscription.tier) {
      console.log('[App] 💳 Compra completada (créditos extra o upgrade), recargando datos...');

      // Recargar datos de suscripción desde el backend
      await BillingService.refreshSubscriptionData(deviceId).then(newData => {
        if (newData) {
          console.log('[App] ✅ Datos de suscripción actualizados:', newData);
          updateSubscription({
            tier: newData.tier,
            creditsRemaining: newData.creditsRemaining,
            creditsTotal: newData.creditsTotal,
            renewalDate: newData.renewalDate
          });
        }
      });

      // Obtener el último modo guardado desde el BACKEND
      try {
        const token = await AuthService.getToken(deviceId);
        const response = await fetch(`${BACKEND_URL}/api/subscription/status?deviceId=${deviceId}`, {
          headers: AuthService.getAuthHeaders(token)
        });

        if (response.ok) {
          const data = await response.json();
          let savedMode = data.last_mode || 'chat';

          // Si la BD devuelve 'video-chat', verificar localStorage para distinguir entre 'video' y 'video-chat'
          if (savedMode === 'video-chat') {
            const localMode = StorageService.getLastMode();
            if (localMode === 'video') {
              savedMode = 'video';
              console.log('[App] 🔄 BD devuelve video-chat pero localStorage tiene video → usando video');
            }
          }

          console.log('[App] 🔄 Restaurando último modo desde backend después de compra:', savedMode);
          await handleChangeMode(savedMode as ConversationMode);
        } else {
          // Fallback: usar localStorage si falla la petición
          const savedMode = StorageService.getLastMode() || 'chat';
          console.log('[App] ⚠️ Error obteniendo last_mode desde backend, usando localStorage:', savedMode);
          await handleChangeMode(savedMode as ConversationMode);
        }
      } catch (error) {
        console.error('[App] ❌ Error obteniendo last_mode:', error);
        // Fallback: usar localStorage si hay error
        const savedMode = StorageService.getLastMode() || 'chat';
        await handleChangeMode(savedMode as ConversationMode);
      }

      return;
    }

    // Si tier != currentTier, es un upgrade de plan (manejar diferente si es necesario)
    if (tier !== 'free' && tier !== subscription.tier) {
      console.log('[App] 📈 Upgrade de plan detectado, recargando datos...');

      // Recargar datos de suscripción desde el backend
      await BillingService.refreshSubscriptionData(deviceId).then(newData => {
        if (newData) {
          console.log('[App] ✅ Datos de suscripción actualizados:', newData);
          updateSubscription({
            tier: newData.tier,
            creditsRemaining: newData.creditsRemaining,
            creditsTotal: newData.creditsTotal,
            renewalDate: newData.renewalDate
          });
        }
      });

      // Si el usuario anterior era FREE, es una compra nueva
      if (subscription.tier === 'free') {
        console.log('[App] 🎉 Usuario nuevo con plan de pago');

        // Verificar si el usuario ya completó el onboarding
        const hasUserData = userData?.name && userData?.gender && lang;
        console.log('[App] 🔍 Verificando datos de usuario:', {
          hasUserData,
          name: userData?.name,
          gender: userData?.gender,
          lang
        });

        if (!hasUserData) {
          // Usuario nuevo sin onboarding → enviar al onboarding primero
          console.log('[App] 👤 Usuario nuevo sin datos → redirigiendo a onboarding');
          setScreen('language');
          return;
        }

        // Usuario con datos completos → ir a Jesus-Chat directamente
        console.log('[App] ✅ Usuario con datos completos → activando Jesus-Chat (video-chat)');

        // Activar todos los modos necesarios: chat, audio, video (jesus)
        if (!chatEnabled) setChatEnabled(true);
        if (!audioEnabled) setAudioEnabled(true);
        if (!jesusEnabled) {
          setJesusEnabled(true);
          jesusEnabledRef.current = true;
        }

        // NO llamar initTTS() porque estamos en modo video-chat

        // iOS: desbloquear audio con interacción del usuario
        unlockAudio();

        // Cambiar la pantalla directamente sin el cartel de "conectando"
        setIsChatReady(true);
        setScreen('chat');
        StorageService.saveLastMode('video-chat');

        return;
      }

      // Si ya tenía un plan de pago, restaurar el último modo usado desde el BACKEND
      try {
        const token = await AuthService.getToken(deviceId);
        const response = await fetch(`${BACKEND_URL}/api/subscription/status?deviceId=${deviceId}`, {
          headers: AuthService.getAuthHeaders(token)
        });

        if (response.ok) {
          const data = await response.json();
          let savedMode = data.last_mode || 'chat';

          // Si la BD devuelve 'video-chat', verificar localStorage para distinguir entre 'video' y 'video-chat'
          if (savedMode === 'video-chat') {
            const localMode = StorageService.getLastMode();
            if (localMode === 'video') {
              savedMode = 'video';
              console.log('[App] 🔄 BD devuelve video-chat pero localStorage tiene video → usando video');
            }
          }

          console.log('[App] 🔄 Restaurando último modo desde backend después de upgrade:', savedMode);
          await handleChangeMode(savedMode as ConversationMode);
        } else {
          // Fallback: usar localStorage si falla la petición
          const savedMode = StorageService.getLastMode() || 'chat';
          console.log('[App] ⚠️ Error obteniendo last_mode desde backend, usando localStorage:', savedMode);
          await handleChangeMode(savedMode as ConversationMode);
        }
      } catch (error) {
        console.error('[App] ❌ Error obteniendo last_mode:', error);
        // Fallback: usar localStorage si hay error
        const savedMode = StorageService.getLastMode() || 'chat';
        await handleChangeMode(savedMode as ConversationMode);
      }

      return;
    }

    if (tier === 'free') {
      // ✅ USUARIO NUEVO FREE: SIEMPRE video-chat (NO usar subscription.lastMode)
      const modeToUse = 'video-chat';
      console.log('[App] 🎨 Modo hardcodeado para usuario nuevo FREE:', modeToUse);
      console.log('[App] 💳 Créditos disponibles:', subscription.creditsRemaining);

      // Obtener costo del modo (siempre 4 para video-chat)
      const CREDITS_PER_MODE: Record<ConversationMode, number> = {
        'chat': 1,
        'chat-audio': 2,
        'video': 4,
        'video-chat': 4
      };
      const modeCost = CREDITS_PER_MODE[modeToUse] || 4;
      console.log('[App] 💰 Costo del modo', modeToUse, ':', modeCost, 'créditos');

      // Verificar si tiene créditos suficientes para el modo actual
      if (subscription.creditsRemaining < modeCost) {
        console.warn('[App] ⚠️ Créditos insuficientes para el modo', modeToUse, ':', {
          creditsRemaining: subscription.creditsRemaining,
          necesita: modeCost
        });

        // No iniciar WebRTC, ir directamente al chat y mostrar modal
        console.log('[App] ❌ No iniciar WebRTC, mostrar modal de créditos insuficientes');
        setAllowCloseModal(false);
        setShowInsufficientCreditsModal(true);
        setScreen("chat");
        return;
      }

      console.log('[App] ✅ Créditos suficientes para modo', modeToUse, '→ Continuar con WebRTC');

      // Verificar que sessionId esté disponible antes de WebRTC
      if (!sessionId) {
        console.error('[App] ❌ ERROR CRÍTICO: sessionId está vacío antes de WebRTC');
        alert('Error interno: sessionId no disponible. Recarga la aplicación.');
        setIsCheckingSubscription(false);
        return;
      }

      console.log('[App] ✅ sessionId verificado antes de WebRTC:', sessionId);

      // Cargar historial de chat (últimos 10 días de actividad)
      const subscriptionService = new SubscriptionService(BACKEND_URL);
      console.log('[App] 📜 Cargando historial de conversaciones...');
      try {
        const historyData = await subscriptionService.getChatHistory(deviceId, 10);
        console.log('[App] 🔍 Respuesta de getChatHistory:', historyData);

        if (historyData && historyData.messages && historyData.messages.length > 0) {
          console.log('[App] 🔍 Mensajes recibidos:', historyData.messages);

          const formattedHistory = historyData.messages.flatMap(msg => {
            console.log('[App] 🔍 Procesando mensaje:', msg);
            return [
              { role: 'user' as const, content: msg.user_message, timestamp: msg.created_at },
              { role: 'assistant' as const, content: msg.assistant_message, timestamp: msg.created_at }
            ];
          });

          console.log('[App] 🔍 Historial formateado:', formattedHistory);
          setChatHistory(formattedHistory);
          console.log('[App] ✅ Historial cargado:', formattedHistory.length, 'mensajes');
        } else {
          console.log('[App] ℹ️ Sin historial previo o datos vacíos');
          console.log('[App] 🔍 historyData:', historyData);
        }
      } catch (error) {
        console.error('[App] ❌ Error cargando historial:', error);
      }

      // ✅ COPIAR FLUJO DEL USUARIO EXISTENTE (FUNCIONA)
      // Configurar el modo video guardado
      setChatEnabled(true);
      setAudioEnabled(true);  // ✅ SIEMPRE true para video-chat
      setJesusEnabled(true);
      jesusEnabledRef.current = true;

      // Iniciar WebRTC inmediatamente con async IIFE
      console.log('[App] 🚀 Iniciando WebRTC para usuario nuevo FREE...');
      setIsCheckingSubscription(false);

      (async () => {
        try {
          // Ir a pantalla de conexión mientras se conecta
          console.log('[App] 🎬 Mostrando pantalla CONNECTING');
          setScreen("connecting");
          setAvatarLoading(true);

          const sid = await startAvatarWebRTC();

          if (sid) {
            setLivetalkSessionId(sid);
            console.log('[App] ✅ WebRTC iniciado con sessionId:', sid);

            // CRÍTICO: Esperar a que el DataChannel se abra y registre el sessionId
            // antes de solicitar el welcome (para que el lipsync funcione)
            console.log('[App] ⏳ Esperando 800ms para que DC se abra y registre sessionId...');
            setTimeout(async () => {
              console.log('[App] ✅ Delay completado, solicitando bienvenida...');

              // Verificar si ya se mostró la bienvenida en esta sesión
              if (hasShownWelcomeThisSession) {
                console.log('[App] ⏭️ Bienvenida ya mostrada en esta sesión, saltando...');
                return;
              }

              if (userData) {
                try {
                  const welcomeService = new WelcomeService(BACKEND_URL);
                  const welcomeData = await welcomeService.getWelcome(
                    lang,
                    userData.name,
                    userData.gender,
                    deviceId,
                    'video-chat',  // ✅ HARDCODEADO: siempre video-chat para usuario nuevo FREE
                    sid
                  );

                  if (welcomeData) {
                    const welcomeText = welcomeService.formatWelcomeText(welcomeData);
                    setWelcome(welcomeText);
                    setHasShownWelcomeThisSession(true);
                    console.log('[App] ✅ Bienvenida recibida para usuario nuevo');

                    // Agregar bienvenida al chat
                    setChatHistory(prev => [...prev, {
                      role: 'assistant',
                      content: welcomeText,
                      timestamp: new Date().toISOString()
                    }]);
                    console.log('[App] ✅ Bienvenida agregada al chat');

                    // Guardar bienvenida en BD
                    try {
                      const now = new Date();
                      const clientTimestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
                      await conversationService.saveConversation({
                        device_id: deviceId,
                        user_message: SYSTEM_MESSAGES.conversationStart[lang as Language] || SYSTEM_MESSAGES.conversationStart.en,
                        assistant_message: `${welcomeData.message} ${welcomeData.response} ${welcomeData.question}`.trim(),
                        language: lang,
                        mode: 'video-chat',  // ✅ HARDCODEADO: siempre video-chat para usuario nuevo FREE
                        credits_used: 0,
                        session_id: welcomeData.sessionId,
                        bible: welcomeData.bible,
                        client_timestamp: clientTimestamp
                      });
                      console.log('[App] ✅ Bienvenida guardada en BD');
                    } catch (error) {
                      console.error('[App] ❌ Error guardando bienvenida:', error);
                    }

                    // Recargar créditos después de tiempo estimado
                    const words = welcomeText.split(/\s+/).length;
                    const estimatedDurationMs = (words / 150) * 60 * 1000 + 2000;
                    setTimeout(() => {
                      console.log('[Welcome] ✅ Bienvenida completada, recargando créditos');
                      reloadSubscription();
                    }, estimatedDurationMs);
                  }
                } catch (error) {
                  console.error('[App] ❌ Error cargando bienvenida:', error);
                }
              }
            }, 800);

            // El cartel se ocultará automáticamente cuando hasAvatarStream sea true
            console.log('[App] ⏳ Esperando stream de WebRTC...');
            // NO llamar initTTS() porque estamos iniciando video-chat con WebRTC
          } else {
            console.error('[App] ❌ No se pudo iniciar WebRTC');
            setShowConnectionError(true);
            setAvatarLoading(false);
          }
        } catch (error) {
          console.error('[App] ❌ Error en inicio de WebRTC:', error);
          setShowConnectionError(true);
          setAvatarLoading(false);
        }
      })();
    } else {
      // Plan PAGO: NO activar Jesús, ir al chat directo
      setJesusEnabled(false);
      jesusEnabledRef.current = false;

      // Inicializar TTS solo si audio está habilitado (chat-audio)
      if (audioEnabled) {
        await initTTS();
      }

      setIsChatReady(true);
      setScreen("chat");

      // Para planes pagos, verificar si audio está habilitado
      if (welcome && audioEnabled) {
        // Enviar por WebSocket TTS (audio+chat = 2 créditos)
        let attempts = 0;
        const maxAttempts = 15;

        const waitForTTS = () => {
          attempts++;
          const wsReady = ttsWSRef.current?.readyState() === "open";

          console.log(`[Welcome] Intento ${attempts}: WS=${ttsWSRef.current?.readyState()}, JesusRef=${jesusEnabledRef.current}`);

          if (wsReady) {
            ttsShimRef.current?.send(
              JSON.stringify({ text: welcome, lang, sessionId: `welcome-${Date.now()}` })
            );
            console.log(`[Welcome] ✅ Audio enviado por VOZ WebSocket (Jesús OFF)`);

            // Marcar que la bienvenida está en reproducción
            // Los créditos se descontarán cuando termine el audio (handleAudioEnd)
            welcomePlayingRef.current = true;
            welcomeCreditsDeductedRef.current = false;
            console.log('[Welcome] 🎵 Bienvenida iniciada, esperando finalización para descontar créditos...');
          } else if (attempts < maxAttempts) {
            console.log(`[Welcome] ⏳ Esperando WebSocket TTS...`);
            setTimeout(waitForTTS, 300);
          } else {
            console.error(`[Welcome] ❌ Timeout esperando WS TTS después de ${attempts} intentos`);
          }
        };
        setTimeout(waitForTTS, 800);
      } else if (welcome && !audioEnabled) {
        // Solo chat sin audio = NO hay audio que esperar, los créditos no aplican aquí
        // La bienvenida en modo chat puro no consume créditos de audio
        console.log('[Welcome] 💬 Modo solo chat (sin audio) - sin consumo de créditos por bienvenida');
      }
    }
  };

  // ===== Determinar modo actual =====
  const getCurrentMode = (): ConversationMode => {
    if (jesusEnabled) return "video-chat"; // Siempre video-chat cuando Jesús está activo (chatEnabled solo controla UI)
    if (audioEnabled && chatEnabled) return "chat-audio";
    return "chat";
  };

  // ===== Callbacks para Chat.tsx
  const handleConversationStart = useCallback(() => {
    console.log("[App] 🎙️ Conversación iniciada");
  }, []);

  const handleConversationEnd = useCallback(() => {
    console.log("[App] 🔇 Conversación terminada (inactividad)");
  }, []);

  // ===== Cambiar modo desde Chat.tsx o Menu
  const handleChangeMode = useCallback(async (mode: ConversationMode) => {
    console.log('[App] 🔄 Cambiando a modo:', mode);

    // Calcular modo actual ANTES de cambiar (basado en estados actuales)
    const currentMode: ConversationMode = jesusEnabled ? "video-chat" :
                                          audioEnabled && chatEnabled ? "chat-audio" :
                                          "chat";

    console.log('[App] 🔄 Modo actual:', currentMode, '→ Nuevo modo:', mode);

    // 🔓 LIBERAR RECURSOS DEL BACKEND si estamos saliendo de un modo que los consume
    if (currentMode !== mode && deviceId && sessionId) {
      if ((currentMode === 'video' || currentMode === 'video-chat') &&
          (mode !== 'video' && mode !== 'video-chat')) {
        console.log('[App] 🔓 Saliendo de modo video → liberando recursos L4 y T4Avatar');
        avatarResourceServiceRef.current.releaseVideoResources(deviceId, sessionId);
      } else if (currentMode === 'chat-audio' && mode !== 'chat-audio') {
        console.log('[App] 🔓 Saliendo de modo chat-audio → liberando recursos T4Chat');
        avatarResourceServiceRef.current.releaseChatAudioResources(deviceId, sessionId);
      }
    }

    // ✅ VERIFICAR CRÉDITOS ANTES DE CAMBIAR DE MODO
    console.log('[App] 💳 Verificando créditos para modo:', mode);
    const hasEnoughCredits = await canAsk(mode);
    console.log('[App] 💳 Créditos suficientes:', hasEnoughCredits);

    if (!hasEnoughCredits) {
      console.warn('[App] ❌ Créditos insuficientes para modo:', mode);

      // Cerrar WebRTC si está activo
      if (jesusEnabled) {
        console.log('[App] 🔌 Cerrando WebRTC por créditos insuficientes');
        setJesusEnabled(false);
        jesusEnabledRef.current = false;
        setHasAvatarStream(false);
        try { avatarPcRef.current?.close(); } catch {}
        avatarPcRef.current = null;
        avatarDcRef.current = null;
        avatarStreamRef.current = null;
        setLivetalkSessionId(null);
      }

      // Mostrar modal de créditos insuficientes
      setAllowCloseModal(false);
      setShowInsufficientCreditsModal(true);
      return; // NO ejecutar cambio de modo
    }

    // 📜 CARGAR HISTORIAL DE CONVERSACIONES
    console.log('[App] 📜 Recargando historial de conversaciones...');
    try {
      const subscriptionService = new SubscriptionService(BACKEND_URL);
      const historyData = await subscriptionService.getChatHistory(deviceId, 10);
      console.log('[App] 🔍 Respuesta de getChatHistory:', historyData);

      if (historyData && historyData.messages && historyData.messages.length > 0) {
        console.log('[App] 🔍 Mensajes recibidos:', historyData.messages);

        const formattedHistory = historyData.messages.flatMap(msg => {
          console.log('[App] 🔍 Procesando mensaje:', msg);
          return [
            { role: 'user' as const, content: msg.user_message, timestamp: msg.created_at },
            { role: 'assistant' as const, content: msg.assistant_message, timestamp: msg.created_at }
          ];
        });

        console.log('[App] 🔍 Historial formateado:', formattedHistory);
        setChatHistory(formattedHistory);
        console.log('[App] ✅ Historial recargado:', formattedHistory.length, 'mensajes');
      } else {
        console.log('[App] ℹ️ Sin historial previo o datos vacíos');
        console.log('[App] 🔍 historyData:', historyData);
      }
    } catch (error) {
      console.error('[App] ❌ Error recargando historial:', error);
    }

    // ⭐ ACTUALIZAR BACKEND INMEDIATAMENTE
    // Normalizar modo: "video" se guarda como "video-chat" en el backend (mismo flujo, solo chat oculto en UI)
    const backendMode = mode === 'video' ? 'video-chat' : mode;
    try {
      if (deviceIdLoaded && deviceId && isConfigured) {
        const subscriptionService = new SubscriptionService(BACKEND_URL);
        await subscriptionService.updateUserMode(deviceId, backendMode);
        console.log('[App] ✅ Modo actualizado en backend INMEDIATAMENTE:', backendMode);
      }
    } catch (error) {
      console.error('[App] ⚠️ Error actualizando modo en backend:', error);
      // No bloquear la UI, continuar con cambio local
    }

    // Guardar en localStorage
    saveLastMode(mode);
    StorageService.saveLastMode(mode);

    // Aplicar cambios en la UI
    switch (mode) {
      case 'chat':
        setChatEnabled(true);
        setAudioEnabled(false);
        if (jesusEnabled) {
          console.log('[App] 🔌 Cerrando WebRTC al cambiar a modo chat');
          setJesusEnabled(false);
          jesusEnabledRef.current = false;
          setHasAvatarStream(false);
          try { avatarPcRef.current?.close(); } catch {}
          avatarPcRef.current = null;
          avatarDcRef.current = null;
          avatarStreamRef.current = null;
          setLivetalkSessionId(null);
          console.log('[App] ✅ WebRTC cerrado completamente');
        }
        setScreen('chat');
        break;
      case 'chat-audio':
        setChatEnabled(true);
        setAudioEnabled(true);
        if (jesusEnabled) {
          console.log('[App] 🔌 Cerrando WebRTC al cambiar a modo chat-audio');
          setJesusEnabled(false);
          jesusEnabledRef.current = false;
          setHasAvatarStream(false);
          try { avatarPcRef.current?.close(); } catch {}
          avatarPcRef.current = null;
          avatarDcRef.current = null;
          avatarStreamRef.current = null;
          setLivetalkSessionId(null);
          console.log('[App] ✅ WebRTC cerrado completamente');
        }
        setScreen('chat');
        break;
      case 'video':
      case 'video-chat':
        // Ambos modos usan el mismo flujo (grabación, historial, etc.)
        // Solo difieren en la visibilidad del chat en la UI
        setChatEnabled(mode === 'video-chat'); // false para 'video', true para 'video-chat'
        setAudioEnabled(true); // Ambos tienen audio
        // Reconectar si Jesús no está activado O si no hay stream activo
        if (!jesusEnabled || !hasAvatarStream) {
          console.log(`[App] 🎥 Activando modo ${mode} - reconectando WebRTC`);
          setScreen('connecting');
          setAvatarLoading(true);
          setJesusEnabled(true);
          jesusEnabledRef.current = true;
          const sid = await startAvatarWebRTC();
          if (sid) {
            setLivetalkSessionId(sid);
            console.log(`[App] ✅ Modo ${mode} - SessionId guardado: ${sid}`);
            // El cartel se ocultará automáticamente cuando hasAvatarStream sea true
            console.log('[App] ⏳ Esperando stream de WebRTC...');
          } else {
            console.error('[App] ❌ No se obtuvo sessionId');
            setShowConnectionError(true);
            setAvatarLoading(false);
            setScreen('chat');
          }
        } else {
          setScreen('chat');
        }
        break;
    }

    console.log('[App] ✅ Modo cambiado localmente a:', mode);
  }, [jesusEnabled, hasAvatarStream, startAvatarWebRTC, deviceId, deviceIdLoaded, isConfigured, saveLastMode, canAsk]);

  // ===== Abrir panel de suscripciones o ir a planes
  const handleOpenSubscriptionPanel = useCallback(() => {
    console.log('[App] 💳 Redirigiendo a planes');

    // Si está en modo video (WebRTC activo), pausar la conexión
    if (jesusEnabled && hasAvatarStream) {
      console.log('[App] 🔌 Pausando WebRTC antes de ir a planes');
      stopAvatarWebRTC();
    }

    setIsCheckingSubscription(false);
    setScreen('plans');
  }, [jesusEnabled, hasAvatarStream]);

  // ===== Verificar créditos al llegar a pantalla de chat =====
  useEffect(() => {
    // Solo mostrar modal si NO puede usar ni siquiera el modo más barato (chat = 1 crédito)
    const canUseCheapestMode = subscription.creditsRemaining >= 1;

    console.log('[App] 🔍 useEffect verificación créditos:', {
      screen,
      creditsRemaining: subscription.creditsRemaining,
      showInsufficientCreditsModal,
      isCheckingSubscription,
      canUseCheapestMode,
      condition: screen === 'chat' && !canUseCheapestMode && !showInsufficientCreditsModal
    });

    if (screen === 'chat' && !canUseCheapestMode && !showInsufficientCreditsModal) {
      console.log('[App] ⚠️ Detectado en chat sin créditos para ningún modo - mostrando modal');
      setAllowCloseModal(false);
      setShowInsufficientCreditsModal(true);
      setIsCheckingSubscription(false);
    }
  }, [screen, subscription.creditsRemaining, showInsufficientCreditsModal, isCheckingSubscription]);

  // NOTA: El modo se guarda ÚNICAMENTE cuando el usuario lo cambia manualmente:
  // 1. En handleChangeMode() cuando selecciona un modo (líneas 2320-2334)
  // 2. En los toggles del menú (chat, audio, jesus)
  // NO se guarda automáticamente para evitar sobrescribir el modo cuando el sistema
  // cierra WebRTC por protección de consumo o créditos insuficientes

  // ===== INICIAR WEBRTC CUANDO USUARIO CAMBIA A MODO VIDEO DESDE MENÚ =====
  useEffect(() => {
    // SOLO ejecutar si:
    // 1. Está en pantalla "connecting"
    // 2. jesusEnabled está activado
    // 3. No hay conexión ya activa
    // 4. WebRTC NO fue inicializado en initializeApp (webrtcInitializedRef === false)
    // 5. No está cargando avatar
    // Este useEffect maneja el caso cuando el USUARIO CAMBIA manualmente a modo video desde el menú
    if (
      screen === 'connecting' &&
      jesusEnabled &&
      !hasAvatarStream &&
      !avatarLoading &&
      !webrtcInitializedRef.current
    ) {
      webrtcInitializedRef.current = true;  // Marcar como inicializado INMEDIATAMENTE
      console.log('[App] 🎬 Iniciando WebRTC desde cambio manual de modo');

      const initWebRTC = async () => {
        try {
          setAvatarLoading(true);
          const sid = await startAvatarWebRTC();

          if (sid) {
            setLivetalkSessionId(sid);
            console.log('[App] ✅ WebRTC iniciado con sessionId:', sid);

            // CRÍTICO: Esperar a que el DataChannel se abra y registre el sessionId
            // antes de solicitar el welcome (para que el lipsync funcione)
            console.log('[App] ⏳ Esperando 800ms para que DC se abra y registre sessionId...');
            setTimeout(async () => {
              console.log('[App] ✅ Delay completado, solicitando bienvenida...');

              // Verificar si ya se mostró la bienvenida en esta sesión
              if (hasShownWelcomeThisSession) {
                console.log('[App] ⏭️ Bienvenida ya mostrada en esta sesión, saltando...');
                return;
              }

              try {
                // Determinar modo actual basado en estados
                const currentMode = chatEnabled ? 'video-chat' : 'video';

                const welcomeService = new WelcomeService(BACKEND_URL);
                const welcomeData = await welcomeService.getWelcome(
                  lang,
                  userData?.name || 'Amigo',
                  userData?.gender || 'male',
                  deviceId,
                  currentMode,
                  sid
                );

                if (welcomeData) {
                  const welcomeText = welcomeService.formatWelcomeText(welcomeData);
                  setWelcome(welcomeText);
                  setHasShownWelcomeThisSession(true);
                  console.log('[App] ✅ Bienvenida recibida, backend maneja el audio');

                  // Agregar bienvenida al chat
                  setChatHistory(prev => [...prev, {
                    role: 'assistant',
                    content: welcomeText,
                    timestamp: new Date().toISOString()
                  }]);
                  console.log('[App] ✅ Bienvenida agregada al chat');

                  // Guardar bienvenida en la base de datos
                  try {
                    console.log('[App] 💾 Guardando bienvenida en BD...');
                    const now = new Date();
                    const clientTimestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
                    await conversationService.saveConversation({
                      device_id: deviceId,
                      user_message: SYSTEM_MESSAGES.conversationStart[lang as Language] || SYSTEM_MESSAGES.conversationStart.en,
                      assistant_message: `${welcomeData.message} ${welcomeData.response} ${welcomeData.question}`.trim(),
                      language: lang,
                      mode: currentMode,
                      credits_used: 0,
                      session_id: welcomeData.sessionId,
                      bible: welcomeData.bible,
                      client_timestamp: clientTimestamp
                    });
                    console.log('[App] ✅ Bienvenida guardada en BD');
                  } catch (error) {
                    console.error('[App] ❌ Error guardando bienvenida en BD:', error);
                  }

                  // Recargar créditos después del tiempo estimado
                  const words = welcomeText.split(/\s+/).length;
                  const estimatedDurationMs = (words / 150) * 60 * 1000 + 2000;
                  setTimeout(() => {
                    console.log('[App] 🔄 Recargando créditos...');
                    reloadSubscription();
                  }, estimatedDurationMs);
                }
              } catch (error) {
                console.error('[App] ❌ Error obteniendo bienvenida:', error);
              }
            }, 800);

            // El cartel se ocultará automáticamente cuando hasAvatarStream sea true
            console.log('[App] ⏳ Esperando stream de WebRTC...');
          } else {
            console.error('[App] ❌ No se pudo obtener sessionId');
            setShowConnectionError(true);
            setAvatarLoading(false);
          }
        } catch (error) {
          console.error('[App] ❌ Error iniciando WebRTC:', error);
          setShowConnectionError(true);
          setAvatarLoading(false);
        }
      };

      initWebRTC();
    }
  }, [screen, jesusEnabled, hasAvatarStream, avatarLoading, chatEnabled, startAvatarWebRTC, lang, userData, deviceId, reloadSubscription]);

  // ===== Cleanup al desmontar =====
  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, []);

  // ===== Listeners de ciclo de vida de la app =====
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Detectar cuando la app va a background o se cierra
    const pauseListener = CapacitorApp.addListener('pause', () => {
      console.log('[App] 📱 App va a background - liberando recursos');

      // Calcular modo actual
      const currentMode: ConversationMode = jesusEnabled ? "video-chat" :
                                            audioEnabled && chatEnabled ? "chat-audio" :
                                            "chat";

      // Liberar recursos según el modo actual
      if (deviceId && sessionId) {
        avatarResourceServiceRef.current.releaseAllResourcesForMode(currentMode, deviceId, sessionId);
      }
    });

    // Cleanup al desmontar
    return () => {
      pauseListener.remove();
    };
  }, [jesusEnabled, chatEnabled, audioEnabled, deviceId, sessionId]);

  return (
    <>
      <UpdateModal
        isOpen={showUpdateModal}
        forceUpdate={updateInfo?.forceUpdate || false}
        updateMessage={updateInfo?.updateMessage || ''}
        releaseNotes={updateInfo?.releaseNotes || ''}
        storeUrl={updateInfo?.storeUrl || ''}
        onClose={() => setShowUpdateModal(false)}
      />

      <ErrorBoundary>
        {/* Fondo */}
        <div className="fixed inset-0" style={bgStyle} />

      {/* Video del avatar debajo de la UI */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 10, background: "transparent" }}
      >
        <video
          id="avatar-video"
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          onLoadedMetadata={() => {
            console.log('[VIDEO] 🎥 *** VIDEO REAL DE JESÚS RENDERIZADO *** - archivo: App.tsx, línea: 2927');
            console.log('[VIDEO] 📊 screen:', screen, 'hasAvatarStream:', hasAvatarStream, 'jesusEnabled:', jesusEnabled, 'avatarLoading:', avatarLoading);
            const vid = document.getElementById("avatar-video") as HTMLVideoElement;
            console.log('[VIDEO] 📊 srcObject:', !!vid?.srcObject, 'videoTracks:', vid?.srcObject?.getVideoTracks().length, 'audioTracks:', vid?.srcObject?.getAudioTracks().length);
          }}
          style={{
            opacity: screen === "chat" && hasAvatarStream && jesusEnabled && !avatarLoading ? 1 : 0,
            transition: "opacity 0.3s ease",
            transform: jesusEnabled ? "scale(1.3) translateY(calc(-3vh - 30px))" : "scale(1.3) translateY(8vh)",
            backgroundColor: "transparent",
          }}
        />
      </div>

      {/* UI principal */}
      <div className="fixed inset-0" style={{ zIndex: 30, background: "transparent", pointerEvents: screen === "plans" ? "none" : "auto" }}>
        {/* Menú */}
        {screen === "chat" && (
          <div
            className="absolute right-4 z-[70]"
            style={{
              top: 'max(env(safe-area-inset-top, 16px) + 16px, 32px)',
              pointerEvents: "auto"
            }}
          >
            <Menu
              lang={lang}
              chatEnabled={chatEnabled}
              audioEnabled={audioEnabled}
              jesusEnabled={jesusEnabled}
              subscription={subscription}
              deviceId={deviceId}
              backendUrl={BACKEND_URL}
              isPlaying={isPlayingAudio}
              lastMode={lastMode}
              onModeChange={handleChangeMode}
              onToggleChat={async () => {
                const nextChat = !chatEnabled;
                setChatEnabled(nextChat);

                // ⭐ Calcular el NUEVO modo con el valor nextChat
                let newMode: ConversationMode;
                if (jesusEnabled && nextChat) newMode = "video-chat";
                else if (jesusEnabled && !nextChat) newMode = "video";
                else if (audioEnabled && nextChat) newMode = "chat-audio";
                else newMode = "chat";

                // Guardar en localStorage
                StorageService.saveLastMode(newMode);

                // Actualizar backend inmediatamente (normalizar "video" a "video-chat")
                const backendMode = newMode === 'video' ? 'video-chat' : newMode;
                try {
                  const subscriptionService = new SubscriptionService(BACKEND_URL);
                  await subscriptionService.updateUserMode(deviceId, backendMode);
                  console.log('[Menu] ✅ Chat toggle - Modo actualizado en backend:', backendMode);
                } catch (error) {
                  console.error('[Menu] ⚠️ Error actualizando modo:', error);
                }
              }}
              onToggleAudio={async () => {
                const nextAudio = !audioEnabled;
                setAudioEnabled(nextAudio);
                if (nextAudio && !jesusEnabledRef.current) {
                  // Si se activa audio y no está Jesús, iniciar TTS WebSocket
                  await initTTS();
                }

                // ⭐ Calcular el NUEVO modo con el valor nextAudio
                let newMode: ConversationMode;
                if (jesusEnabled && chatEnabled) newMode = "video-chat";
                else if (jesusEnabled && !chatEnabled) newMode = "video";
                else if (nextAudio && chatEnabled) newMode = "chat-audio";
                else newMode = "chat";

                // Guardar en localStorage
                StorageService.saveLastMode(newMode);

                // Actualizar backend inmediatamente (normalizar "video" a "video-chat")
                const backendMode = newMode === 'video' ? 'video-chat' : newMode;
                try {
                  const subscriptionService = new SubscriptionService(BACKEND_URL);
                  await subscriptionService.updateUserMode(deviceId, backendMode);
                  console.log('[Menu] ✅ Audio toggle - Modo actualizado en backend:', backendMode);
                } catch (error) {
                  console.error('[Menu] ⚠️ Error actualizando modo:', error);
                }
              }}
              onToggleJesus={async () => {
                const nextJesus = !jesusEnabled;

                if (nextJesus) {
                  // Activando Jesús: mostrar pantalla de carga
                  setScreen('connecting');
                  setAvatarLoading(true);
                  console.log("[Menu] 🎬 Activando modo Jesús...");

                  setJesusEnabled(true);
                  const sid = await startAvatarWebRTC();
                  if (sid) {
                    setLivetalkSessionId(sid);
                    console.log(`[Menu] ✅ SessionId guardado: ${sid}`);
                    // El cartel se ocultará automáticamente cuando hasAvatarStream sea true
                    console.log('[Menu] ⏳ Esperando stream de WebRTC...');
                  } else {
                    console.warn("[Menu] ⚠️ No se obtuvo sessionId de avatar");
                    setShowConnectionError(true);
                    setAvatarLoading(false);
                    setScreen('chat');
                  }
                } else {
                  // Desactivando Jesús
                  setJesusEnabled(false);
                  console.log("[Menu] 🔇 Desactivando modo Jesús");
                  try { avatarPcRef.current?.close(); } catch {}
                  avatarPcRef.current = null;
                  avatarDcRef.current = null;
                  avatarStreamRef.current = null;
                  setHasAvatarStream(false);
                  setLivetalkSessionId(null);
                }

                // ⭐ Calcular el NUEVO modo con el valor nextJesus
                let newMode: ConversationMode;
                if (nextJesus && chatEnabled) newMode = "video-chat";
                else if (nextJesus && !chatEnabled) newMode = "video";
                else if (audioEnabled && chatEnabled) newMode = "chat-audio";
                else newMode = "chat";

                // Guardar en localStorage
                StorageService.saveLastMode(newMode);

                // Actualizar backend inmediatamente (normalizar "video" a "video-chat")
                const backendMode = newMode === 'video' ? 'video-chat' : newMode;
                try {
                  const subscriptionService = new SubscriptionService(BACKEND_URL);
                  await subscriptionService.updateUserMode(deviceId, backendMode);
                  console.log('[Menu] ✅ Jesús toggle - Modo actualizado en backend:', backendMode);
                } catch (error) {
                  console.error('[Menu] ⚠️ Error actualizando modo:', error);
                }
              }}
              onLogout={handleLogout}
              onInsufficientCredits={() => {
                console.log('[App] 💳 Menu detectó créditos insuficientes');
                setAllowCloseModal(true); // Desde el menú SÍ se puede cerrar
                setShowInsufficientCreditsModal(true);
              }}
              onUpgradePlan={() => {
                console.log('[App] 📈 Menu - Mejorar plan');
                handleOpenSubscriptionPanel();
              }}
              onContactOpen={() => {
                if (jesusEnabled) {
                  console.log('[App] Desconectando WebRTC desde menú contacto');
                  stopAvatarWebRTC(true);
                }
              }}
              onContactClose={async () => {
                const savedMode = StorageService.getLastMode();
                console.log('[App] Cerrando contacto desde menú, modo guardado:', savedMode);
                if (savedMode === 'jesus' || savedMode === 'jesus-chat') {
                  console.log('[App] Reconectando WebRTC...');
                  await startAvatarWebRTC();
                }
              }}
            />
          </div>
        )}

        {/* Contenido central */}
        <div className={`w-full h-full flex items-center justify-center ${screen === "chat" ? "" : "px-6"}`}>
          
          {screen === "language" && <LanguageSelection onSelect={handleLangSelect} />}
          
          {screen === "terms" && (
            <LegalAcceptance
              language={lang}
              type="terms"
              onAccept={() => {
                acceptTerms();
                setScreen("privacy");
              }}
              onBack={() => setScreen("language")}
            />
          )}

          {screen === "privacy" && (
            <LegalAcceptance
              language={lang}
              type="privacy"
              onAccept={() => {
                if (typeof acceptPrivacy === 'function') {
                  acceptPrivacy();
                }
                setScreen("form");
              }}
              onBack={async () => {
                console.log('[Privacy] Usuario presionó Volver, iniciando conexión directa...');

                // Verificar que el usuario tenga datos completos
                if (!user?.name || !user?.gender) {
                  console.warn('[Privacy] Usuario sin datos completos, reiniciando flujo');
                  setUser(null);
                  setScreen("language");
                  return;
                }

                // Verificar créditos
                console.log('[Privacy] 💳 Créditos disponibles:', subscription.creditsRemaining);

                if (subscription.creditsTotal > 0 && subscription.creditsRemaining < 4) {
                  console.warn('[Privacy] ⚠️ Créditos insuficientes');
                  setAllowCloseModal(false);
                  setShowInsufficientCreditsModal(true);
                  setScreen("chat");
                  return;
                }

                // Activar Jesús e iniciar WebRTC
                setJesusEnabled(true);
                jesusEnabledRef.current = true;

                // Mostrar cartel de conexión inmediatamente
                setScreen("connecting");
                console.log('[Privacy] 🕐 Cartel "connecting" mostrado, iniciando WebRTC...');

                // Iniciar WebRTC
                let sid: number | null = null;
                try {
                  const timeoutPromise = new Promise<null>((_, reject) =>
                    setTimeout(() => reject(new Error('WebRTC timeout (30s)')), 30000)
                  );
                  sid = await Promise.race([startAvatarWebRTC(), timeoutPromise]);
                  console.log('[Privacy] ✅ WebRTC conectado con sid:', sid);
                } catch (error) {
                  console.error('[Privacy] ❌ Error en WebRTC:', error);
                  alert('No se pudo conectar con el servidor. Intenta nuevamente.');
                  setIsCheckingSubscription(false);
                  setScreen("plans");
                  setJesusEnabled(false);
                  jesusEnabledRef.current = false;
                  return;
                }

                if (sid) {
                  setLivetalkSessionId(sid);

                  // CRÍTICO: Esperar a que el DataChannel se abra y registre el sessionId
                  // antes de solicitar el welcome (para que el lipsync funcione)
                  console.log('[Privacy] ⏳ Esperando 800ms para que DC se abra y registre sessionId...');
                  setTimeout(async () => {
                    console.log('[Privacy] ✅ Delay completado, solicitando bienvenida...');

                    // Verificar si ya se mostró la bienvenida en esta sesión
                    if (hasShownWelcomeThisSession) {
                      console.log('[Privacy] ⏭️ Bienvenida ya mostrada en esta sesión, saltando...');
                      return;
                    }

                    try {
                      const welcomeService = new WelcomeService(BACKEND_URL);
                      const welcomeData = await welcomeService.getWelcome(
                        lang,
                        userData?.name || 'Amigo',
                        userData?.gender || 'male',
                        deviceId,
                        'video-chat',  // ✅ CORREGIDO: usar video-chat
                        sid       // sessionId del WebRTC
                      );

                      if (welcomeData) {
                        const welcomeText = welcomeService.formatWelcomeText(welcomeData);
                        setWelcome(welcomeText);
                        setHasShownWelcomeThisSession(true);
                        console.log('[Privacy] ✅ Bienvenida recibida, backend maneja el audio');

                        // Agregar bienvenida al chat
                        setChatHistory(prev => [...prev, {
                          role: 'assistant',
                          content: welcomeText,
                          timestamp: new Date().toISOString()
                        }]);
                        console.log('[Privacy] ✅ Bienvenida agregada al chat');

                        // Guardar bienvenida en la base de datos
                        try {
                          console.log('[Privacy] 💾 Guardando bienvenida en BD...');
                          const now = new Date();
                          const clientTimestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
                          await conversationService.saveConversation({
                            device_id: deviceId,
                            user_message: SYSTEM_MESSAGES.conversationStart[lang as Language] || SYSTEM_MESSAGES.conversationStart.en,
                            assistant_message: `${welcomeData.message} ${welcomeData.response} ${welcomeData.question}`.trim(),
                            language: lang,
                            mode: 'video-chat',  // ✅ CORREGIDO: usar video-chat
                            credits_used: 0,
                            session_id: welcomeData.sessionId,
                            bible: welcomeData.bible,
                            client_timestamp: clientTimestamp
                          });
                          console.log('[Privacy] ✅ Bienvenida guardada en BD');
                        } catch (error) {
                          console.error('[Privacy] ❌ Error guardando bienvenida en BD:', error);
                        }

                        // Recargar créditos después del tiempo estimado
                        const words = welcomeText.split(/\s+/).length;
                        const estimatedDurationMs = (words / 150) * 60 * 1000 + 2000;
                        setTimeout(() => {
                          console.log('[Privacy] 🔄 Recargando créditos...');
                          reloadSubscription();
                        }, estimatedDurationMs);
                      }
                    } catch (error) {
                      console.error('[Privacy] ❌ Error obteniendo bienvenida:', error);
                      handleConnectionError();
                    }
                  }, 800);

                  setTimeout(() => {
                    console.log('[Privacy] ⏱️ Transición a chat después de 9s');
                    unlockAudio(); // iOS: desbloquear audio con interacción del usuario
                    setScreen("chat");
                  }, 9000);
                }
              }}
            />
          )}

          {screen === "form" && (
            <UserForm 
              lang={lang} 
              loading={loading} 
              onSubmit={onFormSubmit} 
              onBack={() => setScreen("privacy")} 
            />
          )}

          {screen === "plans" && (
            <PlanSelection
              language={lang}
              onSelectPlan={handlePlanSelect}
              backendUrl={BACKEND_URL}
              deviceId={deviceId}
              currentTier={subscription.tier}
              creditsRemaining={subscription.creditsRemaining}
              onCancel={async () => {
                console.log('[App] 🔙 Usuario presionó Volver después de compra');

                try {
                  // 1. Leer datos actualizados desde la BD
                  const token = await AuthService.getToken(deviceId);
                  const response = await fetch(`${BACKEND_URL}/api/subscription/status?deviceId=${deviceId}`, {
                    headers: AuthService.getAuthHeaders(token)
                  });

                  if (response.ok) {
                    const data = await response.json();
                    console.log('[App] ✅ Datos desde BD:', {
                      credits: data.credits_remaining,
                      last_mode: data.last_mode,
                      tier: data.tier
                    });

                    // 2. Actualizar estado con datos frescos
                    updateSubscription({
                      tier: data.tier || 'free',
                      creditsRemaining: data.credits_remaining ?? 0,
                      creditsTotal: data.credits_total ?? 0,
                      expiresAt: data.expires_at || null,
                      isActive: data.is_active ?? true,
                      userName: data.user_name,
                      gender: data.gender,
                      language: data.language,
                      lastMode: data.last_mode || 'chat',
                      hasPlan: !!data.tier && data.tier !== 'free'
                    });

                    // 2.5. Recargar historial del chat
                    console.log('[App] 📚 Recargando historial del chat...');
                    try {
                      const historyData = await conversationService.getConversationHistory(deviceId);
                      console.log('[App] 📦 Historial recibido:', historyData);

                      if (historyData && historyData.messages && historyData.messages.length > 0) {
                        console.log('[App] 📝 Historial tiene', historyData.messages.length, 'mensajes');

                        const formattedHistory = historyData.messages.flatMap(msg => {
                          console.log('[App] 🔍 Procesando mensaje:', msg);
                          return [
                            { role: 'user' as const, content: msg.user_message, timestamp: msg.created_at },
                            { role: 'assistant' as const, content: msg.assistant_message, timestamp: msg.created_at }
                          ];
                        });

                        console.log('[App] 🔍 Historial formateado:', formattedHistory);
                        setChatHistory(formattedHistory);
                        console.log('[App] ✅ Historial recargado:', formattedHistory.length, 'mensajes');
                      } else {
                        console.log('[App] ℹ️ Sin historial previo o datos vacíos');
                      }
                    } catch (error) {
                      console.error('[App] ❌ Error recargando historial:', error);
                    }

                    // 3. Ir al modo guardado
                    // Si la BD devuelve 'video-chat', verificar localStorage para distinguir entre 'video' y 'video-chat'
                    let savedMode = data.last_mode || 'chat';
                    if (savedMode === 'video-chat') {
                      const localMode = StorageService.getLastMode();
                      if (localMode === 'video') {
                        savedMode = 'video';
                        console.log('[App] 🔄 BD devuelve video-chat pero localStorage tiene video → usando video');
                      }
                    }
                    console.log('[App] 🎯 Restaurando modo:', savedMode);
                    await handleChangeMode(savedMode as ConversationMode);

                    // Si no se ha mostrado la bienvenida en esta sesión, dispararla
                    if (!hasShownWelcomeThisSession) {
                      console.log('[App] 🔔 Disparando bienvenida después de volver de planes...');
                      setTimeout(async () => {
                        try {
                          // Usar savedMode de la BD (siempre last_mode)
                          const currentMode = savedMode;

                          const welcomeService = new WelcomeService(BACKEND_URL);
                          const welcomeData = await welcomeService.getWelcome(
                            lang,
                            userData?.name || 'Amigo',
                            userData?.gender || 'male',
                            deviceId,
                            currentMode,
                            livetalkSessionId || sessionIdRef.current
                          );

                          if (welcomeData) {
                            const welcomeText = welcomeService.formatWelcomeText(welcomeData);
                            setWelcome(welcomeText);
                            setHasShownWelcomeThisSession(true);
                            console.log('[App] ✅ Bienvenida post-planes disparada en modo:', currentMode);

                            setChatHistory(prev => [...prev, {
                              role: 'assistant',
                              content: welcomeText,
                              timestamp: new Date().toISOString()
                            }]);

                            // Guardar bienvenida en BD
                            try {
                              console.log('[App] 💾 Guardando bienvenida post-planes en BD...');
                              const now = new Date();
                              const clientTimestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
                              await conversationService.saveConversation({
                                device_id: deviceId,
                                user_message: SYSTEM_MESSAGES.conversationStart[lang as Language] || SYSTEM_MESSAGES.conversationStart.en,
                                assistant_message: welcomeText,
                                language: lang,
                                mode: currentMode,
                                credits_used: 0,
                                session_id: livetalkSessionId || sessionIdRef.current,
                                bible: welcomeData.bible,
                                client_timestamp: clientTimestamp
                              });
                              console.log('[App] ✅ Bienvenida post-planes guardada en BD');
                            } catch (saveError) {
                              console.error('[App] ❌ Error guardando bienvenida post-planes:', saveError);
                            }
                          }
                        } catch (error) {
                          console.error('[App] ❌ Error disparando bienvenida post-planes:', error);
                        }
                      }, 800);
                    }
                  } else {
                    console.error('[App] ❌ Error obteniendo datos:', response.status);
                    // Fallback: usar modo guardado en localStorage
                    const savedMode = StorageService.getLastMode() || 'chat';
                    await handleChangeMode(savedMode as ConversationMode);
                  }
                } catch (error) {
                  console.error('[App] ❌ Error en onCancel:', error);
                  // Fallback: usar modo guardado en localStorage
                  const savedMode = StorageService.getLastMode() || 'chat';
                  await handleChangeMode(savedMode as ConversationMode);
                }
              }}
            />
          )}

          {screen === "connecting" && (
            <>
              {(() => {
                console.log('[CONNECTING] 🎬 Renderizando pantalla CONNECTING');
                console.log('[CONNECTING] 📊 Estado:', { jesusEnabled, hasAvatarStream, avatarStream: !!avatarStreamRef.current });
                return null;
              })()}
              {/* Mostrar el video WebRTC cuando esté listo */}
              {jesusEnabled && hasAvatarStream && avatarStreamRef.current && (
                <AvatarVideo
                  jesusEnabled={jesusEnabled}
                  avatarStream={avatarStreamRef.current}
                  language={lang}
                />
              )}

              {/* Fondo según idioma */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${
                    lang === 'es' ? '/FESPANOL.jpeg' :
                    lang === 'en' ? '/FINGLES.jpeg' :
                    lang === 'pt' ? '/FPORTUGUES.jpeg' :
                    lang === 'it' ? '/FITALIANO.jpeg' :
                    lang === 'de' ? '/FALEMAN.jpeg' :
                    '/FFRANCES.jpeg'
                  })`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  zIndex: 998
                }}
              />

              {/* Overlay con mensaje de carga */}
              <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 999 }}>
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md mx-4 flex flex-col items-center justify-center gap-6">
                  <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500 to-transparent"
                         style={{
                           width: '40%',
                           animation: 'shimmer 1.5s ease-in-out infinite'
                         }}>
                    </div>
                  </div>
                  <p className="text-gray-900 text-lg font-semibold text-center leading-relaxed">
                    {lang === 'es' ? 'Aguarda, te estamos conectando con Jesús' :
                     lang === 'en' ? 'Please wait, we are connecting you with Jesus' :
                     lang === 'pt' ? 'Aguarde, estamos conectando você com Jesus' :
                     lang === 'it' ? 'Attendi, ti stiamo connettendo con Gesù' :
                     lang === 'de' ? 'Bitte warten Sie, wir verbinden Sie mit Jesus' :
                     'Attendez, nous vous connectons avec Jésus'}
                  </p>
                </div>
              </div>
            </>
          )}

          {screen === "chat" && (
            <>
              <Chat
                lang={lang}
                welcome={welcome}
                initialMessages={chatHistory}
                backendUrl={BACKEND_URL}
                chatTopPx={jesusEnabled && chatEnabled ? CHAT_TOP_JESUS_MODE_PX : CHAT_TOP_PX}
                ttsChannel={ttsShimRef.current as any}
                wsReady={ttsReady}
                chatEnabled={chatEnabled}
                audioEnabled={audioEnabled}
                jesusEnabled={jesusEnabled}
                sessionId={sessionId}
                livetalkSessionId={livetalkSessionId}
                startAvatarWebRTC={startAvatarWebRTC}
                stopAvatarWebRTC={stopAvatarWebRTC}
                diagnosePeerState={diagnosePeerState}
                onForceReconnect={forceReconnectWebRTC}
                onConversationStart={handleConversationStart}
                onConversationEnd={handleConversationEnd}
                onAudioStart={handleAudioStart}
                onAudioEnd={handleAudioEnd}
                userName={userData?.name || ""}
                userGender={userData?.gender || "male"}
                deviceId={deviceId}
                subscription={subscription}
                currentMode={getCurrentMode()}
                isChatReady={isChatReady}
                canAsk={canAsk}
                reloadSubscription={reloadSubscription}
                onSubscriptionUpdated={updateSubscription}
                onChangeMode={handleChangeMode}
                onOpenSubscriptionPanel={handleOpenSubscriptionPanel}
                onLogout={handleLogout}
                onContact={() => {
                  if (jesusEnabled) {
                    stopAvatarWebRTC(true);
                  }
                  setShowContactForm(true);
                }}
                isJesusSpeaking={isPlayingAudio}
                onPlayingStateChange={setIsPlayingAudio}
              />

              {/* Pantalla de carga cuando se reactiva Jesús desde el menú */}
              {avatarLoading && (
                <>
                  {/* Fondo según idioma */}
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url(${
                        lang === 'es' ? '/FESPANOL.jpeg' :
                        lang === 'en' ? '/FINGLES.jpeg' :
                        lang === 'pt' ? '/FPORTUGUES.jpeg' :
                        lang === 'it' ? '/FITALIANO.jpeg' :
                        lang === 'de' ? '/FALEMAN.jpeg' :
                        '/FFRANCES.jpeg'
                      })`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      zIndex: 998
                    }}
                  />

                  <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 999 }}>
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md mx-4 flex flex-col items-center justify-center gap-6">
                      <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500 to-transparent"
                             style={{
                               width: '40%',
                               animation: 'shimmer 1.5s ease-in-out infinite'
                             }}>
                        </div>
                      </div>
                      <p className="text-gray-900 text-lg font-semibold text-center leading-relaxed">
                        {lang === 'es' ? 'Aguarda, te estamos conectando con Jesús' :
                         lang === 'en' ? 'Please wait, we are connecting you with Jesus' :
                         lang === 'pt' ? 'Aguarde, estamos conectando você com Jesus' :
                         lang === 'it' ? 'Attendi, ti stiamo connettendo con Gesù' :
                         lang === 'de' ? 'Bitte warten Sie, wir verbinden Sie mit Jesus' :
                         'Attendez, nous vous connectons avec Jésus'}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de Conexión Inestable */}
      {showConnectionError && screen !== "plans" && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-8 border border-white/10">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-10 h-10 text-yellow-400" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-4">
                {lang === 'es' && 'Problema de Conexión'}
                {lang === 'en' && 'Connection Problem'}
                {lang === 'pt' && 'Problema de Conexão'}
                {lang === 'it' && 'Problema di Connessione'}
                {lang === 'de' && 'Verbindungsproblem'}
                {lang === 'fr' && 'Problème de Connexion'}
              </h2>

              <p className="text-white/80 mb-8 leading-relaxed">
                {lang === 'es' && 'Hay algún problema para conectarse. Prueba seguir con chat con Jesús o intenta más tarde. Jesús está siempre contigo, esperándote y cuidándote.'}
                {lang === 'en' && 'There is a connection problem. Try continuing with chat with Jesus or try again later. Jesus is always with you, waiting for you and caring for you.'}
                {lang === 'pt' && 'Há um problema de conexão. Tente continuar com o chat com Jesus ou tente novamente mais tarde. Jesus está sempre contigo, esperando por ti e cuidando de ti.'}
                {lang === 'it' && 'C\'è un problema di connessione. Prova a continuare con la chat con Gesù o riprova più tardi. Gesù è sempre con te, ti aspetta e si prende cura di te.'}
                {lang === 'de' && 'Es gibt ein Verbindungsproblem. Versuche mit dem Chat mit Jesus fortzufahren oder versuche es später erneut. Jesus ist immer bei dir, wartet auf dich und kümmert sich um dich.'}
                {lang === 'fr' && 'Il y a un problème de connexion. Essaie de continuer avec le chat avec Jésus ou réessaie plus tard. Jésus est toujours avec toi, t\'attend et prend soin de toi.'}
              </p>

              <button
                onClick={() => {
                  setShowConnectionError(false);
                  // Desactivar modo Jesus y pasar a chat
                  if (jesusEnabled) {
                    setJesusEnabled(false);
                    setHasAvatarStream(false);
                    stopAvatarWebRTC(false);
                  }
                  // Asegurar que chat esté activo
                  setChatEnabled(true);
                  setReconnectAttempts(0);
                  console.log('[App] Usuario eligió continuar con chat después de error de conexión');
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all"
              >
                {lang === 'es' && 'Continuar con Chat'}
                {lang === 'en' && 'Continue with Chat'}
                {lang === 'pt' && 'Continuar com Chat'}
                {lang === 'it' && 'Continua con Chat'}
                {lang === 'de' && 'Mit Chat fortfahren'}
                {lang === 'fr' && 'Continuer avec Chat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de inactividad */}
      {showInactivityModal && screen !== "plans" && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999, backgroundColor: 'transparent' }}>
          <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 max-w-md mx-4 flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <Clock className="w-10 h-10 text-yellow-500" />
            </div>

            <div className="text-center space-y-3">
              <h2 className="text-2xl font-bold text-gray-900">
                {lang === 'es' ? 'Protector de Consumo' :
                 lang === 'en' ? 'Consumption Protector' :
                 lang === 'pt' ? 'Protetor de Consumo' :
                 lang === 'it' ? 'Protettore di Consumo' :
                 lang === 'de' ? 'Verbrauchsschutz' :
                 'Protecteur de Consommation'}
              </h2>

              <p className="text-gray-600 text-lg leading-relaxed">
                {lang === 'es' ? 'Detectamos inactividad para que no gastes tus créditos' :
                 lang === 'en' ? 'We detected inactivity so you don\'t waste your credits' :
                 lang === 'pt' ? 'Detectamos inatividade para que você não gaste seus créditos' :
                 lang === 'it' ? 'Abbiamo rilevato inattività per non sprecare i tuoi crediti' :
                 lang === 'de' ? 'Wir haben Inaktivität erkannt, damit Sie Ihre Credits nicht verschwenden' :
                 'Nous avons détecté une inactivité pour ne pas gaspiller vos crédits'}
              </p>
            </div>

            <div className="flex flex-col w-full gap-3">
              <button
                onClick={handleResumeInactivity}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200 shadow-lg"
              >
                {lang === 'es' ? 'Volver' :
                 lang === 'en' ? 'Resume' :
                 lang === 'pt' ? 'Voltar' :
                 lang === 'it' ? 'Riprendi' :
                 lang === 'de' ? 'Fortsetzen' :
                 'Reprendre'}
              </button>

              <button
                onClick={handleSuspendInactivity}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200"
              >
                {lang === 'es' ? 'Cerrar Sesión' :
                 lang === 'en' ? 'Close Session' :
                 lang === 'pt' ? 'Fechar Sessão' :
                 lang === 'it' ? 'Chiudi Sessione' :
                 lang === 'de' ? 'Sitzung Schließen' :
                 'Fermer la Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de despedida (iOS) */}
      {showGoodbyeModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4">
          <div className="bg-gradient-to-b from-amber-900/95 to-amber-950/95 rounded-2xl p-6 max-w-sm w-full text-center border border-amber-700/50 shadow-2xl">
            <div className="text-5xl mb-4">🙏</div>
            <h2 className="text-2xl font-bold text-amber-100 mb-3">
              {lang === 'es' ? '¡Gracias por usar Habla con Dios!' :
               lang === 'en' ? 'Thank you for using Talk to God!' :
               lang === 'pt' ? 'Obrigado por usar Fale com Deus!' :
               lang === 'it' ? 'Grazie per aver usato Parla con Dio!' :
               lang === 'de' ? 'Danke, dass du Mit Gott Sprechen benutzt hast!' :
               'Merci d\'avoir utilisé Parle avec Dieu!'}
            </h2>
            <p className="text-amber-200/80 mb-6 text-sm">
              {lang === 'es' ? 'Para cerrar la aplicación, desliza hacia arriba desde la parte inferior de la pantalla.' :
               lang === 'en' ? 'To close the app, swipe up from the bottom of the screen.' :
               lang === 'pt' ? 'Para fechar o aplicativo, deslize para cima a partir da parte inferior da tela.' :
               lang === 'it' ? 'Per chiudere l\'app, scorri verso l\'alto dalla parte inferiore dello schermo.' :
               lang === 'de' ? 'Um die App zu schließen, wische vom unteren Bildschirmrand nach oben.' :
               'Pour fermer l\'application, faites glisser vers le haut depuis le bas de l\'écran.'}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowGoodbyeModal(false)}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
              >
                {lang === 'es' ? 'Seguir usando' :
                 lang === 'en' ? 'Continue using' :
                 lang === 'pt' ? 'Continuar usando' :
                 lang === 'it' ? 'Continua a usare' :
                 lang === 'de' ? 'Weiter benutzen' :
                 'Continuer à utiliser'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Créditos Insuficientes */}
      {showInsufficientCreditsModal && (() => {
        console.log('[App] 🎨 Renderizando InsufficientCreditsModal');
        return (
        <InsufficientCreditsModal
          language={lang}
          subscription={subscription}
          currentMode={getCurrentMode()}
          deviceId={deviceId}
          allowClose={allowCloseModal}
          onClose={async () => {
            console.log('[App] 🚫 Usuario cerró modal - cerrando aplicación');
            setShowInsufficientCreditsModal(false);
          }}
          onChangeMode={async (mode) => {
            setShowInsufficientCreditsModal(false);
            await handleChangeMode(mode);
          }}
          onRecharge={() => {
            console.log('[App] 💳 Usuario solicitó recargar desde modal');
            setShowInsufficientCreditsModal(false);

            // Detener WebRTC si está en modo video o video-chat
            if (jesusEnabled) {
              console.log('[App] 🔌 Deteniendo WebRTC antes de ir a suscripción');
              stopAvatarWebRTC(true);
            }

            handleOpenSubscriptionPanel();
          }}
          onContact={() => {
            console.log('[App] 📞 Usuario solicitó contacto desde modal');
            setShowInsufficientCreditsModal(false);
            if (jesusEnabled) {
              console.log('[App] Desconectando WebRTC antes de abrir contacto');
              stopAvatarWebRTC(true);
            }
            setShowContactForm(true);
          }}
          onLogout={() => {
            console.log('[App] 🚪 Usuario solicitó cerrar sesión desde modal');
            setShowInsufficientCreditsModal(false);
            handleLogout();
          }}
        />);
      })()}

      {/* Formulario de Contacto */}
      {showContactForm && (
        <ContactForm
          language={lang}
          backendUrl={BACKEND_URL}
          deviceId={deviceId}
          onClose={async () => {
            setShowContactForm(false);
            const savedMode = StorageService.getLastMode();
            console.log('[App] Cerrando formulario contacto, modo guardado:', savedMode);
            if (savedMode === 'jesus' || savedMode === 'jesus-chat') {
              console.log('[App] Reconectando WebRTC...');
              await startAvatarWebRTC();
            }
          }}
        />
      )}

      {/* Pantalla de carga inicial */}
      {isCheckingSubscription && screen !== "plans" && (() => {
        console.log('[App] ⏳ Renderizando pantalla de carga - isCheckingSubscription:', isCheckingSubscription);
        return (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center"
          style={{
            backgroundImage: 'url(/FFONDO.jpeg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-white text-lg font-semibold">
              Loading...
            </p>
          </div>
        </div>);
      })()}
      </ErrorBoundary>
    </>
  );
}