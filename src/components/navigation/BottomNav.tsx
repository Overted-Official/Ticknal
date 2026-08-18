'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { LayoutDashboard, LineChart, Wallet, Settings, Bell, Plus } from 'lucide-react';
import NotificationsDrawer from '@/components/platform/NotificationsDrawer';
import QuickAddDrawer from '@/components/platform/QuickAddDrawer';
import { useMobileNavScroll } from '@/context/MobileNavScrollContext';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
      {/* Floating Persistent Alerts Button on Mobile */}
      <div
        className={`fixed bottom-[calc(4.2rem+env(safe-area-inset-bottom,0px))] right-3.5 z-40 md:hidden transition-all duration-300 ease-out will-change-transform ${
          isNavVisible ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-16 opacity-0 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsNotificationsOpen(true)}
          className="w-10 h-10 rounded-full bg-[#111]/95 border border-plt-orange/40 shadow-xl shadow-black/80 flex items-center justify-center text-plt-orange hover:scale-105 active:scale-95 transition-all relative backdrop-blur-md"
          title="Trade Notifications & Alerts"
        >
          <Bell size={18} strokeWidth={2} />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-plt-orange text-black text-[9px] font-mono font-bold flex items-center justify-center ring-2 ring-black">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>
      </div>

      {/* Main Bottom Bar */}
      <div
        className={`w-full bg-black/95 backdrop-blur-xl border-t border-white/[0.08] flex items-center justify-around z-50 px-1 pb-[env(safe-area-inset-bottom)] relative transition-all duration-300 ease-out will-change-transform ${
          isNavVisible ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="h-14 w-full flex items-center justify-around">
        {/* 1. Dashboard */}
        <Link
          href="/dashboard"
          prefetch={true}
          className="flex-1 h-full flex flex-col items-center justify-center group"
        >
          <div
            className={`flex items-center justify-center rounded-md w-10 h-6 transition-all duration-200 mb-0.5 ${
              pathname === '/dashboard' ? 'bg-white/[0.08] text-white' : 'text-white/35 group-hover:text-white/60'
            }`}
          >
            <LayoutDashboard size={17} strokeWidth={pathname === '/dashboard' ? 2 : 1.5} />
          </div>
          <span
            className={`text-[9px] font-medium transition-colors ${
              pathname === '/dashboard' ? 'text-white' : 'text-white/35 group-hover:text-white/60'
            }`}
          >
            Dashboard
          </span>
        </Link>

        {/* 2. Invest */}
        <Link
          href="/invest"
          prefetch={true}
          className="flex-1 h-full flex flex-col items-center justify-center group"
        >
          <div
            className={`flex items-center justify-center rounded-md w-10 h-6 transition-all duration-200 mb-0.5 ${
              pathname === '/invest' || pathname === '/charts' ? 'bg-white/[0.08] text-white' : 'text-white/35 group-hover:text-white/60'
            }`}
          >
            <LineChart size={17} strokeWidth={pathname === '/invest' || pathname === '/charts' ? 2 : 1.5} />
          </div>
          <span
            className={`text-[9px] font-medium transition-colors ${
              pathname === '/invest' || pathname === '/charts' ? 'text-white' : 'text-white/35 group-hover:text-white/60'
            }`}
          >
            Invest
          </span>
        </Link>

        {/* 3. Middle Prominent Action: + Quick Add (Transactions & Positions) */}
        <div className="flex-1 h-full flex flex-col items-center justify-center relative">
          <button
            type="button"
            onClick={() => setIsQuickAddOpen(true)}
            className="flex flex-col items-center justify-center group -mt-3 relative"
            title="Quick Add Transaction or Position"
          >
            <div className="w-10 h-10 rounded-full bg-[#111] border border-plt-orange/50 shadow-[0_0_14px_rgba(255,100,13,0.25)] flex items-center justify-center text-plt-orange transition-all duration-200 group-hover:scale-105 group-hover:border-plt-orange group-active:scale-95">
              <Plus size={20} strokeWidth={2.4} />
            </div>
            <span className="text-[9px] font-medium text-plt-orange mt-0.5 tracking-tight">
              Add
            </span>
          </button>
        </div>

        {/* 4. Wallet */}
        <Link
          href="/wallet"
          prefetch={true}
          className="flex-1 h-full flex flex-col items-center justify-center group"
        >
          <div
            className={`flex items-center justify-center rounded-md w-10 h-6 transition-all duration-200 mb-0.5 ${
              pathname === '/wallet' || pathname === '/positions' ? 'bg-white/[0.08] text-white' : 'text-white/35 group-hover:text-white/60'
            }`}
          >
            <Wallet size={17} strokeWidth={pathname === '/wallet' || pathname === '/positions' ? 2 : 1.5} />
          </div>
          <span
            className={`text-[9px] font-medium transition-colors ${
              pathname === '/wallet' || pathname === '/positions' ? 'text-white' : 'text-white/35 group-hover:text-white/60'
            }`}
          >
            Wallet
          </span>
        </Link>

        {/* 5. Settings */}
        <Link
          href="/settings"
          prefetch={true}
          className="flex-1 h-full flex flex-col items-center justify-center group"
        >
          <div
            className={`flex items-center justify-center rounded-md w-10 h-6 transition-all duration-200 mb-0.5 ${
              pathname === '/settings' ? 'bg-white/[0.08] text-white' : 'text-white/35 group-hover:text-white/60'
            }`}
          >
            <Settings size={17} strokeWidth={pathname === '/settings' ? 2 : 1.5} />
          </div>
          <span
            className={`text-[9px] font-medium transition-colors ${
              pathname === '/settings' ? 'text-white' : 'text-white/35 group-hover:text-white/60'
            }`}
          >
            Settings
          </span>
          </Link>
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
