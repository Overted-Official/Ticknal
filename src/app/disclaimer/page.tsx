'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import { useTranslation } from '@/lib/i18n';

export default function RiskDisclaimerPage() {
  const { locale, isRTL } = useTranslation();
  const [activeTab, setActiveTab] = useState('capital-risk');

  const navigationSections = locale === 'ar' ? [
    { id: 'capital-risk', num: '01', title: 'مخاطر رأس المال وتقلبات السوق' },
    { id: 'equities-fx', num: '02', title: 'أسهم البورصة ومخاطر الصرف والتضخم' },
    { id: 'funds', num: '03', title: 'صناديق الاستثمار وأسواق النقد' },
    { id: 'bullion', num: '04', title: 'السبائك والمعادن وأسعار الذهب' },
    { id: 'backtests', num: '05', title: 'المحاكاة الافتراضية والنماذج الكمية' },
    { id: 'market-data', num: '06', title: 'بيانات التداول وتأخر التحديثات' },
    { id: 'indemnification', num: '07', title: 'تحديد المسؤولية والتعويض القانوني' },
  ] : [
    { id: 'capital-risk', num: '01', title: 'Capital Risk & Market Volatility' },
    { id: 'equities-fx', num: '02', title: 'EGX Equities, FX & Inflation' },
    { id: 'funds', num: '03', title: 'Mutual & Money Market Funds' },
    { id: 'bullion', num: '04', title: 'Physical Bullion & Gold Pricing' },
    { id: 'backtests', num: '05', title: 'Hypothetical Simulations & Models' },
    { id: 'market-data', num: '06', title: 'Exchange Data & Delay Disclaimers' },
    { id: 'indemnification', num: '07', title: 'Limitation of Liability & Indemnity' },
  ];

  const scrollToSection = (id: string) => {
    setActiveTab(id);
    const element = document.getElementById(id);
    if (element) {
      const topOffset = 110;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition - topOffset,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-black text-white font-sans selection:bg-white selection:text-black">
      {/* Top Floating Glass Navigation */}
      <LandingNavbar />

      {/* Main Wide Layout Container */}
      <main className="relative z-10 w-full pt-28 sm:pt-36 pb-20 sm:pb-28 px-6 sm:px-10 lg:px-14 xl:px-20 max-w-[1400px] mx-auto">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs sm:text-[13px] text-zinc-400 mb-8 font-medium">
          <Link href="/" className="hover:text-white transition-colors">
            {locale === 'ar' ? 'الرئيسية' : 'Home'}
          </Link>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-300">{locale === 'ar' ? 'الشؤون القانونية والتنظيمية' : 'Legal & Regulatory'}</span>
          <span className="text-zinc-600">/</span>
          <span className="text-white">{locale === 'ar' ? 'إفصاح المخاطر وإخلاء المسؤولية' : 'Risk Disclosure'}</span>
        </nav>

        {/* Hero Section Header */}
        <header className="border-b border-white/10 pb-10 sm:pb-14 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/[0.03] text-zinc-300 text-[11px] font-semibold mb-5 tracking-wider uppercase">
            {locale === 'ar' ? 'إفصاح قانوني للمخاطر • جمهورية مصر العربية' : 'Statutory Risk Disclosure • Arab Republic of Egypt'}
          </div>

          <h1
            className="text-3xl sm:text-5xl lg:text-[56px] font-semibold text-white tracking-tight leading-[1.12] mb-5 max-w-5xl font-euclid"
            style={{ fontFamily: 'EuclidCircularSemibold, sans-serif' }}
          >
            {locale === 'ar' ? (
              <>
                إفصاح المخاطر و{' '}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: 'linear-gradient(90deg, #0099ff 0%, #2962ff 50%, #a822ff 100%)',
                  }}
                >
                  إخلاء المسؤولية المالية
                </span>
              </>
            ) : (
              <>
                Risk Disclosure &{' '}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: 'linear-gradient(90deg, #0099ff 0%, #2962ff 50%, #a822ff 100%)',
                  }}
                >
                  Market Disclaimer
                </span>
              </>
            )}
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-4xl leading-relaxed font-normal">
            {locale === 'ar'
              ? 'إفصاح شامل عن المخاطر المالية، وتقلبات الأصول، والديناميكيات الاقتصادية الكلية، وتحديد المسؤولية البرمجية المرتبطة بتداول الأوراق المالية والمعادن الثمينة في مصر.'
              : 'Comprehensive disclosure of financial risks, asset volatility, macroeconomic dynamics, and limitation of software liability associated with trading securities and precious metals in Egypt.'}
          </p>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 mt-8 text-xs text-zinc-400 font-medium">
            <div>
              <span className="text-zinc-300">{locale === 'ar' ? 'تاريخ السريان:' : 'Effective Date:'}</span>{' '}
              {locale === 'ar' ? 'أكتوبر 2026' : 'October 2026'}
            </div>
            <div className="hidden sm:inline text-zinc-700">•</div>
            <div>
              <span className="text-zinc-300">{locale === 'ar' ? 'جهة الاختصاص القضائي:' : 'Governing Jurisdiction:'}</span>{' '}
              {locale === 'ar' ? 'جمهورية مصر العربية' : 'Arab Republic of Egypt'}
            </div>
            <div className="hidden sm:inline text-zinc-700">•</div>
            <div>
              <span className="text-zinc-300">{locale === 'ar' ? 'الكيان القانوني:' : 'Corporate Entity:'}</span>{' '}
              {locale === 'ar' ? 'شركة تكنال للحلول التكنولوجية (ش.م.م)' : 'Ticknal Technologies S.A.E.'}
            </div>
          </div>
        </header>

        {/* High-Impact Executive Summary Grid */}
        <section aria-label="Executive Summary" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-16 sm:mb-20">
          <div className="p-6 rounded-xl border border-white/10 bg-black hover:border-white/20 transition-colors flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                {locale === 'ar' ? '01 / مخاطر رأس المال' : '01 / Capital Risk'}
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                {locale === 'ar' ? 'احتمالية خسارة رأس المال' : 'Substantial Loss Potential'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {locale === 'ar'
                  ? 'ينطوي تداول الأسهم المصرية وصناديق الاستثمار والسبائك على مخاطر مالية جوهرية، بما في ذلك إمكانية خسارة كامل رأس المال المستثمر.'
                  : 'Trading Egyptian equities, mutual funds, and physical bullion carries substantial risk of principal loss, including the possible loss of all invested capital.'}
              </p>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-black hover:border-white/20 transition-colors flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                {locale === 'ar' ? '02 / النماذج الكمية' : '02 / Quantitative Models'}
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                {locale === 'ar' ? 'المحاكاة الافتراضية' : 'Hypothetical Simulations'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {locale === 'ar'
                  ? 'تمثل الاختبارات الرجعية والإشارات الكمية نماذج رياضية على بيانات تاريخية. والأداء الافتراضي السابق لا يشكل أي ضمان للأداء المستقبلي.'
                  : 'Backtests and quantitative signals represent mathematical modeling on historical data. Past simulated performance is strictly no guarantee of future returns.'}
              </p>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-black hover:border-white/20 transition-colors flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                {locale === 'ar' ? '03 / بيانات البورصة' : '03 / Exchange Feeds'}
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                {locale === 'ar' ? 'بيانات السوق الخارجية' : 'Third-Party Market Data'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {locale === 'ar'
                  ? 'يتم الحصول على الأسعار والبيانات الأساسية من مصادر خارجية مرخصة، وقد تتعرض لتأخيرات زمنية أو انقطاعات مؤقتة.'
                  : 'Price quotes and fundamentals originate from external exchange vendors. Feeds may be delayed, interrupted, or subject to transmission latency.'}
              </p>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-black hover:border-white/20 transition-colors flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                {locale === 'ar' ? '04 / مسؤولية التنفيذ' : '04 / Execution Responsibility'}
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                {locale === 'ar' ? 'المسؤولية الحصرية للمستخدم' : 'Sole User Liability'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {locale === 'ar'
                  ? 'يتم تنفيذ الأوامر حصرياً عبر وسيطك المعتمد. وتخلي تكنال مسؤوليتها تماماً عن أي تأخير تنفيذي أو أعطال لدى الوسيط.'
                  : 'All order placement occurs independently on your licensed broker. Ticknal assumes zero liability for execution latency, broker outages, or trading decisions.'}
              </p>
            </div>
          </div>
        </section>

        {/* Two-Column Editorial Layout */}
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start w-full">
          {/* Sticky Desktop Table of Contents */}
          <aside className="w-full lg:w-72 xl:w-80 shrink-0 lg:sticky lg:top-28">
            <div className="p-5 rounded-xl border border-white/10 bg-black">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-3 px-2">
                {locale === 'ar' ? 'المحتويات' : 'Contents'}
              </div>
              <nav className="space-y-1">
                {navigationSections.map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full text-left rtl:text-right px-3 py-2.5 rounded-lg text-xs sm:text-[13px] transition-all cursor-pointer flex items-center gap-3 ${
                      activeTab === sec.id
                        ? 'bg-white/[0.08] text-white font-semibold'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="text-[11px] font-semibold text-zinc-400 shrink-0">
                      {sec.num}
                    </span>
                    <span className="truncate">{sec.title}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Inquiries Card */}
            <div className="mt-4 p-5 rounded-xl border border-white/10 bg-black">
              <div className="text-xs font-semibold text-white mb-1.5">
                {locale === 'ar' ? 'أسئلة حول مخاطر السوق؟' : 'Questions on Market Risk?'}
              </div>
              <p className="text-[12px] text-zinc-400 leading-relaxed mb-3">
                {locale === 'ar'
                  ? 'لأي استفسارات بخصوص النمذجة الرياضية أو إفصاحات المخاطر:'
                  : 'For questions regarding data modeling or risk disclosures:'}
              </p>
              <a
                href="mailto:compliance@ticknal.com"
                className="text-xs font-medium text-white hover:text-zinc-300 underline underline-offset-4 transition-colors block"
              >
                compliance@ticknal.com
              </a>
            </div>
          </aside>

          {/* Main Content Body */}
          <div className="flex-1 min-w-0 space-y-16 sm:space-y-20">
            {/* 1. Capital Risk */}
            <section id="capital-risk" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">01</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar' ? 'مخاطر رأس المال وتقلبات السوق' : 'Capital Risk & Market Volatility'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      تنطوي كافة الاستثمارات في الأدوات والأوراق المالية، بما يشمل الأسهم المدرجة في البورصة المصرية (EGX)، وصناديق الاستثمار، والمعادن الثمينة، على مخاطر متأصلة. يمكن أن تتقلب أسعار السوق لأي أصل بصورة حادة خلال فترات زمنية قصيرة أو طويلة بسبب المتغيرات الاقتصادية، والأحداث الجيوسياسية، ونتائج أعمال الشركات، والتعديلات التنظيمية.
                    </p>
                    <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02] text-xs sm:text-sm text-zinc-300">
                      <strong className="text-white">تحذير خسارة رأس المال:</strong> قد تخسر جزءاً من أموالك المستثمرة أو كاملها. لا تستثمر أبداً أموالاً لا يمكنك تحمل خسارتها بالكامل. ولا ينبغي استخدام أموال مقترضة أو مدخرات طوارئ في التداولات المضاربية.
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      All investments in financial instruments, including equities listed on the Egyptian Exchange (EGX), mutual and money market funds, and physical bullion, carry inherent risk. The market price of any asset can fluctuate dramatically over short and long periods due to economic conditions, geopolitical events, corporate earnings reports, and regulatory adjustments.
                    </p>
                    <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02] text-xs sm:text-sm text-zinc-300">
                      <strong className="text-white">Principal Loss Warning:</strong> You may lose some or all of the money you invest. Do not invest capital that you cannot afford to lose entirely. You should never use borrowed capital or emergency savings for speculative trading.
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* 2. Equities, FX & Inflation */}
            <section id="equities-fx" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">02</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar'
                    ? 'أسهم البورصة المصرية ومخاطر سعر الصرف (EGP/USD) والتضخم'
                    : 'EGX Equities, Foreign Exchange (EGP/USD) & Inflation Risk'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      تعمل أسواق رأس المال المصرية ضمن بيئة اقتصادية ناشئة تتسم بديناميكيات خاصة بأسعار الصرف والتضخم:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-zinc-300 pl-1">
                      <li><strong className="text-white">مخاطر العملة وانخفاض القيمة:</strong> يتم تسعير الأسهم المصرية بالجنيه المصري (EGP). وأي انخفاض في سعر صرف الجنيه أمام العملات الأجنبية الرئيسية قد يؤثر على القوة الشرائية الحقيقية للعوائد الاستثمارية.</li>
                      <li><strong className="text-white">معدلات الفائدة والتضخم:</strong> قرارات السياسة النقدية للبنك المركزي المصري (CBE) وأسعار الفائدة ومعدلات التضخم تؤثر مباشرة على سيولة السوق وتكاليف الاقتراض للشركات وتقييمات الأسهم.</li>
                      <li><strong className="text-white">سيولة الأسهم:</strong> في حين تتمتع أسهم المؤشر الرئيسي (EGX 30) بسيولة يومية ثابتة، قد تعاني أسهم الشركات المتوسطة والصغيرة (EGX 70) من اتساع الفوارق السعرية (Spreads) وقلة السيولة أثناء فترات الهبوط.</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p>
                      Egyptian capital markets operate in an emerging market macroeconomic environment characterized by specific currency and inflationary dynamics:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-zinc-300 pl-1">
                      <li><strong className="text-white">Currency & Devaluation Risk:</strong> Egyptian equities are denominated in Egyptian Pounds (EGP). Currency devaluations against major foreign currencies (such as the US Dollar) can significantly impact the real purchasing power of investment returns.</li>
                      <li><strong className="text-white">Inflation & Interest Rate Dynamics:</strong> Central Bank of Egypt (CBE) monetary policy decisions, benchmark overnight interest rates, and domestic inflation metrics directly influence market liquidity, corporate borrowing costs, and equity valuations.</li>
                      <li><strong className="text-white">Market Liquidity Constraints:</strong> While high-market-cap stocks (e.g. EGX 30 constituents) experience steady volume, mid-cap and small-cap stocks (EGX 70) may suffer from wider bid-ask spreads and liquidity constraints during market downturns.</li>
                    </ul>
                  </>
                )}
              </div>
            </section>

            {/* 3. Mutual & Money Market Funds */}
            <section id="funds" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">03</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar' ? 'إفصاح صناديق الاستثمار وصناديق أسواق النقد' : 'Mutual & Money Market Funds Disclosure'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      يتم نشر قيم صافي أصول الوثائق (NAV) لصناديق الاستثمار المعروضة على المنصة بواسطة مديري الصناديق والإدارات المعتمدة وفقاً لجداول الإفصاح المحددة (يومياً أو أسبوعياً).
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-zinc-300 pl-1">
                      <li>وثائق صناديق الاستثمار ليست ودائع بنكية وليست مضمونة أو مؤمنة من قبل البنك المركزي المصري أو أي جهة حكومية.</li>
                      <li>تستند العوائد السنوية التاريخية إلى الأداء السابق للصندوق ولا تضمن تحقيق نفس العوائد مستقبلاً أو الحفاظ على أصل رأس المال.</li>
                      <li>يحدد مدير الصندوق مواعيد الشراء والاسترداد والعمولات ومواعيد الإغلاق حصرياً.</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p>
                      Mutual fund Net Asset Values (NAVs) displayed on Ticknal are published by fund managers and licensed administrators per periodic reporting schedules (daily or weekly).
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-zinc-300 pl-1">
                      <li>Fund shares are not bank deposits and are not insured by the Central Bank of Egypt or any government guarantee.</li>
                      <li>Historical annualized yields and returns are based on past fund performance and do not guarantee future yields or capital preservation.</li>
                      <li>Fund redemption schedules, management fees, and subscription deadlines are established solely by the respective fund managers.</li>
                    </ul>
                  </>
                )}
              </div>
            </section>

            {/* 4. Bullion & Gold Pricing */}
            <section id="bullion" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">04</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar' ? 'مؤشرات وأسعار السبائك والمعادن الثمينة والذهب' : 'Physical Bullion & Gold Pricing Benchmarks'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      تمثل أسعار مؤشرات الذهب (عيار 24 وعيار 21 والجنيه الذهب) المعروضة على تكنال متوسطات سعرية استرشادية مجمعة من مصادر موثوقة في السوق المصري.
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-zinc-300 pl-1">
                      <li>قد تختلف أسعار التجزئة الفعلية لدى التجار بناءً على قيمة المصنعية وفروق الدمغة وشروط الدفع النقدي أو الإلكتروني.</li>
                      <li>تكنال لا تبيع ولا تسك ولا تخزن ولا تسلم السبائك الذهبية أو الفضية، وتُعرض هذه البيانات للأغراض التحليلية والاسترشادية فقط.</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p>
                      Gold bullion pricing benchmarks (e.g. 24K, 21K, and Gold Sovereign / جنيه دهب) displayed on Ticknal represent market reference averages aggregated from verified Egyptian market sources.
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-zinc-300 pl-1">
                      <li>Local retail precious metals prices may vary based on merchant workmanship fees (مصنعية), physical mint premiums, and merchant-specific cash/card settlement terms.</li>
                      <li>Ticknal does not sell, mint, hold, store, or deliver physical bullion. Data is provided for analytical benchmarking and purchasing power tracking only.</li>
                    </ul>
                  </>
                )}
              </div>
            </section>

            {/* 5. Backtests & Quantitative Models */}
            <section id="backtests" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">05</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar'
                    ? 'إخلاء المسؤولية عن المحاكاة الافتراضية والنماذج الكمية'
                    : 'Hypothetical Simulations & Quantitative Strategy Disclaimers'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      توفر المنصة أدوات محاكاة كمية واختبارات رجعية للاستراتيجيات وماسحات للمؤشرات الفنية. وتخضع هذه المزايا لقيود رياضية متأصلة:
                    </p>
                    <div className="p-6 rounded-xl border border-white/10 bg-black space-y-3">
                      <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        القيود الجوهرية للبيانات المحاكية
                      </div>
                      <ul className="list-disc list-inside space-y-2.5 text-xs sm:text-sm text-zinc-300 pl-1">
                        <li><strong className="text-white">انحياز الإدراك المتأخر:</strong> تُحسب نتائج الاختبارات الرجعية بأثر رجعي على بيانات الأسعار السابقة، وظروف السوق المستقبلية ستختلف بالتأكيد عن الماضي.</li>
                        <li><strong className="text-white">الانزلاق السعري والعمولات:</strong> لا تعكس عمليات المحاكاة الافتراضية الانزلاق السعري في التنفيذ (Slippage)، أو اتساع الفوارق السعرية، أو عمولات السمسرة، أو الضرائب وضريبة الدمغة.</li>
                        <li><strong className="text-white">غياب التوصية الاستثمارية:</strong> لا تشكل نسب النجاح العالية في الاختبارات الرجعية أي توصية من تكنال بتطبيق تلك الاستراتيجية بأموال حقيقية.</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      Ticknal provides quantitative simulation tools, strategy backtesting software, and technical indicator scanners. These features are subject to inherent mathematical limitations:
                    </p>
                    <div className="p-6 rounded-xl border border-white/10 bg-black space-y-3">
                      <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Inherent Limitations of Simulated Data
                      </div>
                      <ul className="list-disc list-inside space-y-2.5 text-xs sm:text-sm text-zinc-300 pl-1">
                        <li><strong className="text-white">Hindsight Bias:</strong> Backtested results are calculated with the benefit of hindsight on historical price action. Market conditions in the future will differ from past conditions.</li>
                        <li><strong className="text-white">Execution Slippage:</strong> Hypothetical simulations do not fully account for execution slippage, bid-ask spread expansion, exchange transaction fees, broker commissions, stamp taxes, or market impact.</li>
                        <li><strong className="text-white">No Advisory Recommendation:</strong> High historical win-rates or profit factors in a backtest do not constitute a recommendation by Ticknal to execute that strategy with real capital.</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* 6. Exchange Data & Latency */}
            <section id="market-data" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">06</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar' ? 'إخلاء المسؤولية عن بيانات البورصة وتأخر التحديثات' : 'Exchange Data & Latency Disclaimers'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      تتلقى تكنال بيانات السوق الأولية من مزودين معتمدين، ومع حرصنا على استمرارية التدفقات الرقمية بأعلى كفاءة:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-zinc-300 pl-1">
                      <li>قد تتعرض أسعار التداول لتأخيرات بسبب ازدحام شبكات الإنترنت أو خوادم المزودين.</li>
                      <li>لا تضمن تكنال خدمة مستمرة دون انقطاع أو بيانات خالية من الأخطاء العارضة.</li>
                      <li>لا تتحمل تكنال أي مسؤولية عن أي خسائر مالية تنشأ عن تأخر وصول البيانات أو الانقطاعات المؤقتة للخدمة.</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p>
                      Ticknal receives raw market feeds from third-party data providers. While we strive to maintain high-throughput pipelines:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-zinc-300 pl-1">
                      <li>Exchange quotes and depth feeds may experience delays due to internet network congestion, vendor server latency, or exchange rate limiting.</li>
                      <li>Ticknal does not guarantee uninterrupted service, zero latency, or error-free data transmission.</li>
                      <li>Ticknal shall not be liable for any trading losses caused by data latency, technical discrepancies, or temporary feed outages.</li>
                    </ul>
                  </>
                )}
              </div>
            </section>

            {/* 7. Limitation of Liability */}
            <section id="indemnification" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">07</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar' ? 'تحديد المسؤولية القانونية والتعويض' : 'Limitation of Liability & Indemnification'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      إلى أقصى حد يجيزه القانون المصري:
                    </p>
                    <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02] space-y-3 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                      <p>
                        <strong className="text-white">عدم المسؤولية عن الأضرار التبعية:</strong> لا تتحمل شركة تكنال للحلول التكنولوجية (ش.م.م) أو مسؤولوها أو موظفوها بأي حال من الأحوال المسؤولية عن أي أرباح ضائعة أو فرص استثمارية فائتة أو خسائر تداول ناتجة عن استخدام المنصة أو تعذر استخدامها.
                      </p>
                      <p>
                        <strong className="text-white">التعويض القانوني الكامل:</strong> يوافق المستخدم على تعويض وحماية شركة تكنال للحلول التكنولوجية (ش.م.م) من وضد أي دعاوى أو مطالبات تنشأ عن نشاطه التداولي أو مخالفته لهذه الإفصاحات.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      To the maximum extent permitted under Egyptian Law:
                    </p>
                    <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02] space-y-3 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                      <p>
                        <strong className="text-white">No Indirect or Consequential Damages:</strong> In no event shall Ticknal Technologies S.A.E., its directors, officers, employees, or contractors be liable for any lost profits, lost opportunities, trading losses, emotional distress, or special, indirect, or consequential damages resulting from the use or inability to use the platform.
                      </p>
                      <p>
                        <strong className="text-white">Full Indemnification:</strong> You agree to defend, indemnify, and hold harmless Ticknal Technologies S.A.E. from and against any third-party claims, liabilities, damages, and legal costs arising out of your trading activities or your violation of these risk disclosures.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}

