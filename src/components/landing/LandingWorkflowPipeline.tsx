'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/lib/i18n';

interface StepData {
  id: string;
  stepNumber: string;
  title: string;
  description: string;
  pills: string[];
}

const EN_STEPS: StepData[] = [
  {
    id: 'discover',
    stepNumber: '01',
    title: 'Spot the Trend in One Glance.',
    description:
      'Stop relying on unverified Facebook tips and Telegram rumors. Track institutional hot money in real-time—see whether Foreign, Arab, and Egyptian institutions are accumulating or offloading before you enter.',
    pills: ['Real-time Net Flow', 'Sector Breadth & Heatmap'],
  },
  {
    id: 'validate',
    stepNumber: '02',
    title: 'Test Your Idea with Zero Code.',
    description:
      "Don't gamble your capital on a hunch. Pick from 50+ institutional indicators with point-and-click simplicity, and backtest your setup against 5+ years of Egyptian market data in seconds.",
    pills: ['Point & Click Indicator Selection', 'Instant Win Rate & Profit Factor'],
  },
  {
    id: 'automate',
    stepNumber: '03',
    title: 'Set It and Walk Away.',
    description:
      "You don't have to stare at charts for hours. Define your rules once; Ticknal monitors the market 24/7 and delivers real-time push alerts to your phone the second a setup triggers.",
    pills: ['24/7 Background Market Scanning', 'Instant Telegram & Push Notifications'],
  },
];

const AR_STEPS: StepData[] = [
  {
    id: 'discover',
    stepNumber: '01',
    title: 'رصد الاتجاه بنظرة واحدة.',
    description:
      'توقف عن الاعتماد على شائعات تيليجرام وتوصيات فيسبوك غير الموثقة. تتبع سيولة المؤسسات في الوقت الفعلي — واعرف توجهات المؤسسات الأجنبية والعربية والمصرية قبل دخول الصفقة.',
    pills: ['صافي تدفقات السيولة الفورية', 'اتساع القطاعات والخريطة الحرارية'],
  },
  {
    id: 'validate',
    stepNumber: '02',
    title: 'اختبر استراتيجيتك بدون كتابة سطر كود.',
    description:
      'لا تخاطر برأس مالك على مجرد تخمين. اختر من بين أكثر من 50 مؤشراً فنياً مؤسسياً بنقرة زر، واختبر استراتيجيتك بأثر رجعي على بيانات البورصة المصرية لأكثر من 5 سنوات في ثوانٍ.',
    pills: ['اختيار المؤشرات بنقرة زر', 'نسبة النجاح وعامل الربح اللحظي'],
  },
  {
    id: 'automate',
    stepNumber: '03',
    title: 'اضبط التنبيهات وانطلق.',
    description:
      'لست مضطراً للجلوس لساعات أمام الشاشات. حدد شروط استراتيجيتك مرة واحدة، وتتولى المنصة مراقبة السوق على مدار الساعة وإرسال تنبيهات فورية لهاتفك فور تحقق الشروط.',
    pills: ['مسح السوق المستمر على مدار الساعة', 'تنبيهات فورية عبر الهاتف وتيليجرام'],
  },
];

