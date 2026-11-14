/* Treasure Island 5.0 · pure puzzle logic (no DOM), shared by the boards, the tests and backup validation. */
(function(root){
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

/* ----- Sea 1: locks, cipher, mirrors ----- */
function locksCan(t,v,i){return t.rules[i].every(([j,want])=>v[j]===want);}
function locksMove(t,v,i){if(!locksCan(t,v,i))return null;const n=v.slice();n[i]=1-n[i];return n;}
// cipher: positions 0 top,1 right,2 bottom,3 left (clockwise on screen). v[pos]=symbol.
function cipherOk(t,v){const at=sym=>v.indexOf(sym),cw=p=>(p+1)%4,opp=p=>(p+2)%4;
 return new Set(v).size===4&&at(t.north)===t.northPos&&opp(at(t.oppA))===at(t.oppB)&&cw(at(t.cwFrom))===at(t.cwTo);}
function mirrorTrace(t,v){const [sr,sc]=t.source;let r=sr,c=sc,dr=t.dir[0],dc=t.dir[1];const path=[[r,c,dr,dc]],seen=new Set();
 for(let k=0;k<200;k++){r+=dr;c+=dc;if(r<1||c<1||r>t.n||c>t.n)return{path,hit:false,exit:[r,c]};
  if(r===t.lens[0]&&c===t.lens[1]){path.push([r,c,dr,dc]);return{path,hit:true};}
  const key=[r,c,dr,dc].join(',');if(seen.has(key))return{path,hit:false};seen.add(key);
  const m=t.mirrors.findIndex(p=>p[0]===r&&p[1]===c);const inDir=[dr,dc];
  if(m>=0){if(v[m]===1)[dr,dc]=[-dc,-dr];else [dr,dc]=[dc,dr];}
  path.push([r,c,inDir[0],inDir[1],dr,dc,m]);}
 return{path,hit:false};}

/* ----- Seas 2–7 ----- */
// torn map: v[pos]=piece index; piece edges [top,right,bottom,left], 0 = coast (must face outward), n>0 = half-joint n.
function tornEdgeOk(t,v,pos,side){const c=t.cols,r=Math.floor(pos/c),k=pos%c,e=t.pieces[v[pos]][side];
 const nb=side===0?(r>0?pos-c:-1):side===1?(k<c-1?pos+1:-1):side===2?(r<t.rows-1?pos+c:-1):(k>0?pos-1:-1);
 if(nb<0)return e===0;return e!==0&&t.pieces[v[nb]][(side+2)%4]===e;}
function tornOk(t,v){for(let p=0;p<v.length;p++)for(let sd=0;sd<4;sd++)if(!tornEdgeOk(t,v,p,sd))return false;return true;}
// chime: v = struck bells in order; a wrong full sequence is cleared by the board.
function chimeOk(t,v){if(v.length!==4||new Set(v).size!==4)return false;const at=b=>v.indexOf(b);
 return t.rules.every(r=>r[0]==='adjacent'?at(r[2])===at(r[1])+1:r[0]==='notEnds'?(at(r[1])!==0&&at(r[1])!==3):r[0]==='before'?at(r[1])<at(r[2]):true);}
function chimeStrike(t,v,b){if(v.includes(b)||v.length>=4)return null;const n=[...v,b];return n.length===4&&!chimeOk(t,n)?[]:n;}
// linked statues: touching i turns every statue in links[i] a quarter clockwise.
function linkedTurn(t,v,i){const n=v.slice();t.links[i].forEach(j=>{n[j]=(n[j]+1)%4});return n;}
// tide: v=[node,level]; level 0 = low water, 1 = high water.
function tideOpen(t,a,b,level){return t.edges.some(([x,y,l])=>l===level&&((x===a&&y===b)||(x===b&&y===a)));}
function tideMoves(t,v){const out=[[v[0],1-v[1]]];t.edges.forEach(([x,y,l])=>{if(l!==v[1])return;if(x===v[0])out.push([y,v[1]]);else if(y===v[0])out.push([x,v[1]]);});return out;}
// weigh: v=[heavy,stage,p0..p8,r1,r2]; p:0 tray,1 left pan,2 right pan,3 ruled out; r:-1 none,0 level,1 left down,2 right down.
function weighParts(v){return{heavy:v[0],stage:v[1],p:v.slice(2,11),r1:v[11],r2:v[12]};}
function weighPack(o){return[o.heavy,o.stage,...o.p,o.r1,o.r2];}
function weighPlace(t,v,i){const o=weighParts(v);if(o.stage>1||o.p[i]===3)return null;const cap=o.stage===0?3:1,cnt=k=>o.p.filter(x=>x===k).length;let nx=o.p[i];
 for(let k=0;k<3;k++){nx=(nx+1)%3;if(nx===0||cnt(nx)<cap)break;}if(nx===o.p[i])return null;o.p=o.p.slice();o.p[i]=nx;return weighPack(o);}
function weighReady(v){const o=weighParts(v),cnt=k=>o.p.filter(x=>x===k).length;return o.stage===0?cnt(1)===3&&cnt(2)===3:o.stage===1?cnt(1)===1&&cnt(2)===1:false;}
function weighNow(t,v){if(!weighReady(v))return null;const o=weighParts(v),side=o.p[o.heavy],res=side===1?1:side===2?2:0;
 if(o.stage===0){const keep=res===1?1:res===2?2:0;o.p=o.p.map(x=>x===keep?0:3);o.r1=res;o.stage=1;}else{o.r2=res;o.stage=2;}return weighPack(o);}
function weighDeduced(v){const o=weighParts(v);if(o.stage<2)return -1;return o.r2===1?o.p.indexOf(1):o.r2===2?o.p.indexOf(2):o.p.findIndex(x=>x===0);}
function weighPick(t,v,i){const o=weighParts(v);if(o.stage!==2)return null;if(i!==weighDeduced(v))return false;o.stage=3;return weighPack(o);}
// valves: gate states; water flows source→A→B→(C,D)→basins; any active wrong outlet is waste.
function valvesFlow(t,v){const [a,b,c,d]=v,out={toB:a===1,wasteA:a===0,left:false,right:false,wasteC:false,wasteD:false,toC:false,toD:false};
 if(a===1){out.toC=b===0||b===2;out.toD=b===1||b===2;}if(out.toC){if(c===1)out.left=true;else out.wasteC=true;}if(out.toD){if(d===0)out.right=true;else out.wasteD=true;}return out;}
function valvesOk(t,v){const f=valvesFlow(t,v);return f.left&&f.right&&!f.wasteA&&!f.wasteC&&!f.wasteD;}


const sw=(a,i,j)=>{const n=a.slice();[n[i],n[j]]=[n[j],n[i]];return n;};
const pairs=n=>{const o=[];for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)o.push([i,j]);return o;};
// slide: 3×3, 0 = gap; a tile next to the gap slides into it.
function slideMove(v,i){const z=v.indexOf(0);if(Math.abs(i%3-z%3)+Math.abs(Math.floor(i/3)-Math.floor(z/3))!==1)return null;return sw(v,i,z);}
// lights: pressing a crystal flips it and its orthogonal neighbours (no wrap).
function lightsPress(v,i){const n=v.slice(),r=Math.floor(i/3),c=i%3;[[0,0],[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc])=>{const R=r+dr,C=c+dc;if(R>=0&&R<3&&C>=0&&C<3)n[R*3+C]^=1;});return n;}
// scales: v[k] = piece on scale k (0 feather,1 leaf,2 crystal); refs[k] = hidden reference weight. tilt: -1 piece lighter, 0 level, 1 heavier.
function scaleTilt(t,v,k){const w=t.weights[v[k]],r=t.refs[k];return w<r?-1:w>r?1:0;}
// ropes: v=[A,B,C,D present, strained pin or -1]; a pin comes out only when the loop over it is gone.
function ropePull(t,v,i){if(v[4]>=0||!v[i])return null;const n=v.slice(),c=t.cover[i];if(c>=0&&v[c])n[4]=i;else n[i]=0;return n;}
function ropeRelease(v){if(v[4]<0)return null;const n=v.slice();n[4]=-1;return n;}
// gear train: radii motor, slots…, output; a contact is good when the gap equals the sum of radii.
function gearContacts(t,v){const r=[t.motor,...v.map(g=>t.radii[g]),t.output];return r.slice(1).map((x,k)=>t.centers[k+1]-t.centers[k]-(r[k]+x));}
function gearRun(t,v){const c=gearContacts(t,v);let k=0;while(k<c.length&&c[k]===0)k++;return k;}
// drums: three cylinders 0 closed,1 side,2 open; rules[i] = [[j,want],…] needed before i can advance.
function drumCan(t,v,i){return t.rules[i].every(([j,w])=>v[j]===w);}
function drumMove(t,v,i){if(!drumCan(t,v,i))return null;const n=v.slice();n[i]=(n[i]+1)%3;return n;}
// push: two identical stones [r1,c1,r2,c2] kept sorted; a stone moves one cell if the cell ahead and the cell behind it are free.
function pushFree(t,v,r,c){return r>=0&&c>=0&&r<t.n&&c<t.n&&!t.walls.some(w=>w[0]===r&&w[1]===c)&&!((v[0]===r&&v[1]===c)||(v[2]===r&&v[3]===c));}
function pushMove(t,v,k,d){const [dr,dc]=[[-1,0],[0,1],[1,0],[0,-1]][d],r=v[k*2],c=v[k*2+1],o=v.slice(2-k*2,4-k*2);
 if(!pushFree(t,v,r+dr,c+dc)||!pushFree(t,v,r-dr,c-dc))return null;const a=[[r+dr,c+dc],o].sort((x,y)=>x[0]-y[0]||x[1]-y[1]);return[...a[0],...a[1]];}
