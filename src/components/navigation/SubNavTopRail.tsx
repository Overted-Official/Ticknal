'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight } from '@/components/ui/icon-library';
import { useMobileNavScroll } from '@/context/MobileNavScrollContext';
import { controlHover, controlTap } from '@/lib/motion';

export type SubNavTabItem = {
  label: string;
  value: string;
  icon?: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  badge?: string | number;
};

export interface SubNavTopRailProps {
  items?: SubNavTabItem[];
  activeTab?: string;
  onChange?: (value: string) => void;
  userName?: string;
  userAvatarUrl?: string;
  accountName?: string;
  accountPillHref?: string;
  onAccountClick?: () => void;
  className?: string;
}

export default function SubNavTopRail({
  items,
  activeTab,
  onChange,
  userName: propUserName,
  userAvatarUrl: propAvatarUrl,
  accountName: propAccountName,
  accountPillHref = '/transactions',
  onAccountClick,
  className = '',
}: SubNavTopRailProps) {
  const { isNavVisible } = useMobileNavScroll();

  const [loadedUserName, setLoadedUserName] = useState<string>('');
  const [loadedAvatarUrl, setLoadedAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetch('/api/profile')
      .then((res) => res.ok ? res.json() : null)
      .then((profile) => {
        if (!isMounted || !profile) return;
        const resolvedName =
          (typeof profile.fullName === 'string' && profile.fullName) ||
          (typeof profile.email === 'string' && profile.email.split('@')[0]) ||
          'Trader';
        setLoadedUserName(resolvedName);
        if (typeof profile.avatarUrl === 'string' && profile.avatarUrl) {
          setLoadedAvatarUrl(profile.avatarUrl);
        }
      })
      .catch(() => {
        // silent fallback – name stays as 'Trader' and no avatar
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const displayName = propUserName || loadedUserName || 'Trader';
  const avatarUrl = propAvatarUrl || loadedAvatarUrl;
  const displayAccountName = propAccountName || 'Personal Account';

  const initials = useMemo(() => {
    if (!displayName) return 'TR';
    const parts = displayName.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return displayName.slice(0, 2).toUpperCase();
  }, [displayName]);

  return (
    <div
      className={`will-change-nav md:hidden w-full shrink-0 flex flex-col border-b border-plt-border bg-plt-base/95 backdrop-blur-2xl z-30 transition-all duration-300 ease-out select-none ${
        isNavVisible
          ? 'translate-y-0 opacity-100 max-h-28'
          : '-translate-y-full opacity-0 max-h-0 border-transparent pointer-events-none overflow-hidden'
      } ${className}`}
    >
      {/* Top Row: User Name & Account Pill */}
      <div className="h-11 px-3.5 flex items-center justify-between min-w-0">
        {/* Left: User Profile & Name */}
        <Link
          href="/settings"
          className="flex items-center gap-2.5 min-w-0 group cursor-pointer active:scale-98 transition-transform"
          title="User Profile & Settings"
        >
          <div className="w-7 h-7 rounded-full bg-plt-surface border border-plt-border-strong flex items-center justify-center text-[10px] font-semibold text-plt-text shrink-0 overflow-hidden shadow-sm group-hover:border-plt-border-active transition-colors">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          <div className="flex flex-col min-w-0 justify-center">
            <span className="text-xs font-semibold text-plt-text truncate font-sans tracking-tight group-hover:text-plt-accent transition-colors leading-tight">
              {displayName}
            </span>
            <span className="text-[9px] font-mono text-plt-muted uppercase tracking-wider leading-none mt-0.5">
              Live Account
            </span>
          </div>
        </Link>

        {/* Right: Account Pill */}
        <Link
          href={accountPillHref}
          onClick={onAccountClick}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-plt-card border border-plt-border hover:border-plt-border-strong text-plt-text transition-all active:scale-95 cursor-pointer shrink-0"
          title="Account Status & Balances"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-plt-profit ring-2 ring-plt-profit/25 animate-pulse shrink-0" />
          <span className="text-[11px] font-mono font-medium text-plt-text tracking-tight max-w-[130px] truncate">
            {displayAccountName}
          </span>
          <ChevronRight size={11} className="text-plt-muted shrink-0" />
        </Link>
      </div>

      {/* Bottom Row: Tabs Pill Rail */}
      {items && items.length > 0 && (
        <div className="h-10 px-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth border-t border-plt-border/40">
          {items.map((item) => {
            const isActive = activeTab === item.value;
            const Icon = item.icon;

            return (
              <motion.button
                key={item.value}
                type="button"
                onClick={() => onChange?.(item.value)}
                whileHover={controlHover}
                whileTap={controlTap}
                className={`tab-button shrink-0 select-none py-1 px-3 ${
                  isActive
                    ? 'tab-button-active btn-typography-semibold'
                    : 'text-plt-muted hover:text-plt-text'
                }`}
              >
                {Icon && (
                  <Icon
                    size={14}
                    strokeWidth={isActive ? 2 : 1.5}
                    className={isActive ? 'text-plt-text' : 'text-plt-muted'}
                  />
                )}
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`badge text-[10px] px-1.5 py-0.5 ${
                      isActive
                        ? 'badge-active'
                        : 'badge-muted'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
