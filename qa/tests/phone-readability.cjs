'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const window={addEventListener(){}};
vm.runInNewContext(fs.readFileSync('ui/fit.js','utf8'),{window,document:{readyState:'loading',addEventListener(){}},Intl,console});
const format=window.fitUI.waterAmount;
const latin=s=>s.replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
let checks=0;
for(const source of [0,12,24,36,48,60])for(let twos=0;twos<=4;twos++)for(let threes=0;threes<=4-twos;threes++){
 const q=source/(2**twos*3**threes),label=format(q),[n,d='1']=latin(label).split('⁄');
 assert(!label.includes('≈'),'generated garden flow is displayed exactly');
 assert(Math.abs(Number(n)/Number(d)-q)<1e-9,'display preserves the water quantity');
 assert(label.length<=8,'garden labels do not expand into long decimals');checks++;
}
assert.equal(format(0),'٠');assert.equal(format(20/3),'٢٠⁄٣');assert.equal(format(8),'٨');
console.log('Phone readability: '+checks+' exact garden quantities fit compact labels; flow values and win rules remain unchanged.');
