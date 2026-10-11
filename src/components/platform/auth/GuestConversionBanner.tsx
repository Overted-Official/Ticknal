'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { useGuestGuard } from '@/context/GuestGuardContext';
import { useMobileNavScroll } from '@/context/MobileNavScrollContext';
import { createClient } from '@/lib/supabase/client';
import { isNativePlatform } from '@/lib/native/capacitor-bridge';
import { Browser } from '@capacitor/browser';
import InlineSpinner from '@/components/ui/InlineSpinner';
import { X } from '@/components/ui/icon-library';
import { useHeroSceneMode } from '@/components/landing/hero-scenes/useHeroSceneMode';

interface GuestConversionBannerProps {
  currentFeature?: string;
  title?: string;
  subtitle?: string;
  ctaText?: string;
}

export default function GuestConversionBanner({
  currentFeature: _currentFeature = 'Terminal',
  title,
  subtitle,
  ctaText,
}: GuestConversionBannerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale } = useTranslation();
  const { isGuest, isLoading } = useGuestGuard();
  const { isNavVisible } = useMobileNavScroll();
  const isHeroScene = useHeroSceneMode();
  const [oauthLoading, setOauthLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem('ticknal_guest_banner_dismissed') === 'true') {
        setIsDismissed(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('ticknal_guest_banner_dismissed', 'true');
    } catch {
      // ignore
    }
  }, []);

  const isChartRoute = pathname === '/charts' || pathname.startsWith('/charts/');
  const isBottomNavVisible = isChartRoute || isNavVisible;

  const isNews = pathname === '/news' || pathname.startsWith('/news/');
  const isMarkets = pathname === '/markets' || pathname.startsWith('/markets/');
  const isCharts = pathname === '/charts' || pathname.startsWith('/charts/');

  // Contextual copy exactly matching user specifications
  const displayTitle =
    title ||
    (isNews
      ? locale === 'ar'
        ? 'اقرأ التقرير كاملاً'
        : 'Read the full article'
      : isMarkets
      ? locale === 'ar'
        ? 'استكشف تحليلات السوق بالكامل'
        : 'Explore full market analytics'
      : isCharts
      ? locale === 'ar'
        ? 'افتح كامل قدرات الرسوم البيانية'
        : 'Unlock full terminal charts'
      : locale === 'ar'
      ? 'استكشف كامل إمكانيات تكنال'
      : 'Access Ticknal Terminal');

  const displaySubtitle =
    subtitle ||
    (isNews
      ? locale === 'ar'
        ? 'أنشئ حساباً مجانياً للوصول إلى هذا المقال وآلاف الإفصاحات المنشورة يومياً.'
        : 'Create a free account to access this article and thousands more published daily.'
      : isMarkets
      ? locale === 'ar'
        ? 'أنشئ حساباً مجانياً لمتابعة تدفقات السيولة وتوزيع القطاعات وخريطة السوق الحية.'
        : 'Create a free account to access live market breadth, sector rotation, and institutional liquidity.'
      : isCharts
      ? locale === 'ar'
        ? 'أنشئ حساباً مجانياً للوصول إلى المؤشرات الفنية المتقدمة والتنبيهات اللحظية للأسعار.'
        : 'Create a free account to access advanced technical indicators, custom watchlists, and price alerts.'
      : locale === 'ar'
      ? 'أنشئ حساباً مجانياً لمتابعة محفظتك وتفعيل التنبيهات الحية واكتشاف فرص السوق.'
      : 'Create a free account to monitor your Egyptian portfolio, set alerts, and track market catalysts.');

  const displayCta = ctaText || (locale === 'ar' ? 'انضم مجاناً' : 'Join for free');

  const handleJoinClick = useCallback(async () => {
    setOauthLoading(true);
    const supabase = createClient();

    try {
      if (isNativePlatform()) {
        const { data, error: err } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'com.ticknal.app://auth/callback',
            skipBrowserRedirect: true,
          },
        });

        if (err) throw err;
        if (data?.url) {
          await Browser.open({ url: data.url, windowName: '_self' });
        }
        return;
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(pathname || '/markets')}`,
        },
      });
      if (err) throw err;
    } catch {
      setOauthLoading(false);
      router.push('/signup');
    }
  }, [pathname, router]);

  // Only render for unauthenticated guest visitors once auth state has resolved
  if (isHeroScene || isLoading || !isGuest || isDismissed) return null;

  return (
    <aside
      aria-label="Guest Conversion Paywall"
      className={`fixed ${
        isBottomNavVisible
          ? 'bottom-[calc(56px+var(--ticknal-safe-area-bottom))]'
          : 'bottom-[var(--ticknal-safe-area-bottom)]'
      } md:bottom-0 inset-x-0 w-full z-40 select-none font-sans pointer-events-none transition-all duration-300 ease-out`}
    >
      <div className="w-full flex flex-col items-center pointer-events-auto">
        {/* 1. Upper Fading Gradient: Smoothly dissolves background content into pure black */}
        <div
          aria-hidden="true"
          className="w-full h-16 sm:h-24 bg-gradient-to-t from-black via-black/85 to-transparent pointer-events-none"
        />

        {/* 2. Solid Pure Black Call To Action Section */}
        <div className="relative w-full bg-black px-4 pt-1.5 pb-5 sm:pb-8 flex flex-col items-center justify-center text-center">
          {/* Dismiss Close Button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss banner"
            className="absolute top-2 end-3 sm:end-6 p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-full hover:bg-white/10"
          >
            <X size={16} />
          </button>

          {/* Main Title */}
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
            {displayTitle}
          </h3>

          {/* Subtitle */}
          <p className="text-xs sm:text-[13px] text-zinc-400 mt-1 sm:mt-1.5 max-w-sm sm:max-w-md leading-relaxed font-normal">
            {displaySubtitle}
          </p>

          {/* Join For Free Button */}
          <button
            type="button"
            onClick={handleJoinClick}
            disabled={oauthLoading}
            className="mt-3.5 sm:mt-4 px-6 sm:px-7 py-2 sm:py-2.5 rounded-lg bg-white text-black font-semibold text-xs sm:text-sm hover:bg-neutral-200 active:scale-[0.98] transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
          >
            {oauthLoading && <InlineSpinner className="h-4 w-4" label="Connecting" />}
            <span>{displayCta}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
