'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X } from 'lucide-react';
import { useGuestGuard } from '@/context/GuestGuardContext';
import { useAlerts } from '@/components/platform/AlertProvider';
import { useTranslation } from '@/lib/i18n';
import { toast } from '@/components/ui/sonner';

const PUSH_DISMISSED_KEY = 'ticknal_signal_push_prompt_dismissed_at';
const PUSH_COMPLETED_KEY = 'ticknal_signal_push_prompt_completed';
const SNOOZE_MS = 24 * 60 * 60 * 1000; // 24 hours

export default function SignalPushPromptModal() {
  const { isGuest, isLoading } = useGuestGuard();
  const { permission, ensurePushSubscription } = useAlerts();
  const { locale, isRTL } = useTranslation();

  const [isOpen, setIsOpen] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(PUSH_DISMISSED_KEY, String(Date.now()));
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!mounted || isLoading || isGuest) return;

    // Listen for manual open trigger (useful for testing and settings integration)
    const handleManualOpen = () => setIsOpen(true);
    window.addEventListener('ticknal:open-signal-prompt', handleManualOpen);

    // Support instant debug/preview via URL param
    if (typeof window !== 'undefined' && window.location.search.includes('prompt=signals')) {
      setIsOpen(true);
      return () => {
        window.removeEventListener('ticknal:open-signal-prompt', handleManualOpen);
      };
    }

    // If permission is already granted or denied, or already completed
    if (permission === 'granted' || permission === 'denied' || permission === 'unsupported') {
      return () => {
        window.removeEventListener('ticknal:open-signal-prompt', handleManualOpen);
      };
    }

    if (typeof window === 'undefined') return;

    const completed = localStorage.getItem(PUSH_COMPLETED_KEY) === 'true';
    if (completed) return;

    const dismissedAt = localStorage.getItem(PUSH_DISMISSED_KEY);
    if (dismissedAt && Date.now() - Number(dismissedAt) < SNOOZE_MS) {
      return;
    }

    // Delay prompt slightly so dashboard renders first without abrupt interruption
    const timer = window.setTimeout(() => {
      setIsOpen(true);
    }, 1500);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('ticknal:open-signal-prompt', handleManualOpen);
    };
  }, [mounted, isLoading, isGuest, permission]);

  // Support closing via Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleDismiss]);

  const handleEnable = useCallback(async () => {
    setIsSubscribing(true);
    try {
      const res = await ensurePushSubscription();
      if (res.success) {
        localStorage.setItem(PUSH_COMPLETED_KEY, 'true');
        toast.success(
          locale === 'ar' ? 'تم تفعيل التنبيهات بنجاح' : 'Signal Alerts Enabled',
          locale === 'ar'
            ? 'ستصلك إشعارات إشارات البيع والشراء اللحظية فور صدورها.'
            : 'You will receive real-time Buy & Sell strategy signals directly.'
        );
        setIsOpen(false);
      } else {
        if (res.error?.includes('denied')) {
          toast.error(
            locale === 'ar' ? 'تم رفض إذن الإشعارات' : 'Notifications Blocked',
            locale === 'ar'
              ? 'يرجى السماح بالإشعارات من إعدادات المتصفح أو التطبيق لاستلام إشارات التداول.'
              : 'Please enable notifications in your browser or app settings to receive trade signals.'
          );
        } else {
          toast.error(
            locale === 'ar' ? 'تعذر تفعيل التنبيهات' : 'Failed to Enable Alerts',
            res.error || (locale === 'ar' ? 'يرجى المحاولة مرة أخرى لاحقاً.' : 'Please try again later.')
          );
        }
        setIsOpen(false);
      }
    } catch (err: unknown) {
      console.error('Failed to enable push notifications:', err);
      toast.error(
        locale === 'ar' ? 'خطأ في التفعيل' : 'Activation Error',
        err instanceof Error ? err.message : 'Unknown error occurred.'
      );
      setIsOpen(false);
    } finally {
      setIsSubscribing(false);
    }
  }, [ensurePushSubscription, locale]);

  if (!isOpen || !mounted) return null;

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 select-none font-sans"
    >
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={handleDismiss} />

      {/* Sleek Minimalist Modal Card — matching reference toast aesthetic */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="signal-push-title"
        className="relative z-10 w-full max-w-[430px] bg-black border border-white/10 rounded-2xl p-5 sm:p-6 shadow-[0_24px_80px_rgba(0,0,0,0.95)] text-white font-sans animate-in zoom-in-95 duration-200"
      >
        {/* Subtle Close Button in Top Corner */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={locale === 'ar' ? 'إغلاق' : 'Close'}
          className="absolute top-4 right-4 rtl:right-auto rtl:left-4 text-zinc-400 hover:text-white p-1 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3.5">
          {/* Circular Alert Icon Badge */}
          <div className="w-10 h-10 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center shrink-0 mt-0.5 text-white">
            <Bell className="w-5 h-5 text-white" strokeWidth={1.8} />
          </div>

          {/* Content Body */}
          <div className="flex-1 min-w-0 pr-6 rtl:pr-0 rtl:pl-6">
            <h3
              id="signal-push-title"
              className="text-[15px] sm:text-base font-semibold text-white tracking-tight leading-snug"
            >
              {locale === 'ar' ? 'تفعيل تنبيهات إشارات البيع والشراء' : 'Enable Buy & Sell Signal Alerts'}
            </h3>

            <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 leading-relaxed">
              {locale === 'ar'
                ? 'استلم إشعارات فورية عند صدور إشارات الشراء والبيع للنماذج الكمية في البورصة المصرية. إشارات تداول فقط بدون إعلانات.'
                : 'Receive instant push alerts when quantitative strategies trigger BUY or SELL signals on EGX equities. Strictly trading signals, no marketing spam.'}
            </p>

            {/* Action Buttons Row — sleek and minimalistic with NO icons */}
            <div className="flex items-center gap-3 mt-4">
              <button
                type="button"
                onClick={handleEnable}
                disabled={isSubscribing}
                className="px-4 py-2 bg-white text-black hover:bg-zinc-200 active:scale-95 font-medium text-xs sm:text-sm rounded-lg transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isSubscribing
                  ? (locale === 'ar' ? 'جاري التفعيل...' : 'Enabling...')
                  : (locale === 'ar' ? 'تفعيل التنبيهات' : 'Enable Alerts')}
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                disabled={isSubscribing}
                className="px-2 py-2 text-zinc-400 hover:text-white font-medium text-xs sm:text-sm transition-colors cursor-pointer"
              >
                {locale === 'ar' ? 'لاحقاً' : 'Later'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
