'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, LineChart, ListOrdered, Settings } from '@/components/ui/icons';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: LineChart, label: 'Charts', href: '/charts' },
    { icon: ListOrdered, label: 'Positions', href: '/positions' },
    { icon: Settings, label: 'Settings', href: '#' },
  ];

  return (
    <div className="h-14 w-full bg-plt-surface border-t border-plt-border flex items-center justify-around z-50">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.label}
            href={item.href}
            className="flex-1 h-full flex flex-col items-center justify-center group"
          >
            <div 
              className={`flex items-center justify-center rounded-tv-full w-12 h-7 transition-colors duration-200 mb-1 ${
                isActive 
                  ? 'bg-plt-card border border-plt-orange/30 text-plt-orange' 
                  : 'text-plt-muted group-hover:bg-plt-hover group-hover:text-plt-text'
              }`}
            >
              <item.icon size={20} strokeWidth={isActive ? 2 : 1.5} />
            </div>
            <span className={`text-[10px] font-weight-medium ${isActive ? 'text-plt-orange' : 'text-plt-muted group-hover:text-plt-text'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
