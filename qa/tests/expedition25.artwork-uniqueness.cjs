'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const app = read('expedition10/app.js');
const manifest = read('offline-manifest.js');
const pkg = JSON.parse(read('package.json'));
const sw = read('sw.js');
const matches = [...app.matchAll(/scene:'([^']+\.webp)'/g)].map(m => m[1]);
assert.equal(pkg.version, '5.5.30', 'package release is 5.5.28');
assert.ok(sw.includes("const VERSION='5.5.30'"), 'service-worker cache is 5.5.28');
assert.equal(matches.length, 24, 'exactly 24 active stage backgrounds are declared');
assert.equal(new Set(matches).size, 24, 'stage background paths are unique');
const files = matches.map(name => {
  const rel = name.includes('/') ? name : `expedition10/art/scenes/${name}`;
  const full = path.join(root, rel);
  assert.ok(fs.existsSync(full), `stage background exists: ${name}`);
  const bytes = fs.readFileSync(full);
  assert.ok(bytes.length > 20_000, `stage background is substantive: ${name}`);
  assert.ok(manifest.includes(`"${rel}"`), `stage background is in Offline Precache: ${name}`);
  return { name, hash: crypto.createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
});
assert.equal(new Set(files.map(x => x.hash)).size, 24, 'all 24 active stage backgrounds have distinct image bytes');
for (const name of ['11-pipes.webp','14-shadows.webp']) {
  const rel = `expedition10/art/scenes/${name}`;
  assert.ok(manifest.includes(`"${rel}"`), `${name} remains available offline after art refresh`);
}
console.log(JSON.stringify({status:'passed',version:pkg.version,stageScenes:files.length,uniqueSceneFiles:new Set(files.map(x=>x.hash)).size,totalBytes:files.reduce((n,x)=>n+x.bytes,0)},null,2));
