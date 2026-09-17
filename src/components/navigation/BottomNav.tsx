'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Bell, Plus } from '@/components/ui/icon-library';
import NotificationsDrawer from '@/components/platform/NotificationsDrawer';
import QuickAddDrawer from '@/components/platform/QuickAddDrawer';
import PrivacyToggleButton from '@/components/platform/PrivacyToggleButton';
import { useMobileNavScroll } from '@/context/MobileNavScrollContext';
import { controlHover, controlTap } from '@/lib/motion';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type NavItemId = 'dashboard' | 'invest' | 'wallet' | 'settings';

interface NavItemConfig {
  id: NavItemId;
  label: string;
  href: string;
  isActive: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    isActive: (p) => p === '/dashboard',
  },
  {
    id: 'invest',
    label: 'Invest',
    href: '/invest',
    isActive: (p) => p === '/invest' || p.startsWith('/invest/') || p === '/charts',
  },
  {
    id: 'wallet',
    label: 'Wallet',
    href: '/wallet',
    isActive: (p) => p === '/wallet' || p.startsWith('/wallet/') || p === '/positions',
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    isActive: (p) => p === '/settings' || p.startsWith('/settings/'),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isNavVisible } = useMobileNavScroll();

  const [optimisticNavId, setOptimisticNavId] = useState<NavItemId | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const { data: notifData } = useSWR<{ notifications: unknown[] }>('/api/notifications', fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });

  const notificationCount = notifData?.notifications?.length ?? 0;

  // Resolve active navigation tab based on the current URL
  const routeNavId = useMemo<NavItemId>(() => {
    const matched = NAV_ITEMS.find((item) => item.isActive(pathname));
    return matched ? matched.id : 'dashboard';
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

  const renderInactiveIcon = (id: NavItemId) => {
    switch (id) {
      case 'dashboard':
        return (
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="7" height="9" x="3" y="3" rx="1.5" />
            <rect width="7" height="5" x="14" y="3" rx="1.5" />
            <rect width="7" height="9" x="14" y="12" rx="1.5" />
            <rect width="7" height="5" x="3" y="16" rx="1.5" />
          </svg>
        );
      case 'invest':
        return (
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="8" y1="3" x2="8" y2="21" />
            <rect x="6" y="8" width="4" height="7" rx="1" />
            <line x1="16" y1="3" x2="16" y2="21" />
            <rect x="14" y="5" width="4" height="10" rx="1" />
          </svg>
        );
      case 'wallet':
        return (
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
            <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
            <circle cx="17" cy="14" r="1" fill="currentColor" stroke="none" />
          </svg>
        );
      case 'settings':
        return (
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        );
    }
  };

  const renderActiveIcon = (id: NavItemId) => {
    switch (id) {
      case 'dashboard':
        return (
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.25 }}
            className="relative flex items-center justify-center text-black"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.95"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="7" height="9" x="3" y="3" rx="1.5" fill="currentColor" fillOpacity="0.25" />
              <rect width="7" height="5" x="14" y="3" rx="1.5" fill="currentColor" fillOpacity="0.25" />
              <rect width="7" height="9" x="14" y="12" rx="1.5" fill="currentColor" fillOpacity="0.25" />
              <rect width="7" height="5" x="3" y="16" rx="1.5" fill="currentColor" fillOpacity="0.25" />
            </svg>
          </motion.div>
        );
      case 'invest':
        return (
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.25 }}
            className="relative flex items-center justify-center text-black"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="8" y1="3" x2="8" y2="21" />
              <rect x="6" y="8" width="4" height="7" rx="1" fill="currentColor" fillOpacity="0.25" />
              <line x1="16" y1="3" x2="16" y2="21" />
              <rect x="14" y="5" width="4" height="10" rx="1" fill="currentColor" />
              <path
                d="M20 3.5 C20 4.5 20 4.5 21 4.5 C20 4.5 20 4.5 20 5.5 C20 4.5 20 4.5 19 4.5 C20 4.5 20 4.5 20 3.5 Z"
                fill="currentColor"
                stroke="none"
              />
            </svg>
          </motion.div>
        );
      case 'wallet':
        return (
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.25 }}
            className="relative flex items-center justify-center text-black"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"
                fill="currentColor"
                fillOpacity="0.25"
              />
              <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
              <circle cx="17" cy="14" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </motion.div>
        );
      case 'settings':
        return (
          <motion.div
            initial={{ rotate: -25, scale: 0.85 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            className="relative flex items-center justify-center text-black"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
                fill="currentColor"
                fillOpacity="0.2"
              />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
          </motion.div>
        );
    }
  };

  return (
    <>
      {/* Mobile Floating Action Buttons (Aligned Above Bottom Bar) */}
      <div
        className={`fixed bottom-22 right-3.5 z-40 md:hidden flex flex-col items-center gap-2.5 transition-all duration-300 ease-out will-change-transform ${
          isNavVisible
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-16 opacity-0 pointer-events-none'
        }`}
        aria-label="Mobile Quick Actions"
      >
        {/* 1. Alerts & Notifications Button */}
        <motion.button
          type="button"
          onClick={() => setIsNotificationsOpen(true)}
          whileHover={controlHover}
          whileTap={controlTap}
          className="w-10 h-10 rounded-full bg-[#121212]/95 hover:bg-[#181818] active:bg-[#0c0c0c] backdrop-blur-2xl border border-white/10 text-white shadow-xl flex items-center justify-center relative cursor-pointer active:scale-95 transition-all"
          title="Trade Notifications & Alerts"
        >
          <Bell size={17} className="text-white" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-plt-profit text-black text-[9px] font-mono font-bold flex items-center justify-center ring-2 ring-black">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </motion.button>

        {/* 2. Quick Add Position / Transaction Button */}
        <motion.button
          type="button"
          onClick={() => setIsQuickAddOpen(true)}
          whileHover={controlHover}
          whileTap={controlTap}
          className="w-10 h-10 rounded-full bg-[#181818]/95 hover:bg-[#202020] active:bg-[#101010] backdrop-blur-2xl border border-white/15 text-white shadow-xl flex items-center justify-center cursor-pointer active:scale-95 transition-all"
          title="Quick Add Position or Transaction"
        >
          <Plus size={18} strokeWidth={2.2} />
        </motion.button>

        {/* 3. Balance Masking / Privacy Toggle Button */}
        <PrivacyToggleButton
          iconOnly
          className="w-10 h-10 rounded-full bg-[#121212]/95 hover:bg-[#181818] backdrop-blur-2xl border border-white/10 text-white shadow-xl cursor-pointer active:scale-95 transition-all"
        />
      </div>

      {/* Main Modern Mobile Bottom Bar */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 md:hidden transition-transform duration-300 ease-out select-none ${
          isNavVisible
            ? 'translate-y-0 pointer-events-auto'
            : 'translate-y-[calc(100%+1.5rem)] pointer-events-none'
        }`}
        aria-label="Mobile Navigation"
      >
        <nav className="relative bg-black/95 backdrop-blur-2xl border-t border-white/[0.08] shadow-[0_-8px_32px_rgba(0,0,0,0.6)] pb-[max(env(safe-area-inset-bottom),0.5rem)] overflow-visible">
          <div className="h-[62px] flex items-stretch relative px-1">
            {NAV_ITEMS.map((item) => {
              const isActive = currentNavId === item.id;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  prefetch={true}
                  onClick={() => setOptimisticNavId(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className="flex-1 relative flex flex-col items-center justify-end pb-2 pt-1 h-full cursor-pointer group focus:outline-none min-w-0"
                >
                  {isActive ? (
                    <>
                      {/* Elevated circular active bubble popping above the top edge */}
                      <motion.div
                        layoutId="mobileActiveNavBubble"
                        className="absolute -top-3.5 w-[50px] h-[50px] rounded-full bg-white ring-[3.5px] ring-black shadow-[0_4px_22px_rgba(0,0,0,0.8),0_0_16px_rgba(255,255,255,0.18)] flex items-center justify-center overflow-hidden z-10"
                        transition={{
                          type: 'spring',
                          stiffness: 420,
                          damping: 30,
                          mass: 0.8,
                        }}
                      >
                        {renderActiveIcon(item.id)}
                      </motion.div>
                      {/* Geometry placeholder space in default icon position */}
                      <div className="h-[24px] w-[24px] mb-1 opacity-0 pointer-events-none" aria-hidden="true" />
                    </>
                  ) : (
                    <div className="relative h-[24px] w-[24px] mb-1 flex items-center justify-center transition-transform group-active:scale-90 text-white/45 group-hover:text-white/80">
                      {renderInactiveIcon(item.id)}
                      {item.id === 'settings' && notificationCount > 0 && (
                        <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-plt-profit ring-2 ring-black" />
                      )}
                    </div>
                  )}

                  {/* Typography Label */}
                  <span
                    className={`text-[10px] sm:text-[11px] tracking-tight leading-none transition-colors truncate max-w-[66px] ${
                      isActive ? 'font-bold text-white' : 'font-medium text-white/45 group-hover:text-white/80'
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
