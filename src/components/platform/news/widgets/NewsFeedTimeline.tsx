'use client';

import React from 'react';
import FeedPost from './FeedPost';
import type { MarketNewsItemDTO } from '@/lib/news/news-service';
import { useTranslation } from '@/lib/i18n';

interface NewsFeedTimelineProps {
  items: MarketNewsItemDTO[];
  isLoading: boolean;
  onSelectTicker: (ticker: string) => void;
  onBookmarkClick: (feature: string) => void;
  onResetFilters: () => void;
}

export default function NewsFeedTimeline({
  items,
  isLoading,
  onSelectTicker,
  onBookmarkClick,
  onResetFilters,
}: NewsFeedTimelineProps) {
  const { locale } = useTranslation();

  if (isLoading && items.length === 0) {
    return (
      <div className="divide-y divide-white/[0.06] font-sans">
        {[1, 2, 3, 4, 5].map((key) => (
          <div key={key} className="p-4 flex gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-white/[0.06] shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-28 bg-white/[0.08] rounded-md" />
                <div className="h-3 w-14 bg-white/[0.04] rounded-md" />
              </div>
              <div className="h-4 w-3/4 bg-white/[0.06] rounded-md" />
              <div className="h-3 w-full bg-white/[0.04] rounded-md" />
              <div className="h-3 w-5/6 bg-white/[0.04] rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-20 px-4 text-center flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-400 mb-3 text-lg">
          ⚡
        </div>
        <h3 className="text-sm font-bold text-white">
          {locale === 'ar' ? 'لم يتم العثور على منشورات في السوق' : 'No market posts found'}
        </h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm">
          {locale === 'ar'
            ? 'لا توجد إفصاحات تطابق خيارات التصفية الحالية. جرّب كلمة بحث أخرى أو أعد ضبط التصفية.'
            : 'No filings match your active filters. Try searching a different keyword or resetting your feed.'}
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-4 px-4 py-1.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors cursor-pointer"
        >
          {locale === 'ar' ? 'إعادة ضبط التصفية' : 'Reset Feed Filters'}
        </button>
      </div>
    );
  }

  return (
    <div className="font-sans divide-y divide-white/[0.06]">
      {items.map((item) => (
        <FeedPost
          key={item.id}
          item={item}
          onSelectTicker={onSelectTicker}
          onBookmarkClick={onBookmarkClick}
        />
      ))}
    </div>
  );
}

