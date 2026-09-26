'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronDown,
  User,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  Landmark,
} from '@/components/ui/icon-library';

const SETTINGS_SECTIONS = [
  { label: 'Profile', id: 'section-profile', icon: User },
  { label: 'Security & PIN', id: 'section-security', icon: ShieldCheck },
  { label: 'Connected Devices', id: 'section-devices', icon: Smartphone },
];

const PLATFORM_VIEWS = [
  { label: 'Home', href: '/home', icon: TrendingUp },
  { label: 'Charts', href: '/charts', icon: TrendingUp },
  { label: 'Markets', href: '/markets', icon: Landmark },
  { label: 'Ledger', href: '/transactions', icon: Landmark },
];

export default function SettingsHeader() {
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

  const scrollToSection = (id: string) => {
    setIsOpen(false);
    const element = document.getElementById(id);
    if (!element) return;
    const container = document.querySelector('.command-surface-page') as HTMLElement | null;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const targetScrollTop = container.scrollTop + (elementRect.top - containerRect.top) - 56;
      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth',
      });
    } else {
      const top = element.getBoundingClientRect().top + window.scrollY - 56;
      window.scrollTo({
        top: Math.max(0, top),
        behavior: 'smooth',
      });
    }
  };

  return (
    <header className="flex items-center justify-between gap-4 select-none pb-1 font-sans">
      {/* Left: Breadcrumb & Title */}
      <div className="flex items-center gap-2">
        <Link
          href="/home"
          className="text-xs md:text-sm text-text-muted font-normal hover:text-white transition-colors"
        >
          Home
        </Link>
        <span className="text-xs md:text-sm text-text-muted">/</span>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            className="group inline-flex items-center gap-1.5 text-2xl md:text-3xl font-bold text-white tracking-tight hover:opacity-90 transition-opacity focus:outline-hidden cursor-pointer"
          >
            <span>Settings</span>
            <ChevronDown
              className={`w-5 h-5 text-text-muted group-hover:text-white transition-transform duration-200 ${
                isOpen ? 'transform rotate-180 text-white' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu for Settings & Platform Views */}
          {isOpen && (
            <div className="absolute left-0 top-full mt-2 w-64 rounded-xl bg-black border border-border-subtle shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Jump to Section
              </div>
              {SETTINGS_SECTIONS.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-white hover:bg-white/[0.04] border border-transparent transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-text-muted" />
                      <span>{section.label}</span>
                    </div>
                  </button>
                );
              })}

              <div className="my-1.5 border-t border-border-subtle" />

              <div className="px-3 py-1.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
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
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left text-text-secondary hover:text-white hover:bg-white/[0.04] border border-transparent cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-text-muted" />
                      <span>{page.label}</span>
                    </div>
                    <span className="text-text-muted text-xs">↗</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
