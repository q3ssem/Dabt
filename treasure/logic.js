/* Treasure Island 5.0 · pure puzzle logic (no DOM), shared by the boards, the tests and backup validation.
   Every station has a main board; some add `alt` (challenge 3 starts from another arrangement) and
   `expert` (a larger board unlocked after the sea is sealed). variant(s,c) merges them into s.target. */
(function(root){
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sw=(a,i,j)=>{const n=a.slice();[n[i],n[j]]=[n[j],n[i]];return n;};
const pairs=n=>{const o=[];for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)o.push([i,j]);return o;};
const pairSwaps=a=>pairs(a.length).map(([i,j])=>sw(a,i,j));
const variant=(s,c)=>{const v=c===1?s.challengeBoards?.[0]:c===2?s.challengeBoards?.[1]||s.alt:c===3?s.expert:c===4?s.daily:null;return v?{...s,goal:v.goal||s.goal,target:{...s.target,...v},variant:c}:s;};

/* ----- locks (sea 1, expert: five rings) ----- */
function locksCan(t,v,i){return t.rules[i].every(([j,want])=>v[j]===want);}
function locksMove(t,v,i){if(!locksCan(t,v,i))return null;const n=v.slice();n[i]=1-n[i];return n;}
/* ----- cipher: positions 0 top,1 right,2 bottom,3 left (clockwise), 4 = tray (off the board). v[pos]=symbol.
   clues: ['N',a] a at the compass north · ['OPP',a,b] facing · ['CW',a,b] b right after a clockwise · ['ADJ',a,b] neighbours. */
function cipherClue(t,v,c){const at=s=>v.indexOf(s),on=s=>at(s)<4,[k,a,b]=c;
 if(k==='N')return at(a)===t.northPos;if(!on(a)||!on(b))return false;const d=(at(b)-at(a)+4)%4;
 return k==='OPP'?d===2:k==='CW'?d===1:k==='ADJ'?d===1||d===3:false;}
function cipherOk(t,v){return new Set(v).size===v.length&&t.clues.every(c=>cipherClue(t,v,c));}
/* ----- mirrors ----- */
function mirrorTrace(t,v){const [sr,sc]=t.source;let r=sr,c=sc,dr=t.dir[0],dc=t.dir[1];const path=[[r,c,dr,dc]],seen=new Set();
 for(let k=0;k<200;k++){r+=dr;c+=dc;if(r<1||c<1||r>t.n||c>t.n)return{path,hit:false,exit:[r,c]};
  if(r===t.lens[0]&&c===t.lens[1]){path.push([r,c,dr,dc]);return{path,hit:true};}
  const key=[r,c,dr,dc].join(',');if(seen.has(key))return{path,hit:false};seen.add(key);
  const m=t.mirrors.findIndex(p=>p[0]===r&&p[1]===c);const inDir=[dr,dc];
  if(m>=0){if(v[m]===1)[dr,dc]=[-dc,-dr];else [dr,dc]=[dc,dr];}
  path.push([r,c,inDir[0],inDir[1],dr,dc,m]);}
 return{path,hit:false};}
/* ----- torn map: v[pos]=piece; piece edges [top,right,bottom,left], 0 = coast (outward), n>0 = half-joint n ----- */
function tornEdgeOk(t,v,pos,side){const c=t.cols,r=Math.floor(pos/c),k=pos%c,e=t.pieces[v[pos]][side];
 const nb=side===0?(r>0?pos-c:-1):side===1?(k<c-1?pos+1:-1):side===2?(r<t.rows-1?pos+c:-1):(k>0?pos-1:-1);
 if(nb<0)return e===0;return e!==0&&t.pieces[v[nb]][(side+2)%4]===e;}
function tornOk(t,v){for(let p=0;p<v.length;p++)for(let sd=0;sd<4;sd++)if(!tornEdgeOk(t,v,p,sd))return false;return true;}
/* ----- chime: v = bells struck in order; checked after the last bell, a wrong call clears the strip.
   rules: ['adj',a,b] b right after a · ['before',a,b] · ['notEnds',a] · ['apart',a,b] never side by side. */
function chimeRule(v,r){const at=b=>v.indexOf(b),[k,a,b]=r;
 return k==='adj'?at(b)===at(a)+1:k==='before'?at(a)<at(b):k==='notEnds'?at(a)!==0&&at(a)!==v.length-1:k==='apart'?Math.abs(at(a)-at(b))>1:true;}
function chimeOk(t,v){const n=t.badges.length;return v.length===n&&new Set(v).size===n&&t.rules.every(r=>chimeRule(v,r));}
function chimeStrike(t,v,b){const n=t.badges.length;if(v.includes(b)||v.length>=n)return null;const x=[...v,b];return x.length===n&&!chimeOk(t,x)?[]:x;}
/* ----- linked statues ----- */
function linkedTurn(t,v,i){const n=v.slice();t.links[i].forEach(j=>{n[j]=(n[j]+1)%4});return n;}
/* ----- tide: v=[node, level 0 low/1 high, phase]; every action advances the phase; at phase t.wave.at the wave covers t.wave.edge ----- */
const waveOn=(t,v)=>!!t.wave&&(v[2]||0)%t.wave.period===t.wave.at;
function tideOpen(t,a,b,level,v){return t.edges.some(([x,y,l])=>l===level&&((x===a&&y===b)||(x===b&&y===a)))&&!(v&&waveOn(t,v)&&[a,b].sort().join()===t.wave.edge.slice().sort().join());}
function tideMoves(t,v){const ph=t.wave?((v[2]||0)+1)%t.wave.period:0,out=[[v[0],1-v[1],ph]];
 t.edges.forEach(([x,y,l])=>{if(l!==v[1])return;const o=x===v[0]?y:y===v[0]?x:-1;if(o>=0&&tideOpen(t,v[0],o,v[1],v))out.push([o,v[1],ph]);});return out;}
/* ----- weighing (random heavy stone): v=[heavy,stage,p0..p8,r1,r2] ----- */
function weighParts(v){return{heavy:v[0],stage:v[1],p:v.slice(2,11),r1:v[11],r2:v[12]};}
function weighPack(o){return[o.heavy,o.stage,...o.p,o.r1,o.r2];}
function weighPlace(t,v,i){const o=weighParts(v);if(o.stage>1||o.p[i]===3)return null;const cap=o.stage===0?3:1,cnt=k=>o.p.filter(x=>x===k).length;let nx=o.p[i];
 for(let k=0;k<3;k++){nx=(nx+1)%3;if(nx===0||cnt(nx)<cap)break;}if(nx===o.p[i])return null;o.p=o.p.slice();o.p[i]=nx;return weighPack(o);}
function weighReady(v){const o=weighParts(v),cnt=k=>o.p.filter(x=>x===k).length;return o.stage===0?cnt(1)===3&&cnt(2)===3:o.stage===1?cnt(1)===1&&cnt(2)===1:false;}
function weighNow(t,v){if(!weighReady(v))return null;const o=weighParts(v),side=o.p[o.heavy],res=side===1?1:side===2?2:0;
 if(o.stage===0){const keep=res===1?1:res===2?2:0;o.p=o.p.map(x=>x===keep?0:3);o.r1=res;o.stage=1;}else{o.r2=res;o.stage=2;}return weighPack(o);}
function weighDeduced(v){const o=weighParts(v);if(o.stage<2)return -1;return o.r2===1?o.p.indexOf(1):o.r2===2?o.p.indexOf(2):o.p.findIndex(x=>x===0);}
function weighPick(t,v,i){const o=weighParts(v);if(o.stage!==2)return null;if(i!==weighDeduced(v))return false;o.stage=3;return weighPack(o);}
function weighAssist(v){const o=weighParts(v);if(o.stage===0){if(!weighReady(v)){o.p=o.p.map((_,i)=>i<3?1:i<6?2:0);return weighPack(o);}return weighNow(null,v);}
 if(o.stage===1){if(!weighReady(v)){const c=o.p.map((x,i)=>x!==3?i:-1).filter(i=>i>=0);o.p=o.p.map((x,i)=>x===3?3:i===c[0]?1:i===c[1]?2:0);return weighPack(o);}return weighNow(null,v);}
 if(o.stage===2)return weighPick(null,v,weighDeduced(v))||null;return null;}
/* ----- valves ----- */
function valvesFlow(t,v){const [a,b,c,d]=v,out={toB:a===1,wasteA:a===0,left:false,right:false,wasteC:false,wasteD:false,toC:false,toD:false};
 if(a===1){out.toC=b===0||b===2;out.toD=b===1||b===2;}if(out.toC){if(c===1)out.left=true;else out.wasteC=true;}if(out.toD){if(d===0)out.right=true;else out.wasteD=true;}return out;}
function valvesOk(t,v){const f=valvesFlow(t,v);return f.left&&f.right&&!f.wasteA&&!f.wasteC&&!f.wasteD;}
/* ----- slide 3×3, 0 = gap ----- */
function slideMove(v,i){const z=v.indexOf(0);if(Math.abs(i%3-z%3)+Math.abs(Math.floor(i/3)-Math.floor(z/3))!==1)return null;return sw(v,i,z);}
/* ----- lights n×n: a press flips the crystal and its orthogonal neighbours ----- */
function lightsPress(v,i){const n=Math.round(Math.sqrt(v.length)),x=v.slice(),r=Math.floor(i/n),c=i%n;[[0,0],[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc])=>{const R=r+dr,C=c+dc;if(R>=0&&R<n&&C>=0&&C<n)x[R*n+C]^=1;});return x;}
/* ----- scales: v=[piece on scale 0..2, shown, weighings]; tilt is seen only after «زِن» (limited weighings). ----- */
function scaleTilt(t,v,k){const w=t.weights[v[k]],r=t.refs[k];return w<r?-1:w>r?1:0;}
function scaleSwap(v,i,j){const n=sw(v,i,j);n[3]=0;return n;}
function scaleWeigh(t,v){if(v[4]>=t.limit)return null;const n=v.slice();n[3]=1;n[4]++;return n;}
/* ----- ropes: v=[pins present…, strained pin or -1]; a pin comes out only when every loop over it is gone ----- */
function ropePull(t,v,i){const m=t.cover.length;if(v[m]>=0||!v[i])return null;const n=v.slice();if(t.cover[i].some(c=>v[c]))n[m]=i;else n[i]=0;return n;}
function ropeRelease(v){const m=v.length-1;if(v[m]<0)return null;const n=v.slice();n[m]=-1;return n;}
/* ----- gear train: v = gear on slots 1–4 (+ tray); good contact when the gap equals the sum of radii ----- */
function gearContacts(t,v){const r=[t.motor,...v.slice(0,4).map(g=>t.radii[g]),t.output];return r.slice(1).map((x,k)=>t.centers[k+1]-t.centers[k]-(r[k]+x));}
function gearRun(t,v){const c=gearContacts(t,v);let k=0;while(k<c.length&&c[k]===0)k++;return k;}
/* ----- drums: 0 closed → 1 side → 2 open → 0 ----- */
function drumCan(t,v,i){return t.rules[i].every(([j,w])=>v[j]===w);}
function drumMove(t,v,i){if(!drumCan(t,v,i))return null;const n=v.slice();n[i]=(n[i]+1)%3;return n;}
/* ----- push: identical stones [r,c,…] kept sorted; a stone moves one cell when the cell ahead and the cell behind are free ----- */
const stones=v=>{const o=[];for(let k=0;k<v.length;k+=2)o.push([v[k],v[k+1]]);return o;};
function pushFree(t,v,r,c){return r>=0&&c>=0&&r<t.n&&c<t.n&&!t.walls.some(w=>w[0]===r&&w[1]===c)&&!stones(v).some(s=>s[0]===r&&s[1]===c);}
function pushMove(t,v,k,d){const [dr,dc]=[[-1,0],[0,1],[1,0],[0,-1]][d],r=v[k*2],c=v[k*2+1];
 if(!pushFree(t,v,r+dr,c+dc)||!pushFree(t,v,r-dr,c-dc))return null;const s=stones(v);s[k]=[r+dr,c+dc];return s.sort((x,y)=>x[0]-y[0]||x[1]-y[1]).flat();}
