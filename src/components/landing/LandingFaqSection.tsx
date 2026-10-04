'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LayoutGrid, ArrowDown, Plus } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface FaqItem {
  id: string;
  question: string;
  answerPrefix: string;
  highlightText?: string;
  highlightHref?: string;
  answerSuffix: string;
}

const EN_FAQ_ITEMS: FaqItem[] = [
  {
    id: 'pricing',
    question: 'Is Ticknal free?',
    answerPrefix: 'Ticknal is a freemium platform — ',
    highlightText: 'explore real-time EGX prices',
    highlightHref: '/markets',
    answerSuffix:
      ' and use core technical charting and screeners on the Basic plan for free, forever. Our Pro tier unlocks institutional algorithmic signals, unlimited backtesting, and automated risk models.',
  },
  {
    id: 'pro-tier',
    question: 'What does Professional unlock?',
    answerPrefix:
      'Professional adds real-time quantitative buy and sell signals, 50+ institutional indicator backtesting, automated portfolio risk metrics, instant Telegram alerts, and unrestricted historical data exports.',
    answerSuffix: '',
  },
  {
    id: 'execution',
    question: 'Does Ticknal execute trades or manage my money?',
    answerPrefix:
      'No. Ticknal is strictly an analytics, signal intelligence, and backtesting terminal operating in alignment with Egyptian Financial Regulatory Authority (FRA) guidelines. We never custody investor capital or route broker orders. You retain 100% control and execute through your own licensed broker.',
    answerSuffix: '',
  },
  {
    id: 'coverage',
    question: 'What markets and assets are covered?',
    answerPrefix:
      'Ticknal delivers full institutional coverage across all 290+ Egyptian Exchange (EGX) equities, 160+ Egyptian mutual and investment funds, physical gold and silver bullion spot prices, and live USD/EGP currency benchmarks.',
    answerSuffix: '',
  },
  {
    id: 'backtesting',
    question: 'Do I need coding or quantitative skills to backtest?',
    answerPrefix:
      'Not at all. Ticknal features an intuitive point-and-click backtesting engine pre-calibrated with over 50 institutional indicators. You can test multi-condition strategies across years of historical Egyptian tick data in seconds with verified win rates and drawdown statistics.',
    answerSuffix: '',
  },
  {
    id: 'alerts',
    question: 'How do real-time market alerts work?',
    answerPrefix:
      'Our quantitative engine monitors price action and institutional liquidity sweeps 24/7 during trading hours. When high-probability conditions are met, instant notifications are pushed to your desktop, mobile browser, and linked Telegram channel.',
    answerSuffix: '',
  },
];

const AR_FAQ_ITEMS: FaqItem[] = [
  {
    id: 'pricing',
    question: 'هي منصة تكنال مجانية؟',
    answerPrefix: 'تكنال بتوفر باقة مجانية دائمة — تقدر ',
    highlightText: 'تشوف وتتابع أسعار البورصة المصرية لايف',
    highlightHref: '/markets',
    answerSuffix:
      ' وتستخدم الشارتات الفنية الأساسية وأدوات الفلترة في الباقة المجانية على طول من غير ما تدفع مليم. والباقات المدفوعة بتفتحلك إشارات النماذج الكمية، واختبار الاستراتيجيات من غير حدود، ومقاييس إدارة المخاطر الآلية.',
  },
  {
    id: 'pro-tier',
    question: 'الباقة الاحترافية بتديني إيه زيادة؟',
    answerPrefix:
      'الباقة الاحترافية بتضيفلك إشارات بيع وشراء كمية لايف، واختبار لأكتر من 50 مؤشر فني مؤسسي، وتحليل مخاطر المحفظة تلقائياً، وتنبيهات فورية على تيليجرام، مع إمكانية تصدير كل البيانات التاريخية من غير قيود.',
    answerSuffix: '',
  },
  {
    id: 'execution',
    question: 'هل تكنال بتنفذ الصفقات أو بتدير فلوسي؟',
    answerPrefix:
      'لأ، خالص. تكنال منصة تحليلات ورصد إشارات واختبار استراتيجيات بتشتغل بالتوافق التام مع ضوابط الهيئة العامة للرقابة المالية (FRA). إحنا مابنستلمش ولا بنحتفظ بفلوس المستثمرين، ومابنمررش أوامر تداول مباشرة. فلوسك بتفضل دايماً في حسابك، وبتنفذ صفقاتك بنفسك وبأمان عبر وسيطك المرخص.',
    answerSuffix: '',
  },
  {
    id: 'coverage',
    question: 'إيه الأسواق والأصول اللي المنصة بتغطيها؟',
    answerPrefix:
      'المنصة بتغطي السوق المصري بالكامل: أكتر من 290 سهم في البورصة المصرية (EGX)، وأكتر من 160 صندوق استثمار مصري، وأسعار الذهب والفضة والسبائك لايف في مصر، ومؤشرات الجنيه المصري قدام الدولار.',
    answerSuffix: '',
  },
  {
    id: 'backtesting',
    question: 'هل محتاج أكون بعرف أبرمج عشان أختبر استراتيجياتي؟',
    answerPrefix:
      'لأ، مش محتاج خالص. تكنال فيها محرك اختبار استراتيجيات سهل وسريع بنقرة زر واحدة، وجاهز بأكتر من 50 مؤشر مؤسسي. تقدر تختبر أي استراتيجية على بيانات البورصة المصرية لسنين فاتت في ثواني، وتعرف فوراً نسبة نجاحها وأقصى تراجع محتمل.',
    answerSuffix: '',
  },
  {
    id: 'alerts',
    question: 'تنبيهات السوق اللحظية بتشتغل إزاي؟',
    answerPrefix:
      'المحرك الذكي بتاعنا بيراقب حركة الأسعار وتدفقات سيولة المؤسسات طول جلسات التداول. وأول ما الشروط اللي انت محددها تتحقق، بيوصلك تنبيه فوري على شاشتك وعلى موبايلك وعلى تيليجرام في نفس اللحظة.',
    answerSuffix: '',
  },
];

