/* 5.5.2 — three brain-game cards per row; the legacy intro sprite is hidden when the new game art is present. Presentation only. */
const fs=require('fs'),path=require('path'),root=path.join(__dirname,'..','..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
let n=0;const ok=(c,m)=>{if(!c){console.error('FAIL',m);process.exit(1);}n++;};
const pkg=JSON.parse(read('package.json'));ok(pkg.version==='5.5.2','version 5.5.2');
ok(read('sw.js').includes("const VERSION='5.5.2'"),'cache renamed');
const ds=read('ds/mindlab-ds.css');
ok(/#v-games \.ui-grid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/.test(ds),'three cards per row');
ok(ds.includes('#stage .intro:has(img.ml-art) .la-intro-art>:not(span){display:none!important}'),'legacy intro sprite hidden only beside new art');
ok(read('legacy/art.js').includes('la-intro-art'),'intro card text kept');
console.log('release552 ok',n);
