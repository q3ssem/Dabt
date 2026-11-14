'use strict';
(function(){
const A=MindLabAssessment,E=DabtAssessmentEngine,$=s=>document.querySelector(s);let store;
function render(){const root=A.readRoot(),results=store.getAll(),data=E.dashboard(results),sum=E.summarize(results),stats=$('#stats');stats.replaceChildren();
[['الجلسات',data.totals.sessions],['المحاولات',data.totals.attempts],['الدقة',sum.sessions?Math.round(results.reduce((n,r)=>n+r.correct,0)/Math.max(1,data.totals.attempts)*100)+'%':'—']].forEach(([label,value])=>{const n=A.text('div','','stat');n.append(A.text('b',value),A.text('span',label));stats.append(n);});
const list=$('#sessions');list.replaceChildren();if(!data.recentSessions.length)list.append(A.text('p','لا توجد جلسات مرجعية بعد. ابدأ تجربة القاعدة المتغيرة.'));
data.recentSessions.forEach(s=>{const n=A.text('article','','session');n.append(A.text('b',s.stageTitle||s.gameId),A.text('p',Math.round(s.accuracy*100)+'% · '+s.attempts+' محاولات'),A.text('small',new Date(s.completedAt).toLocaleString('ar-SA-u-nu-latn')));list.append(n);});
$('#legacy').textContent='عدد جلسات التقييم السابقة المحفوظة: '+(Array.isArray(root.assess)?root.assess.length:0)+'. بقيت بياناتها الأصلية محفوظة.';
}
try{A.readRoot();store=A.createStore();render();}catch(e){A.message('تعذرت قراءة النتائج: '+e.message,true);$('#export').disabled=true;$('#import').disabled=true;return;}
$('#export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(store.exportData(),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='MindLab_Assessment.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#import').onchange=async function(){const f=this.files[0];if(!f)return;try{if(f.size>5e6)throw Error('اختر ملفًا أصغر من 5 ميغابايت');const value=JSON.parse(await f.text()),result=store.importData(value);render();A.message('أضيفت '+result.added+' جلسات؛ مكررة: '+result.duplicates+'، مرفوضة: '+result.rejected);}catch(e){A.message('تعذر الاستيراد: '+e.message,true);}this.value='';};
window.addEventListener('storage',e=>{if(e.key===A.KEY)try{render();}catch(err){A.message(err.message,true);}});
})();
