(function () {
  'use strict';

  const rotation = {
    width: 4,
    source: 0,
    locked: [2, 3, 6, 14],
    initial: [6, 5, 14, 12, 14, 12, 1, 10, 5, 10, 2, 13, 1, 4, 2, 9]
  };
  const directions = [[0, -1, 1, 4], [1, 0, 2, 8], [0, 1, 4, 1], [-1, 0, 8, 2]];
  const rotate = mask => ((mask << 1) | (mask >> 3)) & 15;
  function inspectPipes(tiles) {
    const adjacent = tiles.map(() => []);
    const leaks = [];
    const { width, source } = rotation;
    const height = tiles.length / width;
    tiles.forEach((mask, i) => {
      for (const [dx, dy, bit, opposite] of directions) {
        if (!(mask & bit)) continue;
        const x = i % width + dx, y = Math.floor(i / width) + dy;
        const next = y * width + x;
        if (x < 0 || x >= width || y < 0 || y >= height || !(tiles[next] & opposite)) {
          leaks.push([i, bit]);
        } else {
          adjacent[i].push(next);
        }
      }
    });
    const wet = new Set([source]);
    for (const i of wet) adjacent[i].forEach(j => wet.add(j));
    return { leaks, wet, won: !leaks.length && wet.size === tiles.length };
  }

  const routes = [
    { from: 'left', to: 'a' }, { from: 'left', to: 'b' }, { from: 'left', to: 'c' },
    { from: 'right', to: 'b' }, { from: 'right', to: 'c' }, { from: 'right', to: 'd' }
  ];
  const plans = [
    { supply: 24, targets: { a: 12, b: 6, c: 6, d: 0 } },
    { supply: 24, targets: { a: 6, b: 12, c: 0, d: 6 } }
  ];
  function measure(plan, open) {
    const totals = { a: 0, b: 0, c: 0, d: 0 };
    const volumes = routes.map(() => 0);
    const activeRoutes = { left: [], right: [] };
    routes.forEach((route, i) => {
      if (open[i]) activeRoutes[route.from].push(i);
    });
    let stalled = 0;
    for (const active of Object.values(activeRoutes)) {
      const supply = plan.supply / 2;
      if (!active.length) stalled += supply;
      for (const i of active) {
        volumes[i] = supply / active.length;
        totals[routes[i].to] += volumes[i];
      }
    }
    return { totals, volumes, stalled,
      won: stalled === 0 && Object.keys(totals).every(key => totals[key] === plan.targets[key]) };
  }

  const api = { rotation, directions, rotate, inspectPipes, routes, plans, measure };
  if (typeof module !== 'undefined') module.exports = api;
  else globalThis.pipeWorkshop = api;
})();
