'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Globe,
  User,
} from '@/components/ui/icon-library';
import TicknalBrand from '@/components/ui/TicknalBrand';
import { useTranslation } from '@/lib/i18n';

export default function LandingNavbar() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const { locale, setLocale, isRTL, t } = useTranslation();
  const [activeSection, setActiveSection] = useState<string>('');

  const navItems = [
    { label: t('landing.navMarkets'), href: '#markets' },
    { label: t('landing.navAssets'), href: '#products' },
    { label: t('landing.navWorkflow'), href: '#workflow-pipeline' },
    { label: t('landing.navBrokers'), href: '#brokers' },
    { label: t('landing.navPricing'), href: '#pricing' },
    { label: t('landing.navFaq'), href: '#faq' },
  ];

  // Precision active section tracking for smooth scroll
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sectionIds = ['markets', 'products', 'workflow-pipeline', 'brokers', 'pricing', 'faq'];

    const handleScroll = () => {
      const scrollPos = window.scrollY + 140;
      let current = '';

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            current = `#${id}`;
            break;
          }
        }
      }

      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleLanguage = () => {
    const nextLocale = locale === 'ar' ? 'en' : 'ar';
    setLocale(nextLocale);
  };

  return (
    <header className="fixed top-3 sm:top-4 inset-x-0 z-50 w-full px-3 sm:px-6 pointer-events-none select-none flex items-center justify-center font-sans">
      <div
        className="pointer-events-auto flex items-center justify-between gap-2.5 sm:gap-4 md:gap-6 rounded-full border border-white/15 bg-black/60 backdrop-blur-xl backdrop-saturate-150 px-2.5 sm:px-4 py-1.5 sm:py-2 shadow-[0_8px_32px_0_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.12)] max-w-[calc(100vw-24px)] md:max-w-max transition-all"
        style={{
          WebkitBackdropFilter: 'blur(20px) saturate(150%)',
          backdropFilter: 'blur(20px) saturate(150%)',
        }}
      >
        {/* 1. Brand Logo & Name (matching Euclid Circular Semibold lowercase 'ticknal') */}
        <TicknalBrand size="md" className="pl-1 pr-1 sm:pr-2 rtl:pl-2 rtl:pr-1" />

        {/* Subtle Divider */}
        <div className="hidden md:block w-px h-4 bg-white/15 shrink-0" />

        {/* 2. Center: Quick-Access Real Section Anchor Links */}
        <nav className="hidden md:flex items-center gap-0.5 sm:gap-1">
          {navItems.map((item) => {
            const isActive = isHome && activeSection === item.href;
            const targetHref = isHome ? item.href : `/${item.href}`;
            return (
              <Link
                key={item.href}
                href={targetHref}
                className={`relative inline-flex items-center justify-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-[13px] transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'text-white bg-white/[0.14] font-semibold shadow-xs'
                    : 'text-zinc-300 font-medium hover:text-white hover:bg-white/[0.08] active:bg-white/15'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Subtle Divider */}
        <div className="hidden md:block w-px h-4 bg-white/15 shrink-0" />

        {/* 3. Right: Language + Login Icon + Action Button */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 pr-0.5 rtl:pr-0 rtl:pl-0.5">
          {/* Language Toggle */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-full text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors text-xs font-medium cursor-pointer"
            title={locale === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'}
            aria-label="Toggle language"
          >
            <Globe size={15} strokeWidth={1.8} />
            <span className="hidden sm:inline text-xs font-sans">
              {locale === 'ar' ? 'العربية' : 'EN'}
            </span>
          </button>

          {/* User Sign In Icon */}
          <Link
            href="/login"
            className="p-1 sm:p-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors flex items-center justify-center cursor-pointer"
            title={t('landing.navSignIn')}
            aria-label={t('landing.navSignIn')}
          >
            <User size={16} strokeWidth={1.8} />
          </Link>

          {/* Minimalist Pure White Pill Action Button */}
          <Link
            href="/login"
            className="relative inline-flex items-center justify-center px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full font-sans text-xs sm:text-[12px] font-semibold text-black bg-white hover:bg-zinc-200 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
          >
            <span className="tracking-tight whitespace-nowrap">{t('landing.navGetStarted')}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
