'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import { useTranslation } from '@/lib/i18n';

export default function TermsOfServicePage() {
  const { locale, isRTL } = useTranslation();
  const [activeTab, setActiveTab] = useState('acceptance');

  const navigationSections = locale === 'ar' ? [
    { id: 'acceptance', num: '01', title: 'قبول الشروط والأهلية القانونية' },
    { id: 'license', num: '02', title: 'منح الترخيص ونطاق البرمجيات' },
    { id: 'account', num: '03', title: 'حساب المستخدم والأمان' },
    { id: 'billing', num: '04', title: 'الاشتراكات والرسوم والإلغاء' },
    { id: 'prohibited', num: '05', title: 'الاستخدامات المحظورة ومكافحة السحب' },
    { id: 'regulatory', num: '06', title: 'المركز التنظيمي ومكافحة الاحتيال' },
    { id: 'ip', num: '07', title: 'حقوق الملكية الفكرية' },
    { id: 'liability', num: '08', title: 'تحديد المسؤولية والتعويض' },
    { id: 'governing-law', num: '09', title: 'القانون الواجب التطبيق والاختصاص' },
  ] : [
    { id: 'acceptance', num: '01', title: 'Acceptance of Terms & Eligibility' },
    { id: 'license', num: '02', title: 'License Grant & Software Scope' },
    { id: 'account', num: '03', title: 'User Account & Security' },
    { id: 'billing', num: '04', title: 'Subscriptions, Fees & Cancellation' },
    { id: 'prohibited', num: '05', title: 'Prohibited Conduct & Anti-Scraping' },
    { id: 'regulatory', num: '06', title: 'Regulatory Status & Anti-Fraud' },
    { id: 'ip', num: '07', title: 'Intellectual Property Rights' },
    { id: 'liability', num: '08', title: 'Limitation of Liability & Indemnity' },
    { id: 'governing-law', num: '09', title: 'Governing Law & Jurisdiction' },
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
          <span className="text-white">{locale === 'ar' ? 'شروط وأحكام الخدمة' : 'Terms of Service'}</span>
        </nav>

        {/* Hero Section Header */}
        <header className="border-b border-white/10 pb-10 sm:pb-14 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/[0.03] text-zinc-300 text-[11px] font-semibold mb-5 tracking-wider uppercase">
            {locale === 'ar' ? 'اتفاقية تعاقدية ملزمة • جمهورية مصر العربية' : 'Contractual Agreement • Arab Republic of Egypt'}
          </div>

          <h1
            className="text-3xl sm:text-5xl lg:text-[56px] font-semibold text-white tracking-tight leading-[1.12] mb-5 max-w-5xl font-euclid"
            style={{ fontFamily: 'EuclidCircularSemibold, sans-serif' }}
          >
            {locale === 'ar' ? (
              <>
                شروط و{' '}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: 'linear-gradient(90deg, #0099ff 0%, #2962ff 50%, #a822ff 100%)',
                  }}
                >
                  أحكام الخدمة
                </span>
              </>
            ) : (
              <>
                Terms of{' '}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: 'linear-gradient(90deg, #0099ff 0%, #2962ff 50%, #a822ff 100%)',
                  }}
                >
                  Service
                </span>
              </>
            )}
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-4xl leading-relaxed font-normal">
            {locale === 'ar'
              ? 'عقد ملزم قانوناً ينظم اشتراكك، واستخدامك للبرمجيات، وحقوق والتزامات المستخدم بينك وبين شركة تكنال للحلول التكنولوجية (ش.م.م).'
              : 'Legally binding contract governing your subscription, software access, user rights, and obligations between you and Ticknal Technologies S.A.E.'}
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
                {locale === 'ar' ? '01 / الترخيص' : '01 / License'}
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                {locale === 'ar' ? 'ترخيص استخدام شخصي' : 'Personal SaaS License'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {locale === 'ar'
                  ? 'يُمنح المشترك ترخيصاً شخصياً غير حصري وغير قابل للتحويل للوصول إلى المنصة لأغراض البحث والتحليل الذاتي.'
                  : 'You are granted a non-exclusive, non-transferable personal license to access our analytics terminal for self-directed market research.'}
              </p>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-black hover:border-white/20 transition-colors flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                {locale === 'ar' ? '02 / الفوترة' : '02 / Billing'}
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                {locale === 'ar' ? 'اشتراك برمجيات شفاف' : 'Transparent Subscription'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {locale === 'ar'
                  ? 'تُسدد الرسوم حصرياً مقابل الوصول للبرمجيات. ولا نقبل أو نحتفظ بأي أموال للاستثمار تحت أي ظرف.'
                  : 'Fees are billed strictly for software access. We never accept, custody, or manage investment capital under any circumstances.'}
              </p>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-black hover:border-white/20 transition-colors flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                {locale === 'ar' ? '03 / الأمان' : '03 / Security'}
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                {locale === 'ar' ? 'حماية نزاهة الحساب' : 'Account Integrity'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {locale === 'ar'
                  ? 'يُحظر تماماً مشاركة بيانات الدخول أو السحب الآلي للبيانات (Scraping) أو الهندسة العكسية للمؤشرات.'
                  : 'Credential sharing, programmatic scraping, and reverse-engineering of indicators or market data are strictly prohibited and cause termination.'}
              </p>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-black hover:border-white/20 transition-colors flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                {locale === 'ar' ? '04 / القضاء المختص' : '04 / Legal Venue'}
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                {locale === 'ar' ? 'الاختصاص القضائي المصري' : 'Egyptian Jurisdiction'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {locale === 'ar'
                  ? 'تخضع هذه الشروط حصرياً لأحكام القانون المصري، وينعقد الاختصاص القضائي للمحاكم الاقتصادية بالقاهرة.'
                  : 'These terms are governed exclusively by Egyptian Law, with exclusive dispute jurisdiction reserved to the commercial courts of Cairo.'}
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

            {/* Legal Contact Card */}
            <div className="mt-4 p-5 rounded-xl border border-white/10 bg-black">
              <div className="text-xs font-semibold text-white mb-1.5">
                {locale === 'ar' ? 'الشؤون القانونية' : 'Legal Affairs'}
              </div>
              <p className="text-[12px] text-zinc-400 leading-relaxed mb-3">
                {locale === 'ar'
                  ? 'للاستفسارات الخاصة بالعقود وتراخيص الاستخدام المؤسسية:'
                  : 'For corporate contract or licensing inquiries:'}
              </p>
              <a
                href="mailto:legal@ticknal.com"
                className="text-xs font-medium text-white hover:text-zinc-300 underline underline-offset-4 transition-colors block"
              >
                legal@ticknal.com
              </a>
            </div>
          </aside>

          {/* Main Content Body */}
          <div className="flex-1 min-w-0 space-y-16 sm:space-y-20">
            {/* 1. Acceptance & Eligibility */}
            <section id="acceptance" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">01</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar' ? 'قبول الشروط والأهلية القانونية' : 'Acceptance of Terms & Eligibility'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      تشكل شروط الخدمة هذه (&ldquo;الشروط&rdquo;) اتفاقية ملزمة قانوناً بينك (&ldquo;المستخدم&rdquo; أو &ldquo;المشترك&rdquo;) وبين <strong className="text-white">شركة تكنال للحلول التكنولوجية (ش.م.م)</strong> (&ldquo;تكنال&rdquo; أو &ldquo;نحن&rdquo;)، بخصوص استخدامك لموقع ticknal.com ومنصة تكنال لذكاء الأسواق.
                    </p>
                    <p>
                      بإنشاء حساب أو الاشتراك في أي باقة أو تصفح المنصة، فإنك تقر بأنك قرأت وفهمت ووافقت على الالتزام بهذه الشروط وبـ <Link href="/compliance" className="text-white underline underline-offset-4 hover:text-zinc-300">بيان التوافق مع الهيئة العامة للرقابة المالية</Link> و<Link href="/disclaimer" className="text-white underline underline-offset-4 hover:text-zinc-300">إفصاح المخاطر</Link>. وإذا لم تكن موافقاً، يجب عليك التوقف فوراً عن استخدام المنصة.
                    </p>
                    <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02] text-xs sm:text-sm text-zinc-300">
                      <strong className="text-white">الأهلية القانونية:</strong> يجب أن لا يقل عمرك عن 18 عاماً (أو سن الرشد القانوني المعمول به في دولتك) للاشتراك في خدمات تكنال.
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you (&ldquo;User&rdquo; or &ldquo;Subscriber&rdquo;) and <strong className="text-white">Ticknal Technologies S.A.E.</strong> (&ldquo;Ticknal&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), regarding your access to and use of the website located at ticknal.com and the Ticknal Market Intelligence Terminal.
                    </p>
                    <p>
                      By registering an account, subscribing to a software tier, or browsing the platform, you acknowledge that you have read, understood, and agree to be bound by these Terms and our incorporated <Link href="/compliance" className="text-white underline underline-offset-4 hover:text-zinc-300">FRA Compliance Statement</Link> and <Link href="/disclaimer" className="text-white underline underline-offset-4 hover:text-zinc-300">Risk Disclosure</Link>. If you do not agree, you must immediately discontinue use of the platform.
                    </p>
                    <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02] text-xs sm:text-sm text-zinc-300">
                      <strong className="text-white">Legal Age:</strong> You must be at least 18 years of age (or the age of legal majority under the laws of your jurisdiction) to subscribe to Ticknal.
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* 2. License Grant */}
            <section id="license" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">02</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar' ? 'منح الترخيص ونطاق استخدام البرمجيات' : 'License Grant & Software Scope'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      بموجب التزامك بهذه الشروط وسداد رسوم الاشتراك، تمنحك تكنال ترخيصاً محدوداً غير حصري، وغير قابل للتنازل، وقابلاً للإلغاء للوصول إلى المنصة حصرياً لأغراضك البحثية والاستثمارية الذاتية.
                    </p>
                    <p>
                      لا يمنحك هذا الترخيص أي حقوق ملكية فكرية في البرمجيات أو الأكواد أو الخوارزميات أو قواعد البيانات الخاصة بتكنال، وتظل كافة الحقوق غير الممنوحة صراحة محفوظة حصرياً لشركة تكنال للحلول التكنولوجية (ش.م.م).
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      Subject to your compliance with these Terms and active subscription standing, Ticknal grants you a limited, non-exclusive, non-transferable, revocable license to access the platform solely for your personal or internal business research purposes.
                    </p>
                    <p>
                      This license does not convey any ownership interest in the software, algorithms, codebases, or proprietary databases. All rights not expressly granted herein are reserved exclusively by Ticknal Technologies S.A.E.
                    </p>
                  </>
                )}
              </div>
            </section>

            {/* 3. User Account & Security */}
            <section id="account" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">03</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar' ? 'حساب المستخدم والأمان' : 'User Account & Security'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      عند تسجيل الحساب، يجب تقديم معلومات صحيحة ودقيقة وكاملة. وتتحمل وحدك المسؤولية عن سرية بيانات تسجيل الدخول الخاصة بك.
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-zinc-300 pl-1">
                      <li>تتعهد بعدم مشاركة أو بيع أو ترخيص بيانات دخولك لأي أطراف ثالثة.</li>
                      <li>تسجيل الدخول المتزامن من عناوين IP متعددة متباعدة جغرافياً قد يؤدي إلى قفل أمني مؤقت للحساب.</li>
                      <li>يجب إبلاغ تكنال فوراً عبر security@ticknal.com عند الاشتباه في أي اختراق لحسابك.</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p>
                      When registering an account, you must provide accurate, current, and complete information. You are solely responsible for maintaining the confidentiality of your login credentials (email and password or authentication tokens).
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-zinc-300 pl-1">
                      <li>You agree not to share, sell, transfer, or sublicense your login credentials to third parties.</li>
                      <li>Concurrent multi-session usage from dispersed IP addresses may trigger automated security locks.</li>
                      <li>You must immediately notify Ticknal at security@ticknal.com upon discovering any unauthorized access to your account.</li>
                    </ul>
                  </>
                )}
              </div>
            </section>

            {/* 4. Subscriptions & Billing */}
            <section id="billing" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">04</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar' ? 'الاشتراكات والرسوم وسياسة الإلغاء والاسترداد' : 'Subscriptions, Fees & Cancellation'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      تعمل تكنال وفق نموذج اشتراك برمجي دوري (يُحسب شهرياً أو سنوياً). باختيارك باقة الاشتراك، فإنك تفوض تكنال (أو بوابات الدفع المعتمدة) بخصم الرسوم الدورية المحددة.
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-zinc-300 pl-1">
                      <li><strong className="text-white">الإلغاء:</strong> يمكنك إلغاء اشتراكك في أي وقت عبر إعدادات الحساب، ويسري الإلغاء بنهاية دورة الفوترة المدفوعة الحالية.</li>
                      <li><strong className="text-white">الاسترداد:</strong> نظراً للتمكين الرقمي الفوري للبيانات اللحظية والأدوات التحليلية، فإن رسوم الاشتراك غير قابلة للاسترداد عن الفترات الجزئية باستثناء ما ينص عليه قانون حماية المستهلك المصري.</li>
                      <li><strong className="text-white">الضرائب:</strong> كافة الأسعار المعلنة غير شاملة لضريبة القيمة المضافة (VAT) ما لم يُنص على خلاف ذلك صراحة.</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p>
                      Ticknal operates on a recurring software subscription model (billed monthly or annually). By selecting a subscription tier, you authorize Ticknal (or our authorized payment gateways) to charge the stated recurring fee to your chosen payment method.
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-zinc-300 pl-1">
                      <li><strong className="text-white">Cancellation:</strong> You may cancel your subscription at any time via your Account Settings. Cancellation takes effect at the end of the current paid billing cycle.</li>
                      <li><strong className="text-white">Refunds:</strong> Due to immediate digital provisioning of real-time data feeds and proprietary analytical tools, subscription fees are non-refundable for partial billing periods, except where required by Egyptian consumer protection regulations.</li>
                      <li><strong className="text-white">Taxes:</strong> All listed prices are exclusive of applicable statutory value-added tax (VAT) unless explicitly specified.</li>
                    </ul>
                  </>
                )}
              </div>
            </section>

            {/* 5. Prohibited Conduct */}
            <section id="prohibited" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">05</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar' ? 'الاستخدامات المحظورة وسياسات مكافحة السحب الآلي' : 'Prohibited Conduct & Anti-Scraping Policies'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      يحظر عليك تماماً القيام بأي من الأنشطة المحظورة التالية:
                    </p>
                    <div className="p-6 rounded-xl border border-white/10 bg-black space-y-3">
                      <ul className="list-disc list-inside space-y-2.5 text-xs sm:text-sm text-zinc-300 pl-1">
                        <li>استخدام البوتات أو برمجيات الزحف والسحب الآلي (Scrapers/Crawlers) لاستخراج بيانات الأسعار أو مخرجات المؤشرات.</li>
                        <li>الهندسة العكسية، أو فك التجميع، أو محاولة استخراج الأكواد المصدرية لخوارزميات تكنال ومحركات الاختبارات الرجعية.</li>
                        <li>إعادة بيع أو إعادة توزيع أو ترخيص بيانات السوق لأطراف ثالثة لتحقيق مكاسب تجارية.</li>
                        <li>محاولة اختراق أنظمة الحماية أو تجاوز محددات معدل الطلبات (Rate Limits).</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      You agree not to engage in any of the following restricted activities:
                    </p>
                    <div className="p-6 rounded-xl border border-white/10 bg-black space-y-3">
                      <ul className="list-disc list-inside space-y-2.5 text-xs sm:text-sm text-zinc-300 pl-1">
                        <li>Using automated crawlers, scrapers, bots, or scripts to extract market data, stock quotes, or indicator outputs from the platform.</li>
                        <li>Decompiling, disassembling, reverse-engineering, or attempting to discover the source code of Ticknal&rsquo;s algorithms, backtesting engines, or indicators.</li>
                        <li>Reselling, redistributing, syndicating, or sublicensing market data or screeners to third parties for commercial gain.</li>
                        <li>Attempting to bypass security mechanisms, rate limits, or session validation barriers.</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* 6. Regulatory Status & Anti-Fraud */}
            <section id="regulatory" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">06</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar' ? 'المركز التنظيمي ومكافحة الاحتيال' : 'Regulatory Status & Anti-Fraud Compliance'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      تقر وتوافق صراحة على الالتزامات التنظيمية الواردة في <Link href="/compliance" className="text-white underline underline-offset-4 hover:text-zinc-300">بيان التوافق مع الهيئة العامة للرقابة المالية</Link>:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-zinc-300 pl-1">
                      <li><strong className="text-white">عدم قبول الودائع:</strong> تكنال لا تقبل ولا تطلب ولا تدير أموال المستثمرين نهائياً، وتتعهد بعدم تحويل أي أموال لأي طرف يدعي تمثيل تكنال لأغراض الاستثمار.</li>
                      <li><strong className="text-white">عدم تقديم استشارة آلية:</strong> إشارات المؤشرات الفنية هي أدوات ذاتية ولا تشكل مشورة استثمارية مخصصة بموجب قرار الرقابة المالية 57 لسنة 2024.</li>
                      <li><strong className="text-white">عدم ممارسة السمسرة:</strong> تكنال ليست شركة وساطة في الأوراق المالية بموجب القانون 95 لسنة 1992 ولا تنفذ أوامر تداول.</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p>
                      You expressly acknowledge and agree to the statutory carve-outs set forth in our <Link href="/compliance" className="text-white underline underline-offset-4 hover:text-zinc-300">FRA Compliance Statement</Link>:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-zinc-300 pl-1">
                      <li><strong className="text-white">No Fund Deposits:</strong> Ticknal never accepts, solicits, or manages user investment capital. You agree never to remit funds to any party claiming to represent Ticknal for trading or investment purposes.</li>
                      <li><strong className="text-white">No Robo-Advisory:</strong> Signals generated by mathematical indicators are self-directed tools and do not constitute personalized financial advice or automated portfolio management under FRA Resolution 57 of 2024.</li>
                      <li><strong className="text-white">No Brokerage:</strong> Ticknal is not a licensed broker-dealer under Law 95 of 1992 and does not execute securities orders.</li>
                    </ul>
                  </>
                )}
              </div>
            </section>

            {/* 7. Intellectual Property */}
            <section id="ip" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">07</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar' ? 'حقوق الملكية الفكرية والعلامات التجارية' : 'Intellectual Property Rights'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      كافة العلامات التجارية، والشعارات، وأسماء النطاقات، وتصميمات الواجهات، والأكواد المصدرية، ونماذج المؤشرات الرياضية هي ملكية حصرية لشركة تكنال للحلول التكنولوجية (ش.م.م).
                    </p>
                    <p>
                      لا يجوز استخدام العلامة التجارية &ldquo;تكنال&rdquo; أو شعارها مع أي منتج أو خدمة دون موافقة كتابية مسبقة وصريحة منا.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      All trademarks, service marks, trade names, logos, domain names, UI designs, codebases, mathematical indicator configurations, and database rights are the exclusive property of Ticknal Technologies S.A.E. or its licensors.
                    </p>
                    <p>
                      You may not use the &ldquo;Ticknal&rdquo; brand, logo, or trademark in connection with any product or service without our prior written authorization.
                    </p>
                  </>
                )}
              </div>
            </section>

            {/* 8. Limitation of Liability */}
            <section id="liability" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">08</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar' ? 'تحديد المسؤولية والتعويض القانوني' : 'Limitation of Liability & Indemnity'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02] space-y-3 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    <p>
                      <strong className="text-white">الحد الأقصى للمسؤولية:</strong> لا يتجاوز إجمالي المسؤولية القانونية لشركة تكنال للحلول التكنولوجية (ش.م.م) عن أي أضرار ناتجة عن استخدام المنصة إجمالي المبالغ الفعلية المسددة من قبلك كرسوم اشتراك خلال الاثني عشر (12) شهراً السابقة للواقعة المنشئة للمسؤولية.
                    </p>
                    <p>
                      <strong className="text-white">التعويض وحماية الشركة:</strong> يوافق المستخدم على تعويض وحماية شركة تكنال للحلول التكنولوجية (ش.م.م) ومسؤوليها وموظفيها ضد أي دعاوى أو مطالبات تنشأ عن مخالفته لهذه الشروط.
                    </p>
                  </div>
                ) : (
                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02] space-y-3 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    <p>
                      <strong className="text-white">Total Liability Cap:</strong> In no event shall the total aggregate liability of Ticknal Technologies S.A.E. arising out of or related to your use of the platform exceed the total subscription fees paid by you to Ticknal in the twelve (12) months preceding the incident giving rise to liability.
                    </p>
                    <p>
                      <strong className="text-white">Hold Harmless:</strong> You agree to defend, indemnify, and hold harmless Ticknal Technologies S.A.E., its directors, officers, and employees against any losses, legal fees, or third-party liabilities arising from your violation of these Terms.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* 9. Governing Law */}
            <section id="governing-law" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">09</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar' ? 'القانون الواجب التطبيق والاختصاص القضائي' : 'Governing Law & Jurisdiction'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      تخضع هذه الشروط وتُفسر وتُنفذ حصرياً وفقاً لأحكام القوانين السارية في <strong className="text-white">جمهورية مصر العربية</strong>.
                    </p>
                    <p>
                      أي نزاع أو خلاف ينشأ عن أو يرتبط بهذه الشروط أو بتفسيرها أو بإنهاء خدمات المنصة ينعقد الاختصاص الحصري بنظره للمحاكم الاقتصادية والتجارية المختصة في <strong className="text-white">مدينة القاهرة، جمهورية مصر العربية</strong>.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      These Terms shall be governed by, construed, and enforced in accordance with the laws of the <strong className="text-white">Arab Republic of Egypt</strong>, without regard to conflict of laws principles.
                    </p>
                    <p>
                      Any dispute, controversy, or claim arising out of or in connection with these Terms, including their existence, validity, or termination, shall be submitted to the exclusive jurisdiction of the competent commercial courts located in <strong className="text-white">Cairo, Egypt</strong>.
                    </p>
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

