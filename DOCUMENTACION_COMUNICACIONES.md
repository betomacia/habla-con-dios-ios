# 📡 DOCUMENTACIÓN COMPLETA DE COMUNICACIONES FRONTEND

## RESUMEN EJECUTIVO

El frontend se comunica con **4 servidores principales**:

1. **backend.movilive.es** - Backend OpenAI (HTTP REST)
2. **voz.movilive.es** - Servidor TTS Audio (WebSocket)
3. **avoz.movilive.es** - Servidor TTS + Avatar (HTTP REST)
4. **avatar.movilive.es** - Servidor Video Avatar (WebRTC + HTTP)

---

## 1️⃣ BACKEND.MOVILIVE.ES (Backend OpenAI)

### Descripción
Backend principal que procesa todas las consultas con OpenAI GPT-4, maneja autenticación, suscripciones y créditos.

### Endpoints

#### 📍 POST /api/welcome
**Propósito:** Obtener mensaje de bienvenida personalizado

**Archivo:** `src/services/WelcomeService.ts` (líneas 25-34)

```typescript
const response = await fetch(`${this.baseUrl}/api/welcome`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    lang: language,        // "es" | "en" | "pt" | "it" | "de" | "fr"
    name: string,          // Nombre del usuario
    gender: string,        // "male" | "female"
    hour: number,          // new Date().getHours()
  }),
});

const data = await response.json();
```

**Respuesta:**
```json
{
  "message": "Buenos días, Juan. Es un placer saludarte...",
  "response": "...",
  "bible": {
    "text": "Porque de tal manera amó Dios...",
    "ref": "Juan 3:16"
  },
  "question": "¿En qué puedo ayudarte hoy?",
  "sessionId": "session-1234567890"
}
```

---

#### 📍 POST /api/ask
**Propósito:** Enviar pregunta de usuario y recibir respuesta de GPT-4

**Archivo:** `src/Chat.tsx` (líneas 436-447)

```typescript
const r = await fetch(`${backendUrl}/api/ask`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "omit",
  body: JSON.stringify({
    message: userText,         // Pregunta del usuario
    lang: lang,                // Idioma actual
    sessionId: sessionId,      // ID de sesión
    name: userName,            // Nombre del usuario
    gender: userGender,        // Género del usuario
    mode: currentMode,         // "chat" | "audio" | "video" | "video-chat"
  }),
});

const data = await r.json();
```

**Respuesta:**
```json
{
  "message": "Respuesta de Jesús con amor y sabiduría...",
  "question": "Pregunta original del usuario",
  "bible": {
    "text": "Texto bíblico relacionado",
    "ref": "Libro Capítulo:Versículo"
  }
}
```

**Uso:**
- Modo Chat: Envía texto escrito
- Modo Audio: Envía texto transcrito por Speech Recognition nativo
- **NUEVO Android Whisper:** Usará `/api/transcribe` en lugar de `/api/ask`

---

#### 📍 POST /api/transcribe (PENDIENTE IMPLEMENTAR)
**Propósito:** Transcribir audio con Whisper + procesar con GPT en un solo request

**Archivo:** `src/services/TranscriptionService.ts` (líneas 20-40)

```typescript
const formData = new FormData();
const audioFile = new File([audioBlob], `audio.webm`, { type: audioBlob.type });

formData.append('audio', audioFile);
formData.append('lang', language);
formData.append('mode', mode);
formData.append('history', JSON.stringify(history));
formData.append('sessionId', sessionId);
formData.append('name', name);
formData.append('gender', gender);

const response = await fetch(`${BACKEND_URL}/api/transcribe`, {
  method: 'POST',
  body: formData  // ⚠️ NO enviar Content-Type, FormData lo maneja
});

const result = await response.json();
```

**Respuesta esperada:**
```json
{
  "message": "Respuesta de Jesús...",
  "question": "Transcripción del audio del usuario",
  "bible": {
    "text": "Texto bíblico",
    "ref": "Referencia"
  },
  "followUpQuestion": "¿Qué más te gustaría compartir?"
}
```

**IMPORTANTE:** El backend debe incluir:
- `question`: Transcripción del audio (para mostrar como mensaje del usuario)
- `followUpQuestion`: Pregunta de seguimiento (para incluir en respuesta del asistente)

