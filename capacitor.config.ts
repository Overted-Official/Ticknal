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
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_launcher_foreground',
      iconColor: '#000000',
    },
  },
};

export default config;
