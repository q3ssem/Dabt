'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync('ui/app.js', 'utf8');
const css = fs.readFileSync('motion/expedition-art.css', 'utf8');
const realm = { self: {}, URL, Response, fetch: null, caches: null };
const handlers = {};
const requested = [];
const cached = new Map();
realm.self.location = { href: 'https://mindlab.invalid/Dabt/sw.js' };
realm.self.addEventListener = (name, handler) => { handlers[name] = handler; };
realm.importScripts = path => vm.runInContext(fs.readFileSync(path, 'utf8'), realm);
realm.fetch = async url => { requested.push(url); return new Response('puzzle art'); };
realm.caches = { open: async () => ({
  match: async url => cached.get(url),
  put: async (url, response) => cached.set(url, response)
}) };
vm.createContext(realm);
vm.runInContext(fs.readFileSync('sw.js', 'utf8'), realm);

const images = Array.from(css.matchAll(/url\(\.\.\/([^)]+)\)/g), v => v[1]);
for (const file of new Set(images)) assert.ok(fs.existsSync(file), 'art file ' + file);
assert.ok(app.includes("'motion/expedition-art.css'"));
assert.ok(realm.self.MINDLAB_OFFLINE_FILES.includes('motion/expedition-art.css'));
const groups = realm.self.MINDLAB_EXPEDITION_ART;
const scope = new Set(Object.keys(groups));
assert.ok(Array.isArray(groups.pz_river) && groups.pz_river.some(file => file.endsWith('/river-day.webp')),
  'current authored river art belongs to the canonical per-puzzle cache registry');
assert.equal(scope.size, Object.keys(groups).length, 'puzzle art registry has one entry per game');
for (const group of Object.values(groups)) {
  assert.equal(group.length, new Set(group).size, 'no duplicate URLs within a puzzle');
  for (const file of group) assert.ok(fs.existsSync(file));
}

function warm(puzzleId) {
  let finished;
  handlers.message({
    data: { type: 'warm-puzzle-art', puzzleId },
    waitUntil: job => { finished = job; }
  });
  return finished;
}
(async () => {
  assert.equal(warm('missing'), undefined);
  assert.equal(warm('__proto__'), undefined);
  await warm('pz_pobs');
  const expected = groups.pz_pobs.map(file => 'https://mindlab.invalid/Dabt/' + file);
  assert.equal(JSON.stringify(requested), JSON.stringify(expected), 'only the selected puzzle is fetched');
  await warm('pz_pobs');
  assert.equal(requested.length, expected.length, 'subsequent visits reuse cached images');
  console.log(scope.size + ' puzzle groups, shared assets and per-puzzle offline caching verified.');
})().catch(error => { console.error(error); process.exitCode = 1; });