// stroke: v = edges drawn in order; the pen is at the end of the drawn trail.
function strokeAt(t,v){let n=t.pen;for(const e of v){const [a,b]=t.edges[e];n=n===a?b:a;}return n;}
function strokeDraw(t,v,e){if(v.includes(e))return null;const [a,b]=t.edges[e],n=strokeAt(t,v);if(a!==n&&b!==n)return null;return[...v,e];}
function strokeValid(t,v){let n=t.pen;const seen=new Set();for(const e of v){if(!Number.isInteger(e)||e<0||e>=t.edges.length||seen.has(e))return false;const [a,b]=t.edges[e];if(a!==n&&b!==n)return false;n=n===a?b:a;seen.add(e);}return true;}
// hanoi: v[k] = peg of disc k (0 smallest). Only the top disc moves, never onto a smaller one.
function hanoiTop(v,p){const k=v.findIndex(x=>x===p);return k;}
function hanoiMove(v,from,to){if(from===to)return null;const k=hanoiTop(v,from);if(k<0)return null;const top=hanoiTop(v,to);if(top>=0&&top<k)return null;const n=v.slice();n[k]=to;return n;}
// river: v=[boat,a,b,c] sides 0/1; the boat crosses with at most one item from its own bank; t.clash pairs may not be left alone.
function riverSafe(t,v){return t.clash.every(([a,b])=>!(v[a+1]===v[b+1]&&v[a+1]!==v[0]));}
function riverCross(t,v,k){if(k>=0&&v[k+1]!==v[0])return null;const n=v.slice();n[0]=1-n[0];if(k>=0)n[k+1]=n[0];return n;}
// frogs: 1 sails right, 2 sails left, 0 gap; step into the gap or hop over one boat of the other kind.
function frogMove(v,i){const z=v.indexOf(0),p=v[i];if(p===1&&(z===i+1||(z===i+2&&v[i+1]===2)))return sw(v,i,z);if(p===2&&(z===i-1||(z===i-2&&v[i-1]===1)))return sw(v,i,z);return null;}
// final path: seals 0 coral,1 echo,2 oasis,3 crystal,4 wind,5 moon,6 dawn on slots P1..P7 along the light.
function pathChecks(t,v){const at=s=>v.indexOf(s),P=t.slots,o=P[at(2)],cr=P[at(3)],mo=P[at(5)];
 return[at(0)===0,at(1)===at(0)+1,t.turn[at(2)]==='L',cr[0]===o[0]-1&&cr[1]===o[1],t.turn[at(4)]==='H',mo[0]===o[0]&&mo[1]===o[1]-1,at(6)===P.length-1];}
