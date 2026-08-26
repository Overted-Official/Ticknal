'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useMobileNavScroll } from '@/context/MobileNavScrollContext';
import { controlHover, controlTap } from '@/lib/motion';

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
      className={`will-change-nav md:hidden w-full shrink-0 flex items-center gap-1.5 border-b border-plt-border bg-plt-base/95 backdrop-blur-2xl z-30 overflow-x-auto no-scrollbar scroll-smooth transition-all duration-300 ease-out select-none ${
        isNavVisible
          ? 'translate-y-0 opacity-100 max-h-11 h-11 px-3'
          : '-translate-y-full opacity-0 max-h-0 h-0 border-transparent pointer-events-none overflow-hidden'
      } ${className}`}
    >
      {items.map((item) => {
        const isActive = activeTab === item.value;
        const Icon = item.icon;

        return (
          <motion.button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            whileHover={controlHover}
            whileTap={controlTap}
            className={`tab-button shrink-0 select-none ${
              isActive
                ? 'tab-button-active'
                : 'text-plt-muted hover:text-plt-text'
            }`}
          >
            {Icon && (
              <Icon
                size={15}
                strokeWidth={isActive ? 2 : 1.5}
                className={isActive ? 'text-plt-text' : 'text-plt-muted'}
              />
            )}
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={`badge ${
                  isActive
                    ? 'badge-active'
                    : 'badge-muted'
                }`}
              >
                {item.badge}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