/* ----- stroke: v = links drawn in order from the pen (compass) ----- */
function strokeAt(t,v){let n=t.pen;for(const e of v){const [a,b]=t.edges[e];n=n===a?b:a;}return n;}
function strokeDraw(t,v,e){if(v.includes(e))return null;const [a,b]=t.edges[e],n=strokeAt(t,v);if(a!==n&&b!==n)return null;return[...v,e];}
function strokeValid(t,v){let n=t.pen;const seen=new Set();for(const e of v){if(!Number.isInteger(e)||e<0||e>=t.edges.length||seen.has(e))return false;const [a,b]=t.edges[e];if(a!==n&&b!==n)return false;n=n===a?b:a;seen.add(e);}return true;}
/* ----- hanoi: v[k] = peg of ring k (0 smallest) ----- */
function hanoiTop(v,p){return v.findIndex(x=>x===p);}
function hanoiMove(v,from,to){if(from===to)return null;const k=hanoiTop(v,from);if(k<0)return null;const top=hanoiTop(v,to);if(top>=0&&top<k)return null;const n=v.slice();n[k]=to;return n;}
/* ----- river: v=[boat,a,b,c]; the boat carries Nawfal and one load ----- */
function riverSafe(t,v){return t.clash.every(([a,b])=>!(v[a+1]===v[b+1]&&v[a+1]!==v[0]));}
function riverCross(t,v,k){if(k>=0&&v[k+1]!==v[0])return null;const n=v.slice();n[0]=1-n[0];if(k>=0)n[k+1]=n[0];return n;}
/* ----- frogs: 1 sails east, 2 west, 0 gap; step into the gap or hop one boat of the other kind; goal = the start mirrored ----- */
function frogMove(v,i){const z=v.indexOf(0),p=v[i];if(p===1&&(z===i+1||(z===i+2&&v[i+1]===2)))return sw(v,i,z);if(p===2&&(z===i-1||(z===i-2&&v[i-1]===1)))return sw(v,i,z);return null;}
const frogGoal=t=>t.start.slice().reverse();
/* ----- final door: seals 0 coral,1 echo,2 oasis,3 crystal,4 wind,5 moon,6 dawn on slots P1..P7 ----- */
function pathChecks(t,v){const at=s=>v.indexOf(s),P=t.slots,o=P[at(2)],cr=P[at(3)],mo=P[at(5)];
 return[at(0)===0,at(1)===at(0)+1,t.turn[at(2)]==='L',cr[0]===o[0]-1&&cr[1]===o[1],t.turn[at(4)]==='H',mo[0]===o[0]&&mo[1]===o[1]-1,at(6)===P.length-1];}