function pathOk(t,v){return new Set(v).size===7&&pathChecks(t,v).every(Boolean);}
function nextStates(s,a){const t=s.target,k=s.kind;
 if(k==='slide')return a.map((_,i)=>slideMove(a,i)).filter(Boolean);
 if(k==='lights')return a.map((_,i)=>lightsPress(a,i));
 if(k==='scales'||k==='gearfit'||k==='path')return pairs(a.length).map(([i,j])=>sw(a,i,j));
 if(k==='ropes')return a[4]>=0?[ropeRelease(a)]:[0,1,2,3].map(i=>ropePull(t,a,i)).filter(Boolean);
 if(k==='drums')return[0,1,2].map(i=>drumMove(t,a,i)).filter(Boolean);
 if(k==='push'){const o=[];for(let q=0;q<2;q++)for(let d=0;d<4;d++){const n=pushMove(t,a,q,d);if(n)o.push(n);}return o;}
 if(k==='stroke')return t.edges.map((_,e)=>strokeDraw(t,a,e)).filter(Boolean);
 if(k==='hanoi'){const o=[];for(let f=0;f<3;f++)for(let g=0;g<3;g++){const n=hanoiMove(a,f,g);if(n)o.push(n);}return o;}
 if(k==='river')return[-1,0,1,2].map(i=>riverCross(t,a,i)).filter(n=>n&&riverSafe(t,n));
 if(k==='frogs')return a.map((_,i)=>frogMove(a,i)).filter(Boolean);
 return[];}
