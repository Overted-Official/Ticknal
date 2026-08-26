import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token, type ActionPerformed, type PushNotificationSchema } from '@capacitor/push-notifications';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Browser } from '@capacitor/browser';
import { createClient } from '@/lib/supabase/client';

export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  return Capacitor.isNativePlatform();
}

/**
 * Initializes native Android/iOS features when running inside the APK container.
 * This function does nothing if running in a normal web browser or standard PWA.
 */
export async function initNativeBridge(options?: {
  onNavigate?: (url: string) => void;
  userId?: string;
}): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    // 1. Configure Dark Status Bar to match QuantEGX dark theme
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#000000' });
    } catch (e) {
      console.debug('StatusBar configuration not supported in current environment', e);
    }

    // 2. Configure Hardware Back Button
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });

    // 3. Handle App URL Open (OAuth Redirects & Deep Links)
    App.addListener('appUrlOpen', async (event) => {
      console.log('App received URL scheme event:', event.url);
      try {
        await Browser.close();
      } catch (e) {}

      if (event.url) {
        // Handle OAuth callback tokens or query
        if (event.url.includes('auth/callback') || event.url.includes('code=') || event.url.includes('access_token=')) {
          const supabase = createClient();
          const cleanUrl = event.url.replace('com.quantegx.app://', 'https://quantegx.vercel.app/');
          
          try {
            const urlObj = new URL(cleanUrl);
            const code = urlObj.searchParams.get('code');
            if (code) {
              await supabase.auth.exchangeCodeForSession(code);
            }

            const hash = urlObj.hash ? urlObj.hash.substring(1) : '';
            const hashParams = new URLSearchParams(hash);
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            if (accessToken && refreshToken) {
              await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            }
          } catch (err) {
            console.error('Error handling OAuth callback in app:', err);
          }

          // Force page reload to dashboard so session cookies/state initialize
          window.location.href = '/dashboard';
          return;
        }

        // Handle general deep link
        const targetPath = event.url.replace('com.quantegx.app://', '/');
        if (options?.onNavigate) {
          options.onNavigate(targetPath);
        } else {
          window.location.href = targetPath;
        }
      }
    });

    // 4. Initialize Native Push Notifications
    await setupNativePushNotifications(options?.onNavigate, options?.userId);
  } catch (error) {
    console.error('Failed to initialize native bridge:', error);
  }
}

async function setupNativePushNotifications(
  onNavigate?: (url: string) => void,
  userId?: string
): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('Native push notifications permission not granted:', permStatus.receive);
      return;
    }

    // Register with Apple / Google APNs/FCM
    await PushNotifications.register();

    // Listen for registration token
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('Native Push Registration Token:', token.value);
      try {
        await fetch('/api/notifications/register-device', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: token.value,
            platform: Capacitor.getPlatform(),
            userId: userId ?? null,
          }),
        });
      } catch (err) {
        console.error('Failed to save device token on server:', err);
      }
    });

    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Native Push registration error:', error);
    });

    // Listen for incoming notifications when app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push notification received in foreground:', notification);
      triggerNativeHaptic('medium');
    });

    // Deep link when user taps on a notification
    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      const data = notification.notification.data;
      const targetUrl = data?.url || (data?.ticker ? `/invest?ticker=${data.ticker}&view=chart` : null);

      if (targetUrl) {
        if (onNavigate) {
          onNavigate(targetUrl);
        } else if (typeof window !== 'undefined') {
          window.location.href = targetUrl;
        }
      }
    });
  } catch (error) {
    console.error('Error during native push notification setup:', error);
  }
}

export async function triggerNativeHaptic(
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'
): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    switch (type) {
      case 'light':
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'medium':
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'heavy':
        await Haptics.impact({ style: ImpactStyle.Heavy });
        break;
      case 'success':
        await Haptics.notification({ type: NotificationType.Success });
        break;
      case 'warning':
        await Haptics.notification({ type: NotificationType.Warning });
        break;
      case 'error':
        await Haptics.notification({ type: NotificationType.Error });
        break;
    }
  } catch (e) {
    // Haptics unavailable on emulator or unsupported hardware
  }
}
