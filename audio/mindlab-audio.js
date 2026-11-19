/* Resume audio only from a user gesture. An automatic result must never wait on
   a suspended audio device; WebKit may block when sources are started mid-resume. */
(function installGestureAudioLifecycle(){
  if (typeof audioOK !== 'function' || typeof unlockAudio !== 'function') return;
  const events = ['pointerdown','touchend','keydown'], oldUnlock = unlockAudio;
  events.forEach(event => document.removeEventListener(event, oldUnlock, true));
  let waking = null;
  const idle = ctx => {
    clearTimeout(audioOK.t);
    audioOK.t = setTimeout(() => {
      if (ctx.state !== 'running') return;
      const playing = typeof DX !== 'undefined' && typeof DX.inRound === 'function' && DX.inRound();
      if (!document.hidden && !S.st.mute && playing) { idle(ctx); return; }
      ctx.suspend().catch(() => {});
    }, 5000);
  };
  unlockAudio = function(){
    clearTimeout(audioOK.t);
    if (document.hidden || S.st.mute) { sleepAudio(); return; }
    const ctx = acInit();
    if (!ctx) return;
    if (ctx.state === 'running') { idle(ctx); return; }
    if (ctx.state !== 'suspended' || waking) return;
    try {
      waking = Promise.resolve(ctx.resume()).catch(() => {}).finally(() => {
        waking = null;
        if ((document.hidden || S.st.mute) && ctx.state === 'running') ctx.suspend().catch(() => {});
        else if (ctx.state === 'running') idle(ctx);
      });
    } catch (_) { waking = null; }
  };
  audioOK = function(){
    if (document.hidden || S.st.mute) return false;
    const ctx = acInit();
    if (!ctx || ctx.state !== 'running') return false;
    idle(ctx);
    return true;
  };
  events.forEach(event => document.addEventListener(event, unlockAudio, {capture:true,passive:true}));
})();

/* MindLab 5.4.7 — tactile, low-volume procedural sound palette.
   Uses the existing shared AudioContext and mute preference; no downloaded media. */
(function(){
  if (typeof sfx !== 'object' || !sfx) return;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function ready(){try{return !S.st.mute && audioOK() && AC && MASTER;}catch(e){return false;}}
  function osc(f,d=.09,type='sine',v=.08,bend=1,delay=0){if(!ready())return;try{const t=AC.currentTime+.008+delay,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(Math.max(35,f),t);if(bend!==1)o.frequency.exponentialRampToValueAtTime(Math.max(30,f*bend),t+d);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,v),t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(MASTER);o.start(t);o.stop(t+d+.025);}catch(e){}}
  function noise(d=.08,cut=900,v=.06,kind='lowpass',delay=0){if(!ready())return;try{const sr=AC.sampleRate,n=Math.max(128,Math.floor(sr*d)),b=AC.createBuffer(1,n,sr),a=b.getChannelData(0);let brown=0;for(let i=0;i<n;i++){const w=Math.random()*2-1;brown=(brown+w*.22)/1.22;a[i]=(kind==='highpass'?w:brown)*Math.pow(1-i/n,1.65);}const src=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain(),t=AC.currentTime+.008+delay;src.buffer=b;f.type=kind;f.frequency.setValueAtTime(cut,t);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);src.connect(f);f.connect(g);g.connect(MASTER);src.start(t);src.stop(t+d+.02);}catch(e){}}
  const sounds={
    wood(){noise(.055,1000,.075);osc(145,.075,'triangle',.075,.62,.008);},
    stone(){noise(.16,520,.105);osc(82,.19,'sine',.11,.52,.012);},
    metal(){osc(880,.12,'triangle',.075,1.42);osc(1320,.1,'sine',.04,.78,.012);},
    glass(){osc(1568,.22,'sine',.07,1.08);osc(2093,.17,'sine',.035,.92,.035);},
    water(){noise(.22,1300,.055,'lowpass');osc(260,.15,'sine',.045,.72,.018);},
    paper(){noise(.12,2400,.048,'highpass');osc(560,.035,'sine',.025,.8,.018);},
    rope(){noise(.12,380,.055);osc(118,.16,'sawtooth',.035,.82,.01);},
    gear(){osc(410,.07,'triangle',.065,.72);osc(620,.055,'triangle',.045,.7,.085);},
    bell(){osc(1046,.3,'sine',.075,1.01);osc(1568,.24,'sine',.03,.98,.012);},
    switch(){osc(720,.045,'square',.035,.62);osc(360,.06,'sine',.04,1.3,.035);},
    pencil(){noise(.075,3100,.028,'highpass');osc(690,.045,'sine',.025,.9,.025);},
    seal(){noise(.035,420,.07);osc(105,.12,'sine',.07,.6,.018);},
    hop(){osc(190,.07,'triangle',.07,1.6);noise(.035,650,.035,'lowpass',.025);},
    chime(){osc(1318,.28,'sine',.06,1.0);osc(1760,.2,'sine',.025,1,.045);}
  };
  sfx.material=sounds;
  sfx.puzzleMove=(kind)=>{
    const map={locks:'metal',cipher:'paper',mirrors:'glass',torn:'paper',chime:'bell',linked:'chime',tide:'water',weigh:'stone',valves:'metal',slide:'stone',lights:'glass',scales:'metal',ropes:'rope',gearfit:'gear',drums:'wood',push:'stone',stroke:'pencil',hanoi:'wood',river:'water',frogs:'hop',path:'glass'};
    (sounds[map[kind]||'wood']||sounds.wood)();
  };
  sfx.puzzleSelect=()=>sounds.switch();
  sfx.puzzleUndo=()=>{sounds.paper();osc(420,.06,'triangle',.025,.72,.025);};
  sfx.puzzleError=()=>{osc(165,.16,'triangle',.055,.65);noise(.06,380,.025);};
  sfx.puzzleWin=()=>{sounds.bell();[784,988,1175].forEach((f,i)=>osc(f,.28,'sine',.045,1,i*.085));};
  sfx.seaTransition=()=>{sounds.water();sounds.bell();osc(880,.32,'sine',.045,1.18,.14);};
  sfx.brainMove=()=>{
    let cat='log',id='';try{const g=typeof curGame==='function'?curGame():null;cat=g&&g.cat||'log';id=g&&g.id||'';}catch(e){}
    const palettes={mem:['glass','bell','chime'],foc:['wood','paper','switch'],spd:['switch','metal','gear'],log:['gear','stone','seal'],flx:['chime','water','rope'],spa:['metal','glass','stone']};
    const list=palettes[cat]||palettes.log,hash=[...id].reduce((a,c)=>a+c.charCodeAt(0),0);(sounds[list[hash%list.length]]||sounds.gear)();
  };
  /* Existing brain-game tick calls now resolve to a skill/game-specific tactile sound. */
  sfx.tick=()=>sfx.brainMove();
})();
