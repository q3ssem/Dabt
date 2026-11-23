import test from 'node:test';
import assert from 'node:assert/strict';
import { GameRegistry } from '../src/core/game-registry.js';
import { GameHost } from '../src/core/game-host.js';

function harness(){
  const handlers=new Map();
  const doc={
    hidden:false,
    createElement(tag){return {tag,attributes:{},children:[],textContent:'',ownerDocument:doc,
      setAttribute(k,v){this.attributes[k]=v;},
      replaceChildren(...nodes){this.children=nodes;}};},
    addEventListener(k,f){handlers.set(k,f);},
    removeEventListener(k){handlers.delete(k);}
  };
  const root=doc.createElement('main');
  return {doc,root,emit(k){handlers.get(k)?.();}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('Registry rejects duplicate game IDs and invalid renderers, and stays engine-agnostic',()=>{
  const registry=new GameRegistry();
  registry.register({id:'statue-360',renderer:'3d',load:()=>Promise.resolve({})});
  assert.throws(()=>registry.register({id:'statue-360',renderer:'3d',load:()=>({})}),/Duplicate/);
  assert.throws(()=>registry.register({id:'bad',renderer:'infinity',load:()=>({})}),/renderer/);
  assert.equal(registry.list().length,1);
});
test('Runtime lazy-loads, mounts and disposes a game with isolated element',async()=>{
  const events=[], {root}=harness(),registry=new GameRegistry();
  registry.register({id:'stone-view',renderer:'3d',load:async()=>{
    events.push('load');return {mount:async({element,signal,renderer})=>{
      assert.equal(renderer,'3d');assert.equal(signal.aborted,false);
      assert.equal(element.attributes['data-game-id'],'stone-view');
      events.push('mount');
      return {dispose(){events.push('dispose')}};
    }};}});
  const host=new GameHost({registry,element:root});
  assert.equal(events.length,0,'no eager loading');
  assert.equal(await host.open('stone-view'),true);
  assert.equal(host.activeId,'stone-view');
  await host.close();
  assert.deepEqual(events,['load','mount','dispose']);
  assert.equal(host.activeId,null);
  assert.equal(root.children.length,0);
  await host.destroy();
});
test('Old asynchronous mount cannot win after a new game opens and is eventually disposed',async()=>{
  const {root}=harness(),registry=new GameRegistry(),events=[];
  let resolveMount;
  registry.register({id:'slow-statue',renderer:'3d',load:async()=>({mount:()=>new Promise(resolve=>{resolveMount=()=>resolve({dispose(){events.push('stale-dispose')}})})})});
  registry.register({id:'fast-puzzle',renderer:'dom',load:async()=>({mount:()=>({dispose(){events.push('fast-dispose')}})})});
  const host=new GameHost({registry,element:root});
  const slow=host.open('slow-statue');await flush();
  const fast=host.open('fast-puzzle');
  assert.equal(await fast,true);
  resolveMount();
  assert.equal(await slow,false);
  assert.equal(host.activeId,'fast-puzzle');
  assert.deepEqual(events,['stale-dispose']);
  await host.destroy();
  assert.deepEqual(events,['stale-dispose','fast-dispose']);
});
test('Closing while a lazy module is loading does not mount it',async()=>{
  const {root}=harness(),registry=new GameRegistry();
  let loadDone, mounted=false;
  registry.register({id:'network-puzzle',renderer:'2d',load:()=>new Promise(resolve=>{loadDone=()=>resolve({mount(){mounted=true;return {dispose(){}}}})})});
  const host=new GameHost({registry,element:root});
  const pending=host.open('network-puzzle');await flush();
  await host.close();loadDone();
  assert.equal(await pending,false);
  assert.equal(mounted,false);
  await host.destroy();
});
test('Visibility pauses/resumes active scene and destroy unsubscribes listeners',async()=>{
  const {doc,root,emit}=harness(),registry=new GameRegistry(),events=[];
  registry.register({id:'active-puzzle',renderer:'dom',load:async()=>({mount:()=>({
    dispose(){events.push('dispose')},pause(){events.push('pause')},resume(){events.push('resume')}
  })})});
  const host=new GameHost({registry,element:root});
  await host.open('active-puzzle');
  doc.hidden=true;emit('visibilitychange');await flush();
  doc.hidden=false;emit('visibilitychange');await flush();
  await host.destroy();
  assert.deepEqual(events,['pause','resume','dispose']);
  assert.equal(host.destroyed,true);
  await assert.rejects(host.open('active-puzzle'),/destroyed/);
});
test('Driver failure never leaves a false active game',async()=>{
  const {root}=harness(),registry=new GameRegistry(),errors=[];
  registry.register({id:'broken-puzzle',renderer:'2d',load:async()=>({mount(){throw new Error('test')}})});
  const host=new GameHost({registry,element:root,onError:e=>errors.push(e.message)});
  assert.equal(await host.open('broken-puzzle'),false);
  assert.equal(host.activeId,null);
  assert.deepEqual(errors,['test']);
  assert.match(root.children[0].children[0].textContent,/تعذر/);
  await host.destroy();
});
