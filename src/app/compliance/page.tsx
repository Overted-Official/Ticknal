'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import { useTranslation } from '@/lib/i18n';

export default function FraCompliancePage() {
  const { locale, isRTL } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');

  const navigationSections = locale === 'ar' ? [
    { id: 'overview', num: '01', title: 'النطاق التشغيلي والتصنيف القانوني' },
    { id: 'anti-fraud', num: '02', title: 'عدم قبول الأموال ومكافحة الاحتيال' },
    { id: 'no-robo-advisor', num: '03', title: 'المؤشرات الفنية والاستشارة الآلية' },
    { id: 'no-brokerage', num: '04', title: 'عدم ممارسة الوساطة المالية' },
    { id: 'market-data', num: '05', title: 'إفصاح بيانات البورصة المصرية' },
    { id: 'risk-acknowledgment', num: '06', title: 'إقرار المستخدم وتحمل المخاطر' },
    { id: 'contact', num: '07', title: 'الإبلاغ والاستفسارات القانونية' },
  ] : [
    { id: 'overview', num: '01', title: 'Operational Scope & Classification' },
    { id: 'anti-fraud', num: '02', title: 'Zero Fund Acceptance & Anti-Fraud' },
    { id: 'no-robo-advisor', num: '03', title: 'Indicators vs. Robo-Advisory' },
    { id: 'no-brokerage', num: '04', title: 'No Brokerage Execution' },
    { id: 'market-data', num: '05', title: 'EGX Market Data Disclosure' },
    { id: 'risk-acknowledgment', num: '06', title: 'User Assumption of Risk' },
    { id: 'contact', num: '07', title: 'Reporting & Legal Inquiries' },
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
        {/* Breadcrumb Navigation - Clean Minimalist Text */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs sm:text-[13px] text-zinc-400 mb-8 font-medium">
          <Link href="/" className="hover:text-white transition-colors">
            {locale === 'ar' ? 'الرئيسية' : 'Home'}
          </Link>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-300">{locale === 'ar' ? 'الشؤون القانونية والتنظيمية' : 'Legal & Regulatory'}</span>
          <span className="text-zinc-600">/</span>
          <span className="text-white">
            {locale === 'ar' ? 'بيان التوافق مع الهيئة العامة للرقابة المالية' : 'FRA Compliance Statement'}
          </span>
        </nav>

        {/* Hero Section Header - Wide, Authoritative, Minimalist */}
        <header className="border-b border-white/10 pb-10 sm:pb-14 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/[0.03] text-zinc-300 text-[11px] font-semibold mb-5 tracking-wider uppercase">
            {locale === 'ar' ? 'بيان تنظيمي رسمي • جمهورية مصر العربية' : 'Official Regulatory Statement • Arab Republic of Egypt'}
          </div>

          <h1
            className="text-3xl sm:text-5xl lg:text-[56px] font-semibold text-white tracking-tight leading-[1.12] mb-5 max-w-5xl font-euclid"
            style={{ fontFamily: 'EuclidCircularSemibold, sans-serif' }}
          >
            {locale === 'ar' ? (
              <>
                بيان التوافق مع{' '}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: 'linear-gradient(90deg, #0099ff 0%, #2962ff 50%, #a822ff 100%)',
                  }}
                >
                  الهيئة العامة للرقابة المالية (FRA)
                </span>
              </>
            ) : (
              <>
                Financial Regulatory Authority (FRA){' '}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: 'linear-gradient(90deg, #0099ff 0%, #2962ff 50%, #a822ff 100%)',
                  }}
                >
                  Compliance Statement
                </span>
              </>
            )}
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-4xl leading-relaxed font-normal">
            {locale === 'ar'
              ? 'إفصاح قانوني بشأن النطاق التشغيلي لشركة تكنال للحلول التكنولوجية (ش.م.م)، وتصنيفها القانوني، وتحديد المسؤولية بموجب قانون سوق رأس المال المصري، وتشريعات التكنولوجيا المالية (FinTech)، ولوائح الأنشطة المالية غير المصرفية.'
              : 'Statutory disclosure regarding Ticknal Technologies S.A.E.’s operational boundaries, legal classification, and comprehensive limitation of liability under Egyptian Capital Market Law, FinTech legislation, and non-banking financial regulations.'}
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
                {locale === 'ar' ? '01 / المنصة' : '01 / Platform'}
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                {locale === 'ar' ? 'منصة ذكاء مالي برمجية' : 'SaaS Market Intelligence'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {locale === 'ar'
                  ? 'تعمل تكنال حصرياً كمزود برمجيات تكنولوجيا مالية يقدم أدوات الرسوم البيانية، والمؤشرات الكمية، والاختبارات الرجعية التاريخية للبحث الذاتي.'
                  : 'Ticknal operates strictly as a financial technology software provider offering charting tools, quantitative indicators, and historical backtests for self-directed research.'}
              </p>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-black hover:border-white/20 transition-colors flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                {locale === 'ar' ? '02 / سياسة الأموال' : '02 / Capital Policy'}
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                {locale === 'ar' ? 'عدم قبول أو إدارة أموال' : 'Zero Fund Acceptance'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {locale === 'ar'
                  ? 'لا نقبل أو نطلب أو نحتفظ بأموال المستثمرين نهائياً. المعاملة المالية الوحيدة هي رسوم الاشتراك الدورية لاستخدام برمجيات المنصة.'
                  : 'We never accept, solicit, hold, or manage investment funds. The only financial transaction is the recurring subscription fee for software access.'}
              </p>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-black hover:border-white/20 transition-colors flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                {locale === 'ar' ? '03 / حدود الاستشارة' : '03 / Advisory Boundary'}
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                {locale === 'ar' ? 'عدم تقديم استشارة آلية' : 'No Robo-Advisory'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {locale === 'ar'
                  ? 'توافقاً مع قرار الرقابة المالية 57/2024: لا نحدد الملاءمة الاستثمارية ولا ندير محافظاً أو نصدر توصيات. المؤشرات هي معادلات رياضية بحتة.'
                  : 'Compliant with FRA Res. 57/2024: We do not assess risk profiles, manage portfolios, or issue buy/sell investment advice. All indicators are mathematically computed on user settings.'}
              </p>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-black hover:border-white/20 transition-colors flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                {locale === 'ar' ? '04 / سياسة التنفيذ' : '04 / Execution Policy'}
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                {locale === 'ar' ? 'عدم ممارسة السمسرة' : 'No Brokerage Execution'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {locale === 'ar'
                  ? 'وفقاً للقانون 95 لسنة 1992، تكنال ليست شركة سمسرة في الأوراق المالية. تنفيذ الصفقات يتم حصرياً عبر وسيط المستخدم المصري المرخص.'
                  : 'Under Law No. 95/1992, Ticknal is not a licensed broker-dealer. Trade execution occurs solely on the user’s independent licensed Egyptian brokerage.'}
              </p>
            </div>
          </div>
        </section>

        {/* Two-Column Editorial Layout: Sticky Navigation Rail + Wide Content Body */}
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

            {/* Official Compliance Contact Card */}
            <div className="mt-4 p-5 rounded-xl border border-white/10 bg-black">
              <div className="text-xs font-semibold text-white mb-1.5">
                {locale === 'ar' ? 'الاستفسارات الرسمية' : 'Official Inquiries'}
              </div>
              <p className="text-[12px] text-zinc-400 leading-relaxed mb-3">
                {locale === 'ar'
                  ? 'للجهات التنظيمية، وإدارات البورصة، والاستفسارات القانونية:'
                  : 'For regulatory bodies, exchange authorities, or legal counsel inquiries:'}
              </p>
              <a
                href="mailto:compliance@ticknal.com"
                className="text-xs font-medium text-white hover:text-zinc-300 underline underline-offset-4 transition-colors block"
              >
                compliance@ticknal.com
              </a>
            </div>
          </aside>

          {/* Main Statutory Sections - Wide & Clean */}
          <div className="flex-1 min-w-0 space-y-16 sm:space-y-20">
            {/* 1. Operational Scope */}
            <section id="overview" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">01</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar' ? 'النطاق التشغيلي والتصنيف القانوني للشركة' : 'Operational Scope & Corporate Classification'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      تكنال هي منصة تكنولوجيا مالية مملوكة ومطورة ومشغلة بالكامل بواسطة{' '}
                      <strong className="text-white">شركة تكنال للحلول التكنولوجية (ش.م.م)</strong>، وهي شركة مساهمة مصرية خاضعة لأحكام القوانين المعمول بها في جمهورية مصر العربية.
                    </p>
                    <p>
                      تعمل تكنال حصرياً كمزود <strong className="text-white">برمجيات كخدمة (SaaS) في مجال التكنولوجيا المالية والذكاء الاصطناعي</strong>. توفر المنصة أدوات تحليلية، ورسوماً بيانية فنية متطورة (SuperCharts)، وماسحات للمؤشرات الرياضية والكمية، وتجميعاً لبيانات السوق العامة للأوراق والأدوات المالية المتداولة في جمهورية مصر العربية، بما يشمل الأسهم المقيدة في البورصة المصرية (EGX)، وصناديق الاستثمار وصناديق أسواق النقد، وأسعار السبائك والمعادن الثمينة.
                    </p>
                    <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02] text-xs sm:text-sm text-zinc-300">
                      <strong className="text-white">إخطار هام:</strong> منصة تكنال هي أداة بحث وتحليل مالي مخصصة حصرياً للمستثمرين الذين يتخذون قراراتهم بأنفسهم وبشكل مستقل (Self-Directed). تكنال ليست بنكاً، وليست شركة إدارة أصول، وليست مديراً لصناديق الاستثمار، وليست جهة تقدم استشارات مالية مخصصة.
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      Ticknal is a proprietary financial technology platform developed, operated, and maintained by{' '}
                      <strong className="text-white">Ticknal Technologies S.A.E.</strong>, an Egyptian joint stock company incorporated under the laws of the Arab Republic of Egypt.
                    </p>
                    <p>
                      Ticknal operates strictly as a <strong className="text-white">Financial Technology Software-as-a-Service (SaaS) provider</strong>. The platform provides analytical tools, high-performance technical charting visualization (SuperCharts), mathematical indicator scanners, and public market data aggregation for financial instruments traded in Egypt, including equities listed on the Egyptian Exchange (EGX), mutual and money market funds, and physical bullion benchmarks.
                    </p>
                    <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02] text-xs sm:text-sm text-zinc-300">
                      <strong className="text-white">Important Notice:</strong> Ticknal is a financial analytics and research tool engineered exclusively for self-directed market participants. Ticknal is not a bank, an asset management firm, a fund manager, or a personalized financial advisory institution.
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* 2. Zero Fund Acceptance & Anti-Fraud */}
            <section id="anti-fraud" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">02</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar' ? 'عدم قبول وتلقي الأموال ومكافحة الاحتيال والانتحال' : 'Zero Fund Acceptance & Anti-Fraud Disclaimer'}
                </h2>
              </div>
              <div className="space-y-5 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      شركة تكنال للحلول التكنولوجية (ش.م.م) <strong className="text-white">لا تقبل، ولا تتلقى، ولا تحتفظ، ولا تجمع، ولا تطلب، ولا تدير أي أموال أو استثمارات</strong> من المستخدمين تحت أي ظرف من الظروف. لا تحمل تكنال ترخيصاً لتلقي الودائع من البنك المركزي المصري (CBE) أو ترخيصاً لإدارة الأصول والمحافظ من الهيئة العامة للرقابة المالية (FRA).
                    </p>

                    <div className="p-6 sm:p-8 rounded-2xl border border-white/20 bg-white/[0.02] text-white space-y-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        تحذير حاسم بشأن الاحتيال وانتحال الهوية
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                        إن <strong className="text-white">المعاملة المالية الوحيدة</strong> التي ستجريها مع تكنال هي رسوم ترخيص استخدام البرمجيات الدورية (اشتراك شهري أو سنوي) والمفوترة بشفافية تامة عبر بوابات الدفع الإلكتروني المعتمدة على موقعنا الرسمي (<strong className="text-white">ticknal.com</strong>).
                      </p>
                      <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-zinc-300 pl-1">
                        <li>لن تتواصل معك تكنال أو مؤسسوها أو مسؤولوها أو موظفوها <strong className="text-white">نهائياً</strong> عبر تيليجرام أو واتساب أو الرسائل الخاصة على وسائل التواصل أو المكالمات الهاتفية لطلب أموال للتداول أو الاستثمار نيابة عنك.</li>
                        <li>لن نعدك <strong className="text-white">نهائياً</strong> بأي أرباح مضمونة أو برامج مشاركة في الأرباح أو خدمات إدارة المحافظ الخاصة.</li>
                        <li>لن نطلب منك <strong className="text-white">نهائياً</strong> تحويل أموال إلى حسابات بنكية شخصية أو محافظ رقمية أو عناوين إنستاباي (InstaPay) أو محافظ إلكترونية شخصية.</li>
                      </ul>
                      <p className="text-xs text-zinc-400 pt-3 border-t border-white/10 leading-relaxed">
                        أي جهة أو فرد يطلب أموالاً أو استثمارات تحت اسم &ldquo;تكنال&rdquo; أو يدعي تمثيل شركتنا يرتكب جريمة نصب واحتيال وانتحال شخصية معاقب عليها بموجب قانون العقوبات المصري وقانون مكافحة جرائم تقنية المعلومات رقم 175 لسنة 2018. وتخلي شركة تكنال مسؤوليتها المدنية والجنائية والمالية عن أي خسائر تنشأ عن احتيال أطراف خارجية أو هجمات الهندسة الاجتماعية.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      Ticknal Technologies S.A.E. <strong className="text-white">does not accept, hold, custody, pool, solicit, or manage investment capital</strong> from users under any circumstances. Ticknal does not hold a deposit-taking authorization from the Central Bank of Egypt (CBE) or an asset management license from the Financial Regulatory Authority (FRA).
                    </p>

                    <div className="p-6 sm:p-8 rounded-2xl border border-white/20 bg-white/[0.02] text-white space-y-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Crucial Anti-Fraud & Impersonation Warning
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                        The <strong className="text-white">only monetary transaction</strong> you will ever conduct with Ticknal is the periodic software license fee (monthly or annual subscription) charged transparently through verified payment processors on our official domain (<strong className="text-white">ticknal.com</strong>).
                      </p>
                      <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-zinc-300 pl-1">
                        <li>Ticknal, its founders, directors, employees, and official representatives will <strong className="text-white">never</strong> contact you via Telegram, WhatsApp, social media direct messages, phone calls, or unverified emails asking for capital to invest or trade on your behalf.</li>
                        <li>We will <strong className="text-white">never</strong> promise guaranteed returns, profit-sharing schemes, or private portfolio management services.</li>
                        <li>We will <strong className="text-white">never</strong> ask you to transfer funds to personal bank accounts, cryptocurrency wallets, InstaPay handles, or electronic payment wallets.</li>
                      </ul>
                      <p className="text-xs text-zinc-400 pt-3 border-t border-white/10 leading-relaxed">
                        Any entity or individual soliciting investment funds under the name &ldquo;Ticknal&rdquo; or claiming to represent our company is engaging in criminal fraud and identity theft punishable under the Egyptian Penal Code and Cybercrime Law No. 175 of 2018. Ticknal disclaims all civil, criminal, and financial liability for any losses resulting from unauthorized third-party fraud, social engineering, or peer-to-peer scams.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* 3. Indicators vs. Robo-Advisory */}
            <section id="no-robo-advisor" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">03</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar'
                    ? 'المؤشرات الفنية في مقابل الاستشارة المالية الآلية (قرار الرقابة المالية رقم 57 لسنة 2024 والقانون رقم 5 لسنة 2022)'
                    : 'Technical Indicators vs. Robo-Advisory (FRA Res. 57 of 2024 & Law 5 of 2022)'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      توافقاً مع الإطار التنظيمي الصادر عن الهيئة العامة للرقابة المالية (FRA) في <strong className="text-white">قرار مجلس الإدارة رقم 57 لسنة 2024</strong> (المنظم لنشاط المستشار المالي الآلي / Robo-Advisor) و<strong className="text-white">القانون رقم 5 لسنة 2022</strong> (بشأن تنظيم وتنمية استخدام التكنولوجيا المالية في الأنشطة المالية غير المصرفية):
                    </p>
                    <div className="p-6 rounded-xl border border-white/10 bg-black space-y-4">
                      <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        التمايز القانوني بموجب التشريع المصري
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                        بموجب قرار الهيئة العامة للرقابة المالية رقم 57 لسنة 2024، يُعرّف <em className="text-white font-medium">&ldquo;المستشار المالي الآلي&rdquo; (Robo-Advisor)</em> قانوناً بأنه منصة رقمية تقيّم الأهداف المالية والملاءمة الاستثمارية والقدرة على تحمل المخاطر للمستثمر لتقديم مشورة استثمارية مخصصة أو لإدارة محفظته الاستثمارية آلياً.
                      </p>
                      <p className="text-xs sm:text-sm text-white font-semibold leading-relaxed">
                        تكنال ليست مستشاراً مالياً آلياً ولا تقدم خدمات المشورة الاستثمارية الآلية:
                      </p>
                      <ul className="list-disc list-inside space-y-2.5 text-xs sm:text-sm text-zinc-300 pl-1">
                        <li><strong className="text-white">عدم تقييم الملاءمة الاستثمارية:</strong> لا تقوم تكنال بتقييم ملاءمتك المالية أو أهدافك أو تحملك للمخاطر لتحديد أوزان استثمارية مخصصة لك.</li>
                        <li><strong className="text-white">مؤشرات رياضية ذاتية:</strong> كافة الإشارات المعروضة على المنصة هي نتاج حسابات ومعادلات رياضية آلية (مثل RSI والمتوسطات المتحركة ونماذج السيولة الذكية) تُطبق على البيانات التاريخية العامة.</li>
                        <li><strong className="text-white">غياب الحث على البيع أو الشراء:</strong> المنصة لا توصي ولا تحث المستخدمين على شراء أو بيع أو الاحتفاظ بأي ورقة مالية، بل توضح فقط تحقق شرط رياضي حدده أو راقبه المستخدم.</li>
                        <li><strong className="text-white">غياب العلاقة الاستئمانية:</strong> لا توجد أي علاقة وكالة أو استئمان بين تكنال والمشترك، وكافة قرارات التفسير والتنفيذ والاستثمار تقع حصرياً على عاتق المستخدم.</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      In accordance with the regulatory framework enacted by the Egyptian Financial Regulatory Authority (FRA) in <strong className="text-white">Board Resolution No. 57 of 2024</strong> (regulating automated investment advisors / Robo-Advisors) and <strong className="text-white">Law No. 5 of 2022</strong> (regulating the use of financial technology in non-banking financial activities):
                    </p>
                    <div className="p-6 rounded-xl border border-white/10 bg-black space-y-4">
                      <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Statutory Distinction Under Egyptian Law
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                        Under FRA Resolution No. 57 of 2024, a <em className="text-white font-medium">&ldquo;Robo-Advisor&rdquo; (المستشار المالي الآلي)</em> is legally defined as a digital platform that evaluates an individual investor&rsquo;s personal financial goals, risk profile, and liquidity constraints to generate automated, individualized investment advice or to manage an investment portfolio.
                      </p>
                      <p className="text-xs sm:text-sm text-white font-semibold leading-relaxed">
                        Ticknal is strictly NOT a Robo-Advisor and does NOT provide automated investment advisory services:
                      </p>
                      <ul className="list-disc list-inside space-y-2.5 text-xs sm:text-sm text-zinc-300 pl-1">
                        <li><strong className="text-white">Zero Client Suitability Profiling:</strong> Ticknal does not evaluate your financial standing, risk tolerance, net worth, or investment horizon to curate personalized asset allocations.</li>
                        <li><strong className="text-white">Self-Directed Indicators:</strong> All signals displayed on the platform are purely automated mathematical computations (e.g. RSI, moving average crossovers, Bollinger Bands, Smart Money structural breaks) applied to public historical market data.</li>
                        <li><strong className="text-white">No Buy or Sell Prompts:</strong> The platform does not advise, prompt, or urge users to buy, sell, or hold any asset. Signals solely signify whether an objective mathematical formula configured or monitored by the user has triggered.</li>
                        <li><strong className="text-white">Absence of Fiduciary Relationship:</strong> Ticknal has no fiduciary duty to any subscriber. All trading interpretations, executions, and investment decisions remain 100% self-directed.</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* 4. No Brokerage Execution */}
            <section id="no-brokerage" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">04</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar'
                    ? 'عدم ممارسة نشاط السمسرة في الأوراق المالية (قانون سوق رأس المال رقم 95 لسنة 1992)'
                    : 'No Brokerage Execution (Capital Market Law No. 95 of 1992)'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      إعمالاً لأحكام <strong className="text-white">قانون سوق رأس المال المصري رقم 95 لسنة 1992</strong> ولائحته التنفيذية:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-zinc-300 pl-1">
                      <li>تكنال <strong className="text-white">ليست شركة سمسرة في الأوراق المالية</strong> أو وسيطاً مالياً مرخصاً لتداول الأوراق المالية.</li>
                      <li>لا تستقبل المنصة أوامر التداول بالبيع أو الشراء ولا تمررها ولا تنفذها على نظام التداول بالبورصة المصرية (EGX).</li>
                      <li>لا تقدم تكنال خدمات حفظ الأوراق المالية، أو التسوية والمقاصة، أو الشراء بالهامش (Margin Trading).</li>
                    </ul>
                    <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02] text-xs sm:text-sm text-zinc-300 leading-relaxed">
                      <strong className="text-white">سياسة تنفيذ الأوامر:</strong> تتم كافة عمليات التداول على الأسهم وصناديق الاستثمار والسبائك من قبل المستخدم شخصياً وبشكل مستقل عبر شركة السمسرة المرخصة من الهيئة العامة للرقابة المالية والمختارة من قبله (مثل: ثندر، هيرميس، سي آي كابيتال، مباشر، بلتون، أو بايونيرز). ولا تملك تكنال أي سلطة أو مسؤولية عن تنفيذ الأوامر أو عمولات التداول أو كفاءة خوادم شركات الوساطة.
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      Pursuant to <strong className="text-white">Egyptian Capital Market Law No. 95 of 1992</strong> and its executive regulations:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-zinc-300 pl-1">
                      <li>Ticknal is <strong className="text-white">NOT a licensed securities brokerage firm (شركة سمسرة في الأوراق المالية)</strong> or broker-dealer.</li>
                      <li>Ticknal does not receive, transmit, route, or execute buy or sell orders to the Egyptian Exchange (EGX) matching engine.</li>
                      <li>Ticknal does not provide securities custody, settlement, clearing, or margin credit financing.</li>
                    </ul>
                    <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02] text-xs sm:text-sm text-zinc-300 leading-relaxed">
                      <strong className="text-white">Trade Execution Policy:</strong> All trading in EGX equities, mutual funds, and physical bullion must be executed by the user independently through their own FRA-authorized brokerage firm or custodian (e.g. Thndr, EFG Hermes, CI Capital, Mubasher, Beltone, or Pioneers). Ticknal has no control over, and assumes no liability for, order execution, slippage, brokerage server availability, or transaction commissions.
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* 5. EGX Market Data Disclosure */}
            <section id="market-data" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">05</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar' ? 'إفصاح بيانات وأسعار البورصة المصرية (EGX)' : 'Egyptian Exchange (EGX) Market Data Disclosure'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      يتم الحصول على أسعار الأصول، والرسوم البيانية التاريخية، والبيانات المالية، والقيم العادلة المعروضة على المنصة من مزودي بيانات مرخصين، وإفصاحات الشركات المقيدة، والتقارير التنظيمية المنشورة.
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-zinc-300 pl-1">
                      <li>قد تكون أسعار السوق متأخرة زمنياً وفقاً لاتفاقيات تراخيص توزيع البيانات المعمول بها.</li>
                      <li>لا تضمن تكنال الاستمرارية المطلقة أو الدقة الخالية من الأخطاء لبيانات الأطراف الخارجية.</li>
                      <li>يُنصح المستخدمون بالتحقق دائماً من أسعار التنفيذ اللحظية عبر البورصة المصرية (egx.com.eg) ووسيطهم المعتمد قبل إجراء أي معاملة.</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p>
                      Asset prices, historical charts, financial statements, valuation metrics, and volume figures displayed on Ticknal are obtained from licensed third-party market data feeds, regulatory filings, and public corporate disclosures.
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-zinc-300 pl-1">
                      <li>Market price feeds may be delayed in accordance with exchange distribution licensing agreements.</li>
                      <li>Ticknal does not warrant the continuous availability, timeliness, or absolute accuracy of third-party market data feeds.</li>
                      <li>Users are encouraged to verify real-time execution pricing directly with the Egyptian Exchange (egx.com.eg) and their executing broker before transacting.</li>
                    </ul>
                  </>
                )}
              </div>
            </section>

            {/* 6. User Assumption of Risk */}
            <section id="risk-acknowledgment" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">06</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar' ? 'إقرار المستخدم الملزم وتحمل المخاطر الاستثمارية' : 'Binding User Acknowledgment & Assumption of Risk'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      بإنشاء حساب أو الاشتراك أو استخدام منصة تكنال، فإنك تقر وتتعهد بأنك قرأت وفهمت ووافقت بشكل غير قابل للإلغاء على الشروط التالية بموجب أحكام القانونين المدني والتجاري المصريين:
                    </p>
                    <div className="p-6 rounded-xl border border-white/10 bg-black space-y-4">
                      <div className="flex items-start gap-3">
                        <span className="text-xs font-bold text-zinc-400 shrink-0 mt-0.5">1.</span>
                        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                          <strong className="text-white">مخاطر رأس المال:</strong> ينطوي التداول والاستثمار في الأسهم والصناديق والمعادن على مخاطر خسارة مالية جوهرية، بما في ذلك إمكانية خسارة كامل رأس المال المستثمر.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-xs font-bold text-zinc-400 shrink-0 mt-0.5">2.</span>
                        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                          <strong className="text-white">المحاكاة الافتراضية:</strong> نتائج الاختبارات الرجعية التاريخية وإحصائيات المؤشرات هي عمليات حسابية افتراضية مبنية على بيانات سابقة، ولا تشكل النتائج السابقة أي ضمان للأداء المستقبلي.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-xs font-bold text-zinc-400 shrink-0 mt-0.5">3.</span>
                        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                          <strong className="text-white">المسؤولية الحصرية:</strong> تقر بأنك صاحب القرار الوحيد في استثماراتك وتوافق على عدم مساءلة شركة تكنال للحلول التكنولوجية (ش.م.م) أو مسؤوليها أو مهندسيها عن أي خسائر مالية تنشأ عن قراراتك التداولية.
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      By creating an account, subscribing to, or accessing Ticknal, you represent and warrant that you have read, understood, and irrevocably consented to the following terms under Egyptian Civil and Commercial Law:
                    </p>
                    <div className="p-6 rounded-xl border border-white/10 bg-black space-y-4">
                      <div className="flex items-start gap-3">
                        <span className="text-xs font-bold text-zinc-400 shrink-0 mt-0.5">1.</span>
                        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                          <strong className="text-white">Capital Risk:</strong> Trading and investing in Egyptian equities, funds, and bullion involves substantial risk of capital loss, including the potential loss of the entire principal invested.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-xs font-bold text-zinc-400 shrink-0 mt-0.5">2.</span>
                        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                          <strong className="text-white">Hypothetical Simulation:</strong> Historical backtests, simulation results, and indicator trigger statistics are hypothetical calculations based on past price action. Past performance is strictly no guarantee of future returns.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-xs font-bold text-zinc-400 shrink-0 mt-0.5">3.</span>
                        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                          <strong className="text-white">Sole Liability:</strong> You acknowledge that you are the sole decision-maker for your investment actions. You agree that Ticknal Technologies S.A.E., its directors, employees, and software engineers shall not be held liable for any direct, indirect, incidental, or consequential financial losses arising from any market action you take.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* 7. Reporting & Inquiries */}
            <section id="contact" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">07</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar' ? 'الإبلاغ عن الأنشطة المشبوهة والاستفسارات الرقابية' : 'Reporting Suspicious Activities & Compliance Inquiries'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      إذا تم التواصل معك من قبل أي شخص أو حساب ينتحل صفة تكنال لطلب استثمارات، أو إذا كنت تمثل جهة تنظيمية أو قانونية:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
                        <div className="text-xs text-zinc-400 font-medium mb-1">الشؤون التنظيمية والامتثال:</div>
                        <a
                          href="mailto:compliance@ticknal.com"
                          className="text-sm font-semibold text-white hover:text-zinc-300 transition-colors block"
                        >
                          compliance@ticknal.com
                        </a>
                      </div>
                      <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
                        <div className="text-xs text-zinc-400 font-medium mb-1">الإبلاغ عن الاحتيال والانتحال:</div>
                        <a
                          href="mailto:security@ticknal.com"
                          className="text-sm font-semibold text-white hover:text-zinc-300 transition-colors block"
                        >
                          security@ticknal.com
                        </a>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      If you have been approached by any person or social media account falsely claiming to represent Ticknal and soliciting investment funds, or if you represent a regulatory body, exchange authority, or legal institution:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
                        <div className="text-xs text-zinc-400 font-medium mb-1">Compliance & Regulatory Affairs:</div>
                        <a
                          href="mailto:compliance@ticknal.com"
                          className="text-sm font-semibold text-white hover:text-zinc-300 transition-colors block"
                        >
                          compliance@ticknal.com
                        </a>
                      </div>
                      <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
                        <div className="text-xs text-zinc-400 font-medium mb-1">Report Fraud & Impersonation:</div>
                        <a
                          href="mailto:security@ticknal.com"
                          className="text-sm font-semibold text-white hover:text-zinc-300 transition-colors block"
                        >
                          security@ticknal.com
                        </a>
                      </div>
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

