import React, { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  /** 0.0 = sin zoom, 0.15 = 15% */
  zoom?: number;
  /** en px, desplaza hacia arriba manteniendo base visible */
  panUpPx?: number;
  /** mostrar o no el video (p.ej. solo cuando “Video” está activado) */
  visible: boolean;
};

export default function RestBackgroundVideo({ src, zoom = 0.12, panUpPx = 40, visible }: Props) {
  const vref = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const v = vref.current;
    if (!v) return;

    const onCanPlay = () => {
      // intentar reproducir apenas pueda (autoplay necesita muted)
      const p = v.play();
      if (p && typeof p.then === "function") {
        p.catch((e: any) => {
          console.warn("[REST] autoplay bloqueado, intentando tras un user-gesture:", e?.message || e);
        });
      }
    };

    const onError = () => {
      const mediaErr = v.error;
      const code = mediaErr?.code ?? 0;
      const msg =
        code === 1 ? "ABORTED" :
        code === 2 ? "NETWORK" :
        code === 3 ? "DECODE" :
        code === 4 ? "SRC_NOT_SUPPORTED" : "UNKNOWN";
      console.error("[REST] carga fallida:", msg, mediaErr);
      setError(`Carga fallida: ${msg}`);
    };

    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("error", onError);
    return () => {
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("error", onError);
    };
  }, [src]);

  // si no debe ser visible, ni lo pintamos (evita toques en móviles)
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        overflow: "hidden",
      }}
    >
      <video
        ref={vref}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute left-1/2 top-1/2 -translate-x-1/2"
        style={{
          // 9:16 a pantalla completa
          height: "100vh",
          aspectRatio: "9 / 16",
          objectFit: "cover",
          // zoom y paneo hacia arriba manteniendo base:
          transform: `translate(-50%, -50%) scale(${1 + zoom}) translateY(-${panUpPx}px)`,
        }}
      />
      {/* overlay sutil para unificar contraste */}
      <div className="absolute inset-0 bg-black/10" />
      {/* si falla, mostramos una banda discreta arriba (no tapa chat) */}
      {error && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-600/90 text-white text-xs px-3 py-1 rounded-full z-10">
          {error}
        </div>
      )}
    </div>
  );
}
