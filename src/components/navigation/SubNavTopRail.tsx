'use client';

import React from 'react';
import { useMobileNavScroll } from '@/context/MobileNavScrollContext';

export type SubNavTabItem = {
  label: string;
  value: string;
  icon?: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  badge?: string | number;
};

interface SubNavTopRailProps {
  items: SubNavTabItem[];
  activeTab: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function SubNavTopRail({
  items,
  activeTab,
  onChange,
  className = '',
}: SubNavTopRailProps) {
  const { isNavVisible } = useMobileNavScroll();

  return (
    <div
      className={`md:hidden w-full shrink-0 flex items-center gap-1.5 border-b bg-black/95 backdrop-blur-md z-30 overflow-x-auto no-scrollbar scroll-smooth transition-all duration-300 ease-out will-change-[transform,max-height,opacity] ${
        isNavVisible
          ? 'translate-y-0 max-h-11 h-11 px-3 border-white/[0.08] opacity-100'
          : '-translate-y-full max-h-0 h-0 px-3 py-0 border-transparent opacity-0 pointer-events-none overflow-hidden'
      } ${className}`}
    >
      {items.map((item) => {
        const isActive = activeTab === item.value;
        const Icon = item.icon;

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={`h-7.5 px-3 rounded-full text-xs font-medium transition-all duration-150 whitespace-nowrap select-none shrink-0 flex items-center gap-1.5 ${
              isActive
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'bg-white/[0.05] text-white/50 hover:text-white/80 hover:bg-white/[0.09] border border-white/[0.05]'
            }`}
          >
            {Icon && (
              <Icon
                size={13}
                strokeWidth={isActive ? 2.2 : 1.8}
                className={isActive ? 'text-black' : 'text-white/40'}
              />
            )}
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold leading-none ${
                  isActive
                    ? 'bg-black/15 text-black'
                    : 'bg-white/10 text-white/60'
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
