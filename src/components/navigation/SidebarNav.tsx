'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import {
  Home,
  LineChart,
  LayoutGrid,
  Zap,
  ArrowRightLeft,
  Settings,
  Bell,
} from '@/components/ui/icon-library';
import NotificationsDrawer from '@/components/platform/NotificationsDrawer';
import PrivacyToggleButton from '@/components/platform/PrivacyToggleButton';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SidebarNav() {
  const pathname = usePathname();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const { data: notifData } = useSWR<{ notifications: unknown[] }>('/api/notifications', fetcher, {
    refreshInterval: process.env.NODE_ENV === 'development' ? 0 : 60000,
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  const notificationCount = notifData?.notifications?.length ?? 0;

  const isHomeActive = pathname === '/home' || pathname === '/dashboard';
  const isChartsActive = pathname === '/charts' || pathname.startsWith('/charts/') || pathname === '/invest';
  const isMarketsActive = pathname === '/markets' || pathname.startsWith('/markets/') || pathname === '/sectors';
  const isStrategiesActive = pathname === '/strategies' || pathname.startsWith('/strategies/');
  const isTransactionsActive = pathname === '/transactions' || pathname.startsWith('/transactions/');

  return (
    <div className="nav-shell w-[45px] h-full flex flex-col items-center py-2.5 border-l select-none">
      {/* Brand Logo */}
      <Link
        href="/home"
        className="mb-3 w-8 h-8 relative flex-shrink-0 group transition-opacity hover:opacity-80 flex items-center justify-center"
        title="Ticknal Home"
      >
        <Image src="/logo-mark.svg" alt="Ticknal" width={22} height={22} className="object-contain" priority />
      </Link>

      <div className="flex-1 flex flex-col space-y-2.5 w-full items-center">
        {/* 1. Home Direct Link */}
        <div className="w-full relative flex items-center justify-center group">
          <Link
            href="/home"
            prefetch={true}
            className="flex items-center justify-center relative"
            title="Home"
          >
            <div
              className={`nav-icon flex items-center justify-center transition-all duration-150 ${
                isHomeActive
                  ? 'nav-icon-active'
                  : 'text-[#dbdbdb] hover:text-white'
              }`}
            >
              <Home size={20} strokeWidth={1.5} />
            </div>
          </Link>
        </div>

        {/* 2. Charts Direct Link */}
        <div className="w-full relative flex items-center justify-center group">
          <Link
            href="/charts"
            prefetch={true}
            className="flex items-center justify-center relative"
            title="Charts"
          >
            <div
              className={`nav-icon flex items-center justify-center transition-all duration-150 ${
                isChartsActive
                  ? 'nav-icon-active'
                  : 'text-[#dbdbdb] hover:text-white'
              }`}
            >
              <LineChart size={20} strokeWidth={1.5} />
            </div>
          </Link>
        </div>

        {/* 3. Markets Direct Link */}
        <div className="w-full relative flex items-center justify-center group">
          <Link
            href="/markets"
            prefetch={true}
            className="flex items-center justify-center relative"
            title="Markets"
          >
            <div
              className={`nav-icon flex items-center justify-center transition-all duration-150 ${
                isMarketsActive
                  ? 'nav-icon-active'
                  : 'text-[#dbdbdb] hover:text-white'
              }`}
            >
              <LayoutGrid size={20} strokeWidth={1.5} />
            </div>
          </Link>
        </div>

        {/* 4. Strategies Direct Link */}
        <div className="w-full relative flex items-center justify-center group">
          <Link
            href="/strategies"
            prefetch={true}
            className="flex items-center justify-center relative"
            title="Strategies"
          >
            <div
              className={`nav-icon flex items-center justify-center transition-all duration-150 ${
                isStrategiesActive
                  ? 'nav-icon-active'
                  : 'text-[#dbdbdb] hover:text-white'
              }`}
            >
              <Zap size={20} strokeWidth={1.5} />
            </div>
          </Link>
        </div>

        {/* 5. Transactions Direct Link */}
        <div className="w-full relative flex items-center justify-center group">
          <Link
            href="/transactions"
            prefetch={true}
            className="flex items-center justify-center relative"
            title="Transactions"
          >
            <div
              className={`nav-icon flex items-center justify-center transition-all duration-150 ${
                isTransactionsActive
                  ? 'nav-icon-active'
                  : 'text-[#dbdbdb] hover:text-white'
              }`}
            >
              <ArrowRightLeft size={20} strokeWidth={1.5} />
            </div>
          </Link>
        </div>
      </div>

      {/* Notifications & Settings at the bottom */}
      <div className="w-full flex flex-col items-center space-y-2 mt-auto">
        {/* Subtle Divider */}
        <div className="w-5 h-px bg-plt-border my-0.5" />

        {/* Global value visibility */}
        <div className="w-full flex items-center justify-center relative group">
          <PrivacyToggleButton
            iconOnly
            className="nav-icon"
          />
        </div>

        {/* Notifications Bell */}
        <div className="w-full flex items-center justify-center relative group">
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(true)}
            className="flex items-center justify-center relative"
            title="Trade Notifications & Alerts"
          >
            <div
              className={`nav-icon flex items-center justify-center transition-all duration-150 relative ${
                isNotificationsOpen
                  ? 'nav-icon-active'
                  : 'text-[#dbdbdb] hover:text-white'
              }`}
            >
              <Bell size={20} strokeWidth={1.5} />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-plt-profit ring-2 ring-plt-base" />
              )}
            </div>
          </button>
        </div>

        {/* Settings */}
        <div className="w-full flex items-center justify-center relative group">
          <Link
            href="/settings"
            prefetch={true}
            className="flex items-center justify-center relative"
            title="Settings"
          >
            <div
              className={`nav-icon flex items-center justify-center transition-all duration-150 ${
                pathname === '/settings'
                  ? 'nav-icon-active'
                  : 'text-[#dbdbdb] hover:text-white'
              }`}
            >
              <Settings size={20} strokeWidth={1.5} />
            </div>
          </Link>
        </div>
      </div>

      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </div>
  );
}
