'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  LineChart,
  Wallet,
  Settings,
  Bell,
  TrendingUp,
  Landmark,
  ShieldCheck,
  Layers,
  LayoutGrid,
  PieChart,
} from '@/components/ui/icon-library';
import NotificationsDrawer from '@/components/platform/NotificationsDrawer';
import PrivacyToggleButton from '@/components/platform/PrivacyToggleButton';
import { flyoutReveal } from '@/lib/motion';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab');

  const [isDashboardMenuOpen, setIsDashboardMenuOpen] = useState(false);
  const [isChartsMenuOpen, setIsChartsMenuOpen] = useState(false);
  const [isWalletMenuOpen, setIsWalletMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const dashboardMenuRef = useRef<HTMLDivElement>(null);
  const chartsMenuRef = useRef<HTMLDivElement>(null);
  const walletMenuRef = useRef<HTMLDivElement>(null);

  const { data: notifData } = useSWR<{ notifications: unknown[] }>('/api/notifications', fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });

  const { data: logsData } = useSWR<{ logs: Array<{ id: number; level: string; createdAt: string }> }>('/api/system-logs', fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });

  const notificationCount = (notifData?.notifications?.length ?? 0) + (logsData?.logs?.some((l) => l.level === 'ERROR') ? 1 : 0);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dashboardMenuRef.current && !dashboardMenuRef.current.contains(event.target as Node)) {
        setIsDashboardMenuOpen(false);
      }
      if (chartsMenuRef.current && !chartsMenuRef.current.contains(event.target as Node)) {
        setIsChartsMenuOpen(false);
      }
      if (walletMenuRef.current && !walletMenuRef.current.contains(event.target as Node)) {
        setIsWalletMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDashboardActive = pathname === '/dashboard';
  const isInvestActive = pathname === '/invest' || pathname === '/charts';
  const isWalletActive = pathname === '/wallet' || pathname === '/positions';

  return (
    <div className="nav-shell w-[45px] h-full flex flex-col items-center py-2.5 border-r select-none">
      {/* Brand Logo */}
      <Link
        href="/dashboard"
        className="mb-3 w-8 h-8 relative flex-shrink-0 group transition-opacity hover:opacity-80 flex items-center justify-center"
        title="Ticknal Dashboard"
      >
        <Image src="/logo-mark.svg" alt="Ticknal" width={22} height={22} className="object-contain" priority />
      </Link>

      <div className="flex-1 flex flex-col space-y-2.5 w-full items-center">
        {/* 1. Dashboard with Sub-Menu */}
        <div className="w-full relative flex items-center justify-center group" ref={dashboardMenuRef}>
          <button
            type="button"
            onClick={() => {
              setIsDashboardMenuOpen(!isDashboardMenuOpen);
              setIsChartsMenuOpen(false);
              setIsWalletMenuOpen(false);
            }}
            className="flex items-center justify-center relative"
            title="Dashboard"
          >
            <div
              className={`nav-icon flex items-center justify-center transition-all duration-150 ${
                isDashboardActive || isDashboardMenuOpen
                  ? 'nav-icon-active'
                  : 'text-plt-muted hover:text-plt-text'
              }`}
            >
              <LayoutDashboard size={20} strokeWidth={1.5} />
            </div>
          </button>

          {/* Desktop Floating Menu for Dashboard */}
          {isDashboardMenuOpen && (
            <motion.div
              variants={flyoutReveal}
              initial="hidden"
              animate="visible"
              className="nav-flyout absolute left-full top-0 ml-2 z-50 w-44 overflow-hidden"
            >
              <div className="nav-flyout-title">Dashboard</div>
              <Link
                href="/dashboard?tab=net-worth"
                prefetch={true}
                onClick={() => setIsDashboardMenuOpen(false)}
                className={`nav-flyout-link ${
                  isDashboardActive && (!currentTab || currentTab === 'net-worth')
                    ? 'nav-flyout-link-active'
                    : ''
                }`}
              >
                <ShieldCheck size={16} />
                <span>Net Worth</span>
              </Link>
              <Link
                href="/dashboard?tab=investments"
                prefetch={true}
                onClick={() => setIsDashboardMenuOpen(false)}
                className={`nav-flyout-link ${
                  isDashboardActive && currentTab === 'investments'
                    ? 'nav-flyout-link-active'
                    : ''
                }`}
              >
                <TrendingUp size={16} />
                <span>Investments</span>
              </Link>
              <Link
                href="/dashboard?tab=banks"
                prefetch={true}
                onClick={() => setIsDashboardMenuOpen(false)}
                className={`nav-flyout-link ${
                  isDashboardActive && currentTab === 'banks'
                    ? 'nav-flyout-link-active'
                    : ''
                }`}
              >
                <Landmark size={16} />
                <span>Accounts</span>
              </Link>
            </motion.div>
          )}
        </div>

        {/* 2. Invest with Sub-Menu */}
        <div className="w-full relative flex items-center justify-center group" ref={chartsMenuRef}>
          <button
            type="button"
            onClick={() => {
              setIsChartsMenuOpen(!isChartsMenuOpen);
              setIsDashboardMenuOpen(false);
              setIsWalletMenuOpen(false);
            }}
            className="flex items-center justify-center relative"
            title="Invest"
          >
            <div
              className={`nav-icon flex items-center justify-center transition-all duration-150 ${
                isInvestActive || isChartsMenuOpen
                  ? 'nav-icon-active'
                  : 'text-plt-muted hover:text-plt-text'
              }`}
            >
              <LineChart size={20} strokeWidth={1.5} />
            </div>
          </button>

          {/* Desktop Floating Menu for Invest */}
          {isChartsMenuOpen && (
            <motion.div
              variants={flyoutReveal}
              initial="hidden"
              animate="visible"
              className="nav-flyout absolute left-full top-0 ml-2 z-50 w-44 overflow-hidden"
            >
              <div className="nav-flyout-title">Invest</div>
              <Link
                href="/invest?view=sectors"
                prefetch={true}
                onClick={() => setIsChartsMenuOpen(false)}
                className={`nav-flyout-link ${
                  isInvestActive && (!searchParams.get('view') || searchParams.get('view') === 'sectors')
                    ? 'nav-flyout-link-active'
                    : ''
                }`}
              >
                <Layers size={16} />
                <span>Sectors</span>
              </Link>
              <Link
                href="/invest?view=chart"
                prefetch={true}
                onClick={() => setIsChartsMenuOpen(false)}
                className={`nav-flyout-link ${
                  isInvestActive && searchParams.get('view') === 'chart'
                    ? 'nav-flyout-link-active'
                    : ''
                }`}
              >
                <LineChart size={16} />
                <span>Tickers</span>
              </Link>
              <Link
                href="/invest?view=portfolio"
                prefetch={true}
                onClick={() => setIsChartsMenuOpen(false)}
                className={`nav-flyout-link ${
                  isInvestActive && searchParams.get('view') === 'portfolio'
                    ? 'nav-flyout-link-active'
                    : ''
                }`}
              >
                <PieChart size={16} />
                <span>Portfolio</span>
              </Link>
            </motion.div>
          )}
        </div>

        {/* 3. Wallet with Sub-Menu */}
        <div className="w-full relative flex items-center justify-center group" ref={walletMenuRef}>
          <button
            type="button"
            onClick={() => {
              setIsWalletMenuOpen(!isWalletMenuOpen);
              setIsDashboardMenuOpen(false);
              setIsChartsMenuOpen(false);
            }}
            className="flex items-center justify-center relative"
            title="Wallet"
          >
            <div
              className={`nav-icon flex items-center justify-center transition-all duration-150 ${
                isWalletActive || isWalletMenuOpen
                  ? 'nav-icon-active'
                  : 'text-plt-muted hover:text-plt-text'
              }`}
            >
              <Wallet size={20} strokeWidth={1.5} />
            </div>
          </button>

          {/* Desktop Floating Menu for Wallet */}
          {isWalletMenuOpen && (
            <motion.div
              variants={flyoutReveal}
              initial="hidden"
              animate="visible"
              className="nav-flyout absolute left-full top-0 ml-2 z-50 w-40 overflow-hidden"
            >
              <div className="nav-flyout-title">Wallet</div>
              <Link
                href="/wallet?tab=positions"
                prefetch={true}
                onClick={() => setIsWalletMenuOpen(false)}
                className={`nav-flyout-link ${
                  isWalletActive && (!currentTab || currentTab === 'positions')
                    ? 'nav-flyout-link-active'
                    : ''
                }`}
              >
                <Layers size={16} />
                <span>Positions</span>
              </Link>
              <Link
                href="/wallet?tab=banks"
                prefetch={true}
                onClick={() => setIsWalletMenuOpen(false)}
                className={`nav-flyout-link ${
                  isWalletActive && currentTab === 'banks'
                    ? 'nav-flyout-link-active'
                    : ''
                }`}
              >
                <Landmark size={16} />
                <span>Accounts</span>
              </Link>
            </motion.div>
          )}
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
                  : 'text-plt-muted hover:text-plt-text'
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
                  : 'text-plt-muted hover:text-plt-text'
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
