/* Visual rescue board for the source-grounded Jaziran finale (PDF pp. 6 and 35).
   Read only native Atheran state; use only the separate idempotent rescue ledger. */
(function(){
  'use strict';
  const game=window.MindlabRescue;
  if(!game || game.open)return;
  function open(){
    if(!game.state().unlocked||typeof document==='undefined'||!document.body)return false;
    document.getElementById('mljr-modal')?.remove();
    const oldFocus=document.activeElement;
    const modal=document.createElement('section');
    modal.id='mljr-modal';modal.className='mlj-modal mljr-modal';
    modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-label','محاكاة إخلاء أَثْران');
    modal.innerHTML=
      '<div class="mlj-modal-card mljr-card" dir="rtl">'+
      '<header class="mlj-head"><div><small>قلب أَثْران · قبل المد الخامس</small><h2>طريق الإخلاء</h2></div>'+
      '<button id="mljr-close" type="button">إغلاق</button></header>'+
      '<div class="mljr-heroes">'+
        '<img src="motion/art10/char_ward.webp" alt="ورد">'+
        '<img src="motion/art10/char_rawaa.webp" alt="رواء">'+
        '<img src="motion/art10/char_nuha.webp" alt="نهى"></div>'+
      '<p class="mljr-intro">نوفل: إذا فتحنا البوابة على قياس القصر، الماء يدخل الحي أولًا. رواء: على قياس حجر البداية، يصل القارب قبلها بخطوة.</p>'+
      '<p class="mljr-instructions">ثبّت القرائن في مراسيها الثلاث، ثم اختر خريطة القناة وخطوة الإشارة. يمكن إكمال الإخلاء دون ألعاب التدريب والعوالم السرية. سجل الأدلة يساعدك، لكنه ليس بوابة إلزامية.</p>'+
      '<div class="mljr-game">'+
       '<div class="mljr-anchors" aria-label="مراسي الأدلة الثلاث"></div>'+
       '<fieldset class="mljr-fieldset"><legend>أي خريطة تطابق القياس والعمر؟</legend><div class="mljr-map-options"></div></fieldset>'+
       '<fieldset class="mljr-fieldset"><legend>في أي خطوة تُرسل الإشارة؟</legend><div class="mljr-time-options"></div></fieldset>'+
       '<div class="mljr-actions"><button type="button" id="mljr-run">شغّل محاكاة الإخلاء</button>'+
        '<button type="button" id="mljr-help">راجع أدلة الملفات الثلاثة</button></div>'+
      '</div>'+
      '<p class="mljr-status" role="status" aria-live="polite"></p>'+
      '<section class="mljr-success" hidden>'+
        '<h3>عبر القارب ووصل قبل إغلاق البوابة</h3>'+
        '<p>الخريطة ب · إشارة الخطوة الثانية · الوصول آخر الثالثة.</p>'+
        '<ol class="mljr-timeline" aria-label="خطوات المد الأربع"></ol>'+
        '<section class="mljr-decision">'+
          '<h3>ما الذي نتركه للطاقم القادم؟</h3>'+
          '<div class="mljr-decision-options"></div>'+
          '<p class="mljr-decision-result" aria-live="polite"></p>'+
          '<button type="button" id="mljr-alternative" hidden>شاهد أثر القرار الآخر</button>'+
        '</section>'+
        '<p class="mljr-last">أول شيء حطوه في الصندوق كان خريطة. آخر شيء تركوه فيه كان مكانًا لخرائطنا.</p>'+
        '<button type="button" id="mljr-replay">أعد تجربة الإخلاء دون مكافأة جديدة</button>'+
      '</section>'+
      '</div>';
    const $=x=>modal.querySelector(x);
    const status=$('.mljr-status');
    const selected={measure:null,time:null,age:null};
    let map=null,time=null;
    const button=(text,fn)=>{
      const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=fn;
      return b;
    };
    function setPressed(group,active){
      group.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===active)));
      status.textContent='';
    }
    for(const a of game.ANCHORS){
      const section=document.createElement('section');section.className='mljr-anchor';
      const heading=document.createElement('strong');heading.textContent=a.title;
      const clue=document.createElement('p');clue.textContent=a.clue;
      const options=document.createElement('div');options.className='mljr-options';
      a.options.forEach((label,i)=>{
        const b=button(label,()=>{selected[a.id]=i;setPressed(options,b);});
        b.setAttribute('aria-pressed','false');
        options.append(b);
      });
      section.append(heading,clue,options);
      $('.mljr-anchors').append(section);
    }
    for(const m of game.MAPS){
      const b=button(m.title,()=>{map=m.id;setPressed($('.mljr-map-options'),b);});
      b.setAttribute('aria-pressed','false');$('.mljr-map-options').append(b);
    }
    for(let step=1;step<=4;step++){
      const b=button('الخطوة '+['١','٢','٣','٤'][step-1],()=>{
        time=step;setPressed($('.mljr-time-options'),b);
      });
      b.setAttribute('aria-pressed','false');$('.mljr-time-options').append(b);
    }
    const result=$('.mljr-decision-result');
    function showDecision(){
      const x=game.state();
      const a=$('#mljr-alternative');
      if(x.decision){
        result.textContent=game.DECISIONS[x.decision].title+' · '+game.DECISIONS[x.decision].text;
        a.hidden=false;
      }else{
        result.textContent='اختر كيف تُترك الخريطة مفتوحة. كلا الخيارين يمنح نتيجة الإخلاء نفسها دون مكافأة إضافية.';
        a.hidden=true;
      }
    }
    for(const [key,value] of Object.entries(game.DECISIONS)){
      const b=button(value.title,()=>{
        const x=game.decide(key);
        if(x.ok)showDecision();
        else status.textContent='تعذر حفظ القرار؛ لا يُمنح أثر جديد دون حفظ.';
      });
      b.dataset.choice=key;
      $('.mljr-decision-options').append(b);
    }
    function showSuccess(){
      $('.mljr-game').hidden=true;
      $('.mljr-success').hidden=false;
      $('.mljr-timeline').replaceChildren();
      for(const stage of game.TIMELINE){
        const li=document.createElement('li');
        const num=document.createElement('b');num.textContent='خطوة '+['١','٢','٣','٤'][stage.step-1];
        const p=document.createElement('span');p.textContent=stage.text;
        li.append(num,p);$('.mljr-timeline').append(li);
      }
      showDecision();
      status.textContent='تمت المحاكاة وسُجّل إكمال طريق الإخلاء مرة واحدة. لا تتكرر مكافأة قلب أَثْران.';
    }
    $('#mljr-run').onclick=()=>{
      const res=game.simulate(selected,map,time);
      if(res.ok)showSuccess();else status.textContent=res.message;
    };
    $('#mljr-help').onclick=()=>{
      const evidence=window.MindlabEvidence;
      const files=['measurement','testimony','traces'];
      const book=files.map(id=>{
        try{
          const names={measurement:'القياس',testimony:'الشهادة',traces:'العمر'};
          return names[id]+': '+(evidence?.getFile(id,()=>({done:false}))?.question||'راجع مصدر هذا الملف');
        }catch(_){return '';}
      });
      status.textContent='مرجع المشهد: حجر البداية، عبور الثانية قبل الرابعة، قناة أقدم من الطوفان. '+book.join(' · ');
    };
    $('#mljr-alternative').onclick=()=>{
      const current=game.state().decision;
      if(!current)return;
      const alternative=current==='teach'?'post':'teach';
      result.textContent='معاينة فقط · '+game.DECISIONS[alternative].title+' · '+
        game.DECISIONS[alternative].text+' · اختيارك الأصلي محفوظ ولم يتغير.';
    };
    $('#mljr-replay').onclick=()=>{
      $('.mljr-game').hidden=false;$('.mljr-success').hidden=true;
      status.textContent='إعادة تدريب فقط: لا تُضاف مكافأة أو ختم جديد.';
      $('#mljr-run').focus({preventScroll:true});
    };
    function close(){
      modal.remove();
      if(oldFocus?.isConnected&&typeof oldFocus.focus==='function')oldFocus.focus({preventScroll:true});
    }
    $('#mljr-close').onclick=close;
    modal.addEventListener('click',e=>{if(e.target===modal)close();});
    modal.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();close();return;}
      if(e.key!=='Tab')return;
      const focusables=[...modal.querySelectorAll('button')].filter(b=>!b.disabled&&!b.hidden&&!b.closest('[hidden]'));
      if(!focusables.length)return;
      if(e.shiftKey&&document.activeElement===focusables[0]){e.preventDefault();focusables.at(-1).focus();}
      else if(!e.shiftKey&&document.activeElement===focusables.at(-1)){e.preventDefault();focusables[0].focus();}
    });
    document.body.append(modal);
    if(game.state().completed)showSuccess();
    $('#mljr-close').focus({preventScroll:true});
    return true;
  }
  game.open=open;
})();
