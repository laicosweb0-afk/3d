"""Compone la grafica social BAZAR MARRAKECH su una foto prodotto.

Riproduce l'impaginato della locandina "PRESTO ONLINE": titolo in Didone oro,
occhiello in corsivo, sottotitolo in bastoni scuro, e in basso a destra il
blocco marchio con indirizzo e sito.

    python3 bazar_layout.py FOTO.jpg USCITA.jpg
    python3 bazar_layout.py - USCITA.jpg        # sfondo crema provvisorio

Il testo si disegna, non si genera: l'italiano resta corretto e i dati si
cambiano senza rifare l'immagine.
"""
import sys
from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 1920
BASE = "/tmp/claude-0/-home-user-3d/6f91cd9e-a390-557a-afed-34cc950606ff/scratchpad"
FONTS = f"{BASE}/fonts"

# Campionati dai pixel della locandina, non scelti a occhio.
CREAM = (240, 237, 227)
DARK = (83, 81, 75)          # "IL NOSTRO ARREDO"
DARKER = (67, 67, 67)        # "MARRAKECH"

# Oro metallico: gli estremi della rampa sono il 4o e il 97o percentile dei
# pixel dorati del titolo; la banda chiara al 36% e' il colpo di luce che
# distingue un oro vero da un riempimento piatto.
GOLD = [(0.00, (163, 133, 68)), (0.17, (201, 174, 110)),
        (0.36, (233, 212, 156)), (0.52, (207, 179, 114)),
        (0.74, (181, 149, 84)), (1.00, (155, 124, 60))]
GOLD_EDGE = (137, 108, 52)
GOLD_SHADOW = (150, 120, 70)

TITOLO = ["PRESTO", "ONLINE"]
OCCHIELLO = "con un click"
SOTTOTITOLO = ["IL NOSTRO ARREDO", "ARRIVA A CASA TUA"]
INDIRIZZO = "Lugo, Via Fratelli Zucchini 5"
SITO = "bazar-marrakech.com"
TELEFONO = "389 0127054"


def font(name, size):
    return ImageFont.truetype(f"{FONTS}/{name}.ttf", size)


def ramp(h, stops=GOLD):
    col = Image.new("RGB", (1, h))
    px = col.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        for i in range(len(stops) - 1):
            t0, c0 = stops[i]
            t1, c1 = stops[i + 1]
            if t0 <= t <= t1:
                k = (t - t0) / (t1 - t0)
                px[0, y] = tuple(round(c0[j] + (c1[j] - c0[j]) * k) for j in range(3))
                break
    return col


def width_of(text, ft, tracking):
    return sum(ft.getlength(c) for c in text) + tracking * max(len(text) - 1, 0)


def stamp(draw, x, y, text, ft, fill, tracking):
    for c in text:
        draw.text((x, y), c, font=ft, fill=fill)
        x += ft.getlength(c) + tracking


def mask_of(text, ft, tracking, pad):
    w = int(width_of(text, ft, tracking)) + pad * 2
    asc, desc = ft.getmetrics()
    m = Image.new("L", (w, asc + desc + pad * 2), 0)
    stamp(ImageDraw.Draw(m), pad, pad, text, ft, 255, tracking)
    return m


def place(mask, x, align):
    return int(x - mask.width / 2) if align == "c" else int(x - mask.width) \
        if align == "r" else int(x)


def gold_text(img, x, y, text, ft, tracking=0, align="c"):
    """Proiezione calda, riempimento a rampa, bordo eroso in ombra.

    Il bordo non e' un vezzo: sul crema le grazie sottili del Didone perdono
    i contorni e le lettere si sfaldano.
    """
    m = mask_of(text, ft, tracking, 26)
    px = place(m, x, align)
    img.paste(Image.new("RGB", m.size, GOLD_SHADOW), (px, y + 6),
              m.filter(ImageFilter.GaussianBlur(9)).point(lambda v: int(v * 0.42)))
    img.paste(ramp(m.height).resize(m.size, Image.BILINEAR), (px, y), m)
    edge = ImageChops.subtract(m, m.filter(ImageFilter.MinFilter(3)))
    img.paste(Image.new("RGB", m.size, GOLD_EDGE), (px, y),
              edge.point(lambda v: int(v * 0.55)))
    return m.height