Campos alternativos aceptados para pregunta de seguimiento:
- `followUpQuestion` (recomendado)
- `nextQuestion`
- `follow_up_question`
- `followup_question`

**Flujo interno del backend:**
1. Recibe audio → Whisper API → transcripción
2. Transcripción → GPT-4 con historial → respuesta
3. Distribución según mode:
   - `chat`: Solo retorna texto
   - `audio`: Envía a voz.movilive.es
   - `video`: Envía a avoz.movilive.es
   - `video-chat`: Envía a avoz.movilive.es

---

## 2️⃣ VOZ.MOVILIVE.ES (Servidor TTS Audio)

### Descripción
Servidor WebSocket que recibe texto y streaming de audio PCM16 en tiempo real.

### Conexión WebSocket

**Archivo:** `src/App.tsx` (líneas 418-503)

#### URL de conexión:
```
wss://voz.movilive.es/ws/synthesize
```

#### Clase TTSWSClient

```typescript
class TTSWSClient {
  private url = "wss://voz.movilive.es/ws/synthesize";
  private ws: WebSocket | null = null;

  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      console.log("[WS] Conexión establecida");
    };

    this.ws.onmessage = async (ev) => {
      if (ev.data instanceof ArrayBuffer) {
        // Audio PCM16 recibido
        const pcm16 = new Int16Array(ev.data);
        await this.player.enqueuePCM16(pcm16, channels, sampleRate);
      } else {
        // Mensaje de control JSON
        const data = JSON.parse(ev.data);
        if (data.type === "start") {
          // Formato: { type: "start", sample_rate: 24000, channels: 1 }
        } else if (data.type === "end") {
          // Audio completado
        }
      }
    };
  }

  synthesize(payload: { text: string; lang: Language; sessionId: string }) {
    const msg = {
      text: payload.text,
      voice_id: "jesus_default",
      speed: 1.0,
      lang: payload.lang,
      sessionId: payload.sessionId,
    };
    this.ws.send(JSON.stringify(msg));
  }
}
```

#### Envío de mensaje (Chat.tsx líneas 867-897)

```typescript
const payload = {
  text: first,              // Texto a sintetizar
  lang: lang,               // Idioma
  route: "audio_on",        // Modo audio
  sessionId: sessionId,     // ID de sesión
};
ttsChannel.send(JSON.stringify(payload));
```

**Formato de audio recibido:**
- Tipo: PCM16 (Int16Array)
- Sample Rate: 24000 Hz (configurable)
- Canales: 1 (mono)
- Formato: ArrayBuffer

**Reproducción:**
El frontend usa `AudioQueuePlayer` (líneas 346-413) para:
1. Recibir chunks PCM16
2. Resamplear a sample rate del navegador
3. Programar reproducción con Web Audio API
4. Reproducir en streaming sin esperar archivo completo

---

## 3️⃣ AVOZ.MOVILIVE.ES (Servidor TTS + Avatar)

### Descripción
Servidor HTTP que recibe texto y lo envía DIRECTAMENTE al servidor de avatar a través del canal WebRTC ya establecido.

### Endpoint

#### 📍 POST /synthesize_to_livetalking
**Propósito:** Sintetizar voz y enviarla al avatar en tiempo real

**Archivo:** `src/Chat.tsx` (líneas 370-456)

