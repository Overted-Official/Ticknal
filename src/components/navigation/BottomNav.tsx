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
  Radio,
  LayoutDashboard,
  Users,
  CreditCard,
  Terminal,
  Shield,
  Activity,
} from '@/components/ui/icon-library';
import NotificationsDrawer from '@/components/platform/NotificationsDrawer';
import QuickAddDrawer from '@/components/platform/QuickAddDrawer';
import PrivacyToggleButton from '@/components/platform/PrivacyToggleButton';
import LanguageToggleButton from './LanguageToggleButton';
import { useMobileNavScroll } from '@/context/MobileNavScrollContext';
import { useTranslation } from '@/lib/i18n';
import { controlHover, controlTap } from '@/lib/motion';
import { useGuestGuard } from '@/context/GuestGuardContext';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type NavItemId =
  | 'home'
  | 'charts'
  | 'markets'
  | 'news'
  | 'strategies'
  | 'transactions'
  | 'overview'
  | 'users'
  | 'subscriptions'
  | 'signals'
  | 'logs';

interface NavItemConfig {
  id: NavItemId;
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  isActive: (pathname: string) => boolean;
  isProtected?: boolean;
}

const NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/home',
    icon: Home,
    isActive: (p) => p === '/home' || p === '/dashboard',
    isProtected: true,
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
    id: 'news',
    label: 'News',
    href: '/news',
    icon: Radio,
    isActive: (p) => p === '/news' || p.startsWith('/news/'),
  },
  {
    id: 'strategies',
    label: 'Strategies',
    href: '/strategies',
    icon: Zap,
    isActive: (p) => p === '/strategies' || p.startsWith('/strategies/'),
    isProtected: true,
  },
];


