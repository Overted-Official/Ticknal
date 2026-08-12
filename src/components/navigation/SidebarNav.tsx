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
    { icon: ListOrdered, label: 'Orders', href: '/orders' },
  ];

  return (
    <div className="w-16 h-full flex flex-col items-center py-4 bg-tv-base border-r border-tv-border">
      {/* Brand Logo */}
      <Link href="/dashboard" className="mb-6 w-8 h-8 rounded-tv-lg overflow-hidden relative shadow-[0_0_15px_rgba(255,255,255,0.1)] flex-shrink-0 group transition-shadow hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]">
        <Image src="/logo.svg" alt="QuantEGX" fill className="object-cover" />
      </Link>

      <div className="flex-1 flex flex-col space-y-4 w-full items-center">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isCharts = item.href === '/charts';
          
          if (isCharts) {
            return (
              <div key={item.href} className="w-full relative group" ref={chartsMenuRef}>
                <button
                  onClick={() => setIsChartsMenuOpen(!isChartsMenuOpen)}
                  className="w-full py-1 flex flex-col items-center justify-center relative"
                >
                  <div 
                    className={`flex items-center justify-center rounded-tv-full w-10 h-7 transition-colors duration-200 mb-1 ${
                      isActive || isChartsMenuOpen
                        ? 'bg-tv-accent/20 text-tv-accent' 
                        : 'text-tv-muted group-hover:bg-tv-hover group-hover:text-tv-text'
                    }`}
                  >
                    <item.icon size={18} strokeWidth={1.5} />
                  </div>
                  <span className={`text-[9px] font-weight-medium ${isActive || isChartsMenuOpen ? 'text-tv-accent' : 'text-tv-muted group-hover:text-tv-text'}`}>
                    {item.label}
                  </span>
                </button>
                
                {/* Desktop Floating Menu for Charts */}
                {isChartsMenuOpen && (
                  <div className="absolute left-full top-0 ml-1 hidden lg:flex flex-col bg-tv-surface border border-tv-border rounded-tv-lg shadow-2xl z-50 w-32 overflow-hidden animate-in fade-in slide-in-from-left-2 duration-200">
                    <div className="px-3 py-2 text-[10px] font-weight-bold text-tv-muted uppercase tracking-wider border-b border-tv-border bg-tv-base/50">
                      Views
                    </div>
                    <Link 
                      href="/charts?view=chart" 
                      onClick={() => setIsChartsMenuOpen(false)}
                      className="px-3 py-2.5 text-xs font-weight-medium text-tv-text hover:bg-tv-hover hover:text-tv-accent transition-colors flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-tv-accent opacity-70"></span>
                      Chart
                    </Link>
                    <Link 
                      href="/charts?view=positions" 
                      onClick={() => setIsChartsMenuOpen(false)}
                      className="px-3 py-2.5 text-xs font-weight-medium text-tv-text hover:bg-tv-hover hover:text-tv-accent transition-colors border-t border-tv-border/30 flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-tv-border-highlight"></span>
                      Positions
                    </Link>
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={item.href} className="w-full relative group">
              <Link
                href={item.href}
                className="w-full py-1 flex flex-col items-center justify-center relative"
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
            </div>
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