```typescript
async function sendToLiveTalking(text: string, lang: Language, sessionId: number) {
  const response = await fetch(`${AVOZ_URL}/synthesize_to_livetalking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: text,            // Texto a sintetizar
      lang: lang,            // Idioma ("es", "en", etc)
      sessionid: sessionId   // ⚠️ IMPORTANTE: ID de sesión WebRTC
    }),
  });

  if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
  }

  const data = await response.json();
  return data;
}
```

**Request Body:**
```json
{
  "text": "Hola Juan, me alegra que me preguntes...",
  "lang": "es",
  "sessionid": 1234567890
}
```

**Response:**
```json
{
  "status": "success",
  "duration": 3500
}
```

**Flujo interno:**
1. Backend recibe texto
2. Sintetiza con XTTS
3. Envía audio directamente al canal WebRTC del avatar (usando sessionid)
4. Avatar recibe audio y lo reproduce con sincronización labial

**⚠️ CRÍTICO:**
- El `sessionid` debe ser el mismo que se obtuvo al negociar WebRTC con avatar.movilive.es
- Si el sessionid es inválido o la conexión WebRTC se cerró, retorna error 500

---

## 4️⃣ AVATAR.MOVILIVE.ES (Servidor Video Avatar)

### Descripción
Servidor WebRTC que transmite video del avatar con sincronización labial.

### Endpoints

#### 📍 POST /offer
**Propósito:** Negociar conexión WebRTC (SDP Offer/Answer)

**Archivo:** `src/App.tsx` (líneas 1067-1108)

```typescript
async function negotiateAvatarPC(pc: RTCPeerConnection) {
  // 1. Crear oferta local
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // 2. Enviar oferta al servidor
  const r = await fetch("https://avatar.movilive.es/offer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sdp: offer.sdp,
      type: offer.type  // "offer"
    }),
  });

  // 3. Recibir respuesta del servidor
  const data = await r.json();
  // { type: "answer", sdp: "...", sessionid: 1234567890 }

  // 4. Establecer respuesta remota
  await pc.setRemoteDescription(
    new RTCSessionDescription({
      type: data.type,
      sdp: data.sdp
    })
  );

  return data.sessionid;
}
```

**Request:**
```json
{
  "sdp": "v=0\r\no=- 123456789 2 IN IP4...",
  "type": "offer"
}
```

**Response:**
```json
{
  "type": "answer",
  "sdp": "v=0\r\no=- 987654321 2 IN IP4...",
  "sessionid": 1234567890
}
```

---

#### 📍 /videostream (Alternativo)
**Propósito:** Endpoint alternativo si /offer falla

**Archivo:** `src/App.tsx` (líneas 23-26)

```typescript
const AVATAR_OFFER_URLS = [
  "https://avatar.movilive.es/offer",
  "https://avatar.movilive.es/videostream",  // Fallback
];
```

**Uso:** El sistema intenta `/offer` primero. Si falla, intenta `/videostream` con el mismo formato.

---

### Configuración WebRTC

**Archivo:** `src/App.tsx` (líneas 1110-1200)

```typescript
const startAvatarWebRTC = async (): Promise<number | null> => {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
    bundlePolicy: "max-bundle",
  });

  // Recibir audio y video
  pc.addTransceiver("audio", { direction: "recvonly" });
  pc.addTransceiver("video", { direction: "recvonly" });

  // Manejar tracks recibidos
  pc.ontrack = (event) => {
    console.log("[Avatar] Track recibido:", event.track.kind);
    if (event.streams && event.streams[0]) {
      avatarStreamRef.current = event.streams[0];
      setHasAvatarStream(true);

      // Asignar al elemento <video>
      const vid = document.getElementById("avatar-video") as HTMLVideoElement;
      vid.srcObject = event.streams[0];
      vid.play();
    }
  };

  // Negociar
  const sessionId = await negotiateAvatarPC(pc);
  return sessionId;
};
```

**MediaStream recibido:**
- Video: 720x1280 (portrait)
- Audio: Sincronizado con movimiento labial
- Codec: Depende del navegador (VP8/VP9/H.264)

---

### Renderizado del Video

**Archivo:** `src/components/AvatarVideo.tsx` (líneas 262-276)

```typescript
<video
  ref={avatarVideoRef}
  autoPlay
  playsInline
  style={{
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: `scale(${zoom}) translateY(${offsetY}px)`,
  }}
/>
```

**Video de reposo (cuando no hay audio):**
```typescript
<video
  src="https://backend.movilive.es/static/reposo_final_720x1280.mp4"
  autoPlay
  loop
  muted
  playsInline
/>
```

---

## 📊 DIAGRAMA DE FLUJOS

### Flujo 1: Modo Chat (Solo texto)
```
Usuario escribe → /api/ask → GPT-4 → Respuesta texto
```

### Flujo 2: Modo Audio (Voz sin video)
```
Usuario habla → Speech Recognition → /api/ask → GPT-4
  → Respuesta texto → voz.movilive.es (WebSocket)
  → Audio PCM16 streaming → Reproducción
