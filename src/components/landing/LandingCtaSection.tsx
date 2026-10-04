'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, CreditCard, ShieldCheck, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { isNativePlatform } from '@/lib/native/capacitor-bridge';
import { Browser } from '@capacitor/browser';
import InlineSpinner from '@/components/ui/InlineSpinner';
import BeamBorder from '@/components/ui/border-beam';
import { useTranslation } from '@/lib/i18n';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="16" height="16">
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
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.57.66-.99 1.72-.86 2.75.99.08 2.02-.51 2.57-1.25z" />
    </svg>
  );
}

function GooglePlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20">
      <path
        fill="#00D6FF"
        d="M3.6 1.8L13.8 12 3.6 22.2c-.4-.4-.6-1-.6-1.7V3.5c0-.7.2-1.3.6-1.7z"
      />
      <path
        fill="#FFD200"
        d="M17.1 8.7l-3.3 3.3 3.3 3.3 3.8-2.2c1.1-.6 1.1-1.6 0-2.2l-3.8-2.2z"
      />
      <path
        fill="#00F076"
        d="M3.6 1.8l10.2 10.2 3.3-3.3L5.4.9c-.8-.5-1.5-.3-1.8.9z"
      />
      <path
        fill="#FF3A44"
        d="M3.6 22.2l13.5-7.8-3.3-3.3L3.6 22.2c.3 1.2 1 1.4 1.8.9z"
      />
    </svg>
  );
}

