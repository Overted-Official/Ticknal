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
    <div className="h-14 w-full bg-tv-base border-t border-tv-border flex items-center justify-around z-50">
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
                  ? 'bg-tv-accent/20 text-tv-accent' 
                  : 'text-tv-muted group-hover:bg-tv-hover group-hover:text-tv-text'
              }`}
            >
              <item.icon size={20} strokeWidth={isActive ? 2 : 1.5} />
            </div>
            <span className={`text-[10px] font-weight-medium ${isActive ? 'text-tv-accent' : 'text-tv-muted group-hover:text-tv-text'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
