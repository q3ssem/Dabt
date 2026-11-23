(() => {
  'use strict';
  const { rotation, directions, rotate, inspectPipes, plans, routes, measure } = pipeWorkshop;
  const $ = id => document.getElementById(id);
  const number = new Intl.NumberFormat('ar', { maximumFractionDigits: 2 });
  const ar = n => number.format(n);
  const houses = { a: 'أ', b: 'ب', c: 'ج', d: 'د' };
  const sideNames = { left: 'الأيسر', right: 'الأيمن' };
  const nodes = {
    source: [50,12], left: [24,36], right: [76,36],
    a: [10,88], b: [36,88], c: [64,88], d: [90,88]
  };
  const gatePositions = [9, 25, 41, 59, 75, 91].map(x => [x, 59]);
  const copy = [
    {
      name: 'نبع عند الباب',
      intro: 'رفعت نهى غطاء النبع لتجد أول قناة ملتوية.',
      rule: 'دوّر الأنابيب حتى تتقابل الفتحات ويصل النبع إلى جميع القطع.',
      hints: ['ابدأ من حدود اللوحة. لا ينبغي أن تتجه فتحة إلى خارجها.',
        'الأنبوب المستقيم على الحافة اليسرى في الصف الثالث لا يمكن أن يفتح غربًا.',
        'إذا جعلت الأنبوب المجاور له أفقيًا، فلن يجد طرفه الأيسر فتحة مقابلة. افحص ما بقي من اتجاهاته.'],
      success: 'أغلقت كل الأطراف ووصل الماء إلى البيوت.'
    },
    {
      name: 'نصيب البيوت',
      intro: 'وصل الماء إلى الحي. والآن لكل بيت حاجة مختلفة.',
      rule: 'يصل ١٢ إلى كل مفترق، ويتوزع بالتساوي بين صماماته المفتوحة. اضبطها ثم جرّب الضخ.',
      hints: ['ابدأ بالبيت أ؛ له مدخل واحد.',
        'من نصيب المفترق الأيسر يحتاج البيت أ إلى الكمية كلها. راجع الفروع الأخرى منه.',
        'بعد ضبط البيت أ، احسب كم فرعًا يجب أن يبقى مفتوحًا في المفترق الأيمن ليصل إلى البيت ج نصف نصيبه.'],
      success: 'وصلت حصة كل بيت. تستطيع نهى الآن اختبار المفترق المشترك.'
    },
    {
      name: 'البيت ذو المدخلين',
      intro: 'في الحي الثاني بيت يستقبل الماء من مفترقين.',
      rule: 'يتوزع نصيب كل مفترق بالتساوي بين صماماته المفتوحة. كميّتا المدخلين تُجمعان عند البيت.',
      hints: ['البيتان أ ود يطلبان نصف نصيب مفترقيهما.',
        'لإعطاء نصف النصيب، يحتاج كل مفترق إلى مسارين مفتوحين.',
        'بعد تأمين أ ود، اختر فرعين للبيت الذي يحتاج مجموع النصفين. أبقِ ج جافًا.'],
      success: 'توازنت الحصص حتى عند البيت ذي المدخلين.'
    }
  ];
  let stage = 0, state = [], history = [], hint = 0, result = null, won = false;
  const initial = () => stage ? routes.map(() => false) : rotation.initial.slice();
  const status = message => { $('status').textContent = message; };

  function begin(nextStage) {
    stage = nextStage;
    state = initial();
    history = [];
    hint = 0;
    result = null;
    won = false;
    $('entry').hidden = true;
    $('play').hidden = false;
    $('stage-name').textContent = copy[stage].name;
    $('intro').textContent = copy[stage].intro;
    $('rule').textContent = copy[stage].rule;
    $('hint-panel').textContent = '';
    status('');
    draw();
    $('board').querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
  }

  function finish() {
    won = true;
    status(copy[stage].success);
  }
  function change(index) {
    if (won) return;
    history.push(state.slice());
    state[index] = stage ? !state[index] : rotate(state[index]);
    result = null;
    if (stage) status('');
    else if (inspectPipes(state).won) finish();
    draw(index);
  }

  function pipes() {
    const { leaks, wet } = inspectPipes(state);
    $('board').className = 'rotation';
    $('board').innerHTML = state.map((mask, index) => {
      const locked = rotation.locked.includes(index);
      const label = index === rotation.source ? 'النبع' : mask && !(mask & (mask - 1)) ? 'بيت' : 'أنبوب';
      const ports = directions.flatMap(([,,bit], i) => {
        if (!(bit & mask)) return [];
        const open = leaks.some(([tile, port]) => tile === index && port === bit);
        return `<i class="arm d${i}${open ? ' leak' : ''}"></i>`;
      }).join('');
      return `<button type="button" class="tile${wet.has(index) ? ' wet' : ''}" data-move="${index}"
        aria-label="${label}، صف ${ar(Math.floor(index / rotation.width) + 1)}، عمود ${ar(index % rotation.width + 1)}${locked ? '، ثابت' : ''}، الفتحات ${directions.flatMap(([,,bit], i)=>mask & bit ? [['أعلى','يمين','أسفل','يسار'][i]] : []).join('، ')}"
        ${locked || won ? 'disabled' : ''}>${ports}<i class="joint"></i>
        ${label !== 'أنبوب' || locked ? `<span class="tile-mark">${locked ? 'ثابت' : label}</span>` : ''}</button>`;
    }).join('');
    if (!won) status(`أطراف مفتوحة ${ar(leaks.length)} · قطع متصلة بالنبع ${ar(wet.size)} من ${ar(state.length)}`);
  }

  function planBoard() {
    const plan = plans[stage-1];
    $('board').className = 'network';
    $('board').innerHTML = `<canvas aria-hidden="true"></canvas>
      <div class="station source" style="--x:50%;--y:10%"><img src="../../../../../motion/revised/garden/fountain.webp" alt="">المنبع · ${ar(plan.supply)}</div>
      ${Object.keys(sideNames).map(key => `<div class="station junction" style="--x:${nodes[key][0]}%;--y:36%">مفترق ${sideNames[key]} · ${ar(plan.supply/2)}</div>`).join('')}
      ${routes.map(({from,to}, i) => {
        const [x,y] = gatePositions[i];
        return `<button type="button" class="valve" data-move="${i}" aria-pressed="${state[i]}"
          aria-label="صمام ${sideNames[from]} إلى البيت ${houses[to]}، ${state[i]?'مفتوح':'مغلق'}"
          style="--x:${x}%;--y:${y}%" ${won?'disabled':''}>
          <img src="../../../../../motion/revised/garden/gate.webp" alt=""><span>${state[i]?'مفتوح':'مغلق'}</span></button>`;
      }).join('')}
      ${Object.keys(houses).map(key => `<div class="station house" style="--x:${nodes[key][0]}%;--y:86%">
        <span>بيت ${houses[key]}</span><b>يطلب ${ar(plan.targets[key])}</b>
        <small>${result ? 'وصل ' + ar(result.totals[key]) : ''}</small></div>`).join('')}`;
    paintNetwork();
  }

  function paintNetwork() {
    const canvas = $('board').querySelector('canvas');
    if (!canvas) return;
    const { width, height } = canvas.getBoundingClientRect();
    const scale = devicePixelRatio || 1;
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    const dark = document.documentElement.dataset.theme === 'dark';
    function trace(a, b, enabled, wet, via) {
      ctx.beginPath();
      ctx.moveTo(a[0]*width/100,a[1]*height/100);
      if (via) ctx.lineTo(via[0]*width/100,via[1]*height/100);
      ctx.lineTo(b[0]*width/100,b[1]*height/100);
      // Outline each wire, so its crossing with another wire is not a junction.
      ctx.setLineDash([]);
      ctx.lineWidth = 13;
      ctx.strokeStyle = dark ? '#1b282b' : '#eeeadd';
      ctx.stroke();
      ctx.lineWidth = 6;
      ctx.strokeStyle = wet ? '#007c91' : enabled ? (dark ? '#ddc19d' : '#705439') : '#96918a';
      ctx.setLineDash(enabled ? [] : [4,5]);
      ctx.stroke();
    }
    trace(nodes.source,nodes.left,true,!!result);
    trace(nodes.source,nodes.right,true,!!result);
    routes.forEach(({from,to},i)=>trace(nodes[from],nodes[to],state[i],result?.volumes[i]>0,gatePositions[i]));
  }

  function draw(focusIndex) {
    if (stage) planBoard(); else pipes();
    $('board').querySelectorAll('[data-move]').forEach(button => {
      button.onclick = () => change(Number(button.dataset.move));
    });
    $('undo').disabled = !history.length || won;
    $('check').hidden = !stage || won;
    $('next').hidden = !won || stage === copy.length - 1;
    if (won && !$('next').hidden) $('next').focus({ preventScroll: true });
    else if (focusIndex != null) $('board').querySelector(`[data-move="${focusIndex}"]`)?.focus({ preventScroll: true });
  }

  $('start').onclick = () => begin(0);
  $('next').onclick = () => begin(stage+1);
  $('reset').onclick = () => begin(stage);
  $('back').onclick = () => {
    $('play').hidden = true;
    $('entry').hidden = false;
    $('stage-name').textContent = '';
    $('start').focus();
  };
  $('undo').onclick = () => {
    if (!history.length || won) return;
    state = history.pop();
    result = null;
    status('أعدت الخطوة السابقة.');
    draw();
  };
  $('hint').onclick = () => {
    $('hint-panel').textContent = copy[stage].hints[Math.min(hint++,2)];
  };
  $('check').onclick = () => {
    if (!stage || won) return;
    result = measure(plans[stage-1],state);
    if (result.won) finish();
    else status(result.stalled ? `بقيت ${ar(result.stalled)} وحدة عند مفترق مغلق. راجع المسارات.`
      : 'قارِن ما وصل بكل كمية مطلوبة. فتح فرع جديد يقسم حصة المفترق من جديد.');
    draw();
  };
  $('theme').onclick = () => {
    const dark = document.documentElement.dataset.theme !== 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    $('theme').setAttribute('aria-pressed',String(dark));
    $('theme').textContent = dark ? 'الوضع الفاتح' : 'الوضع الداكن';
    paintNetwork();
  };
  new ResizeObserver(paintNetwork).observe($('board'));
})();