function pathOk(t,v){return new Set(v).size===7&&pathChecks(t,v).every(Boolean);}

/* ----- one interface for every station ----- */
const KINDS=['locks','cipher','mirrors','torn','chime','linked','tide','weigh','valves','slide','lights','scales','ropes','gearfit','drums','push','stroke','hanoi','river','frogs','path'];
function neighbours(s,a){const t=s.target;switch(s.kind){
 case'locks':return a.map((_,i)=>locksMove(t,a,i)).filter(Boolean);
 case'mirrors':return a.map((_,i)=>{const n=a.slice();n[i]=1-n[i];return n;});
 case'valves':return a.map((_,i)=>{const n=a.slice();n[i]=(n[i]+1)%t.gates[i];return n;});
 case'linked':return a.map((_,i)=>linkedTurn(t,a,i));
 case'tide':return tideMoves(t,a);
 case'chime':return t.badges.map((_,b)=>chimeStrike(t,a,b)).filter(Boolean);
 case'weigh':return[weighAssist(a)].filter(Boolean);
 case'cipher':case'torn':case'gearfit':case'path':return pairSwaps(a);
 case'slide':return a.map((_,i)=>slideMove(a,i)).filter(Boolean);
 case'lights':return a.map((_,i)=>lightsPress(a,i));
 case'scales':return[...pairs(3).map(([i,j])=>scaleSwap(a,i,j)),scaleWeigh(t,a)].filter(Boolean);
 case'ropes':return a[a.length-1]>=0?[ropeRelease(a)]:t.cover.map((_,i)=>ropePull(t,a,i)).filter(Boolean);
 case'drums':return a.map((_,i)=>drumMove(t,a,i)).filter(Boolean);
 case'push':{const o=[];for(let k=0;k<a.length/2;k++)for(let d=0;d<4;d++){const n=pushMove(t,a,k,d);if(n)o.push(n);}return o;}
 case'stroke':return t.edges.map((_,e)=>strokeDraw(t,a,e)).filter(Boolean);
 case'hanoi':{const o=[];for(let f=0;f<3;f++)for(let g=0;g<3;g++){const n=hanoiMove(a,f,g);if(n)o.push(n);}return o;}
 case'river':return[-1,0,1,2].map(i=>riverCross(t,a,i)).filter(n=>n&&riverSafe(t,n));
 case'frogs':return a.map((_,i)=>frogMove(a,i)).filter(Boolean);}
 return[];}
