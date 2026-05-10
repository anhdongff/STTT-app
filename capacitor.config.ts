import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sttt.app',
  appName: 'STTT',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true,
    allowNavigation: ['192.168.0.100']
  },
  loggingBehavior: 'none',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
