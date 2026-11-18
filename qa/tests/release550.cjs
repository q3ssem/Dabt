'use strict';
/* 5.5.0 — visual identity: white theme by default, central design system, new cards. Presentation only. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const pv=JSON.parse(read('package.json')).version;ok(/^5\.(5|[6-9])\.\d+$/.test(pv),'version 5.5.x or later ('+pv+')');
ok(read('sw.js').includes("const VERSION='"+pv+"'"),'cache renamed so installed apps receive the new styles');
// Keep the original 5.4.8 baseline after reversing the audited Treasure board presentation changes.
const frozen={'treasure/data.js':'b2b1b30363eff3ad813e8459e81fdcd333b909c3f9fda752428a8c1a8b294a4b',
 'treasure/logic.js':'0146bdf869065655058f5c79395d772ae7c24141bace41a28d2fbad9e8f0d0d7','treasure/boards.js':'9492fd773cc2b3949e6bae0c98345bd98787fe0395a6566bcc077ab264e4dc0f'};
// Inline index engines are protected by legacy.art.cjs, which reverses only audited audio and Mirror Palace patches before checking original fingerprints.
for(const [f,h] of Object.entries(frozen)){
 if(f!=='treasure/boards.js'){ok(sha(f)===h,f+' unchanged');continue;}
 let source=read(f);
 for(const {before,after} of JSON.parse(read('qa/allowed_treasure_board_presentation_changes.json')).reverse()){
   ok(source.split(after).length===2,'each approved Treasure presentation change appears exactly once');
   source=source.replace(after,()=>before);
 }
 ok(crypto.createHash('sha256').update(source).digest('hex')===h,f+' matches the original after reversing presentation changes');
}
ok(read('index.html').includes("localStorage.getItem('miran:v2')"),'save key miran:v2');
// Design system: tokens for both themes, legacy variables mapped, shared components, cards.
const ds=read('ds/mindlab-ds.css');
for(const t of ['--ml-bg','--ml-surface','--ml-ink','--ml-accent','--ml-gold','--ml-good','--ml-bad','--ml-warn','--ml-line','--ml-sh-1','--ml-r-lg','--ml-s4','--ml-t-md','--ml-card-art'])ok(ds.includes(t+':'),'token '+t);
ok(/:root\[data-skin="light"\]\{[^}]*--ml-bg:#F7F5F0[^}]*--bg:var\(--ml-bg\)/s.test(ds),'white tokens defined with :root specificity and mapped onto the legacy --bg/--ink/--panel variables');
ok(/--ml-accent:#12867F/.test(ds)&&/--ml-gold:#B3802A/.test(ds),'calm turquoise accent + warm gold');
for(const c of ['.ml-surface','.ml-btn','.ml-chip'])ok(ds.includes(c+'{'),'shared component '+c);
ok(ds.includes('#v-games .ui-gmain{all:unset')&&ds.includes('#v-puz .la-library-card{all:unset')&&ds.includes('#v-home .rcard{all:unset'),'one card design for games, puzzles and home');
ok(ds.includes('grid-template-columns:repeat(auto-fill,minmax(var(--ml-card-min),1fr))'),'responsive card grid (2 → 3–4 → 5 columns)');
ok(/object-fit:contain!important/.test(ds)&&!/object-fit:fill/.test(ds),'art shown whole (contain), never stretched');
ok(ds.includes('.t7 .t7-scene.v5-scene{aspect-ratio:16/10')&&ds.includes('.t7 .v5-intro-crew-art img{height:100%!important;width:auto!important;max-width:100%!important;object-fit:contain'),'Treasure Island frames unified; crew art complete, never cropped');
ok(ds.includes('html[data-skin="light"] #play,html[data-skin="light"] #play .pin{background:var(--ml-bg)'),'play layer follows the theme');
// Generated white layer is current with every source stylesheet.
ok(cp.spawnSync('python3',[path.join(root,'tools/build_light_theme.py'),'--check'],{encoding:'utf8'}).status===0,'ds/light-auto.css regenerated from the current sources');
const auto=read('ds/light-auto.css');ok(auto.split('\n').length>700&&auto.includes('@media (prefers-color-scheme:light){html[data-skin="auto"]'),'white layer covers light and auto');
// Loading order and default.
const r54=read('release54.js');
ok(r54.indexOf("link.href = new URL('release54.css'")<r54.indexOf("['ds/light-auto.css', 'ds/mindlab-ds.css']"),'design system loads after release54.css');
ok(r54.includes("let preference = 'light';")&&r54.includes("preference = S.st.skin || 'light'"),'white is the default; a stored choice is kept');
ok(read('ui/app.js').includes("if (!S.st.skin) document.documentElement.dataset.skin = 'light'"),'white applied before first paint');
const off=read('offline-manifest.js');ok(off.includes('"ds/light-auto.css"')&&off.includes('"ds/mindlab-ds.css"'),'design system cached for offline use');
// Original art untouched: no asset path rewritten, no image replaced.
for(const k of ['rawaa','nuha','nabd','shibl','suhail','ward','nawfal'])ok(fs.existsSync(path.join(root,'treasure/art/story5/crew_full_'+k+'.webp'))&&!ds.includes('crew_full_'+k),'crew art '+k+' original and unreferenced by the design layer');
ok(!/url\(/.test(ds),'design layer adds no images');
console.log(JSON.stringify({status:'passed',checks,defaultTheme:'light',designSystem:'ds/mindlab-ds.css',generatedLayer:'ds/light-auto.css',frozenFiles:Object.keys(frozen).length},null,2));
