/* Painted layers for the wreck, tide and temple. The engine still writes all positions and states. */
(function () {
  'use strict';
  if (typeof pzPlay !== 'function') return;
  const base = 'motion/pirate-revised/';
  const scenes = { pz_yhold: 'hold', pz_ytide: 'tide', pz_ydoor: 'temple' };
  const play = pzPlay;

  function sprite(file, name = '', className = '') {
    const image = new Image();
    image.src = base + file + '.webp';
    image.className = 'wreck-sprite ' + className;
    image.alt = name;
    image.draggable = false;
    return image;
  }

  function waterBoard(body, scene) {
    const board = body.querySelector(scene === 'hold' ? '#yhw' : '#ytw');
    const actor = board.querySelector('.xpirate');
    const columns = Math.round(100 / parseFloat(actor.style.width));
    const rows = Math.round(100 / parseFloat(actor.style.height));
    board.style.setProperty('--wreck-cols', columns);
    board.style.setProperty('--wreck-rows', rows);
    actor.replaceChildren(sprite(scene + '/player'));
    if (scene === 'hold') {
      for (const cell of board.querySelectorAll('.yhc:not(.yhp)')) {
        const type = cell.matches('.yhdoor') ? 'door' : cell.matches('.yhlev') ? 'lever'
          : cell.matches('.yhkey') ? 'key' : cell.nextElementSibling?.matches('#yhwa') ? 'hatch' : 'barrel';
        cell.replaceChildren(sprite('hold/' + type));
        if (type === 'door' || type === 'lever') {
          const badge = document.createElement('b');
          badge.className = 'wreck-channel';
          badge.textContent = XAR(Number(cell.dataset.c) + 1);
          cell.append(badge);
        }
      }
    } else {
      for (const rock of board.querySelectorAll('.ytr i')) {
        rock.replaceChildren(sprite('tide/dry-rock', '', 'wreck-dry'), sprite('tide/wet-rock', '', 'wreck-wet'));
      }
    }
    const directions = ['↑', '→', '↓', '←'];
    for (const button of body.querySelectorAll('.xpad button[data-d], .xpad button[data-a]:not(.ytwait)')) {
      button.textContent = directions[Number(button.dataset.d ?? button.dataset.a)];
    }
    const heading = body.querySelector('.xnote h3 svg');
    heading?.replaceWith(sprite(scene + (scene === 'hold' ? '/hatch' : '/dry-rock')));
  }

  const glyph = path => XRUNES.indexOf(path?.getAttribute('d'));

  function temple(body) {
    const board = body.querySelector('#ydw');
    const original = board.querySelector(':scope > svg');
    const face = document.createElement('div');
    face.className = 'wreck-temple-face';
    const rings = [...original.querySelectorAll(':scope > .ydr')];
    for (const [i, native] of rings.entries()) {
      const radius = Number(native.querySelector(':scope > circle').getAttribute('r'));
      const ring = document.createElement('div');
      ring.className = 'wreck-ring';
      ring.id = native.id;
      ring.style.transform = native.style.transform;
      ring.style.setProperty('--ring-radius', radius * 200 / 220 + '%');
      ring.append(sprite('temple/ring', '', 'wreck-ring-frame'));
      for (const [j, position] of [...native.querySelectorAll(':scope > g')].entries()) {
        const rune = glyph(position.querySelector('path'));
        if (rune < 0) continue;
        const angle = j * Math.PI / 3;
        const orbit = (radius - 10) * 100 / 220;
        const stone = sprite('temple/glyph-' + rune, 'رمز ' + XAR(rune + 1), 'wreck-rune');
        stone.style.left = 50 + Math.sin(angle) * orbit + '%';
        stone.style.top = 50 - Math.cos(angle) * orbit + '%';
        stone.style.setProperty('--rune-size', i === 3 ? '7%' : '8.2%');
        stone.dataset.rune = rune;
        ring.append(stone);
      }
      face.append(ring);
    }
    face.append(sprite('temple/hub', '', 'wreck-hub'));
    original.replaceWith(face);
    for (const icon of body.querySelectorAll('.ydwant svg')) {
      const rune = glyph(icon.querySelector('path'));
      if (rune >= 0) icon.replaceWith(sprite('temple/glyph-' + rune, 'رمز ' + XAR(rune + 1)));
    }
    for (const button of body.querySelectorAll('.ydlev button')) {
      const effect = document.createElement('span');
      effect.className = 'wreck-ring-effect';
      const colors = { 'rgba(58,38,22,.25)': '0', [XR]: '−1' };
      for (const [index, circle] of [...button.querySelectorAll('.ydmini circle')].entries()) {
        const value = colors[circle.getAttribute('stroke')] ?? (circle.hasAttribute('stroke-dasharray') ? '+2' : '+1');
        const number = document.createElement('small');
        number.textContent = XAR(value);
        number.setAttribute('aria-label', 'الحلقة ' + XAR(index + 1) + '، ' + XAR(value));
        effect.append(number);
      }
      button.replaceChildren(sprite('temple/lever'), effect);
      button.setAttribute('aria-label', 'الذراع ' + XAR(Number(button.dataset.j) + 1) + '، الحلقات ' + [...effect.children].map(label => label.textContent).join('، '));
    }
    body.querySelector('.xnote h3 svg')?.replaceWith(sprite('temple/hub'));
  }

  pzPlay = function (id, build) {
    const scene = scenes[id];
    if (!scene) return play(id, build);
    return play(id, api => {
      api.body.dataset.pirateWater = scene;
      const result = build(api);
      if (scene === 'temple') temple(api.body);
      else waterBoard(api.body, scene);
      for (const old of api.body.querySelectorAll('svg')) old.remove();
      return result;
    });
  };
})();
