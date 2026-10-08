'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

function detectChannel(referrer: string, utmSource: string | null): string {
  if (utmSource) {
    const s = utmSource.toLowerCase();
    if (s.includes('linkedin')) return 'linkedin';
    if (s.includes('instagram')) return 'instagram';
    if (s.includes('twitter') || s === 'x') return 'x_twitter';
    if (s.includes('facebook') || s === 'fb') return 'facebook';
    if (s.includes('tiktok')) return 'tiktok';
    if (s.includes('google')) return 'google_cpc';
    return 'campaign';
  }

  if (!referrer) return 'direct';

  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host.includes('linkedin') || host.includes('lnkd.in')) return 'linkedin';
    if (host.includes('instagram')) return 'instagram';
    if (host.includes('t.co') || host.includes('twitter') || host.includes('x.com')) return 'x_twitter';
    if (host.includes('facebook') || host.includes('fb.me')) return 'facebook';
    if (host.includes('tiktok')) return 'tiktok';
    if (host.includes('google')) return 'google_organic';
    if (host.includes('bing') || host.includes('yahoo')) return 'search_organic';
    return 'referral';
  } catch {
    return 'direct';
  }
}

function detectDevice(): { deviceType: 'mobile' | 'desktop' | 'tablet'; os: string; browser: string } {
  if (typeof window === 'undefined') {
    return { deviceType: 'desktop', os: 'Unknown', browser: 'Unknown' };
  }

  const ua = navigator.userAgent;
  let deviceType: 'mobile' | 'desktop' | 'tablet' = 'desktop';

  if (/Mobi|Android|iPhone|iPod/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/iPad|Tablet/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua))) {
    deviceType = 'tablet';
  }

  let os = 'Other';
  if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Other';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';

  return { deviceType, os, browser };
}

export default function TelemetryTracker() {
  const pathname = usePathname();
  const lastLoggedPath = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (lastLoggedPath.current === pathname) return;
    lastLoggedPath.current = pathname;

    try {
      // 1. Maintain or initialize persistent session ID (30-day lifecycle)
      let sessionId = localStorage.getItem('_tk_sess_id');
      if (!sessionId) {
        sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('_tk_sess_id', sessionId);
      }

      // 2. Extract UTM parameters
      const urlParams = new URLSearchParams(window.location.search);
      const utmSource = urlParams.get('utm_source');
      const utmMedium = urlParams.get('utm_medium');
      const utmCampaign = urlParams.get('utm_campaign');

      // 3. Attribution preservation (First-touch tracking in cookie/storage)
      let storedChannel = sessionStorage.getItem('_tk_first_channel');
      if (!storedChannel) {
        storedChannel = detectChannel(document.referrer, utmSource);
        sessionStorage.setItem('_tk_first_channel', storedChannel);
      }

      const { deviceType, os, browser } = detectDevice();
      const isPwa =
        window.matchMedia('(display-mode: standalone)').matches ||
        Boolean((navigator as unknown as { standalone?: boolean }).standalone);

      const payload = {
        sessionId,
        channel: storedChannel,
        referrer: document.referrer || null,
        utmSource,
        utmMedium,
        utmCampaign,
        landingPath: pathname || '/',
        deviceType,
        os,
        browser,
        isPwaOrNative: isPwa,
      };

      // 4. Non-blocking beacon transmission
      fetch('/api/telemetry/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {
        // Silent catch: telemetry must never interfere with core UX
      });
    } catch {
      // Ignore client telemetry errors
    }
  }, [pathname]);

  return null;
}
