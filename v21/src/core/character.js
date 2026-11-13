// Three static poses cut from a strip with CSS background-position.
// The strip is never shown whole and never mirrored for RTL.
import { h } from './ui.js';

const registry = {};
// frames: {charId: {image, poses:{idle:{x,y,width,height}, ...}}}; scale: art was downsized by this factor.
export function registerCharacters(section, frames, basePath) {
  for (const [id, f] of Object.entries(frames)) {
    const poses = f.poses; const all = Object.values(poses);
    const imgW = f.imageWidth || Math.max(...all.map(p => p.x + p.width));
    const imgH = f.imageHeight || Math.max(...all.map(p => p.y + p.height));
    registry[id] = { file: basePath + f.image.split('/').pop().replace(/\.png$/i, '.webp'), poses, imgW, imgH };
  }
}

export const SPEAKERS = { 'سالم': 'salem', 'المستكشف': 'explorer', 'مهرة': 'mahra', 'نادر': 'nader', 'صوت نادر': 'nader', 'طيف': 'tayf', 'قائدة البعثة': 'yara', 'يارا': 'yara', 'لُمى': 'luma', 'لمى': 'luma' };
export const NAMES = { salem: 'سالم', explorer: 'المستكشف', mahra: 'مهرة', nader: 'نادر', tayf: 'طيف', yara: 'يارا', luma: 'لُمى' };

export function sprite(id, pose = 'idle') {
  const c = registry[id];
  const el = h('div', { class: 'sprite', role: 'img', 'aria-label': NAMES[id] || id, 'data-char': id });
  if (!c) { el.classList.add('sprite-missing'); el.textContent = NAMES[id] || id; return el; }
  const inner = h('div', { class: 'sprite-frame' });
  inner.style.backgroundImage = `url("${c.file}")`;
  el.append(inner);
  setPose(el, pose);
  return el;
}

export function setPose(el, pose) {
  const id = el.dataset.char; const c = registry[id]; if (!c) return;
  const p = c.poses[pose] || c.poses.idle; const inner = el.firstChild;
  // percentages are resolution-independent, so the half-size WebP strip uses the original rectangles
  inner.style.backgroundSize = `${(c.imgW / p.width) * 100}% ${(c.imgH / p.height) * 100}%`;
  const px = c.imgW === p.width ? 0 : (p.x / (c.imgW - p.width)) * 100;
  const py = c.imgH === p.height ? 0 : (p.y / (c.imgH - p.height)) * 100;
  inner.style.backgroundPosition = `${px}% ${py}%`;
  el.dataset.pose = pose;
  el.classList.remove('pose-swap'); void el.offsetWidth; el.classList.add('pose-swap');
  if (pose === 'celebrate') { el.classList.remove('celebrate'); void el.offsetWidth; el.classList.add('celebrate'); }
}
