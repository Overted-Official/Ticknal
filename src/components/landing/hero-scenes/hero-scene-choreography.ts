export type HeroScenePhase =
  | 'loading'
  | 'chart'
  | 'alerts'
  | 'markets'
  | 'fx'
  | 'rotation'
  | 'heatmap'
  | 'news'
  | 'transition';

export type HeroScenePointer = {
  x: number;
  y: number;
  visible: boolean;
  pressed: boolean;
};

type SceneControls = {
  scene: 'tablet' | 'phone';
  iframe: HTMLIFrameElement;
  stage: HTMLElement;
  signal: AbortSignal;
  onPhase: (phase: HeroScenePhase) => void;
  onPointer: (pointer: HeroScenePointer) => void;
};

function assertRunning(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException('Hero scene stopped', 'AbortError');
}

export function sceneDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Hero scene stopped', 'AbortError'));
      return;
    }

    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException('Hero scene stopped', 'AbortError'));
    };
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function frameDocument(iframe: HTMLIFrameElement): Document | null {
  try {
    return iframe.contentDocument;
  } catch {
    return null;
  }
}

function isVisible(element: Element): element is HTMLElement {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

async function waitForElement(
  iframe: HTMLIFrameElement,
  selector: string,
  signal: AbortSignal,
  pathname?: string,
): Promise<HTMLElement> {
  const deadline = performance.now() + 30_000;

  while (performance.now() < deadline) {
    assertRunning(signal);
    const doc = frameDocument(iframe);
    if (doc && (!pathname || doc.location.pathname === pathname)) {
      const found = Array.from(doc.querySelectorAll(selector)).find(isVisible);
      if (found) return found;
    }
    await sceneDelay(120, signal);
  }

  throw new Error(`Hero scene element unavailable: ${selector}`);
}

function positionInStage(
  iframe: HTMLIFrameElement,
  stage: HTMLElement,
  element: HTMLElement,
): { x: number; y: number } {
  const frameRect = iframe.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const targetRect = element.getBoundingClientRect();
  const scaleX = frameRect.width / iframe.offsetWidth;
  const scaleY = frameRect.height / iframe.offsetHeight;

  return {
    x: frameRect.left - stageRect.left + (targetRect.left + targetRect.width / 2) * scaleX,
    y: frameRect.top - stageRect.top + (targetRect.top + targetRect.height / 2) * scaleY,
  };
}

export function scrollDurationForDistance(distance: number): number {
  return Math.min(9000, Math.max(900, Math.abs(distance) / 0.28));
}

async function scrollElementIntoView(container: HTMLElement, section: HTMLElement, signal: AbortSignal) {
  const containerRect = container.getBoundingClientRect();
  const sectionRect = section.getBoundingClientRect();
  const start = container.scrollTop;
  const maxScroll = container.scrollHeight - container.clientHeight;
  const destination = Math.min(
    maxScroll,
    Math.max(0, start + sectionRect.top - containerRect.top - 64),
  );

  await new Promise<void>((resolve, reject) => {
    let frame = 0;
    const startedAt = performance.now();
    const duration = scrollDurationForDistance(destination - start);
    const onAbort = () => {
      cancelAnimationFrame(frame);
      reject(new DOMException('Hero scene stopped', 'AbortError'));
    };
    signal.addEventListener('abort', onAbort, { once: true });

    const tick = (now: number) => {
      if (signal.aborted) return;
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      container.scrollTop = start + (destination - start) * eased;

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        signal.removeEventListener('abort', onAbort);
        resolve();
      }
    };
    frame = requestAnimationFrame(tick);
  });
}

async function scrollToSection(iframe: HTMLIFrameElement, sectionId: string, signal: AbortSignal) {
  const section = await waitForElement(iframe, `#${sectionId}`, signal, '/markets');
  const container = frameDocument(iframe)?.querySelector<HTMLElement>('.command-surface-page');
  if (!container) throw new Error('Markets scroll container unavailable');
  await scrollElementIntoView(container, section, signal);
}

