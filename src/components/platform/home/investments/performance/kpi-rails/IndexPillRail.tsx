'use client';

import React, { useRef } from 'react';
import { ChevronRight, ChevronLeft } from '@/components/ui/icon-library';
import { useTranslation } from '@/lib/i18n';
import IndexPill, { type IndexPillProps } from './IndexPill';

interface IndexPillRailProps {
  items: IndexPillProps[];
  className?: string;
  emptyMessage?: string;
}

export default function IndexPillRail({
  items,
  className = '',
  emptyMessage,
}: IndexPillRailProps) {
  const { locale } = useTranslation();
  const isRtl = locale === 'ar';
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const distance = 260;
    const scrollAmount = direction === 'right' ? distance : -distance;
    scrollContainerRef.current.scrollBy({
      left: isRtl ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (items.length === 0 && emptyMessage) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-border-subtle bg-surface-raised/40 text-center text-xs text-text-muted font-sans">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between gap-2 relative w-full ${className}`}>
      {/* Scrollable pills rail */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 pt-0.5 no-scrollbar select-none flex-1"
      >
        {items.map((item) => (
          <IndexPill key={item.id} {...item} />
        ))}
      </div>

      {/* Right scroll button (visible on desktop when multiple items exist) */}
      {items.length > 3 && (
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => scroll('left')}
            className="w-7 h-7 rounded-full bg-black hover:bg-surface-raised border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title={locale === 'ar' ? 'السابق' : 'Previous'}
          >
            <ChevronLeft size={14} className={isRtl ? 'rotate-180' : ''} />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            className="w-7 h-7 rounded-full bg-black hover:bg-surface-raised border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title={locale === 'ar' ? 'التالي' : 'Next'}
          >
            <ChevronRight size={14} className={isRtl ? 'rotate-180' : ''} />
          </button>
        </div>
      )}
    </div>
  );
}
