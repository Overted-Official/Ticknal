'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import TicknalBrand from '@/components/ui/TicknalBrand';
import { dismissNativeSplashScreen } from '@/lib/native/capacitor-bridge';
import './app-splash.css';
import { SPLASH_ATTRIBUTE, SPLASH_SESSION_KEY } from './splash-boot-script';

/** Time (from first paint) until the logo is fully assembled and the wordmark has landed. */
const INTRO_MS = 850;
const REDUCED_INTRO_MS = 250;
/** Must match the .tks-root exit transition in app-splash.css. */
const EXIT_MS = 240;

declare global {
  interface Window {
    __ticknalSplashStart?: number;
  }
}

type Phase = 'intro' | 'exit' | 'gone';

/**
 * Animated launch splash: three brand-coloured light streaks shoot in from the left,
 * right and bottom edges of the screen and are absorbed into the ticknal mark,
 * which draws itself on stroke-by-stroke.
 *
 * Server-rendered (hidden by default) so the CSS animation starts at first paint.
 * Visibility is controlled by the boot script via html[data-ticknal-splash="on"].
 */
export default function AppSplash() {
  const [phase, setPhase] = useState<Phase>('intro');

  // The boot script records its decision on window. In development, Strict Mode's remount
  // resets <html> to its JSX attributes, so re-apply ours before paint (no-op in production).
  useLayoutEffect(() => {
    if (typeof window.__ticknalSplashStart === 'number') {
      document.documentElement.setAttribute(SPLASH_ATTRIBUTE, 'on');
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const startedAt = window.__ticknalSplashStart;
    if (typeof startedAt !== 'number') {
      // Splash not requested for this load: unmount the hidden markup.
      const raf = requestAnimationFrame(() => setPhase('gone'));
      return () => cancelAnimationFrame(raf);
    }

    // Safety net: if the boot script could not reach the native plugin, hide it now.
    void dismissNativeSplashScreen(200);

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const intro = reduceMotion ? REDUCED_INTRO_MS : INTRO_MS;
    const remaining = Math.max(0, startedAt + intro - performance.now());

    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    const introTimer = setTimeout(() => {
      setPhase('exit');
      exitTimer = setTimeout(() => {
        delete window.__ticknalSplashStart;
        root.removeAttribute(SPLASH_ATTRIBUTE);
        try {
          sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
        } catch {
          // Storage can be unavailable (private mode); the splash simply may replay.
        }
        setPhase('gone');
      }, EXIT_MS);
    }, remaining);

    return () => {
      clearTimeout(introTimer);
      if (exitTimer) clearTimeout(exitTimer);
    };
  }, []);

  if (phase === 'gone') return null;

  return (
    <div className="tks-root" data-phase={phase} role="status" aria-live="polite" aria-label="Loading ticknal">
      <div className="tks-stage">
        <div className="tks-logo" aria-hidden="true">
          <div className="tks-aura" />

          <div className="tks-streak tks-streak--left">
            <span />
          </div>
          <div className="tks-streak tks-streak--right">
            <span />
          </div>
          <div className="tks-streak tks-streak--bottom">
            <span />
          </div>

          <svg className="tks-logo-svg" viewBox="5 6 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <mask id="tks-logo-mask" maskUnits="userSpaceOnUse" x="-10" y="-10" width="84" height="84">
                {/* Arms reveal as flat bars up to where the curve begins; the rising stem fills the joint last. */}
                <path className="tks-mask-stroke tks-mask-stroke--left" pathLength={60} d="M5 27H22" />
                <path className="tks-mask-stroke tks-mask-stroke--right" pathLength={60} d="M59 15H37" />
                <path className="tks-mask-stroke tks-mask-stroke--stem" pathLength={60} d="M32.5 61V8" />
                <rect x="-10" y="-10" width="84" height="84" fill="#FFFFFF" className="tks-mask-fill" />
              </mask>
            </defs>
            <path
              mask="url(#tks-logo-mask)"
              fill="#FFFFFF"
              d="M6 22H21C29 22 28 10 37 10H58V20H48.5A11 11 0 0 0 37.5 31V56H27.5V42A10 10 0 0 0 17.5 32H6Z"
            />
          </svg>
        </div>

        <div className="tks-wordmark" aria-hidden="true">
          <TicknalBrand href={null} showIcon={false} showText size="lg" className="text-white" />
        </div>
      </div>
    </div>
  );
}
