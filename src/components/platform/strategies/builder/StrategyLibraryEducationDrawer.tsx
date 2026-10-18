'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { BookOpen, ExternalLink, X } from '@/components/ui/icon-library';
import type { StrategyLibraryEducation } from './strategy-library-education';

const RSI_EXAMPLE = [53, 47, 34, 24, 28, 36, 46, 58, 68, 77, 73, 64, 72, 79, 66, 61, 49];

function RsiExampleChart({ locale }: { readonly locale: 'en' | 'ar' }) {
  const line = RSI_EXAMPLE.map((value, index) => `${18 + index * 21.5},${152 - value * 1.3}`).join(' ');
  const isAr = locale === 'ar';
  return (
    <figure className="strategy-education-chart" aria-label={isAr ? 'رسم توضيحي لمؤشر RSI مع مستويي 30 و70' : 'Illustrative RSI chart with 30 and 70 levels'}>
      <div className="strategy-education-chart-heading">
        <span>{isAr ? 'كيف تبدو المستويات على الرسم' : 'Reading the levels'}</span>
        <span>{isAr ? 'مثال توضيحي · ليست بيانات حية' : 'Illustration · not live data'}</span>
      </div>
      <svg viewBox="0 0 390 166" role="img" aria-label={isAr ? 'يهبط RSI دون 30 ثم يعود فوقها، ويرتفع فوق 70 ثم يعود تحتها' : 'RSI moves below 30 then recovers above it, later moves above 70 then drops below it'}>
        {[70, 50, 30].map((level) => {
          const y = 152 - level * 1.3;
          return <g key={level}>
            <line x1="18" x2="354" y1={y} y2={y} stroke="currentColor" strokeOpacity={level === 50 ? 0.12 : 0.23} strokeDasharray={level === 50 ? '2 5' : '4 5'} />
            <text x="366" y={y + 4} fill="currentColor" fontSize="10" textAnchor="middle">{level}</text>
          </g>;
        })}
        <polyline points={line} fill="none" stroke="var(--plt-info)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="125.5" cy={152 - 36 * 1.3} r="4" fill="var(--plt-info)" />
        <circle cx="319" cy={152 - 66 * 1.3} r="4" fill="var(--plt-info)" />
      </svg>
      <figcaption>{isAr ? 'العودة فوق 30 أو تحت 70 قد تصبح شرطاً في القاعدة، لكنها لا تضمن نتيجة الصفقة.' : 'A move back above 30 or below 70 can become a rule condition; neither guarantees the trade outcome.'}</figcaption>
    </figure>
  );
}

export default function StrategyLibraryEducationDrawer({
  guide,
  locale,
  origin = 'library',
  onClose,
}: {
  readonly guide: StrategyLibraryEducation;
  readonly locale: 'en' | 'ar';
  readonly origin?: 'library' | 'canvas';
  readonly onClose: () => void;
}) {
  const isAr = locale === 'ar';
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' && event.key !== 'Tab') return;
      event.stopPropagation();
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) {
        event.preventDefault();
        focusable[focusable.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
        event.preventDefault();
        focusable[0].focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previous?.focus();
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="drawer-overlay strategy-education-overlay" role="dialog" aria-modal="true" aria-labelledby="strategy-education-title">
      <button type="button" className="drawer-backdrop" aria-label={isAr ? 'إغلاق دليل العنصر' : 'Close item guide'} onClick={onClose} tabIndex={-1} />
      <aside ref={dialogRef} className="drawer-sheet drawer-sheet-viewport-safe strategy-education-sheet">
        <header className="drawer-header strategy-education-header">
          <div className="min-w-0">
            <p className="strategy-library-eyebrow">{origin === 'canvas' ? (isAr ? 'دليل الكتلة' : 'Block guide') : (isAr ? 'تعلّم قبل الإضافة' : 'Learn before you add')}</p>
            <h2 id="strategy-education-title" className="strategy-education-title">{guide.title}</h2>
            <p className="strategy-education-category">{guide.category}</p>
          </div>
          <button ref={closeRef} type="button" className="drawer-close-btn" onClick={onClose} aria-label={isAr ? 'إغلاق دليل العنصر' : 'Close item guide'}><X size={16} /></button>
        </header>

        <div className="drawer-body strategy-education-body custom-scrollbar select-text">
          <section className="strategy-education-section">
            <h3>{isAr ? 'ما هو؟' : 'What is it?'}</h3>
            <p>{guide.summary}</p>
          </section>

          {guide.visualization === 'rsi' && <RsiExampleChart locale={locale} />}

          <section className="strategy-education-section">
            <h3>{isAr ? 'كيف يعمل؟' : 'How it works'}</h3>
            <p>{guide.howItWorks}</p>
          </section>

          {guide.levels.length > 0 && <section className="strategy-education-section">
            <h3>{isAr ? 'فهم المستويات' : 'Understand the levels'}</h3>
            <div className="strategy-education-levels">
              {guide.levels.map((level) => <div key={level.value} className="strategy-education-level">
                <span className="strategy-education-level-value tabular-nums">{level.value}</span>
                <div><strong>{level.label}</strong><p>{level.meaning}</p></div>
              </div>)}
            </div>
          </section>}

          <section className="strategy-education-section">
            <h3>{isAr ? 'كيف أستخدمه في الاستراتيجية؟' : 'How to use it in a strategy'}</h3>
            <p>{guide.howToUse}</p>
            <p className="strategy-education-example">{guide.example}</p>
          </section>

          {(guide.parameters.length > 0 || guide.outputs.length > 0) && <section className="strategy-education-section">
            <h3>{isAr ? 'الإعدادات والمخرجات المتاحة' : 'Available settings and outputs'}</h3>
            {guide.parameters.length > 0 && <div className="strategy-education-meta"><span>{isAr ? 'الإعدادات الافتراضية' : 'Default settings'}</span><div>{guide.parameters.map((parameter) => <span key={parameter} className="strategy-education-token">{parameter}</span>)}</div></div>}
            {guide.outputs.length > 0 && <div className="strategy-education-meta"><span>{isAr ? 'المخرجات' : 'Outputs'}</span><div>{guide.outputs.map((output) => <span key={output} className="strategy-education-token">{output}</span>)}</div></div>}
          </section>}

          <section className="strategy-education-section strategy-education-caution">
            <h3>{isAr ? 'قبل الاعتماد عليه' : 'Before relying on it'}</h3>
            <p>{guide.caution}</p>
          </section>

          {guide.sourceUrl && <a href={guide.sourceUrl} target="_blank" rel="noopener noreferrer" className="strategy-education-source">
            <BookOpen size={14} aria-hidden="true" />
            {isAr ? 'اقرأ شرح المؤشر من TradingView' : 'Read the TradingView RSI reference'}
            <ExternalLink size={12} aria-hidden="true" />
          </a>}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
