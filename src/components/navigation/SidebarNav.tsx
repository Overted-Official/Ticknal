'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { LayoutDashboard, LineChart, Wallet, Settings, Bell, TrendingUp, Landmark, ShieldCheck, Layers, LayoutGrid } from 'lucide-react';
import NotificationsDrawer from '@/components/platform/NotificationsDrawer';

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

  const notificationCount = (notifData?.notifications?.length ?? 0) + (logsData?.logs?.some(l => l.level === 'ERROR') ? 1 : 0);

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
    <div className="w-[48px] h-full flex flex-col items-center py-3 bg-black border-r border-white/[0.06] select-none text-white">
      {/* Brand Logo */}
      <Link href="/dashboard" className="mb-4 w-6 h-6 relative flex-shrink-0 group transition-opacity hover:opacity-80 flex items-center justify-center">
        <Image src="/logo.svg" alt="QuantEGX" width={22} height={22} className="object-contain" priority />
      </Link>

      <div className="flex-1 flex flex-col space-y-3 w-full items-center">
        {/* 1. Dashboard with Sub-Menu */}
        <div className="w-full relative group" ref={dashboardMenuRef}>
          <button
            onClick={() => {
              setIsDashboardMenuOpen(!isDashboardMenuOpen);
              setIsChartsMenuOpen(false);
              setIsWalletMenuOpen(false);
            }}
            className="w-full py-0.5 flex flex-col items-center justify-center relative"
          >
            <div 
              className={`flex items-center justify-center rounded-md w-8 h-8 transition-all duration-150 mb-0.5 ${
                isDashboardActive || isDashboardMenuOpen
                  ? 'bg-white/[0.06] text-white' 
                  : 'text-white/35 group-hover:text-white/70'
              }`}
            >
              <LayoutDashboard size={16} strokeWidth={1.5} />
            </div>
            <span className={`text-[8px] tracking-tight ${isDashboardActive || isDashboardMenuOpen ? 'text-white font-medium' : 'text-white/35 group-hover:text-white/60'}`}>
              Dashboard
            </span>
          </button>
          
          {/* Desktop Floating Menu for Dashboard */}
          {isDashboardMenuOpen && (
            <div className="absolute left-full top-0 ml-2 hidden lg:flex flex-col bg-[#111] border border-white/[0.06] rounded-md z-50 w-36 overflow-hidden animate-in fade-in slide-in-from-left-2 duration-150 p-1 shadow-2xl">
              <div className="px-2.5 py-1 text-[8px] font-bold text-white/40 uppercase tracking-wider">
                Dashboard
              </div>
              <Link 
                href="/dashboard?tab=net-worth" 
                prefetch={true}
                onClick={() => setIsDashboardMenuOpen(false)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-2 ${
                  isDashboardActive && (!currentTab || currentTab === 'net-worth')
                    ? 'text-white bg-white/[0.08]'
                    : 'text-white/80 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <ShieldCheck size={13} className="text-emerald-400" />
                Net Worth
              </Link>
              <Link 
                href="/dashboard?tab=investments" 
                prefetch={true}
                onClick={() => setIsDashboardMenuOpen(false)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-2 ${
                  isDashboardActive && currentTab === 'investments'
                    ? 'text-white bg-white/[0.08]'
                    : 'text-white/80 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <TrendingUp size={13} className="text-plt-orange" />
                Investments
              </Link>
              <Link 
                href="/dashboard?tab=banks" 
                prefetch={true}
                onClick={() => setIsDashboardMenuOpen(false)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-2 ${
                  isDashboardActive && currentTab === 'banks'
                    ? 'text-white bg-white/[0.08]'
                    : 'text-white/80 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Landmark size={13} className="text-sky-400" />
                Bank Accounts
              </Link>
            </div>
          )}
        </div>

        {/* 2. Invest with Sub-Menu */}
        <div className="w-full relative group" ref={chartsMenuRef}>
          <button
            onClick={() => {
              setIsChartsMenuOpen(!isChartsMenuOpen);
              setIsDashboardMenuOpen(false);
              setIsWalletMenuOpen(false);
            }}
            className="w-full py-0.5 flex flex-col items-center justify-center relative"
          >
            <div 
              className={`flex items-center justify-center rounded-md w-8 h-8 transition-all duration-150 mb-0.5 ${
                isInvestActive || isChartsMenuOpen
                  ? 'bg-white/[0.06] text-white' 
                  : 'text-white/35 group-hover:text-white/70'
              }`}
            >
              <LineChart size={16} strokeWidth={1.5} />
            </div>
            <span className={`text-[8px] tracking-tight ${isInvestActive || isChartsMenuOpen ? 'text-white font-medium' : 'text-white/35 group-hover:text-white/60'}`}>
              Invest
            </span>
          </button>
          
          {/* Desktop Floating Menu for Invest */}
          {isChartsMenuOpen && (
            <div className="absolute left-full top-0 ml-2 hidden lg:flex flex-col bg-[#111] border border-white/[0.06] rounded-md z-50 w-40 overflow-hidden animate-in fade-in slide-in-from-left-2 duration-150 p-1 shadow-2xl">
              <div className="px-2.5 py-1 text-[8px] font-bold text-white/40 uppercase tracking-wider">
                Invest
              </div>
              <Link 
                href="/invest?view=sectors" 
                prefetch={true}
                onClick={() => setIsChartsMenuOpen(false)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-2 ${
                  isInvestActive && (!searchParams.get('view') || searchParams.get('view') === 'sectors')
                    ? 'text-white bg-white/[0.08]'
                    : 'text-white/80 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <LayoutGrid size={13} className="text-emerald-400" />
                Sectors
              </Link>
              <Link 
                href="/invest?view=chart" 
                prefetch={true}
                onClick={() => setIsChartsMenuOpen(false)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-2 ${
                  isInvestActive && searchParams.get('view') === 'chart'
                    ? 'text-white bg-white/[0.08]'
                    : 'text-white/80 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <LineChart size={13} className="text-plt-orange" />
                Tickers
              </Link>
            </div>
          )}
        </div>

        {/* 3. Wallet with Sub-Menu */}
        <div className="w-full relative group" ref={walletMenuRef}>
          <button
            onClick={() => {
              setIsWalletMenuOpen(!isWalletMenuOpen);
              setIsDashboardMenuOpen(false);
              setIsChartsMenuOpen(false);
            }}
            className="w-full py-0.5 flex flex-col items-center justify-center relative"
          >
            <div 
              className={`flex items-center justify-center rounded-md w-8 h-8 transition-all duration-150 mb-0.5 ${
                isWalletActive || isWalletMenuOpen
                  ? 'bg-white/[0.06] text-white' 
                  : 'text-white/35 group-hover:text-white/70'
              }`}
            >
              <Wallet size={16} strokeWidth={1.5} />
            </div>
            <span className={`text-[8px] tracking-tight ${isWalletActive || isWalletMenuOpen ? 'text-white font-medium' : 'text-white/35 group-hover:text-white/60'}`}>
              Wallet
            </span>
          </button>
          
          {/* Desktop Floating Menu for Wallet */}
          {isWalletMenuOpen && (
            <div className="absolute left-full top-0 ml-2 hidden lg:flex flex-col bg-[#111] border border-white/[0.06] rounded-md z-50 w-36 overflow-hidden animate-in fade-in slide-in-from-left-2 duration-150 p-1 shadow-2xl">
              <div className="px-2.5 py-1 text-[8px] font-bold text-white/40 uppercase tracking-wider">
                Wallet
              </div>
              <Link 
                href="/wallet?tab=positions" 
                prefetch={true}
                onClick={() => setIsWalletMenuOpen(false)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-2 ${
                  isWalletActive && (!currentTab || currentTab === 'positions')
                    ? 'text-white bg-white/[0.08]'
                    : 'text-white/80 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Layers size={13} className="text-plt-orange" />
                Positions
              </Link>
              <Link 
                href="/wallet?tab=banks" 
                prefetch={true}
                onClick={() => setIsWalletMenuOpen(false)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-2 ${
                  isWalletActive && currentTab === 'banks'
                    ? 'text-white bg-white/[0.08]'
                    : 'text-white/80 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Landmark size={13} className="text-emerald-400" />
                Bank Accounts
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Notifications & Settings at the bottom */}
      <div className="w-full flex flex-col items-center space-y-2 mt-auto">
        {/* Notifications Bell */}
        <button
          type="button"
          onClick={() => setIsNotificationsOpen(true)}
          className="w-full py-0.5 flex flex-col items-center justify-center group relative"
          title="Trade Notifications & Alerts"
        >
          <div 
            className={`flex items-center justify-center rounded-md w-8 h-8 transition-all duration-150 relative ${
              isNotificationsOpen 
                ? 'bg-white/[0.06] text-white' 
                : 'text-white/35 group-hover:text-white/70'
            }`}
          >
            <Bell size={16} strokeWidth={1.5} />
            {notificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-plt-orange ring-2 ring-black" />
            )}
          </div>
          <span className={`text-[8px] tracking-tight mt-0.5 ${isNotificationsOpen ? 'text-white font-medium' : 'text-white/35 group-hover:text-white/60'}`}>
            Alerts
          </span>
        </button>

        {/* Settings */}
        <Link
          href="/settings"
          prefetch={true}
          className="w-full py-0.5 flex flex-col items-center justify-center group"
        >
          <div 
            className={`flex items-center justify-center rounded-md w-8 h-8 transition-all duration-150 ${
              pathname === '/settings' 
                ? 'bg-white/[0.06] text-white' 
                : 'text-white/35 group-hover:text-white/70'
            }`}
          >
            <Settings size={16} strokeWidth={1.5} />
          </div>
          <span className={`text-[8px] tracking-tight mt-0.5 ${pathname === '/settings' ? 'text-white font-medium' : 'text-white/35 group-hover:text-white/60'}`}>
            Settings
          </span>
        </Link>
      </div>

      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </div>
  );
}
