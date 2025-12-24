import { AuthService } from './AuthService';

const BACKEND_URL = 'https://backend.movilive.es';

export interface TranscriptionResponse {
  message: string;                    // Respuesta de Jesús
  transcription?: string;             // Transcripción del audio del usuario (alternativo)
  question?: string;                  // Transcripción del usuario (campo principal)
  role?: 'user' | 'assistant';
  bible?: {
    text: string;
    ref: string;
  };
  // Pregunta de seguimiento puede venir en cualquiera de estos campos:
  followUpQuestion?: string;          // camelCase
  nextQuestion?: string;              // alternativo camelCase
  follow_up_question?: string;        // snake_case
  followup_question?: string;         // sin guión
  // Campo genérico para cualquier otra estructura
  [key: string]: any;
}

export class TranscriptionService {
  async transcribe(
    audioBlob: Blob,
    language: string,
    mode: string,
    sessionId: string,
    deviceId: string
  ): Promise<TranscriptionResponse> {
    try {
      console.log('[Transcription] 📤 Preparando audio para envío:');
      console.log(`  - Tamaño: ${(audioBlob.size / 1024).toFixed(2)} KB`);
      console.log(`  - Tipo MIME original: ${audioBlob.type}`);
      console.log(`  - SessionId recibido: ${sessionId} (tipo: ${typeof sessionId})`);
      console.log(`  - Mode: ${mode}`);
      console.log(`  - CRÍTICO: Este sessionId debe coincidir con WebRTC en modo video`);

      const formData = new FormData();

      // Normalizar el tipo MIME si está vacío o es desconocido
      let mimeType = audioBlob.type || 'audio/webm';
      if (!this.isValidMimeType(mimeType)) {
        console.warn(`[Transcription] ⚠️ Tipo MIME no válido: ${mimeType}, usando audio/webm`);
        mimeType = 'audio/webm';
      }

      const extension = this.getExtensionFromMimeType(mimeType);
      const audioFile = new File([audioBlob], `recording.${extension}`, {
        type: mimeType
      });

      console.log(`[Transcription] 📂 Archivo creado: recording.${extension} (${mimeType})`);

      formData.append('audio', audioFile);
      formData.append('sessionId', String(sessionId));
      formData.append('lang', language);
      formData.append('mode', mode);
      formData.append('deviceId', deviceId);

      console.log(`[Transcription] 🚀 Enviando a /api/transcribe con sessionId: ${sessionId} y deviceId: ${deviceId}`);

      const token = await AuthService.getToken(deviceId);
      const response = await fetch(`${BACKEND_URL}/api/transcribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Error en transcripción:', error);
      throw error;
    }
  }

  private isValidMimeType(mimeType: string): boolean {
    const validTypes = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/ogg',
      'audio/ogg;codecs=opus',
      'audio/wav',
      'audio/mp4',
      'audio/mpeg',
      'audio/mp3'
    ];
    return validTypes.some(type => mimeType.startsWith(type));
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const map: Record<string, string> = {
      'audio/webm': 'webm',
      'audio/webm;codecs=opus': 'webm',
      'audio/ogg;codecs=opus': 'ogg',
      'audio/ogg': 'ogg',
      'audio/mp4': 'm4a',
      'audio/wav': 'wav',
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3'
    };

    // Buscar coincidencia exacta primero
    if (map[mimeType]) {
      return map[mimeType];
    }

    // Buscar coincidencia parcial
    for (const key in map) {
      if (mimeType.startsWith(key)) {
        return map[key];
      }
    }

    return 'webm';
  }
}
