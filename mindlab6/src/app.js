// MindLab 6.0 — scaffolding only. No game engines or old source modules imported.
const modules = Object.freeze([
  {id:'campaign', title:'الحملة الرسمية', detail:'البحار السبعة ← قصر المرايا ← أرض أَثْرَان', target:'61 محطة'},
  {id:'side', title:'الرحلة الجانبية', detail:'مسار قصصي مستقل', target:'24 محطة'},
  {id:'puzzles', title:'مكتبة الألغاز', detail:'فهرس الألغاز القابلة للنقل', target:'86 لغزًا'},
  {id:'brain', title:'ألعاب العقل', detail:'مهارات الذاكرة والانتباه والمنطق وغيرها', target:'40 لعبة'},
  {id:'kids', title:'قسم الأطفال', detail:'واجهة مستقلة بصلاحيات أولياء الأمور', target:'26 لعبة'}
]);
const host = document.getElementById('modules');
for (const [index, part] of modules.entries()) {
  const card = document.createElement('article');
  card.className = 'module';
  const number = document.createElement('span');
  number.className = 'number';
  number.textContent = String(index+1).padStart(2,'0');
  const h = document.createElement('h3');
  h.textContent = part.title;
  const desc = document.createElement('p');
  desc.textContent = part.detail;
  const stat = document.createElement('span');
  stat.className = 'target';
  stat.textContent = part.target + ' · مستهدف';
  const badge = document.createElement('span');
  badge.className = 'status';
  badge.textContent = 'قيد النقل';
  card.append(number,h,desc,stat,badge);
  host.append(card);
}
// Theme is session-only: avoid claiming player save compatibility during the skeleton stage.
const themeBtn = document.getElementById('theme');
themeBtn.addEventListener('click', () => {
  const dark = document.documentElement.dataset.skin !== 'dark';
  document.documentElement.dataset.skin = dark ? 'dark' : 'light';
  themeBtn.setAttribute('aria-pressed', String(dark));
  themeBtn.textContent = dark ? 'الوضع الأبيض' : 'الوضع الداكن';
});
