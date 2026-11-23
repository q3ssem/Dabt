import test from 'node:test';
import assert from 'node:assert/strict';
import {getGraphicsCapabilities,chooseRenderScale} from '../src/core/graphics-capabilities.js';

test('No DOM or GPU is handled as a valid low-end context',()=>{
  const cap=getGraphicsCapabilities({document:undefined,navigator:undefined,secureContext:false});
  assert.equal(cap.webgl2,false);
  assert.equal(cap.webgpuAdvertised,false);
});
test('WebGPU advertised does not imply actual successful adapter',()=>{
  const doc={createElement:()=>({getContext:()=>null})};
  const gpu={requestAdapter(){throw new Error('Should not request GPU during home screen rendering')}};
  const cap=getGraphicsCapabilities({document:doc,navigator:{gpu},secureContext:true});
  assert.equal(cap.webgpuAdvertised,true);
  assert.equal(cap.webgl2,false);
});
test('WebGL context released after feature probe and phone DPR is bounded',()=>{
  let releases=0;
  const gl={getExtension:()=>({loseContext(){releases++;}})};
  const doc={createElement:()=>({getContext:(kind)=>kind==='webgl2'?gl:null})};
  assert.equal(getGraphicsCapabilities({document:doc,navigator:{},secureContext:true}).webgl2,true);
  assert.equal(releases,1);
  assert.equal(chooseRenderScale({ratio:3,isPhone:true}),1.5);
  assert.equal(chooseRenderScale({ratio:3,isPhone:false}),2);
  assert.equal(chooseRenderScale({ratio:NaN}),1);
});
