import { Device } from '@capacitor/device';
import { AuthService } from './AuthService';

interface VersionCheckResponse {
  isSupported: boolean;
  forceUpdate: boolean;
  updateAvailable: boolean;
  currentVersion: string;
  minimumRequired: string;
  latestVersion: string;
  updateMessage: string;
  releaseNotes: string;
  storeUrl: string;
}

export class VersionService {
  private static APP_VERSION = '1.0.0';
  private static BUILD_NUMBER = 1;

  static async checkVersion(language: string = 'es', deviceId?: string): Promise<VersionCheckResponse | null> {
    try {
      const info = await Device.getInfo();
      const platform = info.platform === 'ios' ? 'ios' :
                       info.platform === 'android' ? 'android' : 'web';

      console.log('[VersionService] 🔍 Verificando versión:', {
        platform,
        currentVersion: this.APP_VERSION,
        buildNumber: this.BUILD_NUMBER
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (deviceId) {
        const token = await AuthService.getToken(deviceId);
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`https://backend.movilive.es/api/version/check?lang=${language}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          currentVersion: this.APP_VERSION,
          platform: platform,
          buildNumber: this.BUILD_NUMBER
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn('[VersionService] ⚠️ Error HTTP:', response.status, '- La app continuará normalmente');
        return null;
      }

      const data = await response.json();
      console.log('[VersionService] ✅ Respuesta:', data);

      return data;
    } catch (error) {
      console.warn('[VersionService] ⚠️ No se pudo verificar versión:', error instanceof Error ? error.message : error, '- La app continuará normalmente');
      return null;
    }
  }
}

export const versionService = VersionService;