const nextStates=neighbours;
function solved(s,v){const t=s.target;switch(s.kind){
 case'locks':return v.every(x=>x===1);case'cipher':return cipherOk(t,v);case'mirrors':return mirrorTrace(t,v).hit;case'torn':return tornOk(t,v);
 case'chime':return chimeOk(t,v);case'linked':return v.every((x,i)=>x===t.goal[i]);case'tide':return v[0]===t.goal[0]&&v[1]===t.goal[1];
 case'weigh':return v[1]===3;case'valves':return valvesOk(t,v);case'slide':return equal(v,[1,2,3,4,5,6,7,8,0]);case'lights':return v.every(x=>x===0);
 case'scales':return v[3]===1&&[0,1,2].every(k=>scaleTilt(t,v,k)===0);case'ropes':return v.every((x,i)=>i===v.length-1?x<0:x===0);
 case'gearfit':return gearRun(t,v)===5;case'drums':return v.every(x=>x===2);case'push':return equal(v,t.goal);
 case'stroke':return v.length===t.edges.length&&strokeValid(t,v);case'hanoi':return v.every(x=>x===2);case'river':return v.every(x=>x===1);
 case'frogs':return equal(v,frogGoal(t));case'path':return pathOk(t,v);}
 return false;}
// Shortest path (breadth-first) from v to a solved state; null when none is reachable.
function shortest(s,v,cap=400000){const key=a=>a.join(','),q=[v],prev=new Map([[key(v),null]]);
 for(let h=0;h<q.length&&h<cap;h++){const a=q[h];if(solved(s,a)){const path=[a];let k=key(a);while(prev.get(k)){path.unshift(prev.get(k));k=key(prev.get(k));}return path;}
  for(const n of neighbours(s,a)){const k=key(n);if(!prev.has(k)){prev.set(k,a);q.push(n);}}}
 return null;}
