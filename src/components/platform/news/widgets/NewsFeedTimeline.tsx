'use client';

import React from 'react';
import FeedPost from './FeedPost';
import type { MarketNewsItemDTO } from '@/lib/news/news-service';
import { useTranslation } from '@/lib/i18n';

interface NewsFeedTimelineProps {
  items: MarketNewsItemDTO[];
  isLoading: boolean;
  asOf?: string;
  targetItemId?: string | null;
  onSelectTicker: (ticker: string) => void;
  onBookmarkClick: (feature: string) => void;
  onResetFilters: () => void;
}

export default function NewsFeedTimeline({
  items,
  isLoading,
  asOf,
  targetItemId,
  onSelectTicker,
  onBookmarkClick,
  onResetFilters,
}: NewsFeedTimelineProps) {
  const { locale } = useTranslation();

  if (isLoading && items.length === 0) {
    return (
      <div className="divide-y divide-plt-border-soft font-sans">
        {[1, 2, 3, 4, 5].map((key) => (
          <div key={key} className="p-4 sm:p-5 flex gap-3.5 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-plt-hover shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-28 bg-plt-active rounded-md" />
                <div className="h-3 w-14 bg-plt-hover rounded-md" />
              </div>
              <div className="h-4 w-3/4 bg-plt-hover rounded-md" />
              <div className="h-3 w-full bg-plt-hover rounded-md" />
              <div className="h-3 w-5/6 bg-plt-hover rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-20 px-4 text-center flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 rounded-full bg-plt-hover border border-plt-border flex items-center justify-center text-plt-muted mb-3 text-lg">
          ⚡
        </div>
        <h3 className="text-sm font-bold text-plt-text">
          {locale === 'ar' ? 'لم يتم العثور على منشورات في السوق' : 'No market posts found'}
        </h3>
        <p className="text-xs text-plt-muted mt-1 max-w-sm">
          {locale === 'ar'
            ? 'لا توجد إفصاحات تطابق خيارات التصفية الحالية. جرّب كلمة بحث أخرى أو أعد ضبط التصفية.'
            : 'No filings match your active filters. Try searching a different keyword or resetting your feed.'}
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-4 px-4 py-1.5 rounded-full btn-primary font-semibold text-xs transition-colors cursor-pointer"
        >
          {locale === 'ar' ? 'إعادة ضبط التصفية' : 'Reset Feed Filters'}
        </button>
      </div>
    );
  }

  return (
    <div className="font-sans divide-y divide-plt-border-soft">
      {items.map((item) => (
        <FeedPost
          key={item.id}
          item={item}
          asOf={asOf}
          isTargetItem={Boolean(targetItemId && item.id === targetItemId)}
          onSelectTicker={onSelectTicker}
          onBookmarkClick={onBookmarkClick}
        />
      ))}
    </div>
  );
}
