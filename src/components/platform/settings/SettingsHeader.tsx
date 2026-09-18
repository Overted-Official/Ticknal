'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  Check,
  User,
  ShieldCheck,
  Smartphone,
  Bell,
  TrendingUp,
  Landmark,
  ExternalLink,
} from '@/components/ui/icon-library';
import type { SettingsTabType } from './SettingsNavigationRail';

interface SettingsHeaderProps {
  activeTab: SettingsTabType;
  onTabChange: (tab: SettingsTabType) => void;
}

const SETTINGS_SECTIONS = [
  { label: 'Profile', tab: 'profile' as SettingsTabType, icon: User },
  { label: 'Security & PIN', tab: 'security' as SettingsTabType, icon: ShieldCheck },
  { label: 'Connected Devices', tab: 'devices' as SettingsTabType, icon: Smartphone },
  { label: 'Alert Triggers', tab: 'alerts' as SettingsTabType, icon: Bell },
];

const PLATFORM_VIEWS = [
  { label: 'Networth', href: '/dashboard?tab=net-worth', icon: Landmark },
  { label: 'Investments', href: '/dashboard?tab=investments', icon: TrendingUp },
  { label: 'Banks', href: '/dashboard?tab=banks', icon: Landmark },
];

export default function SettingsHeader({ activeTab, onTabChange }: SettingsHeaderProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <header className="flex items-center justify-between gap-4 select-none pb-1">
      {/* Left: Single-line Breadcrumb & Title with Dropdown */}
      <div className="flex items-center gap-2">
        <span
          className="text-xs md:text-sm text-[#787b86] font-normal hover:text-white transition-colors cursor-pointer"
          onClick={() => router.push('/dashboard')}
        >
          Dashboard
        </span>
        <span className="text-xs md:text-sm text-[#50535e]">/</span>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            className="group inline-flex items-center gap-1.5 text-2xl md:text-3xl font-bold text-white tracking-tight hover:opacity-90 transition-opacity focus:outline-hidden cursor-pointer"
          >
            <span>Settings</span>
            <ChevronDown
              className={`w-5 h-5 text-[#787b86] group-hover:text-white transition-transform duration-200 ${
                isOpen ? 'transform rotate-180 text-white' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu for Settings & Platform Views */}
          {isOpen && (
            <div className="absolute left-0 top-full mt-2 w-64 rounded-xl bg-[#121214] border border-[#27272a] shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-[#787b86] uppercase tracking-wider">
                Settings views
              </div>
              {SETTINGS_SECTIONS.map((section) => {
                const isActive = activeTab === section.tab;
                const Icon = section.icon;
                return (
                  <button
                    key={section.tab}
                    type="button"
                    onClick={() => {
                      onTabChange(section.tab);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left cursor-pointer ${
                      isActive
                        ? 'bg-[#18181b] text-white font-medium border border-[#27272a]'
                        : 'text-[#d1d4dc] hover:text-white hover:bg-[#18181b]/70 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#2962ff]' : 'text-[#787b86]'}`} />
                      <span>{section.label}</span>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-[#089981]" />}
                  </button>
                );
              })}

              <div className="my-1.5 border-t border-[#222225]" />

              <div className="px-3 py-1.5 text-[11px] font-semibold text-[#787b86] uppercase tracking-wider">
                Platform views
              </div>
              {PLATFORM_VIEWS.map((page) => {
                const Icon = page.icon;
                return (
                  <button
                    key={page.href}
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      router.push(page.href);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left text-[#d1d4dc] hover:text-white hover:bg-[#18181b]/70 border border-transparent cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-[#787b86]" />
                      <span>{page.label}</span>
                    </div>
                    <span className="text-[#50535e] text-xs">↗</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="hidden sm:flex items-center gap-2.5 shrink-0 flex-wrap">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#18181b] border border-[#27272a] text-[#d1d4dc] hover:text-white hover:bg-[#222225] hover:border-[#3f3f46] transition-all shadow-xs"
        >
          <span>Dashboard</span>
          <span className="text-[#787b86]">→</span>
        </Link>
        <Link
          href="/wallet?tab=positions"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#18181b] border border-[#27272a] text-[#d1d4dc] hover:text-white hover:bg-[#222225] hover:border-[#3f3f46] transition-all shadow-xs"
        >
          <span>Manage Positions</span>
          <span className="text-[#787b86]">→</span>
        </Link>
        <Link
          href="/invest"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#2962ff] text-white hover:bg-[#1e53e5] transition-all shadow-xs"
        >
          <span>Open Invest</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </header>
  );
}
