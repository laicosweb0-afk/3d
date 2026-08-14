#!/usr/bin/env python3
"""Ricompone il COUPON REGALO di WO*MAN Parfume Store dal formato 21x9 cm al 17x10 cm.

Il PDF originale (coupon/source/) e' composto da due pagine, ognuna una singola
immagine raster appiattita: nessun testo vettoriale, nessun livello. Il fronte e'
artwork a pieno vivo; il retro e' un mockup (la card e' appoggiata su un fondo
bianco con ombra), quindi va prima ritagliata.

Passare da 21x9 a 17x10 cambia il rapporto da 2.33 a 1.70: un ridimensionamento
deformerebbe tutto e un taglio perderebbe l'orologio o il pacco. Qui gli elementi
vengono ritagliati alla risoluzione originale e riposizionati in un impaginato
pensato per il nuovo formato.

Il trucco che tiene invisibili le giunzioni e' la composizione per differenza:
di ogni ritaglio non si incolla il pixel, ma lo scarto rispetto al fondo che
aveva nell'originale (delta = ritaglio - fondo_sorgente). Il delta e' zero dove
c'era solo fondo, quindi il rettangolo del ritaglio sparisce, e sopravvivono le
ombre portate degli oggetti. Il fondo nuovo viene ricostruito dal fondo vecchio
(che sul fronte ha un gradiente orizzontale) piu' la sua texture.

Uso:
    python3 coupon/build.py                 # PDF + anteprime in coupon/stampa/
    python3 coupon/build.py --unify-pink    # uniforma il rosa del retro a quello del fronte
    python3 coupon/build.py --dpi 300       # risoluzione di lavoro (default 400)
"""

from __future__ import annotations

import argparse
import io
import math
import sys
from dataclasses import dataclass
from pathlib import Path

import cv2
import img2pdf
import numpy as np
import pikepdf
from PIL import Image

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "source" / "COUPON_REGALO_21x9.pdf"
OUT = ROOT / "stampa"
CACHE = ROOT / "assets"

# ---------------------------------------------------------------- formato
W_MM, H_MM = 170.0, 100.0          # il formato richiesto: 17 x 10 cm netti
BAND_MM = 4.0                      # fascia rosa verticale sui due lati

# Geometria delle sorgenti. Il fronte e' la pagina intera; del retro serve solo
# la card dentro al mockup (bordi trovati misurando le fasce rosa).
FRONT_PAGE_W_MM = 210.0
BACK_CARD = (196, 141, 6154, 2555)  # x0, y0, x1, y1 nella pagina 2
BACK_PAGE_W_MM = 210.0
BACK_PAGE_W_PX = 6336


@dataclass
class Piece:
    """Un elemento ritagliato dall'originale e ricollocato nel nuovo impaginato.

    box:    ritaglio nella sorgente (x0, y0, x1, y1), con un margine di fondo
            attorno all'elemento: e' li' che il delta si annulla e la giuntura
            sparisce.
    anchor: punto di riferimento del ritaglio ('tl', 'tc', 'tr', 'bl', ...).
    at:     posizione in mm dell'anchor nel nuovo formato.
    scale:  fattore rispetto alla dimensione fisica originale.
    """

    name: str
    box: tuple[int, int, int, int]
    anchor: str
    at: tuple[float, float]
    scale: float = 1.0
    # sfumatura del delta sui lati indicati ('l', 'r', 't', 'b' -> px nella
    # sorgente): serve dove il ritaglio taglia qualcosa di continuo, come la
    # filigrana dell'orologio dietro alla cornice.
    feather: dict[str, int] | None = None
    # lati dove il taglio e' voluto (la catena esce dal formato, le orecchie
    # sono tagliate dal bordo, il filetto dei contatti finisce e basta):
    # servono solo a non far gridare al lupo il controllo delle giunzioni
    expect_cut: str = ""
    # zone del ritaglio da azzerare, in coordinate sorgente: dove il rettangolo
    # tira dentro un pezzo che appartiene a un altro elemento
    erase: tuple[tuple[int, int, int, int], ...] = ()


