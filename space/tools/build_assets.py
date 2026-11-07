"""Build optimized space assets from the approved source images.
Usage: python3 build_assets.py <package_dir> <attachments_dir> <out_dir>
Sources are never modified; outputs are WebP with clean alpha where needed."""
import sys, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

PKG, ATT, OUT = sys.argv[1:4]
os.makedirs(OUT, exist_ok=True)

def cut_white(im, box, tol=232):
    """Crop box and make the white background (connected to the crop border) transparent."""
    a = np.array(im.convert('RGB').crop(box)).astype(np.float32)
    near = (a.min(axis=2) >= tol) & ((a.max(axis=2) - a.min(axis=2)) < 22)
    lab, _ = ndimage.label(near)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    # enclosed pure-white gaps (e.g. between the legs) are background too
    pure = (a.min(axis=2) >= 246) & ((a.max(axis=2) - a.min(axis=2)) < 10)
    plab, pn = ndimage.label(pure)
    if pn:
        sizes = ndimage.sum(pure, plab, range(1, pn + 1))
        bg |= np.isin(plab, [i + 1 for i, s in enumerate(sizes) if s > 260])
    bg = ndimage.binary_dilation(bg, iterations=1)
    alpha = (~bg).astype(np.float32)
    alpha = np.array(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))) / 255.0
    # remove white fringe: un-blend from white where partially transparent
    al = np.clip(alpha, 1e-3, 1)[..., None]
    rgb = np.clip((a - (1 - al) * 255) / al, 0, 255)
    out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    img = Image.fromarray(out, 'RGBA')
    return img.crop(img.getbbox())

def cut_green(im, box):
    a = np.array(im.convert('RGB').crop(box)).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    key = np.clip((g - np.maximum(r, b) - 40) / 60, 0, 1)
    alpha = 1 - key
    # despill
    g2 = np.minimum(g, np.maximum(r, b) + 10)
    rgb = np.dstack([r, np.where(key > 0, g2, g), b])
    out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    img = Image.fromarray(out, 'RGBA')
    return img.crop(img.getbbox())

def save(img, name, maxw=None, q=82):
    if maxw and img.width > maxw:
        img = img.resize((maxw, round(img.height * maxw / img.width)), Image.LANCZOS)
    p = os.path.join(OUT, name)
    img.save(p, 'WEBP', quality=q, method=6)
    print(f'{name:28s} {img.width}x{img.height} {os.path.getsize(p)//1024}KB')

C = os.path.join(PKG, '01_Characters_APPROVED')
w = Image.open(os.path.join(C, 'char-wamd-faces-turnaround.png'))
save(cut_white(w, (40, 0, 320, 500)), 'wamd-front.webp', 240)
for i, box in enumerate([(50, 495, 320, 770), (410, 495, 715, 770), (785, 495, 1058, 772), (1165, 495, 1440, 775)]):
    save(cut_white(w, box), f'wamd-face-{i}.webp', 200)
n = Image.open(os.path.join(C, 'char-no-robot.png'))
save(cut_white(n, (30, 0, 340, 392)), 'no-front.webp', 220)
for i, x in enumerate([37, 280, 520, 759, 1007, 1260]):
    save(cut_white(n, (x - 6, 404, x + 228, 646)), f'no-face-{i}.webp', 160)
ship = Image.open(os.path.join(ATT, '2959ac7f-image.png'))
save(cut_green(ship, (20, 10, 640, 420)), 'ship-side.webp', 520)
save(Image.open(os.path.join(ATT, '5f71965c-image.png')).convert('RGB'), 'galaxy.webp', 941, 78)
planet = Image.open(os.path.join(PKG, '03_Planets/01_Individual_Planets/planet-01-nowara.png'))
save(cut_white(planet, (0, 0, planet.width, planet.height)), 'planet-01.webp', 400)
envs = {'env-nowara-1.webp': os.path.join(ATT, 'ba5a9352-image.png'),
        'env-nowara-2.webp': os.path.join(ATT, '9173c6cc-image.png'),
        'env-nowara-3.webp': os.path.join(PKG, '04_Environments_VERTICAL/environment-01-nowara-vertical.png')}
for k, p in envs.items():
    save(Image.open(p).convert('RGB'), k, 1024, 76)
