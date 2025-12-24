import type { ConversationMode } from './types';

interface ReleaseResourcesPayload {
  visitorId: string;
  visitorSessionId: string;
  releaseL4?: boolean;
  releaseT4Avatar?: boolean;
  releaseT4Chat?: boolean;
}

export class AvatarResourceService {
  private backendUrl: string;

  constructor(backendUrl: string) {
    this.backendUrl = backendUrl;
  }

  private async releaseResources(payload: ReleaseResourcesPayload): Promise<void> {
    try {
      console.log('[AvatarResource] 🔓 Liberando recursos:', payload);

      fetch(`${this.backendUrl}/api/avatar/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(error => {
        console.error('[AvatarResource] ⚠️ Error liberando recursos (ignorado):', error);
      });

      console.log('[AvatarResource] ✅ Solicitud de liberación enviada (fire-and-forget)');
    } catch (error) {
      console.error('[AvatarResource] ❌ Error en releaseResources:', error);
    }
  }

  async releaseVideoResources(deviceId: string, sessionId: string): Promise<void> {
    console.log('[AvatarResource] 📹 Liberando recursos de VIDEO/VIDEO-CHAT');
    await this.releaseResources({
      visitorId: deviceId,
      visitorSessionId: sessionId,
      releaseL4: true,
      releaseT4Avatar: true,
    });
  }

  async releaseChatAudioResources(deviceId: string, sessionId: string): Promise<void> {
    console.log('[AvatarResource] 🎤 Liberando recursos de CHAT-AUDIO');
    await this.releaseResources({
      visitorId: deviceId,
      visitorSessionId: sessionId,
      releaseT4Chat: true,
    });
  }

  async releaseAllResourcesForMode(mode: ConversationMode, deviceId: string, sessionId: string): Promise<void> {
    console.log('[AvatarResource] 🧹 Liberando recursos para modo:', mode);

    switch (mode) {
      case 'video':
      case 'video-chat':
        await this.releaseVideoResources(deviceId, sessionId);
        break;
      case 'chat-audio':
        await this.releaseChatAudioResources(deviceId, sessionId);
        break;
      case 'chat':
        console.log('[AvatarResource] ℹ️ Modo chat no requiere liberación de recursos');
        break;
      default:
        console.warn('[AvatarResource] ⚠️ Modo desconocido:', mode);
    }
  }
}
