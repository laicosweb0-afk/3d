#!/usr/bin/env python3
"""
STUDIO BAZAR — il trattamento fotografico dei prodotti.

Scontorna il prodotto dalla foto originale (rembg, in locale) e lo rimette
in scena sempre allo stesso modo: fondale sabbia che sfuma dal muro al
pavimento, ombra di contatto morbida, stessa base e stessi margini per ogni
prodotto. Il prodotto non viene ritoccato: forma, colori e tessuti restano
quelli della foto.

    python tools/bazar-shop/studio.py <foto> <nome> [--formato 4:3|4:5|1:1]
                                      [--modello isnet-general-use]
                                      [--margine 0.12] [--alpha-min 0]

Esce in public/bazar-shop/img/studio/: <nome>.webp (in scena) e
<nome>-png.webp (scontornato, trasparente). Richiede: pip install "rembg[cpu]"
"""
import argparse, os
import numpy as np
from PIL import Image, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), '../../public/bazar-shop/img/studio')

# Il fondale: avorio caldo in alto, sabbia sul pavimento (palette del sito).
MURO_ALTO = np.array([243, 239, 232])   # vicino a #F5F2EC
MURO_BASSO = np.array([234, 228, 218])  # #EAE5DC
PAVIMENTO = np.array([222, 214, 201])   # fra #D9D2C6 e #EAE5DC


def fondale(w, h, orizzonte):
    y = np.linspace(0, 1, h)[:, None]
    muro = MURO_ALTO + (MURO_BASSO - MURO_ALTO) * np.clip(y / orizzonte, 0, 1) ** 1.4
    t = np.clip((y - orizzonte) / (1 - orizzonte), 0, 1)
    pav = MURO_BASSO + (PAVIMENTO - MURO_BASSO) * (t ** .6)
    rgb = np.where(y < orizzonte, muro, pav)
    # raccordo morbido muro/pavimento, come una curva da studio
    band = np.exp(-((y - orizzonte) / 0.035) ** 2)
    rgb = rgb * (1 - .25 * band) + MURO_BASSO * (.25 * band)
    # vignettatura leggerissima ai lati
    x = np.linspace(-1, 1, w)[None, :]
    rgb = rgb[:, None, :] * (1 - 0.035 * x ** 2)[..., None]
    img = rgb  # (h, w, 3)
    return Image.fromarray(np.clip(img, 0, 255).astype('uint8'), 'RGB')


def ombra(prod, w, h, x0, y0):
    """Ombra di contatto: la base del prodotto schiacciata e sfocata, più una
    pozza ampia e leggerissima. Niente ombre nere e pesanti."""
    a = np.asarray(prod.getchannel('A')).astype(float) / 255
    ph, pw = a.shape
    canvas = np.zeros((h, w))
    # profilo della base: le ultime righe opache del prodotto
    rows = np.where(a.max(axis=1) > .5)[0]
    base = rows.max()
    piede = a[max(0, base - int(ph * .06)):base + 1].max(axis=0)
    cols = np.where(piede > .3)[0]
    if len(cols):
        cx0, cx1 = cols.min(), cols.max()
    else:
        cx0, cx1 = 0, pw - 1
    # 1. contatto stretto sotto ciò che tocca terra
    contatto = np.zeros((h, w))
    yb = y0 + base
    for dy in range(-int(ph * .012), int(ph * .008) + 1):
        yy = yb + dy
        if 0 <= yy < h:
            contatto[yy, x0:x0 + pw] = np.maximum(contatto[yy, x0:x0 + pw], piede * .9)
    c = Image.fromarray((contatto * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(max(3, pw * .014)))
    # 2. pozza ellittica ampia
    pozza = Image.new('L', (w, h), 0)
    from PIL import ImageDraw
    d = ImageDraw.Draw(pozza)
    ex0, ex1 = x0 + cx0 - pw * .03, x0 + cx1 + pw * .03
    d.ellipse([ex0, yb - ph * .05, ex1, yb + ph * .05], fill=150)
    pozza = pozza.filter(ImageFilter.GaussianBlur(pw * .05))
    tot = np.clip(np.asarray(c).astype(float) / 255 * .42 + np.asarray(pozza).astype(float) / 255 * .38, 0, .55)
    return tot


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('foto'); ap.add_argument('nome')
    ap.add_argument('--formato', default='4:3')
    ap.add_argument('--modello', default='isnet-general-use')
    ap.add_argument('--margine', type=float, default=.12, help='spazio attorno al prodotto, in proporzione')
    ap.add_argument('--larghezza', type=int, default=1600)
    ap.add_argument('--orizzonte', type=float, default=.70, help='dove il muro incontra il pavimento (0-1)')
    ap.add_argument('--maschera', help='usa questo PNG già scontornato invece di rembg')
    a = ap.parse_args()

    if a.maschera:
        prod = Image.open(a.maschera).convert('RGBA')
    else:
        from rembg import remove, new_session
        src = Image.open(a.foto).convert('RGB')
        prod = remove(src, session=new_session(a.modello), post_process_mask=True)
    # pulizia: via i residui quasi trasparenti, bordo appena ammorbidito
    al = np.asarray(prod.getchannel('A')).astype(float)
    al[al < 18] = 0
    prod.putalpha(Image.fromarray(al.astype('uint8')).filter(ImageFilter.GaussianBlur(.6)))
    prod = prod.crop(prod.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox())

    fw, fh = map(int, a.formato.split(':'))
    W = a.larghezza; H = round(W * fh / fw)
    m = a.margine
    # il prodotto entra nel riquadro utile e poggia sempre sulla stessa linea di terra
    terra = .86
    box_w, box_h = W * (1 - 2 * m), H * (terra - m * 1.1)
    s = min(box_w / prod.width, box_h / prod.height)
    prod = prod.resize((round(prod.width * s), round(prod.height * s)), Image.LANCZOS)
    x0 = (W - prod.width) // 2
    y0 = round(H * terra) - prod.height

    bg = fondale(W, H, a.orizzonte).convert('RGB')
    sh = ombra(prod, W, H, x0, y0)
    arr = np.asarray(bg).astype(float) * (1 - sh[..., None] * .55) + np.array([60, 48, 36]) * (sh[..., None] * .55)
    scena = Image.fromarray(np.clip(arr, 0, 255).astype('uint8')).convert('RGBA')
    scena.alpha_composite(prod, (x0, y0))

    os.makedirs(OUT, exist_ok=True)
    scena.convert('RGB').save(os.path.join(OUT, f'{a.nome}.webp'), 'WEBP', quality=86, method=6)
    prod.save(os.path.join(OUT, f'{a.nome}-png.webp'), 'WEBP', quality=88, method=6)
    print(f'{a.nome}: {W}x{H}')


if __name__ == '__main__':
    main()
