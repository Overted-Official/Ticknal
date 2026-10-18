'use client';

import React, { useEffect } from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import { isNativePlatform } from '@/lib/native/capacitor-bridge';
import { StatusBar, Style } from '@capacitor/status-bar';

function ThemeNativeSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;
    const isLight = resolvedTheme === 'light';
    const bgHex = isLight ? '#ffffff' : '#000000';

    // Sync browser theme-color meta tags
    if (typeof document !== 'undefined') {
      const metaTags = document.querySelectorAll('meta[name="theme-color"]');
      metaTags.forEach((tag) => {
        tag.setAttribute('content', bgHex);
      });
    }

    // Sync Capacitor native status bar on Android / iOS
    if (isNativePlatform()) {
      (async () => {
        try {
          await StatusBar.setStyle({ style: isLight ? Style.Light : Style.Dark });
          await StatusBar.setBackgroundColor({ color: bgHex });
        } catch {
          // Ignore if StatusBar is unsupported in current webview
        }
      })();
    }
  }, [resolvedTheme]);

  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      storageKey="ticknal-theme"
    >
      <ThemeNativeSync />
      {children}
    </NextThemesProvider>
  );
}
