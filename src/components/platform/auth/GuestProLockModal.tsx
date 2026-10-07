'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { isNativePlatform } from '@/lib/native/capacitor-bridge';
import { Browser } from '@capacitor/browser';
import InlineSpinner from '@/components/ui/InlineSpinner';
import { useTranslation } from '@/lib/i18n';

interface GuestProLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  featureName?: string;
}

export default function GuestProLockModal({
  isOpen,
  onClose,
  title,
  description,
  featureName,
}: GuestProLockModalProps) {
  const { locale } = useTranslation();
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleGoogleLogin = useCallback(async () => {
    setError(null);
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
      const nextDestination = featureName ? '/home' : '/markets';
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextDestination)}`,
        },
      });
      if (err) throw err;
    } catch (err: any) {
      setError(
        err?.message ||
          (locale === 'ar' ? 'تعذر بدء تسجيل الدخول عبر Google' : 'Failed to initialize Google login')
      );
      setOauthLoading(false);
    }
  }, [featureName, locale]);

  if (!isOpen) return null;

  // Clean, welcoming title and subtitle
  const defaultTitle =
    locale === 'ar' ? 'استكشف كامل إمكانيات تكنال' : "Access Ticknal's Full Power";
  const defaultDescription =
    locale === 'ar'
      ? 'سجّل الدخول لمتابعة محفظتك بالبورصة المصرية، وأتمتة التنبيهات، واختبار استراتيجياتك.'
      : 'Sign in to monitor your Egyptian market portfolio, automate your trading alerts, and test custom strategies.';

  // If title was passed but starts with aggressive "Unlock", replace with clean inviting title
  const displayTitle =
    title && !title.startsWith('Unlock') ? title : defaultTitle;
  const displayDescription =
    description && !description.includes('Create a free Ticknal account to access')
      ? description
      : defaultDescription;

  const features =
    locale === 'ar'
      ? [
          'إشعارات فورية عند تحقق شروط وقواعد استراتيجيتك',
          'اختبار الاستراتيجيات والوصول لأكثر من 100 مؤشر فني',
          'تتبع شامل للثروة وإدارة السيولة والحسابات النقدية',
          'مزامنة آلية للمحفظة وتقييم الأداء بالقيمة السوقية',
          'رصد حي لاتساع السوق المصري وتدفقات سيولة القطاعات',
        ]
      : [
          'Instant notifications when your strategy rules are met',
          'Strategy backtesting and access to 100+ indicators',
          'Comprehensive wealth & cash tracking',
          'Automated portfolio sync & mark-to-market performance',
          'Live Egyptian market breadth & sector money flow',
        ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none font-sans">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Outer wrapper to center card and bottom legal text */}
      <div className="relative z-10 w-full max-w-[420px] flex flex-col items-center">
        {/* Modal Card Surface: Pure pitch black, hairline borders, sans typography */}
        <div
          role="dialog"
          aria-modal="true"
          className="relative w-full rounded-2xl border border-white/15 bg-black p-6 sm:p-7 shadow-[0_24px_80px_rgba(0,0,0,0.95)] flex flex-col"
        >
          {/* Subtle Top Right Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-xs"
            aria-label="Close modal"
          >
            ✕
          </button>

          {/* Logo Mark: Pure white logo icon with zero background and zero borders */}
          <div className="flex items-center justify-center mx-auto mb-3">
            <Image
              src="/logo-white.svg"
              alt="Ticknal"
              width={38}
              height={38}
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain"
              priority
            />
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight text-center leading-snug">
            {displayTitle}
          </h2>

          {/* Subtitle */}
          <p className="text-xs sm:text-[13px] text-zinc-400 text-center mt-2 font-normal leading-relaxed max-w-xs mx-auto">
            {displayDescription}
          </p>

          {/* Error Message */}
          {error && (
            <div className="mt-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center leading-normal">
              {error}
            </div>
          )}

          {/* Primary Action Button: Continue with Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={oauthLoading}
            className="w-full mt-5 py-3 px-4 rounded-xl bg-white text-black hover:bg-neutral-200 active:scale-[0.99] font-semibold text-sm flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            {oauthLoading ? (
              <InlineSpinner className="h-4 w-4" label="Connecting to Google" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            )}
            <span>{locale === 'ar' ? 'المتابعة باستخدام Google' : 'Continue with Google'}</span>
          </button>

          {/* Divider: Gain Access to */}
          <div className="w-full flex items-center gap-3 my-4">
            <div className="flex-1 h-[1px] bg-white/10" />
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-zinc-400 font-semibold px-1">
              {locale === 'ar' ? 'صلاحيات الوصول المتاحة' : 'Gain Access to'}
            </span>
            <div className="flex-1 h-[1px] bg-white/10" />
          </div>

          {/* Sleek Features List: Compact, zero background, zero border */}
          <ul className="space-y-2 w-full my-1">
            {features.map((feat, idx) => (
              <li key={idx} className="flex items-center gap-2.5 text-zinc-200 text-xs sm:text-[13px]">
                <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <Check size={10} className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                </div>
                <span className="font-normal text-zinc-300 leading-snug">{feat}</span>
              </li>
            ))}
          </ul>

          {/* Skip for now button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full mt-4 py-2.5 sm:py-3 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.99] border border-white/10 text-white font-medium text-xs sm:text-sm text-center transition-all cursor-pointer"
          >
            {locale === 'ar' ? 'تخطي الآن' : 'Skip for now'}
          </button>
        </div>

        {/* Bottom Legal Disclaimer matching reference image */}
        <p className="text-[11px] sm:text-xs text-zinc-500 text-center mt-3.5 leading-normal">
          {locale === 'ar' ? (
            <>
              بتسجيل الدخول، أنت توافق على{' '}
              <Link href="/terms" className="text-zinc-400 underline underline-offset-2 hover:text-white transition-colors">
                شروط الخدمة
              </Link>{' '}
              و{' '}
              <Link href="/privacy" className="text-zinc-400 underline underline-offset-2 hover:text-white transition-colors">
                سياسة الخصوصية
              </Link>
              .
            </>
          ) : (
            <>
              By logging in, you agree to our{' '}
              <Link href="/terms" className="text-zinc-400 underline underline-offset-2 hover:text-white transition-colors">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-zinc-400 underline underline-offset-2 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              .
            </>
          )}
        </p>
      </div>
    </div>
  );
}
