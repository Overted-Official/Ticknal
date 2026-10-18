'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Download, Share, PlusSquare, X, ArrowUpRight, Check, Zap } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from '@/lib/i18n';
import { isNativePlatform } from '@/lib/native/capacitor-bridge';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PWA_DISMISSED_KEY = 'ticknal_pwa_dismissed_at';
const PWA_INSTALLED_KEY = 'ticknal_pwa_installed';
const SNOOZE_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

const SPRING = { type: 'spring' as const, stiffness: 320, damping: 32, mass: 0.7 };

export default function PwaInstallPrompt() {
  const { locale, isRTL } = useTranslation();
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (typeof window === 'undefined') return;

    // 1. Detect if running inside native APK or standalone installed PWA
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      typeof (window as unknown as { AndroidBridge?: unknown }).AndroidBridge !== 'undefined' ||
      document.referrer.includes('android-app://') ||
      isNativePlatform() ||
      localStorage.getItem(PWA_INSTALLED_KEY) === 'true';

    setIsStandalone(standalone);
    if (standalone) return;

    // 2. Detect mobile user agent or touch-screen mobile viewport
    const ua = navigator.userAgent || '';
    const mobileUa = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const mobileScreen = window.innerWidth <= 840 && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const mobile = mobileUa || mobileScreen;
    setIsMobile(mobile);

    const ios = /iPhone|iPad|iPod/i.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(ios);

    if (!mobile) return;

    // 3. Listen for Chromium/Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setShowBanner(false);
      setShowIosGuide(false);
      setIsMinimized(false);
      setDeferredPrompt(null);
      localStorage.setItem(PWA_INSTALLED_KEY, 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 4. Persistence / Prompt Display Timing
    const dismissedAt = localStorage.getItem(PWA_DISMISSED_KEY);
    const isRecentlyDismissed = dismissedAt ? Date.now() - Number(dismissedAt) < SNOOZE_DURATION_MS : false;

    if (isRecentlyDismissed) {
      // Keep persistent floating mini-pill available
      setIsMinimized(true);
    } else {
      // Pop full install banner after a smooth 2.5s delay
      const timer = window.setTimeout(() => {
        setShowBanner(true);
      }, 2500);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (isIOS) {
      setShowIosGuide(true);
      setShowBanner(false);
      return;
    }

    if (deferredPrompt) {
      try {
        setIsInstalling(true);
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsStandalone(true);
          setShowBanner(false);
          setIsMinimized(false);
          localStorage.setItem(PWA_INSTALLED_KEY, 'true');
        }
      } catch (err) {
        console.error('PWA install prompt error:', err);
      } finally {
        setIsInstalling(false);
        setDeferredPrompt(null);
      }
    } else {
      // Fallback if browser hasn't fired beforeinstallprompt or is in in-app webview
      setShowIosGuide(true);
      setShowBanner(false);
    }
  }, [deferredPrompt, isIOS]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    setIsMinimized(true);
    localStorage.setItem(PWA_DISMISSED_KEY, String(Date.now()));
  }, []);

  const handleReopen = useCallback(() => {
    setIsMinimized(false);
    if (isIOS) {
      setShowIosGuide(true);
    } else if (deferredPrompt) {
      setShowBanner(true);
    } else {
      setShowIosGuide(true);
    }
  }, [isIOS, deferredPrompt]);

  if (!mounted || isStandalone || !isMobile) return null;

  return (
    <>
      {/* 1. Persistent Minimized Floating Install Pill (Tour-grade sleek pill) */}
      <AnimatePresence>
        {isMinimized && !showBanner && !showIosGuide && (
          <motion.div
            dir={isRTL ? 'rtl' : 'ltr'}
            className="fixed bottom-18 md:bottom-5 left-4 right-4 z-40 flex justify-center pointer-events-none font-sans"
            initial={reduce ? false : { opacity: 0, y: 14, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.94 }}
            transition={reduce ? { duration: 0 } : SPRING}
          >
            <button
              type="button"
              onClick={handleReopen}
              className="pointer-events-auto group inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/90 backdrop-blur-md px-3.5 py-1.5 text-[12px] font-medium text-white shadow-xl shadow-black/40 hover:border-white/30 hover:bg-black active:scale-95 transition-all cursor-pointer"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
              </span>
              <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>{locale === 'ar' ? 'تثبيت تطبيق تكنال' : 'Install Ticknal App'}</span>
              <ArrowUpRight className="w-3 h-3 text-zinc-400 group-hover:text-white transition-colors shrink-0" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Full Bottom Install Sheet / Tour-style Popover Card */}
      <AnimatePresence>
        {showBanner && !showIosGuide && (
          <motion.div
            dir={isRTL ? 'rtl' : 'ltr'}
            className="fixed bottom-16 md:bottom-5 left-3 right-3 sm:left-auto sm:right-5 sm:w-[350px] z-50 rounded-2xl border border-white/10 bg-black/95 backdrop-blur-xl p-4 shadow-2xl shadow-black/80 font-sans text-white"
            initial={reduce ? false : { opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={reduce ? { duration: 0 } : SPRING}
          >
            {/* Top row: App Icon, Title, and Close Button */}
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative w-9 h-9 rounded-xl border border-white/10 shrink-0 bg-black flex items-center justify-center p-1.5 shadow-sm">
                  <Image
                    src="/Ticknal_icon.svg"
                    alt="Ticknal"
                    width={24}
                    height={24}
                    className="w-6 h-6 object-contain"
                    priority
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-cyan-500 text-black flex items-center justify-center">
                    <Zap className="w-2 h-2 fill-black" />
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">
                      {locale === 'ar' ? 'تطبيق الهاتف' : 'MOBILE APP'}
                    </span>
                    <span className="text-[10px] text-zinc-500">• PWA</span>
                  </div>
                  <h3 className="text-[14px] font-semibold text-white tracking-tight leading-snug truncate">
                    {locale === 'ar' ? 'تثبيت تكنال على هاتفك' : 'Install Ticknal on Your Phone'}
                  </h3>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Close"
                className="-mr-1 -mt-1 rtl:-ml-1 rtl:mr-0 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-400">
              {locale === 'ar'
                ? 'أسرع بيانات للبورصة المصرية، إشعارات بيع وشراء فورية، وتجربة تداول سلسة بدون شريط المتصفح.'
                : 'Instant EGX market execution, real-time Buy & Sell signal push alerts, and zero browser lag.'}
            </p>

            {/* Bottom Actions Row: Sleek Tour-style buttons */}
            <div className="mt-3.5 flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={handleDismiss}
                className="inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                {locale === 'ar' ? 'لاحقاً' : 'Later'}
              </button>
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-black hover:bg-zinc-200 active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isInstalling
                    ? (locale === 'ar' ? 'جاري التثبيت...' : 'Installing...')
                    : isIOS
                    ? (locale === 'ar' ? 'طريقة التثبيت' : 'How to Install')
                    : (locale === 'ar' ? 'تثبيت الآن' : 'Install App')}
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. iOS Step-by-Step Installation Modal/Sheet */}
      <AnimatePresence>
        {showIosGuide && (
          <div
            dir={isRTL ? 'rtl' : 'ltr'}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans"
          >
            {/* Backdrop click */}
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIosGuide(false)}
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              className="relative z-10 w-full max-w-[360px] rounded-2xl border border-white/10 bg-black/95 backdrop-blur-xl p-5 shadow-2xl shadow-black/80 text-white"
              initial={reduce ? false : { opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={reduce ? { duration: 0 } : SPRING}
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-black border border-white/10 flex items-center justify-center p-1.5 shadow-sm">
                    <Image src="/Ticknal_icon.svg" alt="Ticknal" width={22} height={22} className="w-5 h-5 object-contain" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-semibold tracking-tight text-white">
                      {locale === 'ar' ? 'تثبيت تكنال على iPhone' : 'Install Ticknal on iPhone'}
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      {locale === 'ar' ? 'إضافة إلى الشاشة الرئيسية عبر Safari' : 'Add to Home Screen via Safari'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIosGuide(false)}
                  className="-mr-1 -mt-1 rtl:-ml-1 rtl:mr-0 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Steps */}
              <div className="py-3.5 space-y-2.5">
                {/* Step 1 */}
                <div className="flex items-start gap-2.5 rounded-xl p-2.5 bg-white/[0.03] border border-white/10">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div className="flex-1 text-[12.5px] text-zinc-300 leading-relaxed">
                    {locale === 'ar' ? (
                      <>
                        اضغط على زر <strong className="text-white">المشاركة</strong> (
                        <Share className="inline w-3.5 h-3.5 mx-1 text-cyan-400" />) في شريط أدوات سفاري بالأسفل.
                      </>
                    ) : (
                      <>
                        Tap the <strong className="text-white">Share</strong> button (
                        <Share className="inline w-3.5 h-3.5 mx-1 text-cyan-400" />) in Safari&apos;s bottom toolbar.
                      </>
                    )}
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-2.5 rounded-xl p-2.5 bg-white/[0.03] border border-white/10">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div className="flex-1 text-[12.5px] text-zinc-300 leading-relaxed">
                    {locale === 'ar' ? (
                      <>
                        مرر للأسفل واختر <strong className="text-white">&quot;إضافة إلى الصفحة الرئيسية&quot;</strong> (
                        <PlusSquare className="inline w-3.5 h-3.5 mx-1 text-cyan-400" />
                        ).
                      </>
                    ) : (
                      <>
                        Scroll down and tap <strong className="text-white">&quot;Add to Home Screen&quot;</strong> (
                        <PlusSquare className="inline w-3.5 h-3.5 mx-1 text-cyan-400" />
                        ).
                      </>
                    )}
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-2.5 rounded-xl p-2.5 bg-white/[0.03] border border-white/10">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div className="flex-1 text-[12.5px] text-zinc-300 leading-relaxed">
                    {locale === 'ar' ? (
                      <>
                        اضغط على <strong className="text-white">&quot;إضافة&quot;</strong> (Add) في الزاوية العلوية اليمنى.
                      </>
                    ) : (
                      <>
                        Tap <strong className="text-white">&quot;Add&quot;</strong> in the top-right corner.
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Done button */}
              <button
                type="button"
                onClick={() => {
                  setShowIosGuide(false);
                  setIsMinimized(true);
                }}
                className="w-full mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[12.5px] font-medium text-black hover:bg-zinc-200 active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{locale === 'ar' ? 'فهمت' : 'Got It'}</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
