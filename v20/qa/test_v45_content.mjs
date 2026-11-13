import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url).pathname;
const js=fs.readFileSync(root+'src/handdrawn-adventure.js','utf8');
execFileSync('node',['--check',root+'src/handdrawn-adventure.js']);
assert.equal((js.match(/chapter:'الفصل/g)||[]).length,6,'six island chapters');
assert.equal((js.match(/chapter:'المحطة/g)||[]).length,6,'six planet stations');
const puzzles=[...js.matchAll(/puzzle:\{title:'([^']+)'[\s\S]*?options:\[([^\]]+)\],answer:(\d+)/g)];
assert.equal(puzzles.length,21,'21 authored puzzles');
for(const [,title,optionsRaw,answerRaw] of puzzles){
 const options=[...optionsRaw.matchAll(/'((?:\\'|[^'])*)'/g)].map(x=>x[1]);
 const answer=Number(answerRaw);
 assert.ok(options.length>=3,`${title}: at least 3 choices`);
 assert.ok(answer>=0&&answer<options.length,`${title}: answer index valid`);
 assert.equal(new Set(options).size,options.length,`${title}: no duplicate choices`);
}
for(const file of ['index.html','adventure-2d.html']){
 const html=fs.readFileSync(root+file,'utf8');
 for(const ref of [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(x=>x[1]))
   assert.ok(fs.existsSync(root+ref),`${file}: referenced asset ${ref} exists`);
}
assert.match(js,/dabt45\.inventory/);
assert.match(js,/dabt45\.scenes/);
assert.match(js,/drawHandPaintedDetails/);
console.log('PASS: 12 scenes, 21 authored puzzles, unique choices, valid answer indices, referenced assets, persistence hooks, JS syntax');
