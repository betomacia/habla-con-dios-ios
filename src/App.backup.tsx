import React, { useEffect, useRef, useState, useCallback } from "react";
import { CircleUser as UserCircle, Check, ChevronLeft, WifiOff, Clock } from "lucide-react";
import Chat from "./Chat";
import Menu from "./components/Menu";
import AvatarVideo from "./components/AvatarVideo";
import { usePersistedUser } from "./hooks/usePersistedUser";
import { useCredits } from "./hooks/useCredits";
import LegalAcceptance from "./components/LegalAcceptance";
import PlanSelection from "./components/PlanSelection";
import { WelcomeService } from "./services/WelcomeService";
import type { ConversationMode, SubscriptionTier } from "./services/types";

// ===== Endpoints
const BACKEND_URL = "https://backend.movilive.es";
const VOZ_TTS_WS_URL = "wss://voz.movilive.es/ws/synthesize";
const AVATAR_OFFER_URLS = [
  "https://avatar.movilive.es/offer",
  "https://avatar.movilive.es/videostream",
];

export const CHAT_TOP_PX = 160;
export const CHAT_TOP_JESUS_MODE_PX = 200;
export type Language = "es" | "en" | "pt" | "it" | "de" | "fr";

// === Fondos locales
const BACKGROUNDS: Record<string, string> = {
  initial: "/FFONDO.jpeg",
  es: "/FESPANOL.jpeg",
  en: "/FINGLES.jpeg",
  pt: "/FPORTUGUES.jpeg",
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

function useBackground(screen: "language" | "terms" | "privacy" | "form" | "plans" | "chat", lang: Language) {
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
              className="w-full px-4 py-3 text-base rounded-xl bg-white/20 text-white placeholder-white/60 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-60"
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

  constructor(ctx?: AudioContext, onAudioStart?: () => void, onAudioEnd?: () => void) {
    this.ctx = ctx || new AudioContext();
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

    // Notificar inicio de audio
    if (this.onAudioStart) {
      this.onAudioStart();
    }

    src.start(this.playHead);
    this.playHead += buf.duration;

    // Notificar fin de audio después de que termine
    src.onended = () => {
      if (this.onAudioEnd) {
        this.onAudioEnd();
      }
    };
  }

  async enqueuePCM16(int16: Int16Array, channels?: number, sampleRate?: number) {
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
  private ws: WebSocket | null = null;
  private player: AudioQueuePlayer;
  private onReady: (r: boolean) => void;
  private onDone: () => void;
  private reconnectTimer: any = null;
  private remoteRate = 24000;
  private remoteChannels = 1;

  constructor(url: string, player: AudioQueuePlayer, onReady: (r: boolean)=>void, onDone: ()=>void) {
    this.url = url;
    this.player = player;
    this.onReady = onReady;
    this.onDone = onDone;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;

    this.ws = new WebSocket(this.url);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      this.onReady(true);
      const unlock = () => { this.player.resume(); document.removeEventListener("click", unlock); document.removeEventListener("touchstart", unlock); };
      document.addEventListener("click", unlock, { once: true });
      document.addEventListener("touchstart", unlock, { once: true });
    };

    this.ws.onclose = () => {
      this.onReady(false);
      if (!this.reconnectTimer) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null;
          this.connect();
        }, 1500);
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
}

export default function App() {
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
    consumeCredits: consumeCreditsBase,
    deductCredits: deductCreditsBase,
    updateSubscription,
    questionsRemaining,
  } = useCredits(deviceIdLoaded ? deviceId : '', BACKEND_URL);

  // Envolver consumeCredits para pasar callback de actualización
  const consumeCredits = useCallback(
    async (mode: ConversationMode): Promise<boolean> => {
      return await consumeCreditsBase(mode, updateSubscription);
    },
    [consumeCreditsBase, updateSubscription]
  );

  // Descontar créditos por cantidad específica
  const deductCredits = useCallback(
    async (amount: number, reason: string = 'inactivity'): Promise<boolean> => {
      return await deductCreditsBase(amount, reason, updateSubscription);
    },
    [deductCreditsBase, updateSubscription]
  );

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
  const [chatEnabled, setChatEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [jesusEnabled, setJesusEnabled] = useState(false);

  // Señales de conexión
  const [ttsReady, setTtsReady] = useState(false);
  const [hasAvatarStream, setHasAvatarStream] = useState(false);

  // Sistema de inactividad
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAudioTimeRef = useRef<number>(Date.now());
  // isWelcomePlayingRef ya no se necesita - créditos se descuentan al enviar
  const audioActiveRef = useRef(false);

  // Sessiones
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [livetalkSessionId, setLivetalkSessionId] = useState<number | null>(null);

  // Refs de conexión AVATAR
  const avatarPcRef = useRef<RTCPeerConnection | null>(null);
  const avatarDcRef = useRef<RTCDataChannel | null>(null);
  const avatarStreamRef = useRef<MediaStream | null>(null);
  const avatarConnectingRef = useRef(false);

  const jesusEnabledRef = useRef(jesusEnabled);
  const hasAvatarStreamRef = useRef(false);

  useEffect(() => { jesusEnabledRef.current = jesusEnabled; }, [jesusEnabled]);
  useEffect(() => { hasAvatarStreamRef.current = hasAvatarStream; }, [hasAvatarStream]);

  // ===== DETERMINAR PANTALLA INICIAL =====
  useEffect(() => {
    if (hasAcceptedTerms && hasAcceptedPrivacy && isConfigured && userData) {
      setScreen("chat");
      setLang(userData.language);
    } else {
      setScreen("language");
    }
  }, []);

  // ===== CARGAR WELCOME AUTOMÁTICO SI USUARIO YA CONFIGURADO =====
  useEffect(() => {
    if (isConfigured && userData && screen === "chat" && !welcome) {
      async function loadWelcome() {
        const welcomeService = new WelcomeService(BACKEND_URL);
        try {
          const welcomeData = await welcomeService.getWelcome(
            userData.language,
            userData.name,
            userData.gender
          );
          
          if (welcomeData) {
            const text = welcomeService.formatWelcomeText(welcomeData);
            setWelcome(text);
          } else {
            setWelcome(welcomeService.getFallbackWelcome(userData.language));
          }
        } catch (error) {
          console.error('[App] Error cargando welcome:', error);
          setWelcome(welcomeService.getFallbackWelcome(userData.language));
        }
      }
      loadWelcome();
    }
  }, [isConfigured, userData, screen, welcome]);

  // ====== TTS WebSocket Client ======
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playerRef = useRef<AudioQueuePlayer | null>(null);
  const ttsWSRef = useRef<TTSWSClient | null>(null);

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

  // ===== Sistema de detección de inactividad =====
  const startInactivityTimer = useCallback(() => {
    // Limpiar timer existente
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    // Solo activar si Jesús está enabled
    if (!jesusEnabledRef.current) return;

    const startTime = Date.now();
    console.log('[Inactivity] ⏰ Timer de 60s iniciado a las', new Date(startTime).toLocaleTimeString());

    inactivityTimerRef.current = setTimeout(async () => {
      const endTime = Date.now();
      const elapsed = (endTime - startTime) / 1000;
      console.log('[Inactivity] ⚠️ 60 segundos de inactividad detectados después de', elapsed.toFixed(1), 'segundos');

      // Descontar 4 créditos por video en desuso
      console.log('[Inactivity] 💳 Descontando 4 créditos por inactividad');
      const deducted = await deductCredits(4, 'video-inactivity');
      if (deducted) {
        console.log('[Inactivity] ✅ 4 créditos descontados exitosamente');
      } else {
        console.warn('[Inactivity] ⚠️ No se pudieron descontar créditos');
      }

      // Cerrar WebRTC para no consumir más créditos
      console.log('[Inactivity] 🔌 Cerrando WebRTC para ahorrar créditos');
      try { avatarPcRef.current?.close(); } catch {}
      avatarPcRef.current = null;
      avatarDcRef.current = null;
      avatarStreamRef.current = null;
      setHasAvatarStream(false);

      // Mostrar modal
      setShowInactivityModal(true);
    }, 60000); // 60 segundos
  }, [deductCredits]);

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
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const handleAudioEnd = useCallback(async () => {
    const now = Date.now();
    console.log('[Inactivity] 🔇 Audio terminado a las', new Date(now).toLocaleTimeString());
    audioActiveRef.current = false;

    // Los créditos de bienvenida se descuentan inmediatamente al enviar
    // (no aquí, porque con WebRTC no sabemos cuándo termina el audio)

    // Esperar 5 segundos después de que el audio termine
    console.log('[Inactivity] ⏳ Esperando 5 segundos antes de iniciar timer de 60s');
    setTimeout(() => {
      // Solo iniciar timer si sigue sin audio y Jesús está activo
      if (!audioActiveRef.current && jesusEnabledRef.current && hasAvatarStreamRef.current) {
        const timerStart = Date.now();
        console.log('[Inactivity] ⏰ Han pasado 5s. Iniciando timer de 60s a las', new Date(timerStart).toLocaleTimeString());
        startInactivityTimer();
      } else {
        console.log('[Inactivity] ❌ No se inicia timer - audioActive:', audioActiveRef.current, 'jesusEnabled:', jesusEnabledRef.current, 'hasStream:', hasAvatarStreamRef.current);
      }
    }, 5000);
  }, [startInactivityTimer, audioEnabled, deductCredits]);

  const initTTS = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    if (!playerRef.current) {
      playerRef.current = new AudioQueuePlayer(
        audioCtxRef.current,
        handleAudioStart,
        handleAudioEnd
      );
    }
    if (!ttsWSRef.current) {
      ttsWSRef.current = new TTSWSClient(
        VOZ_TTS_WS_URL,
        playerRef.current,
        (r) => setTtsReady(r),
        () => { (window as any).__ttsBusy__ = false; tryProcessQueue(); }
      );
    }
    ttsWSRef.current.connect();
  }, [tryProcessQueue, handleAudioStart, handleAudioEnd]);

  // ===== Control del timer de inactividad =====
  useEffect(() => {
    // Iniciar timer cuando el video carga y no hay audio
    if (hasAvatarStream && jesusEnabled && !audioActiveRef.current) {
      console.log('[Inactivity] 🎬 Video cargado, iniciando timer después de 5s');
      const timeout = setTimeout(() => {
        if (!audioActiveRef.current && jesusEnabled) {
          startInactivityTimer();
        }
      }, 5000);
      return () => clearTimeout(timeout);
    }

    // Limpiar timer si Jesús se desactiva o el video se pierde
    if (!hasAvatarStream || !jesusEnabled) {
      resetInactivityTimer();
    }
  }, [hasAvatarStream, jesusEnabled, startInactivityTimer, resetInactivityTimer]);

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, []);

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
        try {
          const data = typeof payload === "string" ? JSON.parse(payload) : payload;
          if (data && data.text) {
            const q: Array<{ text: string; lang: Language; sessionId?: string }> = (window as any).__outQueue__;
            q.push({ text: data.text, lang: data.lang, sessionId: data.sessionId });
            (window as any).__outQueue__ = q;
            tryProcessQueue();
          }
        } catch {}
      },
    };
  } else {
    ttsShimRef.current.send = (payload: any) => {
      try {
        const data = typeof payload === "string" ? JSON.parse(payload) : payload;
        if (data && data.text) {
          const q: Array<{ text: string; lang: Language; sessionId?: string }> = (window as any).__outQueue__;
          q.push({ text: data.text, lang: data.lang, sessionId: data.sessionId });
          (window as any).__outQueue__ = q;
          tryProcessQueue();
        }
      } catch {}
    };
  }

  // ===== AVATAR: WebRTC
  async function negotiateAvatarPC(pc: RTCPeerConnection) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    let lastErr: any = null;
    for (const url of AVATAR_OFFER_URLS) {
      try {
        console.log(`[Avatar] 🔄 Negociando con: ${url}`);
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sdp: offer.sdp, type: offer.type }),
        });
        if (!r.ok) {
          lastErr = new Error(`HTTP ${r.status} at ${url}`);
          console.warn(`[Avatar] ⚠️ Falló ${url}: ${r.status}`);
          continue;
        }
        const data = await r.json();
        await pc.setRemoteDescription(new RTCSessionDescription({ type: data.type, sdp: data.sdp }));
        return data.sessionid || null;
      } catch (e) {
        lastErr = e;
        console.error(`[Avatar] ❌ Error en ${url}:`, e);
      }
    }
    throw lastErr || new Error("Negotiation failed");
  }

  const startAvatarWebRTC = useCallback(async (): Promise<number | null> => {
    if (avatarConnectingRef.current) {
      console.log("[Avatar] ⏳ Ya hay una conexión en proceso");
      return null;
    }
    if (avatarPcRef.current && avatarPcRef.current.connectionState === "connected") {
      console.log("[Avatar] ✅ Ya hay conexión activa");
      return null;
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
        console.log("[Avatar] 🎬 Track recibido:", event.track.kind);
        if (event.streams && event.streams[0]) {
          avatarStreamRef.current = event.streams[0];
          setHasAvatarStream(true);
          console.log("[Avatar] ✅ Stream establecido, hasAvatarStream=true");
          const vid = document.getElementById("avatar-video") as HTMLVideoElement | null;
          if (vid) {
            vid.srcObject = avatarStreamRef.current;
            vid.muted = false;
            vid.volume = 1.0;
            vid.play().catch(() => {});
          }
          console.log("[Avatar] ✅ stream listo");
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
      };

      pc.onconnectionstatechange = () => {
        console.log("[Avatar] 📡 Connection estado:", pc.connectionState);
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

      const sid = await negotiateAvatarPC(pc);
      if (sid) {
        console.log(`[Avatar] ✅ sessionId=${sid}`);
      }
      return sid;
    } catch (e) {
      console.error("[Avatar] ❌ error:", e);
      avatarPcRef.current = null;
      avatarDcRef.current = null;
      setHasAvatarStream(false);
      if (ttsWSRef.current?.readyState() !== "open") setTtsReady(false);
      return null;
    } finally {
      avatarConnectingRef.current = false;
    }
  }, [tryProcessQueue]);

  // ===== Bienvenida (BACKEND) =====
  async function onFormSubmit(name: string, gender: string) {
    setLoading(true);

    const saved = saveUser({
      name,
      gender: gender as "male" | "female",
      language: lang
    });

    if (!saved) {
      console.error('[App] Error guardando usuario');
      setLoading(false);
      return;
    }

    try {
      const r = await fetch(`${BACKEND_URL}/api/welcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang, name, gender, hour: new Date().getHours() }),
      });
      const d = await r.json().catch(() => ({}));
      const msg = [d?.message, d?.question].filter(Boolean).join("\n\n").trim();
      const welcomeText = msg || SYSTEM_MESSAGES.welcomeFallback[lang];
      setWelcome(welcomeText);
      // NO ENVIAR AUDIO AQUÍ - se enviará después de elegir plan
      console.log(`[Welcome] ✅ Texto guardado (sin audio todavía):`, welcomeText.substring(0, 50) + '...');
    } catch {
      setWelcome(SYSTEM_MESSAGES.welcomeFallback[lang]);
    }
    setLoading(false);
    setScreen("plans"); // ← IR A SELECCIÓN DE PLANES
  }

  // ===== LOGOUT =====
  const handleLogout = () => {
    if (!confirm('¿Cerrar sesión? Tendrás que volver a ingresar tus datos.')) {
      return;
    }

    logout();
    setWelcome('');
    setJesusEnabled(false);
    setHasAvatarStream(false);

    try { avatarPcRef.current?.close(); } catch {}
    avatarPcRef.current = null;
    avatarDcRef.current = null;
    avatarStreamRef.current = null;
    setHasAvatarStream(false);

    setScreen('language');
  };

  // ===== Suspender por inactividad =====
  const handleSuspendInactivity = () => {
    console.log('[Inactivity] 💤 Sesión suspendida por el usuario');

    // WebRTC ya está cerrado (se cerró al mostrar el modal)
    // Solo limpiar estados y resetear
    setJesusEnabled(false);
    jesusEnabledRef.current = false;
    setHasAvatarStream(false);
    setLivetalkSessionId(null);

    // Cerrar modal
    setShowInactivityModal(false);
    resetInactivityTimer();
  };

  // ===== Reanudar después de inactividad =====
  const handleResumeInactivity = async () => {
    console.log('[Inactivity] ▶️ Reanudando conexión - modo silencioso');

    // Cerrar modal primero
    setShowInactivityModal(false);
    resetInactivityTimer();

    try {
      // Reconectar WebRTC sin pantalla de carga
      console.log('[Inactivity] 🔄 Activando jesusEnabled...');
      setJesusEnabled(true);
      jesusEnabledRef.current = true;

      console.log('[Inactivity] 🔌 Iniciando WebRTC...');
      const sid = await startAvatarWebRTC();

      if (sid) {
        setLivetalkSessionId(sid);
        console.log('[Inactivity] ✅ WebRTC reconectado con sessionId:', sid);
        console.log('[Inactivity] 🎥 Video en reposo, esperando interacción del usuario');

        // NO enviar bienvenida, solo activar video en modo reposo
        // El video quedará visible esperando la próxima interacción del usuario
      } else {
        console.error('[Inactivity] ❌ No se obtuvo sessionId');
      }
    } catch (error) {
      console.error('[Inactivity] ❌ Error al reconectar:', error);
    }
  };

  // ===== Conectar TTS WS al elegir idioma
  const handleLangSelect = async (l: Language) => {
    setLang(l);
    initTTS();
    setScreen("terms");
  };

  // ===== Manejar selección de plan
  const handlePlanSelect = async (tier: SubscriptionTier) => {
    console.log('[App] Plan seleccionado:', tier);

    if (tier === 'free') {
      // Plan FREE: Verificar créditos SOLO si ya fueron asignados
      console.log('[App] 💳 Créditos disponibles:', subscription.creditsRemaining);

      // Si tiene creditsTotal > 0 significa que ya se inicializó la cuenta
      // Solo bloquear si tiene cuenta inicializada pero sin créditos
      if (subscription.creditsTotal > 0 && subscription.creditsRemaining < 4) {
        console.warn('[App] ⚠️ Créditos insuficientes para iniciar con Jesús');
        setShowInsufficientCreditsModal(true);
        setScreen("chat");
        return;
      }

      // Tiene créditos o es usuario nuevo: activar Jesús e iniciar WebRTC
      setJesusEnabled(true);
      jesusEnabledRef.current = true;

      console.log('[App] 🚀 Iniciando WebRTC + envío de bienvenida en paralelo...');
      const startTime = Date.now();

      // Iniciar WebRTC
      const connectionPromise = startAvatarWebRTC();

      // Mostrar cartel inmediatamente
      setScreen("connecting");
      console.log('[App] 🕐 Cartel mostrado...');

      // Esperar la conexión
      const sid = await connectionPromise;

      if (sid) {
        setLivetalkSessionId(sid);
        console.log(`[App] ✅ WebRTC conectado con sessionId=${sid}`);
        console.log(`[Welcome] 🔍 Verificando mensaje de bienvenida:`, {
          welcomeLength: welcome?.length || 0,
          welcomePreview: welcome ? welcome.substring(0, 50) : 'VACÍO'
        });

        // Esperar 500ms para asegurar que el canal esté completamente listo
        setTimeout(() => {
          console.log(`[Welcome] ⏰ Timeout ejecutado, verificando welcome nuevamente...`);
          console.log(`[Welcome] 📊 Estado welcome:`, {
            exists: !!welcome,
            length: welcome?.length || 0,
            preview: welcome ? welcome.substring(0, 30) : 'NULL/VACÍO'
          });

          // Enviar bienvenida
          if (welcome) {
            console.log(`[Welcome] 📤 Enviando bienvenida a avoz.movilive.es:`, {
              text: welcome.substring(0, 50) + '...',
              lang,
              sessionid: sid
            });

            fetch('https://avoz.movilive.es/synthesize_to_livetalking', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: welcome,
                lang,
                sessionid: sid
              })
            }).then(async response => {
              console.log(`[Welcome] 📥 Respuesta recibida: status=${response.status}`);
              if (response.ok) {
                console.log(`[Welcome] ✅ Bienvenida enviada exitosamente`);

                // Descontar créditos INMEDIATAMENTE después de enviar
                console.log('[Welcome] 💳 Descontando créditos por bienvenida...');
                const creditsToDeduct = 4; // video-chat
                const deducted = await deductCredits(creditsToDeduct, 'welcome');
                if (deducted) {
                  console.log(`[Welcome] ✅ ${creditsToDeduct} créditos descontados`);
                } else {
                  console.warn('[Welcome] ⚠️ No se pudieron descontar créditos');
                }
              } else {
                console.error(`[Welcome] ❌ Error HTTP ${response.status}`);
                response.text().then(text => {
                  console.error(`[Welcome] ❌ Detalles:`, text);
                });
              }
            }).catch(error => {
              console.error('[Welcome] ❌ Error de red:', error);
            });
          } else {
            console.warn('[Welcome] ⚠️ No hay mensaje de bienvenida para enviar');
          }
        }, 500);

        // Esperar 6 segundos TOTALES
        const elapsed = Date.now() - startTime;
        const minWaitTime = 6000;
        const remainingTime = Math.max(0, minWaitTime - elapsed);

        console.log(`[App] ⏳ Esperando ${remainingTime}ms más (total ${elapsed + remainingTime}ms)...`);

        setTimeout(() => {
          console.log('[App] ✅ Mostrando chat con Jesús');
          setScreen("chat");
        }, remainingTime);
      } else {
        // Si falla, esperar 6 segundos
        const elapsed = Date.now() - startTime;
        const remainingTime = Math.max(0, 6000 - elapsed);
        console.warn(`[App] ⚠️ Conexión falló, esperando ${remainingTime}ms...`);
        setTimeout(() => {
          setScreen("chat");
        }, remainingTime);
      }
    } else {
      // Plan PAGO: NO activar Jesús, ir al chat directo
      setJesusEnabled(false);
      jesusEnabledRef.current = false;
      setScreen("chat");

      // Para planes pagos, enviar por WebSocket TTS (sin Jesús)
      if (welcome) {
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

            // Descontar créditos inmediatamente (1 crédito para chat-audio)
            (async () => {
              console.log('[Welcome] 💳 Descontando 1 crédito por bienvenida (audio)...');
              const deducted = await deductCredits(1, 'welcome');
              if (deducted) {
                console.log('[Welcome] ✅ 1 crédito descontado');
              } else {
                console.warn('[Welcome] ⚠️ No se pudo descontar crédito');
              }
            })();
          } else if (attempts < maxAttempts) {
            console.log(`[Welcome] ⏳ Esperando WebSocket TTS...`);
            setTimeout(waitForTTS, 300);
          } else {
            console.error(`[Welcome] ❌ Timeout esperando WS TTS después de ${attempts} intentos`);
          }
        };
        setTimeout(waitForTTS, 800);
      }
    }
  };

  // ===== Determinar modo actual =====
  const getCurrentMode = (): ConversationMode => {
    if (jesusEnabled && chatEnabled) return "video-chat";
    if (jesusEnabled && !chatEnabled) return "video";
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

  // ===== Cambiar modo desde Chat.tsx
  const handleChangeMode = useCallback(async (mode: ConversationMode) => {
    console.log('[App] 🔄 Cambiando a modo:', mode);

    switch (mode) {
      case 'chat':
        setChatEnabled(true);
        setAudioEnabled(false);
        if (jesusEnabled) {
          setJesusEnabled(false);
          setHasAvatarStream(false);
          try { avatarPcRef.current?.close(); } catch {}
        }
        break;
      case 'chat-audio':
        setChatEnabled(true);
        setAudioEnabled(true);
        if (jesusEnabled) {
          setJesusEnabled(false);
          setHasAvatarStream(false);
          try { avatarPcRef.current?.close(); } catch {}
        }
        break;
      case 'video':
        setChatEnabled(false);
        setAudioEnabled(false);
        if (!jesusEnabled) {
          setJesusEnabled(true);
          await startAvatarWebRTC();
        }
        break;
      case 'video-chat':
        setChatEnabled(true);
        setAudioEnabled(true);
        if (!jesusEnabled) {
          setJesusEnabled(true);
          await startAvatarWebRTC();
        }
        break;
    }

    console.log('[App] ✅ Modo cambiado a:', mode);
  }, [jesusEnabled, startAvatarWebRTC]);

  // ===== Abrir panel de suscripciones
  const handleOpenSubscriptionPanel = useCallback(() => {
    console.log('[App] 💳 Abriendo panel de suscripciones');
    window.dispatchEvent(new CustomEvent('openSubscriptionPanel'));
  }, []);

  // ===== GUARDAR MODO CUANDO CAMBIA =====
  useEffect(() => {
    const currentMode = getCurrentMode();
    saveLastMode(currentMode);
    console.log('[App] 💾 Modo guardado:', currentMode);
  }, [chatEnabled, audioEnabled, jesusEnabled, saveLastMode]);

  // ===== RESTAURAR MODO AL INICIAR =====
  useEffect(() => {
    if (lastMode && screen === 'chat' && !avatarLoading) {
      console.log('[App] 🔄 Restaurando último modo:', lastMode);

      // Validar créditos suficientes para el modo guardado
      const validateAndRestoreMode = async () => {
        const hasEnoughCredits = await canAsk(lastMode);

        if (hasEnoughCredits) {
          // Restaurar modo exacto
          switch (lastMode) {
            case 'video-chat':
              setChatEnabled(true);
              setAudioEnabled(true);
              if (!jesusEnabled) {
                setJesusEnabled(true);
                await startAvatarWebRTC();
              }
              break;
            case 'video':
              setChatEnabled(false);
              setAudioEnabled(false);
              if (!jesusEnabled) {
                setJesusEnabled(true);
                await startAvatarWebRTC();
              }
              break;
            case 'chat-audio':
              setChatEnabled(true);
              setAudioEnabled(true);
              setJesusEnabled(false);
              break;
            case 'chat':
              setChatEnabled(true);
              setAudioEnabled(false);
              setJesusEnabled(false);
              break;
          }
          console.log('[App] ✅ Modo restaurado:', lastMode);
        } else {
          // Créditos insuficientes, usar modo más económico disponible
          console.warn('[App] ⚠️ Créditos insuficientes para modo guardado:', lastMode);

          // Buscar modo disponible (de menor a mayor consumo)
          if (await canAsk('chat')) {
            setChatEnabled(true);
            setAudioEnabled(false);
            setJesusEnabled(false);
            setHasAvatarStream(false);
            try { avatarPcRef.current?.close(); } catch {}
            console.log('[App] ✅ Cambiado a modo "chat" (créditos insuficientes)');
          } else if (await canAsk('chat-audio')) {
            setChatEnabled(true);
            setAudioEnabled(true);
            setJesusEnabled(false);
            setHasAvatarStream(false);
            try { avatarPcRef.current?.close(); } catch {}
            console.log('[App] ✅ Cambiado a modo "chat-audio" (créditos insuficientes)');
          } else {
            // Sin créditos suficientes para ningún modo
            console.warn('[App] ❌ Sin créditos suficientes para ningún modo');
          }
        }
      };

      validateAndRestoreMode();
    }
  }, [lastMode, screen, avatarLoading]);

  return (
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
          style={{
            opacity: screen === "chat" && hasAvatarStream && jesusEnabled && !avatarLoading ? 1 : 0,
            transition: "opacity 0.3s ease",
            transform: jesusEnabled ? "scale(1.3) translateY(-50px)" : "scale(1.3) translateY(120px)",
            backgroundColor: "transparent",
          }}
        />
      </div>

      {/* UI principal */}
      <div className="fixed inset-0" style={{ zIndex: 30, background: "transparent", pointerEvents: "auto" }}>
        {/* Banner de reconexión */}
        {screen === "chat" && !ttsReady && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm z-[65]">
            <WifiOff className="w-4 h-4" />
            <span>{SYSTEM_MESSAGES.reconnecting[lang]}</span>
          </div>
        )}

        {/* Menú */}
        {screen === "chat" && (
          <div className="absolute top-4 right-4 z-[70]" style={{ pointerEvents: "auto" }}>
            <Menu
              lang={lang}
              chatEnabled={chatEnabled}
              audioEnabled={audioEnabled}
              jesusEnabled={jesusEnabled}
              subscription={subscription}
              deviceId={deviceId}
              backendUrl={BACKEND_URL}
              onToggleChat={() => setChatEnabled((v) => !v)}
              onToggleAudio={() => setAudioEnabled((v) => !v)}
              onToggleJesus={async () => {
                const next = !jesusEnabled;
                if (next) {
                  // Activando Jesús: mostrar pantalla de carga
                  setAvatarLoading(true);
                  console.log("[Menu] 🎬 Activando modo Jesús...");

                  setJesusEnabled(true);
                  const sid = await startAvatarWebRTC();
                  if (sid) {
                    setLivetalkSessionId(sid);
                    console.log(`[Menu] ✅ SessionId guardado: ${sid}`);
                  } else {
                    console.warn("[Menu] ⚠️ No se obtuvo sessionId de avatar");
                  }

                  // Esperar 3 segundos antes de ocultar la pantalla de carga
                  setTimeout(() => {
                    setAvatarLoading(false);
                  }, 3000);
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
              }}
              onLogout={handleLogout}
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
              onBack={() => setScreen("terms")}
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
            />
          )}

          {screen === "connecting" && (
            <>
              {/* Mostrar el video WebRTC cuando esté listo */}
              {jesusEnabled && hasAvatarStream && avatarStreamRef.current && (
                <AvatarVideo
                  stream={avatarStreamRef.current}
                  chatTopPx={CHAT_TOP_JESUS_MODE_PX}
                  onLoadedMetadata={() => {
                    console.log('[Connecting] Video WebRTC cargado');
                  }}
                />
              )}

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
                onConversationStart={handleConversationStart}
                onConversationEnd={handleConversationEnd}
                onAudioStart={handleAudioStart}
                onAudioEnd={handleAudioEnd}
                userName={userData?.name || ""}
                userGender={userData?.gender || "male"}
                deviceId={deviceId}
                subscription={subscription}
                currentMode={getCurrentMode()}
                canAsk={canAsk}
                consumeCredits={consumeCredits}
                onSubscriptionUpdated={updateSubscription}
                onChangeMode={handleChangeMode}
                onOpenSubscriptionPanel={handleOpenSubscriptionPanel}
              />

              {/* Pantalla de carga cuando se reactiva Jesús desde el menú */}
              {avatarLoading && (
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
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de Protector de Consumo */}
      {showInactivityModal && (
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
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-4 px-6 rounded-xl transition-colors duration-200"
              >
                {lang === 'es' ? 'Suspender' :
                 lang === 'en' ? 'Suspend' :
                 lang === 'pt' ? 'Suspender' :
                 lang === 'it' ? 'Sospendi' :
                 lang === 'de' ? 'Aussetzen' :
                 'Suspendre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
}