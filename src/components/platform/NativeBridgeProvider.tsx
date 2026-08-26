'use client';

import { useEffect } from 'react';
import { isNativePlatform, initNativeBridge } from '@/lib/native/capacitor-bridge';
import { useRouter } from 'next/navigation';

export default function NativeBridgeProvider() {
  const router = useRouter();

  useEffect(() => {
    if (isNativePlatform()) {
      initNativeBridge({
        onNavigate: (url) => {
          if (url.startsWith('http://') || url.startsWith('https://')) {
            window.location.href = url;
          } else {
            router.push(url);
          }
        },
      });
    }
  }, [router]);

  return null;
}
