"""5.5 — يولّد ds/light-auto.css: نظير أبيض لكل لون داكن في أوراق الأنماط الأصلية، دون تعديلها.
   python3 tools/build_light_theme.py      (أعد التشغيل بعد أي تعديل في CSS؛ اختبار release550 يتحقق أن الملف محدّث)

القواعد:
- الخلفيات والحدود وfill/stroke الداكنة (إضاءة < 0.36) تُنقل إلى مجال فاتح 0.86–0.98 مع **الحفاظ على الترتيب**:
  الأغمق يبقى أغمق من جاره (جدار/أرضية، قطعة/لوحة)، ويحتفظ اللون بدرجته (hue) بتشبع أخف.
- النصوص الفاتحة (إضاءة > 0.58) تصير داكنة بنفس الدرجة اللونية، فالذهبي يصير بنيًا ذهبيًا مقروءًا.
- الظلال السوداء تخف (alpha × 0.35) والظلال الداخلية التي تعتم السطح كله تُزال.
- كل قاعدة تُكتب تحت html[data-skin="light"] (وللتلقائي: data-skin=auto مع prefers-color-scheme: light).
- لا يُلمس: قواعد الثيمات القائمة ([data-skin]/[data-look])، الصور (url)، الشفافية، وأي قيمة ليست لونًا.
"""
import colorsys, hashlib, pathlib, re, sys
import tinycss2

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCES = ['index.html', 'upgrade/style.css', 'treasure/style.css', 'legacy/style.css', 'legacy/deep.css', 'watercolor/style.css', 'ui/style.css']
OUT = ROOT / 'ds/light-auto.css'
BG_PROPS = re.compile(r'^(background(-color|-image)?|border(-(top|right|bottom|left))?(-color)?|outline(-color)?|fill|stroke|column-rule(-color)?|caret-color|accent-color|text-decoration-color)$')
SHADOW_PROPS = {'box-shadow', 'text-shadow', 'filter'}
COLOR_RE = re.compile(r'#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b(?:black|white)\b')

def parse(c):
    c = c.strip().lower()
    if c == 'black': return (0, 0, 0, 1)
    if c == 'white': return (1, 1, 1, 1)
    if c.startswith('#'):
        h = c[1:]
        if len(h) in (3, 4): h = ''.join(x * 2 for x in h)
        r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)); a = int(h[6:8], 16) / 255 if len(h) == 8 else 1
        return (r, g, b, a)
    if c.startswith('rgb'):
        n = [x for x in re.split(r'[\s,/()]+', c[c.index('(') + 1:]) if x]
        try:
            v = [float(x[:-1]) * 2.55 if x.endswith('%') else float(x) for x in n[:3]]
            a = float(n[3][:-1]) / 100 if len(n) > 3 and n[3].endswith('%') else float(n[3]) if len(n) > 3 else 1
            return (v[0] / 255, v[1] / 255, v[2] / 255, a)
        except (ValueError, IndexError): return None
    return None  # hsl and others: leave untouched

def lum(r, g, b): return .2126 * r + .7152 * g + .0722 * b
def fmt(r, g, b, a):
    R, G, B = (max(0, min(255, round(x * 255))) for x in (r, g, b))
    return f'#{R:02x}{G:02x}{B:02x}' if a >= .999 else f'rgba({R},{G},{B},{a:.3g})'

def surface(c):
    r, g, b, a = c; L = lum(r, g, b)
    if L >= .36: return None
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    nl = .86 + (l / .5) * .125          # order-preserving: darkest → 0.86, mid-dark → ~0.98
    nl = min(.98, nl); ns = min(s, .45) * (.55 if s > .2 else 1)
    nr, ng, nb = colorsys.hls_to_rgb(h, nl, ns)
    return fmt(nr, ng, nb, a)

def ink(c):
    r, g, b, a = c; L = lum(r, g, b)
    if L <= .58: return None
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    nl = .14 + (1 - l) * .45; ns = min(s, .55)
    nr, ng, nb = colorsys.hls_to_rgb(h, nl, ns)
    return fmt(nr, ng, nb, a)

def shadow(c):
    r, g, b, a = c
    if lum(r, g, b) < .2: return fmt(r, g, b, round(a * .35, 3))
    return None