function minMoves(s,v){if(s.kind==='weigh')return 2;if(s.kind==='chime')return s.target.badges.length;const p=shortest(s,v||initial(s));return p?p.length-1:-1;}
function initial(s){return s.kind==='weigh'?[s.target.heavy,0,0,0,0,0,0,0,0,0,0,-1,-1]:s.target.start.slice();}
// One step along a shortest solution (visual hints); null when solved or stuck.
function assist(s,v){if(solved(s,v))return null;const p=shortest(s,v);return p&&p[1]?p[1]:null;}
// Moves left to the goal (for the crew's remarks); -1 when stuck or too far to tell quickly.
function distance(s,v){if(solved(s,v))return 0;const p=shortest(s,v,60000);return p?p.length-1:-1;}
// Is a saved board a legal state of this station (any of its variants)?
function workShape(s,v){const t=s.target;if(!Array.isArray(v)||!v.every(Number.isInteger))return false;const perm=n=>v.length===n&&new Set(v).size===n&&v.every(x=>x>=0&&x<n);
 switch(s.kind){
  case'locks':case'mirrors':case'lights':return v.length===t.start.length&&v.every(x=>x===0||x===1);
  case'cipher':case'torn':case'gearfit':return perm(t.start.length);case'path':return perm(7);case'slide':return perm(9);
  case'chime':return v.length<=t.badges.length&&new Set(v).size===v.length&&v.every(n=>n>=0&&n<t.badges.length);
  case'linked':return v.length===3&&v.every(x=>x>=0&&x<=3);
  case'valves':return v.length===4&&v.every((x,i)=>x>=0&&x<t.gates[i]);
  case'tide':return v.length===3&&v[0]>=0&&v[0]<t.nodes.length&&(v[1]===0||v[1]===1)&&v[2]>=0&&v[2]<t.wave.period;
  case'weigh':return v.length===13&&v[0]>=0&&v[0]<=8&&v[1]>=0&&v[1]<=3&&v.slice(2,11).every(x=>x>=0&&x<=3)&&v.slice(11).every(x=>x>=-1&&x<=2);
  case'scales':return v.length===5&&new Set(v.slice(0,3)).size===3&&v.slice(0,3).every(x=>x>=0&&x<=2)&&(v[3]===0||v[3]===1)&&v[4]>=0&&v[4]<=t.limit;
  case'ropes':{const m=t.cover.length;return v.length===m+1&&v.slice(0,m).every(x=>x===0||x===1)&&v[m]>=-1&&v[m]<m&&(v[m]<0||v[v[m]]===1);}
  case'drums':case'hanoi':return v.length===t.start.length&&v.every(x=>x>=0&&x<=2);
  case'push':{if(v.length!==t.start.length||v.some(x=>x<0||x>=t.n))return false;const st=stones(v);return new Set(st.map(p=>p.join())).size===st.length&&!st.some(p=>t.walls.some(w=>w[0]===p[0]&&w[1]===p[1]));}
  case'stroke':return v.length<=t.edges.length&&strokeValid(t,v);
  case'river':return v.length===4&&v.every(x=>x===0||x===1)&&riverSafe(t,v);
  case'frogs':return v.length===t.start.length&&v.filter(x=>x===0).length===1&&v.filter(x=>x===1).length===t.start.filter(x=>x===1).length&&v.every(x=>x>=0&&x<=2);}
 return false;}
