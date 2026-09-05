import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token, type ActionPerformed, type PushNotificationSchema } from '@capacitor/push-notifications';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Browser } from '@capacitor/browser';
import { LocalNotifications } from '@capacitor/local-notifications';
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
      await StatusBar.setOverlaysWebView({ overlay: false });
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

      // Always close the Chrome Custom Tab first
      try {
        await Browser.close();
      } catch (e) {
        // Browser may already be closed
      }

      if (!event.url) return;

      // Handle OAuth callback (Supabase sends tokens via hash fragment or code via query)
      if (event.url.includes('auth/callback') || event.url.includes('access_token') || event.url.includes('code=')) {
        const supabase = createClient();

        try {
          // Replace custom scheme with https to make URL parsing work
          const parsableUrl = event.url
            .replace('com.ticknal.app://', 'https://placeholder/')
            .replace('com.quantegx.app://', 'https://placeholder/');
          const urlObj = new URL(parsableUrl);

          // Check for hash fragment tokens (implicit flow)
          const hash = urlObj.hash ? urlObj.hash.substring(1) : '';
          if (hash) {
            const hashParams = new URLSearchParams(hash);
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            if (accessToken && refreshToken) {
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (error) console.error('setSession error:', error);
            }
          }

          // Check for authorization code (PKCE flow)
          const code = urlObj.searchParams.get('code');
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) console.error('exchangeCodeForSession error:', error);
          }
        } catch (err) {
          console.error('Error handling OAuth callback in app:', err);
        }

        // Navigate to dashboard inside the WebView
        window.location.href = '/dashboard';
        return;
      }

      // Handle general deep links
      const targetPath = event.url
        .replace('com.ticknal.app://', '/')
        .replace('com.quantegx.app://', '/');
      if (options?.onNavigate) {
        options.onNavigate(targetPath);
      } else {
        window.location.href = targetPath;
      }
    });

    // 4. Initialize Native Push Notifications (FCM)
    await setupNativePushNotifications(options?.onNavigate, options?.userId);
  } catch (error) {
    console.error('Failed to initialize native bridge:', error);
  }
}

export async function requestNativePushPermission(userId?: string): Promise<{ success: boolean; error?: string }> {
  if (!isNativePlatform()) return { success: false, error: 'Not native platform' };

  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive === 'granted') {
      await PushNotifications.register();
      return { success: true };
    }
    return { success: false, error: 'Push notification permission was denied.' };
  } catch (err: any) {
    console.error('Error requesting native push permission:', err);
    return { success: false, error: err?.message || 'Failed to request native notification permission.' };
  }
}

async function setupNativePushNotifications(
  onNavigate?: (url: string) => void,
  userId?: string
): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('Native FCM Registration Token:', token.value);
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

    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push notification received in foreground:', notification);
      triggerNativeHaptic('medium');
    });

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

    const perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'granted') {
      await PushNotifications.register();
    }
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

export async function triggerNativeTestNotification(title?: string, body?: string): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          title: title || '🟢 QuantEGX Signal Test',
          body: body || 'Test Alert: BUY Signal triggered for COMI at 84.50 EGP.',
          id: Math.floor(Math.random() * 100000),
          schedule: { at: new Date(Date.now() + 500) },
          sound: undefined,
          actionTypeId: '',
          extra: {
            url: '/invest?ticker=COMI.CA&view=chart',
          },
        },
      ],
    });
    await triggerNativeHaptic('heavy');
  } catch (err) {
    console.error('Failed to schedule local test notification:', err);
  }
}

