'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('index.html','utf8');
const start=source.indexOf('function stageGate(orig)');
const end=source.indexOf("if(typeof zWin==='function')",start);
for(const replay of [false,true]){
 let received=null;
 const context={hubStage:()=>replay?null:{k:3},txStageOf:()=>({k:3,replay:true}),S:{st:{},save(){}},ASTN:[],Proxy};
 vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 const original=function(...args){received=args;return 'saved'};
 const api={hints:1,wrongs:2};
 const call=context.stageGate(original);
 assert.equal(call(api,'pz_pheart','رسالة النجاح',true),'saved');
 assert.equal(received[1],'pz_pheart');assert.equal(received[2],'رسالة النجاح');assert.equal(received[3],true);
 assert.equal(received[0].hints,1);assert.equal(received[0].wrongs,2);
}
console.log('Third-round gate preserves story messages and optional arguments in first play and replay.');