const V5B=['slide','lights','scales','ropes','gearfit','drums','push','stroke','hanoi','river','frogs','path'];
function solvedB(s,v){const t=s.target;switch(s.kind){case'slide':return equal(v,[1,2,3,4,5,6,7,8,0]);case'lights':return v.every(x=>x===0);case'scales':return v.every((_,k)=>scaleTilt(t,v,k)===0);case'ropes':return v.slice(0,4).every(x=>x===0)&&v[4]<0;case'gearfit':return gearRun(t,v)===5;case'drums':return v.every(x=>x===2);case'push':return equal(v,t.goal);case'stroke':return v.length===t.edges.length&&strokeValid(t,v);case'hanoi':return v.every(x=>x===2);case'river':return v.every(x=>x===1);case'frogs':return equal(v,t.goal);case'path':return pathOk(t,v);}return false;}
function badB(s,v){const t=s.target;switch(s.kind){
 case'slide':return v.length!==9||new Set(v).size!==9||v.some(x=>x<0||x>8);
 case'lights':return v.length!==9||v.some(x=>x!==0&&x!==1);
 case'scales':return v.length!==3||new Set(v).size!==3||v.some(x=>x<0||x>2);
 case'gearfit':return v.length!==4||new Set(v).size!==4||v.some(x=>x<0||x>3);
 case'path':return v.length!==7||new Set(v).size!==7||v.some(x=>x<0||x>6);
 case'ropes':return v.length!==5||v.slice(0,4).some(x=>x!==0&&x!==1)||v[4]<-1||v[4]>3||(v[4]>=0&&!v[v[4]]);
 case'drums':return v.length!==3||v.some(x=>x<0||x>2);
 case'push':return v.length!==4||v.some(x=>x<0||x>=t.n)||(v[0]===v[2]&&v[1]===v[3])||[0,2].some(k=>t.walls.some(w=>w[0]===v[k]&&w[1]===v[k+1]));
 case'stroke':return v.length>t.edges.length||!strokeValid(t,v);
 case'hanoi':return v.length!==3||v.some(x=>x<0||x>2);
 case'river':return v.length!==4||v.some(x=>x!==0&&x!==1)||!riverSafe(t,v);
 case'frogs':return v.length!==5||v.filter(x=>x===0).length!==1||v.filter(x=>x===1).length!==2||v.some(x=>x<0||x>2);}
 return true;}

