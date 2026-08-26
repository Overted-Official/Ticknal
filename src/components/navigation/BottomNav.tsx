'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { LayoutDashboard, LineChart, Wallet, Settings, Bell, Plus } from '@/components/ui/icon-library';
import NotificationsDrawer from '@/components/platform/NotificationsDrawer';
import QuickAddDrawer from '@/components/platform/QuickAddDrawer';
import { useMobileNavScroll } from '@/context/MobileNavScrollContext';
import { controlHover, controlTap } from '@/lib/motion';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, isActive: (p: string) => p === '/dashboard' },
  { href: '/invest', label: 'Invest', icon: LineChart, isActive: (p: string) => p === '/invest' || p === '/charts' },
  { href: '/wallet', label: 'Wallet', icon: Wallet, isActive: (p: string) => p === '/wallet' || p === '/positions' },
  { href: '/settings', label: 'Settings', icon: Settings, isActive: (p: string) => p === '/settings' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { isNavVisible } = useMobileNavScroll();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const { data: notifData } = useSWR<{ notifications: unknown[] }>('/api/notifications', fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });

  const notificationCount = notifData?.notifications?.length ?? 0;

  return (
    <>
      {/* Independent Floating Action Buttons on Mobile (Stacked in Bottom Right) */}
      <div
        className={`fixed bottom-20 right-3.5 z-40 md:hidden flex flex-col items-center gap-2.5 transition-all duration-300 ease-out will-change-transform ${
          isNavVisible ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-16 opacity-0 pointer-events-none'
        }`}
      >
        {/* 1. Floating Alerts / Notifications Button */}
        <motion.button
          type="button"
          onClick={() => setIsNotificationsOpen(true)}
          whileHover={controlHover}
          whileTap={controlTap}
          className="w-10 h-10 rounded-full bg-plt-card/95 hover:bg-plt-card backdrop-blur-2xl border border-plt-border-strong text-plt-text shadow-xl flex items-center justify-center relative cursor-pointer active:scale-95 transition-all"
          title="Trade Notifications & Alerts"
        >
          <Bell size={17} className="text-plt-text" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-plt-profit text-plt-inverse text-[9px] font-mono font-bold flex items-center justify-center ring-2 ring-plt-card">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </motion.button>

        {/* 2. Floating Add Position / Quick Add Button */}
        <motion.button
          type="button"
          onClick={() => setIsQuickAddOpen(true)}
          whileHover={controlHover}
          whileTap={controlTap}
          className="w-10 h-10 rounded-full bg-plt-surface-elevated hover:bg-plt-surface border border-plt-border-strong text-plt-text shadow-xl flex items-center justify-center cursor-pointer active:scale-95 transition-all"
          title="Quick Add Position or Transaction"
        >
          <Plus size={18} strokeWidth={2} />
        </motion.button>
      </div>

      {/* Main Bottom Bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 w-full bg-black/70 backdrop-blur-2xl border-t border-white/[0.08] shadow-[0_-8px_30px_rgba(0,0,0,0.4)] flex items-center justify-around z-50 px-2 safe-area-bottom select-none transition-all duration-300 ease-out will-change-transform ${
          isNavVisible ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="h-14 w-full flex items-center justify-around">
          {NAV_ITEMS.map((item) => {
            const active = item.isActive(pathname);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className="flex-1 h-full flex flex-col items-center justify-center py-1 group"
              >
                <div
                  className={`flex items-center justify-center rounded-xl px-2.5 py-1 transition-all duration-150 ${
                    active
                      ? 'nav-icon-active'
                      : 'text-plt-muted group-hover:text-plt-text'
                  }`}
                >
                  <Icon size={18} strokeWidth={active ? 2 : 1.5} />
                </div>
                <span
                  className={`text-[10px] font-sans font-medium mt-0.5 transition-colors ${
                    active ? 'text-plt-text' : 'text-plt-muted group-hover:text-plt-text'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
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
