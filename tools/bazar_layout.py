"""Compone la grafica social BAZAR MARRAKECH su una foto prodotto.

Struttura ripresa dalla locandina "Il comfort ha una nuova forma", carattere
e trattamento dell'oro ripresi dalla locandina "PRESTO ONLINE".

    python3 bazar_layout.py FOTO.jpg USCITA.jpg
    python3 bazar_layout.py - USCITA.jpg          # sfondo crema provvisorio

Il testo si disegna, non si genera: l'italiano resta corretto e i dati si
cambiano senza rifare l'immagine.
"""
import sys
from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 1920
BASE = "/tmp/claude-0/-home-user-3d/6f91cd9e-a390-557a-afed-34cc950606ff/scratchpad"
FONTS, LOGO = f"{BASE}/fonts", f"{BASE}/brand/logo.png"

# Campionati dalla locandina PRESTO ONLINE, non inventati.
CREAM = (239, 235, 225)
INK = (54, 44, 35)
MUTED = (126, 108, 88)

# Oro metallico. Gli estremi sono il 4esimo e il 97esimo percentile dei pixel
# dorati del riferimento; la banda chiara al 36% e' il colpo di luce che
# distingue un oro vero da un riempimento piatto.
GOLD = [(0.00, (163, 133, 68)), (0.17, (201, 174, 110)),
        (0.36, (233, 212, 156)), (0.52, (207, 179, 114)),
        (0.74, (181, 149, 84)), (1.00, (155, 124, 60))]
GOLD_EDGE = (137, 108, 52)
GOLD_SHADOW = (150, 120, 70)

HEADLINE = ["IL COMFORT", "HA UNA NUOVA", "FORMA"]
SUBHEAD = ["VIENI A SCOPRIRLO", "NEL NOSTRO SHOWROOM"]
CONTATTI = ["Ci trovate a Lugo in", "Via fratelli Zucchini 5'",
            "Spedizioni in tutta Italia"]
TEL_LABEL = "NUMERO DI TELEFONO"
TEL = "389 0127054"


def font(name, size):
    return ImageFont.truetype(f"{FONTS}/{name}.ttf", size)


def ramp(h, stops=GOLD):
    """Colonna di colore campionata fra gli stop, poi allargata."""
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


def tracked_width(text, ft, tracking):
    return sum(ft.getlength(ch) for ch in text) + tracking * max(len(text) - 1, 0)


def stamp(draw, x, y, text, ft, fill, tracking):
    for ch in text:
        draw.text((x, y), ch, font=ft, fill=fill)
        x += ft.getlength(ch) + tracking


def text_mask(text, ft, tracking, pad):
    w = int(tracked_width(text, ft, tracking)) + pad * 2
    asc, desc = ft.getmetrics()
    m = Image.new("L", (w, asc + desc + pad * 2), 0)
    stamp(ImageDraw.Draw(m), pad, pad, text, ft, 255, tracking)
    return m


def gold_text(canvas, cx, y, text, ft, tracking=0):
    """Lettere in oro: proiezione calda, riempimento a rampa, bordo in ombra.

    Il bordo serve davvero: sul crema l'oro chiaro perde i contorni e le
    lettere si sfaldano. Si ricava erodendo la maschera e sottraendola.
    """
    pad = 26
    mask = text_mask(text, ft, tracking, pad)
    x = int(cx - mask.width / 2)

    shadow = mask.filter(ImageFilter.GaussianBlur(9)).point(lambda v: int(v * 0.42))
    canvas.paste(Image.new("RGB", mask.size, GOLD_SHADOW), (x, y + 6), shadow)

    fill = ramp(mask.height).resize(mask.size, Image.BILINEAR)
    canvas.paste(fill, (x, y), mask)

    edge = ImageChops.subtract(mask, mask.filter(ImageFilter.MinFilter(3)))
    canvas.paste(Image.new("RGB", mask.size, GOLD_EDGE), (x, y),
                 edge.point(lambda v: int(v * 0.55)))
    return mask.height


def ink_text(canvas, cx, y, text, ft, fill=INK, tracking=0, shadow=True):
    pad = 20
    mask = text_mask(text, ft, tracking, pad)
    x = int(cx - mask.width / 2)
    if shadow:
        soft = mask.filter(ImageFilter.GaussianBlur(7)).point(lambda v: int(v * 0.20))
        canvas.paste(Image.new("RGB", mask.size, (120, 104, 88)), (x, y + 4), soft)
    canvas.paste(Image.new("RGB", mask.size, fill), (x, y), mask)
    return mask.height


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
            d.line([(0, i if top else H - 1 - i), (W, i if top else H - 1 - i)],
                   fill=int(a))
    img.paste(Image.new("RGB", (W, H), CREAM), (0, 0),
              veil.filter(ImageFilter.GaussianBlur(6)))


def placeholder():
    bg = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(bg)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)],
               fill=(round(245 - 22 * t), round(241 - 24 * t), round(232 - 26 * t)))
    return bg


def cover(path):
    im = Image.open(path).convert("RGB")
    k = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    l, t = (im.width - W) // 2, (im.height - H) // 2
    return im.crop((l, t, l + W, t + H))


def rule(img, y, half=150):
    d = ImageDraw.Draw(img)
    d.line([(W / 2 - half, y), (W / 2 + half, y)], fill=(191, 160, 100), width=2)


def diamond(img, y, r=7):
    ImageDraw.Draw(img).polygon(
        [(W / 2, y - r), (W / 2 + r, y), (W / 2, y + r), (W / 2 - r, y)],
        fill=(191, 160, 100))


def compose(photo, out, headline=None):
    headline = headline or HEADLINE
    img = cover(photo) if photo else placeholder()
    scrim(img, 980, 660)

    logo = Image.open(LOGO).convert("RGBA")
    lw = 430
    logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
    img.paste(logo, ((W - lw) // 2, 92), logo)

    y = 92 + logo.height + 42
    diamond(img, y)

    y += 34
    for line in headline:
        gold_text(img, W / 2, y, line, font("prata", 104), tracking=4)
        y += 118

    y += 48
    for line in SUBHEAD:
        ink_text(img, W / 2, y, line, font("montserrat-700", 37), MUTED, tracking=5)
        y += 56

    yb = H - 510
    rule(img, yb)
    yb += 40
    ink_text(img, W / 2, yb, CONTATTI[0], font("lato-300", 35), INK, shadow=False)
    yb += 58
    ink_text(img, W / 2, yb, CONTATTI[1], font("prata", 56), INK)
    yb += 104
    ink_text(img, W / 2, yb, CONTATTI[2], font("lato-300", 33), INK, shadow=False)
    yb += 72
    ink_text(img, W / 2, yb, TEL_LABEL, font("lato-400", 25), MUTED, tracking=5,
             shadow=False)
    yb += 46
    ink_text(img, W / 2, yb, TEL, font("montserrat-700", 66), INK)

    img.save(out, "JPEG", quality=95)
    return out


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] != "-" else None
    dst = sys.argv[2] if len(sys.argv) > 2 else "out.jpg"
    print(compose(src, dst, sys.argv[3:] or None))
