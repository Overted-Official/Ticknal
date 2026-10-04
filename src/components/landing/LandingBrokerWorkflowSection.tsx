'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTranslation } from '@/lib/i18n';

interface WorkflowStep {
  title: string;
  description: string;
}

const EN_WORKFLOW_STEPS: WorkflowStep[] = [
  {
    title: 'Setup Your Strategies',
    description:
      'Define technical indicators, entry triggers, and stop-loss rules on Ticknal with zero code. Backtest setups across 15+ years of Egyptian market data.',
  },
  {
    title: 'Get Real-Time Alerts',
    description:
      'Ticknal monitors 290+ EGX order books around the clock. The second your strategy conditions trigger, receive instant push and Telegram alerts.',
  },
  {
    title: 'Execute on Your Broker',
    description:
      'Execute trades yourself with 100% conviction directly on Thndr, Telda, EFG Hermes, or your preferred Egyptian broker. Your funds never leave your broker.',
  },
];

const AR_WORKFLOW_STEPS: WorkflowStep[] = [
  {
    title: 'اضبط استراتيجياتك',
    description:
      'حدد المؤشرات الفنية، وإشارات الدخول، وقواعد وقف الخسارة بنقرة زر وبدون كود. اختبر الاستراتيجية على بيانات البورصة المصرية لأكثر من 15 عاماً.',
  },
  {
    title: 'احصل على تنبيهات فورية',
    description:
      'تراقب المنصة دفاتر أوامر أكثر من 290 سهماً مصرياً طوال جلسات التداول. وفور تحقق شروط استراتيجيتك، تصلك تنبيهات لحظية عبر الهاتف وتيليجرام.',
  },
  {
    title: 'نفّذ عبر وسيطك المفضل',
    description:
      'نفّذ أوامر الشراء والبيع بنفسك وبثقة تامة عبر ثندر (Thndr)، تيلدا (Telda)، هيرميس (EFG Hermes)، أو أي وسيط مصري مرخص. أموالك تبقى دائماً في حسابك لدى الوسيط.',
  },
];

