from pathlib import Path
import fitz
from PIL import Image
from io import BytesIO

pdf_path = Path('/mnt/data/نسخه ٣.pdf')
root = Path(__file__).resolve().parents[1]
out_dir = root / 'treasure' / 'art' / 'story5'
keys = ['rawaa','nuha','nabd','shibl','suhail','ward','nawfal']
doc = fitz.open(pdf_path)
if len(doc) != 7:
    raise SystemExit(f'Expected 7 character pages, got {len(doc)}')
for i, key in enumerate(keys):
    imgs = doc[i].get_images(full=True)
    base_info = imgs[-1]
    base = fitz.Pixmap(doc, base_info[0])
    mask = fitz.Pixmap(doc, base_info[1])
    pix = fitz.Pixmap(base, mask)
    im = Image.open(BytesIO(pix.tobytes('png'))).convert('RGBA')
    # Tight transparent crop preserves the exact supplied illustration.
    alpha = im.getchannel('A')
    bbox = alpha.getbbox()
    if bbox:
        im = im.crop(bbox)
    # Keep portrait proportions and high quality while controlling PWA size.
    if im.height > 980:
        nw = round(im.width * 980 / im.height)
        im = im.resize((nw, 980), Image.Resampling.LANCZOS)
    target = out_dir / f'crew_full_{key}.webp'
    im.save(target, 'WEBP', quality=91, method=6, lossless=False)
    print(target.name, im.size, target.stat().st_size)