function weighAssist(s,v){const o=weighParts(v);if(o.stage===0){if(!weighReady(v)){o.p=o.p.map((_,i)=>i<3?1:i<6?2:0);return weighPack(o);}return weighNow(s.target,v);}
 if(o.stage===1){if(!weighReady(v)){const c=o.p.map((x,i)=>x!==3?i:-1).filter(i=>i>=0);o.p=o.p.map((x,i)=>x===3?3:i===c[0]?1:i===c[1]?2:0);return weighPack(o);}return weighNow(s.target,v);}
 if(o.stage===2)return weighPick(s.target,v,weighDeduced(v))||null;return null;}

const KINDS=['locks','cipher','mirrors','torn','chime','linked','tide','weigh','valves',...V5B];
const pairSwaps=a=>pairs(a.length).map(([i,j])=>sw(a,i,j));
function neighbours(s,a){const t=s.target;switch(s.kind){
 case'locks':return a.map((_,i)=>locksMove(t,a,i)).filter(Boolean);
 case'mirrors':return a.map((_,i)=>{const n=a.slice();n[i]=1-n[i];return n;});
 case'valves':return a.map((_,i)=>{const n=a.slice();n[i]=(n[i]+1)%t.gates[i];return n;});
 case'linked':return a.map((_,i)=>linkedTurn(t,a,i));
 case'tide':return tideMoves(t,a);
 case'chime':return[0,1,2,3].map(b=>chimeStrike(t,a,b)).filter(Boolean);
 case'weigh':return[weighAssist(s,a)].filter(Boolean);
 case'cipher':case'torn':return pairSwaps(a);}
 return nextStates(s,a);}
// Shortest path (breadth-first) from v to a solved state; null when none is reachable.
function shortest(s,v){const key=a=>a.join(','),q=[v],prev=new Map([[key(v),null]]);
 for(let h=0;h<q.length;h++){const a=q[h];if(solved(s,a)){const path=[a];let k=key(a);while(prev.get(k)){path.unshift(prev.get(k));k=key(prev.get(k));}return path;}
  for(const n of neighbours(s,a)){const k=key(n);if(!prev.has(k)){prev.set(k,a);q.push(n);}}}
 return null;}
function minMoves(s,v){if(s.kind==='weigh')return 2;if(s.kind==='chime')return 4;const p=shortest(s,v||initial(s));return p?p.length-1:-1;}
function initial(s){return s.kind==='weigh'?[s.target.heavy,0,0,0,0,0,0,0,0,0,0,-1,-1]:s.target.start.slice();}
function solved(s,v){const t=s.target;switch(s.kind){
 case'locks':return v.every(x=>x===1);case'cipher':return cipherOk(t,v);case'mirrors':return mirrorTrace(t,v).hit;case'torn':return tornOk(t,v);
 case'chime':return chimeOk(t,v);case'linked':return v.every((x,i)=>x===t.goal[i]);case'tide':return v[0]===t.goal[0]&&v[1]===t.goal[1];
 case'weigh':return v[1]===3;case'valves':return valvesOk(t,v);}
 return solvedB(s,v);}
