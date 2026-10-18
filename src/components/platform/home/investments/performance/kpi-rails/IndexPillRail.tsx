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
      <div className="p-4 rounded-xl border border-dashed border-plt-border bg-plt-base/40 text-center text-xs text-plt-muted font-sans">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between gap-3 relative w-full ${className}`}>
      {/* Scrollable pills rail */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-2 sm:gap-4 overflow-x-auto pb-2 pt-1 no-scrollbar select-none flex-1"
      >
        {items.map((item) => (
          <IndexPill key={item.id} {...item} />
        ))}
      </div>

      {/* Right Carousel Scroll Arrow Button (1-to-1 with Major Indices) */}
      {items.length > 3 && (
        <button
          type="button"
          onClick={() => scroll('right')}
          className="w-8 h-8 rounded-full bg-black hover:bg-surface-raised border border-white/5 flex items-center justify-center text-neutral-400 hover:text-white transition-colors shrink-0 cursor-pointer mb-1"
          title={locale === 'ar' ? 'التالي' : 'Next'}
        >
          <ChevronRight size={16} className={isRtl ? 'rotate-180' : ''} />
        </button>
      )}
    </div>
  );
}
