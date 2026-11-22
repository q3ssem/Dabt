/* MindLab library folders — navigation-only layer. Puzzle content, difficulty, native
   completion counters and legacy save keys remain untouched for the later writing workshop. */
(function () {
  'use strict';
  if (!window.LA || typeof LA.librarySections !== 'function' ||
      typeof LA.puzzleTile !== 'function' || LA.puzzleFoldersReady) return;
  LA.puzzleFoldersReady = true;
  const arabic = number => String(number).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const labels = {
    'منطق وأرقام':'ui/art/lib_logic.webp',
    'حركة ومسارات':'ui/art/lib_moves.webp',
    'ألعاب القراصنة المصغّرة':'ui/art/lib_pirate.webp',
    'قصر المرايا':'ui/art/lib_mirrors.webp',
    'أرض أثران':'ui/art/lib_athran.webp',
    'الحطام والمعبد':'ui/art/lib_wreck.webp',
    'مغامرة القرصان':'ui/art/lib_pirate.webp'
  };
  let selected = null;
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  function wins(id) {
    try { return Math.max(0, Number(pzState()?.n?.[id] || 0)); }
    catch (_) { return 0; }
  }
  function sections() { return LA.librarySections().filter(row => row[1].length); }
  function available(list, i) {
    // First in each folder is available. A real recorded victory unlocks the next.
    // Preserve old players' previously won entries even if they changed folder order.
    return i === 0 || wins(list[i - 1].id) > 0 || wins(list[i].id) > 0;
  }
  function render(host) {
    host.replaceChildren();
    const list = sections();
    LA.puzzleCount = list.reduce((n,row) => n + row[1].length, 0);
    host.classList.add('ml-folder-library');
    if (selected && !list.some(row => row[0] === selected)) selected = null;
    if (!selected) {
      const intro = el('p','ml-folder-note','اختر قسمًا؛ افتح اللغز الأول، وكل حل يفتح الذي يليه.');
      const grid = el('div','ml-folder-categories');
      list.forEach(([name, games]) => {
        const solved = games.filter(g => wins(g.id) > 0).length;
        const btn = el('button','ml-folder-category');
        btn.type = 'button';btn.dataset.folderName = name;
        btn.setAttribute('aria-label', name + '، ' + arabic(solved) + ' من ' + arabic(games.length) + ' ألغاز مكتملة');
        const art = el('span','ml-folder-category-art');
        const image = document.createElement('img');
        image.src = labels[name] || 'ui/art/lib_logic.webp';
        image.alt = '';image.loading = 'lazy';image.decoding = 'async';
        art.append(image);
        btn.append(art,el('strong','ml-folder-category-title',name),
                   el('small','ml-folder-progress',arabic(solved) + ' / ' + arabic(games.length) + ' مكتمل'));
        btn.onclick = () => { selected = name; render(host); host.scrollIntoView({block:'start'}); };
        grid.append(btn);
      });
      host.append(intro,grid);
      return;
    }
    const row = list.find(entry => entry[0] === selected);
    const games = row[1];
    const head = el('div','ml-folder-bar');
    const back = el('button','ml-folder-back','رجوع إلى الأقسام');
    back.type='button';back.onclick=() => { selected=null;render(host);host.scrollIntoView({block:'start'}); };
    const heading = el('div','ml-folder-heading');
    heading.append(el('h3','',selected),
                   el('small','',arabic(games.filter(g => wins(g.id)>0).length) + ' من ' + arabic(games.length) + ' ألغاز مكتملة'));
    head.append(back,heading);
    const grid = el('div','ml-folder-grid');
    games.forEach((g,i) => {
      const complete = wins(g.id)>0,open=available(games,i),tile=LA.puzzleTile(g);
      tile.classList.add('ml-folder-puzzle',open?'ml-folder-open':'ml-folder-locked');
      tile.dataset.folderIndex=String(i+1);
      tile.setAttribute('aria-label',arabic(i+1)+'. '+g.name+'، '+(complete?'مكتمل':open?'متاح':'مقفل حتى حل السابق'));
      const icon = tile.querySelector('.la-library-image');
      if (icon) icon.setAttribute('aria-hidden','true');
      tile.prepend(el('span','ml-folder-number',arabic(i+1)));
      tile.append(el('span','ml-folder-state',complete?'✓':open?'ابدأ':'مقفل'));
      if (!open) {tile.disabled=true;tile.removeAttribute('data-legacy-puzzle');tile.onclick=null;}
      grid.append(tile);
    });
    host.append(head,grid);
  }
  LA.libraryInto = function(host) { render(host); };
  // Expose a read-only state getter for QA, not a completion bypass.
  LA.folderStatus = () => sections().map(([name,games]) => ({
    name,items:games.map((g,i)=>({id:g.id,open:available(games,i),done:wins(g.id)>0}))
  }));
  LA.folderBack = () => { selected=null; };
  window.addEventListener('mindlab:journey-progress', () => {
    const host=document.querySelector('#v-puz .v5-hublib.ml-folder-library');
    if(host) render(host);
  });
  if (typeof curTab !== 'undefined' && curTab === 'puz' && !LA.view &&
      typeof renderPuz === 'function') renderPuz();
})();
