'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  X,
  Info,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface FeatureItem {
  key: string;
  label: string;
  hasProgressBar?: boolean;
  free: { included: boolean; progress?: number; customText?: string };
  plus: { included: boolean; progress?: number; customText?: string };
  elite: { included: boolean; progress?: number; customText?: string };
}

const PRICING_FEATURES: FeatureItem[] = [
  {
    key: 'CHARTS_PER_TAB',
    label: 'Charts per layout',
    hasProgressBar: true,
    free: { included: true, progress: 25, customText: '2 charts per tab' },
    plus: { included: true, progress: 50, customText: '4 charts per tab' },
    elite: { included: true, progress: 100, customText: '8 charts per tab' },
  },
  {
    key: 'INDICATORS_ON_CHART',
    label: 'Indicators per chart',
    hasProgressBar: true,
    free: { included: true, progress: 20, customText: '5 indicators per chart' },
    plus: { included: true, progress: 40, customText: '10 indicators per chart' },
    elite: { included: true, progress: 100, customText: '25 indicators per chart' },
  },
  {
    key: 'HISTORICAL_BARS',
    label: 'Historical market tick bars',
    hasProgressBar: true,
    free: { included: true, progress: 20, customText: '2K historical bars' },
    plus: { included: true, progress: 50, customText: '10K historical bars' },
    elite: { included: true, progress: 100, customText: '40K historical bars' },
  },
  {
    key: 'PARALLEL_CONNECTIONS',
    label: 'Parallel chart connections',
    hasProgressBar: true,
    free: { included: true, progress: 25, customText: '5 parallel connections' },
    plus: { included: true, progress: 50, customText: '20 parallel connections' },
    elite: { included: true, progress: 100, customText: '100 parallel connections' },
  },
  {
    key: 'PRICE_ALERTS',
    label: 'Price alerts',
    hasProgressBar: true,
    free: { included: false, progress: 0, customText: '0 price alerts' },
    plus: { included: true, progress: 50, customText: '100 price alerts' },
    elite: { included: true, progress: 100, customText: '500 price alerts' },
  },
  {
    key: 'TECHNICAL_ALERTS',
    label: 'Technical alerts',
    hasProgressBar: true,
    free: { included: false, progress: 0, customText: '0 technical alerts' },
    plus: { included: true, progress: 50, customText: '100 technical alerts' },
    elite: { included: true, progress: 100, customText: '500 technical alerts' },
  },
  {
    key: 'PUSH_TELEGRAM_ALERTS',
    label: 'Instant push & Telegram alerts',
    hasProgressBar: true,
    free: { included: false, progress: 0, customText: '0 push & Telegram alerts' },
    plus: { included: true, progress: 50, customText: '25 push & Telegram alerts' },
    elite: { included: true, progress: 100, customText: 'Unlimited push & Telegram' },
  },
  {
    key: 'BREAKOUT_DETECTION',
    label: 'Anomaly breakout detection',
    hasProgressBar: true,
    free: { included: false, progress: 0, customText: 'No breakout detection' },
    plus: { included: true, progress: 50, customText: 'Intraday breakout alerts' },
    elite: { included: true, progress: 100, customText: 'Multi-timeframe breakout engine' },
  },
  {
    key: 'HYDRA_INDICATOR',
    label: 'Hydra Adaptive Momentum Indicator',
    hasProgressBar: false,
    free: { included: false, customText: 'Hydra Indicator' },
    plus: { included: false, customText: 'Hydra Indicator' },
    elite: { included: true, customText: 'Hydra Adaptive Momentum Indicator' },
  },
  {
    key: 'TYPHOON_INDICATOR',
    label: 'Typhoon Volume Imbalance Engine',
    hasProgressBar: false,
    free: { included: false, customText: 'Typhoon Engine' },
    plus: { included: false, customText: 'Typhoon Engine' },
    elite: { included: true, customText: 'Typhoon Volume Imbalance Engine' },
  },
  {
    key: 'CERBERUS_INDICATOR',
    label: 'Cerberus Multi-Factor Confluence',
    hasProgressBar: false,
    free: { included: false, customText: 'Cerberus Confluence' },
    plus: { included: false, customText: 'Cerberus Confluence' },
    elite: { included: true, customText: 'Cerberus Multi-Factor Confluence' },
  },
  {
    key: 'EGX_MARKET_COVERAGE',
    label: '290+ EGX equities & 160+ mutual funds',
    hasProgressBar: false,
    free: { included: true, customText: 'Full EGX equities & funds' },
    plus: { included: true, customText: 'Full EGX equities & funds' },
    elite: { included: true, customText: 'Full EGX equities & funds' },
  },
  {
    key: 'SCREENERS',
    label: 'Market breadth & sector rotation screeners',
    hasProgressBar: false,
    free: { included: true, customText: 'Sector breadth & screeners' },
    plus: { included: true, customText: 'Sector breadth & screeners' },
    elite: { included: true, customText: 'Sector breadth & screeners' },
  },
  {
    key: 'DEVICES_SYNC',
    label: 'Web, desktop and mobile apps',
    hasProgressBar: false,
    free: { included: true, customText: 'Web, desktop & mobile apps' },
    plus: { included: true, customText: 'Web, desktop & mobile apps' },
    elite: { included: true, customText: 'Web, desktop & mobile apps' },
  },
  {
    key: 'NO_ADS',
    label: 'No ads',
    hasProgressBar: false,
    free: { included: true, customText: 'No ads' },
    plus: { included: true, customText: 'No ads' },
    elite: { included: true, customText: 'No ads' },
  },
];