```

### Flujo 3: Modo Video (Video sin chat)
```
[Inicio]
1. Frontend → avatar.movilive.es/offer → Negociación WebRTC
2. Backend → sessionid=1234567890
3. Frontend recibe MediaStream (video + audio)

[Al hacer pregunta]
Usuario habla → Speech Recognition → /api/ask → GPT-4
  → Respuesta texto → avoz.movilive.es/synthesize_to_livetalking
  → Backend sintetiza + envía a WebRTC → Avatar habla con sincronización labial
```

### Flujo 4: Modo Video-Chat (Video + Chat habilitado)
```
Igual que Modo Video, pero con chat visible para escribir
```

### Flujo 5: Android con Whisper (NUEVO - PENDIENTE)
```
Usuario habla → MediaRecorder (webm) → /api/transcribe
  → Backend: Whisper + GPT-4 + Distribución
  → Respuesta según mode (texto/audio/video)
```

---

## 🔐 AUTENTICACIÓN Y CRÉDITOS

Todos los endpoints de backend.movilive.es usan `deviceId` para identificar al usuario:

**Archivo:** `src/services/SubscriptionService.ts`

```typescript
// Obtener suscripción actual
GET /api/subscription/{deviceId}

// Crear usuario nuevo
POST /api/users
Body: { device_id, name, gender, language }

// Consumir créditos
POST /api/credits/consume
Body: { device_id, credits, mode }
```

---

## 🎯 RESUMEN DE PUERTOS Y PROTOCOLOS

| Servidor | Puerto | Protocolo | Propósito |
|----------|--------|-----------|-----------|
| backend.movilive.es | 443 (HTTPS) | HTTP REST | OpenAI GPT-4, autenticación, créditos |
| voz.movilive.es | 443 (WSS) | WebSocket | Streaming audio TTS |
| avoz.movilive.es | 443 (HTTPS) | HTTP REST | TTS + envío a avatar |
| avatar.movilive.es | 443 (HTTPS) | WebRTC + HTTP | Video avatar en tiempo real |

---

## 🚀 PRÓXIMOS PASOS: Integración Whisper

### Backend necesita implementar:

```python
@app.post("/api/transcribe")
async def transcribe_audio(
    audio: UploadFile,
    lang: str = Form(...),
    mode: str = Form(...),
    history: str = Form(...),
    sessionId: str = Form(...),
    name: str = Form(...),
    gender: str = Form(...)
):
    # 1. Recibir audio
    audio_bytes = await audio.read()

    # 2. Transcribir con Whisper
    transcript = openai.Audio.transcribe(
        model="whisper-1",
        file=audio_bytes,
        language=lang
    )

    # 3. Procesar con GPT-4 (igual que /api/ask)
    response = await process_with_gpt(
        message=transcript.text,
        history=json.loads(history),
        lang=lang,
        name=name,
        gender=gender
    )

    # 4. Distribuir según mode
    if mode == "video" or mode == "video-chat":
        # Enviar a avoz.movilive.es
        await synthesize_to_livetalking(response["message"], lang, sessionId)
    elif mode == "audio":
        # Enviar a voz.movilive.es (o retornar audio)
        pass

    # 5. Retornar respuesta
    return {
        "message": response["message"],
        "question": transcript.text,
        "bible": response["bible"]
    }
```

---

## 📝 NOTAS IMPORTANTES

1. **SessionId crítico:** El sessionId de WebRTC debe mantenerse en sincronía entre:
   - Frontend (livetalkSessionId)
   - Avatar.movilive.es (conexión WebRTC)
   - Avoz.movilive.es (para enviar audio)

2. **Reconexión automática:**
   - voz.movilive.es (WebSocket): Se reconecta automáticamente cada 1.5s
   - avatar.movilive.es (WebRTC): Se reconecta manualmente con retry

3. **Detección de inactividad:**
   - 5 minutos sin interacción → Cierra WebRTC para ahorrar créditos
   - Modal blanco avisa al usuario

4. **Créditos:**
   - Se consumen DESPUÉS de que el audio termina de reproducirse
   - Chat: 1 crédito, Audio: 2 créditos, Video: 4 créditos, Video-Chat: 4 créditos

---

**Fecha:** 2025-01-23
**Versión:** 1.0
**Actualizado por:** Sistema de documentación automática
