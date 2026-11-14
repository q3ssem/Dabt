"""Make the dark navy background of an object atlas transparent and save it as WebP.

Usage: python3 tools/key_atlas.py SRC.png OUT.webp
Only pixels close to the border colour AND connected to the image border are keyed,
so dark parts inside an object stay opaque. Edges get a soft alpha and the navy
fringe is removed from semi-transparent pixels.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

T0, T1 = 12.0, 46.0

def key(src, out, quality=88):
    im = Image.open(src).convert('RGB')
    a = np.asarray(im).astype(np.float32)
    border = np.concatenate([a[:4].reshape(-1, 3), a[-4:].reshape(-1, 3), a[:, :4].reshape(-1, 3), a[:, -4:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    d = np.sqrt(((a - bg) ** 2).sum(-1))
    near = d < T1
    lab, _ = ndimage.label(near)
    edge_labels = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    edge_labels = edge_labels[edge_labels > 0]
    region = np.isin(lab, edge_labels)
    # enclosed holes painted in the exact background colour (inside a key bow, a frame...)
    flat, n = ndimage.label(d < 7)
    if n:
        sizes = ndimage.sum(np.ones_like(d), flat, index=np.arange(1, n + 1))
        holes = np.isin(flat, np.nonzero(sizes > 140)[0] + 1)
        region |= ndimage.binary_dilation(holes, iterations=3) & near
    alpha = np.ones(d.shape, np.float32)
    alpha[region] = np.clip((d[region] - T0) / (T1 - T0), 0, 1)
    # soften the hard boundary between keyed region and object by one pixel
    alpha = np.minimum(alpha, ndimage.grey_erosion(alpha, size=2) * 0.5 + alpha * 0.5)
    safe = np.maximum(alpha, 1e-3)[..., None]
    rgb = np.clip((a - (1 - alpha[..., None]) * bg) / safe, 0, 255)
    rgb[alpha <= 0.002] = 0
    rgba = np.dstack([rgb, alpha * 255]).round().astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(out, 'WEBP', quality=quality, method=6, exact=False)

def opaque(src, out, quality=84):
    im = Image.open(src)
    im.save(out, 'WEBP', quality=quality, method=6) if im.mode in ('RGBA', 'LA') else im.convert('RGB').save(out, 'WEBP', quality=quality, method=6)

if __name__ == '__main__':
    (opaque if len(sys.argv) > 3 and sys.argv[3] == '--opaque' else key)(sys.argv[1], sys.argv[2])
