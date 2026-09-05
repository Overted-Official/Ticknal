import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ticknal.app',
  appName: 'Ticknal',
  webDir: 'public',
  server: {
    url: 'https://ticknal.vercel.app',
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
