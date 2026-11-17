(function(root){
  'use strict';
  const TARGET_CODE='042';
  const CODE_CLUES=[
    {guess:'682',well:1,wrong:0},
    {guess:'614',well:0,wrong:1},
    {guess:'206',well:0,wrong:2},
    {guess:'738',well:0,wrong:0},
    {guess:'780',well:0,wrong:1}
  ];
  function codeFeedback(code,guess){let well=0,wrong=0;for(let i=0;i<3;i++)if(code[i]===guess[i])well++;else if(code.includes(guess[i]))wrong++;return{well,wrong};}
  function solveCode(){const xs=[];for(let a=0;a<10;a++)for(let b=0;b<10;b++)for(let c=0;c<10;c++){if(a===b||a===c||b===c)continue;const code=''+a+b+c;if(CODE_CLUES.every(q=>{const f=codeFeedback(code,q.guess);return f.well===q.well&&f.wrong===q.wrong}))xs.push(code);}return xs;}
  function countPaths(graph,start,goal,max=20){let n=0,one=null;function walk(u,path){if(n>1||path.length>max)return;if(u===goal){n++;one=path.slice();return;}for(const v of graph[u]||[])if(!path.includes(v))walk(v,[...path,v]);}walk(start,[start]);return{count:n,path:one};}
  function permute(a){if(!a.length)return[[]];return a.flatMap((x,i)=>permute(a.filter((_,j)=>j!==i)).map(p=>[x,...p]));}
  function validOrder(p,edges){const pos=Object.fromEntries(p.map((x,i)=>[x,i]));return edges.every(([a,b,adj])=>adj?pos[b]===pos[a]+1:pos[a]<pos[b]);}
  const timedItems=['map','compass','lantern','telescope','key'];
  const timedEdges=[['map','compass',false],['compass','lantern',true],['lantern','telescope',false],['telescope','key',false]];
  function orders(items,edges){return permute(items).filter(p=>validOrder(p,edges));}
  const riverGraph={P:['A'],A:['P','B','X'],B:['A','C'],C:['B','D'],D:['C','E','Y'],E:['D','F'],F:['E','G','Z'],G:['F'],X:['A'],Y:['D'],Z:['F']};
  const islandLinks=[['S','A',1],['A','B',2],['B','C',3],['C','D',4],['D','E',5],['S','B',9],['A','C',10],['B','D',11],['C','E',12],['S','E',20]];
  function islandNetworks(maxCost=15){const out=[];for(let m=0;m<(1<<islandLinks.length);m++){let chosen=islandLinks.filter((_,k)=>m&(1<<k));if(chosen.length!==5)continue;let seen=new Set(['S']),change=true;while(change){change=false;for(const [a,b] of chosen){if(seen.has(a)&&!seen.has(b)){seen.add(b);change=true;}if(seen.has(b)&&!seen.has(a)){seen.add(a);change=true;}}}const cost=chosen.reduce((n,e)=>n+e[2],0);if(seen.size===6&&cost<=maxCost)out.push({chosen,cost});}return out;}
  function resolveBalance(heavy,left,right,secondLeft,secondRight){const result=left.includes(heavy)?'left':right.includes(heavy)?'right':'equal';const pool=result==='left'?left.slice():result==='right'?right.slice():Array.from({length:9},(_,i)=>i).filter(x=>!left.includes(x)&&!right.includes(x));const second=secondLeft.includes(heavy)?'left':secondRight.includes(heavy)?'right':'equal';const pair=[...secondLeft,...secondRight];const found=second==='left'?secondLeft[0]:second==='right'?secondRight[0]:pool.find(x=>!pair.includes(x));return{first:result,second,found,pool};}
  function choose(arr,k){if(k===0)return[[]];if(arr.length<k)return[];const [h,...t]=arr;return choose(t,k-1).map(x=>[h,...x]).concat(choose(t,k));}
  function balanceAudit(){let checked=0,fail=0;const xs=Array.from({length:9},(_,i)=>i);for(const left of choose(xs,3)){const rem=xs.filter(x=>!left.includes(x));for(const right of choose(rem,3)){for(const heavy of xs){const pool=left.includes(heavy)?left:right.includes(heavy)?right:rem.filter(x=>!right.includes(x));if(pool.length!==3)continue;for(let a=0;a<3;a++)for(let b=a+1;b<3;b++){const result=resolveBalance(heavy,left,right,[pool[a]],[pool[b]]);checked++;if(result.found!==heavy)fail++;}}}}return{checked,fail};}
  function mirrorSolutions(){const out=[];for(let a=0;a<4;a++)for(let b=0;b<4;b++)for(let c=0;c<4;c++)if(a===1&&b===(a+2)%4&&c===(a+1)%4)out.push([a,b,c]);return out;}
  const nonogramTarget=[[1,1,1,0],[0,0,1,1],[1,1,1,0],[0,1,0,0]];
  function runClue(bits){const out=[];let n=0;for(const x of bits){if(x)n++;else if(n){out.push(n);n=0;}}if(n)out.push(n);return out.length?out:[0];}
  const nonogramRows=nonogramTarget.map(runClue),nonogramCols=Array.from({length:4},(_,c)=>runClue(nonogramTarget.map(r=>r[c])));
  function nonogramSolutions(){let count=0,only=null;for(let mask=0;mask<(1<<16);mask++){const g=Array.from({length:4},(_,r)=>Array.from({length:4},(_,c)=>(mask>>(r*4+c))&1));if(g.every((row,r)=>JSON.stringify(runClue(row))===JSON.stringify(nonogramRows[r]))&&nonogramCols.every((clue,c)=>JSON.stringify(runClue(g.map(row=>row[c])) )===JSON.stringify(clue))){count++;only=g;if(count>1)break;}}return{count,grid:only,rows:nonogramRows,cols:nonogramCols};}
  const starGraph={N:['W'],W:['N','SW','X'],SW:['W','SE','Y'],SE:['SW','E'],E:['SE','S','Z'],S:['E'],X:['W'],Y:['SW'],Z:['E']};
  const mirrors=[0,1,2];
  function mirrorStateCount(){return mirrors.reduce((n)=>n*4,1);}
  const mapPieces={0:['','A','B',''],1:['','','C','A'],2:['B','D','',''],3:['C','','','D']};
  function mapArrangements(){const out=[];for(const p of permute([0,1,2,3])){const [a,b,c,d]=p.map(k=>mapPieces[k]);if(a[0]===''&&a[3]===''&&b[0]===''&&b[1]===''&&c[2]===''&&c[3]===''&&d[2]===''&&d[1]===''&&a[1]===b[3]&&c[1]===d[3]&&a[2]===c[0]&&b[2]===d[0])out.push(p);}return out;}
  // Expedition extension: five original mechanics for stages 11–15.
  const pipeTiles=[
    {id:'A',r:2,c:1,type:'corner',target:2,initial:0},
    {id:'B',r:3,c:1,type:'straight',target:0,initial:1},
    {id:'C',r:4,c:1,type:'corner',target:0,initial:2},
    {id:'D',r:4,c:2,type:'straight',target:1,initial:0},
    {id:'E',r:4,c:3,type:'corner',target:3,initial:1},
    {id:'F',r:3,c:3,type:'straight',target:0,initial:1},
    {id:'G',r:2,c:3,type:'corner',target:1,initial:3}
  ];
  const pipeDirs=[[-1,0],[0,1],[1,0],[0,-1]]; // N,E,S,W
  function pipePorts(tile,orientation){
    const base=tile.type==='corner'?[0,1]:[0,2];
    const turns=tile.type==='corner'?orientation:orientation%2;
    return base.map(d=>(d+turns)%4);
  }
  function pipeIsSolved(orientations){
    const byPos=new Map(pipeTiles.map((t,i)=>[`${t.r},${t.c}`,{...t,i,ports:pipePorts(t,orientations[i])}]));
    const source={r:2,c:0,port:1},goal={r:2,c:4,port:3};
    for(const t of pipeTiles){
      const ports=byPos.get(`${t.r},${t.c}`).ports;
      for(const d of ports){
        const [dr,dc]=pipeDirs[d],nr=t.r+dr,nc=t.c+dc;
        if(nr===source.r&&nc===source.c&&((d+2)%4)===source.port)continue;
        if(nr===goal.r&&nc===goal.c&&((d+2)%4)===goal.port)continue;
        const n=byPos.get(`${nr},${nc}`);
        if(!n||!n.ports.includes((d+2)%4))return false;
      }
    }
    // Endpoints must be connected and no tile may point into an unpaired endpoint.
    const visited=new Set(),queue=[`${source.r},${source.c}`];
    while(queue.length){const pos=queue.shift();if(visited.has(pos))continue;visited.add(pos);const [r,c]=pos.split(',').map(Number);
      for(const d of [0,1,2,3]){const [dr,dc]=pipeDirs[d],nr=r+dr,nc=c+dc,here=byPos.get(pos);
        const hasPort=here?here.ports.includes(d):(r===source.r&&c===source.c&&d===source.port)||(r===goal.r&&c===goal.c&&d===goal.port);
        if(!hasPort)continue;
        const npos=`${nr},${nc}`,next=byPos.get(npos);
        if(next&&next.ports.includes((d+2)%4))queue.push(npos);
        else if(nr===goal.r&&nc===goal.c)queue.push(npos);
      }
    }
    return visited.has(`${goal.r},${goal.c}`);
  }
  function pipeOrientations(){
    const domains=pipeTiles.map(t=>t.type==='corner'?[0,1,2,3]:[0,1]),solutions=[];
    function walk(i,arr){if(solutions.length>1)return;if(i===domains.length){if(pipeIsSolved(arr))solutions.push(arr.slice());return;}for(const v of domains[i])walk(i+1,[...arr,v]);}
    walk(0,[]);return solutions;
  }

  const iceStart=[4,0],iceGoal=[0,4],iceObstacles=[[0,2],[1,4],[2,0],[2,3],[2,4],[4,2]];
  function iceMoves(pos){const dirs=[['up',-1,0],['down',1,0],['left',0,-1],['right',0,1]],out=[];
    for(const [name,dr,dc] of dirs){let r=pos[0],c=pos[1];for(;;){const nr=r+dr,nc=c+dc;if(nr<0||nr>=5||nc<0||nc>=5||iceObstacles.some(([a,b])=>a===nr&&b===nc))break;r=nr;c=nc;}
      if(r!==pos[0]||c!==pos[1])out.push({to:[r,c],move:name});}
    return out;
  }
  function iceAudit(){const key=p=>p.join(','),q=[{p:iceStart,path:[]}],dist=new Map([[key(iceStart),0]]),ways=new Map([[key(iceStart),1]]),paths=new Map([[key(iceStart),[]]]);let head=0;
    while(head<q.length){const cur=q[head++],k=key(cur.p),d=dist.get(k);for(const m of iceMoves(cur.p)){const nk=key(m.to),nd=d+1,np=[...cur.path,m.move];
      if(!dist.has(nk)){dist.set(nk,nd);ways.set(nk,ways.get(k));paths.set(nk,np);q.push({p:m.to,path:np});}
      else if(dist.get(nk)===nd){ways.set(nk,Math.min(999,ways.get(nk)+ways.get(k)));}
    }}
    const g=key(iceGoal);return{distance:dist.get(g)??null,count:ways.get(g)||0,path:paths.get(g)||[],reachable:dist.has(g)};
  }

  function nimWinningMoves(stacks=[1,3,5]){const out=[];for(let i=0;i<stacks.length;i++)for(let take=1;take<=stacks[i];take++){const next=stacks.slice();next[i]-=take;if(next.reduce((x,v)=>x^v,0)===0)out.push({pile:i,take,remaining:next});}return out;}
  function nimBestMove(stacks){const wins=nimWinningMoves(stacks);if(wins.length)return wins[0];for(let i=0;i<stacks.length;i++)if(stacks[i])return{pile:i,take:1,remaining:stacks.map((v,j)=>j===i?v-1:v)};return null;}

  const shadowTarget=[2,0,3];
  function shadowSolutions(){const out=[];for(let a=0;a<4;a++)for(let b=0;b<4;b++)for(let c=0;c<4;c++)if(b===(a+2)%4&&c===(a+1)%4&&a===2)out.push([a,b,c]);return out;}
  const arabicCipherAlphabet=Array.from('ابتثجحخدذرزسشصضطظعغفقكلمنهويء');
  const cipherPlain='الميناء',cipherShift=4;
  function shiftArabic(text,shift){return Array.from(text).map(ch=>{const i=arabicCipherAlphabet.indexOf(ch);return i<0?ch:arabicCipherAlphabet[(i+shift+arabicCipherAlphabet.length)%arabicCipherAlphabet.length];}).join('');}
  const cipherText=shiftArabic(cipherPlain,cipherShift);
  function cipherSolutions(){const out=[];for(let n=0;n<arabicCipherAlphabet.length;n++)if(shiftArabic(cipherText,-n)===cipherPlain)out.push(n);return out;}

  // Stage 16 — assign the four recovered cargo crates to four berths.
  const manifestItems=['لؤلؤ','بوصلة','بلور','توابل'];
  function manifestValid(order){
    const p={};order.forEach((v,i)=>p[v]=i);
    return p['بلور']+1===p['بوصلة'] && p['لؤلؤ']!==0 && p['لؤلؤ']!==3 && p['توابل']>p['لؤلؤ'];
  }
  function manifestSolutions(){const out=[];for(const p of permute(manifestItems))if(manifestValid(p))out.push(p);return out;}

  // Stage 17 — eight-sector tidal wheel with three clue-derived safe windows.
  const tideTargets=[2,5,1],tideSectorCount=8;
  function tideSolutions(){const out=[];for(let a=0;a<8;a++)for(let b=0;b<8;b++)for(let c=0;c<8;c++)if(a===2&&b===(a+3)%8&&c===(b+4)%8)out.push([a,b,c]);return out;}

  // Stage 18 — 3x3 sliding relics. BFS proves the unique shortest eight-slide solution.
  const relicStart=[2,3,6,1,5,8,4,7,0],relicGoal=[1,2,3,4,5,6,7,8,0];
  function relicNeighbors(state){const z=state.indexOf(0),r=Math.floor(z/3),c=z%3,out=[];for(const [name,dr,dc] of [['up',-1,0],['down',1,0],['left',0,-1],['right',0,1]]){const nr=r+dr,nc=c+dc;if(nr<0||nr>2||nc<0||nc>2)continue;const j=nr*3+nc,next=state.slice();next[z]=next[j];next[j]=0;out.push({name,state:next});}return out;}
  function relicAudit(){const key=s=>s.join(''),q=[relicStart],dist=new Map([[key(relicStart),0]]),ways=new Map([[key(relicStart),1]]),paths=new Map([[key(relicStart),[]]]);let head=0;while(head<q.length){const cur=q[head++],k=key(cur),d=dist.get(k);if(k===key(relicGoal))continue;for(const m of relicNeighbors(cur)){const nk=key(m.state),nd=d+1;if(!dist.has(nk)){dist.set(nk,nd);ways.set(nk,ways.get(k));paths.set(nk,[...paths.get(k),m.name]);q.push(m.state);}else if(dist.get(nk)===nd)ways.set(nk,Math.min(999,ways.get(nk)+ways.get(k)));}}const g=key(relicGoal);return{distance:dist.get(g)??null,count:ways.get(g)||0,path:paths.get(g)||[],reachable:dist.has(g)};}

  // Stage 19 — single-crate push puzzle. Walking is free; the scored solution is the push sequence.
  const crateOpen=[[0,1],[0,2],[0,3],[0,4],[1,1],[1,2],[1,3],[1,4],[2,1],[2,2],[3,1],[3,2],[4,1],[4,2],[5,2]];
  const crateStartPlayer=[5,2],crateStartBox=[4,2],crateGoal=[0,4];
  function crateKey(p,b,region){return b.join(',')+'|'+region.map(x=>x.join(',')).sort().join(';');}
  function crateReach(start,box){const open=new Set(crateOpen.map(p=>p.join(','))),seen=new Set(),q=[start.slice()];while(q.length){const p=q.shift(),k=p.join(',');if(seen.has(k)||!open.has(k)||k===box.join(','))continue;seen.add(k);for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]])q.push([p[0]+dr,p[1]+dc]);}return Array.from(seen).map(k=>k.split(',').map(Number));}
  function crateAudit(){const startRegion=crateReach(crateStartPlayer,crateStartBox),startKey=crateKey(crateStartPlayer,crateStartBox,startRegion),q=[{p:crateStartPlayer,b:crateStartBox,region:startRegion,key:startKey,path:[]}],dist=new Map([[startKey,0]]),ways=new Map([[startKey,1]]);let head=0,goalDist=null,goalWays=0,goalPath=null;
    while(head<q.length){const cur=q[head++],d=dist.get(cur.key);if(goalDist!==null&&d>goalDist)break;if(cur.b[0]===crateGoal[0]&&cur.b[1]===crateGoal[1]){goalDist=d;goalWays+=ways.get(cur.key);if(!goalPath)goalPath=cur.path;continue;}
      for(const [name,dr,dc] of [['up',-1,0],['down',1,0],['left',0,-1],['right',0,1]]){const behind=[cur.b[0]-dr,cur.b[1]-dc],next=[cur.b[0]+dr,cur.b[1]+dc];if(!cur.region.some(p=>p[0]===behind[0]&&p[1]===behind[1])||!crateOpen.some(p=>p[0]===next[0]&&p[1]===next[1]))continue;const region=crateReach(cur.b,next),key=crateKey(cur.b,next,region),nd=d+1,path=[...cur.path,name];if(!dist.has(key)){dist.set(key,nd);ways.set(key,ways.get(cur.key));q.push({p:cur.b,b:next,region,key,path});}else if(dist.get(key)===nd)ways.set(key,Math.min(999,ways.get(key)+ways.get(cur.key)));}
    }
    return{pushes:goalDist,count:goalWays,path:goalPath||[],open:crateOpen.length};
  }

  // Stage 20 — knight movement over an induced path; three seals must be touched in order.
  const knightRoute=[[0,0],[1,2],[0,4],[2,3],[0,2],[1,0],[2,2],[0,1],[1,3]];
  const knightSeals=[2,4,7],knightStart=knightRoute[0],knightGoal=knightRoute[8];
  function isKnightMove(a,b){const dr=Math.abs(a[0]-b[0]),dc=Math.abs(a[1]-b[1]);return(dr===1&&dc===2)||(dr===2&&dc===1);}
  function knightAudit(){const edges=[];for(let i=0;i<knightRoute.length;i++)for(let j=i+1;j<knightRoute.length;j++)if(isKnightMove(knightRoute[i],knightRoute[j]))edges.push([i,j]);const expected=knightRoute.slice(0,-1).map((_,i)=>[i,i+1]);const unique=edges.length===expected.length&&expected.every(e=>edges.some(x=>x[0]===e[0]&&x[1]===e[1]));let found=[];function walk(i,path,seen){if(i===knightRoute.length-1){found.push(path.slice());return;}for(let n=0;n<knightRoute.length;n++)if(!seen.has(n)&&isKnightMove(knightRoute[i],knightRoute[n])){const next=new Set(seen);next.add(n);walk(n,[...path,n],next);}}walk(0,[0],new Set([0]));return{edges,unique,solution:found[0]?.map(i=>knightRoute[i])||[],count:found.length,seals:knightSeals.map(i=>knightRoute[i])};}

  // Stage 21 — a hand-built lantern maze with one simple route and four dead-end lantern niches.
  const mazePath=[[6,0],[5,0],[4,0],[4,1],[4,2],[3,2],[2,2],[2,3],[2,4],[1,4],[0,4],[0,5],[0,6]];
  const mazeBranches=[[6,1],[4,3],[0,3],[2,5]];
  const mazeOpen=[...mazePath,...mazeBranches];
  function mazeNeighbors(p){return [[-1,0],[1,0],[0,-1],[0,1]].map(([dr,dc])=>[p[0]+dr,p[1]+dc]).filter(q=>mazeOpen.some(x=>x[0]===q[0]&&x[1]===q[1]));}
  function mazeAudit(){const out=[];function walk(p,path){if(out.length>1)return;if(p[0]===0&&p[1]===6){out.push(path.slice());return;}for(const n of mazeNeighbors(p))if(!path.some(x=>x[0]===n[0]&&x[1]===n[1]))walk(n,[...path,n]);}walk(mazePath[0],[mazePath[0]]);return{count:out.length,path:out[0]||[],moves:(out[0]?.length||0)-1,open:mazeOpen.length};}

  // Stage 22 — classic 7L/4L water-jug puzzle. BFS certifies one shortest 8-action solution to 5L.
  const jugCaps=[7,4],jugStart=[0,0],jugGoal=5;
  function jugNext(state){const [a,b]=state,[A,B]=jugCaps,ab=Math.min(a,B-b),ba=Math.min(b,A-a);return[
    {action:'fillA',state:[A,b],label:'املأ الحوض الكبير'},
    {action:'fillB',state:[a,B],label:'املأ الحوض الصغير'},
    {action:'emptyA',state:[0,b],label:'أفرغ الحوض الكبير'},
    {action:'emptyB',state:[a,0],label:'أفرغ الحوض الصغير'},
    {action:'pourAtoB',state:[a-ab,b+ab],label:'اسكب من الكبير إلى الصغير'},
    {action:'pourBtoA',state:[a+ba,b-ba],label:'اسكب من الصغير إلى الكبير'}
  ].filter(x=>x.state[0]!==a||x.state[1]!==b);}
  function jugAudit(){const key=s=>s.join(','),q=[jugStart],dist=new Map([[key(jugStart),0]]),ways=new Map([[key(jugStart),1]]),paths=new Map([[key(jugStart),[]]]);let head=0,goalDist=null,goalWays=0,goalPath=[];while(head<q.length){const s=q[head++],k=key(s),d=dist.get(k);if(goalDist!==null&&d>goalDist)break;if(s[0]===jugGoal){goalDist=d;goalWays+=ways.get(k);if(!goalPath.length)goalPath=paths.get(k);continue;}for(const n of jugNext(s)){const nk=key(n.state),nd=d+1,np=[...paths.get(k),n.action];if(!dist.has(nk)){dist.set(nk,nd);ways.set(nk,ways.get(k));paths.set(nk,np);q.push(n.state);}else if(dist.get(nk)===nd)ways.set(nk,ways.get(nk)+ways.get(k));}}return{distance:goalDist,count:goalWays,path:goalPath};}

  // Stage 23 — 3x3 signal-tower Lights Out. Each tap toggles itself and orthogonal neighbours.
  const signalStart=[1,1,1,1,1,0,1,0,0],signalSolution=[0,2,4,6];
  function signalApply(clicks,start=Array(9).fill(0)){const b=start.slice();for(const i of clicks){const r=Math.floor(i/3),c=i%3;for(const [dr,dc] of [[0,0],[-1,0],[1,0],[0,-1],[0,1]]){const nr=r+dr,nc=c+dc;if(nr>=0&&nr<3&&nc>=0&&nc<3)b[nr*3+nc]^=1;}}return b;}
  function signalSolutions(start=signalStart){const out=[];for(let mask=0;mask<(1<<9);mask++){const clicks=Array.from({length:9},(_,i)=>i).filter(i=>mask&(1<<i));if(signalApply(clicks,start).every(v=>v===0)){out.push(clicks);if(out.length>1)break;}}return out;}

  // Stage 24 — three-disk Towers of Hanoi. The 7-move shortest solution is unique.
  const hanoiStart=[0,0,0],hanoiGoal=2,hanoiDiskCount=3;
  function hanoiMoves(state){const out=[];for(let from=0;from<3;from++){const onFrom=state.map((p,i)=>p===from?i:-1).filter(i=>i>=0).sort((a,b)=>a-b)[0];if(onFrom===undefined)continue;for(let to=0;to<3;to++){if(to===from)continue;const onTo=state.map((p,i)=>p===to?i:-1).filter(i=>i>=0).sort((a,b)=>a-b)[0];if(onTo!==undefined&&onTo<onFrom)continue;const next=state.slice();next[onFrom]=to;out.push({from,to,disk:onFrom,state:next});}}return out;}
  function hanoiAudit(){const key=s=>s.join(''),goal=Array(hanoiDiskCount).fill(hanoiGoal),q=[hanoiStart],dist=new Map([[key(hanoiStart),0]]),ways=new Map([[key(hanoiStart),1]]),paths=new Map([[key(hanoiStart),[]]]);let head=0,gd=null,gw=0,gp=[];while(head<q.length){const s=q[head++],k=key(s),d=dist.get(k);if(gd!==null&&d>gd)break;if(k===key(goal)){gd=d;gw+=ways.get(k);if(!gp.length)gp=paths.get(k);continue;}for(const m of hanoiMoves(s)){const nk=key(m.state),nd=d+1,np=[...paths.get(k),{from:m.from,to:m.to,disk:m.disk}];if(!dist.has(nk)){dist.set(nk,nd);ways.set(nk,ways.get(k));paths.set(nk,np);q.push(m.state);}else if(dist.get(nk)===nd)ways.set(nk,ways.get(nk)+ways.get(k));}}return{distance:gd,count:gw,path:gp,goal};}

  // Stage 25 — five ancient seals. The four positional clues admit one ordering among 120 permutations.
  const sealRunes=['قمر','ورقة','ماء','نجمة','نار'];
  function sealValid(order){const p=Object.fromEntries(order.map((x,i)=>[x,i]));return p['ورقة']===p['قمر']+1&&p['ورقة']<p['ماء']&&p['نجمة']>p['ماء']&&p['نار']===4;}
  function sealSolutions(){return permute(sealRunes).filter(sealValid);}

  function audit(){return{
    codeSolutions:solveCode(),
    river:countPaths(riverGraph,'P','G'),
    timedOrders:orders(timedItems,timedEdges),
    nonogram:nonogramSolutions(),
    islandNetworks:islandNetworks(),
    mirrorSolutions:mirrorSolutions(),
    balanceAudit:balanceAudit(),
    starRoute:countPaths(starGraph,'N','S'),
    mapArrangements:mapArrangements(),
    mirrorConfigurations:mirrorStateCount(),
    pipeSolutions:pipeOrientations(),
    ice:iceAudit(),
    nimWinningMoves:nimWinningMoves([1,3,5]),
    shadowSolutions:shadowSolutions(),
    cipher:{text:cipherText,plain:cipherPlain,shift:cipherShift,solutions:cipherSolutions()},
    manifestSolutions:manifestSolutions(),tideSolutions:tideSolutions(),relic:relicAudit(),crate:crateAudit(),knight:knightAudit(),maze:mazeAudit(),jug:jugAudit(),signal:signalSolutions(),hanoi:hanoiAudit(),seal:sealSolutions(),
    acceptedMirrorState:[1,3,2],
    balanceCases:[0,1,2,3,4,5,6,7,8].map(heavy=>{
      const left=[0,1,2],right=[3,4,5],un=[6,7,8];
      const first=left.includes(heavy)?'left':right.includes(heavy)?'right':'equal';
      const pool=first==='left'?left:first==='right'?right:un;
      const pair=pool.slice(0,2);
      const second=pair[0]===heavy?'left':pair[1]===heavy?'right':'equal';
      const found=second==='left'?pair[0]:second==='right'?pair[1]:pool.find(x=>!pair.includes(x));
      return{heavy,first,second,found,ok:found===heavy};
    })
  };}
  root.ML10Logic={TARGET_CODE,CODE_CLUES,codeFeedback,solveCode,countPaths,orders,mapArrangements,riverGraph,islandLinks,islandNetworks,resolveBalance,balanceAudit,mirrorSolutions,starGraph,timedItems,timedEdges,nonogramTarget,runClue,nonogramSolutions,pipeTiles,pipePorts,pipeIsSolved,pipeOrientations,iceStart,iceGoal,iceObstacles,iceMoves,iceAudit,nimWinningMoves,nimBestMove,shadowTarget,shadowSolutions,arabicCipherAlphabet,cipherPlain,cipherShift,cipherText,shiftArabic,cipherSolutions,manifestItems,manifestValid,manifestSolutions,tideTargets,tideSectorCount,tideSolutions,relicStart,relicGoal,relicNeighbors,relicAudit,crateOpen,crateStartPlayer,crateStartBox,crateGoal,crateReach,crateAudit,knightRoute,knightSeals,knightStart,knightGoal,isKnightMove,knightAudit,mazePath,mazeBranches,mazeOpen,mazeNeighbors,mazeAudit,jugCaps,jugStart,jugGoal,jugNext,jugAudit,signalStart,signalSolution,signalApply,signalSolutions,hanoiStart,hanoiGoal,hanoiDiskCount,hanoiMoves,hanoiAudit,sealRunes,sealValid,sealSolutions,audit};
})(typeof window!=='undefined'?window:globalThis);
