/* Curated checkpoint boards for three pirate puzzles. Existing solvers own all rules. */
(function () {
  'use strict';
  if (typeof xrMake !== 'function' || typeof xgMake !== 'function' || typeof xcMake !== 'function') return;
  const checkpoints = new Map([[1, 0], [4, 1], [7, 2]]);
  const reef = [
    {"w":6,"h":7,"start":40,"goal":18,"min":3,"rocks":[9,15,29,36],"currents":[]},
    {"w":7,"h":9,"start":49,"goal":13,"min":5,"rocks":[1,4,5,6,7,35,39,41,56],"currents":[[22,0],[27,3]]},
    {"w":8,"h":10,"start":69,"goal":8,"min":8,"rocks":[0,27,44,50,51,57,61,64,67,76,77],"currents":[[9,2],[37,1],[71,3],[79,3]]}
  ];
  const bridge = [
    {"W":8,"pil":[0,3,5,6,7,8],"planks":[3,2,3,4],"sol":[3,3,2]},
    {"W":11,"pil":[0,1,3,4,6,8,9,11],"planks":[1,4,3,1,4],"sol":[4,4,3]},
    {"W":14,"pil":[0,1,3,5,7,10,11,14],"planks":[2,4,3,1,4,3,4],"sol":[3,4,3,4]}
  ];
  const cave = [
    {"symbols":["star","anchor","sun"],"ord":[2,0,1],"clues":[{"t":"nadj","a":1,"b":2},{"t":"at","a":1,"k":2}],"tries":3},
    {"symbols":["moon","star","sun","sword","skull"],"ord":[0,3,2,4,1],"clues":[{"t":"btw","a":1,"b":4,"c":3},{"t":"bef","a":0,"b":1},{"t":"nat","a":4,"k":2},{"t":"btw","a":0,"b":3,"c":2},{"t":"adj","a":2,"b":4}],"tries":3},
    {"symbols":["skull","anchor","sword","sun","moon","star"],"ord":[0,3,4,1,5,2],"clues":[{"t":"btw","a":3,"b":4,"c":5},{"t":"nadj","a":1,"b":2},{"t":"btw","a":2,"b":1,"c":4},{"t":"btw","a":2,"b":5,"c":4},{"t":"bef","a":0,"b":3},{"t":"bef","a":4,"b":2}],"tries":2}
  ];
  const reefOriginal = xrMake;
  xrMake = function (level) {
    const design = reef[checkpoints.get(level)];
    if (!design) return reefOriginal(level);
    const rock = Array(design.w * design.h).fill(false);
    const cur = Array(rock.length).fill(-1);
    design.rocks.forEach(i => { rock[i] = true; });
    design.currents.forEach(([i, direction]) => { cur[i] = direction; });
    const board = { w: design.w, h: design.h, start: design.start, goal: design.goal, rock, cur };
    board.sol = xrSolve(board, board.start);
    if (!board.sol || board.sol.length !== design.min) return reefOriginal(level);
    board.min = board.sol.length;
    return board;
  };

  const bridgeOriginal = xgMake;
  xgMake = function (level) {
    const design = bridge[checkpoints.get(level)];
    return design ? { W: design.W, pil: new Set(design.pil), planks: design.planks.slice(), sol: design.sol.slice() }
      : bridgeOriginal(level);
  };

  const caveOriginal = xcMake;
  xcMake = function (level) {
    const design = cave[checkpoints.get(level)];
    if (!design) return caveOriginal(level);
    const ord = design.ord.slice();
    const pos = [];
    ord.forEach((symbol, index) => { pos[symbol] = index; });
    return { n: ord.length, syms: design.symbols.map(key => XC_SYM.find(symbol => symbol.k === key)),
      ord, pos, clues: design.clues.map(clue => ({ ...clue })), tries: design.tries };
  };
})();
