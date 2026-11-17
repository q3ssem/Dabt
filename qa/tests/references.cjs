// Every relative file path written in the app's code, styles and offline manifest must exist on disk.
// Catches broken references after any file move (5.5.28 ui-reorg moved Atheran's code into atheran/{campaign,runtime,bindings}).
const fs = require('fs'), path = require('path'), assert = require('assert');
const ROOT = path.resolve(__dirname, '..', '..'); process.chdir(ROOT);
const SKIP = /^(\.git|qa|docs|tv|node_modules|atheran\/assets)(\/|$)/;
const files = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f), r = path.relative(ROOT, p).replace(/\\/g, '/');
  if (SKIP.test(r)) continue; const st = fs.statSync(p); if (st.isDirectory()) walk(p); else if (/\.(js|css|html|webmanifest)$/.test(f)) files.push(r); } })(ROOT);
files.push('qa/assessment-engine/Dabt_Assessment_Engine_v1.3.js');
const RX = /["'`(]((?:\.\.?\/)?(?:atheran|ui|ds|legacy|watercolor|treasure|expedition10|hasad|upgrade|fonts|icons|audio|assessment|art|qa\/assessment-engine)\/[A-Za-z0-9_\-./]+\.(?:js|css|json|png|webp|jpg|jpeg|svg|woff2|mp3|ogg|wav|webmanifest))["'`)]/g;
let n = 0; const bad = [];
for (const f of files) { if (f === 'atheran/runtime/assets-runtime.js') continue; /* its registry paths are relative to atheran/assets and are verified by atheran-assets.integration */ const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(RX)) { const ref = m[1]; if (ref.includes('${')) continue;
    const cands = [path.normalize(ref.replace(/^\.\//, '')), path.normalize(path.join(path.dirname(f), ref))];
    n++; if (!cands.some(c => fs.existsSync(c))) bad.push(`${f} → ${ref}`); } }
const man = fs.readFileSync('offline-manifest.js', 'utf8'); const list = JSON.parse(man.slice(man.indexOf('['), man.indexOf(']') + 1));
for (const p of list) { if (p === './') continue; n++; if (!fs.existsSync(p)) bad.push('offline-manifest → ' + p); }
assert.deepStrictEqual(bad, [], 'broken references:\n' + bad.join('\n'));
console.log(`References: ${n} file paths checked in ${files.length} files — none broken.`);