# ------------------------------------------------------------------ fronte
# Il fronte scende a 0.88: a 1:1 orologio + titolo + pacco non entrerebbero
# nei 17 cm. Il QR resta piu' grande (0.96 -> 22 mm, modulo 0.54 mm) perche'
# li' la leggibilita' viene prima dell'ortodossia tipografica.
S_FRONT = 0.88
FRONT_PIECES = [
    Piece("orologio", (250, 0, 900, 1140), "tl", (5.9, 0.0), S_FRONT, expect_cut="t"),
    Piece("logo", (3020, 80, 3640, 330), "tr", (W_MM - 7.0, 5.0), S_FRONT),
    Piece("titolo", (1060, 430, 2760, 650), "tc", (W_MM / 2, 26.0), S_FRONT),
    Piece("sottotitolo", (1260, 660, 2550, 785), "tc", (W_MM / 2, 38.0), S_FRONT),
    Piece("qr", (1690, 913, 2140, 1362), "tc", (W_MM / 2, 51.3), 0.96),
    Piece("orecchio_sx", (1050, 980, 1570, 1648), "bl", (44.2, H_MM), S_FRONT,
          expect_cut="b"),
    # Orecchio destro e pacco si sfiorano nell'originale: separarli lascerebbe
    # una giuntura sulla pelliccia, quindi viaggiano come un blocco solo e
    # tengono la distanza che avevano. Nello stesso rettangolo cadono pero'
    # anche le code del titolo e del sottotitolo: quella zona va azzerata,
    # perche' li' compongono da soli.
    Piece("orecchio_dx+pacco", (2128, 400, 3580, 1648), "bl", (93.3, H_MM), S_FRONT,
          expect_cut="b", erase=((2128, 400, 2757, 900),)),
]

# ------------------------------------------------------------------- retro
# Il retro resta a 1:1: la cornice ha due fustelle che trattengono la fiala,
# rimpicciolirla cambierebbe la presa. Solo la riga dei contatti scende a 0.90,
# perche' a grandezza naturale misura 175 mm e non entrerebbe nei 170.
BACK_PIECES = [
    # marchio e fregio sotto restano insieme, come titolo e suo fregio: la coda
    # della "ff" di Olfattivo scende dentro al fregio, tagliarli li separerebbe
    Piece("marchio", (2220, 110, 3410, 710), "tl", (13.5, 6.4), 1.0),
    Piece("titolo", (415, 550, 1510, 1130), "tl", (13.7, 30.3), 1.0),
    Piece("testo", (415, 1165, 2250, 1790), "tl", (13.7, 55.6), 1.0),
    # il ritaglio parte dopo il logo (che finisce a 3387) e si ferma sopra il
    # filetto dei contatti; porta con se' la filigrana dell'orologio, che viene
    # sfumata sui lati aperti per non lasciare uno stacco netto
    Piece("cornice", (3450, 0, 5830, 1944), "tr", (W_MM - BAND_MM, 7.0), 1.0,
          feather={"l": 250, "t": 60, "b": 50}),
    # il filetto sopra i contatti viaggia con loro: nell'originale corre da un
    # margine all'altro, qui si accorcia con il blocco
    Piece("contatti", (250, 1930, 5530, 2345), "tc", (W_MM / 2, 83.6), 0.90,
          expect_cut="lr"),
]


# ------------------------------------------------------------------ utility
def mm2px(mm: float, dpi: float) -> int:
    return int(round(mm / 25.4 * dpi))


def canvas_px(dpi: float) -> tuple[int, int]:
    """Pixel della tela, in rapporto 17:10 esatto.

    Il conto diretto (170 mm a 400 dpi = 2677,17 px) va arrotondato, e
    2677 x 1575 non e' 1,7: l'immagine finirebbe centrata nella pagina con
    16 micron di vuoto per lato. Su un fondo che arriva al taglio quel vuoto
    e' un filo bianco potenziale, quindi l'altezza si arrotonda a decine e la
    larghezza scende dal rapporto."""
    h = max(10, math.ceil(H_MM / 25.4 * dpi / 10) * 10)   # per eccesso: i dpi
    return int(h * W_MM / H_MM), h                        # chiesti restano un minimo


def load_pages() -> tuple[np.ndarray, np.ndarray]:
    """Le due pagine del PDF come immagini BGR, ritagliando la card dal mockup."""
    CACHE.mkdir(exist_ok=True)
    cached = [CACHE / "front_src.png", CACHE / "back_src.png"]
    if all(p.exists() for p in cached):
        return cv2.imread(str(cached[0])), cv2.imread(str(cached[1]))

    if not SOURCE.exists():
        sys.exit(f"manca il PDF sorgente: {SOURCE}")

    import pypdf

    reader = pypdf.PdfReader(str(SOURCE))
    pages = []
    for page in reader.pages:
        images = list(page.images)
        if len(images) != 1:
            sys.exit("la pagina non contiene una singola immagine appiattita")
        pages.append(cv2.cvtColor(np.array(images[0].image), cv2.COLOR_RGB2BGR))

    front = pages[0]
    x0, y0, x1, y1 = BACK_CARD
    back = pages[1][y0:y1, x0:x1]
    cv2.imwrite(str(cached[0]), front)
    cv2.imwrite(str(cached[1]), back)
    return front, back