function PhoneMockupHero({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ y: 32, opacity: 0.8 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.75,
        delay: index * 0.12 + 0.15,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="relative w-[270px] sm:w-[290px] lg:w-[280px] xl:w-[310px] aspect-[1406/2822] shrink-0 select-none pointer-events-none transition-transform duration-500 ease-out group-hover:-translate-y-2.5"
      style={{
        filter:
          'drop-shadow(0 25px 50px rgba(0,0,0,0.95)) drop-shadow(0 10px 20px rgba(0,0,0,0.85))',
      }}
    >
      {/* 1. Pure OLED Clean Empty Screen (No screens on the phones yet) */}
      <div
        className="absolute bg-black overflow-hidden flex flex-col justify-between items-center"
        style={{
          left: '7.25%',
          top: '3.54%',
          width: '85.78%',
          height: '92.91%',
          borderRadius: '42px',
        }}
      >
        {/* Minimal iOS Status Bar */}
        <div className="h-8 w-full bg-black flex items-center justify-between px-5 text-[10px] font-semibold text-white/35 shrink-0 pt-1.5 select-none">
          <span className="tabular-nums">9:41</span>
          {/* Dynamic Island Pill */}
          <div className="w-16 h-3.5 bg-black rounded-full border border-white/[0.06]" />
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-medium text-white/35">5G</span>
            <div className="w-3.5 h-1.5 rounded-[2px] border border-white/35 p-[1px] flex items-center">
              <div className="w-full h-full bg-white/35 rounded-[0.5px]" />
            </div>
          </div>
        </div>

        {/* Clean Empty State: Subtle Ticknal Monogram at 15% opacity */}
        <div className="flex flex-col items-center justify-center gap-2 opacity-15 pointer-events-none select-none my-auto">
          <Image
            src="/logo-white.svg"
            alt="Ticknal"
            width={38}
            height={38}
            className="object-contain"
          />
        </div>

        {/* iOS Home Indicator Bar */}
        <div className="h-5 w-full flex items-center justify-center pb-2 select-none opacity-25">
          <div className="w-28 h-1 bg-white/40 rounded-full" />
        </div>
      </div>

      {/* 2. Authentic Apple iPhone 16 Pro Black Titanium Hardware Frame Overlay */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/mockups/iphone-16-pro-black.webp"
        alt="iPhone 16 Pro Frame"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
        loading="eager"
      />

      {/* 3. Subtle Glass Specular Glint */}
      <div
        className="absolute inset-[3.54%_7.25%] rounded-[42px] pointer-events-none mix-blend-screen opacity-20 group-hover:opacity-35 transition-opacity duration-500"
        style={{
          background:
            'linear-gradient(125deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 30%, transparent 60%, transparent 100%)',
        }}
      />
    </motion.div>
  );
}

export default function LandingBrokerWorkflowSection() {
  const { locale } = useTranslation();
  const [activeBrokerCard, setActiveBrokerCard] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const workflowSteps = locale === 'ar' ? AR_WORKFLOW_STEPS : EN_WORKFLOW_STEPS;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, clientWidth } = e.currentTarget;
    const index = Math.round(scrollLeft / (clientWidth * 0.85));
    const clamped = Math.min(Math.max(index, 0), workflowSteps.length - 1);
    if (clamped !== activeBrokerCard) {
      setActiveBrokerCard(clamped);
    }
  };

  const scrollToBrokerCard = (index: number) => {
    if (!carouselRef.current) return;
    const cards = carouselRef.current.children;
    if (cards[index]) {
      (cards[index] as HTMLElement).scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
      setActiveBrokerCard(index);
    }
  };

  return (
    <section
      id="brokers"
      className="relative w-full bg-transparent py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06] select-none font-sans overflow-hidden"
    >
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center text-center gap-2 mb-12 sm:mb-16 lg:mb-20 max-w-3xl mx-auto"
        >
          <h2 className="section-title text-center text-white">
            {locale === 'ar'
              ? 'تمنحك المنصة التفوق التحليلي، ووسيطك يتولى التنفيذ.'
              : 'Ticknal gives you edge, Brokers Execute.'}
          </h2>
          <p className="section-subtitle text-center text-zinc-400 max-w-2xl mt-2">
            {locale === 'ar'
              ? 'تعمل المنصة كمحرك لاستراتيجياتك وقراراتك الاستثمارية. تحتفظ بكامل الوصاية على أموالك وتنفذ صفقاتك بنفسك وبأمان عبر وسيطك المصري المرخص المفضل.'
              : 'Ticknal acts as your strategy and decision engine. You retain complete capital custody and execute orders directly through the licensed Egyptian broker of your choice.'}
          </p>
        </motion.div>

        {/* 3-Card Workflow Container: Horizontal Snap Carousel on Mobile, 3-Col Grid on Desktop */}
        <div className="w-full">
          <div
            ref={carouselRef}
            onScroll={handleScroll}
            className="flex lg:grid lg:grid-cols-3 gap-5 sm:gap-6 overflow-x-auto lg:overflow-visible snap-x snap-mandatory scroll-smooth scrollbar-none pb-4 pt-1 px-4 sm:px-6 lg:px-0 -mx-4 sm:-mx-6 lg:mx-0 w-full"
          >
            {workflowSteps.map((step, idx) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{
                  duration: 0.65,
                  delay: idx * 0.12,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="group relative flex flex-col justify-between w-[86vw] max-w-[340px] sm:w-[370px] lg:w-full shrink-0 snap-center rounded-[28px] sm:rounded-[32px] bg-black border border-white/[0.08] hover:border-white/20 hover:shadow-[0_0_40px_rgba(255,255,255,0.03)] transition-all duration-500 overflow-hidden shadow-2xl pt-7 sm:pt-9 px-6 sm:px-8 cursor-default"
              >
                {/* Top Text Content: Clean left-aligned Title + Subtitle */}
                <div className="flex flex-col">
                  {/* Step Phase Badge */}
                  <div className="flex items-center justify-between mb-3 sm:mb-3.5">
                    <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-zinc-400 group-hover:text-zinc-200 group-hover:border-white/20 transition-colors">
                      {locale === 'ar' ? `المرحلة 0${idx + 1}` : `Phase 0${idx + 1}`}
                    </span>
                    <span className="text-xs text-zinc-500 tabular-nums">
                      {locale === 'ar' ? `${idx + 1} من ${workflowSteps.length}` : `${idx + 1} of ${workflowSteps.length}`}
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-[28px] font-semibold text-white tracking-tight leading-tight group-hover:text-white transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-sm sm:text-[15px] text-zinc-400 font-normal leading-relaxed mt-2.5 sm:mt-3">
                    {step.description}
                  </p>
                </div>

                {/* Phone Mockup Stage: Hero scale, bleeding off the bottom of the card */}
                <div className="mt-8 sm:mt-10 relative w-full flex justify-center overflow-hidden h-[340px] sm:h-[380px] lg:h-[360px] xl:h-[390px]">
                  <div className="relative w-full flex justify-center items-start pt-1">
                    <PhoneMockupHero index={idx} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Carousel Pagination Dots on Mobile */}
          <div className="flex lg:hidden items-center justify-center gap-2 mt-4 select-none">
            {workflowSteps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => scrollToBrokerCard(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  activeBrokerCard === idx
                    ? 'w-6 bg-white'
                    : 'w-1.5 bg-white/25 hover:bg-white/40'
                }`}
                aria-label={`Go to card ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
