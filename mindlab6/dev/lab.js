// Separate, manually visited research harness. Not imported from index.html.
import { GameRegistry } from '../src/core/game-registry.js';
import { GameHost } from '../src/core/game-host.js';

const registry = new GameRegistry();
registry.register({
  id: 'engine-3d-smoke',
  renderer: '3d',
  load: async () => {
    const { mountPlayCanvasSmoke } = await import('../src/engines/playcanvas-driver.ts');
    return { mount: mountPlayCanvasSmoke };
  },
});
registry.register({
  id: 'engine-2d-smoke',
  renderer: '2d',
  load: async () => {
    const { mountPixiSmoke } = await import('../src/engines/pixi-driver.ts');
    return { mount: mountPixiSmoke };
  },
});
const status = document.getElementById('lab-status');
const host = new GameHost({
  registry,
  element: document.getElementById('game-container'),
  onError: error => {
    console.error('Engine experiment failed', error);
    status.textContent = 'لم يعمل محرك الرسم على هذا الجهاز. راجع سجل الاختبار والمستعرض.';
  },
});
let request = 0;
async function open(id, label) {
  const current = ++request;
  status.textContent = 'تحميل المحرك: ' + label;
  const ok = await host.open(id);
  if (current === request) status.textContent =
    ok ? 'تعمل تجربة ' + label + ' (غير معتمدة للإنتاج).' : 'تعذر تشغيل تجربة ' + label;
}
document.getElementById('open-3d').addEventListener('click', () =>
  void open('engine-3d-smoke', 'PlayCanvas 3D'));
document.getElementById('open-2d').addEventListener('click', () =>
  void open('engine-2d-smoke', 'PixiJS 2D'));
document.getElementById('stop-game').addEventListener('click', async () => {
  ++request;
  await host.close();
  status.textContent = 'أُغلقت التجربة وأُرسلت أوامر تحرير الموارد.';
});
window.addEventListener('pagehide', () => void host.destroy(), { once: true });