def remap(prop, value):
    changed = False
    if 'url(' in value and not re.search(r'gradient', value): return None
    def sub(m):
        nonlocal changed
        c = parse(m.group(0))
        if not c or c[3] < .04: return m.group(0)
        if prop in ('color', '-webkit-text-fill-color'): n = ink(c)
        elif prop in SHADOW_PROPS: n = shadow(c)
        elif BG_PROPS.match(prop) or prop.startswith('--'): n = surface(c)
        else: n = None
        if n: changed = True; return n
        return m.group(0)
    if prop == 'box-shadow' and re.search(r'inset[^,]*\b(999|1000|100vmax|9999)px', value):
        return 'none'
    out = COLOR_RE.sub(sub, value)
    return out if changed else None

def light_selector(sel):
    sel = sel.strip()
    if not sel or '[data-skin' in sel or '[data-look' in sel or 'data-theme' in sel: return None
    m = re.match(r'^(:root|html)\b(.*)$', sel)
    if m: return f'html[data-skin="light"]{m.group(2)}'
    return f'html[data-skin="light"] {sel}'

def rules(nodes, out, media=None):
    for n in nodes:
        if n.type == 'qualified-rule':
            sels = [light_selector(s) for s in tinycss2.serialize(n.prelude).split(',')]
            if any(s is None for s in sels): continue
            decls = []
            dl = [d for d in tinycss2.parse_declaration_list(n.content, skip_comments=True, skip_whitespace=True) if d.type == 'declaration']
            # Light text that sits on a mid-dark background the layer does NOT lighten (a brown key, a green tile)
            # must stay light: darkening it would put dark text on a dark-ish button.
            keep_ink = False
            for d in dl:
                if d.lower_name in ('background', 'background-color'):
                    for m in COLOR_RE.finditer(tinycss2.serialize(d.value)):
                        c = parse(m.group(0))
                        if c and c[3] > .6 and .12 <= lum(*c[:3]) < .5 and surface(c) is None: keep_ink = True
            for d in dl:
                prop = d.lower_name
                if prop.startswith('--'): continue  # custom properties are themed by the token layer
                if keep_ink and prop in ('color', '-webkit-text-fill-color'): continue
                val = tinycss2.serialize(d.value).strip()
                nv = remap(prop, val)
                if nv is not None: decls.append(f'{prop}:{nv}{"!important" if d.important else ""}')
            if decls: out.append((media, ','.join(sels), ';'.join(decls)))
        elif n.type == 'at-rule' and n.lower_at_keyword in ('media', 'supports') and n.content:
            cond = tinycss2.serialize(n.prelude).strip()
            if 'prefers-color-scheme' in cond: continue
            rules(tinycss2.parse_rule_list(n.content, skip_comments=True, skip_whitespace=True), out, f'@{n.lower_at_keyword} {cond}')

def build():
    out, digest = [], hashlib.sha256()
    for src in SOURCES:
        text = (ROOT / src).read_text(encoding='utf-8')
        if src.endswith('.html'): text = '\n'.join(re.findall(r'<style[^>]*>(.*?)</style>', text, re.S))
        digest.update(text.encode())
        rules(tinycss2.parse_stylesheet(text, skip_comments=True, skip_whitespace=True), out)
    lines = [f'/* GENERATED by tools/build_light_theme.py — do not edit. sources-sha256:{digest.hexdigest()[:16]} rules:{len(out)} */']
    for media, sel, body in out:
        rule = f'{sel}{{{body}}}'
        lines.append(f'{media}{{{rule}}}' if media else rule)
    # the same layer for Auto when the device is in light mode
    auto = [l.replace('html[data-skin="light"]', 'html[data-skin="auto"]') for l in lines[1:]]
    lines.append('@media (prefers-color-scheme:light){' + '\n'.join(auto) + '}')
    return '\n'.join(lines) + '\n', digest.hexdigest()[:16], len(out)

if __name__ == '__main__':
    css, d, n = build()
    if '--check' in sys.argv:
        cur = OUT.read_text(encoding='utf-8') if OUT.exists() else ''
        ok = f'sources-sha256:{d}' in cur.split('\n', 1)[0]
        print('light-auto.css up to date' if ok else 'light-auto.css is STALE — run tools/build_light_theme.py'); sys.exit(0 if ok else 1)
    OUT.parent.mkdir(exist_ok=True); OUT.write_text(css, encoding='utf-8')
    print(f'wrote {OUT.relative_to(ROOT)}: {n} rules, {len(css)//1024} KB, sources {d}')
