/**
 * Development-only procedural 360° smoke scene.
 * This file is a genuine PlayCanvas adapter, but NOT a final puzzle or character asset.
 * It is lazy imported only by the independent lab.html entry.
 */
import type { GameMountContext, GameSession } from '../core/game-contract';

export async function mountPlayCanvasSmoke({
  element,
  signal,
}: GameMountContext): Promise<GameSession> {
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  const canvas = document.createElement('canvas');
  canvas.className = 'engine-canvas';
  canvas.style.touchAction = 'none';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'نموذج تقني تجريبي: اسحب لتدوير المجسم 360 درجة، واستخدم الأسهم للتدوير');
  element.appendChild(canvas);

  let destroyed = false;
  let observer: ResizeObserver | undefined;
  let app: import('playcanvas').AppBase | undefined;
  let graphics: import('playcanvas').GraphicsDevice | undefined;
  let onDown: ((e: PointerEvent) => void) | undefined;
  let onMove: ((e: PointerEvent) => void) | undefined;
  let onUp: ((e: PointerEvent) => void) | undefined;
  let onKey: ((e: KeyboardEvent) => void) | undefined;
  let onAbort: (() => void) | undefined;
  const materials: import('playcanvas').StandardMaterial[] = [];

  const dispose = () => {
    if (destroyed) return;
    destroyed = true;
    observer?.disconnect();
    if (onDown) canvas.removeEventListener('pointerdown', onDown);
    if (onMove) canvas.removeEventListener('pointermove', onMove);
    if (onUp) {
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    }
    if (onKey) canvas.removeEventListener('keydown', onKey);
    if (onAbort) signal.removeEventListener('abort', onAbort);
    if (app) {
      app.destroy(); // Also destroys the rendering device and entity tree.
    } else {
      graphics?.destroy();
    }
    materials.forEach(m => m.destroy());
    canvas.remove();
  };

  try {
    const pc = await import('playcanvas');
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    graphics = await pc.createGraphicsDevice(canvas, {
      deviceTypes: [pc.DEVICETYPE_WEBGPU, pc.DEVICETYPE_WEBGL2],
    });
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');

    const options = new pc.AppOptions();
    options.graphicsDevice = graphics;
    options.componentSystems = [
      pc.RenderComponentSystem,
      pc.CameraComponentSystem,
      pc.LightComponentSystem,
    ];
    options.resourceHandlers = [];
    app = new pc.AppBase(canvas);
    app.init(options);
    app.setCanvasFillMode(pc.FILLMODE_NONE);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);

    const root = new pc.Entity('experimental-object');
    app.root.addChild(root);

    const material = (hex: number): import('playcanvas').StandardMaterial => {
      const m = new pc.StandardMaterial();
      m.diffuse = new pc.Color(
        ((hex >> 16) & 255) / 255,
        ((hex >> 8) & 255) / 255,
        (hex & 255) / 255
      );
      m.update();
      materials.push(m);
      return m;
    };
    const stone = material(0xb2a088), ink = material(0x385b65), gold = material(0xc4a252);
    const mesh = (
      label: string, type: string, x: number, y: number, z: number,
      sx: number, sy: number, sz: number, mat: import('playcanvas').StandardMaterial
    ): void => {
      const part = new pc.Entity(label);
      part.addComponent('render', { type });
      part.setLocalPosition(x, y, z);
      part.setLocalScale(sx, sy, sz);
      if (part.render) part.render.material = mat;
      root.addChild(part);
    };

    // Deliberately simple temporary shapes, never shipped as artwork.
    mesh('base', 'cylinder', 0, -1.08, 0, 2.1, 0.3, 2.1, ink);
    mesh('body', 'cylinder', 0, -0.12, 0, 0.84, 1.68, 0.84, stone);
    mesh('head', 'sphere', 0, 1.04, 0, 0.86, 0.86, 0.86, stone);
    mesh('front-symbol', 'box', 0, 0.12, 0.46, 0.4, 0.4, 0.13, gold);
    mesh('back-symbol', 'box', 0, 0.12, -0.46, 0.27, 0.27, 0.1, ink);
    mesh('left-symbol', 'box', -0.44, -0.23, 0, 0.13, 0.35, 0.35, gold);

    const camera = new pc.Entity('camera');
    camera.addComponent('camera', {
      clearColor: new pc.Color(0.95, 0.94, 0.9),
    });
    camera.setPosition(0, 0.1, 5.2);
    app.root.addChild(camera);

    const light = new pc.Entity('directional-light');
    light.addComponent('light', { type: 'directional', intensity: 1.1 });
    light.setEulerAngles(40, 30, 0);
    app.root.addChild(light);

    let yaw = 0;
    let velocity = 0;
    let paused = false;
    let pointer: number | null = null;
    let pointerX = 0;

    onDown = e => {
      if (pointer !== null) return;
      pointer = e.pointerId;
      pointerX = e.clientX;
      velocity = 0;
      canvas.setPointerCapture?.(e.pointerId);
    };
    onMove = e => {
      if (pointer !== e.pointerId) return;
      const delta = e.clientX - pointerX;
      pointerX = e.clientX;
      yaw = (yaw + delta * 0.65) % 360;
      velocity = delta * 0.35;
      root.setEulerAngles(0, yaw, 0);
    };
    onUp = e => {
      if (pointer !== e.pointerId) return;
      pointer = null;
      if (canvas.hasPointerCapture?.(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };
    onKey = e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home') return;
      e.preventDefault();
      if (e.key === 'Home') yaw = 0;
      else yaw += e.key === 'ArrowLeft' ? -15 : 15;
      velocity = 0;
      root.setEulerAngles(0, yaw, 0);
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('keydown', onKey);
    app.on('update', (dt: number) => {
      if (paused || pointer !== null || Math.abs(velocity) < 0.01) return;
      yaw = (yaw + velocity * dt * 60) % 360;
      velocity *= Math.exp(-10 * dt);
      root.setEulerAngles(0, yaw, 0);
    });

    const resize = (): void => {
      if (destroyed || !app) return;
      const bounds = element.getBoundingClientRect();
      app.resizeCanvas(Math.max(240, Math.round(bounds.width)), Math.max(260, Math.round(bounds.height)));
    };
    observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    app.start();

    onAbort = () => dispose();
    signal.addEventListener('abort', onAbort, { once: true });
    return {
      dispose,
      pause() { paused = true; },
      resume() { paused = false; },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
