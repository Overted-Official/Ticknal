'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, LineChart, ListOrdered, Settings } from '@/components/ui/icons';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: LineChart, label: 'Charts', href: '/charts' },
    { icon: ListOrdered, label: 'Orders', href: '/orders' },
    { icon: Settings, label: 'Settings', href: '#' },
  ];

  return (
    <div className="h-14 w-full bg-tv-base border-t border-tv-border flex items-center justify-around z-50">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex-1 h-full flex flex-col items-center justify-center transition-colors ${
              isActive
                ? 'text-tv-accent'
                : 'text-tv-muted hover:text-tv-text'
            }`}
          >
            <item.icon size={20} strokeWidth={isActive ? 2 : 1.5} className="mb-1" />
            <span className="text-[10px] font-weight-medium">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
