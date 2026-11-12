import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(full);
  }
}
walk(root);
const missing = [];
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  for (const ref of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const value = ref[1];
    if (/^(?:https?:|data:|mailto:|#|javascript:|\/\/)/i.test(value)) continue;
    const clean = value.split(/[?#]/,1)[0];
    if (!clean) continue;
    // Root-absolute references are scoped to the HTML entry's own server root
    // (the Phaser Vite app is served from engine-phaser/, independently).
    const target = path.resolve(path.dirname(file), clean.replace(/^\/+/, ''));
    assert.ok(fs.existsSync(target), `Missing HTML asset ${path.relative(root,file)} -> ${value}`);
  }
}
const jsFiles = [];
function walkJs(dir) {
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) walkJs(full);
    else if(entry.isFile() && entry.name.endsWith('.js')) jsFiles.push(full);
  }
}
walkJs(root);
for (const file of jsFiles) {
  const source=fs.readFileSync(file,'utf8');
  for (const m of source.matchAll(/(?:from\s*|import\s*)["']([^"']+)["']/g)) {
    const spec=m[1];
    if (!spec.startsWith('.')) continue;
    const target=path.resolve(path.dirname(file),spec);
    assert.ok(fs.existsSync(target),`Missing JS import ${path.relative(root,file)} -> ${spec}`);
  }
}
const main=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
assert.match(main,/deepCognitionGames/);
assert.match(main,/planetaryMissions/);
const entry=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.match(entry,/V20\.0/);
console.log(`PASS: release graph audit — ${htmlFiles.length} HTML entrypoints, ${jsFiles.length} JS modules, all local references resolve.`);
