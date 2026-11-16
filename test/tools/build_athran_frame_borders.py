"""5.5.28 athran-assets-2 — derive 9-slice border images from the 14 approved Atheran UI frames.

The frames in atheran/assets/ui/*.png are full-screen layout templates: a scrim, a card, and placeholder
buttons drawn into the picture. Used as a background they would put fake buttons under the real ones.
This script keeps the originals untouched and writes, for each frame, a small 9-slice image made only of
the card's own corners and edges (sampled away from any top medallion), for CSS border-image.

Output: atheran/derived/frames/<asset_id>.png (3*S x 3*S, transparent centre). Run: python3 tools/build_athran_frame_borders.py
"""
import json, pathlib
import numpy as np
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parents[1]
INV = json.loads((ROOT / 'atheran/assets/asset_inventory_master.json').read_text(encoding='utf-8'))['completed_assets']
OUT = ROOT / 'atheran/derived/frames'; OUT.mkdir(parents=True, exist_ok=True)
S = 24  # slice size in source pixels (1080-wide frame): the double gold line and the rounded corner, not the header bars inside
for r in [x for x in INV if x['asset_type'] == 'ui_frame']:
    im = Image.open(ROOT / 'atheran/assets' / r['relative_path']).convert('RGBA')
    a = np.array(im)[:, :, 3]
    ys, xs = np.where(a >= 250)
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    card = im.crop((x0, y0, x1, y1)); W, H = card.size
    # the card's top edge may carry a round medallion in the middle; skip the top 12% of opaque rows if the
    # first row is mostly transparent there (the medallion sticks out above the line)
    arr = np.array(card)[:, :, 3]
    top = 0
    while top < H // 8 and (arr[top, W // 4] < 200): top += 1
    card = card.crop((0, top, W, H)); W, H = card.size
    out = Image.new('RGBA', (3 * S, 3 * S), (0, 0, 0, 0))
    ex, ey = W // 4, H // 3                      # edge samples away from medallions and buttons
    pieces = {
        (0, 0): (0, 0), (2, 0): (W - S, 0), (0, 2): (0, H - S), (2, 2): (W - S, H - S),
        (1, 0): (ex, 0), (1, 2): (ex, H - S), (0, 1): (0, ey), (2, 1): (W - S, ey),
    }
    for (cx, cy), (sx, sy) in pieces.items():
        if cy == 0: continue
        out.paste(card.crop((sx, sy, sx + S, sy + S)), (cx * S, cy * S))
    # top row = the bottom row mirrored: several frames put a coloured title bar right under the top line,
    # which would otherwise repeat along every top edge; the card borders themselves are symmetric
    for cx in range(3):
        sx, sy = pieces[(cx, 2)]
        out.paste(card.crop((sx, sy, sx + S, sy + S)).transpose(Image.FLIP_TOP_BOTTOM), (cx * S, 0))
    # the centre stays transparent: the real screen content shows through
    out.save(OUT / f"{r['asset_id']}.png", optimize=True)
    print(r['asset_id'], (x0, y0, x1, y1), 'top skip', top)
