'use strict';
// Regression: retiring pz_xbottle accidentally removed data/helpers still used
// by active pz_zcode and the fifth throne of pz_phall. Never restore that game.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('index.html','utf8');
const from=src.indexOf('const ZK_PL='),to=src.indexOf('function runZCode()',from);
assert(from>0&&to>from,'independent Captain ledger data/generator are present');
const section=src.slice(from,to);
assert(!/\bXB_(PL|T)\b/.test(section),'living cryptogram has no retired puzzle word bank dependencies');
assert(!/\bxbMake\b|\bxbDec\b/.test(src),'no active reference to removed bottle engine internals');
assert(!src.includes("id:'pz_xbottle'"),'retired bottle game cannot silently return');
const a=src.indexOf('function runPHall()'),b=src.indexOf('/* ---------- the last heart:',a);
assert(a>0&&b>a);
const hall=src.slice(a,b);
assert(hall.includes("g:()=>zkMake(Math.min(8,lv))"),'fifth throne reuses living captain cryptogram');
assert(hall.includes("P.letters.every(c=>guess[P.key[c]]===c)"),'decoded symbols required before destination appears');
assert(hall.includes("destination.hidden=!solved"),'destination locked until the ledger is deciphered');
assert(hall.includes("button.dataset.place===P.place"),'throne test helper reaches the real answer');
assert(!hall.includes('رسالة الزجاجة'),'throne hint must not refer to retired puzzle');
const letters=src.match(/const XAL='([^']+)'/);
assert(letters&&letters[1].length>=24,'Arabian code alphabet');
let seed=1987;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const ctx={XAL:letters[1],pick:items=>items[Math.floor(random()*items.length)],
 shuffle:items=>items.slice().map(x=>({x,p:random()})).sort((a,b)=>a.p-b.p).map(v=>v.x),
 seaArt:k=>k};
vm.createContext(ctx);
vm.runInContext(section,ctx,{timeout:5000});
for(let lv=1;lv<=8;lv++){
  for(let attempt=0;attempt<20;attempt++){
    const p=vm.runInContext('zkMake('+lv+')',ctx,{timeout:5000});
    assert(p&&p.words.length&&p.place,'valid code puzzle '+lv);
    assert(p.letters.length<=16,'symbol count fits board '+lv);
    assert.equal(new Set(p.letters).size,p.letters.length,'letter symbols unique '+lv);
    assert(p.words.join('').split('').every(c=>letters[1].includes(c)),
      'captain message must contain only supported Arabic alphabet '+lv);
    assert(p.known.every(c=>p.letters.includes(c)),'initial reveals are valid '+lv);
    assert(new Set(p.opts).size===4&&p.opts.includes(p.place),'four distinct destinations '+lv);
    assert(p.letters.every(c=>Number.isInteger(p.key[c])&&p.key[c]>=0&&p.key[c]<28),
      'glyph position valid '+lv);
  }
}
// Two- and three-step hint language must describe the particular mirror,
 // not repeat an indistinguishable generic "I flipped a mirror" message.
const laser=src.slice(src.indexOf('function runLaser()'),src.indexOf('function runSoko()'));
const palace=src.slice(src.indexOf('function runPMirror()'),src.indexOf('function runPGarden()'));
assert(laser.includes('return k===2?')&&laser.includes('XAR(i+1)'),
  'laser hints explain different repaired mirrors');
assert(palace.includes('return k===2')&&palace.includes('XAR(i+1)'),
  'palace mirror hints explain different repaired mirrors');
assert(palace.includes("busy=true;const hintButton=$('#pzh');if(hintButton)hintButton.disabled=true"),
  'solved palace mirrors must block repeat hint charging during win animation');
const ring=src.slice(src.indexOf('function runARing()'),src.indexOf('function runAShade()'));
assert(ring.includes("if(q<0)return'اكتملت محاذاة الأخشاب. اضغط «ثبّت التواريخ»"),
  'final ring-workshop hint must explain validation when all boards are aligned');
const runtime=fs.readFileSync('ui/app.js','utf8');
const exhausted=runtime.match(/if\(t==null\)\{hints--;if\(!kid\)setP\(before\);[^}]+\}/)?.[0]||'';
assert(exhausted.includes('اكتملت خطوات المساعدة المتاحة'),
  'hint exhaustion should give feedback rather than retaining stale hint');
assert(exhausted.includes('hb.disabled=true')&&exhausted.includes("hb.setAttribute('aria-label'"),
  'hint exhaustion must disable unavailable hint access');
assert(runtime.includes("hb.disabled=false;hb.hidden=false;hb.setAttribute('aria-label','تلميح')"),
  'restart restores hint button state and accessible label');
const style=fs.readFileSync('ds/board-polish.css','utf8');
for(const id of ['pz_xbridge','pz_abridge','pz_xcave','pz_pclock'])
  assert(style.includes('data-la-game="'+id+'"'),'image fit repair missing '+id);
assert(style.includes('object-fit:cover!important')&&style.includes('object-fit:contain!important'));

// Authored river multi-bank regression (stage 8+):
// The output must show a cargo name, and a remote bank cannot steal its tap.
const authoredRiver=fs.readFileSync('motion/stages60/play.js','utf8');
assert(authoredRiver.includes('`<span class="ml-river-token" aria-hidden="true">${esc(group.name)}</span>`'),
  'draw real cargo names in non-illustrated river tokens');
assert(!authoredRiver.includes("'"+'<span class="ml-river-token" aria-hidden="true">${esc(group.name)}</span>'+"'"),
  'raw JavaScript template markup must not appear on the game board');
const riverCss=fs.readFileSync('motion/stages60/play.css','utf8');
assert(riverCss.includes('.ml-river-place[data-current="false"]{pointer-events:none}'),
  'inactive river docks must not intercept cargo selection');

console.log('JAZIRAN_ACTIVE_GAME_REPAIR=passed: retired cryptogram dependency removed; 160 valid caption puzzles; 4 painted aspect fixes');