function BottomNavItem({
  item,
  isActive,
  onSelect,
}: {
  item: NavItemConfig;
  isActive: boolean;
  onSelect: () => void;
}) {
  const { requireAuth } = useGuestGuard();
  const iconRef = useRef<{ startAnimation?: () => void; stopAnimation?: () => void } | any>(null);
  const Icon = item.icon;

  const handleClick = (e: React.MouseEvent) => {
    if (item.isProtected) {
      if (!requireAuth(e, item.label, `Unlock ${item.label}`)) {
        return;
      }
    }
    if (typeof iconRef.current?.startAnimation === 'function') {
      iconRef.current.startAnimation();
    }
    onSelect();
  };

  return (
    <Link
      href={item.href}
      prefetch={!item.isProtected}
      onClick={handleClick}
      onMouseEnter={() => {
        if (typeof iconRef.current?.startAnimation === 'function') {
          iconRef.current.startAnimation();
        }
      }}
      onMouseLeave={() => {
        if (typeof iconRef.current?.stopAnimation === 'function') {
          iconRef.current.stopAnimation();
        }
      }}
      aria-current={isActive ? 'page' : undefined}
      className="flex flex-col items-center justify-center h-full py-1 cursor-pointer group focus:outline-none min-w-0 active:scale-95 transition-transform duration-100"
    >
      {/* Subtle active indicator pill */}
      <div
        className={`h-[2px] w-5 rounded-full transition-all duration-200 mb-1 ${
          isActive
            ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]'
            : 'bg-transparent'
        }`}
      />

      {/* Icon */}
      <div className="flex items-center justify-center">
        <Icon
          ref={iconRef}
          size={20}
          strokeWidth={isActive ? 2.2 : 1.7}
          className={`transition-colors duration-150 ${
            isActive
              ? 'text-white'
              : 'text-zinc-500 group-hover:text-zinc-300'
          }`}
        />
      </div>

      {/* Micro label */}
      <span
        className={`text-[10px] font-sans tracking-tight leading-tight mt-0.5 truncate max-w-[62px] text-center transition-colors duration-150 ${
          isActive
            ? 'font-semibold text-white'
            : 'font-medium text-zinc-500 group-hover:text-zinc-300'
        }`}
      >
        {item.label}
      </span>
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const { isGuest, isLoading, requireAuth } = useGuestGuard();

  const isConsole = pathname.startsWith('/console');

  // Check admin status for non-guest users
  const { data: adminCheck } = useSWR<{ isAdmin: boolean }>(
    isGuest ? null : '/api/console/check',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );
  const isAdmin = adminCheck?.isAdmin ?? false;

  const navItems: NavItemConfig[] = useMemo(() => {
    if (isConsole) {
      const consoleItems: NavItemConfig[] = [
        {
          id: 'overview',
          label: 'Overview',
          href: '/console/overview',
          icon: LayoutDashboard,
          isActive: (p) => p === '/console' || p === '/console/overview',
        },
        {
          id: 'users',
          label: 'Users',
          href: '/console/users',
          icon: Users,
          isActive: (p) => p === '/console/users',
        },
        {
          id: 'subscriptions',
          label: 'Billing',
          href: '/console/subscriptions',
          icon: CreditCard,
          isActive: (p) => p === '/console/subscriptions',
        },
        {
          id: 'signals',
          label: 'Signals',
          href: '/console/signals',
          icon: Activity,
          isActive: (p) => p === '/console/signals',
        },
        {
          id: 'logs',
          label: 'Logs',
          href: '/console/logs',
          icon: Terminal,
          isActive: (p) => p === '/console/logs',
        },
      ];
      return isRTL ? [...consoleItems].reverse() : consoleItems;
    }

    const items: NavItemConfig[] = [
      {
        id: 'home',
        label: t('nav.home'),
        href: '/home',
        icon: Home,
        isActive: (p) => p === '/home' || p === '/dashboard',
        isProtected: true,
      },
      {
        id: 'charts',
        label: t('nav.charts'),
        href: '/charts',
        icon: LineChart,
        isActive: (p) => p === '/charts' || p.startsWith('/charts/') || p === '/invest',
      },
      {
        id: 'markets',
        label: t('nav.markets'),
        href: '/markets',
        icon: LayoutGrid,
        isActive: (p) => p === '/markets' || p.startsWith('/markets/') || p === '/sectors' || p.startsWith('/sectors/'),
      },
      {
        id: 'news',
        label: t('nav.news'),
        href: '/news',
        icon: Radio,
        isActive: (p) => p === '/news' || p.startsWith('/news/'),
      },
      {
        id: 'strategies',
        label: t('nav.strategies'),
        href: '/strategies',
        icon: Zap,
        isActive: (p) => p === '/strategies' || p.startsWith('/strategies/'),
        isProtected: true,
      },
    ];
    return isRTL ? [...items].reverse() : items;
  }, [t, isRTL, isConsole]);
  const { isNavVisible, setIsNavVisible } = useMobileNavScroll();
  const isChartRoute = pathname === '/charts' || pathname.startsWith('/charts/');
  // The chart workspace has no reliable vertical page scroll to restore hidden navigation.
  const isBottomNavVisible = isChartRoute || isNavVisible;

  useEffect(() => {
    if (isChartRoute) {
      setIsNavVisible(true);
    }
  }, [isChartRoute, setIsNavVisible]);

  const [optimisticNavId, setOptimisticNavId] = useState<NavItemId | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const { data: notifData } = useSWR<{ notifications: unknown[] }>(isGuest || isLoading ? null : '/api/notifications', fetcher, {
    refreshInterval: process.env.NODE_ENV === 'development' ? 0 : 60000,
    revalidateOnFocus: true,
    dedupingInterval: 30000,
    isPaused: () => typeof document !== 'undefined' && document.visibilityState === 'hidden',
  });

  const notificationCount = notifData?.notifications?.length ?? 0;

  // Resolve active navigation tab based on the current URL
  const routeNavId = useMemo<NavItemId>(() => {
    const matched = navItems.find((item) => item.isActive(pathname));
    return matched ? matched.id : isConsole ? 'overview' : 'home';
  }, [pathname, navItems, isConsole]);

  // Reset optimistic tab override once the router matches the destination
  useEffect(() => {
    setOptimisticNavId(null);
  }, [pathname]);

  const currentNavId = optimisticNavId ?? routeNavId;

  // Prefetch all top-level mobile destinations for zero-latency page transitions
  useEffect(() => {
    navItems.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [router, navItems]);

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
      {/* Mobile Floating Action Buttons (Positioned safely above the bottom tab bar) */}
      <div
        className={`fixed ${
          isGuest
            ? 'bottom-[calc(56px+var(--ticknal-safe-area-bottom)+56px+12px)]'
            : 'bottom-[calc(56px+var(--ticknal-safe-area-bottom)+16px)]'
        } right-3.5 z-40 md:hidden flex flex-col items-center gap-2.5 transition-all duration-300 ease-out will-change-transform ${
          isNavVisible
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-16 opacity-0 pointer-events-none'
        }`}
        aria-label="Mobile Quick Actions"
      >
        {/* 1. Alerts & Notifications Button (44x44) */}
        <motion.button
          type="button"
          onClick={(e) => {
            if (isGuest) {
              requireAuth(e, 'Live Market Notifications', 'Unlock Live Market Alerts');
              return;
            }
            setIsMoreOpen(false);
            setIsNotificationsOpen(true);
          }}
          whileHover={controlHover}
          whileTap={controlTap}
          className="w-11 h-11 rounded-full bg-black/90 backdrop-blur-xl border border-white/20 text-white shadow-2xl flex items-center justify-center relative cursor-pointer active:scale-95 transition-all"
          title="Trade Notifications & Alerts"
        >
          <Bell size={20} strokeWidth={1.8} className="text-white" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-profit-chart text-black text-[9px] font-sans font-bold tabular-nums flex items-center justify-center ring-2 ring-black">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </motion.button>

        {/* 2. Quick Add Position / Transaction Button (44x44) */}
        <motion.button
          type="button"
          onClick={(e) => {
            if (isGuest) {
              requireAuth(
                e,
                'Portfolio Orders',
                'Unlock Portfolio Trading',
                'Create a free account to track buy & sell orders, sync cash balances, and monitor your realized gains.'
              );
              return;
            }
            setIsMoreOpen(false);
            setIsQuickAddOpen(true);
          }}
          whileHover={controlHover}
          whileTap={controlTap}
          className="w-11 h-11 rounded-full bg-black/90 backdrop-blur-xl border border-white/20 text-white shadow-2xl flex items-center justify-center cursor-pointer active:scale-95 transition-all group"
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
            className={`w-11 h-11 rounded-full backdrop-blur-xl border shadow-xl flex items-center justify-center cursor-pointer active:scale-95 transition-all ${
              isMoreOpen
                ? 'bg-white/[0.18] border-white/30 text-white'
                : 'bg-black/90 border-white/15 text-white/80 hover:text-white'
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
                className="absolute end-12 bottom-0 flex items-center gap-1.5 p-1 rounded-full bg-black/95 backdrop-blur-2xl border border-white/15 shadow-2xl z-50"
              >
                {/* Balance Masking / Privacy Toggle (Eye) */}
                <PrivacyToggleButton
                  iconOnly
                  className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.15] text-white flex items-center justify-center transition-colors cursor-pointer"
                />

                {isConsole ? (
                  /* Return to Platform Link */
                  <Link
                    href="/home"
                    prefetch={false}
                    onClick={() => setIsMoreOpen(false)}
                    className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.15] text-white flex items-center justify-center transition-colors cursor-pointer"
                    title="Return to Platform"
                  >
                    <Home size={18} strokeWidth={1.8} />
                  </Link>
                ) : (
                  <>
                    {/* Transactions Link (ArrowRightLeft) */}
                    <Link
                      href="/transactions"
                      prefetch={false}
                      onClick={(e) => {
                        setIsMoreOpen(false);
                        if (isGuest) {
                          requireAuth(e, 'Transactions', 'Unlock Portfolio Transactions');
                        }
                      }}
                      className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.15] text-white flex items-center justify-center transition-colors cursor-pointer"
                      title={t('nav.transactions')}
                    >
                      <ArrowRightLeft size={18} strokeWidth={1.8} />
                    </Link>

                    {/* Admin Console Link (Shield) */}
                    {isAdmin && (
                      <Link
                        href="/console/overview"
                        prefetch={false}
                        onClick={() => setIsMoreOpen(false)}
                        className="w-9 h-9 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 flex items-center justify-center transition-colors cursor-pointer border border-emerald-500/30"
                        title="Admin Console"
                      >
                        <Shield size={18} strokeWidth={1.8} />
                      </Link>
                    )}
                  </>
                )}

                {/* Display Language Shortcut (Globe) */}
                <LanguageToggleButton
                  variant="mobile"
                  onToggle={() => setIsMoreOpen(false)}
                />

                {/* Settings Link (Gear) */}
                <Link
                  href="/settings"
                  prefetch={false}
                  onClick={(e) => {
                    setIsMoreOpen(false);
                    if (isGuest) {
                      requireAuth(e, 'Settings', 'Unlock Account Settings');
                    }
                  }}
                  className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.15] text-white flex items-center justify-center transition-colors cursor-pointer"
                  title={t('nav.settings')}
                >
                  <Settings size={18} strokeWidth={1.8} />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Native Mobile Bottom Bar — Pure Black, Flawlessly Centered, Crisp Active States */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 md:hidden transition-transform duration-300 ease-out select-none ${
          isBottomNavVisible
            ? 'translate-y-0 pointer-events-auto'
            : 'translate-y-[calc(100%+1.5rem)] pointer-events-none'
        }`}
        aria-label="Mobile Navigation"
      >
        <nav className="relative bg-black border-t border-white/[0.08] shadow-[0_-4px_24px_rgba(0,0,0,0.85)] pb-[var(--ticknal-safe-area-bottom)]">
          <div className="h-[56px] grid grid-cols-5 w-full items-center px-1">
            {navItems.map((item) => (
              <BottomNavItem
                key={item.id}
                item={item}
                isActive={currentNavId === item.id}
                onSelect={() => setOptimisticNavId(item.id)}
              />
            ))}
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
