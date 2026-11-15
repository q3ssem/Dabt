/* 5.5.2 — three brain-game cards per row; the legacy intro sprite is hidden when the new game art is present. Presentation only. */
const fs=require('fs'),path=require('path'),root=path.join(__dirname,'..','..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
let n=0;const ok=(c,m)=>{if(!c){console.error('FAIL',m);process.exit(1);}n++;};
const pkg=JSON.parse(read('package.json'));ok(pkg.version==='5.5.2','version 5.5.2');
ok(read('sw.js').includes("const VERSION='5.5.2'"),'cache renamed');
const ds=read('ds/mindlab-ds.css');
ok(/#v-games \.ui-grid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/.test(ds),'three cards per row');
ok(ds.includes('#stage .intro:has(img.ml-art) .la-intro-art>:not(span){display:none!important}'),'legacy intro sprite hidden only beside new art');
ok(read('legacy/art.js').includes('la-intro-art'),'intro card text kept');
const mini=read('ui/mini.js'),kit=read('ds/play-kit.css'),om=read('offline-manifest.js');
ok(read('ui/app.js').includes("ui/mini.js"),'mini layer loaded');
ok(read('release54.js').includes(".concat(['ds/play-kit.css'])"),'play kit loaded after the design system');
ok(om.includes('"ui/mini.js"')&&om.includes('"ds/play-kit.css"'),'offline files');
ok(mini.includes("'ألعاب القراصنة المصغّرة'")&&mini.includes("['مغامرة القرصان', 'الحطام والمعبد']"),'pirate + wreck merged');
ok(/HIDDEN = new Set\(\['pz_pobs', 'pz_aflow', 'pz_zstars'\]\)/.test(mini),'dark boards out of the library only');
ok(!/delete|removeItem|S\.st\.(lv|best)\s*=/.test(mini),'mini layer never touches saves');
ok(kit.includes('#play[data-la-puzzle="false"]:not([data-la-game^="dx_"])'),'kit scoped to classic brain games');
console.log('release552 ok',n);
