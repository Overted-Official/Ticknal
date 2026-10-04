'use client';

import { useState, useRef } from 'react';
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
import { useTranslation } from '@/lib/i18n';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function SidebarNavItem({
  href,
  title,
  isActive,
  icon: Icon,
}: {
  href: string;
  title: string;
  isActive: boolean;
  icon: React.ComponentType<any>;
}) {
  const iconRef = useRef<{ startAnimation: () => void; stopAnimation: () => void } | null>(null);
  const handleMouseEnter = () => iconRef.current?.startAnimation();
  const handleMouseLeave = () => iconRef.current?.stopAnimation();

  return (
    <div className="w-full relative flex items-center justify-center group">
      <Link
        href={href}
        prefetch={true}
        className="flex items-center justify-center relative cursor-pointer"
        title={title}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className={`nav-icon flex items-center justify-center transition-all duration-150 ${
            isActive ? 'nav-icon-active' : 'text-[#dbdbdb] hover:text-white'
          }`}
        >
          <Icon ref={iconRef} size={20} strokeWidth={1.5} />
        </div>
      </Link>
    </div>
  );
}

function NotificationsNavItem({
  isOpen,
  onClick,
  count,
  title,
}: {
  isOpen: boolean;
  onClick: () => void;
  count: number;
  title: string;
}) {
  const iconRef = useRef<{ startAnimation: () => void; stopAnimation: () => void } | null>(null);
  const handleMouseEnter = () => iconRef.current?.startAnimation();
  const handleMouseLeave = () => iconRef.current?.stopAnimation();

  return (
    <div className="w-full flex items-center justify-center relative group">
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="flex items-center justify-center relative cursor-pointer"
        title={title}
      >
        <div
          className={`nav-icon flex items-center justify-center transition-all duration-150 relative ${
            isOpen ? 'nav-icon-active' : 'text-[#dbdbdb] hover:text-white'
          }`}
        >
          <Bell ref={iconRef} size={20} strokeWidth={1.5} />
          {count > 0 && (
            <span className="absolute top-1 end-1 w-2 h-2 rounded-full bg-plt-profit ring-2 ring-plt-base" />
          )}
        </div>
      </button>
    </div>
  );
}

export default function SidebarNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const { data: notifData } = useSWR<{ notifications: unknown[] }>('/api/notifications', fetcher, {
    refreshInterval: process.env.NODE_ENV === 'development' ? 0 : 60000,
    revalidateOnFocus: true,
    dedupingInterval: 30000,
    isPaused: () => typeof document !== 'undefined' && document.visibilityState === 'hidden',
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
        <Image src="/logo-white.svg" alt="Ticknal" width={22} height={22} className="object-contain" priority />
      </Link>

      <div className="flex-1 flex flex-col space-y-2.5 w-full items-center">
        <SidebarNavItem
          href="/home"
          title={t('nav.home')}
          isActive={isHomeActive}
          icon={Home}
        />
        <SidebarNavItem
          href="/charts"
          title={t('nav.charts')}
          isActive={isChartsActive}
          icon={LineChart}
        />
        <SidebarNavItem
          href="/markets"
          title={t('nav.markets')}
          isActive={isMarketsActive}
          icon={LayoutGrid}
        />
        <SidebarNavItem
          href="/strategies"
          title={t('nav.strategies')}
          isActive={isStrategiesActive}
          icon={Zap}
        />
        <SidebarNavItem
          href="/transactions"
          title={t('nav.transactions')}
          isActive={isTransactionsActive}
          icon={ArrowRightLeft}
        />
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
        <NotificationsNavItem
          isOpen={isNotificationsOpen}
          onClick={() => setIsNotificationsOpen(true)}
          count={notificationCount}
          title={t('nav.notifications')}
        />

        {/* Settings */}
        <SidebarNavItem
          href="/settings"
          title={t('nav.settings')}
          isActive={pathname === '/settings'}
          icon={Settings}
        />
      </div>

      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </div>
  );
}