function workOk(s,v){return [0,1,2,3].some(c=>workShape(variant(s,c),v));}
/* Daily island puzzle: walk back from the solved board with a seeded random generator; the minimum is then measured. */
const DAILY_KINDS=['slide','lights','cipher','torn','gearfit','path','hanoi','locks','mirrors','linked','valves','drums'];
function dailyBoard(s,seed){let r=seed>>>0||1;const rnd=()=>(r=(r*1103515245+12345)>>>0)/4294967296;const goal=shortest(s,initial(s)).pop();
 for(let tries=0;tries<30;tries++){let v=goal.slice();const steps=8+Math.floor(rnd()*10);for(let k=0;k<steps;k++){const n=neighbours(s,v);v=n[Math.floor(rnd()*n.length)];}
  const m=minMoves(s,v);if(m>=4)return{start:v,min:m};}
 return{start:initial(s),min:minMoves(s)};}
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
root.TreasureLogic={KINDS,DAILY_KINDS,dailyBoard,equal,variant,initial,solved,assist,distance,minMoves,neighbours,nextStates,shortest,workOk,cleanWork,validateProgress,
 locksCan,locksMove,cipherOk,cipherClue,mirrorTrace,tornOk,tornEdgeOk,chimeOk,chimeRule,chimeStrike,linkedTurn,tideOpen,tideMoves,waveOn,
 weighParts,weighPlace,weighReady,weighNow,weighDeduced,weighPick,valvesFlow,valvesOk,
 slideMove,lightsPress,scaleTilt,scaleSwap,scaleWeigh,ropePull,ropeRelease,gearContacts,gearRun,drumCan,drumMove,pushMove,pushFree,stones,
 strokeAt,strokeDraw,strokeValid,hanoiMove,hanoiTop,riverSafe,riverCross,frogMove,frogGoal,pathChecks,pathOk};
})(typeof window==='undefined'?globalThis:window);
