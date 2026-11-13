// Generates dist/offline-manifest.json: the core shell list precached by the service
// worker and the per-section art lists downloaded on demand.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const dist = new URL('../dist/', import.meta.url).pathname;
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const files = walk(dist).map(f => path.relative(dist, f).split(path.sep).join('/')).filter(f => f !== 'offline-manifest.json' && f !== 'sw.js');
const sections = { treasure: [], planets: [], lab: [], child: [] };
const core = ['./', 'offline-manifest.json'];
for (const f of files) {
  const m = /^assets\/(treasure|planets|lab|child)\/(backgrounds|tools)\//.exec(f);
  if (m) sections[m[1]].push(f); else core.push(f);
}
const hash = crypto.createHash('sha256'); for (const f of files.sort()) hash.update(f + fs.statSync(path.join(dist, f)).size);
const out = { version: hash.digest('hex').slice(0, 12), builtAt: new Date().toISOString(), core, sections };
fs.writeFileSync(path.join(dist, 'offline-manifest.json'), JSON.stringify(out, null, 1));
console.log(`offline manifest: core ${core.length} files, sections`, Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, v.length])));
