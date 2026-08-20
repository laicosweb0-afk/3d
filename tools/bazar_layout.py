"""Compone la grafica social BAZAR MARRAKECH su una foto prodotto.

Struttura ripresa dalla locandina "Il comfort ha una nuova forma":
logo in alto, headline, foto a tutta pagina, blocco contatti in basso.
Il carattere e' il Bodoni della locandina "PRESTO ONLINE", con il
riempimento in gradiente oro.

    python3 bazar_layout.py FOTO.jpg USCITA.jpg ["Riga uno" "Riga due"]

Senza FOTO usa uno sfondo crema provvisorio.
"""
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 1920
BASE = "/tmp/claude-0/-home-user-3d/6f91cd9e-a390-557a-afed-34cc950606ff/scratchpad"
FONTS = f"{BASE}/fonts"
LOGO = f"{BASE}/brand/logo.png"

CREAM = (246, 241, 232)
INK = (58, 47, 38)
# Due ori: quello chiaro del logo brilla sulla foto, ma sul crema sparisce.
# Per il testo serve una versione piu' profonda che tenga il contrasto.
GOLD_LOGO = [(0.00, (176, 132, 47)), (0.30, (233, 200, 126)),
             (0.52, (250, 238, 199)), (0.72, (201, 158, 74)),
             (1.00, (150, 110, 38))]
GOLD_TEXT = [(0.00, (138, 98, 30)), (0.28, (186, 145, 62)),
             (0.50, (214, 178, 104)), (0.74, (168, 126, 46)),
             (1.00, (120, 84, 26))]

CONTATTI = ["Ci trovate a Lugo in", "Via fratelli Zucchini 5'",
            "Spedizioni in tutta Italia"]
TEL_LABEL = "Numero di telefono"
TEL = "389 0127054"


def font(name, size):
    return ImageFont.truetype(f"{FONTS}/{name}.ttf", size)


def gold_gradient(size, stops=None):
    """Barra verticale di oro, campionata fra gli stop."""
    stops = stops or GOLD_TEXT
    w, h = size
    grad = Image.new("RGB", (1, h))
    px = grad.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        for i in range(len(stops) - 1):
            t0, c0 = stops[i]
            t1, c1 = stops[i + 1]
            if t0 <= t <= t1:
                k = (t - t0) / (t1 - t0)
                px[0, y] = tuple(round(c0[j] + (c1[j] - c0[j]) * k) for j in range(3))
                break
    return grad.resize((w, h), Image.BILINEAR)


def tracked_width(text, ft, tracking):
    return sum(ft.getlength(ch) for ch in text) + tracking * max(len(text) - 1, 0)


def draw_tracked(draw, xy, text, ft, fill, tracking, anchor_mid=True):
    x, y = xy
    if anchor_mid:
        x -= tracked_width(text, ft, tracking) / 2
    for ch in text:
        draw.text((x, y), ch, font=ft, fill=fill)
        x += ft.getlength(ch) + tracking


def gold_text(canvas, xy, text, ft, tracking=0, centre=True):
    """Testo riempito d'oro: si disegna la maschera e ci si applica il gradiente."""
    w = int(tracked_width(text, ft, tracking)) + 8
    asc, desc = ft.getmetrics()
    h = asc + desc + 8
    mask = Image.new("L", (w, h), 0)
    draw_tracked(ImageDraw.Draw(mask), (4 if not centre else w / 2, 4),
                 text, ft, 255, tracking, anchor_mid=centre)
    x, y = xy
    if centre:
        x -= w / 2
    canvas.paste(gold_gradient((w, h)), (int(x), int(y)), mask)
    return h


def scrim(img, top_h, bottom_h, plateau=0.55):
    """Velatura crema alle estremita': il testo resta leggibile su ogni foto.

    Una sfumatura semplice non basta: su una foto scura il testo si perde a
    meta' corsa. Serve una fascia piena per la prima parte, e solo dopo la
    sfumatura verso la foto.
    """
    veil = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(veil)

    def band(depth, top):
        for i in range(depth):
            t = i / depth
            a = 250 if t < plateau else 250 * (1 - (t - plateau) / (1 - plateau)) ** 1.4
            y = i if top else H - 1 - i
            d.line([(0, y), (W, y)], fill=int(a))

    band(top_h, True)
    band(bottom_h, False)
    img.paste(Image.new("RGB", (W, H), CREAM), (0, 0),
              veil.filter(ImageFilter.GaussianBlur(6)))


def placeholder():
    """Sfondo crema con una vignettatura calda, in attesa della foto vera."""
    bg = Image.new("RGB", (W, H), (238, 231, 219))
    d = ImageDraw.Draw(bg)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)],
               fill=(round(248 - 26 * t), round(243 - 28 * t), round(233 - 30 * t)))
    return bg


def cover(path):
    im = Image.open(path).convert("RGB")
    k = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    return im.crop(((im.width - W) // 2, (im.height - H) // 2,
                    (im.width - W) // 2 + W, (im.height - H) // 2 + H))


def hairline(d, y, half=170):
    d.line([(W / 2 - half, y), (W / 2 + half, y)], fill=(196, 160, 92), width=2)


def diamond(d, y, r=7):
    d.polygon([(W / 2, y - r), (W / 2 + r, y), (W / 2, y + r), (W / 2 - r, y)],
              fill=(196, 160, 92))


def compose(photo, out, headline):
    img = cover(photo) if photo else placeholder()
    scrim(img, 880, 640)
    d = ImageDraw.Draw(img)

    logo = Image.open(LOGO).convert("RGBA")
    lw = 470
    logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
    img.paste(logo, ((W - lw) // 2, 96), logo)

    y = 96 + logo.height + 54
    diamond(d, y)

    y += 40
    size = 92
    for line in headline:
        gold_text(img, (W / 2, y), line, font("bodoni-700", size), tracking=2)
        y += round(size * 1.16)

    y += 40
    draw_tracked(d, (W / 2, y), "VIENI A TROVARCI", font("lato-400", 31),
                 (120, 100, 78), 7)

    yb = H - 470
    hairline(d, yb)
    yb += 42
    d.text((W / 2, yb), CONTATTI[0], font=font("lato-300", 34), fill=INK, anchor="ma")
    yb += 50
    d.text((W / 2, yb), CONTATTI[1], font=font("bodoni-700", 54), fill=INK, anchor="ma")
    yb += 104
    d.text((W / 2, yb), CONTATTI[2], font=font("lato-300", 32), fill=INK, anchor="ma")
    yb += 70
    draw_tracked(d, (W / 2, yb), TEL_LABEL.upper(), font("lato-400", 25),
                 (128, 108, 84), 5)
    yb += 40
    d.text((W / 2, yb), TEL, font=font("bodoni-900", 70), fill=INK, anchor="ma")
    diamond(d, H - 74, 6)

    img.save(out, "JPEG", quality=94)
    return out


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] != "-" else None
    dst = sys.argv[2] if len(sys.argv) > 2 else "out.jpg"
    head = sys.argv[3:] or ["IL COMFORT", "HA UNA NUOVA", "FORMA"]
    print(compose(src, dst, head))
