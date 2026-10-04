'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import { useTranslation } from '@/lib/i18n';

export default function PrivacyPolicyPage() {
  const { locale, isRTL } = useTranslation();
  const [activeTab, setActiveTab] = useState('law151');

  const navigationSections = locale === 'ar' ? [
    { id: 'law151', num: '01', title: 'الإطار التشريعي (القانون 151/2020)' },
    { id: 'collection', num: '02', title: 'البيانات التي نجمعها' },
    { id: 'purpose', num: '03', title: 'أوجه معالجة البيانات' },
    { id: 'security', num: '04', title: 'البنية الأمنية والتشفير' },
    { id: 'processors', num: '05', title: 'بوابات الدفع ومزودو الخدمات' },
    { id: 'cookies', num: '06', title: 'ملفات الارتباط والتحليلات' },
    { id: 'rights', num: '07', title: 'حقوق الخصوصية القانونية' },
    { id: 'dpo', num: '08', title: 'مسؤول حماية البيانات' },
  ] : [
    { id: 'law151', num: '01', title: 'Statutory Framework (Law 151/2020)' },
    { id: 'collection', num: '02', title: 'Information We Collect' },
    { id: 'purpose', num: '03', title: 'How We Process Your Data' },
    { id: 'security', num: '04', title: 'Security Architecture & Storage' },
    { id: 'processors', num: '05', title: 'Third-Party Gateways & Services' },
    { id: 'cookies', num: '06', title: 'Cookies & Analytical Telemetry' },
    { id: 'rights', num: '07', title: 'Your Statutory Privacy Rights' },
    { id: 'dpo', num: '08', title: 'Data Protection Officer Contact' },
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
          <span className="text-white">{locale === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}</span>
        </nav>

        {/* Hero Section Header */}
        <header className="border-b border-white/10 pb-10 sm:pb-14 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/[0.03] text-zinc-300 text-[11px] font-semibold mb-5 tracking-wider uppercase">
            {locale === 'ar' ? 'معايير حماية البيانات • جمهورية مصر العربية' : 'Data Protection Standard • Arab Republic of Egypt'}
          </div>

          <h1
            className="text-3xl sm:text-5xl lg:text-[56px] font-semibold text-white tracking-tight leading-[1.12] mb-5 max-w-5xl font-euclid"
            style={{ fontFamily: 'EuclidCircularSemibold, sans-serif' }}
          >
            {locale === 'ar' ? (
              <>
                سياسة الخصوصية و{' '}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: 'linear-gradient(90deg, #0099ff 0%, #2962ff 50%, #a822ff 100%)',
                  }}
                >
                  حماية البيانات الشخصية
                </span>
              </>
            ) : (
              <>
                Privacy Policy &{' '}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: 'linear-gradient(90deg, #0099ff 0%, #2962ff 50%, #a822ff 100%)',
                  }}
                >
                  Data Protection
                </span>
              </>
            )}
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-4xl leading-relaxed font-normal">
            {locale === 'ar'
              ? 'إفصاح الخصوصية الرسمي المنظم لمعالجة البيانات الشخصية، والحماية التشفيرية، وحقوق المشتركين بموجب قانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020.'
              : 'Official statutory privacy disclosure governing personal data processing, cryptographic protection, and subscriber privacy rights under Egyptian Personal Data Protection Law No. 151 of 2020.'}
          </p>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 mt-8 text-xs text-zinc-400 font-medium">
            <div>
              <span className="text-zinc-300">{locale === 'ar' ? 'تاريخ السريان:' : 'Effective Date:'}</span>{' '}
              {locale === 'ar' ? 'أكتوبر 2026' : 'October 2026'}
            </div>
            <div className="hidden sm:inline text-zinc-700">•</div>
            <div>
              <span className="text-zinc-300">{locale === 'ar' ? 'الإطار التشريعي:' : 'Statutory Framework:'}</span>{' '}
              {locale === 'ar' ? 'القانون المصري رقم 151 لسنة 2020' : 'Egyptian Law No. 151 of 2020'}
            </div>
            <div className="hidden sm:inline text-zinc-700">•</div>
            <div>
              <span className="text-zinc-300">{locale === 'ar' ? 'المتحكم في البيانات:' : 'Data Controller:'}</span>{' '}
              {locale === 'ar' ? 'شركة تكنال للحلول التكنولوجية (ش.م.م)' : 'Ticknal Technologies S.A.E.'}
            </div>
          </div>
        </header>

        {/* High-Impact Executive Summary Grid */}
        <section aria-label="Executive Summary" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-16 sm:mb-20">
          <div className="p-6 rounded-xl border border-white/10 bg-black hover:border-white/20 transition-colors flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                {locale === 'ar' ? '01 / التشريع' : '01 / Statute'}
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                {locale === 'ar' ? 'القانون 151 لسنة 2020' : 'Law No. 151 of 2020'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {locale === 'ar'
                  ? 'التوافق الكامل مع قانون حماية البيانات الشخصية المصري المنظم للمعالجة القانونية، والموافقة الصريحة، وفترات حفظ السجلات.'
                  : 'Full compliance with the Egyptian Personal Data Protection Law governing lawful processing, user consent, and data retention standards.'}
              </p>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-black hover:border-white/20 transition-colors flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                {locale === 'ar' ? '02 / أمان الدفع' : '02 / Financial Privacy'}
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                {locale === 'ar' ? 'عدم حفظ البطاقات' : 'Zero Financial Custody'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {locale === 'ar'
                  ? 'لا نقوم بحفظ أرقام البطاقات الائتمانية أو كلمات مرور الحسابات البنكية أو حسابات شركات الوساطة على خوادمنا نهائياً.'
                  : 'We never store bank account credentials, credit card full numbers, or third-party brokerage passwords on our servers.'}
              </p>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-black hover:border-white/20 transition-colors flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                {locale === 'ar' ? '03 / التشفير' : '03 / Cryptography'}
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                {locale === 'ar' ? 'تشفير شامل وآمن' : 'End-to-End Encryption'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {locale === 'ar'
                  ? 'تطبيق بروتوكولات TLS 1.3 أثناء النقل ومعايير تشفير AES-256 للبيانات المحفوظة في قواعد البيانات.'
                  : 'Industry-grade TLS 1.3 protocol in transit and AES-256 cryptographic standards at rest for subscriber profiles and watchlists.'}
              </p>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-black hover:border-white/20 transition-colors flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                {locale === 'ar' ? '04 / ميثاق الخصوصية' : '04 / Ethics'}
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                {locale === 'ar' ? 'عدم بيع البيانات' : 'Zero Data Monetization'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {locale === 'ar'
                  ? 'تكنال لا تبيع ولا تؤجر بيانات المشتركين أو قوائم المراقبة لأي وكالات إعلانية أو أطراف خارجية.'
                  : 'Ticknal never sells, rents, or licenses subscriber personal information or watchlist telemetry to third-party advertisers.'}
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

            {/* DPO Inquiries Card */}
            <div className="mt-4 p-5 rounded-xl border border-white/10 bg-black">
              <div className="text-xs font-semibold text-white mb-1.5">
                {locale === 'ar' ? 'مسؤول حماية البيانات' : 'Privacy Officer Contact'}
              </div>
              <p className="text-[12px] text-zinc-400 leading-relaxed mb-3">
                {locale === 'ar'
                  ? 'لممارسة حقوق البيانات القانونية أو الاستفسار عن سياسة الخصوصية:'
                  : 'For statutory data rights requests or privacy inquiries:'}
              </p>
              <a
                href="mailto:privacy@ticknal.com"
                className="text-xs font-medium text-white hover:text-zinc-300 underline underline-offset-4 transition-colors block"
              >
                privacy@ticknal.com
              </a>
            </div>
          </aside>

          {/* Main Content Body */}
          <div className="flex-1 min-w-0 space-y-16 sm:space-y-20">
            {/* 1. Law 151/2020 */}
            <section id="law151" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">01</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar'
                    ? 'الإطار التشريعي: قانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020'
                    : 'Statutory Framework: Egyptian Law No. 151 of 2020'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      تلتزم شركة تكنال للحلول التكنولوجية (ش.م.م) بحماية خصوصية بياناتك الشخصية التزاماً تاماً بأحكام <strong className="text-white">قانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020</strong> ولائحته التنفيذية والقرارات الصادرة بموجبه.
                    </p>
                    <p>
                      بموجب القانون المصري، تعمل شركة تكنال للحلول التكنولوجية (ش.م.م) بصفتها <strong className="text-white">المتحكم في البيانات (Data Controller)</strong> فيما يتعلق بالبيانات الشخصية التي يتم جمعها ومعالجتها عبر منصة تكنال وموقعها الإلكتروني.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      Ticknal Technologies S.A.E. is committed to protecting your personal data in strict adherence to <strong className="text-white">Egyptian Law No. 151 of 2020 regarding the Protection of Personal Data (قانون حماية البيانات الشخصية رقم 151 لسنة 2020)</strong> and its associated executive decrees.
                    </p>
                    <p>
                      Under Egyptian law, Ticknal Technologies S.A.E. acts as the <strong className="text-white">Data Controller (المتحكم في البيانات)</strong> with respect to personal information collected through our market terminal and website services.
                    </p>
                  </>
                )}
              </div>
            </section>

            {/* 2. Collection */}
            <section id="collection" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">02</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar' ? 'البيانات الشخصية التي نقوم بجمعها' : 'Information We Collect'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      نجمع فقط الحد الأدنى من البيانات الشخصية اللازمة لتقديم وتشغيل خدماتنا التحليلية:
                    </p>
                    <div className="p-6 rounded-xl border border-white/10 bg-black space-y-3">
                      <ul className="list-disc list-inside space-y-2.5 text-xs sm:text-sm text-zinc-300 pl-1">
                        <li><strong className="text-white">بيانات التحقق من الحساب:</strong> الاسم الكامل، البريد الإلكتروني الموثق، كلمات المرور المشفرة (Hashed Passwords)، ورقم الهاتف المحمول (اختياري).</li>
                        <li><strong className="text-white">سجلات الاشتراك والفوترة:</strong> معرفات المعاملات، عملة الفوترة، باقة الاشتراك، والرموز المميزة المشفرة (Tokens) من بوابات الدفع المعتمدة. لا نستقبل ولا نحفظ أرقام البطاقات البنكية الكاملة أو رموز الأمان (CVV).</li>
                        <li><strong className="text-white">تفضيلات المستخدم:</strong> قوائم الأسهم المتابعة (Watchlists)، إعدادات المؤشرات الفنية المخصصة، وتنبيهات الأسعار المضبوطة من قبل المستخدم.</li>
                        <li><strong className="text-white">البيانات الفنية والتشخيصية:</strong> عناوين IP مجهولة الهوية، ونوع نظام التشغيل والمتصفح، وسجلات الأخطاء لضمان استقرار الخوادم.</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      We collect only the minimum personal data required to provision our analytical services:
                    </p>
                    <div className="p-6 rounded-xl border border-white/10 bg-black space-y-3">
                      <ul className="list-disc list-inside space-y-2.5 text-xs sm:text-sm text-zinc-300 pl-1">
                        <li><strong className="text-white">Account Identification:</strong> Full name, verified email address, hashed passwords, and optional mobile telephone number.</li>
                        <li><strong className="text-white">Subscription & Billing Records:</strong> Transaction IDs, billing currency, subscription tier, and tokenized payment identifiers generated by our licensed payment gateways. We never receive or store raw credit/debit card numbers or CVV codes.</li>
                        <li><strong className="text-white">User Preferences:</strong> Watchlist symbols, custom indicator parameters, layout settings, and user-configured alerts.</li>
                        <li><strong className="text-white">Technical Telemetry:</strong> Anonymized IP addresses, device operating system, browser user agent, and error diagnostics collected to maintain platform stability.</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* 3. Purpose */}
            <section id="purpose" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">03</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar' ? 'أوجه وأغراض معالجة البيانات' : 'How We Process Your Data'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      تتم معالجة البيانات الشخصية استناداً إلى مسوغات قانونية واضحة ومحددة:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-zinc-300 pl-1">
                      <li>للتحقق من تسجيل الدخول إلى منصة التحليلات ومزامنة قوائم المراقبة عبر أجهزتك المختلفة.</li>
                      <li>لمعالجة رسوم الاشتراك البرمجية عبر بوابات الدفع الإلكتروني المعتمدة.</li>
                      <li>لإرسال إشعارات الأمان الحرجة، وروابط التحقق من الحساب، وفواتير الاشتراكات.</li>
                      <li>لمنع مشاركة الحسابات غير المصرح بها، والحماية من محاولات السحب الآلي غير المشروع (Scraping) والهجمات السيبرانية.</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p>
                      We process personal data strictly pursuant to lawful statutory grounds:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-zinc-300 pl-1">
                      <li>To authenticate access to your personal terminal workspace and sync your watchlists across devices.</li>
                      <li>To process recurring software subscription payments via authorized payment intermediaries.</li>
                      <li>To transmit critical security notices, account verification links, and billing invoices.</li>
                      <li>To prevent unauthorized account sharing, automated scraping, or denial-of-service cyberattacks.</li>
                    </ul>
                  </>
                )}
              </div>
            </section>

            {/* 4. Security */}
            <section id="security" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">04</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar' ? 'البنية الأمنية ومعايير التشفير والتخزين' : 'Security Architecture & Storage'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      نطبق تدابير وقائية فنية وتنظيمية متعددة المستويات تواكب أحدث المعايير القياسية للأمن السيبراني:
                    </p>
                    <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02] space-y-3 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                      <p>
                        <strong className="text-white">بروتوكولات التشفير:</strong> يتم تشفير كافة البيانات المتبادلة بين المتصفح وخوادمنا باستخدام بروتوكول TLS 1.3، كما يتم تشفير السجلات الحساسة في قواعد البيانات باستخدام خوارزميات AES-256.
                      </p>
                      <p>
                        <strong className="text-white">صلاحيات الوصول الصارمة:</strong> يقتصر الوصول إلى خوادم الإنتاج وقواعد البيانات على مهندسي النظم المصرح لهم حصرياً وبموجب مصادقة متعددة العوامل (MFA) ومفاتيح أمان فيزيائية.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      We deploy multi-layered technical and organizational safeguards conforming to modern cybersecurity benchmarks:
                    </p>
                    <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02] space-y-3 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                      <p>
                        <strong className="text-white">Encryption Protocols:</strong> All network traffic between your client browser and our application servers is encrypted using Transport Layer Security (TLS 1.3). Sensitive persistent records in our database are encrypted at rest using AES-256.
                      </p>
                      <p>
                        <strong className="text-white">Strict Access Controls:</strong> Server infrastructure and production database instances are restricted to authorized engineering personnel via hardware security keys and multi-factor authentication.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* 5. Processors */}
            <section id="processors" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">05</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar' ? 'مزودو الخدمات وبوابات الدفع الخارجية' : 'Third-Party Service Providers'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      نتعامل حصرياً مع شركاء ومزودي خدمات ملتزمين بأعلى معايير حماية وخصوصية البيانات:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-zinc-300 pl-1">
                      <li><strong className="text-white">بوابات الدفع الإلكتروني:</strong> بوابات دفع مصرية ودولية مرخصة ومتوافقة مع معايير PCI-DSS لمعالجة المعاملات المالية بأمان.</li>
                      <li><strong className="text-white">البنية السحابية والاستضافة:</strong> مزودو استضافة سحابية حاصلون على شهادات الأمان العالمية ISO 27001 و SOC 2 Type II.</li>
                      <li><strong className="text-white">خدمات البريد الإلكتروني الفورية:</strong> واجهات برمجية آمنة لإرسال رسائل التحقق والإشعارات البريدية والفواتير.</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p>
                      We partner only with vetted service providers that uphold rigorous data protection contracts:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-zinc-300 pl-1">
                      <li><strong className="text-white">Payment Intermediaries:</strong> Licensed Egyptian and international payment gateways (e.g. Paymob, Stripe) for PCI-DSS compliant payment processing.</li>
                      <li><strong className="text-white">Infrastructure & Cloud Hosting:</strong> Enterprise cloud hosting providers with ISO 27001 and SOC 2 Type II certifications.</li>
                      <li><strong className="text-white">Transactional Email Delivery:</strong> Secure API email delivery engines for verification and billing receipts.</li>
                    </ul>
                  </>
                )}
              </div>
            </section>

            {/* 6. Cookies */}
            <section id="cookies" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">06</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar' ? 'ملفات تعريف الارتباط (Cookies) والبيانات التشغيلية' : 'Cookies & Analytical Telemetry'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      نستخدم ملفات تعريف الارتباط الأساسية ورموز التخزين المحلي الضرورية للحفاظ على جلسة تسجيل الدخول، وتفضيلات واجهة المستخدم، واللغة النشطة (العربية / الإنجليزية).
                    </p>
                    <p>
                      لا نستخدم أدوات التتبع الإعلانية التدخلية أو بيكسل التتبع الموجه لمنصات التواصل الاجتماعي الخارجية.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      We utilize strictly necessary session cookies and local storage tokens to preserve your login session, UI layout preferences, and active language (English/Arabic).
                    </p>
                    <p>
                      We do not use invasive third-party cross-site advertising trackers or social media surveillance pixels.
                    </p>
                  </>
                )}
              </div>
            </section>

            {/* 7. Rights */}
            <section id="rights" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">07</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar'
                    ? 'حقوق الخصوصية القانونية للمستخدم (القانون 151 لسنة 2020)'
                    : 'Your Statutory Privacy Rights (Law 151/2020)'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      بموجب قانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020، يتمتع المستخدم بالحقوق القانونية التالية:
                    </p>
                    <div className="p-6 rounded-xl border border-white/10 bg-black space-y-3">
                      <ul className="list-disc list-inside space-y-2.5 text-xs sm:text-sm text-zinc-300 pl-1">
                        <li><strong className="text-white">حق الاطلاع والوصول:</strong> يحق لك معرفة البيانات الشخصية الخاصة بك الموجودة لدينا والحصول على نسخة منها.</li>
                        <li><strong className="text-white">حق التصحيح والتحديث:</strong> يحق لك طلب تعديل أو استكمال أي بيانات شخصية غير دقيقة أو ناقصة.</li>
                        <li><strong className="text-white">حق المحو والحذف:</strong> يحق لك طلب حذف حسابك وبياناتك الشخصية، مع مراعاة متطلبات حفظ السجلات المالية والضريبية الملزمة قانوناً.</li>
                        <li><strong className="text-white">حق الرجوع في الموافقة:</strong> يحق لك في أي وقت إلغاء موافقتك السابقة على استقبال الرسائل الإخبارية غير الضرورية.</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      Under Egyptian Personal Data Protection Law No. 151 of 2020, you hold the following statutory rights:
                    </p>
                    <div className="p-6 rounded-xl border border-white/10 bg-black space-y-3">
                      <ul className="list-disc list-inside space-y-2.5 text-xs sm:text-sm text-zinc-300 pl-1">
                        <li><strong className="text-white">Right of Access:</strong> You may request confirmation of whether we hold personal data relating to you and receive a copy thereof.</li>
                        <li><strong className="text-white">Right of Rectification:</strong> You may request the correction or updating of any incomplete or inaccurate data.</li>
                        <li><strong className="text-white">Right of Erasure:</strong> You may request the deletion of your account and associated personal data, subject to statutory tax and financial transaction retention requirements.</li>
                        <li><strong className="text-white">Right to Revoke Consent:</strong> You may revoke consent previously granted for optional non-essential communications at any time.</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* 8. DPO Contact */}
            <section id="dpo" className="scroll-mt-32">
              <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-3">
                <span className="text-xs font-semibold text-zinc-400">08</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === 'ar' ? 'مسؤول حماية البيانات والاستفسارات القانونية' : 'Data Protection Officer & Privacy Inquiries'}
                </h2>
              </div>
              <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                {locale === 'ar' ? (
                  <>
                    <p>
                      لممارسة حقوقك القانونية أو تقديم استفسار يتعلق بسياسة الخصوصية وحماية البيانات، يرجى التواصل مع مسؤول حماية البيانات:
                    </p>
                    <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
                      <div className="text-xs text-zinc-400 font-medium mb-1">مسؤول حماية البيانات (DPO):</div>
                      <a
                        href="mailto:privacy@ticknal.com"
                        className="text-sm font-semibold text-white hover:text-zinc-300 transition-colors block"
                      >
                        privacy@ticknal.com
                      </a>
                      <p className="text-xs text-zinc-400 mt-2">
                        شركة تكنال للحلول التكنولوجية (ش.م.م)، القاهرة، جمهورية مصر العربية.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      To exercise your statutory data protection rights or report a privacy concern, please contact our Data Protection Officer:
                    </p>
                    <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
                      <div className="text-xs text-zinc-400 font-medium mb-1">Data Protection Officer (DPO):</div>
                      <a
                        href="mailto:privacy@ticknal.com"
                        className="text-sm font-semibold text-white hover:text-zinc-300 transition-colors block"
                      >
                        privacy@ticknal.com
                      </a>
                      <p className="text-xs text-zinc-400 mt-2">
                        Ticknal Technologies S.A.E., Cairo, Arab Republic of Egypt.
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

