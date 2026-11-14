'use strict';
/* Dedicated raster assets and narrowly scoped drawing adapters. Original answers,
   motion coordinates, collision geometry, event handlers and score clocks are untouched. */
(function(){
const D=window.DA={version:1,images:new Map(),tileURLs:new Map(),sources:{},counter:0},M=window.DEEP_MANIFEST,$=DX.$;
const classic=['penguin','igloo','lampOff','lampOn','door','torch','target','flag','tile','valveAlt','prism','mirrorAlt','crownAlt','north','paper','marble'];
Object.entries(M.worlds).forEach(([file,keys])=>keys.forEach((key,index)=>D.sources[key]={file,index}));
classic.forEach((key,index)=>{if(!D.sources[key])D.sources[key]={file:'classic',index};});D.sources.car={file:'scene-people',index:10};D.sources.truck={file:'scene-people',index:11};
const originalXS=typeof XS_==='undefined'?{}:{...(LA.renderers.landmarkOriginal||XS_)},originalSPR=typeof SPR==='undefined'?{}:{...SPR};
D.graphic=function(key,options={}){const src=D.sources[key];if(!src)return'';if(LA.failed.has(src.file))return originalXS[key]||(typeof originalSPR[key]==='string'?originalSPR[key]:'');const box=M.viewBoxes[key]||'0 0 100 100',parts=box.split(' ').map(Number),w=parts[2],h=parts[3],tile=D.tileURLs.get(src.file+':'+src.index),bounds=options.x==null?'':`x="${options.x}" y="${options.y}" width="${options.width}" height="${options.height}" style="width:${options.width}px;height:${options.height}px"`;if(LA.loaded.has(src.file)&&!tile&&originalXS[key])return originalXS[key];const picture=tile?`<image href="${tile}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none"/>`:LA.sprite(src.file,src.index,{x:0,y:0,width:w,height:h});return `<svg viewBox="${box}" class="da-piece ${options.cls||''}" ${bounds} aria-hidden="true" focusable="false">${picture}</svg>`;};
const spriteObjects={farmer:'🧑‍🌾',wolf:'🐺',sheep:'🐑',grass:'🌿',cat:'🐱',mouse:'🐭',cheese:'🧀',dog:'🐕',hen:'🐔',corn:'🌽',fox:'🦊',hero:'🧑‍🌾',crate:'📦',tree:'🌳',tent:'⛺',tree2:'🌳',tent2:'⛺',tuft:'🌿'};
D.apply=function(){
Object.keys(originalXS).forEach(key=>{if(D.sources[key]&&key!=='X')XS_[key]=D.graphic(key);}); // X is an exact positional marker.

if(typeof SPR!=='undefined'){
 Object.entries(spriteObjects).forEach(([key,emoji])=>{if(typeof SPR[key]==='string')SPR[key]=LA.object(emoji);});
 for(const key of ['torch','target','chest','ghost','rock','flag','penguin','igloo','boulder','gem']){const match={chest:'crate',boulder:'rock'}[key]||key;if(typeof SPR[key]==='string'&&D.sources[match])SPR[key]=D.graphic(match);}
 SPR.chest=LA.object('🧰');
 SPR.crate2=`<svg class="da-crate" viewBox="0 0 64 64">${D.graphic('crate',{x:0,y:0,width:64,height:64})}<path class="ccheck" d="M20 32l8 8 16-17" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
 SPR.worker=`<svg class="da-worker" viewBox="0 0 64 64"><g class="wbody">${D.graphic('engineer',{x:0,y:0,width:64,height:64})}</g></svg>`;
 SPR.penguin2=`<svg class="da-penguin" viewBox="0 0 64 64"><g class="pbody">${D.graphic('penguin',{x:0,y:0,width:64,height:64})}</g></svg>`;
 SPR.bulb=`<svg class="da-lamp" viewBox="0 0 64 64"><g class="da-off">${D.graphic('lampOff',{x:0,y:0,width:64,height:64})}</g><g class="da-on">${D.graphic('lampOn',{x:0,y:0,width:64,height:64})}</g></svg>`;
 SPR.lampOff=D.graphic('lampOff');
 const door0=originalSPR.door;if(typeof door0==='function')SPR.door=function(color){if(LA.failed.has('classic'))return door0(color);return `<svg class="da-door" viewBox="0 0 64 64"><rect x="3" y="2" width="58" height="60" rx="5" fill="${color}"/>${D.graphic('door',{x:7,y:5,width:50,height:54})}</svg>`;};
}

};D.apply();
const object0=LA.object;LA.object=function(key,cls=''){return typeof key==='string'&&key.startsWith('deep:')?D.graphic(key.slice(5),{cls}):object0(key,cls);};
Object.entries(M.puzzles).forEach(([id,key])=>{const g=GM[id];LA.puzzleConfig[id]=[id.includes('lock')?'wood':id.includes('code')||id.includes('lib')?'paper':'stone','deep:'+key,g?.how?.[0]||g?.name||'اقرأ الأدلة ثم شغّل الآلية'];});

// SVG-as-image cannot fetch external sprite sheets. Cache small embedded tiles
// during the unscored loading phase; direct DOM and Canvas still use the atlas.
D.prepareTiles=function(file,im){if(!(file.startsWith('world-')||file==='classic')||!document.createElement)return;try{const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d');if(!ctx||!canvas.toDataURL)return;const sw=im.naturalWidth/4,sh=im.naturalHeight/4;for(let i=0;i<16;i++){ctx.clearRect(0,0,128,128);ctx.drawImage(im,i%4*sw,Math.floor(i/4)*sh,sw,sh,0,0,128,128);D.tileURLs.set(file+':'+i,canvas.toDataURL('image/png'));}}catch(e){/* Retain the original self-contained drawing if embedded tiles cannot be made. */}};
// Store decoded images for both DOM artwork and the existing Canvas render loop.
const load0=LA.load,deepFiles=new Set([...Object.keys(M.worlds),'classic','boards','scene-people','motion']),pending=new Map();
LA.load=function(file){if(!deepFiles.has(file))return load0(file);if(pending.has(file))return pending.get(file);const promise=new Promise(resolve=>{const im=new Image();let settled=false;const finish=ok=>{if(settled)return;settled=true;clearTimeout(timer);(ok?LA.loaded:LA.failed).add(file);if(ok){D.images.set(file,im);D.prepareTiles(file,im);D.apply();if(typeof XIMG!=='undefined')XIMG.clear();if(typeof XMAP_ART!=='undefined')XMAP_ART=null;}else D.restore(file);resolve(ok);};const timer=setTimeout(()=>finish(false),12000);im.onload=()=>{if(im.decode)im.decode().then(()=>finish(true),()=>finish(true));else finish(true);};im.onerror=()=>finish(false);im.src='legacy/art/'+file+'.webp';if(im.complete&&im.naturalWidth)finish(true);});pending.set(file,promise);return promise;};
D.restore=function(file){for(const [key,src]of Object.entries(D.sources))if(src.file===file&&originalXS[key])XS_[key]=originalXS[key];if(file==='classic'||file==='scene-people'||Object.keys(M.worlds).includes(file))for(const key of ['crate2','worker','penguin2','bulb','lampOff','door',...Object.keys(spriteObjects),'torch','target','chest','ghost','rock','flag','penguin','igloo','boulder','gem'])if(originalSPR[key])SPR[key]=originalSPR[key];};
const assets0=LA.assets;LA.assets=function(g){const files=[...assets0(g),'boards'];if(g.puz)files.push(...Object.keys(M.worlds),'classic');if(['scene'].includes(g.id))files.push('scene-people');if(['hawk','dd','racer','mot','juggle'].includes(g.id))files.push('motion');return [...new Set(files)];};

// Keep shirt identity, the hat flag, person count and all scene events unchanged.
const person0=scPerson;scPerson=function(color,hat){const i=SC_SHIRT.findIndex(s=>s[1]===color);if(i<0||LA.failed.has('scene-people'))return person0(color,hat);return `<svg class="da-scene-person" viewBox="0 0 40 70">${LA.sprite('scene-people',i+(hat?5:0),{x:0,y:0,width:40,height:70})}</svg>`;};
function rgb(hsl){const m=/hsl\(\s*([\d.]+)[ ,]+([\d.]+)%[ ,]+([\d.]+)%/.exec(hsl);if(!m)return[1,1,1];const h=(+m[1]%360)/60,s=+m[2]/100,l=+m[3]/100,c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs(h%2-1)),v=l-c/2,t=h<1?[c,x,0]:h<2?[x,c,0]:h<3?[0,c,x]:h<4?[0,x,c]:h<5?[x,0,c]:[c,0,x];return t.map(n=>+(n+v).toFixed(6));}
D.rgb=rgb;
const bird0=birdSVG;birdSVG=function(b){if(LA.failed.has('motion'))return bird0(b);const id='da-bird-'+(++D.counter),col=rgb(b.c),values=col.map(v=>[.2126*v,.7152*v,.0722*v,0,0].join(' ')).join(' ')+' 0 0 0 1 0',picture=LA.sprite('motion',b.w?0:1,{x:0,y:0,width:40,height:30,cols:2,rows:3});return `<svg class="da-bird" viewBox="0 0 40 30"><defs><filter id="${id}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${values}"/></filter></defs><g filter="url(#${id})" transform="${b.f<0?'translate(40 0) scale(-1 1)':''}">${picture}</g></svg>`;};

// Themes are attached to the current board, not just to the menu card.
function theme(g){if(!g||g.kid)return;const p=$('#play'),n=M.brainBoards[g.id]??(g.puz?14:0);p.style.setProperty('--da-board-x',(n%4)*100/3+'%');p.style.setProperty('--da-board-y',Math.floor(n/4)*100/3+'%');p.dataset.daBoard=String(n);}
const header0=header;header=function(g){header0(g);theme(g);};
D.decorate=function(){const p=$('#play'),stage=$('#stage');if(!p||!stage||p.hidden)return;const g=curGame();if(!g||g.kid)return;theme(g);const scene=stage.querySelector('.scst');if(scene){const color=scene.style.getPropertyValue('--bg').trim(),i=SC_PLACE.findIndex(x=>x[1]===color),n=9+Math.max(0,i);scene.style.setProperty('--da-scene-x',(n%4)*100/3+'%');scene.style.setProperty('--da-scene-y',Math.floor(n/4)*100/3+'%');}
 // The scored DD stimulus is changed before the next paint, only after decode.
 if(g.id==='dd'&&D.images.has('motion')){const car=stage.querySelector('.ddc');if(car&&!car.dataset.daPainted){const svg=car.querySelector('svg'),truck=svg?.firstElementChild?.tagName.toLowerCase()==='rect';if(svg){car.dataset.daPainted='1';car.innerHTML=LA.sprite('motion',truck?5:4,{cols:2,rows:3});}}}
};
new MutationObserver(D.decorate).observe($('#stage'),{childList:true,subtree:true});
D.theme=theme;D.motionEnabled=['mot','juggle','racer'];

// Add bitmap shading to the exact existing circles/car rectangle. A Path2D clip
// does not replace the current canvas path, so subsequent native strokes are unchanged.
D.attachCanvas=function(ctx,game){if(!ctx||ctx.__daArtwork||!D.motionEnabled.includes(game))return ctx;ctx.__daArtwork=true;let shape=null;const native={beginPath:ctx.beginPath.bind(ctx),arc:ctx.arc.bind(ctx),fill:ctx.fill.bind(ctx),rect:ctx.rect.bind(ctx),roundRect:ctx.roundRect?.bind(ctx)};
 ctx.beginPath=function(...a){shape=null;return native.beginPath(...a);};
 ctx.arc=function(...a){const w=ctx.canvas.width/(window.devicePixelRatio||1);if(game!=='racer'&&a[2]>=Math.max(5,w*.025)&&Math.abs(a[4]-a[3])>6)shape={type:'ball',x:a[0],y:a[1],r:a[2]};return native.arc(...a);};
 const rect=(fn,a)=>{if(game==='racer'&&a[2]>0&&a[3]>a[2]*1.4)shape={type:'car',x:a[0],y:a[1],w:a[2],h:a[3]};return fn(...a);};ctx.rect=function(...a){return rect(native.rect,a);};if(native.roundRect)ctx.roundRect=function(...a){return rect(native.roundRect,a);};
 ctx.fill=function(...a){const result=native.fill(...a),im=D.images.get('motion');if(a.length||!shape||!im||typeof Path2D==='undefined')return result;const s=shape,clip=new Path2D(),sw=im.naturalWidth/2,sh=im.naturalHeight/3,index=s.type==='ball'?3:2;ctx.save();try{if(s.type==='ball'){clip.arc(s.x,s.y,s.r*.9,0,Math.PI*2);ctx.clip(clip);ctx.globalAlpha*=.32;ctx.globalCompositeOperation='luminosity';ctx.drawImage(im,index%2*sw,Math.floor(index/2)*sh,sw,sh,s.x-s.r*1.22,s.y-s.r*1.22,s.r*2.44,s.r*2.44);}else{clip.rect(s.x+s.w*.12,s.y+s.h*.08,s.w*.76,s.h*.84);ctx.clip(clip);ctx.globalAlpha*=.65;ctx.globalCompositeOperation='luminosity';ctx.drawImage(im,index%2*sw,Math.floor(index/2)*sh,sw,sh,s.x+s.w*.05,s.y,s.w*.9,s.h);}}catch(e){/* The original fill already rendered a usable stimulus. */}finally{ctx.restore();}return result;};
 return ctx;};
if(typeof HTMLCanvasElement!=='undefined'){const nativeContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){const ctx=nativeContext.call(this,type,...args);if(type==='2d'&&['cv','rc'].includes(this.id)){let g;try{g=curGame();}catch(e){}if(g)D.attachCanvas(ctx,g.id);}return ctx;};}
renderAll();
})();
