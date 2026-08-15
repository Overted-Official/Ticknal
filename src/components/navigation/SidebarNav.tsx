'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, LineChart, ListOrdered, Settings } from '@/components/ui/icons';

export default function SidebarNav() {
  const pathname = usePathname();
  const [isChartsMenuOpen, setIsChartsMenuOpen] = useState(false);
  const chartsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (chartsMenuRef.current && !chartsMenuRef.current.contains(event.target as Node)) {
        setIsChartsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: LineChart, label: 'Charts', href: '/charts' },
    { icon: ListOrdered, label: 'Positions', href: '/positions' },
  ];

  return (
    <div className="w-[48px] h-full flex flex-col items-center py-3 bg-[#0f0f0f] border-r border-white/[0.08] select-none text-white">
      {/* Brand Logo */}
      <Link href="/dashboard" className="mb-4 w-6 h-6 relative flex-shrink-0 group transition-opacity hover:opacity-80 flex items-center justify-center">
        <Image src="/logo.svg" alt="QuantEGX" width={22} height={22} className="object-contain" priority />
      </Link>

      <div className="flex-1 flex flex-col space-y-3 w-full items-center">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isCharts = item.href === '/charts';
          
          if (isCharts) {
            return (
              <div key={item.href} className="w-full relative group" ref={chartsMenuRef}>
                <button
                  onClick={() => setIsChartsMenuOpen(!isChartsMenuOpen)}
                  className="w-full py-0.5 flex flex-col items-center justify-center relative"
                >
                  <div 
                    className={`flex items-center justify-center rounded-lg w-8 h-8 transition-all duration-150 mb-0.5 ${
                      isActive || isChartsMenuOpen
                        ? 'bg-white/[0.08] border border-white/[0.12] text-plt-orange shadow-[0_0_12px_rgba(255,100,13,0.15)]' 
                        : 'text-white/40 group-hover:bg-white/[0.04] group-hover:text-white'
                    }`}
                  >
                    <item.icon size={16} strokeWidth={1.5} />
                  </div>
                  <span className={`text-[8px] tracking-tight ${isActive || isChartsMenuOpen ? 'text-plt-orange font-semibold' : 'text-white/40 group-hover:text-white/80'}`}>
                    {item.label}
                  </span>
                </button>
                
                {/* Desktop Floating Menu for Charts */}
                {isChartsMenuOpen && (
                  <div className="absolute left-full top-0 ml-2 hidden lg:flex flex-col bg-[#181818]/95 backdrop-blur-2xl border border-white/[0.1] rounded-xl shadow-2xl z-50 w-32 overflow-hidden animate-in fade-in slide-in-from-left-2 duration-150 p-1">
                    <div className="px-2.5 py-1 text-[8px] font-bold text-white/40 uppercase tracking-wider">
                      Views
                    </div>
                    <Link 
                      href="/charts?view=chart" 
                      onClick={() => setIsChartsMenuOpen(false)}
                      className="px-2.5 py-1.5 text-xs font-medium text-white/80 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-plt-orange"></span>
                      Chart
                    </Link>
                    <Link 
                      href="/charts?view=positions" 
                      onClick={() => setIsChartsMenuOpen(false)}
                      className="px-2.5 py-1.5 text-xs font-medium text-white/80 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                      Positions
                    </Link>
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="w-full py-0.5 flex flex-col items-center justify-center group"
            >
              <div 
                className={`flex items-center justify-center rounded-lg w-8 h-8 transition-all duration-150 mb-0.5 ${
                  isActive 
                    ? 'bg-white/[0.08] border border-white/[0.12] text-plt-orange shadow-[0_0_12px_rgba(255,100,13,0.15)]' 
                    : 'text-white/40 group-hover:bg-white/[0.04] group-hover:text-white'
                }`}
              >
                <item.icon size={16} strokeWidth={1.5} />
              </div>
              <span className={`text-[8px] tracking-tight ${isActive ? 'text-plt-orange font-semibold' : 'text-white/40 group-hover:text-white/80'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Settings at the bottom */}
      <div className="w-full flex flex-col items-center space-y-2 mt-auto">
        <Link
          href="/settings"
          className="w-full py-0.5 flex flex-col items-center justify-center group"
        >
          <div 
            className={`flex items-center justify-center rounded-lg w-8 h-8 transition-all duration-150 ${
              pathname === '/settings' 
                ? 'bg-white/[0.08] border border-white/[0.12] text-plt-orange shadow-[0_0_12px_rgba(255,100,13,0.15)]' 
                : 'text-white/40 group-hover:bg-white/[0.04] group-hover:text-white'
            }`}
          >
            <Settings size={16} strokeWidth={1.5} />
          </div>
          <span className={`text-[8px] tracking-tight mt-0.5 ${pathname === '/settings' ? 'text-plt-orange font-semibold' : 'text-white/40 group-hover:text-white/80'}`}>
            Settings
          </span>
        </Link>
      </div>
    </div>
  );
}
