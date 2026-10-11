import { sceneDelay, type HeroScenePointer } from '../hero-scenes/hero-scene-choreography';

export type LandingProductSceneId =
  | 'workflow-discover'
  | 'workflow-validate'
  | 'workflow-automate'
  | 'broker-setup'
  | 'broker-alerts'
  | 'broker-handoff';

type SceneControls = {
  scene: LandingProductSceneId;
  iframe: HTMLIFrameElement;
  stage: HTMLElement;
  signal: AbortSignal;
  onPhase: (phase: string) => void;
  onPointer: (pointer: HeroScenePointer) => void;
};

function frameDocument(iframe: HTMLIFrameElement): Document | null {
  try { return iframe.contentDocument; } catch { return null; }
}

async function waitForElement(
  iframe: HTMLIFrameElement,
  selector: string,
  signal: AbortSignal,
  pathname: string,
): Promise<HTMLElement> {
  const deadline = performance.now() + 30_000;
  while (performance.now() < deadline) {
    if (signal.aborted) throw new DOMException('Scene stopped', 'AbortError');
    const doc = frameDocument(iframe);
    if (doc?.location.pathname === pathname) {
      const element = Array.from(doc.querySelectorAll<HTMLElement>(selector)).find((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      if (element) return element;
    }
    await sceneDelay(120, signal);
  }
  throw new Error(`Landing product scene element unavailable: ${selector}`);
}

async function scrollToElement(container: HTMLElement, target: HTMLElement, signal: AbortSignal) {
  const start = container.scrollTop;
  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const max = container.scrollHeight - container.clientHeight;
  const destination = Math.max(0, Math.min(max, start + targetRect.top - containerRect.top - 54));
  const distance = destination - start;
  const duration = Math.min(8000, Math.max(1800, Math.abs(distance) / 0.21));
  if (Math.abs(distance) < 12) return;

  await new Promise<void>((resolve, reject) => {
    const started = performance.now();
    let frame = 0;
    const abort = () => {
      cancelAnimationFrame(frame);
      reject(new DOMException('Scene stopped', 'AbortError'));
    };
    signal.addEventListener('abort', abort, { once: true });
    const tick = (now: number) => {
      if (signal.aborted) return;
      const progress = Math.min(1, (now - started) / duration);
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      container.scrollTop = start + distance * eased;
      if (progress < 1) frame = requestAnimationFrame(tick);
      else {
        signal.removeEventListener('abort', abort);
        resolve();
      }
    };
    frame = requestAnimationFrame(tick);
  });
}

export async function runLandingProductScene({
  scene, iframe, stage, signal, onPhase, onPointer,
}: SceneControls): Promise<void> {
  let pointer: HeroScenePointer = {
    x: stage.clientWidth * 0.48,
    y: stage.clientHeight * 0.5,
    visible: false,
    pressed: false,
  };
  onPointer(pointer);

  const moveAndClick = async (element: HTMLElement) => {
    const frameRect = iframe.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const targetRect = element.getBoundingClientRect();
    const x = frameRect.left - stageRect.left + (targetRect.left + targetRect.width / 2) * frameRect.width / iframe.offsetWidth;
    const y = frameRect.top - stageRect.top + (targetRect.top + targetRect.height / 2) * frameRect.height / iframe.offsetHeight;
    pointer = { ...pointer, x, y, visible: true, pressed: false };
    onPointer(pointer);
    await sceneDelay(540, signal);
    pointer = { ...pointer, pressed: true };
    onPointer(pointer);
    element.click();
    await sceneDelay(170, signal);
    pointer = { ...pointer, pressed: false };
    onPointer(pointer);
  };

  const openAlerts = async () => {
    const pathname = scene.startsWith('broker-') ? '/markets' : '/charts';
    const bell = await waitForElement(iframe, '[data-hero-action="alerts"][data-hero-scene-ready="true"]', signal, pathname);
    onPhase(pathname === '/markets' ? 'market' : 'chart');
    await sceneDelay(1800, signal);
    await moveAndClick(bell);
    const drawer = await waitForElement(iframe, '[data-hero-drawer="alerts"]', signal, pathname);
    onPhase('alerts');
    await sceneDelay(2400, signal);
    return drawer;
  };

  if (scene === 'workflow-discover') {
    await waitForElement(iframe, '#market-overview', signal, '/markets');
    onPhase('overview');
    await sceneDelay(2200, signal);
    const page = frameDocument(iframe)?.querySelector<HTMLElement>('.command-surface-page');
    if (!page) throw new Error('Markets scroll surface unavailable');
    const flows = await waitForElement(iframe, '#investor-flows', signal, '/markets');
    pointer = { ...pointer, visible: false }; onPointer(pointer);
    await scrollToElement(page, flows, signal);
    onPhase('flows');
    await sceneDelay(3000, signal);
    const heatmap = await waitForElement(iframe, '#market-heatmap', signal, '/markets');
    await scrollToElement(page, heatmap, signal);
    onPhase('heatmap');
    await sceneDelay(3300, signal);
    return;
  }

  if (scene === 'workflow-validate' || scene === 'broker-setup') {
    const studio = await waitForElement(iframe, '[aria-label="Strategy Studio"]', signal, '/landing-scenes/strategy');
    onPhase('build');
    await sceneDelay(1900, signal);
    const advanced = await waitForElement(iframe, '[aria-label="Strategy builder type"] [role="tab"]:last-child', signal, '/landing-scenes/strategy');
    await moveAndClick(advanced);
    onPhase('rules');
    await sceneDelay(2300, signal);
    pointer = { ...pointer, visible: false }; onPointer(pointer);
    const body = studio.querySelector<HTMLElement>('.custom-scrollbar');
    if (body) await scrollToElement(body, body.lastElementChild as HTMLElement ?? body, signal);
    await sceneDelay(1600, signal);
    if (scene === 'workflow-validate') {
      const market = await waitForElement(iframe, '[aria-label="Results view mode"] [role="tab"]:first-child', signal, '/landing-scenes/strategy');
      const companies = await waitForElement(iframe, '[aria-label="Results view mode"] [role="tab"]:last-child', signal, '/landing-scenes/strategy');
      await moveAndClick(companies);
      onPhase('visualize');
      await sceneDelay(2200, signal);
      await moveAndClick(market);
      onPhase('backtest');
      await sceneDelay(2800, signal);
    }
    return;
  }

  const drawer = await openAlerts();
  if (scene === 'broker-alerts') {
    const list = drawer.querySelector<HTMLElement>('.custom-scrollbar');
    if (list) {
      const last = list.querySelector<HTMLElement>('div.group:last-child');
      if (last) await scrollToElement(list, last, signal);
    }
    onPhase('signals');
    await sceneDelay(2500, signal);
    return;
  }
  if (scene === 'broker-handoff') {
    const buy = await waitForElement(iframe, '[data-hero-drawer="alerts"] button.bg-profit-chart', signal, '/markets');
    await moveAndClick(buy);
    await waitForElement(iframe, '[data-landing-preview-order="true"]', signal, '/markets');
    onPhase('handoff');
    await sceneDelay(4200, signal);
    return;
  }
  onPhase('signals');
  await sceneDelay(3200, signal);
}
