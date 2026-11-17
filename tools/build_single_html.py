"""Build MindLab as ONE self-contained HTML file (opens from Files / a USB stick / an e-mail attachment, no server).

Every runtime file (scripts, styles, fonts, images, data) is embedded. A small shim at the top of the page maps the
app's relative paths ("ui/art/x.webp", "expedition10/art/…") to in-memory blob URLs: script/link/img/audio setters,
setAttribute, innerHTML / insertAdjacentHTML, style url(), fetch and XHR all go through it, so no game code changes.
Images are re-encoded to WebP (max 1200 px, quality 70) for this file only; the project's files are untouched.
Not bundled: the Atheran art library (atheran/assets, 128 MB). Atheran plays with its original art in this file.
No service worker (file:// cannot register one); progress is saved in the browser as usual.

Usage: python3 tools/build_single_html.py OUT.html
"""
import base64, io, json, os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else 'MindLab_single.html'
SKIP_DIRS = {'.git', 'qa', 'docs', 'tv', 'tools', 'node_modules', os.path.join('atheran', 'assets')}
KEEP_QA = {'qa/assessment-engine/Dabt_Assessment_Engine_v1.3.js'}
SKIP_EXT = {'.md', '.txt', '.py', '.cjs', '.zip', '.sample', '.csv'}
MIME = {'.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
        '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
        '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
        '.m4a': 'audio/mp4', '.html': 'text/html'}
STUBS = {'atheran/runtime/assets-runtime.js': '/* single-file build: the Atheran art library (128 MB) is not bundled */'}

def files():
    for d, ds, fs in os.walk(ROOT):
        rel = os.path.relpath(d, ROOT)
        ds[:] = [x for x in ds if os.path.normpath(os.path.join(rel, x)) not in SKIP_DIRS and not x.startswith('.')]
        for f in fs:
            p = os.path.normpath(os.path.join(rel, f)).replace(os.sep, '/')
            if p == 'index.html' or p == 'sw.js': continue
            ext = os.path.splitext(f)[1].lower()
            if ext in SKIP_EXT or ext not in MIME: continue
            if p.startswith('qa/') and p not in KEEP_QA: continue
            yield p, ext
    for p in KEEP_QA: yield p, '.js'

def image_b64(path, ext):
    raw = open(path, 'rb').read()
    if ext not in ('.png', '.jpg', '.jpeg', '.webp'): return MIME[ext], base64.b64encode(raw).decode()
    try:
        im = Image.open(io.BytesIO(raw)); im.load()
        if max(im.size) > 1200: im.thumbnail((1200, 1200), Image.LANCZOS)
        if im.mode not in ('RGB', 'RGBA'): im = im.convert('RGBA' if 'A' in im.getbands() or im.mode == 'P' else 'RGB')
        b = io.BytesIO(); im.save(b, 'WEBP', quality=70, method=4)
        if b.tell() < len(raw): return 'image/webp', base64.b64encode(b.getvalue()).decode()
    except Exception: pass
    return MIME[ext], base64.b64encode(raw).decode()

FS, seen = {}, set()
for p, ext in files():
    if p in seen: continue
    seen.add(p); full = os.path.join(ROOT, p)
    if p in STUBS: FS[p] = ['text/javascript', 't', STUBS[p]]; continue
    if MIME[ext].startswith(('text/', 'application/')) or ext == '.svg' and False:
        FS[p] = [MIME[ext], 't', open(full, encoding='utf-8', errors='replace').read()]
    else:
        m, b = image_b64(full, ext); FS[p] = [m, 'b', b]
for p, s in STUBS.items(): FS[p] = ['text/javascript', 't', s]

