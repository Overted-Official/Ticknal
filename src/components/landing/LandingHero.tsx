'use client';

import React from 'react';
import Link from 'next/link';
import LandingDeviceStage from '@/components/landing/LandingDeviceStage';
import HeroLightCables from '@/components/landing/HeroLightCables';
import { useTranslation } from '@/lib/i18n';

export default function LandingHero() {
  const { locale, isRTL } = useTranslation();

  return (
    <section className="relative w-full bg-transparent text-white flex flex-col items-center justify-start px-4 sm:px-6 pt-20 sm:pt-24 md:pt-28 pb-0 select-none font-sans overflow-hidden">
      {/* Interactive WebGL Light Cables Background Limited to Hero */}
      <HeroLightCables />

      {/* Centralized High-Impact Typography & CTA */}
      <div className="relative max-w-3xl w-full mx-auto flex flex-col items-center text-center z-10 mb-4 sm:mb-6 px-4 py-2">
        {/* Main Title - Clear, Authoritative, High-Impact 2-Liner */}
        <h1
          className="text-3xl sm:text-5xl md:text-[54px] font-semibold text-white tracking-[-0.03em] leading-[1.14]"
          style={{
            fontFamily: locale === 'ar' ? 'var(--font-cairo), sans-serif' : 'EuclidCircularSemibold, sans-serif',
            textShadow: '0 2px 24px rgba(0,0,0,0.85), 0 0 40px rgba(0,0,0,0.6)',
          }}
        >
          <span className="block">
            {locale === 'ar' ? 'كل استثماراتك في مصر.' : 'Every Investment in Egypt.'}
          </span>
          <span
            className="block bg-clip-text text-transparent mt-0.5 sm:mt-1"
            style={{
              backgroundImage: 'linear-gradient(90deg, #0099ff 0%, #2962ff 50%, #a822ff 100%)',
            }}
          >
            {locale === 'ar' ? 'في مكان واحد.' : 'In One Place.'}
          </span>
        </h1>

        {/* Subtitle - Quantitative Signals & Technical Intelligence */}
        <p
          className="text-sm sm:text-base md:text-lg text-zinc-400 font-sans font-normal max-w-xl leading-relaxed mt-4 mb-7"
          style={{ textShadow: '0 1px 12px rgba(0,0,0,0.9)' }}
        >
          {locale === 'ar'
            ? 'شارتات بمستوى مؤسسي، إشارات كمّية مدروسة، وتحليلات لحظية للبورصة المصرية — معمولة مخصوص للمستثمر اللي مابيعتمدش على الحظ.'
            : 'Institutional technical charting, quantitative signals, and real-time market intelligence — built for high-conviction Egyptian traders.'}
        </p>

        {/* Action Button - Prominent Wide Gradient Slash Button */}
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="group relative inline-flex items-center justify-center min-w-[200px] sm:min-w-[230px] pl-8 pr-10 rtl:pl-10 rtl:pr-8 py-3 sm:py-3.5 font-sans text-sm sm:text-[15px] font-semibold text-white shadow-[0_4px_24px_rgba(41,98,255,0.4)] transition-all hover:brightness-110 hover:shadow-[0_6px_32px_rgba(41,98,255,0.6)] active:scale-95 cursor-pointer rounded-l-md rtl:rounded-l-none rtl:rounded-r-md"
            style={{
              background: 'linear-gradient(90deg, #0099ff 0%, #2962ff 50%, #a822ff 100%)',
              clipPath: isRTL
                ? 'polygon(10px 0%, 100% 0%, 100% 100%, 0% 100%)'
                : 'polygon(0% 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)',
            }}
          >
            <span className="tracking-tight whitespace-nowrap">
              {locale === 'ar' ? 'افتح المنصة دلوقتي' : 'Launch Terminal'}
            </span>
          </Link>
        </div>
      </div>

      {/* 3D Photorealistic Multi-Device Staging (Tablet SuperChart + Mobile Signals) */}
      <div className="w-full relative z-10">
        <LandingDeviceStage />
      </div>
    </section>
  );
}