// Tablet Mockup Component (iPad Pro 13" Landscape)
function TabletMockupStage({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative aspect-[2952/2264] shrink-0 select-none pointer-events-none ${className}`}
      style={{
        filter:
          'drop-shadow(0 25px 50px rgba(0,0,0,0.85)) drop-shadow(0 8px 18px rgba(0,0,0,0.7))',
      }}
    >
      {/* 1. OLED Screen Layer */}
      <div
        className="absolute bg-black overflow-hidden flex flex-col justify-between items-center"
        style={{
          left: '3.5%',
          top: '4.6%',
          width: '93.0%',
          height: '90.8%',
          borderRadius: '3.2%',
        }}
      >
        {/* Minimal iPad Status Bar */}
        <div className="w-full h-6 sm:h-7 flex items-center justify-between px-5 opacity-25 select-none pt-1">
          <span className="text-[10px] font-medium tracking-wider text-zinc-400 tabular-nums">9:41</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            <div className="w-3.5 h-1.5 rounded-[2px] border border-zinc-500" />
          </div>
        </div>

        {/* Clean Center Monogram */}
        <div className="flex flex-col items-center justify-center gap-1.5 opacity-20 pointer-events-none select-none my-auto">
          <Image
            src="/logo-white.svg"
            alt="Ticknal"
            width={38}
            height={38}
            className="object-contain"
          />
        </div>

        {/* Home Indicator */}
        <div className="w-full h-5 flex items-center justify-center pb-2 select-none opacity-25">
          <div className="w-24 h-0.5 bg-white/30 rounded-full" />
        </div>
      </div>

      {/* 2. Apple iPad Pro 13" Landscape Hardware Frame Overlay */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/mockups/ipad-pro-13-landscape-black.webp"
        alt="iPad Pro 13 Frame"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
        loading="lazy"
      />

      {/* 3. Specular Glint */}
      <div
        className="absolute inset-[4.6%_3.5%] rounded-[3.2%] pointer-events-none mix-blend-screen opacity-20"
        style={{
          background:
            'linear-gradient(118deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 28%, transparent 52%, transparent 100%)',
        }}
      />
    </div>
  );
}

export default function LandingWorkflowPipeline() {
  const { locale, isRTL } = useTranslation();
  const [activeStep, setActiveStep] = useState(0);
  const [activeMobileCard, setActiveMobileCard] = useState(0);
  const mobileCarouselRef = useRef<HTMLDivElement>(null);

  const steps = locale === 'ar' ? AR_STEPS : EN_STEPS;

  const handleNext = () => {
    setActiveStep((prev) => (prev + 1) % steps.length);
  };

  const handleMobileScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, clientWidth } = e.currentTarget;
    const index = Math.round(scrollLeft / (clientWidth * 0.85));
    const clamped = Math.min(Math.max(index, 0), steps.length - 1);
    if (clamped !== activeMobileCard) {
      setActiveMobileCard(clamped);
    }
  };

  const scrollToMobileCard = (index: number) => {
    if (!mobileCarouselRef.current) return;
    const cards = mobileCarouselRef.current.children;
    if (cards[index]) {
      (cards[index] as HTMLElement).scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
      setActiveMobileCard(index);
    }
  };

  return (
    <section
      id="workflow-pipeline"
      className="relative w-full bg-transparent select-none font-sans py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06] overflow-hidden"
    >
      <div className="w-full max-w-[1360px] mx-auto">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center gap-2 mb-12 sm:mb-16 lg:mb-20 max-w-2xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="section-title text-center text-white"
          >
            {locale === 'ar'
              ? 'لا داعي لمتابعة كل شاردة وواردة بنفسك.'
              : 'You Don\'t Have to Watch Everything.'}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="section-subtitle text-center text-zinc-400"
          >
            {locale === 'ar'
              ? 'في ثلاث خطوات واضحة، تفلتر المنصة الضوضاء اليومية وتحول بيانات السوق المصري إلى قرارات استثمارية دقيقة وحاسمة.'
              : 'In three simple steps, Ticknal cuts through the daily noise and turns the entire Egyptian market into clear, effortless decisions.'}
          </motion.p>
        </div>

        {/* MOBILE VIEW (< lg): Swipeable Horizontal Card Carousel */}
        <div className="flex flex-col lg:hidden w-full">
          {/* Snap Carousel Container */}
          <div
            ref={mobileCarouselRef}
            onScroll={handleMobileScroll}
            className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none gap-4 sm:gap-5 pb-4 pt-1 px-4 sm:px-6 -mx-4 sm:-mx-6"
          >
            {steps.map((step, idx) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="w-[86vw] max-w-[340px] sm:w-[370px] shrink-0 snap-center rounded-[28px] bg-black border border-white/[0.08] flex flex-col justify-between overflow-hidden shadow-2xl p-5 sm:p-6"
              >
                {/* Top: Step Badge & Step Content */}
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#0099ff]">
                      {locale === 'ar' ? `الخطوة ${step.stepNumber}` : `Step ${step.stepNumber}`}
                    </span>
                    <span className="text-xs text-zinc-500 tabular-nums">
                      {locale === 'ar' ? `${idx + 1} من ${steps.length}` : `${idx + 1} of ${steps.length}`}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                    {step.title}
                  </h3>

                  <p className="text-xs sm:text-[13px] text-zinc-400 font-normal leading-relaxed mt-2.5">
                    {step.description}
                  </p>

                  {/* Benefit Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-3">
                    {step.pills.map((pill) => (
                      <span
                        key={pill}
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-[10px] text-zinc-300 font-medium"
                      >
                        <CheckCircle2 className="w-3 h-3 text-[#0099ff] shrink-0" />
                        {pill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom: Signature Gradient Showcase with Tablet Mockup */}
                <div
                  className="mt-5 relative w-full rounded-2xl overflow-hidden py-5 px-3 flex items-center justify-center shadow-lg"
                  style={{
                    background:
                      'linear-gradient(135deg, #0099ff 0%, #2962ff 45%, #7928ca 80%, #a822ff 100%)',
                  }}
                >
                  {/* Subtle micro-texture */}
                  <div
                    className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay"
                    style={{
                      backgroundImage:
                        'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)',
                      backgroundSize: '20px 20px',
                    }}
                  />

                  <TabletMockupStage className="w-[240px] sm:w-[270px]" />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Carousel Pagination Dots */}
          <div className="flex items-center justify-center gap-2 mt-4 select-none">
            {steps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => scrollToMobileCard(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  activeMobileCard === idx
                    ? 'w-6 bg-white'
                    : 'w-1.5 bg-white/25 hover:bg-white/40'
                }`}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* DESKTOP VIEW (lg:): Interactive Stepper (Left) + Gradient Tablet (Right) */}
        <div className="hidden lg:grid grid-cols-12 gap-10 lg:gap-14 xl:gap-20 items-center w-full">
          {/* LEFT COLUMN: Segmented Indicator & Interactive Stepper (5 Cols) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 flex flex-col justify-center"
          >
            {/* Top Multi-Segment Progress Line with sliding indicator */}
            <div className="flex items-center gap-2.5 mb-8 sm:mb-10 w-full max-w-md">
              {steps.map((step, idx) => {
                const isActive = activeStep === idx;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveStep(idx)}
                    className="relative flex-1 h-[3px] rounded-full bg-white/15 cursor-pointer overflow-hidden py-1 -my-1"
                    title={`Step ${step.stepNumber}: ${step.title}`}
                  >
                    <div className="w-full h-[3px] rounded-full bg-white/15 relative overflow-hidden">
                      {isActive && (
                        <motion.div
                          layoutId="pipeline-active-indicator"
                          className="absolute inset-0 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                          transition={{
                            type: 'spring',
                            stiffness: 350,
                            damping: 32,
                          }}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Steps Accordion List */}
            <div className="flex flex-col divide-y divide-white/[0.06]">
              {steps.map((step, idx) => {
                const isActive = activeStep === idx;

                return (
                  <div key={step.id} className="py-4 first:pt-0 last:pb-0">
                    {/* Header Row Button */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveStep(idx)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setActiveStep(idx);
                        }
                      }}
                      className="w-full text-left rtl:text-right flex items-center justify-between gap-4 cursor-pointer group select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`text-xs font-semibold uppercase tracking-wider transition-colors duration-200 shrink-0 ${
                            isActive ? 'text-[#0099ff]' : 'text-zinc-600 group-hover:text-zinc-400'
                          }`}
                        >
                          {locale === 'ar' ? `الخطوة ${step.stepNumber}` : `Step ${step.stepNumber}`}
                        </span>
                        <span className="text-zinc-700 shrink-0">•</span>
                        <h3
                          className={`text-xl sm:text-2xl lg:text-[28px] font-bold tracking-tight transition-colors duration-200 leading-[1.2] ${
                            isActive
                              ? 'text-white'
                              : 'text-zinc-600 group-hover:text-zinc-300'
                          }`}
                        >
                          {step.title}
                        </h3>
                      </div>

                      {isActive && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNext();
                          }}
                          className="w-10 h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.16] active:scale-95 border border-white/15 flex items-center justify-center text-white shrink-0 cursor-pointer transition-all duration-200 shadow-sm group/btn"
                          title="Next step"
                          aria-label="Next step"
                        >
                          <ArrowRight className="w-4 h-4 text-white transition-transform group-hover/btn:translate-x-0.5 rtl:rotate-180 rtl:group-hover/btn:-translate-x-0.5" />
                        </button>
                      )}
                    </div>

                    {/* Smooth Expandable Body */}
                    <AnimatePresence initial={false}>
                      {isActive && (
                        <motion.div
                          key={`body-${step.id}`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="pt-3 pb-2">
                            <p className="text-sm sm:text-base text-zinc-400 font-normal leading-relaxed max-w-md">
                              {step.description}
                            </p>

                            {/* Clean Benefit Pills */}
                            <div className="flex flex-wrap gap-2 pt-4">
                              {step.pills.map((pill) => (
                                <span
                                  key={pill}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs text-zinc-300 font-medium"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0099ff] shrink-0" />
                                  {pill}
                                </span>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* RIGHT COLUMN: Signature Gradient Container with Tablet Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 flex items-center justify-center"
          >
            <div
              className="relative w-full max-w-[580px] lg:max-w-none rounded-[36px] sm:rounded-[48px] overflow-hidden shadow-2xl flex items-center justify-center py-10 sm:py-14 px-6 sm:px-10 group"
              style={{
                background:
                  'linear-gradient(135deg, #0099ff 0%, #2962ff 45%, #7928ca 80%, #a822ff 100%)',
              }}
            >
              {/* Subtle tactile micro-texture */}
              <div
                className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay"
                style={{
                  backgroundImage:
                    'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />

              {/* Ambient soft glow pulse */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-[48px] blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-700 pointer-events-none" />

              {/* Tablet Mockup (iPad Pro 13" Landscape) with step-change subtle settle */}
              <motion.div
                key={activeStep}
                initial={{ scale: 0.982, opacity: 0.9 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full flex items-center justify-center [perspective:1200px]"
              >
                <div className="transition-transform duration-500 ease-out hover:[transform:rotateX(2deg)_rotateY(-2deg)]">
                  <TabletMockupStage className="w-[340px] sm:w-[420px] md:w-[480px] lg:w-[500px] xl:w-[560px]" />
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
