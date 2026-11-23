import test from 'node:test';
import assert from 'node:assert/strict';
import { ResourceScope } from '../src/core/resource-scope.js';
import { GameHost } from '../src/core/game-host.js';
import { GameRegistry } from '../src/core/game-registry.js';

function domHarness() {
  const listeners = new Map();
  const doc = {
    hidden: false,
    createElement(tag) {
      return { tag, ownerDocument: doc, textContent: '', children: [], attributes: {},
        setAttribute(name, value) { this.attributes[name] = value; },
        replaceChildren(...nodes) { this.children = nodes; } };
    },
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type) { listeners.delete(type); },
  };
  return { root: doc.createElement('main') };
}
test('ResourceScope releases registered resources in reverse order exactly once', async () => {
  const scope = new ResourceScope(), events = [];
  scope.defer(() => events.push('first'));
  scope.defer(async () => { events.push('second'); });
  const disposing = scope.dispose();
  await disposing;
  await scope.dispose();
  assert.deepEqual(events, ['second', 'first']);
  assert.equal(scope.closed, true);
  assert.throws(() => scope.defer(() => {}), /disposed/);
});
test('ResourceScope tracks and detaches event handlers', async () => {
  const calls = [], handlers = new Map();
  const target = {
    addEventListener(type, handler) { handlers.set(type, handler); calls.push('add'); },
    removeEventListener(type, handler) { assert.equal(handlers.get(type), handler); handlers.delete(type); calls.push('remove'); },
  };
  const scope = new ResourceScope();
  scope.listen(target, 'webglcontextlost', () => {});
  await scope.dispose();
  assert.deepEqual(calls, ['add', 'remove']);
  assert.equal(handlers.size, 0);
});
test('ResourceScope aggregates failures but still releases other resources', async () => {
  const scope = new ResourceScope(), events = [];
  scope.defer(() => { events.push('one'); throw Error('failed 1'); });
  scope.defer(() => { events.push('two'); throw Error('failed 2'); });
  await assert.rejects(scope.dispose(), AggregateError);
  assert.deepEqual(events, ['two', 'one']);
});
test('GameHost injects service ports and releases resources after session disposal', async () => {
  const events = [], registry = new GameRegistry(), { root } = domHarness();
  const audio = Object.freeze({ mute: true });
  registry.register({ id: 'resource-check', renderer: '2d', load: async () => ({
    mount({ resources, services }) {
      assert.equal(services.audio, audio);
      assert.ok(Object.isFrozen(services));
      resources.defer(() => { events.push('scope'); });
      return { dispose() { events.push('session'); } };
    }
  }) });
  const host = new GameHost({ registry, element: root, services: { audio } });
  assert.equal(await host.open('resource-check'), true);
  await host.close();
  assert.deepEqual(events, ['session', 'scope']);
  await host.destroy();
});
test('Failed game mount releases its scope even without a valid session', async () => {
  const events = [], registry = new GameRegistry(), { root } = domHarness();
  registry.register({ id: 'broken-resource', renderer: '3d', load: async () => ({
    mount({ resources }) { resources.defer(() => events.push('recovered')); throw Error('GPU failed'); }
  }) });
  const host = new GameHost({ registry, element: root });
  assert.equal(await host.open('broken-resource'), false);
  assert.deepEqual(events, ['recovered']);
  await host.destroy();
});
