import { useRef, useCallback } from 'react';

interface UseSwipeableTabsOptions<T extends string> {
  tabs: readonly T[] | T[];
  activeTab: T;
  onTabChange: (newTab: T) => void;
  minSwipeDistance?: number;
  maxVerticalRatio?: number;
}

/**
 * Reusable touch swipe gesture hook to switch tabs on mobile screens seamlessly.
 * Ensures vertical scrolling is completely uninhibited and ignores interactive elements.
 */
export function useSwipeableTabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  minSwipeDistance = 45,
  maxVerticalRatio = 0.75,
}: UseSwipeableTabsOptions<T>) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isEligibleSwipe = useRef<boolean>(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Only track single touch points
    if (e.touches.length !== 1) {
      touchStartX.current = null;
      touchStartY.current = null;
      isEligibleSwipe.current = false;
      return;
    }

    const target = e.target as HTMLElement | null;
    if (target) {
      // Ignore swipes on buttons, inputs, sliders, chart canvas, or explicitly marked no-swipe areas
      const isInteractive = target.closest(
        'input, textarea, select, button, [role="button"], [role="slider"], .no-swipe, canvas, [data-no-swipe="true"]'
      );
      if (isInteractive) {
        touchStartX.current = null;
        touchStartY.current = null;
        isEligibleSwipe.current = false;
        return;
      }
    }

    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isEligibleSwipe.current = true;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isEligibleSwipe.current || touchStartX.current === null || touchStartY.current === null) {
      return;
    }

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX.current;
    const diffY = currentY - touchStartY.current;

    // If vertical movement dominates, cancel swipe eligibility so native scroll is smooth and fast
    if (Math.abs(diffY) > Math.abs(diffX) * maxVerticalRatio && Math.abs(diffY) > 20) {
      isEligibleSwipe.current = false;
    }
  }, [maxVerticalRatio]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isEligibleSwipe.current || touchStartX.current === null || touchStartY.current === null) {
      touchStartX.current = null;
      touchStartY.current = null;
      isEligibleSwipe.current = false;
      return;
    }

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartX.current;
    const diffY = touchEndY - touchStartY.current;

    touchStartX.current = null;
    touchStartY.current = null;
    isEligibleSwipe.current = false;

    // Check if horizontal distance is sufficient and dominant over vertical
    if (Math.abs(diffX) >= minSwipeDistance && Math.abs(diffX) > Math.abs(diffY) * 1.2) {
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex === -1) return;

      if (diffX < 0) {
        // Swiped Left -> Go to Next Tab
        if (currentIndex < tabs.length - 1) {
          onTabChange(tabs[currentIndex + 1]);
        }
      } else {
        // Swiped Right -> Go to Previous Tab
        if (currentIndex > 0) {
          onTabChange(tabs[currentIndex - 1]);
        }
      }
    }
  }, [activeTab, minSwipeDistance, onTabChange, tabs]);

  return {
    swipeHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}
