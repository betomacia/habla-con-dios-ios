import { Capacitor } from '@capacitor/core';

export class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingTimeout: NodeJS.Timeout | null = null;
  private readonly MAX_DURATION = 60000;
  private permissionStream: MediaStream | null = null;

  async startRecording(): Promise<void> {
    try {
      console.log('[AudioRecorder] 🎤 Solicitando permiso de micrófono...');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('API de medios no disponible en este navegador');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      console.log('[AudioRecorder] ✅ Permiso concedido, esperando 300ms para estabilizar...');

      await new Promise(resolve => setTimeout(resolve, 300));

      console.log('[AudioRecorder] ✅ Permiso estabilizado, iniciando grabación...');

      this.audioChunks = [];

      const mimeType = this.getSupportedMimeType();

      const recorderOptions: MediaRecorderOptions = {
        mimeType,
        audioBitsPerSecond: 32000
      };

      console.log('[AudioRecorder] 🎵 Configuración:', recorderOptions);
      this.mediaRecorder = new MediaRecorder(stream, recorderOptions);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('[AudioRecorder] ❌ Error en MediaRecorder:', event);
      };

      this.mediaRecorder.start(100);
      console.log('[AudioRecorder] ✅ Grabación iniciada');

      this.recordingTimeout = setTimeout(() => {
        console.log('[AudioRecorder] ⏱️ Tiempo máximo alcanzado, deteniendo...');
        this.stopRecording();
      }, this.MAX_DURATION);

    } catch (error: any) {
      console.error('[AudioRecorder] ❌ Error iniciando grabación:', error);

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Permiso de micrófono denegado. Por favor, habilita el acceso al micrófono en la configuración de tu navegador.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error('No se encontró ningún micrófono. Por favor, conecta un micrófono y vuelve a intentarlo.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        throw new Error('El micrófono está siendo usado por otra aplicación. Por favor, cierra otras aplicaciones que puedan estar usando el micrófono.');
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        throw new Error('Las restricciones de audio no se pueden satisfacer con el hardware disponible.');
      } else if (error.name === 'SecurityError') {
        throw new Error('Acceso al micrófono bloqueado por razones de seguridad.');
      }

      throw error;
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No hay grabación activa'));
        return;
      }

      if (this.recordingTimeout) {
        clearTimeout(this.recordingTimeout);
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.getSupportedMimeType();
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });

        console.log('[AudioRecorder] 🎵 Audio grabado:');
        console.log(`  - Tamaño: ${(audioBlob.size / 1024).toFixed(2)} KB`);
        console.log(`  - Tipo MIME: ${audioBlob.type}`);
        console.log(`  - Chunks: ${this.audioChunks.length}`);

        // CRÍTICO: Liberar TODOS los recursos de audio
        this.audioChunks = [];

        if (this.mediaRecorder?.stream) {
          const tracks = this.mediaRecorder.stream.getTracks();
          console.log(`[AudioRecorder] 🔊 Liberando ${tracks.length} tracks de audio...`);
          tracks.forEach((track, index) => {
            console.log(`[AudioRecorder]   - Track ${index + 1}: ${track.kind} (${track.label})`);
            track.stop();
          });
          console.log('[AudioRecorder] ✅ Todos los tracks liberados');
        }

        this.mediaRecorder = null;
        console.log('[AudioRecorder] ✅ MediaRecorder = null');

        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  private getSupportedMimeType(): string {
    // Priorizar audio/webm con Opus para Whisper (16kHz optimizado)
    const types = [
      'audio/webm;codecs=opus',  // Preferido para Whisper
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/wav',
      'audio/mp4'
    ];

    console.log('[AudioRecorder] Detectando formato soportado (optimizado para Whisper 16kHz)...');
    for (const type of types) {
      const isSupported = MediaRecorder.isTypeSupported(type);
      console.log(`[AudioRecorder] ${type}: ${isSupported ? '✅' : '❌'}`);
      if (isSupported) {
        console.log(`[AudioRecorder] ✅ Usando formato: ${type}`);
        return type;
      }
    }

    console.warn('[AudioRecorder] ⚠️ Ningún formato detectado, usando audio/webm por defecto');
    return 'audio/webm';
  }

  cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      if (this.mediaRecorder.stream) {
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
    }
    this.audioChunks = [];
    this.mediaRecorder = null;
    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout);
    }
  }

  isRecording(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
  }

  static isAndroid(): boolean {
    return Capacitor.getPlatform() === 'android';
  }

  async checkPermissions(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('[AudioRecorder] ❌ API de medios no disponible');
        return false;
      }

      console.log('[AudioRecorder] 🔍 Verificando permisos de micrófono...');

      if (this.permissionStream) {
        console.log('[AudioRecorder] ✅ Ya hay un stream activo con permisos');
        return true;
      }

      this.permissionStream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      console.log('[AudioRecorder] ✅ Permisos verificados correctamente');

      this.permissionStream.getTracks().forEach(track => track.stop());
      this.permissionStream = null;

      return true;
    } catch (error: any) {
      console.error('[AudioRecorder] ❌ Error verificando permisos:', error);

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        console.error('[AudioRecorder] ❌ Permiso de micrófono denegado por el usuario');
      } else if (error.name === 'NotFoundError') {
        console.error('[AudioRecorder] ❌ No se encontró ningún dispositivo de micrófono');
      } else if (error.name === 'NotReadableError') {
        console.error('[AudioRecorder] ❌ El micrófono está siendo usado por otra aplicación');
      }

      return false;
    }
  }
}
