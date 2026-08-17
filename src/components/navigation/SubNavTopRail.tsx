'use client';

import React from 'react';

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
  return (
    <div className={`md:hidden w-full overflow-x-auto no-scrollbar py-2 px-3.5 flex items-center gap-1.5 border-b border-white/[0.06] bg-black/40 backdrop-blur-md sticky top-0 z-30 ${className}`}>
      {items.map((item) => {
        const isActive = activeTab === item.value;
        const Icon = item.icon;

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap select-none flex-shrink-0 ${
              isActive
                ? 'bg-white text-black font-semibold shadow-sm shadow-white/10'
                : 'bg-white/[0.04] text-white/50 hover:text-white/80 hover:bg-white/[0.08] border border-white/[0.04]'
            }`}
          >
            {Icon && (
              <Icon
                size={14}
                strokeWidth={isActive ? 2.2 : 1.8}
                className={isActive ? 'text-black' : 'text-white/40'}
              />
            )}
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive
                    ? 'bg-black/15 text-black font-bold'
                    : 'bg-white/[0.08] text-white/60'
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