def background_model(img: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Il fondo senza gli elementi: le zone occupate vengono ricostruite per
    inpainting e poi sfocate, cosi' resta solo l'andamento lento del colore
    (sul fronte il nero schiarisce verso sinistra)."""
    small = cv2.resize(img, None, fx=0.125, fy=0.125, interpolation=cv2.INTER_AREA)
    # la maschera si riduce con un max (dilatazione + nearest): meglio coprire un
    # pixel di fondo in piu' che lasciare un pixel di elemento dentro al modello
    m = cv2.dilate(mask, np.ones((17, 17), np.uint8))
    m = cv2.resize(m, (small.shape[1], small.shape[0]), interpolation=cv2.INTER_NEAREST)
    m = (m > 0).astype(np.uint8)
    filled = cv2.inpaint(small, m, 12, cv2.INPAINT_TELEA)
    filled = cv2.GaussianBlur(filled.astype(np.float32), (0, 0), 6)
    return cv2.resize(filled, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_CUBIC)


def element_mask(img: np.ndarray, dark_bg: bool) -> np.ndarray:
    """Maschera di cio' che non e' fondo: sul fronte i pixel piu' chiari del
    nero, sul retro quelli piu' scuri o piu' saturi della carta."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    sat = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)[:, :, 1]
    if dark_bg:
        # sul nero la saturazione non dice niente (a luminanza 15 basta un
        # canale di scarto per leggere 68): conta solo quanto un pixel schiarisce
        m = gray > 42
    else:
        m = (gray < 205) | (sat > 50)
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((31, 31), np.uint8))
    return cv2.dilate(m, np.ones((21, 21), np.uint8))


