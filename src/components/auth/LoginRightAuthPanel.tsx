'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from '@/components/ui/icon-library';
import InlineSpinner from '@/components/ui/InlineSpinner';
import TicknalBrand from '@/components/ui/TicknalBrand';
import { useTranslation } from '@/lib/i18n';

interface LoginRightAuthPanelProps {
  onGoogleLogin: () => void;
  oauthLoading: boolean;
  error: string | null;
}

export default function LoginRightAuthPanel({
  onGoogleLogin,
  oauthLoading,
  error,
}: LoginRightAuthPanelProps) {
  const { locale, isRTL } = useTranslation();

  return (
    <div className="flex-1 w-full lg:w-1/2 min-h-screen flex flex-col justify-between p-6 sm:p-12 lg:p-16 bg-black relative select-none font-sans">
      {/* Top Header Bar: < Home link (and mobile logo) */}
      <div className="w-full flex items-center justify-between">
        <Link
          href="/home"
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer group"
        >
          <ChevronLeft
            size={16}
            className="transition-transform group-hover:-translate-x-0.5 rtl:rotate-180 rtl:group-hover:translate-x-0.5"
          />
          <span>{locale === 'ar' ? 'الرئيسية' : 'Home'}</span>
        </Link>

        {/* Mobile-only Ticknal brand mark */}
        <TicknalBrand size="md" className="lg:hidden" />
      </div>

      {/* Center Auth Card / Action Form */}
      <div className="w-full max-w-[420px] mx-auto my-auto py-8 flex flex-col items-center">
        {/* Title & Subtitle */}
        <div className="text-center w-full mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {locale === 'ar' ? 'تسجيل الدخول أو إنشاء حساب جديد' : 'Sign In or Join Now!'}
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            {locale === 'ar' ? 'سجّل الدخول أو أنشئ حسابك في تكنال.' : 'login or create your ticknal account.'}
          </p>
        </div>

        {/* Google Sign-in Action Button */}
        <div className="w-full">
          <button
            type="button"
            onClick={onGoogleLogin}
            disabled={oauthLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-[#e6e8ec] hover:bg-white text-black font-semibold text-sm sm:text-base flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm disabled:opacity-50 active:scale-[0.99]"
          >
            {oauthLoading ? (
              <InlineSpinner
                className="h-5 w-5 text-black"
                label={locale === 'ar' ? 'جارٍ الاتصال بـ Google...' : 'Connecting to Google...'}
              />
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0">
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
                <span>{locale === 'ar' ? 'المتابعة باستخدام Google' : 'Continue with Google'}</span>
              </>
            )}
          </button>
        </div>

        {/* Error Feedback if any */}
        {error && (
          <div className="w-full mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* Legal Disclaimer */}
        <p className="text-xs text-zinc-500 leading-relaxed text-center mt-8 max-w-sm">
          {locale === 'ar' ? (
            <>
              بالمتابعة، أنت توافق على{' '}
              <Link href="/terms" className="underline hover:text-zinc-300 transition-colors">
                شروط الخدمة
              </Link>{' '}
              و{' '}
              <Link href="/privacy" className="underline hover:text-zinc-300 transition-colors">
                سياسة الخصوصية
              </Link>{' '}
              الخاصة بنا.
            </>
          ) : (
            <>
              By clicking continue, you agree to our{' '}
              <Link href="/terms" className="underline hover:text-zinc-300 transition-colors">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="underline hover:text-zinc-300 transition-colors">
                Privacy Policy
              </Link>
              .
            </>
          )}
        </p>
      </div>

      {/* Subtle Bottom Empty Spacer */}
      <div className="h-6" />
    </div>
  );
}

