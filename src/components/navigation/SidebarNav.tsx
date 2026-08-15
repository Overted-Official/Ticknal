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
    <div className="w-[48px] h-full flex flex-col items-center py-2.5 bg-plt-base border-r border-plt-border select-none">
      {/* Brand Logo */}
      <Link href="/dashboard" className="mb-4 w-6 h-6 relative flex-shrink-0 group transition-opacity hover:opacity-80 flex items-center justify-center">
        <Image src="/logo.svg" alt="QuantEGX" width={24} height={24} className="object-contain" priority />
      </Link>

      <div className="flex-1 flex flex-col space-y-2.5 w-full items-center">
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
                    className={`flex items-center justify-center rounded-tv-md w-8 h-7 transition-colors duration-150 mb-0.5 ${
                      isActive || isChartsMenuOpen
                        ? 'bg-plt-surface border border-plt-orange/40 text-plt-orange shadow-sm' 
                        : 'text-plt-muted group-hover:bg-plt-hover group-hover:text-plt-text'
                    }`}
                  >
                    <item.icon size={16} strokeWidth={1.5} />
                  </div>
                  <span className={`text-[8px] font-weight-medium ${isActive || isChartsMenuOpen ? 'text-plt-orange font-semibold' : 'text-plt-muted group-hover:text-plt-text'}`}>
                    {item.label}
                  </span>
                </button>
                
                {/* Desktop Floating Menu for Charts */}
                {isChartsMenuOpen && (
                  <div className="absolute left-full top-0 ml-1.5 hidden lg:flex flex-col bg-plt-surface border border-plt-border rounded-tv-lg shadow-2xl z-50 w-32 overflow-hidden animate-in fade-in slide-in-from-left-2 duration-150">
                    <div className="px-3 py-1.5 text-[9px] font-weight-bold text-plt-muted uppercase tracking-wider border-b border-plt-border bg-plt-base/50">
                      Views
                    </div>
                    <Link 
                      href="/charts?view=chart" 
                      onClick={() => setIsChartsMenuOpen(false)}
                      className="px-3 py-2 text-xs font-weight-medium text-plt-text hover:bg-plt-hover transition-colors flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-plt-orange"></span>
                      Chart
                    </Link>
                    <Link 
                      href="/charts?view=positions" 
                      onClick={() => setIsChartsMenuOpen(false)}
                      className="px-3 py-2 text-xs font-weight-medium text-plt-text hover:bg-plt-hover transition-colors border-t border-plt-border/30 flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-plt-cyan"></span>
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
                className={`flex items-center justify-center rounded-tv-md w-8 h-7 transition-colors duration-150 mb-0.5 ${
                  isActive 
                    ? 'bg-plt-surface border border-plt-orange/40 text-plt-orange shadow-sm' 
                    : 'text-plt-muted group-hover:bg-plt-hover group-hover:text-plt-text'
                }`}
              >
                <item.icon size={16} strokeWidth={1.5} />
              </div>
              <span className={`text-[8px] font-weight-medium ${isActive ? 'text-plt-orange font-semibold' : 'text-plt-muted group-hover:text-plt-text'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col items-center w-full pb-2">
        <button className="w-full py-0.5 flex flex-col items-center justify-center group">
          <div className="flex items-center justify-center rounded-tv-md w-8 h-7 text-plt-muted group-hover:bg-plt-hover group-hover:text-plt-text transition-colors duration-150 mb-0.5">
            <Settings size={16} strokeWidth={1.5} />
          </div>
          <span className="text-[8px] font-weight-medium text-plt-muted group-hover:text-plt-text">Settings</span>
        </button>
      </div>
    </div>
  );
}
