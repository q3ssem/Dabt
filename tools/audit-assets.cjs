'use strict';
// Conservative inventory for MindLab cleanup. READ ONLY: never deletes or rewrites assets.
// Static references are evidence of use; missing references are NOT proof of non-use,
// because the game assembles scene paths dynamically from IDs and manifests.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const skipDirs = new Set(['.git', 'node_modules', '.pytest_cache', '__pycache__', 'coverage', 'test-results', 'playwright-report']);
const codeExt = new Set(['.js', '.cjs', '.mjs', '.css', '.html', '.json', '.md', '.yml', '.yaml', '.py', '.webmanifest', '.txt']);
const assetExt = new Set(['.webp', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.avif', '.woff', '.woff2', '.ttf', '.otf', '.mp3', '.ogg', '.opus', '.wav', '.m4a']);
function list(dir, result = []) {
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) list(path.join(dir, entry.name), result);
    } else if (entry.isFile()) result.push(path.relative(root, path.join(dir, entry.name)).split(path.sep).join('/'));
  }
  return result;
}
const files = list(root).sort();
const asSet = new Set(files);
const assets = files.filter(f => assetExt.has(path.extname(f).toLowerCase()));
const texts = files.filter(f => codeExt.has(path.extname(f).toLowerCase()));
const textSources = texts.map(f => ({path:f, body:fs.readFileSync(path.join(root, f), 'utf8')}));
// Separate production references from QA/doc mentions: a test that names an asset
// is evidence of an expectation, not evidence that the browser actually loads it.
const runtimeSources = textSources.filter(x => !/^(?:docs|qa|tools|\.github)\//.test(x.path)
  && !/\.(?:md|txt|py|yml|yaml)$/.test(x.path));
const supportSources = textSources.filter(x => !runtimeSources.includes(x));
const runtimeCorpus = runtimeSources.map(x => x.body).join('\n');
const supportCorpus = supportSources.map(x => x.body).join('\n');
const refs = new Map();
const missingStaticRefs = [];
function addRef(target, owner, kind) {
  if (!refs.has(target)) refs.set(target, []);
  if (refs.get(target).length < 12) refs.get(target).push({owner, kind});
}
for (const source of textSources) {
  // Resolve literal CSS url() references relative to the owning stylesheet.
  if (!source.path.endsWith('.css')) continue;
  const rex = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^\)]*))\s*\)/g;
  for (const hit of source.body.matchAll(rex)) {
    let raw = (hit[1] || hit[2] || hit[3] || '').trim();
    if (!raw || /^(?:data:|https?:|blob:|#|var\()/i.test(raw)) continue;
    raw = raw.split(/[?#]/)[0];
    try { raw = decodeURIComponent(raw); } catch (_) {}
    const rel = raw.startsWith('/')
      ? path.posix.normalize(raw.replace(/^\/+/, ''))
      : path.posix.normalize(path.posix.join(path.posix.dirname(source.path),raw));
    if (rel.startsWith('../') || rel === '..') continue;
    addRef(rel,source.path,'css-url');
    if (!asSet.has(rel) && missingStaticRefs.length < 200) missingStaticRefs.push({source:source.path,reference:raw,resolved:rel});
  }
}
const entries = assets.map(f => {
  const sz = fs.statSync(path.join(root, f)).size;
  const explicit = runtimeCorpus.includes(f);
  const supportOnly = !explicit && supportCorpus.includes(f);
  const css = refs.get(f) || [];
  const folder = path.posix.dirname(f) + '/';
  const dynamicPossible = runtimeCorpus.includes(folder) || runtimeCorpus.includes(path.posix.basename(f));
  const status = explicit || css.length ? 'referenced-runtime'
    : dynamicPossible ? 'possible-dynamic-runtime'
    : supportOnly ? 'mentioned-in-support-only'
    : 'unresolved-review-only';
  return {path:f, bytes:sz, status, cssReferences:css};
});
const byHash = new Map();
for (const asset of entries) {
  const digest=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,asset.path))).digest('hex');
  if (!byHash.has(digest)) byHash.set(digest,[]);
  byHash.get(digest).push(asset);
}
const duplicates = [...byHash.entries()].filter(([,v])=>v.length>1)
  .map(([sha256,group])=>({
    sha256,
    paths:group.map(v=>v.path),
    bytesPerCopy:group[0].bytes,
    redundantCheckoutBytes:(group.length-1)*group[0].bytes,
    statuses:group.map(v=>v.status)
  }))
  .sort((a,b)=>b.redundantCheckoutBytes-a.redundantCheckoutBytes);
const totalBytes = files.reduce((n,f)=>n+fs.statSync(path.join(root,f)).size,0);
const summary = {
  generatedAt:new Date().toISOString(),
  fileCount:files.length, assetCount:assets.length, bytes:totalBytes,
  duplicateGroups:duplicates.length,
  duplicateExtraPaths:duplicates.reduce((n,g)=>n+g.paths.length-1,0),
  duplicateCheckoutBytes:duplicates.reduce((n,g)=>n+g.redundantCheckoutBytes,0),
  explicitlyReferenced:entries.filter(v=>v.status==='referenced-runtime').length,
  possibleDynamic:entries.filter(v=>v.status==='possible-dynamic-runtime').length,
  mentionedInSupportOnly:entries.filter(v=>v.status==='mentioned-in-support-only').length,
  unresolvedRequiresReview:entries.filter(v=>v.status==='unresolved-review-only').length,
  missingStaticCssReferences:missingStaticRefs.length
};
const report={summary,duplicateGroups:duplicates,missingStaticCssReferences:missingStaticRefs,assets:entries};
// Important: this report is an inventory, never a list of safe deletion targets.
console.log('MindLab READ-ONLY asset inventory: '+JSON.stringify(summary));
console.log('No asset was deleted. Unresolved and duplicate paths must be checked against runtime, save, test and offline dependencies before removal.');
console.log('Unresolved candidates (NOT safe to delete): '+JSON.stringify(entries.filter(v=>v.status==='unresolved-review-only').map(v=>({path:v.path,bytes:v.bytes}))));
const outputFlag=process.argv.indexOf('--json');
if (outputFlag !== -1 && process.argv[outputFlag+1]) {
  const dest=path.resolve(root,process.argv[outputFlag+1]);
  if (!dest.startsWith(root+path.sep)) throw new Error('Output must stay inside repository');
  fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n');
  console.log('Report written: '+path.relative(root,dest));
}
