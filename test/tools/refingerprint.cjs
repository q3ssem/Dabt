// Re-records the fingerprints of the engines after an intentional, reviewed change
// (e.g. the rename to «مختبر العقل»). Run: node tools/refingerprint.cjs
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const base=path.join(__dirname,'..'),invPath=path.join(base,'legacy/inventory.json');
const inv=JSON.parse(fs.readFileSync(invPath,'utf8'));
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const inline=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
inv.original_inline_sha256=inline.map(sha);
for(const f of Object.keys(inv.preserved_files))inv.preserved_files[f]=sha(fs.readFileSync(path.join(base,f)));
fs.writeFileSync(invPath,JSON.stringify(inv,null,2)+'\n');
console.log('inline scripts:',inline.length,'preserved files:',Object.keys(inv.preserved_files).length);