export default function LandingFaqSection() {
  const { locale } = useTranslation();
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const faqItems = locale === 'ar' ? AR_FAQ_ITEMS : EN_FAQ_ITEMS;

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleScrollToFooter = () => {
    const footer = document.getElementById('footer');
    if (footer) {
      footer.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section
      id="faq"
      className="relative w-full bg-transparent py-24 sm:py-32 lg:py-36 px-6 sm:px-10 lg:px-16 xl:px-20 border-t border-white/[0.06] text-white font-sans overflow-hidden"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 xl:gap-24 items-start">
          {/* LEFT COLUMN: Editorial Explainer & Action Buttons */}
          <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-28 flex flex-col items-start text-left rtl:text-right">
            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed max-w-sm">
              {locale === 'ar' ? (
                <>
                  عندك أي سؤال؟ جاوبنا على أكتر الأسئلة الشائعة تحت. ولو لسه عندك استفسار تاني، تقدر تكلمنا مباشرة في أي وقت –{' '}
                  <a
                    href="mailto:support@ticknal.com"
                    className="text-zinc-100 hover:text-white underline underline-offset-4 decoration-zinc-500 hover:decoration-white transition-colors"
                  >
                    إحنا هنا عشان نساعدك.
                  </a>
                </>
              ) : (
                <>
                  Got questions? We&apos;ve answered the most common ones below. Still
                  curious? Feel free to reach out to us directly &ndash;{' '}
                  <a
                    href="mailto:support@ticknal.com"
                    className="text-zinc-100 hover:text-white underline underline-offset-4 decoration-zinc-500 hover:decoration-white transition-colors"
                  >
                    we&apos;re here to help.
                  </a>
                </>
              )}
            </p>

            {/* Action Buttons Row */}
            <div className="mt-7 sm:mt-8 flex items-center gap-3">
              {/* Primary Pill Button */}
              <Link
                href="/signup"
                className="px-6 py-2.5 rounded-full bg-[#E2E2E7] hover:bg-white text-zinc-950 font-semibold text-sm transition-all duration-200 active:scale-95 shadow-sm"
              >
                {locale === 'ar' ? 'ابدأ دلوقتي' : 'Get Started'}
              </Link>

              {/* Grid / Markets Quick Navigation Button */}
              <Link
                href="/markets"
                title={locale === 'ar' ? 'تصفح كل أسهم وأصول البورصة المصرية' : 'Browse All 290+ EGX Markets'}
                aria-label="Browse All Markets"
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition-all duration-200 active:scale-95 group"
              >
                <LayoutGrid className="w-4 h-4 text-zinc-300 group-hover:text-white transition-colors" />
              </Link>

              {/* Down Arrow / Smooth Scroll Button */}
              <button
                type="button"
                onClick={handleScrollToFooter}
                title={locale === 'ar' ? 'انزل لتحت' : 'Scroll Down'}
                aria-label="Scroll down to ecosystem footer"
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition-all duration-200 active:scale-95 group"
              >
                <ArrowDown className="w-4 h-4 text-zinc-300 group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Minimalist Editorial Q&A Stack */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col w-full divide-y divide-white/[0.08]">
            {faqItems.map((item, index) => {
              const isOpen = Boolean(openItems[item.id]);

              return (
                <div
                  key={item.id}
                  className={`w-full ${index === 0 ? 'pb-8 sm:pb-10' : 'py-8 sm:py-10'}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className="w-full text-left rtl:text-right group flex items-start sm:items-center justify-between gap-4 sm:gap-6 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 rounded-sm cursor-pointer select-none"
                    aria-expanded={isOpen}
                  >
                    <h3 className="text-xl sm:text-2xl lg:text-[28px] font-bold tracking-tight text-white group-hover:text-zinc-200 transition-colors leading-[1.25]">
                      {item.question}
                    </h3>
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 text-zinc-400 group-hover:text-white transition-colors">
                      <Plus
                        className={`w-6 h-6 sm:w-8 sm:h-8 transition-transform duration-300 ease-out ${
                          isOpen ? 'rotate-45 text-white' : 'rotate-0 text-zinc-400 group-hover:text-white'
                        }`}
                        strokeWidth={1.75}
                      />
                    </div>
                  </button>

                  <div
                    className={`grid transition-all duration-300 ease-in-out overflow-hidden ${
                      isOpen
                        ? 'grid-rows-[1fr] opacity-100 mt-4 sm:mt-5'
                        : 'grid-rows-[0fr] opacity-0 mt-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
                        {item.answerPrefix}
                        {item.highlightText && item.highlightHref && (
                          <Link
                            href={item.highlightHref}
                            className="underline underline-offset-4 decoration-zinc-600 hover:decoration-white text-zinc-300 hover:text-white transition-colors"
                          >
                            {item.highlightText}
                          </Link>
                        )}
                        {item.answerSuffix}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
