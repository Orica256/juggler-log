# -*- coding: utf-8 -*-
"""
PWA用アイコンを生成する。

意匠はジャグラーの告知ランプ。暗いホールでホーム画面から探すことになるので、
背景は暗く、中央のランプだけが強く光る形にして遠目でも判別できるようにする。

再生成: python scripts/generate-icons.py
"""
import math
import os

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, 'public')

BG = (11, 15, 25)          # index.css の --color-bg
LAMP = (250, 204, 21)      # 告知ランプの黄
LAMP_CORE = (255, 247, 214)

# 描画は4倍で行ってから縮小し、輪郭を滑らかにする
SUPERSAMPLE = 4


def draw_icon(size, safe_ratio):
    """safe_ratio: ランプが占める割合。maskable は端が切られるので小さくする"""
    s = size * SUPERSAMPLE
    img = Image.new('RGB', (s, s), BG)
    draw = ImageDraw.Draw(img)

    center = s / 2
    lamp_r = s * safe_ratio / 2

    # 外側のにじみ(グロー)を同心円の重ね描きで作る
    glow = Image.new('RGB', (s, s), BG)
    glow_draw = ImageDraw.Draw(glow)
    steps = 24
    for i in range(steps, 0, -1):
        r = lamp_r * (1 + 1.4 * i / steps)
        t = i / steps
        color = tuple(int(BG[c] + (LAMP[c] - BG[c]) * (1 - t) * 0.55) for c in range(3))
        glow_draw.ellipse([center - r, center - r, center + r, center + r], fill=color)
    glow = glow.filter(ImageFilter.GaussianBlur(radius=s * 0.045))
    img = Image.blend(img, glow, 0.9)
    draw = ImageDraw.Draw(img)

    # ランプ本体
    draw.ellipse(
        [center - lamp_r, center - lamp_r, center + lamp_r, center + lamp_r],
        fill=LAMP,
    )
    # 中心の白飛び。点灯している感じを出す
    core_r = lamp_r * 0.45
    draw.ellipse(
        [center - core_r, center - core_r * 1.15, center + core_r, center + core_r * 0.85],
        fill=LAMP_CORE,
    )

    # 放射状の光条。ランプらしさを補強する
    ray_len = lamp_r * 1.75
    ray_w = max(2, int(s * 0.018))
    for k in range(8):
        angle = math.pi / 4 * k
        x0 = center + math.cos(angle) * lamp_r * 1.15
        y0 = center + math.sin(angle) * lamp_r * 1.15
        x1 = center + math.cos(angle) * ray_len
        y1 = center + math.sin(angle) * ray_len
        draw.line([x0, y0, x1, y1], fill=LAMP, width=ray_w)

    return img.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(PUBLIC, exist_ok=True)
    outputs = [
        # (ファイル名, サイズ, ランプの占有率)
        ('icon-192.png', 192, 0.42),
        ('icon-512.png', 512, 0.42),
        # maskable は端を円形に切られるため、中央の安全域に収める
        ('icon-maskable-512.png', 512, 0.30),
        # iOSのホーム画面用。角丸はOS側で付くので四角のまま出す
        ('apple-touch-icon.png', 180, 0.42),
        ('favicon-32.png', 32, 0.46),
    ]
    for name, size, ratio in outputs:
        path = os.path.join(PUBLIC, name)
        draw_icon(size, ratio).save(path, 'PNG', optimize=True)
        print('generated: %s (%dx%d)' % (name, size, size))


if __name__ == '__main__':
    main()
