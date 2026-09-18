'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

interface MobileNavScrollContextType {
  isNavVisible: boolean;
  setIsNavVisible: (visible: boolean) => void;
}

const MobileNavScrollContext = createContext<MobileNavScrollContextType>({
  isNavVisible: true,
  setIsNavVisible: () => {},
});

/**
 * Global Scroll Detection Provider for Mobile Navigation Bars
 * Captures scroll events on any scrollable container (window or nested overflow-y-auto divs)
 * and seamlessly shows/hides top rails and bottom nav bars.
 */
export function MobileNavScrollProvider({ children }: { children: React.ReactNode }) {
  const [isNavVisible, setIsNavVisible] = useState(true);
  const isNavVisibleRef = useRef(true);
  const lastScrollTopMap = useRef<WeakMap<EventTarget, number>>(new WeakMap());
  const globalLastScrollY = useRef<number | null>(null);
  const lastToggleTimeRef = useRef<number>(0);

  // Keep ref synchronized with state for synchronous guard checks
  useEffect(() => {
    isNavVisibleRef.current = isNavVisible;
  }, [isNavVisible]);

  useEffect(() => {
    let ticking = false;

    const handleScroll = (e: Event) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const target = e.target as HTMLElement | Document | Window | null;
          if (!target) {
            ticking = false;
            return;
          }

          let currentScrollTop = 0;
          let lastScrollTop: number | null = null;
          let scrollHeight = 0;
          let clientHeight = 0;

          if (target instanceof HTMLElement) {
            scrollHeight = target.scrollHeight;
            clientHeight = target.clientHeight;
            currentScrollTop = target.scrollTop;
            lastScrollTop = lastScrollTopMap.current.has(target)
              ? (lastScrollTopMap.current.get(target) ?? 0)
              : null;
          } else {
            scrollHeight =
              document.documentElement.scrollHeight || document.body.scrollHeight || 0;
            clientHeight = window.innerHeight || document.documentElement.clientHeight || 0;
            currentScrollTop = window.scrollY || document.documentElement.scrollTop || 0;
            lastScrollTop = globalLastScrollY.current;
          }

          const maxScrollTop = Math.max(0, scrollHeight - clientHeight);

          // 1. Ignore elements without substantial vertical scrollable range
          // (e.g., horizontal sliders, tab bars, non-scrolling containers)
          if (maxScrollTop <= 15) {
            ticking = false;
            return;
          }

          // 2. First-time observation of this container: prime baseline and return
          if (lastScrollTop === null) {
            if (target instanceof HTMLElement) {
              lastScrollTopMap.current.set(target, currentScrollTop);
            } else {
              globalLastScrollY.current = currentScrollTop;
            }
            ticking = false;
            return;
          }

          // Update recorded scroll position
          if (target instanceof HTMLElement) {
            lastScrollTopMap.current.set(target, currentScrollTop);
          } else {
            globalLastScrollY.current = currentScrollTop;
          }

          const diff = currentScrollTop - lastScrollTop;
          const now = Date.now();

          // 3. Always reveal navigation bars when near the top of the container
          if (currentScrollTop <= 24) {
            if (!isNavVisibleRef.current) {
              isNavVisibleRef.current = true;
              setIsNavVisible(true);
              lastToggleTimeRef.current = now;
            }
            ticking = false;
            return;
          }

          // 4. Require meaningful scroll delta (ignore micro-jitter < 8px)
          if (Math.abs(diff) < 8) {
            ticking = false;
            return;
          }

          // 5. Detect if we are near or at the end of the page (bottom boundary)
          // On mobile, reaching the bottom triggers rubber-band/overscroll bounce
          // and layout shift clamping, which produces negative deltas.
          // We MUST NOT reveal navigation bars in this zone.
          const isNearBottom = currentScrollTop >= maxScrollTop - 32;

          // Rate-limiting toggle changes to prevent high-frequency jitter
          const isCoolingDown = now - lastToggleTimeRef.current < 250;

          if (diff > 8) {
            // Scrolling down -> gracefully hide navigation bars
            if (isNavVisibleRef.current && !isCoolingDown) {
              isNavVisibleRef.current = false;
              setIsNavVisible(false);
              lastToggleTimeRef.current = now;
            }
          } else if (diff < -8) {
            // Scrolling up: ONLY reveal if the user has intentionally scrolled
            // away from the bottom boundary (not an overscroll bounce or bottom clamp)
            if (!isNavVisibleRef.current && !isNearBottom && !isCoolingDown) {
              isNavVisibleRef.current = true;
              setIsNavVisible(true);
              lastToggleTimeRef.current = now;
            }
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    // Capture phase event listener catches scroll on all nested overflow-y-auto elements
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, []);

  return (
    <MobileNavScrollContext.Provider value={{ isNavVisible, setIsNavVisible }}>
      {children}
    </MobileNavScrollContext.Provider>
  );
}

export function useMobileNavScroll() {
  return useContext(MobileNavScrollContext);
}
