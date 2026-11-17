# 由 assets/icon-only.png 生成网站图标（favicon / apple-touch / PWA）
from PIL import Image, ImageDraw
import numpy as np, os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
src = Image.open('assets/icon-only.png').convert('RGB'); a = np.array(src).astype(int)
white = (a[..., 0] > 200) & (a[..., 1] > 200) & (a[..., 2] > 200)
gold = (a[..., 0] > 200) & (a[..., 1] > 150) & (a[..., 2] < 120)
mask = lambda m: Image.fromarray((m * 255).astype('uint8'))
ys, xs = np.where(white | gold); box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
glyph = mask(white).crop(box); star = mask(gold).crop(box)
S = 1024
def bg(rounded, r=230):
    t = np.linspace(0, 1, S)[:, None] * 0.6 + np.linspace(0, 1, S)[None, :] * 0.4
    c1 = np.array([0xB3, 0x2A, 0x2A]); c2 = np.array([0x7A, 0x00, 0x00])
    im = Image.fromarray((c1 * (1 - t[..., None]) + c2 * t[..., None]).astype('uint8')).convert('RGBA')
    if rounded:
        m = Image.new('L', (S, S), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, S - 1, S - 1], r, fill=255); im.putalpha(m)
    return im
def compose(rounded, scale):
    im = bg(rounded); w, h = glyph.size; k = S * scale / max(w, h)
    nw, nh = int(w * k), int(h * k)
    g = glyph.resize((nw, nh), Image.LANCZOS); s = star.resize((nw, nh), Image.LANCZOS)
    ox, oy = (S - nw) // 2, (S - nh) // 2 + int(S * 0.01)
    im.paste(Image.new('RGBA', (nw, nh), (255, 255, 255, 255)), (ox, oy), g)
    im.paste(Image.new('RGBA', (nw, nh), (255, 214, 64, 255)), (ox, oy), s)
    return im
fav = compose(True, 0.80); full = compose(False, 0.66); mk = compose(False, 0.56)
os.makedirs('www/icons', exist_ok=True)
fav.save('assets/favicon-1024.png')
fav.resize((32, 32), Image.LANCZOS).save('www/icons/favicon-32.png')
fav.resize((16, 16), Image.LANCZOS).save('www/icons/favicon-16.png')
fav.save('www/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
full.convert('RGB').resize((180, 180), Image.LANCZOS).save('www/icons/apple-touch-icon.png')
fav.resize((192, 192), Image.LANCZOS).save('www/icons/icon-192.png')
fav.resize((512, 512), Image.LANCZOS).save('www/icons/icon-512.png')
mk.convert('RGB').resize((512, 512), Image.LANCZOS).save('www/icons/maskable-512.png')