SHIM = r"""
(function () {
  'use strict';
  const F = window.__SF_FILES; delete window.__SF_FILES;
  const BASE = location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '');
  const cache = {};
  const norm = p => { const out = []; for (const s of p.split('/')) { if (s === '..') out.pop(); else if (s && s !== '.') out.push(s); } return out.join('/'); };
  function key(u, from) {
    if (u == null) return null; u = String(u).trim();
    if (!u || /^(data:|blob:|#|about:|javascript:|mailto:|https?:\/\/(?!127\.0\.0\.1|localhost))/i.test(u)) return null;
    let abs; try { abs = new URL(u, from ? BASE + from : BASE).href; } catch (e) { return null; }
    if (!abs.startsWith(BASE)) { // inline scripts have no src, so "../x" from ui/app.js lands above the page: match the path's tail
      if (!abs.startsWith(location.origin === 'null' ? 'file:' : location.origin)) return null;
      const seg = abs.replace(/[#?].*$/, '').split('/'); for (let i = 1; i < seg.length; i++) { const r = seg.slice(i).join('/'); if (F[r]) return r; } return null; }  // inline scripts have no src: "../x" from ui/app.js means "x"
    let k = abs.slice(BASE.length).replace(/[#?].*$/, ''); try { k = decodeURIComponent(k); } catch (e) {}
    k = norm(k); return F[k] ? k : null;
  }
  function blobOf(k) {
    if (cache[k]) return cache[k];
    const [mime, enc, data] = F[k];
    let body;
    if (enc === 'b') { const bin = atob(data), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); body = a; }
    else body = mime === 'text/css' ? css(data, k) : data;
    return (cache[k] = URL.createObjectURL(new Blob([body], { type: mime + (enc === 't' ? ';charset=utf-8' : '') })));
  }
  const map = (u, from) => { const k = key(u, from); return k ? blobOf(k) : u; };
  const css = (t, from) => String(t).replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => { const k = key(u, from); return k ? `url(${blobOf(k)})` : m; })
                                    .replace(/@import\s+(['"])([^'"]+)\1/g, (m, q, u) => { const k = key(u, from); return k ? `@import "${blobOf(k)}"` : m; });
  const html = s => typeof s !== 'string' || !/(src|href|url\()/.test(s) ? s :
    css(s.replace(/\b(src|href|xlink:href|poster)\s*=\s*(["'])([^"']+)\2/g, (m, a, q, u) => { const k = key(u); return k ? `${a}=${q}${blobOf(k)}${q}` : m; }));
  window.__SF = { map, css, html, has: u => !!key(u), files: () => Object.keys(F) };

  const wrapSet = (proto, prop, fn) => { const d = Object.getOwnPropertyDescriptor(proto, prop); if (!d || !d.set) return;
    Object.defineProperty(proto, prop, { configurable: true, enumerable: d.enumerable, get: d.get, set(v) { d.set.call(this, fn(v)); } }); };
  wrapSet(HTMLImageElement.prototype, 'src', map); wrapSet(HTMLScriptElement.prototype, 'src', map); wrapSet(HTMLLinkElement.prototype, 'href', map);
  wrapSet(HTMLMediaElement.prototype, 'src', map); wrapSet(HTMLSourceElement.prototype, 'src', map); wrapSet(HTMLImageElement.prototype, 'srcset', v => String(v).replace(/([^\s,]+)(\s+[\d.]+[wx])?/g, (m, u, d) => map(u) + (d || '')));
  wrapSet(Element.prototype, 'innerHTML', html); wrapSet(Element.prototype, 'outerHTML', html);
  const iah = Element.prototype.insertAdjacentHTML; Element.prototype.insertAdjacentHTML = function (pos, s) { return iah.call(this, pos, html(s)); };
  const sa = Element.prototype.setAttribute; Element.prototype.setAttribute = function (n, v) { const l = String(n).toLowerCase();
    if (l === 'src' || l === 'href' || l === 'xlink:href' || l === 'poster') v = map(v); else if (l === 'style') v = css(v); return sa.call(this, n, v); };
  const san = Element.prototype.setAttributeNS; Element.prototype.setAttributeNS = function (ns, n, v) { if (/(^|:)href$/i.test(n)) v = map(v); return san.call(this, ns, n, v); };
  const sp = CSSStyleDeclaration.prototype.setProperty; CSSStyleDeclaration.prototype.setProperty = function (p, v, pr) { return sp.call(this, p, typeof v === 'string' ? css(v) : v, pr); };
  for (const proto of [CSSStyleDeclaration.prototype, window.CSS2Properties && CSS2Properties.prototype].filter(Boolean))
    for (const p of ['background', 'backgroundImage', 'cssText', 'borderImage', 'borderImageSource', 'maskImage', 'webkitMaskImage', 'listStyleImage', 'content']) wrapSet(proto, p, v => typeof v === 'string' ? css(v) : v);
  const ins = CSSStyleSheet.prototype.insertRule; CSSStyleSheet.prototype.insertRule = function (r, i) { return ins.call(this, css(r), i); };
  const tc = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
  Object.defineProperty(Node.prototype, 'textContent', { configurable: true, get: tc.get, set(v) { tc.set.call(this, this.nodeName === 'STYLE' ? css(v) : v); } });
  const A = window.Audio; if (A) { window.Audio = function (src) { return src === undefined ? new A() : new A(map(src)); }; window.Audio.prototype = A.prototype; }
  const f0 = window.fetch; window.fetch = function (input, init) { const u = typeof input === 'string' ? input : input && input.url; const k = key(u);
    if (k) { const [mime, enc, data] = F[k]; return f0(blobOf(k)).then(r => new Response(r.body, { status: 200, headers: { 'Content-Type': mime } })); }
    return f0.apply(this, arguments); };
  const xo = XMLHttpRequest.prototype.open; XMLHttpRequest.prototype.open = function (m, u, ...r) { return xo.call(this, m, map(u), ...r); };
  if (navigator.serviceWorker) try { Object.defineProperty(navigator.serviceWorker, 'register', { configurable: true, value: () => Promise.reject(new Error('single-file build: no service worker')) }); } catch (e) {}
  // nodes created by the parser or cloned from <template>: fix any remaining relative src/href/style the first time they appear
  const fixNode = n => { if (n.nodeType !== 1) return;
    for (const a of ['src', 'href', 'poster', 'xlink:href']) { const v = n.getAttribute && n.getAttribute(a); if (v && key(v)) sa.call(n, a, blobOf(key(v))); }
    const st = n.getAttribute && n.getAttribute('style'); if (st && /url\(/.test(st)) { const c = css(st); if (c !== st) sa.call(n, 'style', c); }
    if (n.nodeName === 'STYLE' && /url\(/.test(n.textContent) && !n.__sf) { n.__sf = 1; tc.set.call(n, css(n.textContent)); } };
  new MutationObserver(ms => { for (const m of ms) { if (m.type === 'attributes') fixNode(m.target); else m.addedNodes.forEach(n => { fixNode(n); n.querySelectorAll && n.querySelectorAll('[src],[href],[style],style').forEach(fixNode); }); } })
    .observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'href', 'style'] });
})();
"""

src = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
def inline_script(m):
    p = m.group(2); k = os.path.normpath(p).replace(os.sep, '/').lstrip('./')
    k = re.sub(r'^\./', '', p)
    if k not in FS: return m.group(0)
    body = FS[k][2].replace('</script', '<\\/script')
    return f'<script data-sf="{k}">{body}\n</script>'
src = re.sub(r'<script([^>]*?)\ssrc="([^"]+)"([^>]*)>\s*</script>', lambda m: inline_script(m), src)
src = re.sub(r'<link rel="stylesheet" href="([^"]+)">', lambda m: f'<script>document.write(\'<link rel="stylesheet" href="\'+__SF.map({json.dumps(m.group(1))})+\'">\')</script>' if m.group(1) in FS else m.group(0), src)
src = re.sub(r'<link rel="(icon|apple-touch-icon)" href="([^"]+)"([^>]*)>', lambda m: f'<link rel="{m.group(1)}" href="data:{FS[m.group(2)][0]};base64,{FS[m.group(2)][2] if FS[m.group(2)][1] == "b" else base64.b64encode(FS[m.group(2)][2].encode()).decode()}"{m.group(3)}>' if m.group(2) in FS else '', src)
src = re.sub(r'<link rel="manifest"[^>]*>', '', src)
payload = json.dumps(FS, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
head = f'<script>window.__SF_FILES={payload};</script>\n<script>{SHIM}</script>\n'
i = src.find('<head>') + len('<head>')
i = src.find('>', src.find('<meta charset')) + 1 if '<meta charset' in src[:2000] else i
src = src[:i] + '\n' + head + src[i:]
open(OUT, 'w', encoding='utf-8').write(src)
print(f'{OUT}: {os.path.getsize(OUT) / 1e6:.1f} MB, {len(FS)} files embedded')
