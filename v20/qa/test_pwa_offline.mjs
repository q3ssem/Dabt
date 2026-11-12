import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const phaserHtml = fs.readFileSync(path.join(root, 'engine-phaser/index.html'), 'utf8');
const phaserMain = fs.readFileSync(path.join(root, 'engine-phaser/src/main.js'), 'utf8');
const viteConfig = fs.readFileSync(path.join(root, 'engine-phaser/vite.config.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));

assert.match(html, /V20\.0/);
assert.match(html, /rel="manifest" href="\.\/manifest\.webmanifest"/);
assert.match(app, /serviceWorker\.register\('\.\/service-worker\.js'\)/);
assert.match(sw, /request\.mode === 'navigate'/);
assert.match(phaserHtml, /src="\.\/src\/main\.js"/);
assert.match(phaserMain, /\.\/assets\/characters\/explorer-spritesheet\.png/);
assert.match(viteConfig, /base: '\.\/'/);
assert.equal(manifest.lang, 'ar');
assert.equal(manifest.dir, 'rtl');
assert.equal(manifest.display, 'standalone');
for (const icon of manifest.icons) assert.ok(fs.existsSync(path.join(root, icon.src.replace(/^\.\//, ''))), `Missing PWA icon ${icon.src}`);

// Execute the service worker in a deterministic mock to verify install/activate behavior.
const listeners = {};
const cacheStore = new Map();
const cacheApi = {
  async open(name) {
    if (!cacheStore.has(name)) cacheStore.set(name, new Map());
    const bucket = cacheStore.get(name);
    return {
      async addAll(urls) { for (const url of urls) bucket.set(url, new Response(`cached:${url}`)); },
      async match(request) { return bucket.get(typeof request === 'string' ? request : request.url); },
      async put(request, response) { bucket.set(typeof request === 'string' ? request : request.url, response); },
    };
  },
  async keys() { return [...cacheStore.keys()]; },
  async delete(name) { return cacheStore.delete(name); },
};
const self = {
  location: { origin: 'https://example.test', href: 'https://example.test/Dabt/service-worker.js' },
  clients: { async claim() {} },
  async skipWaiting() {},
  addEventListener(type, callback) { listeners[type] = callback; },
};
const context = { self, caches: cacheApi, URL, Response, fetch: async () => { throw new Error('offline'); } };
vm.runInNewContext(sw, context, { filename: 'service-worker.js' });
let installPromise;
listeners.install({ waitUntil(promise) { installPromise = promise; } });
await installPromise;
assert.ok(cacheStore.has('dabt-pro-shell-v20.0'));
cacheStore.set('dabt-pro-shell-v19.0', new Map());
let activatePromise;
listeners.activate({ waitUntil(promise) { activatePromise = promise; } });
await activatePromise;
assert.equal(cacheStore.has('dabt-pro-shell-v19.0'), false, 'old cache should be removed');
let navigationPromise;
listeners.fetch({
  request: { method: 'GET', mode: 'navigate', url: 'https://example.test/Dabt/' },
  respondWith(promise) { navigationPromise = promise; },
});
const offlinePage = await navigationPromise;
assert.equal(await offlinePage.text(), 'cached:./index.html', 'offline navigation should fall back to cached app shell');
console.log('PASS: PWA offline shell — manifest, scoped service worker, cache lifecycle, offline navigation, Phaser subpath paths, RTL metadata, and icons validated.');
