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
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  return (
    <div className="h-14 w-full bg-black border-t border-white/[0.06] flex items-center justify-around z-50">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.label}
            href={item.href}
            className="flex-1 h-full flex flex-col items-center justify-center group"
          >
            <div 
              className={`flex items-center justify-center rounded-md w-12 h-7 transition-all duration-200 mb-0.5 ${
                isActive 
                  ? 'bg-white/[0.06] text-white' 
                  : 'text-white/35 group-hover:text-white/60'
              }`}
            >
              <item.icon size={18} strokeWidth={isActive ? 2 : 1.5} />
            </div>
            <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-white' : 'text-white/35 group-hover:text-white/60'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
