import { Device } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';

export class DeviceService {
  private static deviceId: string | null = null;

  static async getDeviceId(): Promise<string> {
    if (this.deviceId) {
      return this.deviceId;
    }

    try {
      if (Capacitor.isNativePlatform()) {
        const platform = Capacitor.getPlatform();
        
        if (platform === 'ios') {
          // Para iOS: usar capacitor-udid que persiste en Keychain
          const { Udid } = await import('capacitor-udid');
          const result = await Udid.getUdid();
          this.deviceId = `ios-${result.value}`;
        } else {
          // Para Android: usar @capacitor/device (ya persiste)
          const info = await Device.getId();
          this.deviceId = `android-${info.identifier}`;
        }
      } else {
        // Web: usar localStorage
        let webId = localStorage.getItem('device_id');
        if (!webId) {
          webId = 'web-' + crypto.randomUUID();
          localStorage.setItem('device_id', webId);
        }
        this.deviceId = webId;
      }
    } catch (error) {
      console.error('[DeviceService] Error getting device ID:', error);
      // Fallback a @capacitor/device con prefijo
      const platform = Capacitor.getPlatform();
      const info = await Device.getId();
      this.deviceId = `${platform}-${info.identifier}`;
    }

    console.log('[DeviceService] Device ID:', this.deviceId);
    return this.deviceId;
  }
}

export const deviceService = DeviceService;