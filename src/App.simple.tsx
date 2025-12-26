import React, { useEffect, useRef, useState } from "react";
import { CircleUser as UserCircle, Check, ChevronLeft } from "lucide-react";
import Chat from "./Chat";
import Menu from "./components/Menu";
import AvatarVideo from "./components/AvatarVideo";
import LegalAcceptance from "./components/LegalAcceptance";
import { usePersistedUser } from "./hooks/usePersistedUser";

const BACKEND_URL = "https://backend.movilive.es";
const AVATAR_OFFER_URLS = [
  "https://avatar.movilive.es/offer",
  "https://avatar.movilive.es/videostream",
];

export const CHAT_TOP_JESUS_MODE_PX = 200;
export type Language = "es" | "en" | "pt" | "it" | "de" | "fr";

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

function useBackground(screen: "language" | "terms" | "privacy" | "form" | "chat", lang: Language) {
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

export default function App() {
  const [screen, setScreen] = useState<"language" | "terms" | "privacy" | "form" | "chat">("language");
  const [lang, setLang] = useState<Language>("es");
  const { style: bgStyle } = useBackground(screen, lang);

  const { user, saveUser } = usePersistedUser();
  const [userName, setUserName] = useState(user?.name || "");
  const [userEmail, setUserEmail] = useState(user?.email || "");

  // WebRTC Avatar
  const avatarPcRef = useRef<RTCPeerConnection | null>(null);
  const avatarDcRef = useRef<RTCDataChannel | null>(null);
  const avatarStreamRef = useRef<MediaStream | null>(null);
  const [hasAvatarStream, setHasAvatarStream] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);

  async function negotiateAvatar(pc: RTCPeerConnection): Promise<number | null> {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    let lastErr: any = null;
    for (const url of AVATAR_OFFER_URLS) {
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: offer.type, sdp: offer.sdp }),
        });
        if (!r.ok) {
          lastErr = new Error(`HTTP ${r.status}`);
          continue;
        }
        const data = await r.json();
        await pc.setRemoteDescription(new RTCSessionDescription({ type: data.type, sdp: data.sdp }));
        return data.sessionid || null;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("Negotiation failed");
  }

  async function startAvatarWebRTC() {
    if (avatarPcRef.current) {
      try { avatarPcRef.current.close(); } catch {}
      avatarPcRef.current = null;
      avatarStreamRef.current = null;
    }

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
      if (event.streams && event.streams[0]) {
        avatarStreamRef.current = event.streams[0];
        setHasAvatarStream(true);
        console.log("[Avatar] Stream recibido");
      }
    };

    const dc = pc.createDataChannel("tts", { ordered: true });
    avatarDcRef.current = dc;

    try {
      const sid = await negotiateAvatar(pc);
      setSessionId(sid);
      console.log("[Avatar] SessionId:", sid);
    } catch (e) {
      console.error("[Avatar] Error:", e);
    }
  }

  // Iniciar avatar cuando llegue al chat
  useEffect(() => {
    if (screen === "chat") {
      startAvatarWebRTC();
    }
  }, [screen]);

  // Enviar bienvenida
  useEffect(() => {
    if (screen === "chat" && sessionId) {
      const welcome = `Buenas tardes ${userName}. Bienvenido.`;
      setTimeout(() => {
        fetch("https://avoz.movilive.es", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: welcome, lang, sessionid: sessionId }),
        }).catch(e => console.error("[Welcome] Error:", e));
      }, 2000);
    }
  }, [screen, sessionId, userName, lang]);

  function handleLanguageSelection(selectedLang: Language) {
    setLang(selectedLang);
    setScreen("terms");
  }

  function handleTermsAccept() {
    setScreen("form");
  }

  function handleFormSubmit() {
    if (!userName.trim()) {
      alert("Por favor ingresa tu nombre");
      return;
    }
    saveUser({ name: userName, email: userEmail });
    setScreen("chat");
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br" style={bgStyle}>
      <div className="relative w-full h-full flex flex-col">

        {/* Avatar Video */}
        {screen === "chat" && hasAvatarStream && avatarStreamRef.current && (
          <AvatarVideo
            stream={avatarStreamRef.current}
            chatTopPx={CHAT_TOP_JESUS_MODE_PX}
            onLoadedMetadata={() => console.log("[Avatar] Video cargado")}
          />
        )}

        {/* Language Selection */}
        {screen === "language" && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-md w-full">
              <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
                Selecciona tu idioma
              </h1>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { code: "es" as Language, label: "Español", flag: "🇪🇸" },
                  { code: "en" as Language, label: "English", flag: "🇬🇧" },
                  { code: "pt" as Language, label: "Português", flag: "🇵🇹" },
                  { code: "it" as Language, label: "Italiano", flag: "🇮🇹" },
                  { code: "de" as Language, label: "Deutsch", flag: "🇩🇪" },
                  { code: "fr" as Language, label: "Français", flag: "🇫🇷" },
                ].map(({ code, label, flag }) => (
                  <button
                    key={code}
                    onClick={() => handleLanguageSelection(code)}
                    className="flex items-center justify-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold transition-all transform hover:scale-105"
                  >
                    <span className="text-2xl">{flag}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Terms */}
        {screen === "terms" && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-2xl w-full">
              <button
                onClick={() => setScreen("language")}
                className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800"
              >
                <ChevronLeft size={20} />
                Volver
              </button>
              <LegalAcceptance
                lang={lang}
                onAccept={handleTermsAccept}
                onReject={() => setScreen("language")}
              />
            </div>
          </div>
        )}

        {/* User Form */}
        {screen === "form" && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-md w-full">
              <button
                onClick={() => setScreen("terms")}
                className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800"
              >
                <ChevronLeft size={20} />
                Volver
              </button>
              <div className="flex items-center gap-3 mb-6">
                <UserCircle size={32} className="text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-800">Tus datos</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email (opcional)
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="tu@email.com"
                  />
                </div>
                <button
                  onClick={handleFormSubmit}
                  className="w-full mt-6 px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <Check size={20} />
                  Continuar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat */}
        {screen === "chat" && (
          <>
            <Menu
              deviceId="simple"
              lang={lang}
              mode="video-chat"
              subscription={{
                tier: "free",
                creditsRemaining: 999,
                creditsTotal: 999,
                expiresAt: null,
                isActive: true
              }}
              onLogout={() => {
                setScreen("language");
                if (avatarPcRef.current) {
                  avatarPcRef.current.close();
                  avatarPcRef.current = null;
                }
              }}
              onModeToggle={() => {}}
              onDeleteAccount={() => {}}
              onContactSupport={() => {}}
              onUpdateSubscription={() => {}}
            />
            <div className="flex-1 pt-[100px]">
              <Chat
                deviceId="simple"
                lang={lang}
                userName={userName}
                backendUrl={BACKEND_URL}
                mode="video-chat"
                sessionId={sessionId}
                avatarDataChannel={avatarDcRef.current}
                jesusEnabled={true}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
