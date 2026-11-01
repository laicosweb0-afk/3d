#!/usr/bin/env python3
"""
SEGNAPOSTO DELLA HERO — solo finché non arriva il video vero.

Costruisce due video provvisori (verticale 1080×1920 e orizzontale 1920×1080)
con le foto reali già nel sito: l'ingresso del negozio, la camera che
avanza verso la porta, dissolvenza, l'interno dello showroom con la camera
che si avvicina lentamente al salotto. Le foto non vengono ritoccate: solo
inquadratura (zoom e spostamento) e dissolvenza fra le due.

Poi si passano a hero-frames.sh come se fossero il video vero:

    python3 tools/bazar-shop/hero-segnaposto.py /tmp/segnaposto
    bash tools/bazar-shop/hero-frames.sh /tmp/segnaposto/orizzontale.mp4 120 /tmp/segnaposto/verticale.mp4

Quando arriva il video vero, basta il secondo comando con il file giusto.
"""
import math, os, subprocess, sys
from PIL import Image

IMG = os.path.join(os.path.dirname(__file__), '../../public/bazar-shop/img')
FOTOGRAMMI = 120

# Le due foto e il punto su cui la camera si dirige (in proporzione 0–1).
INGRESSO = ('showroom-ingresso.webp', 0.50, 0.60)        # il centro delle porte a vetri
SHOWROOM = ('showroom-salotto-bianco.webp', 0.45, 0.56)  # il divano bianco


def morbido(t):
    """Accelera e rallenta dolcemente: niente scatti, niente rimbalzi."""
    t = min(max(t, 0.0), 1.0)
    return t * t * (3 - 2 * t)


def inquadra(img, W, H, zoom, fx, fy):
    iw, ih = img.size
    s = max(W / iw, H / ih) * zoom
    cw, ch = W / s, H / s
    cx = min(max(fx * iw, cw / 2), iw - cw / 2)
    cy = min(max(fy * ih, ch / 2), ih - ch / 2)
    box = (cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2)
    return img.resize((W, H), Image.LANCZOS, box=box)


def video(out, W, H):
    a = Image.open(os.path.join(IMG, INGRESSO[0])).convert('RGB')
    b = Image.open(os.path.join(IMG, SHOWROOM[0])).convert('RGB')
    tmp = out + '.frames'
    os.makedirs(tmp, exist_ok=True)
    for i in range(FOTOGRAMMI):
        t = i / (FOTOGRAMMI - 1)
        # 1. verso la porta (0 → 0.55)
        fa = inquadra(a, W, H, 1.0 + 0.9 * morbido(t / 0.55), *INGRESSO[1:])
        # 2. dentro lo showroom, fino a posarsi sul salotto (0.45 → 1)
        fb = inquadra(b, W, H, 1.0 + 0.16 * morbido((t - 0.45) / 0.55), *SHOWROOM[1:])
        mix = morbido((t - 0.42) / 0.16)
        Image.blend(fa, fb, mix).save(f'{tmp}/{i:04d}.png')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '24', '-i', f'{tmp}/%04d.png',
                    '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', out], check=True)
    subprocess.run(['rm', '-rf', tmp], check=True)
    print('scritto', out)


if __name__ == '__main__':
    dest = sys.argv[1] if len(sys.argv) > 1 else '/tmp/segnaposto'
    os.makedirs(dest, exist_ok=True)
    video(os.path.join(dest, 'verticale.mp4'), 1080, 1920)
    video(os.path.join(dest, 'orizzontale.mp4'), 1920, 1080)