export default function LandingCtaSection() {
  const { locale, isRTL } = useTranslation();
  const router = useRouter();
  const supabase = createClient();

  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storeToast, setStoreToast] = useState<string | null>(null);

  const handleGoogleSignup = async () => {
    setError(null);
    setOauthLoading(true);
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
          redirectTo: `${origin}/auth/callback?next=/home`,
        },
      });
      if (err) throw err;
    } catch (err: any) {
      setError(err?.message || (locale === 'ar' ? 'فشل بدء تسجيل الدخول بواسطة Google.' : 'Failed to initialize Google login.'));
      setOauthLoading(false);
    }
  };

  const handleStoreClick = (platform: 'App Store' | 'Google Play') => {
    setStoreToast(
      locale === 'ar'
        ? `تطبيق ${platform} سينطلق قريباً! يمكنك تسجيل الدخول عبر Google بالأعلى لاستخدام منصة الويب الآن.`
        : `${platform} app is launching soon! You can sign in with Google above to use the web terminal now.`
    );
    setTimeout(() => {
      setStoreToast(null);
    }, 4500);
  };

  return (
    <section
      id="signup"
      className="relative w-full bg-transparent py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8 border-t border-white/[0.08] overflow-hidden text-white font-sans select-none"
    >
      <div className="relative max-w-5xl mx-auto w-full">
        <BeamBorder
          size="md"
          colorVariant="ocean"
          theme="dark"
          active={true}
          strength={1}
          duration={5}
          beamWidth={1.5}
          borderRadius={32}
          className="w-full rounded-[32px]"
        >
          <div className="relative w-full rounded-[32px] bg-black border border-white/10 px-6 py-12 sm:px-12 sm:py-16 md:py-20 flex flex-col items-center text-center overflow-hidden">
            {/* ================================================================= */}
            {/* 1. Main Headline                                                  */}
            {/* ================================================================= */}
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.08] max-w-3xl">
              {locale === 'ar' ? 'صفقتك القادمة تستحق أقصى درجات الدقة.' : 'Your Next Trade Deserves Precision.'}
            </h2>

            {/* ================================================================= */}
            {/* 2. Subtitle                                                       */}
            {/* ================================================================= */}
            <p className="mt-4 sm:mt-5 text-sm sm:text-base lg:text-lg text-zinc-400 font-normal leading-relaxed max-w-xl mx-auto">
              {locale === 'ar'
                ? 'انضم إلى آلاف المستثمرين في مصر الذين يستخدمون المنصة لمتابعة أكثر من 290 سهماً، واختبار الاستراتيجيات الكمية، والتنفيذ بأعلى درجات الثقة.'
                : 'Join thousands of Egyptian investors using Ticknal to track 290+ equities, backtest quantitative strategies, and execute with conviction.'}
            </p>

            {/* ================================================================= */}
            {/* 3. Primary Web Terminal Action Track                              */}
            {/* ================================================================= */}
            <div className="mt-8 sm:mt-10 flex flex-col items-center w-full max-w-sm">
              <BeamBorder
                size="md"
                colorVariant="ocean"
                theme="dark"
                active={true}
                strength={1}
                duration={3.5}
                beamWidth={2.5}
                strokeOpacity={1.0}
                bloomOpacity={0.8}
                borderRadius={9999}
                className="w-full rounded-full p-[2.5px] bg-black shadow-lg"
              >
                <button
                  type="button"
                  onClick={handleGoogleSignup}
                  disabled={oauthLoading}
                  className="w-full py-3.5 sm:py-4 px-8 rounded-full bg-white hover:bg-neutral-100 text-black font-semibold text-sm sm:text-base flex items-center justify-center gap-3 transition-colors duration-150 cursor-pointer disabled:opacity-50 shadow-md hover:shadow-lg"
                >
                  {oauthLoading ? (
                    <InlineSpinner
                      className="h-4 w-4"
                      label={locale === 'ar' ? 'جارٍ الاتصال بـ Google...' : 'Connecting with Google...'}
                    />
                  ) : (
                    <>
                      <GoogleIcon className="w-4 h-4 shrink-0" />
                      <span>{locale === 'ar' ? 'المتابعة باستخدام Google' : 'Continue with Google'}</span>
                    </>
                  )}
                </button>
              </BeamBorder>

              {/* Secondary Email Link */}
              <div className="mt-3.5 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
                <span>{locale === 'ar' ? 'أو التسجيل عبر البريد الإلكتروني —' : 'Or register with email —'}</span>
                <Link
                  href="/login?mode=signup"
                  className="text-zinc-300 hover:text-white underline underline-offset-4 decoration-white/20 hover:decoration-white transition-colors"
                >
                  {locale === 'ar' ? 'أنشئ حساباً مجانياً' : 'Create free account'}
                </Link>
              </div>

              {error && (
                <div className="w-full mt-3 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center leading-relaxed">
                  {error}
                </div>
              )}
            </div>

            {/* ================================================================= */}
            {/* 4. Mobile Apps Companion Track                                    */}
            {/* ================================================================= */}
            <div className="w-full max-w-md flex items-center gap-3 my-8">
              <div className="h-px bg-white/[0.08] flex-1" />
              <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium select-none">
                {locale === 'ar' ? 'أو حمّل التطبيق المرافق للهاتف' : 'Or download the mobile companion'}
              </span>
              <div className="h-px bg-white/[0.08] flex-1" />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md">
              {/* Apple App Store (Solid White Fully-Round Badge with Refined Typography) */}
              <button
                type="button"
                onClick={() => handleStoreClick('App Store')}
                className="w-full sm:flex-1 px-6 py-2.5 rounded-full bg-white hover:bg-neutral-100 text-black border border-neutral-200/80 flex items-center justify-center sm:justify-start gap-3.5 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-sm hover:shadow-md group"
                title={locale === 'ar' ? 'التحميل من Apple App Store (قريباً)' : 'Download on Apple App Store (Coming Soon)'}
              >
                <AppleIcon className="w-5 h-5 text-black shrink-0 group-hover:scale-105 transition-transform" />
                <div className="text-left rtl:text-right flex flex-col">
                  <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-medium leading-none">
                    {locale === 'ar' ? 'حمّل من' : 'Download on the'}
                  </span>
                  <span className="text-xs sm:text-[13px] font-semibold text-neutral-900 tracking-tight leading-tight mt-0.5">
                    App Store
                  </span>
                </div>
              </button>

              {/* Google Play (Solid White Fully-Round Badge with Refined Typography) */}
              <button
                type="button"
                onClick={() => handleStoreClick('Google Play')}
                className="w-full sm:flex-1 px-6 py-2.5 rounded-full bg-white hover:bg-neutral-100 text-black border border-neutral-200/80 flex items-center justify-center sm:justify-start gap-3.5 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-sm hover:shadow-md group"
                title={locale === 'ar' ? 'التحميل من Google Play (قريباً)' : 'Get it on Google Play (Coming Soon)'}
              >
                <GooglePlayIcon className="w-5 h-5 shrink-0 group-hover:scale-105 transition-transform" />
                <div className="text-left rtl:text-right flex flex-col">
                  <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-medium leading-none">
                    {locale === 'ar' ? 'متوفر على' : 'GET IT ON'}
                  </span>
                  <span className="text-xs sm:text-[13px] font-semibold text-neutral-900 tracking-tight leading-tight mt-0.5">
                    Google Play
                  </span>
                </div>
              </button>
            </div>

            {storeToast && (
              <div className="mt-4 px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-zinc-200 text-xs text-center leading-relaxed backdrop-blur-md animate-fade-in shadow-xl max-w-md">
                {storeToast}
              </div>
            )}

            {/* ================================================================= */}
            {/* 5. Institutional Reassurance Status Rail                          */}
            {/* ================================================================= */}
            <div className="mt-12 pt-6 border-t border-white/[0.06] w-full max-w-2xl flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-zinc-400 font-normal">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                <span>{locale === 'ar' ? 'تشغيل فوري' : 'Instant Setup'}</span>
              </div>
              <span className="text-zinc-700 hidden sm:inline">•</span>
              <div className="flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                <span>{locale === 'ar' ? 'لا حاجة لبطاقة ائتمان' : 'No Credit Card Required'}</span>
              </div>
              <span className="text-zinc-700 hidden sm:inline">•</span>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                <span>{locale === 'ar' ? 'باقة مجانية مدى الحياة' : 'Free Forever Tier'}</span>
              </div>
              <span className="text-zinc-700 hidden sm:inline">•</span>
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                <span>{locale === 'ar' ? 'أمان كامل لأموالك' : 'Full Capital Custody'}</span>
              </div>
            </div>
          </div>
        </BeamBorder>
      </div>
    </section>
  );
}