const AR_PRICING_FEATURES: Record<string, { label: string; freeText: string; plusText: string; eliteText: string }> = {
  CHARTS_PER_TAB: {
    label: 'عدد الرسوم البيانية لكل مساحة عمل',
    freeText: 'رسمان بيانيان لكل تبويب',
    plusText: '4 رسوم بيانية لكل تبويب',
    eliteText: '8 رسوم بيانية لكل تبويب',
  },
  INDICATORS_ON_CHART: {
    label: 'المؤشرات لكل رسم بياني',
    freeText: '5 مؤشرات لكل رسم بياني',
    plusText: '10 مؤشرات لكل رسم بياني',
    eliteText: '25 مؤشراً لكل رسم بياني',
  },
  HISTORICAL_BARS: {
    label: 'سجل الشموع والبيانات اللحظية',
    freeText: '2,000 شمعة تاريخية',
    plusText: '10,000 شمعة تاريخية',
    eliteText: '40,000 شمعة تاريخية',
  },
  PARALLEL_CONNECTIONS: {
    label: 'الاتصالات المتوازية للرسوم البيانية',
    freeText: '5 اتصالات متوازية',
    plusText: '20 اتصالاً متوازياً',
    eliteText: '100 اتصال متوازٍ',
  },
  PRICE_ALERTS: {
    label: 'تنبيهات الأسعار',
    freeText: 'بدون تنبيهات أسعار',
    plusText: '100 تنبيه سعر',
    eliteText: '500 تنبيه سعر',
  },
  TECHNICAL_ALERTS: {
    label: 'التنبيهات الفنية',
    freeText: 'بدون تنبيهات فنية',
    plusText: '100 تنبيه فني',
    eliteText: '500 تنبيه فني',
  },
  PUSH_TELEGRAM_ALERTS: {
    label: 'تنبيهات فورية عبر الهاتف وتيليجرام',
    freeText: 'بدون تنبيهات تيليجرام',
    plusText: '25 تنبيهاً فورياً وتيليجرام',
    eliteText: 'تنبيهات غير محدودة عبر الهاتف وتيليجرام',
  },
  BREAKOUT_DETECTION: {
    label: 'كشف الاختراقات السعرية الشاذة',
    freeText: 'بدون كشف اختراقات',
    plusText: 'تنبيهات الاختراق اللحظي أثناء الجلسة',
    eliteText: 'محرك كشف الاختراقات متعدد الأطر الزمنية',
  },
  HYDRA_INDICATOR: {
    label: 'مؤشر Hydra للزخم التكيفي',
    freeText: 'مؤشر Hydra',
    plusText: 'مؤشر Hydra',
    eliteText: 'مؤشر Hydra للزخم التكيفي المتقدم',
  },
  TYPHOON_INDICATOR: {
    label: 'محرك Typhoon لاختلالات أحجام التداول',
    freeText: 'محرك Typhoon',
    plusText: 'محرك Typhoon',
    eliteText: 'محرك Typhoon لاختلالات أحجام التداول',
  },
  CERBERUS_INDICATOR: {
    label: 'نموذج Cerberus لتوافق العوامل المتعددة',
    freeText: 'نموذج Cerberus',
    plusText: 'نموذج Cerberus',
    eliteText: 'نموذج Cerberus لتوافق العوامل المتعددة',
  },
  EGX_MARKET_COVERAGE: {
    label: 'أكثر من 290 سهماً بالبورصة و160 صندوقاً استثمارياً',
    freeText: 'تغطية شاملة لأسهم وصناديق مصر',
    plusText: 'تغطية شاملة لأسهم وصناديق مصر',
    eliteText: 'تغطية شاملة لأسهم وصناديق مصر',
  },
  SCREENERS: {
    label: 'أدوات مسح اتساع السوق ودوران القطاعات',
    freeText: 'اتساع القطاعات وماسح الأسهم',
    plusText: 'اتساع القطاعات وماسح الأسهم',
    eliteText: 'اتساع القطاعات وماسح الأسهم',
  },
  DEVICES_SYNC: {
    label: 'تطبيقات الويب وسطح المكتب والهاتف',
    freeText: 'تطبيقات الويب والديسكتوب والموبايل',
    plusText: 'تطبيقات الويب والديسكتوب والموبايل',
    eliteText: 'تطبيقات الويب والديسكتوب والموبايل',
  },
  NO_ADS: {
    label: 'تجربة نظيفة خالية من الإعلانات',
    freeText: 'بدون إعلانات',
    plusText: 'بدون إعلانات',
    eliteText: 'بدون إعلانات',
  },
};

