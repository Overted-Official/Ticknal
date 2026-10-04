'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import { useTranslation } from '@/lib/i18n';

export default function ContactSupportPage() {
  const { locale, isRTL } = useTranslation();
  const [department, setDepartment] = useState('support');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName && email && message) {
      setSubmitted(true);
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
          <span className="text-zinc-300">{locale === 'ar' ? 'الدعم والمساعدة' : 'Support'}</span>
          <span className="text-zinc-600">/</span>
          <span className="text-white">{locale === 'ar' ? 'التواصل والاستفسارات المؤسسية' : 'Contact & Inquiries'}</span>
        </nav>

        {/* Hero Section Header */}
        <header className="border-b border-white/10 pb-10 sm:pb-14 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/[0.03] text-zinc-300 text-[11px] font-semibold mb-5 tracking-wider uppercase">
            {locale === 'ar' ? 'قنوات الاتصال الرسمية • القاهرة، مصر' : 'Official Communication Channels • Cairo, Egypt'}
          </div>

          <h1
            className="text-3xl sm:text-5xl lg:text-[56px] font-semibold text-white tracking-tight leading-[1.12] mb-5 max-w-5xl font-euclid"
            style={{ fontFamily: 'EuclidCircularSemibold, sans-serif' }}
          >
            {locale === 'ar' ? (
              <>
                التواصل و{' '}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: 'linear-gradient(90deg, #0099ff 0%, #2962ff 50%, #a822ff 100%)',
                  }}
                >
                  الاستفسارات المؤسسية
                </span>
              </>
            ) : (
              <>
                Contact &{' '}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: 'linear-gradient(90deg, #0099ff 0%, #2962ff 50%, #a822ff 100%)',
                  }}
                >
                  Corporate Inquiries
                </span>
              </>
            )}
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-4xl leading-relaxed font-normal">
            {locale === 'ar'
              ? 'قنوات اتصال مباشرة للدعم الفني للمستخدمين، والشراكات المؤسسية، والامتثال التنظيمي، والإبلاغ الأمني مع شركة تكنال للحلول التكنولوجية (ش.م.م).'
              : 'Direct communication channels for customer assistance, institutional partnerships, regulatory compliance, and security reporting with Ticknal Technologies S.A.E.'}
          </p>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 mt-8 text-xs text-zinc-400 font-medium">
            <div>
              <span className="text-zinc-300">{locale === 'ar' ? 'المقر الرئيسي:' : 'Headquarters:'}</span>{' '}
              {locale === 'ar' ? 'القاهرة، جمهورية مصر العربية' : 'Cairo, Arab Republic of Egypt'}
            </div>
            <div className="hidden sm:inline text-zinc-700">•</div>
            <div>
              <span className="text-zinc-300">{locale === 'ar' ? 'مدة الرد:' : 'Response SLA:'}</span>{' '}
              {locale === 'ar' ? 'خلال 24 ساعة عمل' : 'Within 24 Business Hours'}
            </div>
            <div className="hidden sm:inline text-zinc-700">•</div>
            <div>
              <span className="text-zinc-300">{locale === 'ar' ? 'الكيان القانوني:' : 'Corporate Entity:'}</span>{' '}
              {locale === 'ar' ? 'شركة تكنال للحلول التكنولوجية (ش.م.م)' : 'Ticknal Technologies S.A.E.'}
            </div>
          </div>
        </header>

        {/* Department Summary Grid */}
        <section aria-label="Department Directory" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-16 sm:mb-20">
          <div className="p-6 rounded-xl border border-white/10 bg-black hover:border-white/20 transition-colors flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                {locale === 'ar' ? '01 / خدمة المستخدمين' : '01 / User Support'}
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                {locale === 'ar' ? 'خدمة العملاء والاشتراكات' : 'Customer Care & Billing'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                {locale === 'ar'
                  ? 'المساعدة في توثيق الحسابات، وفواتير الاشتراكات، وإرشادات استخدام أدوات المنصة.'
                  : 'Account verification, subscription billing, and terminal feature guidance.'}
              </p>
              <a href="mailto:support@ticknal.com" className="text-xs font-semibold text-white hover:text-zinc-300 underline underline-offset-4">
                support@ticknal.com
              </a>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-black hover:border-white/20 transition-colors flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                {locale === 'ar' ? '02 / القطاع المؤسسي' : '02 / Institutional'}
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                {locale === 'ar' ? 'شركات السمسرة والبحوث' : 'Brokers & Data Desks'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                {locale === 'ar'
                  ? 'التكامل مع شركات الوساطة، ومكاتب البحوث المالية، وواجهات برمجة التطبيقات (APIs).'
                  : 'Brokerage partner integrations, institutional research desks, and APIs.'}
              </p>
              <a href="mailto:partners@ticknal.com" className="text-xs font-semibold text-white hover:text-zinc-300 underline underline-offset-4">
                partners@ticknal.com
              </a>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-black hover:border-white/20 transition-colors flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                {locale === 'ar' ? '03 / الشؤون التنظيمية' : '03 / Regulatory'}
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                {locale === 'ar' ? 'الامتثال والرقابة المالية' : 'Compliance & Legal'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                {locale === 'ar'
                  ? 'مراسلات الهيئة العامة للرقابة المالية (FRA) والاستفسارات القانونية الرسمية.'
                  : 'Financial Regulatory Authority (FRA) correspondence and legal inquiries.'}
              </p>
              <a href="mailto:compliance@ticknal.com" className="text-xs font-semibold text-white hover:text-zinc-300 underline underline-offset-4">
                compliance@ticknal.com
              </a>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-black hover:border-white/20 transition-colors flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                {locale === 'ar' ? '04 / الأمن السيبراني' : '04 / Security'}
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                {locale === 'ar' ? 'مكافحة الاحتيال والأمان' : 'Anti-Fraud & Security'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                {locale === 'ar'
                  ? 'الإبلاغ عن محاولات انتحال الهوية، وعمليات الاحتيال، والإفصاحات الأمنية.'
                  : 'Report impersonation attempts, fraudulent scams, or security disclosures.'}
              </p>
              <a href="mailto:security@ticknal.com" className="text-xs font-semibold text-white hover:text-zinc-300 underline underline-offset-4">
                security@ticknal.com
              </a>
            </div>
          </div>
        </section>

        {/* Two-Column Form & Direct Contact Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 w-full items-start">
          {/* Left Column: Direct Transmission Form */}
          <div className="lg:col-span-7 xl:col-span-8 p-6 sm:p-10 rounded-2xl border border-white/10 bg-black">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
              {locale === 'ar' ? 'إرسال استفسار رسمي' : 'Send an Official Inquiry'}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mb-8 leading-relaxed">
              {locale === 'ar'
                ? 'يقوم فريق العمليات بالقاهرة بمراجعة كافة الاستفسارات الواردة خلال أيام العمل الرسمية في مصر (من الأحد إلى الخميس).'
                : 'Our Cairo operations team reviews all incoming inquiries during standard Egyptian business days (Sunday through Thursday).'}
            </p>

            {submitted ? (
              <div className="p-8 rounded-xl border border-white/20 bg-white/[0.02] text-center space-y-3">
                <div className="text-sm font-semibold text-white">
                  {locale === 'ar' ? 'تم إرسال الاستفسار بنجاح' : 'Inquiry Transmitted'}
                </div>
                <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                  {locale === 'ar'
                    ? `شكراً لتواصلك معنا. تم توجيه استفسارك إلى مكتب ${department.toUpperCase()}. سيقوم أحد مسؤولينا بالرد على ${email} خلال 24 ساعة عمل.`
                    : `Thank you for reaching out. Your inquiry has been routed to our ${department.toUpperCase()} desk. A representative will respond to ${email} within 24 business hours.`}
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-4 px-4 py-2 rounded-full border border-white/20 text-xs font-semibold text-white hover:bg-white hover:text-black transition-all cursor-pointer"
                >
                  {locale === 'ar' ? 'إرسال استفسار آخر' : 'Send Another Inquiry'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-2 uppercase tracking-wider">
                      {locale === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={locale === 'ar' ? 'مثال: طارق منصور' : 'e.g. Tarek Mansour'}
                      className="w-full rounded-lg border border-white/15 bg-white/[0.03] px-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-2 uppercase tracking-wider">
                      {locale === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={locale === 'ar' ? 'مثال: tarek@example.com' : 'e.g. tarek@example.com'}
                      className="w-full rounded-lg border border-white/15 bg-white/[0.03] px-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-2 uppercase tracking-wider">
                      {locale === 'ar' ? 'القسم المختص' : 'Department'}
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full rounded-lg border border-white/15 bg-black px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-white transition-colors cursor-pointer"
                    >
                      <option value="support">
                        {locale === 'ar' ? 'خدمة العملاء والدعم الفني' : 'Customer Care & Technical Support'}
                      </option>
                      <option value="partnerships">
                        {locale === 'ar' ? 'الشراكات المؤسسية وشركات السمسرة' : 'Institutional & Broker Partnerships'}
                      </option>
                      <option value="compliance">
                        {locale === 'ar' ? 'الشؤون القانونية والرقابة المالية (FRA)' : 'Regulatory & Legal Affairs (FRA)'}
                      </option>
                      <option value="security">
                        {locale === 'ar' ? 'الإبلاغ الأمني ومكافحة الانتحال' : 'Security & Impersonation Scam Report'}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-2 uppercase tracking-wider">
                      {locale === 'ar' ? 'الموضوع' : 'Subject'}
                    </label>
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder={locale === 'ar' ? 'ملخص موجز للموضوع' : 'Brief topic summary'}
                      className="w-full rounded-lg border border-white/15 bg-white/[0.03] px-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-2 uppercase tracking-wider">
                    {locale === 'ar' ? 'الرسالة' : 'Message'}
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      locale === 'ar'
                        ? 'يرجى كتابة تفاصيل استفسارك أو مشكلتك الفنية...'
                        : 'Provide details regarding your inquiry or technical issue...'
                    }
                    className="w-full rounded-lg border border-white/15 bg-white/[0.03] px-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3 rounded-full bg-white text-black font-semibold text-xs sm:text-sm hover:bg-zinc-200 active:scale-95 transition-all cursor-pointer shadow-md"
                >
                  {locale === 'ar' ? 'إرسال الاستفسار' : 'Submit Inquiry'}
                </button>
              </form>
            )}
          </div>

          {/* Right Column: Corporate Headquarters & Office Info */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            <div className="p-6 rounded-2xl border border-white/10 bg-black space-y-4">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                {locale === 'ar' ? 'المقر الرئيسي للشركة' : 'Corporate Headquarters'}
              </div>
              <h3 className="text-base font-bold text-white">
                {locale === 'ar' ? 'شركة تكنال للحلول التكنولوجية (ش.م.م)' : 'Ticknal Technologies S.A.E.'}
              </h3>
              <p className="text-xs sm:text-[13px] text-zinc-400 leading-relaxed">
                {locale === 'ar' ? (
                  <>
                    شركة مساهمة مصرية خاضعة للقانون المصري<br />
                    قطاع التكنولوجيا المالية وذكاء الأسواق<br />
                    القاهرة، جمهورية مصر العربية
                  </>
                ) : (
                  <>
                    Incorporated Egyptian Joint Stock Company<br />
                    Financial Technology & Market Intelligence Division<br />
                    Cairo, Arab Republic of Egypt
                  </>
                )}
              </p>
              <div className="pt-3 border-t border-white/10 space-y-2 text-xs text-zinc-400">
                <div>
                  <strong className="text-white">{locale === 'ar' ? 'ساعات العمل:' : 'Operating Hours:'}</strong>{' '}
                  {locale === 'ar' ? 'الأحد – الخميس، 9:00 ص – 5:00 م (توقيت القاهرة)' : 'Sun – Thu, 9:00 AM – 5:00 PM (EET)'}
                </div>
                <div>
                  <strong className="text-white">{locale === 'ar' ? 'جلسة تداول البورصة:' : 'EGX Market Trading Hours:'}</strong>{' '}
                  {locale === 'ar' ? 'الأحد – الخميس، 10:00 ص – 2:30 م (توقيت القاهرة)' : 'Sun – Thu, 10:00 AM – 2:30 PM (EET)'}
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] space-y-3">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                {locale === 'ar' ? 'تنبيه عاجل لمكافحة الاحتيال' : 'Urgent Anti-Fraud Notice'}
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {locale === 'ar' ? (
                  <>
                    إذا تواصل معك أي شخص عبر تيليجرام أو واتساب مدعياً تمثيل تكنال وعارضاً إدارة استثمارات أو طالباً إيداعات، يرجى الإبلاغ فوراً عبر <strong className="text-white">security@ticknal.com</strong>. تكنال لا تقبل أي ودائع استثمارية نهائياً.
                  </>
                ) : (
                  <>
                    If someone contacts you on Telegram or WhatsApp claiming to represent Ticknal and offering investment management or asking for deposits, report them immediately to <strong className="text-white">security@ticknal.com</strong>. Ticknal never accepts investment deposits.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}

