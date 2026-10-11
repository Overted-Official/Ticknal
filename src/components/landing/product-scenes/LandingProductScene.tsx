'use client';

import { useEffect, useRef, useState } from 'react';
import { sceneDelay, type HeroScenePointer } from '../hero-scenes/hero-scene-choreography';
import { runLandingProductScene, type LandingProductSceneId } from './landing-product-scene-choreography';

const SCENES: Record<LandingProductSceneId, { src: string; title: string; viewport: { width: number; height: number } }> = {
  'workflow-discover': { src: '/markets?heroScene=landing', title: 'Ticknal markets, investor flow and heatmap', viewport: { width: 1024, height: 768 } },
  'workflow-validate': { src: '/landing-scenes/strategy?heroScene=landing', title: 'Ticknal strategy builder and backtest', viewport: { width: 1024, height: 768 } },
  'workflow-automate': { src: '/charts?ticker=COMI&timeframe=D&heroScene=landing', title: 'Ticknal chart and automatic trading alerts', viewport: { width: 1024, height: 768 } },
  'broker-setup': { src: '/landing-scenes/strategy?heroScene=landing', title: 'Ticknal strategy setup', viewport: { width: 390, height: 844 } },
  'broker-alerts': { src: '/markets?heroScene=landing', title: 'Ticknal trading notifications', viewport: { width: 390, height: 844 } },
  'broker-handoff': { src: '/markets?heroScene=landing', title: 'Ticknal broker handoff preview', viewport: { width: 390, height: 844 } },
};

export default function LandingProductScene({ scene, active = true, onCycleComplete }: { scene: LandingProductSceneId; active?: boolean; onCycleComplete?: () => void }) {
  const route = SCENES[scene];
  const isPhone = scene.startsWith('broker-');
  const safeTop = isPhone ? 60 : 40;
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const cycleCompleteRef = useRef(onCycleComplete);
  const [inView, setInView] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [phase, setPhase] = useState('loading');
  const [pointer, setPointer] = useState<HeroScenePointer>({ x: 0, y: 0, visible: false, pressed: false });

  useEffect(() => {
    cycleCompleteRef.current = onCycleComplete;
  }, [onCycleComplete]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const syncVisibility = () => {
      const rect = stage.getBoundingClientRect();
      setInView(!document.hidden && rect.width > 0 && rect.height > 0 && rect.bottom > -240 && rect.top < innerHeight + 240);
    };
    const observer = new IntersectionObserver(syncVisibility, {
      rootMargin: '240px 0px', threshold: 0.01,
    });
    observer.observe(stage);
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => setReducedMotion(media.matches);
    syncMotion();
    syncVisibility();
    const visibilityFrame = requestAnimationFrame(syncVisibility);
    media.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', syncVisibility);
    window.addEventListener('scroll', syncVisibility, { passive: true });
    window.addEventListener('resize', syncVisibility);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(visibilityFrame);
      media.removeEventListener('change', syncMotion);
      document.removeEventListener('visibilitychange', syncVisibility);
      window.removeEventListener('scroll', syncVisibility);
      window.removeEventListener('resize', syncVisibility);
    };
  }, []);

  const shouldLoad = active && inView;

  useEffect(() => {
    if (!shouldLoad || reducedMotion) return;
    const iframe = frameRef.current;
    const stage = stageRef.current;
    if (!iframe || !stage) return;
    const controller = new AbortController();
    const { signal } = controller;
    const play = async () => {
      while (!signal.aborted) {
        try {
          await runLandingProductScene({ scene, iframe, stage, signal, onPhase: setPhase, onPointer: setPointer });
          if (cycleCompleteRef.current) {
            cycleCompleteRef.current();
            return;
          }
          setPointer((current) => ({ ...current, visible: false }));
          return;
        } catch (error) {
          if (signal.aborted) break;
          console.warn('Landing product scene reset:', error);
          setPhase('transition');
          await sceneDelay(1000, signal);
          iframe.contentWindow?.location.replace(route.src);
        }
      }
    };
    void play();
    return () => controller.abort();
  }, [shouldLoad, reducedMotion, route.src, scene]);

  return (
    <div
      ref={stageRef}
      data-landing-scene={isPhone ? 'broker' : 'workflow'}
      data-landing-scene-id={scene}
      data-landing-phase={phase}
      className="relative h-full w-full overflow-hidden bg-black"
      style={{ containerType: 'size' }}
    >
      <div className="absolute inset-x-0 bottom-0 overflow-hidden bg-black" style={{ top: `${safeTop / route.viewport.height * 100}%` }}>
        <iframe
          ref={frameRef}
          title={route.title}
          src={shouldLoad ? route.src : undefined}
          loading="eager"
          tabIndex={-1}
          aria-hidden="true"
          className="block border-0 bg-black pointer-events-none"
          style={{
            width: `${route.viewport.width}px`,
            height: `${route.viewport.height - safeTop}px`,
            transform: `scale(calc(100cqw / ${route.viewport.width}px))`,
            transformOrigin: 'top left',
          }}
        />
      </div>
      {!reducedMotion && (
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
        />
      )}
    </div>
  );
}
