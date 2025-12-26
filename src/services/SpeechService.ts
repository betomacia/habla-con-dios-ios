import { SpeechRecognition } from '@capacitor-community/speech-recognition';

class SpeechService {
  private isListening = false;

  async isAvailable(): Promise<boolean> {
    try {
      const { available } = await SpeechRecognition.available();
      return available;
    } catch (error) {
      console.error('[SpeechService] Error verificando disponibilidad:', error);
      return false;
    }
  }

  async checkPermissions(): Promise<boolean> {
    try {
      const { available } = await SpeechRecognition.available();
      if (!available) {
        console.error('[SpeechService] Reconocimiento de voz no disponible');
        return false;
      }

      const { permission } = await SpeechRecognition.checkPermissions();
      if (permission === 'granted') return true;

      console.log('[SpeechService] Solicitando permisos...');
      const result = await SpeechRecognition.requestPermissions();
      return result.permission === 'granted';
    } catch (error) {
      console.error('[SpeechService] Error verificando permisos:', error);
      return false;
    }
  }

  async startListening(
    language: string,
    onResult: (text: string, isFinal: boolean) => void,
    onError?: (error: string) => void
  ): Promise<void> {
    try {
      console.log('[SpeechService] 🎤 Iniciando reconocimiento...', language);

      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        onError?.('Permiso de micrófono denegado');
        return;
      }

      this.isListening = true;

      await SpeechRecognition.addListener('partialResults', (data: any) => {
        console.log('[SpeechService] Resultado parcial:', data);
        if (data.matches && data.matches.length > 0) {
          onResult(data.matches[0], false);
        }
      });

      await SpeechRecognition.start({
        language,
        maxResults: 1,
        prompt: '',
        partialResults: true,
        popup: false
      });

      console.log('[SpeechService] ✅ Reconocimiento iniciado');

    } catch (error: any) {
      console.error('[SpeechService] ❌ Error:', error);
      this.isListening = false;
      onError?.(error.message || 'Error en reconocimiento');
    }
  }

  async stopListening(): Promise<void> {
    if (!this.isListening) return;

    try {
      console.log('[SpeechService] 🛑 Deteniendo reconocimiento...');
      await SpeechRecognition.stop();
      await SpeechRecognition.removeAllListeners();
      this.isListening = false;
      console.log('[SpeechService] ✅ Detenido');
    } catch (error) {
      console.error('[SpeechService] Error al detener:', error);
      this.isListening = false;
    }
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }
}

export const SpeechRecognitionService = new SpeechService();
export { SpeechService };
