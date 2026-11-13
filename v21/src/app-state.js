import { loadProfile, saveProfile, onSaveState } from './core/store.js';
import { h } from './core/ui.js';

export const app = { profile: null, data: {}, migrated: false };

export function initProfile() {
  const { profile, migrated } = loadProfile();
  app.profile = profile; app.migrated = migrated;
  return persist();
}

// Persistent notice while saving fails; the player is never told a failed save succeeded.
let banner = null;
onSaveState(({ ok }) => {
  if (ok) { banner?.remove(); banner = null; return; }
  if (banner) return;
  banner = h('div', { class: 'save-banner', role: 'alert' },
    h('b', {}, 'تعذر الحفظ على هذا الجهاز.'), ' تقدمك الأخير لم يُحفظ بعد. ',
    h('button', { type: 'button', class: 'btn small', onclick: () => persist() }, 'أعد الحفظ'));
  document.body.prepend(banner);
});

export function persist() { return saveProfile(app.profile); }

export async function loadJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`تعذر تحميل ${path}`);
  return r.json();
}
