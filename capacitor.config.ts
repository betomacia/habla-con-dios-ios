import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'es.movilive.hablacondios2',
  appName: 'Habla con Dios',
  webDir: 'dist',
  ios: {
    minVersion: '14.0'
  }
};

export default config;
