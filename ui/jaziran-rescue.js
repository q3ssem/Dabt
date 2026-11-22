/* جزران.pdf pp. 3, 6–7, 35: independent evacuation simulation.
 * Native pz_aheart remains the earned chapter completion; this layer never
 * rewrites campaign progress, native reward keys, or optional branch gates. */
(function(){
  'use strict';
  if(window.MindlabRescue)return;
  const KEY='mindlab:journey:jaziran-rescue:v1',VERSION=1;
  const MAPS=[
    {id:'A',title:'أ · خريطة القصر',measure:'حجر المرفأ',age:'بعد الطوفان',steps:[1,2]},
    {id:'B',title:'ب · خريطة الضفة',measure:'حجر البداية',age:'قبل الطوفان',steps:[2,3]},
    {id:'C',title:'ج · مسح المدينة',measure:'حجر البداية',age:'بعد الطوفان',steps:[3,4]}
  ];
  const ANCHORS=[
    {id:'measure',title:'مرساة القياس',file:'measurement',
      clue:'الأخدود النحاسي يطابق حجر البداية.',
      options:['حجر المرفأ','حجر البداية','ساعة القصر'],answer:1},
    {id:'time',title:'مرساة الزمن',file:'testimony',
      clue:'شاهد الضفة رأى القارب يغادر في الثانية ويصل قبل بداية الرابعة.',
      options:['القارب يعبر في الثانية قبل إغلاق الرابعة','ثلاث نسخ من سجل الحارس تعدّ ثلاثة شهود','العبور يبدأ في الرابعة'],answer:0},
    {id:'age',title:'مرساة العمر',file:'traces',
      clue:'القناة تحت طبقة الطوفان المتصلة، لذلك حُفرت قبله.',
      options:['القناة حفرت بعد الطوفان','لا نستطيع تأريخ القناة','القناة حفرت قبل الطوفان'],answer:2}
  ];
  const TIMELINE=[
    {step:1,text:'القناة مغلقة؛ لم تبدأ نافذة العبور.'},
    {step:2,text:'ترسل الإشارة ويغادر قارب الإخلاء من علامة X.'},
    {step:3,text:'يصل القارب آخر الثالثة، ويبدأ إخلاء أهل الضفة.'},
    {step:4,text:'تغلق البوابة عند بداية الرابعة؛ العبور تم قبل الإغلاق.'}
  ];
  const DECISIONS={
    teach:{title:'علّم الطاقم القادم',text:'يتسلم البحّار الجديد الخريطة ويعيد قياس المد تحت نظر نهى. يُضاف درس إلى سجل الرحلة.'},
    post:{title:'علّق نسخة عند المرسى',text:'تُنشر خطوط القياس ومعايرتها عند المرسى، ويصبح بإمكان الجميع اختبارها.'}
  };
  const nativeComplete=()=>{
    try{const a=window.ATHERAN_CAMPAIGN?.summary();return !!(a?.open&&a?.a?.done?.pz_aheart);}
    catch(_){return false;}
  };
  function persisted(){
    try{
      const x=JSON.parse(localStorage.getItem(KEY)||'null');
      return x&&x.version===VERSION&&x.completed===true&&x.map==='B'&&x.step===2&&
        Number.isSafeInteger(x.completedAt)&&x.completedAt>0?x:null;
    }catch(_){return null;}
  }
  const save=o=>{try{localStorage.setItem(KEY,JSON.stringify(o));return true;}catch(_){return false;}};
  function state(){
    const x=persisted();
    return {unlocked:nativeComplete(),completed:!!x,completedAt:x?.completedAt||null,
      decision:DECISIONS[x?.decision]?x.decision:null,decidedAt:Number.isSafeInteger(x?.decidedAt)?x.decidedAt:null};
  }
  function check(anchors,map,step){
    if(!nativeComplete())return {ok:false,reason:'locked',message:'يجب إكمال قلب أَثْران أولًا.'};
    if(!anchors||typeof anchors!=='object')return {ok:false,reason:'anchors',message:'ضع القرائن في المراسي الثلاث.'};
    for(const a of ANCHORS){
      if(!Number.isInteger(anchors[a.id])||anchors[a.id]!==a.answer){
        const message={
          measure:'مرساة القياس ترفض المرجع: الأخدود النحاسي يطابق حجر البداية.',
          time:'مرساة الزمن ترفض النسخ المنقولة: راجع شهادة الضفة وتوقيت القارب.',
          age:'مرساة العمر ترفض التأريخ: القناة حُفرت قبل الطوفان.'
        }[a.id];
        return {ok:false,reason:a.id,message};
      }
    }
    if(map==='A')return {ok:false,reason:'map-measure',message:'الخريطة أ مرفوضة: مرجعها حجر المرفأ لا حجر البداية.'};
    if(map==='C')return {ok:false,reason:'map-age',message:'الخريطة ج مرفوضة: القناة فيها أحدث من طبقة الطوفان.'};
    if(map!=='B')return {ok:false,reason:'map',message:'اختر خريطة الضفة المطابقة للقياس وعمر الأثر.'};
    if(step===1)return {ok:false,reason:'early',message:'الإشارة في الأولى مبكرة؛ القناة لا تزال مغلقة.'};
    if(step===3)return {ok:false,reason:'late',message:'الإشارة في الثالثة متأخرة؛ القارب يصل بعد إغلاق البوابة.'};
    if(step===4)return {ok:false,reason:'closed',message:'البوابة تُغلق في بداية الرابعة؛ فات وقت الإشارة.'};
    if(step!==2)return {ok:false,reason:'step',message:'اختر إحدى الخطوات الأربع لإرسال الإشارة.'};
    return {ok:true,reason:'safe',message:'خريطة ب · الإشارة في الثانية، ويصل القارب آخر الثالثة قبل إغلاق الرابعة.'};
  }
  function simulate(anchors,map,step){
    const result=check(anchors,map,step);
    if(!result.ok)return result;
    const x=persisted();
    if(x)return {...result,awarded:false,completedAt:x.completedAt};
    const completedAt=Date.now();
    if(!save({version:VERSION,completed:true,map:'B',step:2,completedAt}))
      return {ok:false,reason:'storage',message:'تعذّر حفظ الإخلاء؛ لا يصدر الإكمال دون حفظ مؤكد.'};
    try{window.dispatchEvent?.(new CustomEvent('mindlab:jaziran-rescue-complete'));}catch(_){}
    return {...result,awarded:true,completedAt};
  }
  function decide(choice){
    if(!DECISIONS[choice])return {ok:false,reason:'choice'};
    if(!nativeComplete())return {ok:false,reason:'locked'};
    const x=persisted();
    if(!x)return {ok:false,reason:'unfinished'};
    if(DECISIONS[x.decision])return {ok:true,awarded:false,decision:x.decision};
    x.decision=choice;x.decidedAt=Date.now();
    if(!save(x))return {ok:false,reason:'storage'};
    return {ok:true,awarded:false,decision:choice};
  }
  window.MindlabRescue={KEY,MAPS,ANCHORS,TIMELINE,DECISIONS,state,check,simulate,decide};
})();
