/* Raster artwork on the three treasure rounds. Rules and generated geometry belong to the game. */
(function () {
  'use strict';
  if (typeof pzPlay !== 'function') return;
  const boards = { pz_tmap: 'map', pz_tdig: 'dig', pz_xlock: 'lock' };
  const base = 'motion/pirate-revised/';
  const play = pzPlay;

  function stencil(markup) {
    const template = document.createElement('template');
    template.innerHTML = markup;
    return template.content.querySelector('svg')?.innerHTML;
  }

  function mount(body, scene) {
    const island = scene !== 'lock';
    const artwork = new Map();
    const register = (html, file, label = '', extra = '') => {
      const key = stencil(html);
      if (key && !artwork.has(key)) artwork.set(key, { file, label, extra });
    };
    if (island) {
      const points = scene === 'map' ? TI_LM : [{ k: 'palm', n: 'نخلة' }, { k: 'rock', n: 'صخرة' }, { k: 'tree', n: 'شجرة' }];
      for (const { k, n } of points) register(XS_[k], base + scene + '/' + k + '.webp', n);
      register(XS_.rose, 'expedition10/art/props/08-island-compass.webp');
      register(XS_.shovel, base + scene + '/shovel.webp');
    } else {
      for (const { k, n } of XK_SYM) register(xkIcon(k), base + 'lock/' + k + '.webp', n);
      register(XS_.key, 'motion/art/key.webp');
      for (const { s, n } of XT) register(s, 'motion/art/treasure_gem.webp', n, 'painted-prize');
    }
    register(XS_.coin, base + 'lock/coin.webp');
    register(XS_.gem, 'motion/art/treasure_gem.webp');

    function swap(svg) {
      const inChest = svg.matches('.xchest') || svg.parentElement?.matches('#xkc,.xfound');
      const sprite = inChest
        ? { file: base + 'lock/' + (svg.closest('.xfound') ? 'chest-open' : 'chest') + '.webp', label: '', extra: 'painted-chest' }
        : artwork.get(svg.innerHTML);
      if (!sprite) {
        if (!svg.matches('.xbsv') && svg.closest('.xpin')) body.dataset.paintUnmatched = 'true';
        svg.remove();
        return;
      }
      const image = new Image();
      image.src = sprite.file;
      image.alt = svg.closest('.xcoin') ? '' : sprite.label;
      image.className = 'pirate-raster ' + (sprite.extra || '');
      image.draggable = false;
      if (svg.parentElement?.matches('.xkdial')) {
        svg.parentElement.setAttribute('aria-label', 'الخانة ' + XAR(+svg.parentElement.dataset.d + 1) + '، ' + sprite.label);
      }
      if (sprite.extra === 'painted-prize') {
        const caption = document.createElement('span');
        caption.textContent = sprite.label;
        svg.replaceWith(image, caption);
      } else {
        svg.replaceWith(image);
      }
    }

    if (island) {
      const grid = body.querySelector('#xb .xbg');
      const n = Number(body.querySelector('#xb')?.style.getPropertyValue('--n'));
      if (grid && n) {
        for (const cell of grid.querySelectorAll('button.xc')) {
          const index = Number(cell.dataset.i);
          cell.setAttribute('aria-label', 'صف ' + XAR(Math.floor(index / n) + 1) + '، عمود ' + XAR(index % n + 1));
        }
      }
    } else {
      const chest = body.querySelector('#xkc');
      if (chest) {
        const open = new Image();
        open.src = base + 'lock/chest-open.webp';
        open.alt = '';
        open.className = 'painted-open-chest';
        chest.append(open);
      }
    }
    const flush = () => { for (const svg of body.querySelectorAll('svg')) swap(svg); };
    flush();
    const observer = new MutationObserver(records => {
      for (const { addedNodes } of records) {
        for (const node of addedNodes) {
          if (node.nodeType !== 1 || !body.contains(node)) continue;
          if (node.matches('svg')) swap(node);
          else for (const svg of node.querySelectorAll('svg')) swap(svg);
        }
      }
    });
    observer.observe(body, { childList: true, subtree: true });
    cleanup.push(() => {
      observer.disconnect();
      if (body.isConnected) flush();
    });
  }

  pzPlay = function (id, build) {
    const scene = boards[id];
    if (!scene) return play(id, build);
    return play(id, api => {
      api.body.dataset.piratePaint = scene;
      const result = build(api);
      mount(api.body, scene);
      return result;
    });
  };
})();
