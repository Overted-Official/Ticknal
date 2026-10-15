'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import TicknalBrand from '@/components/ui/TicknalBrand';
import { dismissNativeSplashScreen } from '@/lib/native/capacitor-bridge';
import './app-splash.css';
import { SPLASH_ATTRIBUTE, SPLASH_SESSION_KEY } from './splash-boot-script';

/** Time (ms) until the logo stroke reveal is fully assembled and the wordmark has settled. */
const INTRO_MS = 1050;
const REDUCED_INTRO_MS = 250;

/** Minimum display duration (ms) so the user experiences the smooth brand reveal before dissolving. */
const MIN_SPLASH_TIME = 1350;
const REDUCED_MIN_SPLASH_TIME = 350;

/** Hard ceiling (ms) to exit safely if page signals hang or network errors occur. */
const MAX_FALLBACK_MS = 3800;

/** Must match the .tks-root exit transition in app-splash.css. */
const EXIT_MS = 320;

declare global {
  interface Window {
    __ticknalSplashStart?: number;
    __ticknalAppReady?: boolean;
    __ticknalSignalReady?: () => void;
  }
}

type Phase = 'intro' | 'loading' | 'exit' | 'gone';

/**
 * Animated unified launch splash:
 * 1. Brand streaks shoot in and draw the Ticknal logo mark stroke-by-stroke.
 * 2. Wordmark lands and a glowing halo ring + progress bar activate while background page loads.
 * 3. As soon as the page signals readiness, the progress bar glides to 100% and smoothly
 *    crossfades directly into the populated page — no double loading screens, no empty skeletons.
 */
export default function AppSplash() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [progress, setProgress] = useState<number>(0);
  const finishedRef = useRef(false);

  // Re-apply splash attribute before paint if requested
  useLayoutEffect(() => {
    if (typeof window.__ticknalSplashStart === 'number') {
      document.documentElement.setAttribute(SPLASH_ATTRIBUTE, 'on');
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const startedAt = window.__ticknalSplashStart;
    if (typeof startedAt !== 'number') {
      const raf = requestAnimationFrame(() => setPhase('gone'));
      return () => cancelAnimationFrame(raf);
    }

    // Dismiss static native splash right away
    void dismissNativeSplashScreen(200);

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const introDuration = reduceMotion ? REDUCED_INTRO_MS : INTRO_MS;
    const minDuration = reduceMotion ? REDUCED_MIN_SPLASH_TIME : MIN_SPLASH_TIME;

    let progressInterval: ReturnType<typeof setInterval> | undefined;
    let finishTimeout: ReturnType<typeof setTimeout> | undefined;
    let exitTimeout: ReturnType<typeof setTimeout> | undefined;

    // Transition from intro to loading phase and start advancing progress
    const introTimeout = setTimeout(() => {
      setPhase((prev) => (prev === 'intro' ? 'loading' : prev));
      setProgress((prev) => (prev < 20 ? 20 : prev));

      progressInterval = setInterval(() => {
        if (finishedRef.current) return;
        setProgress((curr) => {
          if (curr < 45) return curr + 5;
          if (curr < 70) return curr + 3;
          if (curr < 88) return curr + 1;
          return curr;
        });
      }, 120);
    }, Math.max(0, startedAt + introDuration - performance.now()));

    // Trigger completion: glide to 100% and crossfade into the page
    const triggerComplete = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;

      if (progressInterval) clearInterval(progressInterval);

      const elapsed = performance.now() - startedAt;
      const waitBeforeFinish = Math.max(0, minDuration - elapsed);

      finishTimeout = setTimeout(() => {
        setProgress(100);

        // Allow user's eye to register 100% before crossfading
        exitTimeout = setTimeout(() => {
          setPhase('exit');

          setTimeout(() => {
            delete window.__ticknalSplashStart;
            root.removeAttribute(SPLASH_ATTRIBUTE);
            try {
              sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
            } catch {
              // Ignore private mode storage restrictions
            }
            setPhase('gone');
          }, EXIT_MS);
        }, 160);
      }, waitBeforeFinish);
    };

    // Listen for readiness signal from the active page view
    const onAppReady = () => {
      triggerComplete();
    };

    window.addEventListener('ticknal:ready', onAppReady, { once: true });

    // In case the page already called signalReady before this effect attached
    if (window.__ticknalAppReady) {
      triggerComplete();
    }

    // Safety fallback: ensure splash always closes even if an error or delay occurs
    const fallbackTimeout = setTimeout(() => {
      triggerComplete();
    }, MAX_FALLBACK_MS);

    return () => {
      clearTimeout(introTimeout);
      clearTimeout(fallbackTimeout);
      if (finishTimeout) clearTimeout(finishTimeout);
      if (exitTimeout) clearTimeout(exitTimeout);
      if (progressInterval) clearInterval(progressInterval);
      window.removeEventListener('ticknal:ready', onAppReady);
    };
  }, []);

  if (phase === 'gone') return null;

  return (
    <div
      className="tks-root"
      data-phase={phase}
      role="status"
      aria-live="polite"
      aria-label="Loading ticknal"
    >
      <div className="tks-stage">
        <div className="tks-logo" aria-hidden="true">
          <div className="tks-aura" />
          <div className="tks-logo-ring" />

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

        <div className="tks-loader" aria-hidden="true">
          <div
            className="tks-loader-fill"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
