// Section downloads for offline play. A section is announced as available offline
// only after every file it needs is in Cache Storage; failed downloads keep the
// completed files and can be resumed.
import { h, fmt } from './ui.js';

export const SECTION_CACHE = 'dabt21-sections-v1';
const NAMES = { treasure: 'جزيرة الكنز', planets: 'رحلة الكواكب', lab: 'مختبر العقل', child: 'عالم الطفل' };
let manifest = null;

async function getManifest() {
  if (manifest) return manifest;
  const r = await fetch('offline-manifest.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error('manifest');
  manifest = await r.json(); return manifest;
}

export async function sectionStatus(section) {
  if (!('caches' in window)) return { supported: false };
  try {
    const m = await getManifest(); const list = m.sections[section] || [];
    const c = await caches.open(SECTION_CACHE); let have = 0;
    for (const u of list) if (await c.match(u, { ignoreVary: true })) have++;
    return { supported: true, total: list.length, have, ready: have === list.length && list.length > 0 };
  } catch { return { supported: true, total: 0, have: 0, ready: false, error: true }; }
}

export async function downloadSection(section, onProgress) {
  const m = await getManifest(); const list = m.sections[section] || [];
  const c = await caches.open(SECTION_CACHE); const failed = []; let done = 0;
  for (const u of list) {
    if (!(await c.match(u, { ignoreVary: true }))) {
      try { const r = await fetch(u, { cache: 'no-cache' }); if (!r.ok) throw new Error(r.status); await c.put(u, r); }
      catch { failed.push(u); }
    }
    done++; onProgress?.(done, list.length, failed.length);
  }
  return { total: list.length, failed };
}

export function offlineButton(section) {
  const wrap = h('div', { class: 'offline-box' });
  const status = h('span', { class: 'muted small', role: 'status', 'aria-live': 'polite' }, '…');
  const btn = h('button', { type: 'button', class: 'btn small' }, 'نزّل للعمل دون اتصال');
  wrap.append(btn, status);
  const refresh = async () => {
    const s = await sectionStatus(section);
    if (!s.supported) { status.textContent = 'المتصفح لا يدعم التخزين دون اتصال.'; btn.disabled = true; return; }
    if (s.ready) { status.textContent = `${NAMES[section]} متاحة دون اتصال.`; btn.textContent = 'تحقق من الملفات مجددًا'; }
    else status.textContent = s.have ? `نُزّل ${fmt(s.have)} من ${fmt(s.total)} ملفًا؛ لم يكتمل بعد.` : 'هذا العالم لم يُنزّل بعد.';
  };
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      const res = await downloadSection(section, (d, t) => { status.textContent = `جارٍ التنزيل ${fmt(d)} / ${fmt(t)}`; });
      if (res.failed.length) { status.textContent = `تعذر تنزيل ${fmt(res.failed.length)} ملفًا. حُفظت الملفات المكتملة؛ أعد المحاولة عند توفر الاتصال.`; btn.textContent = 'أعد المحاولة'; }
      else await refresh();
    } catch { status.textContent = 'تعذر بدء التنزيل. تحقق من الاتصال ثم أعد المحاولة.'; btn.textContent = 'أعد المحاولة'; }
    btn.disabled = false;
  });
  refresh();
  return wrap;
}
