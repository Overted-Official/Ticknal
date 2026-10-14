'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Globe,
  Settings,
} from '@/components/ui/icon-library';
import { useTranslation } from '@/lib/i18n';
import { BorderBeam } from 'border-beam';
import dynamic from 'next/dynamic';

const MobileSearchScreen = dynamic(
  () => import('./MobileSearchScreen'),
  { ssr: false }
);

export interface MobileHomeHeroProps {
  userProfile?: {
    name: string;
    avatarUrl?: string | null;
    email?: string;
  };
  activeAlertCount?: number;
}

function getFirstName(fullName?: string | null, isAr = false): string {
  if (!fullName || !fullName.trim()) {
    return isAr ? 'المستثمر' : 'Investor';
  }
  const trimmed = fullName.trim();
  // Arabic compound names like "عبد الرحمن", "عبد الله", etc.
  if (/^عبد\s+\S+/i.test(trimmed)) {
    const parts = trimmed.split(/\s+/);
    return `${parts[0]} ${parts[1]}`;
  }
  // English compound names like "Abdel Rahman", "Abdul Rahman"
  if (/^(abdel|abdul)\s+\S+/i.test(trimmed)) {
    const parts = trimmed.split(/\s+/);
    return `${parts[0]} ${parts[1]}`;
  }
  return trimmed.split(/\s+/)[0];
}

export default function MobileHomeHero({
  userProfile,
  activeAlertCount = 0,
}: MobileHomeHeroProps) {
  const { locale, setLocale } = useTranslation();
  const isAr = locale === 'ar';

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const toggleLocale = () => {
    const nextLocale = locale === 'ar' ? 'en' : 'ar';
    setLocale(nextLocale);
  };

  const firstName = useMemo(
    () => getFirstName(userProfile?.name, isAr),
    [userProfile?.name, isAr]
  );

  return (
    <>
      <div
        className="relative w-full h-[144px] min-h-[144px] max-h-[144px] select-none text-white transition-all z-30 flex flex-col justify-between overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0099ff 0%, #2962ff 45%, #7928ca 80%, #a822ff 100%)',
        }}
      >
        {/* Ambient background glow & subtle vignette */}
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.18),transparent_65%)] pointer-events-none" />

        {/* Main Hero Content - Harmonious 20px top / 10px middle / 20px bottom spacing */}
        <div className="relative z-10 px-4 pt-[20px] flex flex-col">
          {/* Row 1: Profile Avatar + Greeting (Left) & Quick Language Switch (Right) */}
          <div className="flex items-center justify-between gap-3 h-10">
            {/* Left: Avatar + Greeting */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {/* Profile Avatar on the left */}
              <Link
                href="/settings"
                className="shrink-0 relative rounded-full ring-2 ring-white/35 shadow-sm active:scale-95 transition-transform overflow-hidden w-10 h-10 flex items-center justify-center bg-white/20"
                title={isAr ? 'الملف الشخصي والإعدادات' : 'Profile & Settings'}
              >
                {userProfile?.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt={firstName}
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-white font-bold text-sm select-none">
                    {firstName.charAt(0).toUpperCase()}
                  </span>
                )}
              </Link>

              {/* Greeting text with short, non-truncated subtitle */}
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <h1 className="text-[15px] font-bold text-white tracking-tight leading-tight truncate font-sans">
                  <span>{isAr ? 'مرحباً، ' : 'Hello, '}</span>
                  <span className="truncate">{firstName}</span>
                </h1>
                <p className="text-[11px] text-white/75 truncate font-sans mt-0.5 leading-none">
                  {isAr ? 'نظرة عامة على السوق' : 'Market Overview'}
                </p>
              </div>
            </div>

            {/* Quick Language Toggle Pill on the right */}
            <button
              type="button"
              onClick={toggleLocale}
              className="h-8 px-3 rounded-full bg-black/40 hover:bg-black/50 active:bg-black/60 border-0 outline-none text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-none cursor-pointer shrink-0"
              title={isAr ? 'التبديل إلى الإنجليزية' : 'Switch to Arabic'}
              aria-label={isAr ? 'تغيير اللغة' : 'Change Language'}
            >
              <span className={!isAr ? 'font-cairo font-semibold leading-none' : 'font-sans font-semibold leading-none'}>
                {isAr ? 'EN' : 'عربي'}
              </span>
              <Globe size={13} className="text-white/80 shrink-0" />
            </button>
          </div>

          {/* Row 2: Search Bar + Settings Button - Compact 10px gap from Row 1 */}
          <div className="mt-2.5 flex items-center gap-2.5 h-10">
            {/* Search Bar Trigger with BorderBeam effect */}
            <div className="relative flex-1 min-w-0 h-10">
              <BorderBeam
                size="sm"
                colorVariant="ocean"
                borderRadius={9999}
                duration={2.5}
                className="w-full h-full rounded-full"
              >
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(true)}
                  className="w-full h-10 px-3.5 rounded-full bg-black/40 hover:bg-black/50 active:bg-black/60 border-0 outline-none transition-all flex items-center gap-2.5 cursor-pointer text-start shadow-none"
                  aria-label={isAr ? 'فتح البحث الشامل' : 'Open universal search'}
                >
                  <Search size={15} className="text-white/45 shrink-0" />
                  <span className="text-xs text-white/50 font-sans truncate flex-1">
                    {isAr ? 'بحث في الأسهم، الصناديق، المعادن...' : 'Search stocks, funds, metals...'}
                  </span>
                </button>
              </BorderBeam>
            </div>

            {/* Quick Settings Button */}
            <Link
              href="/settings"
              className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/50 active:bg-black/60 border-0 outline-none flex items-center justify-center text-white/90 relative transition-all active:scale-95 shrink-0 shadow-none"
              title={isAr ? 'الإعدادات' : 'Settings'}
              aria-label={isAr ? 'الإعدادات' : 'Settings'}
            >
              <Settings size={16} />
            </Link>
          </div>
        </div>

        {/* Symmetrical gentle organic bottom curve into pitch-black page */}
        <div className="w-full overflow-hidden leading-none -mb-px shrink-0">
          <svg
            viewBox="0 0 1440 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-3 sm:h-3.5 block text-black fill-current"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M0,6 C480,18 960,18 1440,6 L1440,24 L0,24 Z" />
          </svg>
        </div>
      </div>

      {/* Full-Page Mobile Search Screen Modal - Dynamically loaded only when user taps search */}
      {isSearchOpen && (
        <MobileSearchScreen
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />
      )}
    </>
  );
}
