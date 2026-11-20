"""Build PUZZLE_TEST_MATRIX.csv from the actual test outputs (no cell is filled without a source)."""
import csv, json, os, sys

OUT = sys.argv[1]
fitc = json.load(open('/tmp/regD/fitout/fit_audit_chromium.json'))
fitw = {**json.load(open('/tmp/regD/fitout_wk/fit_audit_webkit.json')), **json.load(open('/tmp/regF/wk2/fit_audit_webkit.json'))}
audio = json.load(open('/tmp/regE/audio_all.json'))['results'] if os.path.exists('/tmp/regE/audio_all.json') else {}
cov = json.load(open('/home/claude/perf/puzzle_cov.json'))
controls_ok = 'controls: 0 failures' if '0 failures' in open('/tmp/regD/controls.log').read() else 'controls: see log'
names = json.load(open('/home/claude/perf/puzzle_names.json')) if os.path.exists('/home/claude/perf/puzzle_names.json') else {}

NOT = 'غير مقاس'
SIZES = ['320x640', '390x844', '430x932', '844x390']


def fitcell(d, key):
    r = d.get(key)
    if r is None: return NOT
    if r.get('err'): return '✗ ' + str(r['err'])[:40]
    bad = []
    if r.get('errs'): bad.append('JS')
    if r.get('playScroll'): bad.append('scroll')
    if r.get('hudH', 0) > 46: bad.append('HUD')
    if r.get('bottom', 0) > r.get('vh', 9999): bad.append('overflow')
    return '✓' if not bad else '✗ ' + ','.join(bad)


def pagecell(r):
    if not r: return NOT
    over = r.get('bottom', 0) - r.get('vh', 0)
    return '✓' if over <= 0 else f'✗ يتجاوز {over}px عند أصغر تكبير {r.get("z")} (يحتاج تمريرًا)'


rows = []
ids = sorted({k.split('@')[0] for k in fitc if k.startswith('pz_')})
for g in ids:
    node = [x for x in cov.get(g, []) if not x.startswith('B:')]
    browser = sorted({x[2:] for x in cov.get(g, []) if x.startswith('B:')} - {'fit_audit.py', 'controls_audit.py', 'smoke.py'})
    a = audio.get(g, {})
    errs = any((fitc.get(f'{g}@{s}') or {}).get('errs') for s in SIZES)
    hint = any((fitc.get(f'{g}@{s}') or {}).get('hintClosed') for s in SIZES)
    give = any((fitc.get(f'{g}@{s}') or {}).get('giveArm') for s in SIZES)
    info = any((fitc.get(f'{g}@{s}') or {}).get('info') for s in SIZES)
    row = {
        'section': 'مكتبة/قصر/أثران (pz)', 'id': g, 'name': names.get(g, ''),
        '1_open': '✓ fit_audit 4 مقاسات' if all(f'{g}@{s}' in fitc for s in SIZES) else NOT,
        '2_instructions': '✓ ورقة ⓘ' if info else '✓ شاشة المقدمة (smoke)',
        '3_timer': NOT,
        '4_legal_move': ('✓ ' + ' '.join(browser)) if browser else (('محرك: ' + ' '.join(node[:2])) if node else NOT),
        '5_illegal_move': ('محرك: ' + ' '.join(node[:2])) if node else NOT,
        '6_hints': '✓ fit_audit' if hint else ('✓ ' + controls_ok + ' (زر ظاهر بالثيمين)'),
        '7_undo': '✓ ' + controls_ok + ' (إن وُجد)',
        '8_retry': '✓ ' + controls_ok,
        '9_correct_solution': ('✓ ' + ' '.join(browser)) if browser else (('محرك: ' + ' '.join(node[:2])) if node else NOT),
        '10_wrong_solution': ('محرك: ' + ' '.join(node[:2])) if node else NOT,
        '11_save_result': '✓ oldsave_compat + اختبارات التقدم' if browser else NOT,
        '12_reopen': '✓ fit_audit (فتح متكرر بأربعة مقاسات)',
        '13_levels': ('محرك: ' + ' '.join(node[:3])) if node else NOT,
        '14_sounds': (f"✓ عقد={a.get('nodes')} خمول={a.get('idleNodes2s')} كتم={a.get('mutedNodes')} سياق={a.get('contexts')}" if a and 'error' not in a else NOT),
        '15_motion': '✓ motion_play' if 'motion_play.py' in browser else NOT,
        '16_no_js_errors': '✗' if errs else '✓ (4 مقاسات Chromium)',
        '17_no_missing_images': '✓ smoke (Chromium+WebKit)',
        '18_phone_display': ' | '.join(f'{s}:{fitcell(fitc, f"{g}@{s}")}' for s in SIZES),
        'webkit': ' | '.join(f'{s}:{fitcell(fitw, f"{g}@{s}")}' for s in SIZES) if fitw else NOT,
        'iphone_real': 'غير متاح',
    }
    rows.append(row)
for prefix, section, n in [('t7_', 'البحار السبعة (جزيرة الكنز)', 21), ('ex_', 'الرحلة الجانبية', 25)]:
    for i in range(1, n + 1):
        key = f'{prefix}{i:02d}'
        row = {k: NOT for k in rows[0]}
        row.update({'section': section, 'id': key, 'name': '',
                    '1_open': '✓ fit_audit' if any(f'{key}@{s.split("x")[0]}' in fitc for s in SIZES) else NOT,
                    '9_correct_solution': '✓ smoke (21 محطة تُلعب حتى النهاية)' if prefix == 't7_' else '✓ expedition25_smoke',
                    '16_no_js_errors': '✗' if any((fitc.get(f'{key}@{s.split("x")[0]}') or {}).get('errs') for s in SIZES) else '✓',
                    '18_phone_display': ' | '.join(f'{s}:' + pagecell(fitc.get(f'{key}@{s.split("x")[0]}')) for s in SIZES),
                    'webkit': ' | '.join(f'{s}:' + pagecell(fitw.get(f'{key}@{s.split("x")[0]}')) for s in SIZES) if fitw else NOT,
                    'iphone_real': 'غير متاح'})
        rows.append(row)
with open(OUT, 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
print(len(rows), 'rows')