def texture(img: np.ndarray, mask: np.ndarray, size: tuple[int, int]) -> np.ndarray:
    """La grana della carta: presa da una zona vuota della sorgente, ripetuta a
    specchio sul nuovo formato in modo che non si vedano le ripetizioni."""
    h, w = img.shape[:2]
    free = (mask == 0).astype(np.uint8)
    best, patch = 0, None
    ph, pw = h // 4, w // 6
    for y in range(0, h - ph, ph // 2):
        for x in range(0, w - pw, pw // 2):
            score = free[y:y + ph, x:x + pw].sum()
            if score > best:
                best, patch = score, img[y:y + ph, x:x + pw]
    if patch is None:
        return np.zeros((size[1], size[0], 3), np.float32)
    grain = patch.astype(np.float32) - cv2.GaussianBlur(patch.astype(np.float32), (0, 0), 4)
    tile = np.concatenate([grain, grain[:, ::-1]], axis=1)
    tile = np.concatenate([tile, tile[::-1]], axis=0)
    reps = (size[1] // tile.shape[0] + 1, size[0] // tile.shape[1] + 1)
    return np.tile(tile, (reps[0], reps[1], 1))[:size[1], :size[0]]


def edge_ramp(shape: tuple[int, int], feather: dict[str, int] | None) -> np.ndarray:
    """Maschera 0..1 che porta a zero il delta sui lati da sfumare."""
    h, w = shape
    ramp = np.ones((h, w), np.float32)
    for side, n in (feather or {}).items():
        n = min(n, h if side in "tb" else w)
        if n <= 0:
            continue
        line = np.linspace(0, 1, n, dtype=np.float32)
        if side == "l":
            ramp[:, :n] *= line
        elif side == "r":
            ramp[:, -n:] *= line[::-1]
        elif side == "t":
            ramp[:n] *= line[:, None]
        elif side == "b":
            ramp[-n:] *= line[::-1, None]
    return ramp


def report_edges(piece: Piece, delta: np.ndarray) -> None:
    """Avvisa se un ritaglio taglia qualcosa: sul bordo il delta deve essere
    quasi zero, altrimenti nel montaggio si vedra' la giuntura."""
    edges = {"t": ("alto", delta[0]), "b": ("basso", delta[-1]),
             "l": ("sx", delta[:, 0]), "r": ("dx", delta[:, -1])}
    bad = {label: float(abs(v).max()) for side, (label, v) in edges.items()
           if side not in piece.expect_cut and abs(v).max() > 25}
    if bad:
        detail = ", ".join(f"{k} {v:.0f}" for k, v in bad.items())
        print(f"    ! {piece.name}: scarto sul bordo ({detail})")


def place(canvas: np.ndarray, delta: np.ndarray, piece: Piece, px_mm: float, dpi: float) -> None:
    """Somma il delta di un elemento sul nuovo fondo, alla scala e nel punto
    indicati dall'impaginato."""
    h, w = delta.shape[:2]
    tw = max(1, int(round(w * px_mm * piece.scale / 25.4 * dpi)))
    th = max(1, int(round(h * px_mm * piece.scale / 25.4 * dpi)))
    interp = cv2.INTER_AREA if tw < w else cv2.INTER_LANCZOS4
    d = cv2.resize(delta, (tw, th), interpolation=interp)

    x = mm2px(piece.at[0], dpi)
    y = mm2px(piece.at[1], dpi)
    vert, horiz = piece.anchor[0], piece.anchor[1]
    if horiz == "c":
        x -= tw // 2
    elif horiz == "r":
        x -= tw
    if vert == "b":
        y -= th

    # ritaglio ai bordi pagina: le orecchie e la catena escono dal formato
    sx0, sy0 = max(0, -x), max(0, -y)
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(canvas.shape[1], x + tw), min(canvas.shape[0], y + th)
    if x1 <= x0 or y1 <= y0:
        return
    canvas[y0:y1, x0:x1] += d[sy0:sy0 + (y1 - y0), sx0:sx0 + (x1 - x0)]


def compose(src: np.ndarray, pieces: list[Piece], src_w_mm: float, dark_bg: bool,
            dpi: float, band_rgb: np.ndarray) -> np.ndarray:
    px_mm = src_w_mm / src.shape[1]
    mask = element_mask(src, dark_bg)
    bg = background_model(src, mask)

    W, H = canvas_px(dpi)
    dpi = H / H_MM * 25.4      # quella vera della tela, dopo l'arrotondamento
    canvas = cv2.resize(bg, (W, H), interpolation=cv2.INTER_CUBIC)
    canvas += texture(src, mask, (W, H))

    for piece in pieces:
        x0, y0, x1, y1 = piece.box
        delta = src[y0:y1, x0:x1].astype(np.float32) - bg[y0:y1, x0:x1]
        for ex0, ey0, ex1, ey1 in piece.erase:
            delta[ey0 - y0:ey1 - y0, ex0 - x0:ex1 - x0] = 0
        delta *= edge_ramp(delta.shape[:2], piece.feather)[..., None]
        report_edges(piece, delta)
        place(canvas, delta, piece, px_mm, dpi)

    band = mm2px(BAND_MM, dpi)
    canvas[:, :band] = band_rgb[::-1]
    canvas[:, -band:] = band_rgb[::-1]
    return np.clip(canvas, 0, 255).astype(np.uint8)


def unify_pink(img: np.ndarray, src_rgb: np.ndarray, dst_rgb: np.ndarray) -> np.ndarray:
    """Porta i rosa del retro sul rosa del fronte. Nel file originale i due lati
    non coincidono (#D55082 contro #C43D6E), probabilmente per come e' stato
    renderizzato il mockup. Tocca solo i pixel saturi: neri e carta restano."""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    weight = np.clip((hsv[:, :, 1].astype(np.float32) - 40) / 60, 0, 1)[..., None]
    shift = (dst_rgb - src_rgb)[::-1].astype(np.float32)
    return np.clip(img.astype(np.float32) + weight * shift, 0, 255).astype(np.uint8)


def median_rgb(img: np.ndarray) -> np.ndarray:
    return np.median(img.reshape(-1, 3), 0)[::-1]


def add_bleed(face: np.ndarray, bleed_mm: float, dpi: float) -> tuple[np.ndarray, float]:
    """Allarga la tela ripetendo i pixel del bordo.

    L'abbondanza serve a coprire l'errore di taglio: oltre la linea di taglio
    non c'e' disegno da inventare, si prolunga quello che c'e'. Sui fianchi
    prolunga il rosa pieno, sopra e sotto il nero e le punte delle orecchie,
    che nell'originale erano gia' tagliate dal bordo. Quello che sta li' finisce
    comunque nello sfrido."""
    # il bordo si arrotonda per eccesso a pixel interi e la pagina si ricava da
    # quelli: cosi' l'immagine sta nel formato con rapporto esatto (niente
    # centratura con un filo di vuoto ai lati) e l'abbondanza non e' mai minore
    # di quella chiesta
    n = math.ceil(bleed_mm / 25.4 * dpi)
    return cv2.copyMakeBorder(face, n, n, n, n, cv2.BORDER_REPLICATE), n / dpi * 25.4


def to_pdf(faces: list[np.ndarray], path: Path, page_mm: tuple[float, float],
           trim_mm: tuple[float, float] | None = None) -> None:
    """PDF a due pagine. La misura non si lascia dedurre dai dpi (a 400 dpi i
    170 mm cadono su 2677,17 px): il box si impone in punti. I JPEG entrano
    cosi' come sono, senza una seconda compressione."""
    jpegs = []
    for face in faces:
        buf = io.BytesIO()
        Image.fromarray(cv2.cvtColor(face, cv2.COLOR_BGR2RGB)).save(
            buf, "JPEG", quality=95, subsampling=0)
        jpegs.append(buf.getvalue())

    size = (img2pdf.mm_to_pt(page_mm[0]), img2pdf.mm_to_pt(page_mm[1]))
    path.write_bytes(img2pdf.convert(jpegs, layout_fun=img2pdf.get_layout_fun(size)))

    if trim_mm is None:
        return
    # TrimBox: e' li' che la macchina taglia. Senza, in un file con abbondanza
    # la tipografia deve indovinare dove sia il formato finito.
    with pikepdf.open(path, allow_overwriting_input=True) as pdf:
        dx = img2pdf.mm_to_pt((page_mm[0] - trim_mm[0]) / 2)
        dy = img2pdf.mm_to_pt((page_mm[1] - trim_mm[1]) / 2)
        box = [dx, dy, size[0] - dx, size[1] - dy]
        for page in pdf.pages:
            page.obj["/TrimBox"] = pikepdf.Array([round(v, 4) for v in box])
        pdf.save(path)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dpi", type=int, default=400)
    ap.add_argument("--bleed", type=float, default=3.0,
                    help="abbondanza in mm del secondo PDF")
    ap.add_argument("--unify-pink", action="store_true")
    args = ap.parse_args()

    front_src, back_src = load_pages()
    OUT.mkdir(exist_ok=True)

    front_band = median_rgb(front_src[300:1300, 10:70])
    back_band = median_rgb(back_src[300:2100, 20:100])
    print(f"rosa fronte #{int(front_band[0]):02X}{int(front_band[1]):02X}{int(front_band[2]):02X}"
          f"  retro #{int(back_band[0]):02X}{int(back_band[1]):02X}{int(back_band[2]):02X}")

    print("fronte...")
    front = compose(front_src, FRONT_PIECES, FRONT_PAGE_W_MM, True, args.dpi, front_band)

    print("retro...")
    back_w_mm = back_src.shape[1] * BACK_PAGE_W_MM / BACK_PAGE_W_PX
    band = front_band if args.unify_pink else back_band
    back = compose(back_src, BACK_PIECES, back_w_mm, False, args.dpi, band)
    if args.unify_pink:
        back = unify_pink(back, back_band, front_band)

    dpi = front.shape[0] / H_MM * 25.4
    netto = OUT / "COUPON_REGALO_17x10.pdf"
    to_pdf([front, back], netto, (W_MM, H_MM))

    bordati = [add_bleed(f, args.bleed, dpi) for f in (front, back)]
    b = bordati[0][1]
    bleed = OUT / f"COUPON_REGALO_17x10_abbondanza{args.bleed:g}mm.pdf"
    to_pdf([f for f, _ in bordati], bleed, (W_MM + 2 * b, H_MM + 2 * b), (W_MM, H_MM))

    for name, face in (("fronte", front), ("retro", back)):
        prev = cv2.resize(face, (1400, int(1400 * H_MM / W_MM)), interpolation=cv2.INTER_AREA)
        cv2.imwrite(str(OUT / f"anteprima-{name}.jpg"), prev, [cv2.IMWRITE_JPEG_QUALITY, 90])

    for path, mm in ((netto, (W_MM, H_MM)), (bleed, (W_MM + 2 * b, H_MM + 2 * b))):
        print(f"{path.relative_to(ROOT.parent)}  {path.stat().st_size / 1e6:.1f} MB  "
              f"{mm[0]:g} x {mm[1]:g} mm a {dpi:.0f} dpi")


if __name__ == "__main__":
    main()
