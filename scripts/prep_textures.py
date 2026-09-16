"""Copy generated albedos into public/textures and wrap-blend edges."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMG = Path(
    r"C:\Users\smart\.grok\sessions"
    r"\C%3A%5CUsers%5Csmart%5CCCWorkspace%5CEarthWonders"
    r"\01a0a5aa-0ceb-76c0-ab1b-f465383bcba0\images"
)
OUT = ROOT / "public" / "textures"
CHECK = ROOT / "public" / "textures" / "_tilecheck"
CHECK.mkdir(parents=True, exist_ok=True)


def wrap_blend(img: Image.Image, overlap: int = 40) -> Image.Image:
    a = np.asarray(img.convert("RGB"), dtype=np.float32)
    h, w = a.shape[:2]
    o = min(overlap, w // 10, h // 10)
    if o < 4:
        return img.convert("RGB")
    for i in range(o):
        t = i / (o - 1)
        blended = a[:, w - o + i] * (1.0 - t) + a[:, i] * t
        a[:, i] = blended
        a[:, w - o + i] = blended
    for i in range(o):
        t = i / (o - 1)
        blended = a[h - o + i] * (1.0 - t) + a[i] * t
        a[i] = blended
        a[h - o + i] = blended
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def crop_frac(img: Image.Image, frac: float) -> Image.Image:
    w, h = img.size
    dx, dy = int(w * frac), int(h * frac)
    return img.crop((dx, dy, w - dx, h - dy)).resize((w, h), Image.Resampling.LANCZOS)


def save(name: str, img: Image.Image) -> None:
    img = img.convert("RGB")
    dest = OUT / name
    img.save(dest, quality=92, optimize=True)
    tile = Image.new("RGB", (img.width * 2, img.height * 2))
    for x in (0, img.width):
        for y in (0, img.height):
            tile.paste(img, (x, y))
    tile.resize((1024, 1024), Image.Resampling.LANCZOS).save(
        CHECK / name.replace(".jpg", "-2x2.jpg"), quality=88
    )
    print("wrote", dest, img.size)


jobs = [
    ("pyramid-limestone.jpg", IMG / "6.jpg", 0.0, 8),
    ("wall-brick.jpg", IMG / "7.jpg", 0.0, 8),
    ("colosseum-travertine.jpg", IMG / "3.jpg", 0.0, 12),
    ("chichen-limestone.jpg", IMG / "5.jpg", 0.0, 8),
    ("machu-andesite.jpg", IMG / "1.jpg", 0.0, 16),
    ("taj-marble.jpg", IMG / "4.jpg", 0.0, 16),
    ("christ-soapstone.jpg", IMG / "21.jpg", 0.09, 10),
    ("arena-sand.jpg", IMG / "15.jpg", 0.0, 16),
    ("wall-roof-tile.jpg", IMG / "20.jpg", 0.0, 8),
    ("taj-sandstone.jpg", IMG / "11.jpg", 0.0, 16),
    ("desert-sand.jpg", IMG / "14.jpg", 0.0, 16),
    ("thatch.jpg", IMG / "16.jpg", 0.0, 10),
    ("tura-limestone.jpg", IMG / "12.jpg", 0.0, 16),
]

for name, src, frac, overlap in jobs:
    im = Image.open(src)
    if frac > 0:
        im = crop_frac(im, frac)
    save(name, wrap_blend(im, overlap))

print("done")
