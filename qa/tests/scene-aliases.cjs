'use strict';
// Mirror canonical, byte-identical artwork aliases declared in the active game.
const fs=require('node:fs'),path=require('node:path');
const app=fs.readFileSync(path.resolve(__dirname,'../../expedition10/app.js'),'utf8');
const chunk=app.split('const REUSED_SCENES=Object.freeze(')[1];
if(!chunk)throw Error('canonical scene registry missing');
const aliases=JSON.parse(chunk.split(');')[0]);
const scenePath=name=>Object.hasOwn(aliases,name)?aliases[name]:'expedition10/art/scenes/'+name;
module.exports={scenePath,aliases};
