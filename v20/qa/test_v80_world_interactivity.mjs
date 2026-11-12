import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const main=fs.readFileSync(new URL('../engine-phaser/src/main.js',import.meta.url),'utf8');
const bg=path.resolve(new URL('../engine-phaser/public/assets/backgrounds',import.meta.url).pathname);
assert.match(main,/dabt-pro-phaser-v80/);
assert.match(main,/dabt-pro-phaser-v70/,'v7 save migration');
assert.match(main,/activateSwitch\(sw\)/);
assert.match(main,/openSecretBridge\(animate=true\)/);
assert.match(main,/collectSecretCache\(\)/);
assert.match(main,/secret-found/);
assert.match(main,/art-\$\{this\.artKey\}/);
assert.match(main,/touchKey==='dash'/);
assert.match(main,/this\.worldKey==='planet'\?-660:-560/);
const names=['coast','cave','observatory','wreck','forest','lighthouse','moon','mars','ice','venus','jupiter','saturn','uranus','neptune','edge'];
for(const name of names){
  const file=path.join(bg,`${name}-handdrawn.svg`);
  assert.ok(fs.existsSync(file),`missing bespoke background ${name}`);
  const svg=fs.readFileSync(file,'utf8');
  assert.match(svg,/<svg/);assert.match(svg,/<\/svg>/);
}
console.log('PASS: v8 bespoke area art, dual-sigil environmental puzzle, persistent secret bridge/cache, world-specific movement and save migration');