def ink_text(img, x, y, text, ft, fill=DARK, tracking=0, align="c", shadow=True):
    m = mask_of(text, ft, tracking, 20)
    px = place(m, x, align)
    if shadow:
        img.paste(Image.new("RGB", m.size, (120, 116, 108)), (px, y + 4),
                  m.filter(ImageFilter.GaussianBlur(7)).point(lambda v: int(v * 0.18)))
    img.paste(Image.new("RGB", m.size, fill), (px, y), m)
    return m.height


def scrim(img, top_h, bottom_h, plateau=0.55):
    """Fascia crema alle estremita'.

    Una sfumatura semplice perde il testo a meta' corsa su una foto scura:
    serve una parte piena, e solo dopo la sfumatura verso la foto.
    """
    veil = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(veil)
    for depth, top in ((top_h, True), (bottom_h, False)):
        for i in range(depth):
            t = i / depth
            a = 250 if t < plateau else 250 * (1 - (t - plateau) / (1 - plateau)) ** 1.4
            y = i if top else H - 1 - i
            d.line([(0, y), (W, y)], fill=int(a))
    img.paste(Image.new("RGB", (W, H), CREAM), (0, 0),
              veil.filter(ImageFilter.GaussianBlur(6)))


def placeholder():
    bg = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(bg)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)],
               fill=(round(246 - 24 * t), round(243 - 26 * t), round(234 - 28 * t)))
    return bg


def cover(path):
    im = Image.open(path).convert("RGB")
    k = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    l, t = (im.width - W) // 2, (im.height - H) // 2
    return im.crop((l, t, l + W, t + H))


def globe(img, cx, cy, r=15):
    d = ImageDraw.Draw(img)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=DARK, width=2)
    d.line([(cx - r, cy), (cx + r, cy)], fill=DARK, width=2)
    d.ellipse([cx - r * 0.5, cy - r, cx + r * 0.5, cy + r], outline=DARK, width=2)


def compose(photo, out, titolo=None):
    titolo = titolo or TITOLO
    img = cover(photo) if photo else placeholder()
    scrim(img, 900, 620)

    y = 150
    for line in titolo:
        gold_text(img, W / 2, y, line, font("prata", 140), tracking=6)
        y += 158

    y += 10
    gold_text(img, W / 2, y, OCCHIELLO, font("pinyon", 104))

    y += 116
    for line in SOTTOTITOLO:
        ink_text(img, W / 2, y, line, font("montserrat-700", 58), DARK, tracking=1)
        y += 76

    # Blocco marchio in basso a destra, allineato a bandiera.
    right = W - 78
    yb = H - 412
    gold_text(img, right, yb, "BAZAR", font("prata", 88), tracking=5, align="r")
    yb += 100
    ink_text(img, right, yb, "MARRAKECH", font("montserrat-700", 50), DARKER,
             tracking=3, align="r")
    yb += 74
    ink_text(img, right, yb, INDIRIZZO, font("lato-400", 33), DARK, align="r",
             shadow=False)
    yb += 52
    ink_text(img, right, yb, SITO, font("lato-400", 33), DARK, align="r",
             shadow=False)
    sito_w = width_of(SITO, font("lato-400", 33), 0)
    globe(img, right - sito_w - 34, yb + 22)
    yb += 52
    ink_text(img, right, yb, f"Tel. {TELEFONO}", font("lato-400", 33), DARK,
             align="r", shadow=False)

    img.save(out, "JPEG", quality=95)
    return out


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] != "-" else None
    dst = sys.argv[2] if len(sys.argv) > 2 else "out.jpg"
    print(compose(src, dst, sys.argv[3:] or None))
