'use client';

import { useEffect } from 'react';
import { isNativePlatform, initNativeBridge } from '@/lib/native/capacitor-bridge';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function NativeBridgeProvider() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativePlatform()) return;

    const supabase = createClient();

    const setupBridge = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        await initNativeBridge({
          userId: user?.id,
          onNavigate: (url) => {
            if (url.startsWith('http://') || url.startsWith('https://')) {
              window.location.href = url;
            } else {
              router.push(url);
            }
          },
        });
      } catch (err) {
        console.error('Error initializing native bridge with auth:', err);
      }
    };

    setupBridge();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user?.id) {
        try {
          await initNativeBridge({
            userId: session.user.id,
            onNavigate: (url) => {
              if (url.startsWith('http://') || url.startsWith('https://')) {
                window.location.href = url;
              } else {
                router.push(url);
              }
            },
          });
        } catch (err) {
          console.error('Error re-binding native bridge on auth state change:', err);
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [router]);

  return null;
}
