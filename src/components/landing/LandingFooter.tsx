'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.64a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.4a6.33 6.33 0 0 0-.86-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.76a8.28 8.28 0 0 0 4.77 1.51V6.82a4.85 4.85 0 0 1-1-.13z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
    </svg>
  );
}

export default function LandingFooter() {
  const { locale, isRTL } = useTranslation();
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 4000);
      setEmail('');
    }
  };

  return (
    <footer id="footer" className="w-full bg-transparent text-white font-sans overflow-hidden">
      {/* ==================================================================== */}
      {/* HERO GRADIENT CARD BANNER                                            */}
      {/* Direction-aware asymmetric capsule: Flush on right in LTR, flush on left in RTL */}
      {/* ==================================================================== */}
      <div
        className={`w-full pt-10 sm:pt-16 pb-2 sm:pb-3 lg:pb-4 flex ${
          isRTL
            ? 'pr-4 sm:pr-6 lg:pr-10 xl:pr-16 pl-0 justify-start'
            : 'pl-4 sm:pl-6 lg:pl-10 xl:pl-16 pr-0 justify-end'
        }`}
      >
        <div
          className={`relative w-full overflow-hidden shadow-2xl ${
            isRTL
              ? 'rounded-r-[36px] sm:rounded-r-[52px] lg:rounded-r-[9999px] rounded-l-none ml-0'
              : 'rounded-l-[36px] sm:rounded-l-[52px] lg:rounded-l-[9999px] rounded-r-none mr-0'
          }`}
          style={{
            background: 'linear-gradient(135deg, #0099ff 0%, #2962ff 45%, #7928ca 80%, #a822ff 100%)',
          }}
        >
          {/* Tactile noise / subtle grid */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay"
            style={{
              backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* Desktop Asymmetric Layout (Dome Tagline + Columns & Wordmark) */}
          <div className="relative z-10 flex flex-col lg:flex-row justify-between w-full">
            {/* Tagline & Copyright (Inside Capsule Dome with generous breathing space) */}
            <div
              className={`lg:w-[36%] xl:w-[33%] flex flex-col justify-between pt-12 sm:pt-16 lg:pt-20 xl:pt-24 pb-10 sm:pb-14 lg:pb-20 xl:pb-24 ${
                isRTL
                  ? 'pr-8 sm:pr-12 lg:pr-20 xl:pr-28 pl-6 sm:pl-8 text-right'
                  : 'pl-8 sm:pl-12 lg:pl-20 xl:pl-28 pr-6 sm:pr-8 text-left'
              }`}
            >
              <div>
                <h3 className="text-2xl sm:text-3xl lg:text-[32px] xl:text-[36px] font-bold tracking-tight text-white leading-[1.2]">
                  {locale === 'ar' ? (
                    <>
                      ذكاء مالي لمصر.
                      <br />
                      صفقة ورا صفقة!
                    </>
                  ) : (
                    <>
                      Financial intelligence for Egypt.
                      <br />
                      One trade at a time!
                    </>
                  )}
                </h3>
              </div>

              <div className="mt-10 sm:mt-14 lg:mt-auto pt-8 text-xs sm:text-[13px] text-white/80 font-normal leading-relaxed">
                <p>
                  &copy; {currentYear}{' '}
                  {locale === 'ar'
                    ? 'شركة تكنال للحلول التكنولوجية (ش.م.م)'
                    : 'Ticknal Technologies S.A.E.'}
                </p>
                <p className="mt-1 text-white/65">
                  {locale === 'ar'
                    ? 'صُممت مخصوص للمستثمرين وأصحاب القرارات في مصر.'
                    : 'Engineered for high-conviction Egyptian investors.'}
                </p>
              </div>
            </div>

            {/* Navigation, Support, Newsletter & Giant Wordmark */}
            <div
              className={`lg:w-[64%] xl:w-[67%] flex flex-col justify-between pt-6 sm:pt-10 lg:pt-20 xl:pt-24 ${
                isRTL
                  ? 'pl-6 sm:pl-10 lg:pl-14 xl:pl-16 pr-8 sm:pr-12 lg:pr-6 text-right'
                  : 'pr-6 sm:pr-10 lg:pr-14 xl:pr-16 pl-8 sm:pl-12 lg:pl-6 text-left'
              }`}
            >
              {/* Top 3-Column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-8 lg:gap-10 pb-12 lg:pb-16">
                {/* Platform Navigation (3 cols) */}
                <div className="md:col-span-3 flex flex-col">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
                    {locale === 'ar' ? 'المنصة' : 'Platform'}
                  </h4>
                  <ul className="space-y-3 text-xs sm:text-[13px] text-white/80 font-medium">
                    <li>
                      <Link href="/markets" prefetch={false} className="hover:text-white transition-colors">
                        {locale === 'ar' ? 'نظرة عامة عالأسواق' : 'Markets Overview'}
                      </Link>
                    </li>
                    <li>
                      <Link href="/charts" prefetch={false} className="hover:text-white transition-colors">
                        {locale === 'ar' ? 'الرسوم البيانية المتقدمة' : 'SuperCharts'}
                      </Link>
                    </li>
                    <li>
                      <Link href="/news" prefetch={false} className="hover:text-white transition-colors">
                        {locale === 'ar' ? 'الأخبار' : 'News'}
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Support (3 cols) */}
                <div className="md:col-span-3 flex flex-col">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
                    {locale === 'ar' ? 'الدعم والمساعدة' : 'Support'}
                  </h4>
                  <ul className="space-y-3 text-xs sm:text-[13px] text-white/80 font-medium">
                    <li>
                      <Link href="/contact" prefetch={false} className="hover:text-white transition-colors">
                        {locale === 'ar' ? 'تواصل معنا' : 'Contact Us'}
                      </Link>
                    </li>
                    <li>
                      <Link href="/compliance" className="hover:text-white transition-colors">
                        {locale === 'ar' ? 'التوافق مع الرقابة المالية' : 'FRA Compliance'}
                      </Link>
                    </li>
                    <li>
                      <Link href="/privacy" className="hover:text-white transition-colors">
                        {locale === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
                      </Link>
                    </li>
                    <li>
                      <Link href="/terms" className="hover:text-white transition-colors">
                        {locale === 'ar' ? 'شروط الخدمة' : 'Terms of Service'}
                      </Link>
                    </li>
                    <li>
                      <Link href="/disclaimer" className="hover:text-white transition-colors">
                        {locale === 'ar' ? 'إخلاء المسؤولية والمخاطر' : 'Risk Disclosure'}
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Newsletter & Socials (6 cols) */}
                <div className="sm:col-span-2 md:col-span-6 flex flex-col">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3.5">
                    {locale === 'ar' ? 'اشترك عشان يوصلك كل جديد.' : 'Get the Latest from Ticknal.'}
                  </h4>

                  {/* Pill Subscription Input Form: Crisp white border edges & matching white placeholder */}
                  <form onSubmit={handleSubscribe} className="relative w-full max-w-md">
                    <div
                      className="relative flex items-center w-full rounded-full bg-white/[0.08] hover:bg-white/[0.12] focus-within:bg-white/[0.15] transition-all p-1"
                      style={{ border: '2px solid #ffffff' }}
                    >
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={locale === 'ar' ? 'اكتب إيميلك هنا' : 'Email Address'}
                        required
                        suppressHydrationWarning
                        className="w-full bg-transparent px-4 sm:px-5 py-2 text-xs sm:text-sm text-white placeholder-white placeholder:text-white placeholder:opacity-95 outline-hidden font-sans"
                      />
                      <button
                        type="submit"
                        className="rounded-full bg-white text-black font-semibold text-xs sm:text-sm px-6 sm:px-7 py-2 hover:bg-zinc-100 active:scale-95 transition-all shrink-0 cursor-pointer shadow-md flex items-center gap-1.5"
                      >
                        {subscribed ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{locale === 'ar' ? 'تم الاشتراك 👍' : 'Joined'}</span>
                          </>
                        ) : (
                          <span>{locale === 'ar' ? 'اشترك' : 'Subscribe'}</span>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Follow Us Social Icons */}
                  <div className="mt-7">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-white mb-3">
                      {locale === 'ar' ? 'تابعنا على السوشيال ميديا' : 'Follow Us'}
                    </h5>
                    <div className="flex items-center gap-2.5">
                      {/* Instagram */}
                      <a
                        href="https://instagram.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-icon-btn w-8 h-8 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-sm"
                        style={{
                          border: '1.5px solid #ffffff',
                          backgroundColor: 'rgba(255, 255, 255, 0.12)',
                        }}
                        title="Instagram"
                      >
                        <InstagramIcon className="w-3.5 h-3.5 text-white" />
                      </a>
                      {/* TikTok */}
                      <a
                        href="https://tiktok.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-icon-btn w-8 h-8 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-sm"
                        style={{
                          border: '1.5px solid #ffffff',
                          backgroundColor: 'rgba(255, 255, 255, 0.12)',
                        }}
                        title="TikTok"
                      >
                        <TikTokIcon className="w-3.5 h-3.5 text-white" />
                      </a>
                      {/* Telegram */}
                      <a
                        href="https://t.me"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-icon-btn w-8 h-8 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-sm"
                        style={{
                          border: '1.5px solid #ffffff',
                          backgroundColor: 'rgba(255, 255, 255, 0.12)',
                        }}
                        title="Telegram"
                      >
                        <TelegramIcon className="w-3.5 h-3.5 ml-[-1px] text-white" />
                      </a>
                      {/* LinkedIn */}
                      <a
                        href="https://linkedin.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-icon-btn w-8 h-8 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-sm"
                        style={{
                          border: '1.5px solid #ffffff',
                          backgroundColor: 'rgba(255, 255, 255, 0.12)',
                        }}
                        title="LinkedIn"
                      >
                        <LinkedInIcon className="w-3.5 h-3.5 text-white" />
                      </a>
                      {/* Facebook */}
                      <a
                        href="https://facebook.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-icon-btn w-8 h-8 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-sm"
                        style={{
                          border: '1.5px solid #ffffff',
                          backgroundColor: 'rgba(255, 255, 255, 0.12)',
                        }}
                        title="Facebook"
                      >
                        <FacebookIcon className="w-3.5 h-3.5 text-white" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Giant Wordmark: "ticknal" Aligned on the flush edge */}
              <div
                className={`w-full flex ${
                  isRTL ? 'justify-start' : 'justify-end'
                } items-end overflow-hidden pt-6 sm:pt-10 lg:pt-12 -mb-2 sm:-mb-3 lg:-mb-4`}
              >
                <span
                  className="font-semibold text-white select-none leading-none tracking-[-0.04em] text-[14vw] sm:text-[13.5vw] lg:text-[10vw] xl:text-[144px] drop-shadow-sm pointer-events-none block whitespace-nowrap font-euclid"
                  style={{
                    fontFamily: 'EuclidCircularSemibold, Inter, -apple-system, sans-serif',
                  }}
                >
                  ticknal
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