export default function LandingPricingSection() {
  const { locale, isRTL } = useTranslation();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  // Pricing values in EGP
  const plusMonthly = 50;
  const plusAnnualTotal = 500;
  const plusAnnualMonthly = Math.round(plusAnnualTotal / 12);
  const plusSavedYear = plusMonthly * 12 - plusAnnualTotal; // 100 EGP

  const eliteMonthly = 95;
  const eliteAnnualTotal = 950;
  const eliteAnnualMonthly = Math.round(eliteAnnualTotal / 12);
  const eliteSavedYear = eliteMonthly * 12 - eliteAnnualTotal; // 190 EGP

  const isAnnual = billingCycle === 'annual';

  return (
    <section
      id="pricing"
      className="relative w-full bg-transparent py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-white/[0.06] text-white font-sans overflow-hidden"
    >
      <div className="relative max-w-6xl mx-auto flex flex-col items-center">
        {/* 1. SECTION HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mb-8 sm:mb-10"
        >
          <h2 className="section-title text-center text-white">
            {locale === 'ar'
              ? 'استثمر بثقة وتفوق بأقل من تكلفة صفقة خاسرة واحدة'
              : 'Invest with Conviction for Less Than One Bad Trade'}
          </h2>
          <p className="section-subtitle text-center text-zinc-400 mt-3 sm:mt-4">
            {locale === 'ar'
              ? 'ابدأ مجاناً مع تغطية شاملة لكامل السوق المصري. وقم بالترقية إلى Plus لتنبيهات فورية أو Elite للحصول على المؤشرات الكمية المؤسسية.'
              : 'Start free with full Egyptian market coverage. Upgrade to Plus for real-time alerts or Elite for institutional indicators.'}
          </p>

          {/* Billing Switcher */}
          <div className="mt-8 flex items-center justify-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-pointer group"
            >
              <span
                className={`relative w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                  billingCycle === 'monthly'
                    ? 'border-[#00c6ff] bg-black'
                    : 'border-zinc-600 group-hover:border-zinc-400'
                }`}
              >
                {billingCycle === 'monthly' && (
                  <motion.span
                    layoutId="pricing-billing-dot"
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                    className="w-2 h-2 rounded-full bg-[#00c6ff]"
                  />
                )}
              </span>
              <span
                className={
                  billingCycle === 'monthly'
                    ? 'text-white font-medium'
                    : 'text-zinc-400'
                }
              >
                {locale === 'ar' ? 'شهري' : 'Monthly'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-pointer group"
            >
              <span
                className={`relative w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                  billingCycle === 'annual'
                    ? 'border-[#00c6ff] bg-black'
                    : 'border-zinc-600 group-hover:border-zinc-400'
                }`}
              >
                {billingCycle === 'annual' && (
                  <motion.span
                    layoutId="pricing-billing-dot"
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                    className="w-2 h-2 rounded-full bg-[#00c6ff]"
                  />
                )}
              </span>
              <span
                className={
                  billingCycle === 'annual'
                    ? 'text-white font-medium'
                    : 'text-zinc-400'
                }
              >
                {locale === 'ar' ? 'سنوي' : 'Annual'}
              </span>
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-white/10 text-white border border-white/10 flex items-center gap-1 transition-transform group-hover:scale-105">
                {locale === 'ar' ? 'وفر حتى 17%' : 'Save up to 17%'} <span role="img" aria-label="fire">🔥</span>
              </span>
            </button>
          </div>
        </motion.div>

        {/* 2. THE UNIFIED TABLE WITH MOVING 2PX GRADIENT BORDER */}
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.75, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-5xl"
        >
          {/* Subtle colorful ambient aura behind the table */}
          <div className="absolute -inset-1 rounded-[26px] overflow-hidden pointer-events-none opacity-20 blur-xl">
            <motion.div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: '3200px',
                height: '3200px',
                marginLeft: '-1600px',
                marginTop: '-1600px',
                background:
                  'conic-gradient(from 0deg, #00c6ff 0%, #2962ff 25%, #8a2be2 50%, #ff007a 75%, #00c6ff 100%)',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            />
          </div>

          {/* Table Container with Moving 2px Hairline Gradient Border */}
          <div className="relative w-full rounded-[24px] p-[2px] overflow-hidden shadow-2xl">
            <motion.div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: '3200px',
                height: '3200px',
                marginLeft: '-1600px',
                marginTop: '-1600px',
                background:
                  'conic-gradient(from 0deg, #00c6ff 0%, #2962ff 25%, #8a2be2 50%, #ff007a 75%, #00c6ff 100%)',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              className="pointer-events-none select-none"
            />

            {/* Inner Pure Pitch-Black Content Container */}
            <div className="relative w-full h-full bg-black rounded-[22px] overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.08]">
                {/* COLUMN 1: FREE (Starter) */}
                <div className="flex flex-col justify-between p-5 sm:p-6 lg:p-7">
                  <div>
                    {/* Plan Title */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                        {locale === 'ar' ? 'مجاني' : 'Free'}
                      </h3>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 px-2 py-0.5 rounded bg-white/[0.05] border border-white/10">
                        {locale === 'ar' ? 'البداية' : 'Starter'}
                      </span>
                    </div>

                    {/* Price */}
                    <div className="mt-3">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-bold text-white tabular-nums tracking-tight">
                          0
                        </span>
                        <span className="text-sm font-medium text-zinc-400">
                          {locale === 'ar' ? 'ج.م' : 'EGP'}
                        </span>
                        <span className="text-xs text-zinc-500 font-normal ml-1">
                          {locale === 'ar' ? '/ شهر' : '/ mo'}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 mt-1">
                        {locale === 'ar' ? 'مجاني دائماً' : 'free forever'}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {locale === 'ar' ? 'لا حاجة لبطاقة ائتمان' : 'No credit card required'}
                      </div>
                    </div>

                    {/* Button */}
                    <div className="mt-5">
                      <Link
                        href="/login?mode=signup"
                        className="w-full py-2.5 px-4 rounded-md text-sm font-semibold text-black bg-white hover:bg-neutral-200 hover:shadow-[0_0_24px_rgba(255,255,255,0.25)] active:scale-[0.98] transition-all duration-200 text-center block shadow-sm"
                      >
                        {locale === 'ar' ? 'ابدأ الآن' : 'Start now'}
                      </Link>
                    </div>

                    {/* Condensed Feature Matrix */}
                    <div className="mt-6">
                      <ul className="space-y-3.5">
                        {PRICING_FEATURES.map((feat) => {
                          const status = feat.free;
                          const customText = locale === 'ar'
                            ? AR_PRICING_FEATURES[feat.key]?.freeText || AR_PRICING_FEATURES[feat.key]?.label || feat.label
                            : status.customText || feat.label;

                          return (
                            <li
                              key={feat.key}
                              className="flex items-start gap-2.5 min-h-[40px]"
                            >
                              <span className="shrink-0 mt-0.5">
                                {status.included ? (
                                  <Check className="w-3.5 h-3.5 text-white/80" />
                                ) : (
                                  <X className="w-3.5 h-3.5 text-zinc-600" />
                                )}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-xs sm:text-[13px] leading-tight ${
                                    status.included
                                      ? 'text-zinc-200 font-normal'
                                      : 'text-zinc-600 line-through decoration-zinc-700 font-normal'
                                  }`}
                                >
                                  {customText}
                                </p>
                                {feat.hasProgressBar && (
                                  <div className="w-full h-[2.5px] bg-white/[0.08] rounded-full overflow-hidden mt-1.5">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      whileInView={{
                                        width: status.included ? `${status.progress}%` : '0%',
                                      }}
                                      viewport={{ once: true, amount: 0.2 }}
                                      transition={{
                                        duration: 0.75,
                                        delay: 0.2,
                                        ease: [0.16, 1, 0.3, 1],
                                      }}
                                      className={`h-full rounded-full ${
                                        status.included ? 'bg-white' : 'bg-transparent'
                                      }`}
                                    />
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>

                  {/* Bottom Action Button Mirror */}
                  <div className="mt-6">
                    <Link
                      href="/login?mode=signup"
                      className="w-full py-2.5 px-4 rounded-md text-sm font-semibold text-black bg-white hover:bg-neutral-200 hover:shadow-[0_0_24px_rgba(255,255,255,0.25)] active:scale-[0.98] transition-all duration-200 text-center block shadow-sm"
                    >
                      {locale === 'ar' ? 'ابدأ الآن' : 'Start now'}
                    </Link>
                  </div>
                </div>

                {/* COLUMN 2: PLUS (Most Popular) */}
                <div className="flex flex-col justify-between p-5 sm:p-6 lg:p-7 bg-white/[0.01]">
                  <div>
                    {/* Plan Title */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                        Plus
                      </h3>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-black bg-white px-2 py-0.5 rounded shadow-sm">
                        {locale === 'ar' ? 'الأكثر طلباً' : 'Most Popular'}
                      </span>
                    </div>

                    {/* Price */}
                    <div className="mt-3">
                      <div className="flex items-baseline gap-1">
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.span
                            key={isAnnual ? 'plus-annual' : 'plus-monthly'}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                            className="text-3xl sm:text-4xl font-bold text-white tabular-nums tracking-tight inline-block"
                          >
                            {isAnnual ? plusAnnualMonthly : plusMonthly}
                          </motion.span>
                        </AnimatePresence>
                        <span className="text-sm font-medium text-zinc-400">
                          {locale === 'ar' ? 'ج.م' : 'EGP'}
                        </span>
                        <span className="text-xs text-zinc-500 font-normal ml-1">
                          {locale === 'ar' ? '/ شهر' : '/ mo'}
                        </span>
                      </div>
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={isAnnual ? 'plus-billing-annual' : 'plus-billing-monthly'}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="text-xs text-zinc-400 mt-1"
                        >
                          {isAnnual
                            ? locale === 'ar'
                              ? `تدفع سنوياً (${plusAnnualTotal} ج.م)`
                              : `billed annually (${plusAnnualTotal} EGP)`
                            : locale === 'ar'
                            ? 'تدفع شهرياً'
                            : 'billed monthly'}
                        </motion.div>
                      </AnimatePresence>
                      <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                        {isAnnual ? (
                          <>
                            <span>
                              {locale === 'ar'
                                ? `وفر ${plusSavedYear} ج.م سنوياً`
                                : `Save ${plusSavedYear} EGP a year`}
                            </span>
                            <span
                              title={locale === 'ar' ? `مقارنة بالدفع الشهري. السعر السنوي الكامل ${plusAnnualTotal} ج.م بدلاً من ${plusMonthly * 12} ج.م.` : `Compared to paying monthly. Full annual price is ${plusAnnualTotal} EGP instead of ${plusMonthly * 12} EGP.`}
                              className="inline-flex cursor-help text-zinc-500 hover:text-white"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </span>
                          </>
                        ) : (
                          <span>{locale === 'ar' ? 'تنبيهات فورية ومؤشرات متقدمة' : 'Real-time alerts & indicators'}</span>
                        )}
                      </div>
                    </div>

                    {/* Button */}
                    <div className="mt-5">
                      <Link
                        href="/login?mode=signup"
                        className="w-full py-2.5 px-4 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 hover:shadow-[0_0_24px_rgba(37,99,235,0.4)] active:scale-[0.98] transition-all duration-200 text-center block shadow-sm"
                      >
                        {locale === 'ar' ? 'ابدأ الآن' : 'Start now'}
                      </Link>
                    </div>

                    {/* Condensed Feature Matrix */}
                    <div className="mt-6">
                      <ul className="space-y-3.5">
                        {PRICING_FEATURES.map((feat) => {
                          const status = feat.plus;
                          const customText = locale === 'ar'
                            ? AR_PRICING_FEATURES[feat.key]?.plusText || AR_PRICING_FEATURES[feat.key]?.label || feat.label
                            : status.customText || feat.label;

                          return (
                            <li
                              key={feat.key}
                              className="flex items-start gap-2.5 min-h-[40px]"
                            >
                              <span className="shrink-0 mt-0.5">
                                {status.included ? (
                                  <Check className="w-3.5 h-3.5 text-white/80" />
                                ) : (
                                  <X className="w-3.5 h-3.5 text-zinc-600" />
                                )}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-xs sm:text-[13px] leading-tight ${
                                    status.included
                                      ? 'text-zinc-200 font-normal'
                                      : 'text-zinc-600 line-through decoration-zinc-700 font-normal'
                                  }`}
                                >
                                  {customText}
                                </p>
                                {feat.hasProgressBar && (
                                  <div className="w-full h-[2.5px] bg-white/[0.08] rounded-full overflow-hidden mt-1.5">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      whileInView={{
                                        width: status.included ? `${status.progress}%` : '0%',
                                      }}
                                      viewport={{ once: true, amount: 0.2 }}
                                      transition={{
                                        duration: 0.75,
                                        delay: 0.25,
                                        ease: [0.16, 1, 0.3, 1],
                                      }}
                                      className={`h-full rounded-full ${
                                        status.included ? 'bg-white' : 'bg-transparent'
                                      }`}
                                    />
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>

                  {/* Bottom Action Button Mirror */}
                  <div className="mt-6">
                    <Link
                      href="/login?mode=signup"
                      className="w-full py-2.5 px-4 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 hover:shadow-[0_0_24px_rgba(37,99,235,0.4)] active:scale-[0.98] transition-all duration-200 text-center block shadow-sm"
                    >
                      {locale === 'ar' ? 'ابدأ الآن' : 'Start now'}
                    </Link>
                  </div>
                </div>

                {/* COLUMN 3: ELITE (Institutional Indicators) */}
                <div className="flex flex-col justify-between p-5 sm:p-6 lg:p-7">
                  <div>
                    {/* Plan Title */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                        Elite
                      </h3>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-pink-300 px-2 py-0.5 rounded bg-pink-500/10 border border-pink-500/20">
                        {locale === 'ar' ? 'التفوق المؤسسي' : 'State-of-the-Art'}
                      </span>
                    </div>

                    {/* Price */}
                    <div className="mt-3">
                      <div className="flex items-baseline gap-1">
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.span
                            key={isAnnual ? 'elite-annual' : 'elite-monthly'}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                            className="text-3xl sm:text-4xl font-bold text-white tabular-nums tracking-tight inline-block"
                          >
                            {isAnnual ? eliteAnnualMonthly : eliteMonthly}
                          </motion.span>
                        </AnimatePresence>
                        <span className="text-sm font-medium text-zinc-400">
                          {locale === 'ar' ? 'ج.م' : 'EGP'}
                        </span>
                        <span className="text-xs text-zinc-500 font-normal ml-1">
                          {locale === 'ar' ? '/ شهر' : '/ mo'}
                        </span>
                      </div>
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={isAnnual ? 'elite-billing-annual' : 'elite-billing-monthly'}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="text-xs text-zinc-400 mt-1"
                        >
                          {isAnnual
                            ? locale === 'ar'
                              ? `تدفع سنوياً (${eliteAnnualTotal} ج.م)`
                              : `billed annually (${eliteAnnualTotal} EGP)`
                            : locale === 'ar'
                            ? 'تدفع شهرياً'
                            : 'billed monthly'}
                        </motion.div>
                      </AnimatePresence>
                      <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                        {isAnnual ? (
                          <>
                            <span>
                              {locale === 'ar'
                                ? `وفر ${eliteSavedYear} ج.م سنوياً`
                                : `Save ${eliteSavedYear} EGP a year`}
                            </span>
                            <span
                              title={locale === 'ar' ? `مقارنة بالدفع الشهري. السعر السنوي الكامل ${eliteAnnualTotal} ج.م بدلاً من ${eliteMonthly * 12} ج.م.` : `Compared to paying monthly. Full annual price is ${eliteAnnualTotal} EGP instead of ${eliteMonthly * 12} EGP.`}
                              className="inline-flex cursor-help text-zinc-500 hover:text-white"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </span>
                          </>
                        ) : (
                          <span>{locale === 'ar' ? 'تفوق كمي مؤسسي متكامل' : 'Institutional quantitative edge'}</span>
                        )}
                      </div>
                    </div>

                    {/* Button */}
                    <div className="mt-5">
                      <Link
                        href="/login?mode=signup"
                        className="w-full py-2.5 px-4 rounded-md text-sm font-semibold text-black bg-white hover:bg-neutral-200 hover:shadow-[0_0_24px_rgba(255,255,255,0.25)] active:scale-[0.98] transition-all duration-200 text-center block shadow-sm"
                      >
                        {locale === 'ar' ? 'ابدأ الآن' : 'Start now'}
                      </Link>
                    </div>

                    {/* Condensed Feature Matrix */}
                    <div className="mt-6">
                      <ul className="space-y-3.5">
                        {PRICING_FEATURES.map((feat) => {
                          const status = feat.elite;
                          const isCustomIndicator =
                            feat.key === 'HYDRA_INDICATOR' ||
                            feat.key === 'TYPHOON_INDICATOR' ||
                            feat.key === 'CERBERUS_INDICATOR';
                          const customText = locale === 'ar'
                            ? AR_PRICING_FEATURES[feat.key]?.eliteText || AR_PRICING_FEATURES[feat.key]?.label || feat.label
                            : status.customText || feat.label;

                          return (
                            <li
                              key={feat.key}
                              className="flex items-start gap-2.5 min-h-[40px]"
                            >
                              <span className="shrink-0 mt-0.5">
                                {status.included ? (
                                  <Check className="w-3.5 h-3.5 text-white/80" />
                                ) : (
                                  <X className="w-3.5 h-3.5 text-zinc-600" />
                                )}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-xs sm:text-[13px] leading-tight ${
                                    isCustomIndicator
                                      ? 'text-white font-medium'
                                      : status.included
                                      ? 'text-zinc-200 font-normal'
                                      : 'text-zinc-600 line-through decoration-zinc-700 font-normal'
                                  }`}
                                >
                                  {customText}
                                </p>
                                {feat.hasProgressBar && (
                                  <div className="w-full h-[2.5px] bg-white/[0.08] rounded-full overflow-hidden mt-1.5">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      whileInView={{
                                        width: status.included ? `${status.progress}%` : '0%',
                                      }}
                                      viewport={{ once: true, amount: 0.2 }}
                                      transition={{
                                        duration: 0.75,
                                        delay: 0.3,
                                        ease: [0.16, 1, 0.3, 1],
                                      }}
                                      className={`h-full rounded-full ${
                                        status.included ? 'bg-white' : 'bg-transparent'
                                      }`}
                                    />
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>

                  {/* Bottom Action Button Mirror */}
                  <div className="mt-6">
                    <Link
                      href="/login?mode=signup"
                      className="w-full py-2.5 px-4 rounded-md text-sm font-semibold text-black bg-white hover:bg-neutral-200 hover:shadow-[0_0_24px_rgba(255,255,255,0.25)] active:scale-[0.98] transition-all duration-200 text-center block shadow-sm"
                    >
                      {locale === 'ar' ? 'ابدأ الآن' : 'Start now'}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 3. AVAILABLE PAYMENT METHODS IN EGYPT */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.65, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-5xl mx-auto mt-12 flex flex-col items-center"
        >
          <div className="flex items-center gap-2 mb-4 text-xs font-medium uppercase tracking-wider text-zinc-400">
            <CreditCard className="w-4 h-4 text-zinc-400" />
            <span>{locale === 'ar' ? 'طرق الدفع المتاحة في مصر' : 'Available Payment Methods in Egypt'}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-w-4xl">
            {/* 1. InstaPay Pill */}
            <div className="inline-flex items-center gap-3 px-4 py-2 sm:py-2.5 rounded-full bg-white/[0.03] border border-white/[0.08] hover:border-white/25 hover:bg-white/[0.07] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 select-none shadow-sm cursor-default">
              <div className="relative w-8 sm:w-9 h-8 sm:h-9 rounded-full overflow-hidden bg-white border border-white/15 flex items-center justify-center shrink-0 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/payments/instapay.png"
                  alt="InstaPay"
                  className="w-full h-full object-contain p-0.5 rounded-full"
                />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-white tracking-tight">
                InstaPay
              </span>
            </div>

            {/* 2. Vodafone Cash Pill */}
            <div className="inline-flex items-center gap-3 px-4 py-2 sm:py-2.5 rounded-full bg-white/[0.03] border border-white/[0.08] hover:border-white/25 hover:bg-white/[0.07] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 select-none shadow-sm cursor-default">
              <div className="relative w-8 sm:w-9 h-8 sm:h-9 rounded-full overflow-hidden bg-[#e60000] border border-white/15 flex items-center justify-center shrink-0 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/payments/vodafone.png"
                  alt="Vodafone Cash"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-white tracking-tight">
                Vodafone Cash
              </span>
            </div>

            {/* 3. Visa & Mastercard Pill */}
            <div className="inline-flex items-center gap-3 px-4 py-2 sm:py-2.5 rounded-full bg-white/[0.03] border border-white/[0.08] hover:border-white/25 hover:bg-white/[0.07] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 select-none shadow-sm cursor-default">
              <div className="relative w-8 sm:w-9 h-8 sm:h-9 rounded-full overflow-hidden bg-zinc-900 border border-white/15 flex items-center justify-center shrink-0 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/payments/cards.svg"
                  alt="Visa & Mastercard"
                  className="w-full h-full object-contain p-1 rounded-full"
                />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-white tracking-tight">
                Visa & Mastercard
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 text-xs text-zinc-500 font-normal">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{locale === 'ar' ? '100% بالجنيه المصري' : '100% Local Currency (EGP)'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{locale === 'ar' ? 'بدون قيود على بطاقات الدفع بالعملة الأجنبية' : 'No Foreign Currency Limit Issues'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{locale === 'ar' ? 'تفعيل فوري وآلي للاشتراك' : 'Instant Automated Activation'}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
