import { useEffect, useMemo, useRef, useState } from "react";

export default function AvatarVideo({
  jesusEnabled,
  avatarStream,
  isConversationActive,
  zoom = 1.3,
  offsetY = 45,
  language = 'es',
}: {
  jesusEnabled: boolean;
  avatarStream: MediaStream | null;
  isConversationActive?: boolean;
  zoom?: number;
  offsetY?: number;
  language?: 'es' | 'en' | 'pt' | 'it' | 'de' | 'fr';
}) {
  const reposoVideoRef = useRef<HTMLVideoElement>(null);
  const avatarVideoRef = useRef<HTMLVideoElement>(null);

  const [reposoLoaded, setReposoLoaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [audioDetected, setAudioDetected] = useState(false);
  const [showBackground, setShowBackground] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamForDetectRef = useRef<MediaStream | null>(null);

  // 1) Asignar el stream remoto al <video> y manejar "ready"
  useEffect(() => {
    if (!jesusEnabled) {
      setVideoReady(false);
      setAudioDetected(false);
      return;
    }

    const v = avatarVideoRef.current;
    if (!v) return;

    try {
      setLoading(true);
      if (avatarStream) {
        v.srcObject = avatarStream;

        const handleLoadedMeta = async () => {
          setVideoReady(true);

          console.log("[AvatarVideo] 🔊 FORZANDO desmute inmediato (no esperar detector)");
          v.muted = false;
          v.volume = 1.0;

          try {
            await v.play();
            console.log("[AvatarVideo] ✅ Video reproduciéndose (unmuted)");
          } catch (e) {
            console.warn("[AvatarVideo] play() diferido:", e);
          }
        };

        v.addEventListener("loadedmetadata", handleLoadedMeta);
        if (v.readyState >= 1) handleLoadedMeta();

        return () => {
          v.removeEventListener("loadedmetadata", handleLoadedMeta);
        };
      } else {
        v.srcObject = null;
        setVideoReady(false);
      }
    } finally {
      setLoading(false);
    }
  }, [jesusEnabled, avatarStream]);

  // 2) Detección de audio del MediaStream REMOTO
  useEffect(() => {
    if (!jesusEnabled || !avatarStream) {
      cleanupAudioDetect();
      setAudioDetected(false);
      return;
    }

    const audioTracks = avatarStream.getAudioTracks();
    if (audioTracks.length === 0) {
      cleanupAudioDetect();
      setAudioDetected(false);
      return;
    }

    streamForDetectRef.current = avatarStream;

    const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = ac;

    const source = ac.createMediaStreamSource(avatarStream);
    const analyser = ac.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const AUDIO_THRESHOLD = 10; // Reducido para voz suave de Jesús
    const START_FRAMES = 3;

    let started = false;
    let consecStart = 0;

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);
      const avg =
        dataArray.reduce((a, b) => a + b, 0) / Math.max(1, dataArray.length);

      if (!started) {
        if (avg > AUDIO_THRESHOLD) {
          consecStart++;
          if (consecStart >= START_FRAMES) {
            started = true;
            consecStart = 0;
            setAudioDetected(true);

            const v = avatarVideoRef.current;
            if (v) {
              v.muted = false;
              v.volume = 1.0;
              v.play().catch(() => {});
            }
          }
        } else {
          consecStart = 0;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => cleanupAudioDetect();
  }, [jesusEnabled, avatarStream]);

  function cleanupAudioDetect() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch {}
      analyserRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
  }

  // 3) Mostrar video de avatar sólo con VIDEO listo
  const shouldShowAvatar = useMemo(() => {
    const hasRemoteVideo =
      !!avatarStream && avatarStream.getVideoTracks().length > 0;
    return jesusEnabled && hasRemoteVideo && videoReady;
  }, [jesusEnabled, avatarStream, videoReady]);

  useEffect(() => {
    setShowBackground(shouldShowAvatar);
  }, [shouldShowAvatar]);

  // 4) Cargar video de reposo
  useEffect(() => {
    if (!jesusEnabled || !reposoVideoRef.current) return;
    const v = reposoVideoRef.current;

    const onLoaded = () => {
      setReposoLoaded(true);
      v.style.display = "block";
      v.style.opacity = "1";
    };
    v.addEventListener("loadeddata", onLoaded);
    v.play().catch(() => {});
    return () => v.removeEventListener("loadeddata", onLoaded);
  }, [jesusEnabled]);

  // 5) Render
  console.log('[VIDEO] 🔍 AvatarVideo render - jesusEnabled:', jesusEnabled, 'avatarStream:', !!avatarStream, 'videoReady:', videoReady);

  if (!jesusEnabled) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "visible",
        background: "transparent",
        zIndex: 1,
      }}
    >
      {showBackground && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "#000",
            zIndex: 0,
          }}
        />
      )}

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1,
        }}
      >
        {/* Reposo */}
        <video
          ref={reposoVideoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={() => {
            console.log('[VIDEO] 🎥 Video de REPOSO renderizado - archivo: AvatarVideo.tsx, línea: 243');
            console.log('[VIDEO] 📊 shouldShowAvatar:', shouldShowAvatar);
          }}
          style={{
            display: shouldShowAvatar ? "none" : "block",
            opacity: shouldShowAvatar ? 0 : 1,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "opacity 0.4s",
            transform: `scale(${zoom}) translateY(${offsetY}px)`,
          }}
        >
          <source
            src="https://backend.movilive.es/static/reposo_final_720x1280.mp4"
            type="video/mp4"
          />
        </video>

        {/* Avatar (remoto) */}
        <video
          ref={avatarVideoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={() => {
            console.log('[VIDEO] 🎥 Video WEBRTC (Avatar) renderizado - archivo: AvatarVideo.tsx, línea: 267');
            console.log('[VIDEO] 📊 shouldShowAvatar:', shouldShowAvatar);
            console.log('[VIDEO] 📊 avatarStream:', avatarStream);
          }}
          style={{
            display: shouldShowAvatar ? "block" : "none",
            opacity: shouldShowAvatar ? 1 : 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "opacity 0.25s",
            transform: `scale(${zoom}) translateY(${offsetY}px)`,
          }}
        />
      </div>

      {loading && !error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#000",
            zIndex: 2,
          }}
        >
          <p style={{ color: "white", fontSize: "1rem", fontWeight: 600 }}>
            {language === 'es' ? 'Conectando con Jesús...' :
             language === 'en' ? 'Connecting with Jesus...' :
             language === 'pt' ? 'Conectando com Jesus...' :
             language === 'it' ? 'Connessione con Gesù...' :
             language === 'de' ? 'Verbindung mit Jesus...' :
             'Connexion avec Jésus...'}
          </p>
        </div>
      )}

      {error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "#000",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3,
            textAlign: "center",
            padding: "1rem",
          }}
        >
          <p style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>⚠️ {error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: "#10b981",
              color: "white",
              fontWeight: 600,
              border: "none",
              padding: "0.75rem 1.5rem",
              borderRadius: "999px",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            {language === 'es' ? 'Reintentar' :
             language === 'en' ? 'Retry' :
             language === 'pt' ? 'Tentar novamente' :
             language === 'it' ? 'Riprova' :
             language === 'de' ? 'Erneut versuchen' :
             'Réessayer'}
          </button>
        </div>
      )}
    </div>
  );
}