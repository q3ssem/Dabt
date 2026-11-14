const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const base=path.resolve(__dirname,'../..'),fixture=fs.readFileSync(path.join(__dirname,'legacy.art.cjs'),'utf8'),prefix=fixture.slice(0,fixture.indexOf('const LA=context.LA;'));
const {context:c,body,inventory,Node}=new Function('require','__dirname',prefix+'return {context,body,inventory,Node};')(require,__dirname);
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++};
c.document.addEventListener=()=>{};c.addEventListener=()=>{};c.document.hidden=false;
c.document.createElement=t=>t==='canvas'?{width:0,height:0,getContext:()=>({clearRect(){},drawImage(){}}),toDataURL:()=> 'data:image/png;base64,test'}:new Node(t);
const play=body.querySelector('#play');play.style.removeProperty=function(k){delete this[k]};
c.SC_SHIRT=[['أحمر','#FF5F7A'],['أزرق','#4C8DFF'],['أخضر','#4BE08A'],['أصفر','#FFD45A'],['بنفسجي','#B07BFF']];
c.scPerson=()=>'<svg class="fallback-person"/>';c.S={st:{mute:false}};
let nativeTones=0,time=1000,created=0,stopped=0;
c.tone=()=>{nativeTones++};c.performance={now:()=>time};c.GM={};
const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}}),node=()=>({connect(){},start(){},stop(){stopped++},frequency:param(),gain:param()});
c.AudioContext=class{constructor(){created++;this.currentTime=1;this.sampleRate=8000;this.state='running';this.destination={};}createBuffer(_n,len){return{getChannelData:()=>new Float32Array(len)}}createBufferSource(){return node()}createBiquadFilter(){return node()}createGain(){return node()}createOscillator(){return node()}};
c.current=null;
vm.runInContext(fs.readFileSync(path.join(base,'watercolor/manifest.js'),'utf8'),c);vm.runInContext(fs.readFileSync(path.join(base,'watercolor/app.js'),'utf8'),c);
const W=c.Watercolor,M=c.WC_MANIFEST;
ok(W.pending.size===0,'no game artwork loads at application startup');
ok(Object.keys(M.games).length===120,'32 brain and 88 puzzle entries');
for(const g of [...inventory.brain,...inventory.puzzles]){const cfg=M.games[g.id];ok(!!cfg,'mapped '+g.id);ok(fs.existsSync(path.join(base,'watercolor/art',cfg.file+'.webp')),'image exists '+g.id);ok(c.LA.assets(g).includes('wc:'+cfg.file),'unscored loading '+g.id);}
ok(new Set(inventory.brain.filter(g=>g.id!=='scene').map(g=>{const a=M.games[g.id];return a.file})).size===31,'31 distinct brain scenes; fine details retains its four truthful place scenes');
for(const [i,s]of c.SC_SHIRT.entries())for(const hat of [false,true]){const n=i+(hat?5:0),v=c.scPerson(s[1],hat);ok(v.includes('viewBox="'+(n%4*100+29)+' '+(Math.floor(n/4)*100+2)+' 43 96"'),'same shirt and hat');ok(v.includes('xMidYMid meet'),'natural proportions');}
ok(c.LA.sprite('objects-a',0).includes('preserveAspectRatio="xMidYMid meet"'),'sprite natural aspect ratio');ok(c.XF_IDS.size===0,'presentation frame disabled');
for(let i=0;i<8;i++)ok(W.icon(i).includes('viewBox="'+i%4*100+' '+Math.floor(i/4)*100+' 100 100"'),'icon cell '+i);
c.current={id:'piano'};c.header(c.current);ok(play.dataset.wcGame==='piano','same game');
const count=nativeTones;c.tone(300,.1,'sine',.1);ok(nativeTones===count+1,'other sound unchanged');
c.current={id:'pz_stat'};W.stone();ok(created===1,'foley context');ok(nativeTones===count+1,'electronic rotation beep replaced');
time+=100;c.S.st.mute=true;ok(W.stone()===false,'mute stops foley');ok(created===1,'mute no new context');c.S.st.mute=false;W.stopStone();ok(stopped>=2,'audio nodes stop');
c.document.hidden=true;ok(W.stone()===false,'hidden page cannot trigger stone');c.document.hidden=false;c.DX.clock={paused:()=>true};ok(W.stone()===false,'paused game cannot trigger stone');c.DX.clock.paused=()=>false;
const calls=[],ctx={fillStyle:'#14361f',fillRect(...a){calls.push(['native',...a]);return 7},save(){calls.push(['save'])},restore(){calls.push(['restore'])},drawImage(...a){calls.push(['image',...a])}};
W.images.set('racer',{naturalWidth:1000,naturalHeight:1000});W.attachRoad(ctx);ok(ctx.fillRect(0,0,340,260)===7,'native return');ok(calls.filter(x=>x[0]==='native').length===1,'native fill once');ok(calls.filter(x=>x[0]==='image').length===1,'terrain image');ok(calls.at(-1)[0]==='restore','state restored');
ctx.fillStyle='#fff';ctx.fillRect(3,4,10,10);ok(calls.filter(x=>x[0]==='image').length===1,'unrelated fill unchanged');ctx.fillStyle='#14361f';ctx.drawImage=()=>{throw Error('decode')};ok(ctx.fillRect(0,0,340,260)===7,'art failure safe');ok(calls.at(-1)[0]==='restore','failure restores state');
ok(!/S\.st\s*=|S\.save\(|D\.answer\(/.test(fs.readFileSync(path.join(base,'watercolor/app.js'),'utf8')),'no progress/score writes');

c.SC_PLACE=[['السوق','#3A2E52'],['الحديقة','#1F4A35'],['الشاطئ','#1E4A6B'],['المطار','#2E3A5C']];
const stage=body.querySelector('#stage'),scene=new Node('div',{class:'scst'});stage.append(scene);scene.style.getPropertyValue=()=>scene.place;c.current={id:'scene'};
for(let i=0;i<4;i++){scene.place=c.SC_PLACE[i][1];W.decorate();ok(scene.style['--wc-place'].includes('pack-scenes-'+i+'.webp'),'scene setting matches memory question');ok(play.dataset.wcGame==='scene','same scored game');}
Node.prototype.replaceWith=function(n){const p=this.parentElement,i=p.children.indexOf(this);p.children[i]=n;n.parentElement=p;};
const ids=['pz_lock','pz_stat','pz_scale','pz_pipe','pz_river','pz_rush','pz_grid','tol'],puz=body.querySelector('#v-puz'),cards=[];
ids.forEach((id,i)=>{c.GM[id]={name:id};const b=new Node('button',{class:'t7-classic'},new Node('svg'),new Node('b',{text:id}));b.dataset.puzzleId=id;b.onclick=()=>id;cards.push(b);puz.append(b);});
W.images.set('icons',{});W.cards();
cards.forEach((b,i)=>{const el=b.querySelector('.wc-game-icon');ok(el.innerHTML.includes('viewBox="'+i%4*100+' '+Math.floor(i/4)*100+' 100 100"'),'actual card matching icon');ok(b.onclick()===ids[i],'same launch handler');ok(b.attrs['aria-label']===ids[i],'accessible game name');});
W.cards();ok(cards.every(b=>b.querySelectorAll('.wc-game-icon').length===1),'no duplicate icons on repeated render');
puz.children.reverse();cards.forEach(b=>delete b.dataset.wcIcon);W.cards();cards.forEach((b,i)=>ok(b.querySelector('.wc-game-icon').innerHTML.includes('viewBox="'+i%4*100+' '+Math.floor(i/4)*100+' 100 100"'),'card reorder keeps icon identity'));

console.log(JSON.stringify({status:'passed',checks,scope:'source, simulated DOM/canvas/audio; no browser layout or physical playback'}));
