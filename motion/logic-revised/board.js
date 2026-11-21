/* In-game presentation for the six logic boards. The original builders own play state. */
(function () {
  'use strict';
  if (typeof pzPlay !== 'function') return;
  const boards = new Set(['pz_rid', 'pz_grid', 'pz_sudo', 'pz_tent', 'pz_door', 'pz_binary']);
  const play = pzPlay;
  pzPlay = function (id, build) {
    if (!boards.has(id)) return play(id, build);
    return play(id, api => {
      api.body.dataset.logicBoard = id.slice(3);
      const result = build(api);
      if (id === 'pz_tent') {
        for (const header of api.body.querySelectorAll('.tn10-h')) {
          header.textContent = XAR(header.textContent);
        }
      }
      return result;
    });
  };
})();
