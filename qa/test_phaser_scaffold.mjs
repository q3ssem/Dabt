import fs from 'node:fs';
import assert from 'node:assert/strict';
const pkg=JSON.parse(fs.readFileSync(new URL('../engine-phaser/package.json',import.meta.url)));
assert.equal(pkg.dependencies.phaser.startsWith('^4.'),true);
const entry=fs.readFileSync(new URL('../engine-phaser/src/main.js',import.meta.url),'utf8');
assert.match(entry,/from 'phaser'/);
assert.match(entry,/new Phaser\.Game/);
console.log('PASS: Phaser 4 migration scaffold metadata and entry point');
