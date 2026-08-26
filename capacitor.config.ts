import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.quantegx.app',
  appName: 'QuantEGX',
  webDir: 'public',
  server: {
    url: 'https://quantegx.vercel.app',
    androidScheme: 'https',
    cleartext: true,
  },
};

export default config;
