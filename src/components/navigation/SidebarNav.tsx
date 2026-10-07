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
  Radio,
  LayoutDashboard,
  Users,
  CreditCard,
  Terminal,
  Shield,
  Activity,
} from '@/components/ui/icon-library';
import NotificationsDrawer from '@/components/platform/NotificationsDrawer';
import PrivacyToggleButton from '@/components/platform/PrivacyToggleButton';
import LanguageToggleButton from './LanguageToggleButton';
import { useTranslation } from '@/lib/i18n';
import { useGuestGuard } from '@/context/GuestGuardContext';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function SidebarNavItem({
  href,
  title,
  isActive,
  icon: Icon,
  isProtected = false,
  featureName,
  modalDescription,
}: {
  href: string;
  title: string;
  isActive: boolean;
  icon: React.ComponentType<any>;
  isProtected?: boolean;
  featureName?: string;
  modalDescription?: string;
}) {
  const { requireAuth } = useGuestGuard();
  const iconRef = useRef<{ startAnimation?: () => void; stopAnimation?: () => void } | any>(null);
  const handleMouseEnter = () => {
    if (typeof iconRef.current?.startAnimation === 'function') {
      iconRef.current.startAnimation();
    }
  };
  const handleMouseLeave = () => {
    if (typeof iconRef.current?.stopAnimation === 'function') {
      iconRef.current.stopAnimation();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isProtected) {
      if (!requireAuth(e, featureName || title, `Unlock ${title}`, modalDescription)) {
        return;
      }
    }
  };

  return (
    <div className="w-full relative flex items-center justify-center group">
      <Link
        href={href}
        prefetch={!isProtected}
        onClick={handleClick}
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
  onClick: (e: React.MouseEvent) => void;
  count: number;
  title: string;
}) {
  const iconRef = useRef<{ startAnimation?: () => void; stopAnimation?: () => void } | any>(null);
  const handleMouseEnter = () => {
    if (typeof iconRef.current?.startAnimation === 'function') {
      iconRef.current.startAnimation();
    }
  };
  const handleMouseLeave = () => {
    if (typeof iconRef.current?.stopAnimation === 'function') {
      iconRef.current.stopAnimation();
    }
  };

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
  const { t, locale } = useTranslation();
  const { isGuest, isLoading, requireAuth } = useGuestGuard();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const { data: notifData } = useSWR<{ notifications: unknown[] }>(isGuest || isLoading ? null : '/api/notifications', fetcher, {
    refreshInterval: process.env.NODE_ENV === 'development' ? 0 : 60000,
    revalidateOnFocus: true,
    dedupingInterval: 30000,
    isPaused: () => typeof document !== 'undefined' && document.visibilityState === 'hidden',
  });

  const notificationCount = notifData?.notifications?.length ?? 0;

  const isConsole = pathname.startsWith('/console');

  // Check admin access for non-guest users to show Console icon
  const { data: adminCheck } = useSWR<{ isAdmin: boolean }>(
    isGuest ? null : '/api/console/check',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );
  const isAdmin = adminCheck?.isAdmin ?? false;

  const isHomeActive = pathname === '/home' || pathname === '/dashboard';
  const isChartsActive = pathname === '/charts' || pathname.startsWith('/charts/') || pathname === '/invest';
  const isMarketsActive = pathname === '/markets' || pathname.startsWith('/markets/') || pathname === '/sectors';
  const isNewsActive = pathname === '/news' || pathname.startsWith('/news/');
  const isStrategiesActive = pathname === '/strategies' || pathname.startsWith('/strategies/');
  const isTransactionsActive = pathname === '/transactions' || pathname.startsWith('/transactions/');

  const handleNotificationsClick = (e: React.MouseEvent) => {
    if (isGuest) {
      requireAuth(
        e,
        'Live Market Notifications',
        locale === 'ar' ? 'تفعيل تنبيهات السوق المباشرة' : 'Unlock Live Market Alerts',
        locale === 'ar'
          ? 'أنشئ حساباً مجانياً لتلقي إشعارات التنفيذ اللحظية، وتنبيهات الاختراق للأسهم المصرية عبر تليجرام.'
          : 'Create a free account to receive real-time execution notices, breakout signals, and EGX corporate action alerts.'
      );
      return;
    }
    setIsNotificationsOpen((prev) => !prev);
  };

  return (
    <div className="nav-shell w-[45px] h-full flex flex-col items-center py-2.5 border-l select-none">
      {/* Brand Logo */}
      <Link
        href={isConsole ? '/console/overview' : isGuest ? '/markets' : '/home'}
        className="mb-3 w-8 h-8 relative flex-shrink-0 group transition-opacity hover:opacity-80 flex items-center justify-center"
        title={isConsole ? 'Ticknal Console' : 'Ticknal Home'}
      >
        <Image src="/logo-white.svg" alt="Ticknal" width={22} height={22} className="object-contain" priority />
      </Link>

      <div className="flex-1 flex flex-col space-y-2.5 w-full items-center">
        {isConsole ? (
          <>
            <SidebarNavItem
              href="/console/overview"
              title="Overview"
              isActive={pathname === '/console' || pathname === '/console/overview'}
              icon={LayoutDashboard}
            />
            <SidebarNavItem
              href="/console/users"
              title="Users"
              isActive={pathname === '/console/users'}
              icon={Users}
            />
            <SidebarNavItem
              href="/console/subscriptions"
              title="Subscriptions"
              isActive={pathname === '/console/subscriptions'}
              icon={CreditCard}
            />
            <SidebarNavItem
              href="/console/operations"
              title="Operations"
              isActive={pathname.startsWith('/console/operations') || pathname === '/console/signals' || pathname === '/console/logs'}
              icon={Terminal}
            />
          </>
        ) : (
          <>
            <SidebarNavItem
              href="/home"
              title={t('nav.home')}
              isActive={isHomeActive}
              icon={Home}
              isProtected={true}
              featureName="Home Dashboard"
              modalDescription={
                locale === 'ar'
                  ? 'أنشئ حسابك المجاني لمتابعة محفظتك الاستثمارية، وصافي القيمة، والإشارات التداولية اللحظية.'
                  : 'Create a free Ticknal account to monitor your personalized Egyptian market portfolio, net worth, and live trade signals.'
              }
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
              href="/news"
              title={t('nav.news')}
              isActive={isNewsActive}
              icon={Radio}
            />
            <SidebarNavItem
              href="/strategies"
              title={t('nav.strategies')}
              isActive={isStrategiesActive}
              icon={Zap}
              isProtected={true}
              featureName="Strategy Backtester"
              modalDescription={
                locale === 'ar'
                  ? 'أنشئ حساباً مجانياً للوصول إلى أدوات الاختبار التاريخي، وبناء استراتيجيات تداول كمية على الأسهم المصرية.'
                  : 'Create a free Ticknal account to access institutional-grade backtesting, custom signal conditions, and historical EGX performance metrics.'
              }
            />
            <SidebarNavItem
              href="/transactions"
              title={t('nav.transactions')}
              isActive={isTransactionsActive}
              icon={ArrowRightLeft}
              isProtected={true}
              featureName="Portfolio Transactions"
              modalDescription={
                locale === 'ar'
                  ? 'أنشئ حساباً مجانياً لتسجيل عمليات الشراء والبيع، ومزامنة أرصدتك النقدية وحساب أرباحك المحققة.'
                  : 'Create a free Ticknal account to log your Thndr or brokerage executions, sync cash balances, and monitor realized P&L.'
              }
            />
            {isAdmin && (
              <SidebarNavItem
                href="/console/overview"
                title="Admin Console"
                isActive={false}
                icon={Shield}
              />
            )}
          </>
        )}
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
          onClick={handleNotificationsClick}
          count={notificationCount}
          title={t('nav.notifications')}
        />

        {/* Display Language Shortcut (above Settings) */}
        <LanguageToggleButton variant="sidebar" />

        {isConsole ? (
          <div className="w-full relative flex items-center justify-center group">
            <Link
              href="/home"
              className="flex items-center justify-center relative cursor-pointer"
              title="Return to Core Platform"
            >
              <div className="nav-icon flex items-center justify-center transition-all duration-150 text-[#dbdbdb] hover:text-white">
                <Home size={20} strokeWidth={1.5} />
              </div>
            </Link>
          </div>
        ) : (
          <SidebarNavItem
            href="/settings"
            title={t('nav.settings')}
            isActive={pathname === '/settings'}
            icon={Settings}
            isProtected={true}
            featureName="Platform Settings"
            modalDescription={
              locale === 'ar'
                ? 'أنشئ حسابك المجاني لتخصيص إعدادات الحساب وتفضيلات الإشعارات.'
                : 'Create a free account to customize your theme, alert webhooks, telegram notifications, and multi-currency settings.'
            }
          />
        )}
      </div>

      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </div>
  );
}
