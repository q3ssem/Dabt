/**
 * Development-only 2D scene to verify the PixiJS adapter is dynamically imported.
 * No user puzzle, visual asset or player save data here.
 */
import type { GameMountContext, GameSession } from '../core/game-contract';

export async function mountPixiSmoke({ element, signal }: GameMountContext): Promise<GameSession> {
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  const { Application, Container, Graphics } = await import('pixi.js');
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  const app = new Application();
  let initialized = false;
  let disposed = false;
  let observer: ResizeObserver | undefined;
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    observer?.disconnect();
    if (initialized) app.destroy(true, { children: true });
  };
  try {
    const rect = element.getBoundingClientRect();
    await app.init({
      width: Math.max(240, Math.round(rect.width)),
      height: Math.max(260, Math.round(rect.height)),
      resolution: Math.min(1.5, window.devicePixelRatio || 1),
      background: 0xf5f0e6,
      antialias: true,
      autoDensity: true,
      preference: 'webgl',
    });
    initialized = true;
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    app.canvas.className = 'engine-canvas';
    element.appendChild(app.canvas);
    const composition = new Container();
    const ring = new Graphics().circle(0, 0, 93).stroke({ width: 11, color: 0x446c73 });
    const diamond = new Graphics()
      .poly([-45, 0, 0, -65, 45, 0, 0, 65])
      .fill(0xd2ad62);
    composition.addChild(ring, diamond);
    app.stage.addChild(composition);
    app.ticker.add(tick => {
      composition.rotation += tick.deltaTime * 0.008;
    });
    const resize = (): void => {
      if (disposed) return;
      const box = element.getBoundingClientRect();
      const w = Math.max(240, Math.round(box.width));
      const h = Math.max(260, Math.round(box.height));
      app.renderer.resize(w, h);
      composition.position.set(w / 2, h / 2);
    };
    observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    const onAbort = () => dispose();
    signal.addEventListener('abort', onAbort, { once: true });
    return {
      dispose() {
        signal.removeEventListener('abort', onAbort);
        dispose();
      },
      pause() { app.ticker.stop(); },
      resume() { if (!disposed) app.ticker.start(); },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
