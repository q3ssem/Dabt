'use strict';
const fs=require('fs'),assert=require('assert'),vm=require('vm');
const src=fs.readFileSync('watercolor/atheran-ink.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const offline=fs.readFileSync('offline-manifest.js','utf8');
const css=fs.readFileSync('watercolor/style.css','utf8');
const mainIds=['pz_aarch','pz_aport','pz_alight','pz_acur','pz_ashell','pz_aroot','pz_aring','pz_ashade','pz_aswarm','pz_aecho','pz_avsong','pz_agiant','pz_aherd','pz_abridge','pz_asilent','pz_alayer','pz_acity','pz_asong','pz_aflow','pz_arelic','pz_aheart'];
const secretIds=['pz_wbone','pz_wspore','pz_wlog','pz_wlake','pz_wfirst'];
const all=[...mainIds,...secretIds];
for(const id of all)assert(src.includes(id+':frame('),`missing individually drawn Atheran SVG: ${id}`);
assert.strictEqual(all.length,26);
for(const id of mainIds){assert(src.includes(id),`missing main story id ${id}`);assert(html.includes("id:'"+id+"'"),`main puzzle is not registered in the app: ${id}`);}
for(const id of secretIds){assert(src.includes(id),`missing secret-world id ${id}`);assert(html.includes("id:'"+id+"'"),`secret world is not registered in the app: ${id}`);}
for(const token of ['W.atheranInk=art','W.atheranStory=story','W.atheranSecrets=secrets','W.atheranOpenJournal=openJournal','a.done','a.sw','swd[p.key]',"setAttribute('aria-modal','true')","setAttribute('aria-labelledby'",'دفتر أَثْرَان','atheran-story'])assert(src.includes(token),`missing feature ${token}`);
assert(!/localStorage|sessionStorage|\.setItem\(/.test(src),'Atheran journal must not introduce a parallel persistence key');
assert(html.includes('watercolor/atheran-ink.js'),'Atheran art/story layer linked in index');
assert(offline.includes('watercolor/atheran-ink.js'),'Atheran art/story layer included in offline cache');
for(const c of ['.atheran-ink-box','.atheran-story','.atheran-book-backdrop','.atheran-book-entry','.atheran-journal-open'])assert(css.includes(c),`missing responsive styling ${c}`);

class FakeElement{
 constructor(tag,cls=''){this.tagName=tag.toUpperCase();this.className=cls;this.children=[];this.parentElement=null;this.style={};this.dataset={};this.attributes={};this.listeners={};this.textContent='';this.innerHTML='';this.classList={add:(x)=>{if(!this.className.split(/\s+/).includes(x))this.className=(this.className+' '+x).trim()}};}
 append(...nodes){for(const node of nodes){this.children.push(node);node.parentElement=this}}
 appendChild(node){this.append(node);return node}
 setAttribute(k,v){this.attributes[k]=v}
 removeAttribute(k){delete this.attributes[k]}
 addEventListener(k,fn){this.listeners[k]=fn}
 focus(){this.focused=true}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this);this.parentElement=null}
 all(){return [this,...this.children.flatMap(x=>x.all())]}
 querySelector(sel){const pool=this.all().slice(1);if(sel.startsWith('.'))return pool.find(x=>x.className.split(/\s+/).includes(sel.slice(1)))||null;return pool.find(x=>x.tagName===sel.toUpperCase())||null}
 querySelectorAll(sel){const pool=this.all().slice(1);if(sel.startsWith('.'))return pool.filter(x=>x.className.split(/\s+/).includes(sel.slice(1)));return pool.filter(x=>x.tagName===sel.toUpperCase())}
 insertAdjacentElement(pos,node){if(!this.parentElement){this.append(node);return node}const p=this.parentElement,i=p.children.indexOf(this);p.children.splice(i+(pos==='afterend'?1:0),0,node);node.parentElement=p;return node}
}
const card=new FakeElement('article','la-library-card');card.dataset.puzzleId='pz_aarch';const icon=new FakeElement('div','la-library-image');card.append(icon);
const body=new FakeElement('body');
const stage=new FakeElement('div','stage'),sheet=new FakeElement('div','xsheet'),head=new FakeElement('div','xhead'),pin=new FakeElement('div','xpin');sheet.append(head,pin);let activeGame=null;const doc={body,createElement:t=>new FakeElement(t),querySelector(sel){if(sel==='#stage')return stage;if(sel==='#play .xsheet')return sheet;return null},querySelectorAll(sel){if(sel==='.la-library-card')return[card];return[]},addEventListener(){},removeEventListener(){}};
const state={done:{pz_aarch:1,pz_acur:1},sw:{bones:1},swd:{bones:1}};
const fakeASTN=mainIds.map((id,i)=>({id,n:'تحدي '+id,story:'نص القصة '+id,reg:i<3?null:Math.min(8,Math.floor((i-3)/2)),sc:[['navigator','شهادة '+id]]}));
const fakeAREG=Array.from({length:9},(_,i)=>({n:'منطقة '+i}));
const fakeASW=[['bones','pz_wbone'],['spores','pz_wspore'],['ship','pz_wlog'],['lake','pz_wlake'],['first','pz_wfirst']].map(([k,id],i)=>({k,id,n:'عالم '+k,how:'دليل '+k,story:'حكاية '+k,end:'خاتمة '+k}));
const W={cards(){},current(){return activeGame}};
const win={Watercolor:W,aHubHTML(){return '<section><div class="abtns">old</div></section>'},txBind(){}};
let observed=null;class FakeObserver{constructor(fn){this.fn=fn;observed=this}observe(){}}const context={window:win,document:doc,ASTN:fakeASTN,AREG:fakeAREG,ASW:fakeASW,ACH:{navigator:'العم نوّار'},aState:()=>state,MutationObserver:FakeObserver,console};
vm.runInNewContext(src,context);
assert.strictEqual(Object.keys(W.atheranInk).length,26,'26 hand-drawn art pieces registered');
assert.strictEqual(W.atheranStory().length,21,'journal consumes 21 existing main-story records');
assert.strictEqual(W.atheranSecrets().length,5,'journal consumes five existing secret-world records');
assert(icon.innerHTML.includes('<svg class="atheran-ink"'),'library card receives its dedicated SVG');
assert(icon.className.includes('atheran-ink-box'),'library card receives art frame styling');
W.cards();assert(icon.innerHTML.includes('<svg class="atheran-ink"'),'repeat card refresh does not overwrite bespoke art');
assert.strictEqual(win.MINDLAB_ATHERAN_JOURNAL.count(),3,'journal count derives from the original saved discovery state');
assert(typeof win.MINDLAB_ATHERAN_JOURNAL.open==='function','map-free chapter folders can open the original journal');
const hub=win.aHubHTML();assert(!hub.includes('atheran-journal-open'),'removed Atheran atlas does not inject a hidden journal button');
W.atheranOpenJournal();
const veil=body.children[0],entries=veil.querySelectorAll('.atheran-book-entry');
assert.strictEqual(entries.length,26,'journal renders all 26 atlas pages');
assert.strictEqual(veil.querySelectorAll('.found').length,3,'only discovered main/secret pages are revealed');
assert.strictEqual(veil.querySelectorAll('.locked').length,23,'undiscovered pages remain sealed');
const firstSecret=entries.find(e=>e.dataset.pageId==='pz_wbone');assert(firstSecret&&firstSecret.all().some(n=>n.textContent==='ما عرفناه: خاتمة bones'),'completed secret world reveals its ending');assert(firstSecret.all().some(n=>n.textContent==='الورقة 22'),'secret pages continue unique numbering after the 21 main pages');
const secondSecret=entries.find(e=>e.dataset.pageId==='pz_wspore');assert(secondSecret&&!secondSecret.all().some(n=>n.textContent==='حكاية spores'),'undiscovered secret world does not reveal story');
assert.strictEqual(veil.querySelector('.atheran-book-count').textContent,'اكتُشفت 3 من 26 صفحة','journal count matches canonical app state');
assert.strictEqual(veil.querySelector('.atheran-book-progress').children[0].style.width,(3/26*100)+'%','journal progress bar is accurate');
veil.querySelector('.atheran-book-close').listeners.click();assert.strictEqual(body.children.length,0,'journal close control removes the modal');
activeGame={id:'pz_wbone'};observed.fn();const secretRibbon=sheet.querySelector('.atheran-story');assert(secretRibbon&&secretRibbon.all().some(n=>n.textContent==='عالم سري · عالم bones'),'secret-world puzzle screen also receives its story ribbon');
console.log(`Atheran journal: ${all.length} original SVG illustrations, ${mainIds.length} main pages, ${secretIds.length} secret worlds; discovery gating and journal state verified.`);
