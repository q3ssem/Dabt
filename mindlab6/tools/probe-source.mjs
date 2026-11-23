// Read-only survey of the frozen V5 source; no application code is executed.
// This is deliberately diagnostic, not a certificate of live reachability.
import { execFileSync } from 'node:child_process';
const SHA = '7327fdc6c6f36deaf63a2b20a7b6db9a315ad446';
const source = execFileSync('git', ['show', SHA + ':index.html'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
const terms = {
  gameDecl: /(?:const|let|var)\\s+(?:G|GM|KID_GAMES)\\s*=/g,
  gamePush: /(?:G|KID_GAMES)\\.push\\s*\\(/g,
  gameReg: /(?:GM\\[|GM\\.|DX\\.register|registerGame)/g,
  kidArray: /KID_GAMES/g,
  save: /(?:localStorage\\.(?:getItem|setItem)|'miran:v2'|"miran:v2"|const\\s+S\\s*=)/g,
  script: /<script(?:\\s[^>]*)?>/gi,
};
const lines = [0];for (let i=0;i<source.length;i++) if (source[i]==='\\n') lines.push(i+1);
function lineAt(index) { let a=0,b=lines.length-1;while(a<b){let m=(a+b+1)>>1;if(lines[m]<=index)a=m;else b=m-1}return a+1; }
const out={sha:SHA,sourceBytes:Buffer.byteLength(source),lineCount:lines.length,counts:{},matches:{}};
for (const [term, pattern] of Object.entries(terms)) {
  const matches=[...source.matchAll(pattern)];
  out.counts[term]=matches.length;
  out.matches[term]=matches.slice(0,20).map(m=>({line:lineAt(m.index),offset:m.index,excerpt:source.slice(Math.max(0,m.index-95),Math.min(source.length,m.index+205)).replace(/\\s+/g,' ').slice(0,300)}));
}
console.log('V5_SOURCE_PROBE '+JSON.stringify(out));
