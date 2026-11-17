const assert=require('assert');
require('../../expedition10/logic.js');
const L=global.ML10Logic,A=L.audit();
assert.strictEqual(A.maze.count,1,'lantern maze has one simple route');
assert.strictEqual(A.maze.moves,12,'lantern maze route has 12 moves');
assert.deepStrictEqual(A.maze.path,L.mazePath,'maze audit returns the designed path');
assert.strictEqual(A.jug.distance,8,'water-jug target needs eight operations');
assert.strictEqual(A.jug.count,1,'water-jug shortest operation sequence is unique');
assert.deepStrictEqual(A.jug.path,['fillB','pourBtoA','fillB','pourBtoA','emptyA','pourBtoA','fillB','pourBtoA'],'water-jug solver returns the documented sequence');
let jug=[0,0];
for(const action of A.jug.path){const next=L.jugNext(jug).find(x=>x.action===action);assert(next,'water-jug operation is legal: '+action);jug=next.state;}
assert.deepStrictEqual(jug,[5,0],'water-jug sequence leaves exactly five units in the large basin');
assert.strictEqual(A.signal.length,1,'signal puzzle has one click set');
assert.deepStrictEqual(A.signal[0],L.signalSolution,'signal puzzle solution is the designed four-tower set');
assert.deepStrictEqual(L.signalApply(A.signal[0],L.signalStart),Array(9).fill(0),'signal solution turns every tower off');
assert.strictEqual(A.hanoi.distance,7,'three-disk Hanoi needs seven moves');
assert.strictEqual(A.hanoi.count,1,'shortest Hanoi sequence is unique');
let h=L.hanoiStart.slice();
for(const move of A.hanoi.path){const legal=L.hanoiMoves(h).find(x=>x.from===move.from&&x.to===move.to&&x.disk===move.disk);assert(legal,'Hanoi move is legal');h=legal.state;}
assert.deepStrictEqual(h,[2,2,2],'Hanoi solution moves all disks to the final peg');
assert.strictEqual(A.seal.length,1,'fivefold seal ordering is unique');
assert.deepStrictEqual(A.seal[0],['قمر','ورقة','ماء','نجمة','نار'],'fivefold seal matches the documented order');
assert(L.sealValid(A.seal[0]),'fivefold seal order satisfies every clue');
console.log('Expedition 25 logic: unique maze, 7L/4L water measure, Lights Out, Towers of Hanoi and five-rune seal passed.');
