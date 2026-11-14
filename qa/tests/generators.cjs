const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync(require('path').join(__dirname,'../../index.html'),'utf8');
const ctx={Math,Map,Set,Int16Array,Int8Array,rnd:n=>Math.floor(Math.random()*n),pick:a=>a[Math.floor(Math.random()*a.length)],shuffle:a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a;}};
vm.createContext(ctx);
vm.runInContext(html.slice(html.indexOf('const PP_SZ='),html.indexOf('function runPipes')),ctx);
vm.runInContext(html.slice(html.indexOf('function stMake('),html.indexOf('function runStatues(')),ctx);
vm.runInContext(html.match(/^const RV=\{.*$/m)[0],ctx);
vm.runInContext(html.slice(html.indexOf('const RV_EAT='),html.indexOf('function runRiver(')),ctx);
let pipes=0,statues=0,rivers=0;
for(let lv=1;lv<=8;lv++)for(let t=0;t<20;t++){
 const p=ctx.ppMake(lv);p.cur=p.sol.slice();assert.equal(ctx.ppSolved(p),true);assert.equal(ctx.ppPowered(p).size,p.w*p.h);pipes++;
}
for(let lv=1;lv<=7;lv++)for(let t=0;t<5;t++){
 const p=ctx.stMake(lv),s=p.s.slice();let n=0;
 while(s.some(x=>x!==0)&&n<100){const k=p.nxt[p.enc(s)];assert.ok(k>=0);for(let j=0;j<s.length;j++)s[j]=(s[j]+p.R[k][j])%4;n++;}
 assert.ok(s.every(x=>x===0));assert.equal(n,p.min);statues++;
}
for(let lv=1;lv<=7;lv++)for(let t=0;t<10;t++){
 const p=ctx.rvMake(lv),path=ctx.rvPath(p.it.length,p.cap,p.conf,0),N=p.it.length,F=1<<N;assert.ok(path);assert.equal(path.length-1,p.min);
 for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],f=a&F?1:0;assert.ok((a^b)&F);let moved=0;for(let j=0;j<N;j++)if((a^b)&(1<<j)){moved++;assert.equal((a>>j)&1,f)}assert.ok(moved<=p.cap);const nf=b&F?1:0;for(const[x,y]of p.conf)assert.ok(!(((b>>x)&1)===((b>>y)&1)&&((b>>x)&1)!==nf));}rivers++;
}
const result={status:'passed',pipes:{levels:8,samples:pipes},statues:{levels:7,samples:statues},river:{levels:7,samples:rivers},totalGeneratedPuzzles:pipes+statues+rivers,scope:'pure source generators and legal solution paths; no layout, input, audio or physical-device validation'};
console.log(JSON.stringify(result));
