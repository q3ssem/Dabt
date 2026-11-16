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
  root.ML10Logic={TARGET_CODE,CODE_CLUES,codeFeedback,solveCode,countPaths,orders,mapArrangements,riverGraph,islandLinks,islandNetworks,resolveBalance,balanceAudit,mirrorSolutions,starGraph,timedItems,timedEdges,nonogramTarget,runClue,nonogramSolutions,audit};
})(typeof window!=='undefined'?window:globalThis);
