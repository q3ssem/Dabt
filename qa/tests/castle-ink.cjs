'use strict';
const fs=require('fs'),assert=require('assert'),vm=require('vm');
const src=fs.readFileSync('watercolor/castle-ink.js','utf8');
const ids=['pz_plock','pz_pliar','pz_pclock','pz_pboss1','pz_plib','pz_pmirror','pz_pgarden','pz_pqueen','pz_parm','pz_pjail','pz_pobs','pz_peng','pz_pmaze','pz_pcrypt','pz_pvalve','pz_plast','pz_pdragon','pz_phall','pz_pheart'];
for(const id of ids){assert(src.includes(id+':frame('),`missing bespoke SVG art ${id}`);assert(src.includes(id+':\'')||src.includes(id+':"'),`missing story key ${id}`);}
assert(src.includes('const frame='),'shared SVG frame builder is present');
assert(src.includes('W.castleLore=lore'));assert(src.includes('W.castleInk=drawings'));
assert(src.includes('W.castleChronicle=chronicle'),'chronicle exposed as palace story data');
assert(src.includes('function openChronicle()'),'captain chronicle reader exists');
assert(src.includes('PSEC_LORE[i]=entry.text'),'found secret fragments and archive use one canonical story source');
assert(src.includes('دفتر القبطان'),'players can reopen discovered story pages');
assert(src.includes('role=\"dialog\" aria-modal=\"true\"'),'chronicle uses an accessible modal dialog');
assert((src.match(/chapter:'/g)||[]).length===19,'all nineteen secret pages are written');
for(const chapter of ['الفصل الأول: الساحل الذي لا يظهر','الفصل الثاني: ضوء يسبق الشمس','الفصل الثالث: البحر الذي يعبر الزمن','الفصل الرابع: الباب الثامن'])assert(src.includes(chapter),'chronicle chapter: '+chapter);
assert(src.includes('insertAdjacentElement'));assert(src.includes('oldCards()'));
class FakeElement{
 constructor(tag,cls=''){this.tagName=tag.toUpperCase();this.className=cls;this.children=[];this.parentElement=null;this.style={};this.attributes={};this.listeners={};this.textContent='';}
 append(...nodes){for(const node of nodes){this.children.push(node);node.parentElement=this}}
 appendChild(node){this.append(node);return node}
 setAttribute(k,v){this.attributes[k]=v}
 addEventListener(k,fn){this.listeners[k]=fn}
 focus(){this.focused=true}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this)}
 all(){return [this,...this.children.flatMap(x=>x.all())]}
 querySelector(sel){if(sel==='.castle-book-progress i'){const p=this.all().find(x=>x.className==='castle-book-progress');return p?.children.find(x=>x.tagName==='I')||null}return this.all().slice(1).find(x=>sel.startsWith('.')?x.className.split(' ').includes(sel.slice(1)):x.tagName===sel.toUpperCase())||null}
 querySelectorAll(sel){return this.all().slice(1).filter(x=>sel.startsWith('.')?x.className.split(' ').includes(sel.slice(1)):x.tagName===sel.toUpperCase())}
 set innerHTML(v){this._html=v;if(this.className!=='castle-book-backdrop')return;const dialog=new FakeElement('section','castle-book'),header=new FakeElement('header'),meta=new FakeElement('div'),small=new FakeElement('small'),title=new FakeElement('h2'),count=new FakeElement('p','castle-book-count'),close=new FakeElement('button','castle-book-close'),progress=new FakeElement('div','castle-book-progress'),fill=new FakeElement('i'),pages=new FakeElement('div','castle-book-pages'),footer=new FakeElement('footer');progress.append(fill);meta.append(small,title,count);header.append(meta,close);dialog.append(header,progress,pages,footer);this.append(dialog)}
}
const fragments=Array(19).fill('old fragment'),body=new FakeElement('body'),doc={body,createElement:t=>new FakeElement(t),querySelector(){return null},querySelectorAll(){return[]},addEventListener(){},removeEventListener(){}};
const win={Watercolor:{cards(){},current(){return null}}},saved={sec:{pz_plock:1,pz_pclock:1}};
const context={window:win,document:doc,PSEC_LORE:fragments,pSt2:()=>saved,MutationObserver:class{observe(){}},console};vm.runInNewContext(src,context);
assert.strictEqual(win.Watercolor.castleChronicle.length,19,'runtime chronicle contains all nineteen secret leaves');
assert.deepStrictEqual(Array.from(fragments),Array.from(win.Watercolor.castleChronicle,x=>x.text),'the live hidden-secret rewards are the exact archive pages');
assert.strictEqual(new Set(win.Watercolor.castleChronicle.map(x=>x.id)).size,19,'each chronicle leaf maps to a distinct puzzle identifier');
win.Watercolor.castleOpenChronicle();const veil=body.children[0],pages=veil.querySelector('.castle-book-pages'),entries=pages.querySelectorAll('.castle-book-entry');
assert.strictEqual(entries.length,19,'chronicle renders all nineteen pages');
assert.strictEqual(pages.querySelectorAll('.found').length,2,'only discovered pages are revealed');
assert.strictEqual(pages.querySelectorAll('.locked').length,17,'undiscovered pages remain sealed');
assert.strictEqual(veil.querySelector('.castle-book-count').textContent,'اكتُشفت 2 من 19 صفحة','archive progress is read from saved secrets');
assert.strictEqual(veil.querySelector('.castle-book-progress i').style.width,2/19*100+'%','archive progress bar reflects saved secrets');
veil.querySelector('.castle-book-close').listeners.click();assert.strictEqual(body.children.length,0,'archive close control removes the modal');
const html=fs.readFileSync('index.html','utf8');assert(html.includes('watercolor/castle-ink.js'));
const off=fs.readFileSync('offline-manifest.js','utf8');assert(off.includes('watercolor/castle-ink.js'));
const css=fs.readFileSync('watercolor/style.css','utf8');assert(css.includes('.castle-ink-box')&&css.includes('.castle-lore'));assert(css.includes('.castle-book-backdrop')&&css.includes('.castle-book-entry')&&css.includes('.castle-book-open'),'chronicle reader is styled and responsive');
console.log(`Mirror Palace hand-inked art + lore: ${ids.length} bespoke SVG emblems and ${ids.length} story entries verified.`);