async function scrollNewsPost(iframe: HTMLIFrameElement, index: number, signal: AbortSignal) {
  const post = await waitForElement(iframe, `[aria-label="Market Social Feed"] article:nth-of-type(${index})`, signal, '/news');
  const doc = frameDocument(iframe);
  const feed = doc?.querySelector<HTMLElement>('[aria-label="Market Social Feed"]');
  const page = doc?.querySelector<HTMLElement>('.command-surface-page');
  const feedOverflow = feed ? getComputedStyle(feed).overflowY : 'visible';
  const container = feed && (feedOverflow === 'auto' || feedOverflow === 'scroll')
    && feed.scrollHeight > feed.clientHeight + 10 ? feed : page;
  if (!container) throw new Error('News scroll container unavailable');
  await scrollElementIntoView(container, post, signal);
}

export async function runHeroSceneCycle({
  scene,
  iframe,
  stage,
  signal,
  onPhase,
  onPointer,
}: SceneControls): Promise<void> {
  let pointer: HeroScenePointer = {
    x: stage.clientWidth * 0.48,
    y: stage.clientHeight * 0.52,
    visible: false,
    pressed: false,
  };
  onPointer(pointer);

  const moveAndClick = async (element: HTMLElement) => {
    const destination = positionInStage(iframe, stage, element);
    const distance = Math.hypot(destination.x - pointer.x, destination.y - pointer.y);

    if (distance > stage.clientHeight / 3) {
      pointer = {
        ...pointer,
        x: (pointer.x + destination.x) / 2,
        y: (pointer.y + destination.y) / 2,
        visible: true,
      };
      onPointer(pointer);
      await sceneDelay(360, signal);
    }

    pointer = { ...pointer, ...destination, visible: true, pressed: false };
    onPointer(pointer);
    await sceneDelay(480, signal);
    pointer = { ...pointer, pressed: true };
    onPointer(pointer);
    element.click();
    await sceneDelay(180, signal);
    pointer = { ...pointer, pressed: false };
    onPointer(pointer);
  };

  const openAlerts = async (pathname: '/charts' | '/markets') => {
    const bell = await waitForElement(
      iframe,
      '[data-hero-action="alerts"][data-hero-scene-ready="true"]',
      signal,
      pathname,
    );
    await moveAndClick(bell);

    const drawer = await waitForElement(iframe, '[data-hero-drawer="alerts"]', signal, pathname);
    await waitForElement(iframe, '[data-hero-drawer="alerts"] button', signal, pathname);
    onPhase('alerts');
    await sceneDelay(3100, signal);

    const closeButton = drawer.querySelector<HTMLElement>('[data-hero-action="close-alerts"]');
    if (!closeButton) throw new Error('Alerts close control unavailable');
    await moveAndClick(closeButton);
    await sceneDelay(350, signal);
  };

  const openMarkets = async () => {
    const marketsLink = await waitForElement(
      iframe,
      'a[data-hero-action="markets"][href*="heroScene=landing"]',
      signal,
      '/charts',
    );
    await moveAndClick(marketsLink);
    onPhase('transition');
    await waitForElement(iframe, '#market-overview', signal, '/markets');
    await waitForElement(iframe, '#major-indices .recharts-area-area', signal, '/markets');
    onPhase('markets');
    await sceneDelay(scene === 'phone' ? 1050 : 1650, signal);
  };

  await waitForElement(
    iframe,
    'a[data-hero-action="markets"][href*="heroScene=landing"]',
    signal,
    '/charts',
  );
  onPhase('chart');
  await sceneDelay(1700, signal);
  if (scene === 'tablet') {
    await openAlerts('/charts');
    await openMarkets();
  } else {
    await openMarkets();
    await openAlerts('/markets');
  }

  pointer = { ...pointer, visible: false };
  onPointer(pointer);

  const sections = [
    { id: 'fx-devaluation', phase: 'fx' },
    { id: 'sector-rotation', phase: 'rotation' },
    { id: 'market-heatmap', phase: 'heatmap' },
  ] as const;

  for (const section of sections) {
    await scrollToSection(iframe, section.id, signal);
    onPhase(section.phase);
    await sceneDelay(2300, signal);
  }

  const newsLink = await waitForElement(
    iframe,
    'a[data-hero-action="news"][href*="heroScene=landing"]',
    signal,
    '/markets',
  );
  await moveAndClick(newsLink);
  onPhase('transition');
  await waitForElement(iframe, '[aria-label="Market Social Feed"] article', signal, '/news');
  onPhase('news');
  await sceneDelay(2600, signal);
  pointer = { ...pointer, visible: false };
  onPointer(pointer);
  for (const index of [3, 5, 7]) {
    await scrollNewsPost(iframe, index, signal);
    await sceneDelay(2400, signal);
  }
}
