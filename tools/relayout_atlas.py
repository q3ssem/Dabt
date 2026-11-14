"""Re-layout a sprite atlas onto an exact grid (presentation only, 4.2.2).

The generated atlases were not drawn on an exact grid: objects cross the cell
lines (a camel's head sits above its row, a basketball's top pokes into the
guitar's cell). Cropping a cell therefore showed slivers of the neighbours.

For each connected object (alpha component) this assigns it to the cell that
contains its centroid, cuts it out with its own mask, scales it down only if it
would not fit (never up) and centres it in its cell of a new, same-size atlas.
Cell order, file name and size stay the same, so every index in the code keeps
pointing at the same object.

  python3 tools/relayout_atlas.py legacy/art/objects-a.webp [--cols 4 --rows 4] [--out FILE] [--check]
"""
import argparse, sys
import numpy as np
from PIL import Image
from scipy import ndimage

def relayout(src, cols, rows, fill=0.92, alpha_min=10, min_area=40):
    im = Image.open(src).convert('RGBA')
    W, H = im.size
    rgba = np.array(im)
    a = rgba[..., 3]
    solid = a > alpha_min
    # Join soft edges / shadows to their object before labelling.
    lab, n = ndimage.label(ndimage.binary_dilation(solid, iterations=3))
    cw, ch = W / cols, H / rows
    owners = {}
    centers = ndimage.center_of_mass(solid, lab, range(1, n + 1))
    areas = ndimage.sum(solid, lab, range(1, n + 1))
    for k, ((cy, cx), area) in enumerate(zip(centers, areas), start=1):
        if area < min_area or np.isnan(cx):
            continue
        cell = min(int(cy // ch), rows - 1) * cols + min(int(cx // cw), cols - 1)
        owners.setdefault(cell, []).append(k)
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    report = {}
    for cell in range(cols * rows):
        ks = owners.get(cell)
        if not ks:
            report[cell] = 'empty'
            continue
        mask = np.isin(lab, ks) & (a > 0)
        ys, xs = np.nonzero(mask)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        piece = rgba[y0:y1, x0:x1].copy()
        piece[..., 3] = np.where(mask[y0:y1, x0:x1], piece[..., 3], 0)
        p = Image.fromarray(piece)
        s = min(1.0, fill * cw / p.width, fill * ch / p.height)
        if s < 1:
            p = p.resize((max(1, round(p.width * s)), max(1, round(p.height * s))), Image.LANCZOS)
        c, r = cell % cols, cell // cols
        ox = round(c * cw + (cw - p.width) / 2)
        oy = round(r * ch + (ch - p.height) / 2)
        out.alpha_composite(p, (ox, oy))
        report[cell] = f'{len(ks)} part(s), scale {s:.2f}'
    return out, report

def edge_touch(img, cols, rows, thr=40):
    a = np.array(img.getchannel('A'))
    H, W = a.shape
    bad = []
    for cell in range(cols * rows):
        c, r = cell % cols, cell // cols
        x0, x1 = round(c * W / cols), round((c + 1) * W / cols)
        y0, y1 = round(r * H / rows), round((r + 1) * H / rows)
        b = a[y0:y1, x0:x1]
        if max(b[:2].max(), b[-2:].max(), b[:, :2].max(), b[:, -2:].max()) > thr:
            bad.append(cell)
    return bad

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('--cols', type=int, default=4); ap.add_argument('--rows', type=int, default=4)
    ap.add_argument('--out'); ap.add_argument('--check', action='store_true')
    a = ap.parse_args()
    if a.check:
        print(a.src, 'edge-touching cells:', edge_touch(Image.open(a.src).convert('RGBA'), a.cols, a.rows)); sys.exit(0)
    img, rep = relayout(a.src, a.cols, a.rows)
    img.save(a.out or a.src, 'WEBP', quality=90, method=6)
    print(a.src, rep, 'edge-touching after:', edge_touch(img, a.cols, a.rows))
