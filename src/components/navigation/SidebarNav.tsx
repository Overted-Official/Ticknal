'use client';

import Link from 'next/link';
import Image from 'next/image';
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
    <div className="w-16 h-full flex flex-col items-center py-4 bg-tv-base border-r border-tv-border">
      {/* Brand Logo */}
      <Link href="/dashboard" className="mb-6 w-8 h-8 rounded-tv-lg overflow-hidden relative shadow-[0_0_15px_rgba(0,255,167,0.4)] flex-shrink-0 group">
        <Image src="/logo.jpg" alt="QuantEGX" fill className="object-cover" />
        <div className="absolute inset-0 bg-[#00FFA7] mix-blend-color group-hover:opacity-80 transition-opacity" />
        <div className="absolute inset-0 bg-tv-base mix-blend-lighten opacity-20" />
      </Link>

      <div className="flex-1 flex flex-col space-y-4 w-full items-center">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="w-full py-1 flex flex-col items-center justify-center group relative"
            >
              <div 
                className={`flex items-center justify-center rounded-tv-full w-10 h-7 transition-colors duration-200 mb-1 ${
                  isActive 
                    ? 'bg-tv-accent/20 text-tv-accent' 
                    : 'text-tv-muted group-hover:bg-tv-hover group-hover:text-tv-text'
                }`}
              >
                <item.icon size={18} strokeWidth={1.5} />
              </div>
              <span className={`text-[9px] font-weight-medium ${isActive ? 'text-tv-accent' : 'text-tv-muted group-hover:text-tv-text'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col items-center w-full pb-4">
        <button className="w-full py-1 flex flex-col items-center justify-center group">
          <div className="flex items-center justify-center rounded-tv-full w-10 h-7 text-tv-muted group-hover:bg-tv-hover group-hover:text-tv-text transition-colors duration-200 mb-1">
            <Settings size={18} strokeWidth={1.5} />
          </div>
          <span className="text-[9px] font-weight-medium text-tv-muted group-hover:text-tv-text">Settings</span>
        </button>
      </div>
    </div>
  );
}
