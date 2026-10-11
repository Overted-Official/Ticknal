'use client';

import { useEffect, useRef, useState } from 'react';
import { HERO_SCENE_ROUTES } from './hero-scene-routes';
import {
  runHeroSceneCycle,
  sceneDelay,
  type HeroScenePhase,
  type HeroScenePointer,
} from './hero-scene-choreography';

type HeroPlatformSceneProps = {
  scene: keyof typeof HERO_SCENE_ROUTES;
};

function HeroPlatformScene({ scene }: HeroPlatformSceneProps) {
  const route = HERO_SCENE_ROUTES[scene];
  // The hardware status overlay is measured after the iframe scales down.
  const safeTop = scene === 'tablet' ? 40 : 60;
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const needsResetRef = useRef(false);
  const [isBreakpointActive, setIsBreakpointActive] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [phase, setPhase] = useState<HeroScenePhase>('loading');
  const [pointer, setPointer] = useState<HeroScenePointer>({
    x: 0,
    y: 0,
    visible: false,
    pressed: false,
  });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const breakpoint = window.matchMedia(scene === 'tablet' ? '(min-width: 768px)' : '(max-width: 767px)');
    const updateBreakpoint = () => setIsBreakpointActive(breakpoint.matches);
    updateBreakpoint();
    breakpoint.addEventListener('change', updateBreakpoint);

    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting && !document.hidden),
      { threshold: 0.1 },
    );
    const updateVisibility = () => {
      const rect = stage.getBoundingClientRect();
      setIsInView(!document.hidden && rect.height > 0 && rect.top < innerHeight && rect.bottom > 0);
    };
    observer.observe(stage);
    document.addEventListener('visibilitychange', updateVisibility);

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setIsReducedMotion(media.matches);
    updateMotion();
    media.addEventListener('change', updateMotion);

    return () => {
      observer.disconnect();
      breakpoint.removeEventListener('change', updateBreakpoint);
      document.removeEventListener('visibilitychange', updateVisibility);
      media.removeEventListener('change', updateMotion);
    };
  }, [scene]);

  useEffect(() => {
    if (!isBreakpointActive || !isInView) return;

    const iframe = frameRef.current;
    const stage = stageRef.current;
    if (!iframe || !stage) return;

    if (isReducedMotion) {
      if (needsResetRef.current) {
        setPhase('transition');
        iframe.contentWindow?.location.replace(route.src);
        needsResetRef.current = false;
      } else if (iframe.contentDocument?.location.pathname === '/charts'
        && iframe.contentDocument.readyState === 'complete') {
        setPhase('chart');
      }
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const play = async () => {
      if (needsResetRef.current) {
        setPhase('transition');
        iframe.contentWindow?.location.replace(route.src);
        needsResetRef.current = false;
      }

      while (!signal.aborted) {
        try {
          await runHeroSceneCycle({
            scene,
            iframe,
            stage,
            signal,
            onPhase: setPhase,
            onPointer: setPointer,
          });
          setPhase('transition');
          setPointer((current) => ({ ...current, visible: false }));
          await sceneDelay(1100, signal);
          iframe.contentWindow?.location.replace(route.src);
        } catch (error) {
          if (signal.aborted) break;
          console.warn('Hero scene cycle reset:', error);
          setPhase('transition');
          setPointer((current) => ({ ...current, visible: false }));
          await sceneDelay(1000, signal);
          iframe.contentWindow?.location.replace(route.src);
        }
      }
    };

    void play();
    return () => {
      controller.abort();
      needsResetRef.current = true;
    };
  }, [isBreakpointActive, isInView, isReducedMotion, route.src, scene]);

  return (
    <div
      ref={stageRef}
      data-hero-scene-stage={scene}
      data-hero-phase={phase}
      className="relative h-full w-full overflow-hidden"
      style={{ containerType: 'size' }}
    >
      <div
        className="absolute left-0 right-0 bottom-0 overflow-hidden bg-black"
        style={{ top: `${safeTop / route.viewport.height * 100}%` }}
      >
      <iframe
        ref={frameRef}
        data-hero-scene={scene}
        className="block border-0 bg-black pointer-events-none"
        loading="eager"
        src={isBreakpointActive ? route.src : undefined}
        tabIndex={-1}
        onLoad={() => {
          if (isReducedMotion && isBreakpointActive
            && frameRef.current?.contentDocument?.location.pathname === '/charts') {
            setPhase('chart');
          }
        }}
        style={{
          width: `${route.viewport.width}px`,
          height: `${route.viewport.height - safeTop}px`,
          transform: `scale(calc(100cqw / ${route.viewport.width}px))`,
          transformOrigin: 'top left',
        }}
        title={route.title}
      />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 bottom-0 z-10 bg-black transition-opacity duration-300"
        style={{ top: `${safeTop / route.viewport.height * 100}%`, opacity: phase === 'loading' || phase === 'transition' ? 1 : 0 }}
      >
        {/* Captured from the matching first-party COMI chart viewport. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/images/hero-scenes/comi-${scene}.jpg`}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
      </div>
      {!isReducedMotion && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-20 h-4 w-4 rounded-full border-2 border-black bg-white shadow-[0_0_0_1px_rgba(255,255,255,0.8),0_3px_12px_rgba(0,0,0,0.8)]"
          style={{
            left: pointer.x,
            top: pointer.y,
            opacity: pointer.visible ? 1 : 0,
            transform: `translate(-50%, -50%) scale(${pointer.pressed ? 0.72 : 1})`,
            transition: 'left 360ms cubic-bezier(0.2,0,0,1), top 360ms cubic-bezier(0.2,0,0,1), opacity 180ms ease-out, transform 150ms ease-out',
          }}
        >
          <span
            className="absolute inset-[-8px] rounded-full border border-white/75"
            style={{
              opacity: pointer.pressed ? 1 : 0,
              transform: `scale(${pointer.pressed ? 1.45 : 0.65})`,
              transition: 'opacity 180ms ease-out, transform 180ms ease-out',
            }}
          />
        </div>
      )}
    </div>
  );
}

export function HeroIpadScene() {
  return <HeroPlatformScene scene="tablet" />;
}

export function HeroPhoneScene() {
  return <HeroPlatformScene scene="phone" />;
}
