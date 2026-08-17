'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { LayoutDashboard, LineChart, Wallet, Settings, Bell } from 'lucide-react';
import NotificationsDrawer from '@/components/platform/NotificationsDrawer';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function BottomNav() {
  const pathname = usePathname();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const { data: notifData } = useSWR<{ notifications: unknown[] }>('/api/notifications', fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });

  const notificationCount = notifData?.notifications?.length ?? 0;

  return (
    <>
      <div className="h-14 w-full bg-black border-t border-white/[0.08] flex items-center justify-around z-50 px-1 relative">
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

        {/* 2. Charts */}
        <Link
          href="/charts"
          prefetch={true}
          className="flex-1 h-full flex flex-col items-center justify-center group"
        >
          <div
            className={`flex items-center justify-center rounded-md w-10 h-6 transition-all duration-200 mb-0.5 ${
              pathname === '/charts' ? 'bg-white/[0.08] text-white' : 'text-white/35 group-hover:text-white/60'
            }`}
          >
            <LineChart size={17} strokeWidth={pathname === '/charts' ? 2 : 1.5} />
          </div>
          <span
            className={`text-[9px] font-medium transition-colors ${
              pathname === '/charts' ? 'text-white' : 'text-white/35 group-hover:text-white/60'
            }`}
          >
            Charts
          </span>
        </Link>

        {/* 3. Middle Prominent Action: Alerts / Notifications */}
        <div className="flex-1 h-full flex flex-col items-center justify-center relative">
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(true)}
            className="flex flex-col items-center justify-center group -mt-3 relative"
            title="Trade Notifications & Alerts"
          >
            <div className="w-10 h-10 rounded-full bg-[#111] border border-plt-orange/40 shadow-[0_0_12px_rgba(255,100,13,0.2)] flex items-center justify-center text-plt-orange transition-all duration-200 group-hover:scale-105 group-hover:border-plt-orange group-active:scale-95 relative">
              <Bell size={18} strokeWidth={2} />
              {notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full bg-plt-orange text-black text-[9px] font-mono font-bold flex items-center justify-center ring-2 ring-black">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </div>
            <span className="text-[9px] font-medium text-plt-orange mt-0.5 tracking-tight">
              Alerts
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

      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </>
  );
}
