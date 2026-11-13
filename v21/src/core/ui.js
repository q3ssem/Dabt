// Small DOM helpers, digit formatting and shared symbol rendering.
// Optional children are written as `cond ? node : null`; skip null/false everywhere.
for (const m of ['append', 'prepend', 'replaceChildren']) {
  const orig = Element.prototype[m];
  Element.prototype[m] = function (...kids) { return orig.apply(this, kids.filter(k => k != null && k !== false)); };
}
import { AR_DIGITS } from './validators.js';

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  return el;
}
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let digitMode = 'arabic';
export function setDigitMode(m) { digitMode = m; }
export function fmt(v) {
  const s = String(v);
  return digitMode === 'arabic' ? s.replace(/\d/g, d => AR_DIGITS[d]) : s.replace(/[٠-٩]/g, d => String(AR_DIGITS.indexOf(d)));
}
export function fmtText(s) { return fmt(s); }

let symbolMap = {};
export function setSymbolMap(m) { symbolMap = m; }
const GLYPH = { 'طويلة': '▬▬', 'قصيرة': '●', 'طويل': '▬▬', 'قصير': '●', 'أعلى': '↑', 'أسفل': '↓', 'يمين': '→', 'يسار': '←', 'شعاع': '✶', 'أزرق': '◆', 'أحمر': '▲', 'أخضر': '■', 'أبيض': '○' };
export function symbolPath(name) {
  const p = symbolMap[name]; if (!p) return null;
  return 'assets/shared/symbols/' + p.split('/').pop();
}
// A token is always shape + live name (never colour only).
export function token(name, { big = false, display } = {}) {
  const label = display ?? name;
  const src = symbolPath(display ?? name);
  return h('span', { class: 'token' + (big ? ' big' : '') },
    src ? h('img', { src, alt: '', 'aria-hidden': 'true', draggable: 'false' }) : (GLYPH[label] ? h('span', { class: 'glyph', 'aria-hidden': 'true' }, GLYPH[label]) : null),
    h('span', { class: 'token-name' }, fmt(label)));
}

export function announce(msg) {
  const r = $('#live'); if (!r) return; r.textContent = ''; setTimeout(() => { r.textContent = msg; }, 30);
}

export function toast(msg, kind = '') {
  const t = h('div', { class: 'toast ' + kind, role: 'status' }, msg);
  document.body.append(t); setTimeout(() => t.remove(), 3200);
}

export function confirmDialog(text, okLabel = 'متابعة', cancelLabel = 'ابق كما هو') {
  return new Promise(res => {
    const d = h('dialog', { class: 'dlg' }, h('p', {}, text),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary', onclick: () => { d.close(); res(true); } }, okLabel),
        h('button', { class: 'btn', onclick: () => { d.close(); res(false); } }, cancelLabel)));
    d.addEventListener('close', () => setTimeout(() => d.remove(), 0));
    d.addEventListener('cancel', () => res(false));
    document.body.append(d); d.showModal();
  });
}

// Scene image with a calm fallback that keeps the text and play available.
export function scene(src, alt, extraClass = '') {
  const fig = h('figure', { class: 'scene ' + extraClass });
  const img = h('img', { src, alt, loading: 'lazy', decoding: 'async' });
  img.addEventListener('error', () => { fig.classList.add('missing'); img.remove(); fig.append(h('figcaption', { class: 'scene-missing' }, 'تعذر عرض الصورة. ', alt)); });
  fig.append(img);
  return fig;
}

export function seededRng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
export function shuffle(a, rng = Math.random) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
