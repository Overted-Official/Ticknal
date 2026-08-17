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
  const lastScrollTopMap = useRef<WeakMap<EventTarget, number>>(new WeakMap());
  const globalLastScrollY = useRef(0);

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
          let lastScrollTop = 0;

          if (target instanceof HTMLElement) {
            currentScrollTop = target.scrollTop;
            lastScrollTop = lastScrollTopMap.current.get(target) ?? 0;
            lastScrollTopMap.current.set(target, currentScrollTop);
          } else {
            currentScrollTop = window.scrollY || document.documentElement.scrollTop || 0;
            lastScrollTop = globalLastScrollY.current;
            globalLastScrollY.current = currentScrollTop;
          }

          const diff = currentScrollTop - lastScrollTop;

          // Always reveal bars when near the top of the container
          if (currentScrollTop <= 20) {
            setIsNavVisible(true);
          } else if (diff > 6) {
            // Scrolling down -> cleanly hide navigation bars
            setIsNavVisible(false);
          } else if (diff < -6) {
            // Scrolling up -> cleanly reveal navigation bars
            setIsNavVisible(true);
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
