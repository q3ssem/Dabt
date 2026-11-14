'use strict';
/* Presentation only: original generators, score, timing and controls are authoritative. */
(function(){
const W=window.Watercolor={version:'4.2.1',images:new Map(),failed:new Set(),pending:new Map()},$=DX.$,M=window.WC_MANIFEST;
const oldSprite=LA.sprite,oldCar=carSVG,oldPerson=scPerson,oldLoad=LA.load,oldAssets=LA.assets;
W.fitMarkup=s=>s.replace('preserveAspectRatio="none"','preserveAspectRatio="xMidYMid meet"');
LA.sprite=function(){return W.fitMarkup(oldSprite.apply(this,arguments));};
carSVG=function(){return W.fitMarkup(oldCar.apply(this,arguments));};
scPerson=function(color,hat){const i=SC_SHIRT.findIndex(s=>s[1]===color);if(i<0||LA.failed.has('scene-people'))return oldPerson(color,hat);const n=i+(hat?5:0),x=n%4*100+29,y=Math.floor(n/4)*100+2;return '<svg class="wc-person" viewBox="'+x+' '+y+' 43 96" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><image href="legacy/art/scene-people.webp" width="400" height="400" preserveAspectRatio="none"/></svg>';};
W.asset=function(file){
 if(W.images.has(file))return Promise.resolve(true);if(W.failed.has(file))return Promise.resolve(false);if(W.pending.has(file))return W.pending.get(file);
 const promise=new Promise(resolve=>{const im=new Image();let settled=false;const finish=ok=>{if(settled)return;settled=true;clearTimeout(timer);if(ok)W.images.set(file,im);else W.failed.add(file);resolve(ok);};const timer=setTimeout(()=>finish(false),12000);
 im.onload=()=>{if(im.decode)im.decode().then(()=>finish(true),()=>finish(true));else finish(true);};im.onerror=()=>finish(false);im.src='watercolor/art/'+file+'.webp';if(im.complete&&im.naturalWidth)finish(true);});W.pending.set(file,promise);return promise;
};
// Absolute URL: a relative url() inside a CSS custom property resolves against watercolor/style.css, not the page (4.2 bug: watercolor/watercolor/art/... 404).
W.abs=rel=>{try{return new URL(rel,document.baseURI).href;}catch(e){return rel;}};
W.url=c=>c?W.abs('watercolor/art/'+c.file+'.webp'):'';
LA.load=f=>f.startsWith('wc:')?W.asset(f.slice(3)):oldLoad(f);
LA.assets=function(g){const out=oldAssets(g),c=M.games[g.id];if(g.id==='scene')for(let i=0;i<4;i++)out.push('wc:pack-scenes-'+i);else if(c)out.push('wc:'+c.file);return [...new Set(out)];};
W.current=function(){try{return curGame();}catch(e){return null;}};
W.apply=function(g){const p=$('#play');if(!p||!g||g.kid)return;const c=M.games[g.id];if(!c)return;if(g.id!=='scene')W.asset(c.file);p.classList.add('wc-play');p.dataset.wcGame=g.id;p.dataset.wcFamily=c.family;p.classList.remove('xframe');const u=W.url(c);if(u)p.style.setProperty('--wc-scene','url("'+u+'")');else p.style.removeProperty('--wc-scene');p.style.setProperty('--wc-accent',c.accent||'#487b76');};
// XF_IDS is solely the old decorative frame list.
window.XF_IDS=new Set();
const h0=header;header=function(g){h0(g);W.apply(g);};
const close0=closePlay;closePlay=function(){close0();const p=$('#play');p.classList.remove('wc-play');delete p.dataset.wcGame;delete p.dataset.wcFamily;p.style.removeProperty('--wc-scene');W.stopStone();};$('#quit').onclick=closePlay;
W.decorate=function(){const p=$('#play');if(!p||p.hidden)return;const g=W.current();W.apply(g);if(g?.id==='scene'){const sc=$('#stage').querySelector('.scst');if(sc){const bg=sc.style.getPropertyValue('--bg').trim(),i=SC_PLACE.findIndex(a=>a[1]===bg),u=W.url({file:'pack-scenes-'+Math.max(0,i)});if(u)sc.style.setProperty('--wc-place','url("'+u+'")');}}};
new MutationObserver(W.decorate).observe($('#stage'),{childList:true,subtree:true});
W.icon=i=>'<svg class="wc-icon" viewBox="'+i%4*100+' '+Math.floor(i/4)*100+' 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><image href="watercolor/art/icons.webp" width="400" height="200" preserveAspectRatio="none"/></svg>';
W.iconById={pz_lock:0,pz_stat:1,pz_scale:2,pz_pipe:3,pz_river:4,pz_rush:5,pz_grid:6,tol:7};
W.cards=function(){
 if(typeof curTab!=='undefined'&&curTab!=='puz')return;
 const cards=[...document.querySelectorAll('.t7-classic'),...document.querySelectorAll('.la-library-card')];
 if(!cards.length||W.failed.has('icons'))return;
 if(!W.images.has('icons')){W.asset('icons').then(ok=>{if(ok)W.cards();});return;}
 cards.forEach(b=>{const id=b.dataset.puzzleId||b.dataset.legacyPuzzle,i=W.iconById[id];if(i==null||b.dataset.wcIcon===id)return;
 const box=b.querySelector('.la-library-image')||b.querySelector('.wc-game-icon');if(box)box.innerHTML=W.icon(i);else{const icon=document.createElement('span');icon.className='wc-game-icon';icon.innerHTML=W.icon(i);const old=b.querySelector('svg');if(old)old.replaceWith(icon);else b.prepend(icon);}b.dataset.wcIcon=id;b.setAttribute('aria-label',GM[id]?.name||b.textContent);});
};
new MutationObserver(W.cards).observe($('#v-puz'),{childList:true,subtree:true});
// Paint terrain beneath the same exact native road path and collision geometry.
W.attachRoad=function(ctx){if(!ctx||ctx.__wcTerrain)return ctx;ctx.__wcTerrain=true;const fill=ctx.fillRect.bind(ctx);ctx.fillRect=function(x,y,w,h){const value=fill(x,y,w,h),im=W.images.get('racer');if(im&&ctx.fillStyle==='#14361f'&&x===0&&y===0&&w>100&&h>100){ctx.save();try{const s=Math.max(w/im.naturalWidth,h/im.naturalHeight),dw=im.naturalWidth*s,dh=im.naturalHeight*s;ctx.drawImage(im,(w-dw)/2,(h-dh)/2,dw,dh);}catch(e){/* Native fill remains usable. */}finally{ctx.restore();}}return value;};return ctx;};
if(typeof HTMLCanvasElement!=='undefined'){const get0=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type){const ctx=get0.apply(this,arguments);return type==='2d'&&this.id==='rc'&&W.current()?.id==='racer'?W.attachRoad(ctx):ctx;};}
// Synthesised Foley, not a claimed field recording: friction, low body, settling knock.
let stoneContext=null,stoneNodes=[],lastStone=0;
W.stopStone=function(){stoneNodes.forEach(n=>{try{n.stop();}catch(e){}});stoneNodes=[];};
W.stone=function(){if(document.hidden){W.stopStone();return false;}if(S.st.mute){W.stopStone();return false;}if(DX.clock?.paused?.())return false;try{const now=performance.now();if(now-lastStone<75)return true;lastStone=now;const ACtor=window.AudioContext||window.webkitAudioContext;if(!ACtor)return false;stoneContext=stoneContext||new ACtor();const a=stoneContext;if(a.state==='suspended')a.resume().catch(()=>{});W.stopStone();const t=a.currentTime,d=.5,buffer=a.createBuffer(1,Math.ceil(a.sampleRate*d),a.sampleRate),v=buffer.getChannelData(0);let brown=0;for(let i=0;i<v.length;i++){const u=i/a.sampleRate,p=u/d;brown=(brown+(Math.random()*2-1)*.055)/1.035;const grain=(Math.random()*2-1)*(.4+.6*Math.sin(i*.027)**2),env=Math.min(1,u/.035)*(1-p)**1.5;v[i]=(brown*2+grain*.28)*env;}const src=a.createBufferSource(),filter=a.createBiquadFilter(),gain=a.createGain();src.buffer=buffer;filter.type='lowpass';filter.frequency.value=450;gain.gain.value=.24;src.connect(filter);filter.connect(gain);gain.connect(a.destination);src.start(t);stoneNodes.push(src);const knock=a.createOscillator(),kg=a.createGain();knock.type='sine';knock.frequency.setValueAtTime(95,t+.36);knock.frequency.exponentialRampToValueAtTime(43,t+.49);kg.gain.setValueAtTime(.0001,t);kg.gain.setValueAtTime(.09,t+.36);kg.gain.exponentialRampToValueAtTime(.0001,t+.51);knock.connect(kg);kg.connect(a.destination);knock.start(t+.36);knock.stop(t+.52);stoneNodes.push(knock);return true;}catch(e){return false;}};
document.addEventListener('visibilitychange',()=>{if(document.hidden)W.stopStone();});document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#dxPauseBtn,#quit,#mt'))W.stopStone();},true);
window.addEventListener('pagehide',()=>W.stopStone());
const pause0=DX.pause;if(pause0)DX.pause=function(){W.stopStone();return pause0.apply(this,arguments);};
W.apply(W.current());W.cards();
})();
