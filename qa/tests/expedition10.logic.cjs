const assert=require('assert');
require('../../expedition10/logic.js');
const L=global.ML10Logic,A=L.audit();
assert.deepStrictEqual(A.codeSolutions,['042'],'lighthouse lock has exactly one code');
assert.strictEqual(A.river.count,1,'river bridge has exactly one route');
assert.deepStrictEqual(A.river.path,['P','A','B','C','D','E','F','G']);
assert.deepStrictEqual(A.mapArrangements,[[0,1,2,3]],'torn map has exactly one arrangement');
assert.strictEqual(A.timedOrders.length,1,'timed ordering constraints produce one order');
assert.strictEqual(A.nonogram.count,1,'archive nonogram clues produce exactly one 4x4 pattern');
assert.deepStrictEqual(A.nonogram.grid,L.nonogramTarget,'nonogram solver returns the designed hidden pattern');
assert.strictEqual(A.islandNetworks.length,1,'island network has exactly one connected five-link solution within budget');
assert.strictEqual(A.islandNetworks[0].cost,15,'unique island network consumes exactly 15 rope marks');
assert.strictEqual(A.balanceAudit.fail,0,'two weighings resolve every possible heavy coin for every legal 3-vs-3 split and candidate pair');
assert.strictEqual(A.balanceAudit.checked,45360,'balance audit covers all 45,360 hidden-coin/partition/second-weigh cases');
assert.deepStrictEqual(A.mirrorSolutions,[[1,3,2]],'mirror orientation clues produce exactly one configuration');
assert.strictEqual(A.starRoute.count,1,'final constellation has exactly one route');
assert(A.balanceCases.every(x=>x.ok),'two weighings identify each of nine possible heavy coins');
assert.strictEqual(A.mirrorConfigurations,64,'mirror stage has 64 possible states and one target state');
console.log('Expedition 10: all 10 stage logic invariants passed.');
assert.deepStrictEqual(A.pipeSolutions,[[2,0,0,1,3,0,1]],'seven fixed pipe pieces have exactly one leak-free orientation state');
assert.strictEqual(A.ice.distance,7,'ice channel has a seven-slide shortest solution');
assert.strictEqual(A.ice.count,1,'ice channel has exactly one shortest route');
assert.deepStrictEqual(A.ice.path,['right','up','left','down','right','up','right'],'ice solver returns the designed seven-slide route');
assert.deepStrictEqual(A.nimWinningMoves,[{pile:2,take:3,remaining:[1,3,2]}],'Nim opening has exactly one winning move');
assert.deepStrictEqual(A.shadowSolutions,[[2,0,3]],'shadow lamp relationships produce one orientation tuple');
assert.deepStrictEqual(A.cipher.solutions,[4],'Arabic bottle cipher has exactly one Caesar shift');
assert.strictEqual(L.shiftArabic(A.cipher.text,-4),'الميناء','cipher wheel decodes to the harbor clue');
console.log('Expedition 15 extension: pipes, ice, Nim strategy, shadow logic and Arabic cipher invariants passed.');
// The Nim rival must make legal unrestricted-Nim moves; a perfect first move leaves the player able to force a win.
const opening=L.nimWinningMoves([1,3,5]);assert.strictEqual(opening.length,1,'Nim has one winning opening');
let heaps=opening[0].remaining.slice(),playerTurn=false,playerWins=false,guard=0;
while(heaps.some(n=>n>0)&&guard++<20){
  if(!playerTurn){const m=L.nimBestMove(heaps);assert(m&&m.take>=1&&m.take<=heaps[m.pile],'AI move is legal');heaps=m.remaining;playerTurn=true;}
  else{const wins=L.nimWinningMoves(heaps);assert(wins.length>0,'player always has a preserving response after the unique winning opening');heaps=wins[0].remaining;playerTurn=false;if(!heaps.some(n=>n>0))playerWins=true;}
}
assert(playerWins,'optimal player wins against the Nim rival');
console.log('Nim rival: all AI moves legal and the unique winning player strategy is verified end-to-end.');
