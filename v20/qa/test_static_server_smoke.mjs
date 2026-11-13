import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.webp':'image/webp'};
const server = http.createServer((req,res)=>{
  let pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if (pathname === '/') pathname='/index.html';
  const target=path.resolve(root,'.'+pathname);
  if (!target.startsWith(root+path.sep) && target!==root) {res.writeHead(403);res.end();return;}
  fs.stat(target,(err,st)=>{
    if(err||!st.isFile()){res.writeHead(404);res.end('not found');return;}
    res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream','cache-control':'no-store'});
    fs.createReadStream(target).pipe(res);
  });
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try {
  const base=`http://127.0.0.1:${server.address().port}`;
  const paths=['/','/index.html','/src/app.js','/src/handdrawn.css','/src/content-expansion-v16.js','/src/games/deep-cognition-v17.js','/src/adventures/planet-expansion-v17.js','/engine-phaser/index.html','/manifest.webmanifest','/service-worker.js','/assets/icons/icon-192.png','/engine-phaser/src/main.js','/engine-phaser/public/assets/characters/explorer-spritesheet.png'];
  for (const route of paths) {
    const response=await fetch(base+route);
    assert.equal(response.status,200,`HTTP ${route}`);
    const body=await response.text();
    assert.ok(body.length>50,`non-empty ${route}`);
  }
  const page=await (await fetch(base+'/')).text();
  assert.match(page,/V20\.0/);
  assert.match(page,/src\/app\.js/);
  console.log(`PASS: static HTTP smoke test — ${paths.length} routes served, V20.0 labels and app entry present.`);
} finally {
  await new Promise(resolve=>server.close(resolve));
}