// One step along a shortest solution (visual hints); null when solved or stuck.
function assist(s,v){if(solved(s,v))return null;const p=shortest(s,v);return p&&p[1]?p[1]:null;}
// Is a saved board a legal state of its station?
function workOk(s,v){if(!Array.isArray(v)||!v.every(Number.isInteger))return false;const t=s.target;
 switch(s.kind){
  case'chime':return v.length<=4&&new Set(v).size===v.length&&v.every(n=>n>=0&&n<=3);
  case'locks':case'mirrors':return v.length===t.start.length&&v.every(x=>x===0||x===1);
  case'cipher':return v.length===4&&new Set(v).size===4&&v.every(x=>x>=0&&x<=3);
  case'torn':return v.length===t.start.length&&new Set(v).size===v.length&&v.every(x=>x>=0&&x<v.length);
  case'linked':return v.length===3&&v.every(x=>x>=0&&x<=3);
  case'valves':return v.length===4&&v.every((x,i)=>x>=0&&x<t.gates[i]);
  case'tide':return v.length===2&&v[0]>=0&&v[0]<t.nodes.length&&(v[1]===0||v[1]===1);
  case'weigh':return v.length===13&&v[0]>=0&&v[0]<=8&&v[1]>=0&&v[1]<=3&&v.slice(2,11).every(x=>x>=0&&x<=3)&&v.slice(11).every(x=>x>=-1&&x<=2);}
 return !badB(s,v);}
// Unfinished boards are disposable: drop any that no longer fit their station (older editions, other devices).
function cleanWork(p,stations){if(!p||!p.work||typeof p.work!=='object')return p;const by=new Map(stations.map(s=>[s.id,s]));
 for(const id of Object.keys(p.work)){const s=by.get(id);if(!s||!workOk(s,p.work[id]))delete p.work[id];}return p;}
function validateProgress(p,stations){if(!p||p.version!==3||Array.isArray(p)||typeof p!=='object')throw Error('إصدار سجل الرحلة غير متوافق.');
 const secretIds=new Set((root.TreasureData?.secrets||[]).map(q=>q.id)),stationIds=new Set(stations.map(s=>s.id)),ids=new Set([...stationIds,...secretIds]);
 for(const key of ['done','work','notes','hints','moves'])if(!p[key]||Array.isArray(p[key])||typeof p[key]!=='object')throw Error('سجل الرحلة غير مكتمل: '+key);
 for(const key of ['done','work','notes','hints','moves'])for(const id of Object.keys(p[key]))if(!ids.has(id))throw Error('محطة غير معروفة في سجل الرحلة.');
 if(!Array.isArray(p.rewards)||p.rewards.some(x=>!Number.isInteger(x)||x<0||x>6))throw Error('سجل الكنوز غير صالح.');
 for(const id of Object.keys(p.done))if(!stationIds.has(id))throw Error('لا يحسب السر محطة أساسية.');
 for(const key of ['bonus','usedTools'])if(p[key]&&(Array.isArray(p[key])||typeof p[key]!=='object'))throw Error('سجل الأدوات أو الأسرار غير صالح.');
 for(const id of Object.keys(p.bonus||{}))if(!secretIds.has(id))throw Error('سر غير معروف.');
 for(const value of Object.values(p.bonus||{}))if(!value||typeof value!=='object'||Array.isArray(value)||!Number.isFinite(value.at))throw Error('نتيجة سر غير صالحة.');
 for(const s of stations){const v=p.work[s.id];if(v!==undefined&&!workOk(s,v))throw Error('قطع اللغز غير صالحة.');}
 return true;}
root.TreasureLogic={KINDS,equal,initial,solved,assist,minMoves,neighbours,nextStates,workOk,cleanWork,validateProgress,
 locksCan,locksMove,cipherOk,mirrorTrace,tornOk,tornEdgeOk,chimeOk,chimeStrike,linkedTurn,tideOpen,tideMoves,
 weighParts,weighPlace,weighReady,weighNow,weighDeduced,weighPick,valvesFlow,valvesOk,
 slideMove,lightsPress,scaleTilt,ropePull,ropeRelease,gearContacts,gearRun,drumCan,drumMove,pushMove,pushFree,
 strokeAt,strokeDraw,strokeValid,hanoiMove,hanoiTop,riverSafe,riverCross,frogMove,pathChecks,pathOk};
})(typeof window==='undefined'?globalThis:window);
