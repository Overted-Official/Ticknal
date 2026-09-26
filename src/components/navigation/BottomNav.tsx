'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  Home,
  LineChart,
  LayoutGrid,
  Zap,
  ArrowRightLeft,
  Bell,
  Plus,
  MoreHorizontal,
  Settings,
} from '@/components/ui/icon-library';
import NotificationsDrawer from '@/components/platform/NotificationsDrawer';
import QuickAddDrawer from '@/components/platform/QuickAddDrawer';
import PrivacyToggleButton from '@/components/platform/PrivacyToggleButton';
import { useMobileNavScroll } from '@/context/MobileNavScrollContext';
import { controlHover, controlTap } from '@/lib/motion';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type NavItemId = 'home' | 'charts' | 'markets' | 'strategies' | 'transactions';

interface NavItemConfig {
  id: NavItemId;
  label: string;
  href: string;
  icon: typeof Home;
  isActive: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/home',
    icon: Home,
    isActive: (p) => p === '/home' || p === '/dashboard',
  },
  {
    id: 'charts',
    label: 'Charts',
    href: '/charts',
    icon: LineChart,
    isActive: (p) => p === '/charts' || p.startsWith('/charts/') || p === '/invest',
  },
  {
    id: 'markets',
    label: 'Markets',
    href: '/markets',
    icon: LayoutGrid,
    isActive: (p) => p === '/markets' || p.startsWith('/markets/') || p === '/sectors' || p.startsWith('/sectors/'),
  },
  {
    id: 'strategies',
    label: 'Strategies',
    href: '/strategies',
    icon: Zap,
    isActive: (p) => p === '/strategies' || p.startsWith('/strategies/'),
  },
  {
    id: 'transactions',
    label: 'Transactions',
    href: '/transactions',
    icon: ArrowRightLeft,
    isActive: (p) => p === '/transactions' || p.startsWith('/transactions/'),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isNavVisible } = useMobileNavScroll();

  const [optimisticNavId, setOptimisticNavId] = useState<NavItemId | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const { data: notifData } = useSWR<{ notifications: unknown[] }>('/api/notifications', fetcher, {
    refreshInterval: process.env.NODE_ENV === 'development' ? 0 : 60000,
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  const notificationCount = notifData?.notifications?.length ?? 0;

  // Resolve active navigation tab based on the current URL
  const routeNavId = useMemo<NavItemId>(() => {
    const matched = NAV_ITEMS.find((item) => item.isActive(pathname));
    return matched ? matched.id : 'home';
  }, [pathname]);

  // Reset optimistic tab override once the router matches the destination
  useEffect(() => {
    setOptimisticNavId(null);
  }, [pathname]);

  const currentNavId = optimisticNavId ?? routeNavId;

  // Prefetch all top-level mobile destinations for zero-latency page transitions
  useEffect(() => {
    NAV_ITEMS.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [router]);

  // Handle outside clicks to close the More actions popover
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    if (isMoreOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMoreOpen]);

  return (
    <>
      {/* Mobile Floating Action Buttons (Aligned Above Bottom Bar) */}
      <div
        className={`fixed bottom-18 right-3.5 z-40 md:hidden flex flex-col items-center gap-2.5 transition-all duration-300 ease-out will-change-transform ${
          isNavVisible
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-16 opacity-0 pointer-events-none'
        }`}
        aria-label="Mobile Quick Actions"
      >
        {/* 1. Alerts & Notifications Button (Slightly bigger: 46x46) */}
        <motion.button
          type="button"
          onClick={() => {
            setIsMoreOpen(false);
            setIsNotificationsOpen(true);
          }}
          whileHover={controlHover}
          whileTap={controlTap}
          className="w-[46px] h-[46px] rounded-full bg-black/90 backdrop-blur-xl border border-white/15 text-white shadow-2xl flex items-center justify-center relative cursor-pointer active:scale-95 transition-all"
          title="Trade Notifications & Alerts"
        >
          <Bell size={20} strokeWidth={1.8} className="text-white" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-profit-chart text-black text-[9px] font-sans font-bold tabular-nums flex items-center justify-center ring-2 ring-black">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </motion.button>

        {/* 2. Quick Add Position / Transaction Button (Slightly bigger: 46x46) */}
        <motion.button
          type="button"
          onClick={() => {
            setIsMoreOpen(false);
            setIsQuickAddOpen(true);
          }}
          whileHover={controlHover}
          whileTap={controlTap}
          className="w-[46px] h-[46px] rounded-full bg-black/90 backdrop-blur-xl border border-white/20 text-white shadow-2xl flex items-center justify-center cursor-pointer active:scale-95 transition-all group"
          title="Quick Add Position or Transaction"
        >
          <Plus size={22} strokeWidth={2.2} className="text-white group-hover:scale-110 transition-transform" />
        </motion.button>

        {/* 3. More Action Button (•••) with expandable popover for Settings & Privacy Eye */}
        <div className="relative" ref={moreRef}>
          <motion.button
            type="button"
            onClick={() => setIsMoreOpen((prev) => !prev)}
            whileHover={controlHover}
            whileTap={controlTap}
            className={`w-[40px] h-[40px] rounded-full backdrop-blur-xl border shadow-xl flex items-center justify-center cursor-pointer active:scale-95 transition-all ${
              isMoreOpen
                ? 'bg-white/[0.18] border-white/30 text-white'
                : 'bg-black/90 border-white/12 text-white/80 hover:text-white'
            }`}
            title="More actions"
            aria-expanded={isMoreOpen}
          >
            <MoreHorizontal size={18} strokeWidth={2.2} />
          </motion.button>

          {/* Popover tray expanding horizontally to the left */}
          <AnimatePresence>
            {isMoreOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85, x: 8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.85, x: 8 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className="absolute right-12 bottom-0 flex items-center gap-1.5 p-1 rounded-full bg-black/95 backdrop-blur-2xl border border-white/15 shadow-2xl z-50"
              >
                {/* Balance Masking / Privacy Toggle (Eye) */}
                <PrivacyToggleButton
                  iconOnly
                  className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.15] text-white flex items-center justify-center transition-colors cursor-pointer"
                />

                {/* Settings Link (Gear) */}
                <Link
                  href="/settings"
                  prefetch={true}
                  onClick={() => setIsMoreOpen(false)}
                  className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.15] text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Settings"
                >
                  <Settings size={18} strokeWidth={1.8} />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Modern Mobile Bottom Bar — Matches Desktop Side Nav Styling */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 md:hidden transition-transform duration-300 ease-out select-none ${
          isNavVisible
            ? 'translate-y-0 pointer-events-auto'
            : 'translate-y-[calc(100%+1.5rem)] pointer-events-none'
        }`}
        aria-label="Mobile Navigation"
      >
        <nav className="relative bg-black/95 backdrop-blur-xl border-t border-border-default shadow-[0_-4px_24px_rgba(0,0,0,0.8)] pb-[max(env(safe-area-inset-bottom),0.35rem)]">
          <div className="h-[54px] flex items-center justify-around px-1.5">
            {NAV_ITEMS.map((item) => {
              const isActive = currentNavId === item.id;
              const Icon = item.icon;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  prefetch={true}
                  onClick={() => setOptimisticNavId(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className="flex-1 flex flex-col items-center justify-center py-1 cursor-pointer group focus:outline-none min-w-0"
                >
                  {/* Icon container matching desktop nav-icon style */}
                  <div
                    className={`w-9 h-7 rounded-lg flex items-center justify-center transition-all duration-150 ${
                      isActive
                        ? 'bg-white/[0.1] border border-white/10 text-white shadow-xs'
                        : 'text-[#9ca3af] group-hover:text-white'
                    }`}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2 : 1.6} />
                  </div>

                  {/* Clean micro-label */}
                  <span
                    className={`text-[9.5px] font-sans tracking-tight leading-tight mt-0.5 truncate max-w-[58px] text-center transition-colors ${
                      isActive
                        ? 'font-semibold text-white'
                        : 'font-normal text-text-muted group-hover:text-white/80'
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Notifications Drawer */}
      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {/* Quick Add (Transaction / Position) Drawer */}
      <QuickAddDrawer
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
      />
    </>
  );
}
