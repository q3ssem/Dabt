'use strict';
/* Presentation only: original generators, score, timing and controls are authoritative. */
(function(){
const W=window.Watercolor={version:'4.2.3',images:new Map(),failed:new Set(),pending:new Map()},$=DX.$,M=window.WC_MANIFEST;
const oldSprite=LA.sprite,oldCar=carSVG,oldPerson=scPerson,oldLoad=LA.load,oldAssets=LA.assets;
// Keep natural proportions (meet) AND clip to the sprite's own cell: with meet a non-square box would otherwise
// reveal slivers of the neighbouring atlas cells (4.2.1: guitar, cactus, hawk birds).
W.fitMarkup=s=>{const m=/^(<svg\b[^>]*viewBox="([\d.-]+) ([\d.-]+) ([\d.]+) ([\d.]+)"[^>]*>)([\s\S]*)(<\/svg>)$/.exec(s);if(!m)return s.replace('preserveAspectRatio="none"','preserveAspectRatio="xMidYMid meet"');const[,open,x,y,w,h,body,close]=m;return open.replace('preserveAspectRatio="none"','preserveAspectRatio="xMidYMid meet"')+'<svg x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" viewBox="'+x+' '+y+' '+w+' '+h+'" overflow="hidden">'+body+'</svg>'+close;};
LA.sprite=function(file,index,o){let m=oldSprite.apply(this,arguments);const B=/^(objects|world)-/.test(file)&&window.WC_SPRITE_BOXES&&WC_SPRITE_BOXES[file],b=B&&(!o||((o.cols||4)===4&&(o.rows||4)===4))&&B[index];
 /* 4.2.3: frame each object by its own content so icons and objects fill their boxes evenly */
 if(b)m=m.replace(/viewBox="[^"]*"/,'viewBox="'+b[0]+' '+b[1]+' '+b[2]+' '+b[2]+'"');return W.fitMarkup(m);};
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
LA.assets=function(g){const out=oldAssets(g),c=M.games[g.id];if(g.id==='scene')for(let i=0;i<4;i++)out.push('wc:pack-scenes-'+i);/* 4.2.3: no decorative backdrops are preloaded */return [...new Set(out)];};
W.current=function(){try{return curGame();}catch(e){return null;}};
W.apply=function(g){const p=$('#play');if(!p||!g||g.kid)return;const c=M.games[g.id];if(!c)return;p.classList.add('wc-play');p.dataset.wcGame=g.id;p.dataset.wcFamily=c.family;p.classList.remove('xframe');/* 4.2.3: solid night surfaces — no painted backdrop */p.style.removeProperty('--wc-scene');p.style.setProperty('--wc-accent',c.accent||'#487b76');};
// XF_IDS is solely the old decorative frame list.
window.XF_IDS=new Set();
const h0=header;header=function(g){h0(g);W.apply(g);};
const close0=closePlay;closePlay=function(){close0();const p=$('#play');p.classList.remove('wc-play');delete p.dataset.wcGame;delete p.dataset.wcFamily;p.style.removeProperty('--wc-scene');W.stopStone();};$('#quit').onclick=closePlay;
W.decorate=function(){const p=$('#play');if(!p||p.hidden)return;const g=W.current();W.apply(g);if(g?.id==='scene'){const sc=$('#stage').querySelector('.scst');if(sc){const bg=sc.style.getPropertyValue('--bg').trim(),i=SC_PLACE.findIndex(a=>a[1]===bg),u=W.url({file:'pack-scenes-'+Math.max(0,i)});if(u)sc.style.setProperty('--wc-place','url("'+u+'")');}}};
new MutationObserver(W.decorate).observe($('#stage'),{childList:true,subtree:true});
/* 5.1: one cropped file per library icon (the shared atlas let neighbouring cells show at the edges). */
W.icon=i=>'<svg class="wc-icon" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><image href="watercolor/art/icon-'+i+'.webp" width="100" height="100"/></svg>';
W.iconById={pz_lock:0,pz_stat:1,pz_scale:2,pz_pipe:3,pz_river:4,pz_rush:5,pz_grid:6,tol:7};
/* 5.4: hand-painted 2D icons in the same maritime storybook direction as the island crew. */
W.iconArtById={
 pz_xlock:'lock',pz_plock:'key',
 pz_pvalve:'lever',pz_parm:'gear',pz_zcomp:'compass',
 pz_zroute:'boat',pz_yhold:'boat',pz_abridge:'bridge',
 pz_stroke:'map',pz_tmap:'map',pz_ymap:'map',
 pz_pmirror:'mirror',pz_zshadow:'mirror',pz_wlake:'mirror',
 pz_zstars:'crystal',pz_tdig:'pearlstand',pz_xloot:'chest',
 pz_ybell:'bell',pz_ashell:'shell',pz_alight:'lantern'
};
W.iconArtUrl=name=>W.abs('watercolor/art/icons54/'+name+'.webp');
/* 4.2.3: library icons — show the sprite itself as a square, framed by its own content (some cards reused an
   in-puzzle piece with a 30×12 box, so the icon came out tiny). */
W.squareIcon=function(box){if(!box||box.dataset.wcSq)return;const ls=box.querySelector('svg.la-sprite');if(!ls)return;box.dataset.wcSq='1';
 Object.entries({x:'0',y:'0',width:'100%',height:'100%'}).forEach(([a,v])=>ls.setAttribute(a,v));ls.removeAttribute('style');const im=ls.querySelector('image'),f=(im&&(im.getAttribute('href')||'').match(/art\/([\w-]+)\.webp/)||[])[1],B=f&&window.WC_SPRITE_BOXES&&WC_SPRITE_BOXES[f],vb=(ls.getAttribute('viewBox')||'').split(' ').map(Number);
 if(B&&vb.length===4){const i=Math.floor(vb[1]/100)*4+Math.floor(vb[0]/100),k=B[i];if(k)ls.setAttribute('viewBox',k.join(' ')+' '+k[2]);}
 if(box.firstElementChild!==ls)box.replaceChildren(ls);};
W.cards=function(){
 if(typeof curTab!=='undefined'&&curTab!=='puz')return;
 const cards=[...document.querySelectorAll('.t7-classic'),...document.querySelectorAll('.la-library-card')];
 if(!cards.length||W.failed.has('icon-0'))return;
 if(!W.images.has('icon-0')){W.asset('icon-0').then(ok=>{if(ok)W.cards();});return;}
 cards.forEach(b=>W.squareIcon(b.querySelector('.la-library-image')));cards.forEach(b=>{const id=b.dataset.puzzleId||b.dataset.legacyPuzzle,i=W.iconById[id],art=W.iconArtById[id];if((i==null&&!art)||b.dataset.wcIcon===id)return;
 const box=b.querySelector('.la-library-image')||b.querySelector('.wc-game-icon');
 const markup=art?'<img class="wc-icon-art" src="'+W.iconArtUrl(art)+'" alt="" loading="lazy">':W.icon(i);
 if(box)box.innerHTML=markup;else{const icon=document.createElement('span');icon.className='wc-game-icon';icon.innerHTML=markup;const old=b.querySelector('svg');if(old)old.replaceWith(icon);else b.prepend(icon);}
 b.querySelectorAll('.t7-sprite').forEach(e=>e.remove());/* one icon per card */b.dataset.wcIcon=id;b.setAttribute('aria-label',GM[id]?.name||b.textContent);});
};
new MutationObserver(W.cards).observe($('#v-puz'),{childList:true,subtree:true});
// Paint terrain beneath the same exact native road path and collision geometry.
W.attachRoad=function(ctx){if(!ctx||ctx.__wcTerrain)return ctx;ctx.__wcTerrain=true;const fill=ctx.fillRect.bind(ctx);ctx.fillRect=function(x,y,w,h){const value=fill(x,y,w,h),im=W.images.get('racer');if(im&&ctx.fillStyle==='#14361f'&&x===0&&y===0&&w>100&&h>100){ctx.save();try{const s=Math.max(w/im.naturalWidth,h/im.naturalHeight),dw=im.naturalWidth*s,dh=im.naturalHeight*s;ctx.drawImage(im,(w-dw)/2,(h-dh)/2,dw,dh);}catch(e){/* Native fill remains usable. */}finally{ctx.restore();}}return value;};return ctx;};
LA.canvasHook((ctx,canvas)=>{if(canvas.id==='rc'&&W.current()?.id==='racer')W.attachRoad(ctx);});
// Synthesised Foley, not a claimed field recording: friction, low body, settling knock.
let stoneContext=null,stoneNodes=[],lastStone=0,stoneBuffer=null,stoneRate=0;
W.stopStone=function(){stoneNodes.forEach(n=>{try{n.stop();}catch(e){}});stoneNodes=[];};
// The rotation Foley plays through the app's one AudioContext and master chain (same mute, compressor and idle
// suspend as every other sound). A private context is created only where the engine has none (isolated tests).
const stoneOutput=function(){if(typeof acInit==='function'){if(typeof audioOK==='function'&&!audioOK())return null;const a=acInit();return a?[a,typeof MASTER!=='undefined'&&MASTER?MASTER:a.destination]:null;}const ACtor=window.AudioContext||window.webkitAudioContext;if(!ACtor)return null;stoneContext=stoneContext||new ACtor();if(stoneContext.state==='suspended')stoneContext.resume().catch(()=>{});return [stoneContext,stoneContext.destination];};
// One friction texture per sample rate; each turn reuses it with a slight pitch change instead of re-synthesising 0.5 s.
const stoneTexture=function(a){if(stoneBuffer&&stoneRate===a.sampleRate)return stoneBuffer;const d=.5,buffer=a.createBuffer(1,Math.ceil(a.sampleRate*d),a.sampleRate),v=buffer.getChannelData(0);let brown=0;for(let i=0;i<v.length;i++){const u=i/a.sampleRate,p=u/d;brown=(brown+(Math.random()*2-1)*.055)/1.035;const grain=(Math.random()*2-1)*(.4+.6*Math.sin(i*.027)**2),env=Math.min(1,u/.035)*(1-p)**1.5;v[i]=(brown*2+grain*.28)*env;}stoneBuffer=buffer;stoneRate=a.sampleRate;return buffer;};
W.stone=function(){if(document.hidden){W.stopStone();return false;}if(S.st.mute){W.stopStone();return false;}if(DX.clock?.paused?.())return false;try{const now=performance.now();if(now-lastStone<75)return true;lastStone=now;const out=stoneOutput();if(!out)return false;const [a,dest]=out;W.stopStone();const t=a.currentTime,src=a.createBufferSource(),filter=a.createBiquadFilter(),gain=a.createGain();src.buffer=stoneTexture(a);if(src.playbackRate)src.playbackRate.value=.96+Math.random()*.08;filter.type='lowpass';filter.frequency.value=450;gain.gain.value=.24;src.connect(filter);filter.connect(gain);gain.connect(dest);src.start(t);stoneNodes.push(src);const knock=a.createOscillator(),kg=a.createGain();knock.type='sine';knock.frequency.setValueAtTime(95,t+.36);knock.frequency.exponentialRampToValueAtTime(43,t+.49);kg.gain.setValueAtTime(.0001,t);kg.gain.setValueAtTime(.09,t+.36);kg.gain.exponentialRampToValueAtTime(.0001,t+.51);knock.connect(kg);kg.connect(dest);knock.start(t+.36);knock.stop(t+.52);stoneNodes.push(knock);const done=()=>{try{src.disconnect();filter.disconnect();gain.disconnect();knock.disconnect();kg.disconnect();}catch(e){}};knock.onended=done;return true;}catch(e){return false;}};
document.addEventListener('visibilitychange',()=>{if(document.hidden)W.stopStone();});document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#dxPauseBtn,#quit,#mt'))W.stopStone();},true);
window.addEventListener('pagehide',()=>W.stopStone());
const pause0=DX.pause;if(pause0)DX.pause=function(){W.stopStone();return pause0.apply(this,arguments);};
W.apply(W.current());W.cards();
})();
