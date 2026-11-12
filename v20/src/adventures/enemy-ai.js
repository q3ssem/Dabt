/** Deterministic enemy perception/state transition helper. */
export function stepEnemyAI(input) {
  const {state='patrol',visible=false,heard=false,heardX=null,heardY=null,enemyX=0,enemyY=0,playerX=0,playerY=0,lastKnown=null,now=0,recoverUntil=0,attackUntil=0}=input;
  if(state==='recover') return now>=recoverUntil?{state:visible?'chase':'investigate',lastKnown:lastKnown||{x:playerX,y:playerY},direction:Math.sign(playerX-enemyX)||1}:{state:'recover',lastKnown};
  if(state==='telegraph') return now>=attackUntil?{state:'recover',lastKnown,direction:Math.sign(playerX-enemyX)||1}:{state:'telegraph',lastKnown};
  if(state==='search') return now >= (input.searchUntil || 0) ? {state:'patrol',lastKnown:null,direction:1} : {state:'search',lastKnown};
  if(visible) return {state:'chase',lastKnown:{x:playerX,y:playerY},direction:Math.sign(playerX-enemyX)||1};
  if(heard) return {state:'investigate',lastKnown:{x:heardX??playerX,y:heardY??playerY},direction:Math.sign((heardX??playerX)-enemyX)||1};
  if(state==='chase'||state==='investigate') return {state:'investigate',lastKnown,direction:lastKnown?(Math.sign(lastKnown.x-enemyX)||1):1};
  return {state:'patrol',lastKnown:null,direction:enemyX>0?1:-1};
}
