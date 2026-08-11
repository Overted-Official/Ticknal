'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, LineChart, ListOrdered, Settings } from '@/components/ui/icons';

export default function SidebarNav() {
  const pathname = usePathname();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: LineChart, label: 'Charts', href: '/charts' },
    { icon: ListOrdered, label: 'Orders', href: '/orders' },
  ];

  return (
    <div className="w-12 h-full flex flex-col items-center py-4 bg-tv-base border-r border-tv-border">
      {/* Brand Logo Placeholder */}
      <div className="mb-6 w-8 h-8 rounded-tv-lg bg-tv-accent flex items-center justify-center font-weight-medium text-white shadow-[0_0_15px_rgba(41,98,255,0.4)] text-sm">
        Q
      </div>

      <div className="flex-1 flex flex-col space-y-4 w-full items-center">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`w-full py-2 flex flex-col items-center justify-center transition-all duration-200 group ${
                isActive 
                  ? 'bg-tv-hover text-tv-accent border-l-2 border-tv-accent' 
                  : 'text-tv-muted hover:bg-tv-hover hover:text-tv-text border-l-2 border-transparent'
              }`}
            >
              <item.icon size={18} strokeWidth={1.5} className="mb-1" />
              <span className="text-[9px] font-weight-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col items-center w-full pb-4">
        <button className="w-full py-2 flex flex-col items-center justify-center text-tv-muted hover:bg-tv-hover hover:text-tv-text transition-all duration-200 group border-l-2 border-transparent">
          <Settings size={18} strokeWidth={1.5} className="mb-1" />
          <span className="text-[9px] font-weight-medium">Settings</span>
        </button>
      </div>
    </div>
  );
}
