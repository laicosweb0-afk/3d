// Estrae dal logo vettoriale ufficiale i due pezzi che il sito usa davvero:
//
//   logo-marchio.svg/.png    il bufalo + "prodotti tipici italiani", a colori
//   logo-wordmark.svg/.png   la scritta "Quelli della bufala" da sola
//
// Il sito carica i PNG a 4x: le lettere sono un tracciato con migliaia di
// punti, e l'SVG pesa quasi dieci volte tanto a parità di resa.
//
// La targhetta di legno dell'originale resta fuori: il marrone chiaro e la
// texture del legno sono in contrasto con la direzione premium del sito
// (DIRECTION_BUFALA.md §2-§3), e il cliente ha chiesto di non usarli.
// La scritta però NON viene riscritta con un font simile: sono le lettere
// originali del marchio, ripulite dai graffi che nell'originale simulavano
// il legno inciso, e ricolorate nel latte della palette.
//
// Uso:  node tools/bufala-logo.mjs
// Richiede python3 con PyMuPDF (pip install pymupdf).

import { execFileSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';

const SCRIPT = new URL('./bufala-logo.py', import.meta.url).pathname;

const py = String.raw`
import fitz

SRC = 'public/assets/brand-bufala/logo-vettoriale.pdf'
OUT = 'public/assets/brand-bufala'

# Indici dei tracciati nel PDF sorgente (stabili: il file non cambia).
MARCHIO = [3, 4, 5, 6, 7]   # bufalo verde+rosso, claim tricolore
SCRITTA = 8                 # "Quelli della bufala" + i graffi del legno

# Contorni del tracciato 8 che sono scaglie del legno, non lettere: stanno
# ai bordi, fuori dalla banda delle lettere. Verificati a video uno per uno.
SCAGLIE = {8, 20, 25, 77, 86}


def contorni(d):
    """Separa il tracciato piatto nei suoi contorni: un nuovo contorno inizia
    dove il punto di partenza non coincide con l'arrivo del precedente."""
    g, cur, prev = [], [], None
    for it in d['items']:
        s = it[1]
        if prev is not None and (abs(s.x - prev.x) > 0.01 or abs(s.y - prev.y) > 0.01):
            g.append(cur); cur = []
        cur.append(it); prev = it[-1]
    if cur: g.append(cur)
    return g


def punti(g):
    return [p for it in g for p in it[1:]]


def area(g):
    """Formula del laccio di scarpa: separa una lettera piena da un graffio
    lungo e sottile, cosa che il solo ingombro non fa."""
    p = punti(g)
    if len(p) < 3: return 0.0
    n = len(p)
    return abs(sum(p[i].x * p[(i+1) % n].y - p[(i+1) % n].x * p[i].y
                   for i in range(n))) / 2


def compatta(g):
    a = area(g)
    p = punti(g)
    w = max(q.x for q in p) - min(q.x for q in p)
    h = max(q.y for q in p) - min(q.y for q in p)
    return a / (w * h) if w * h > 0 else 0


def disegna(sh, g, m):
    for it in g:
        if it[0] == 'l':    sh.draw_line(it[1]*m, it[2]*m)
        elif it[0] == 'c':  sh.draw_bezier(it[1]*m, it[2]*m, it[3]*m, it[4]*m)
        elif it[0] == 're': sh.draw_rect(it[1]*m)
        elif it[0] == 'qu': sh.draw_quad(it[1]*m)


LATTE = '#F6F1E4'   # var(--latte) della palette


def salva(pg, nome, tinta=None):
    """Salva l'SVG (sorgente) e il PNG a 4x (quello che il sito carica)."""
    svg = pg.get_svg_image()
    if tinta:
        svg = svg.replace('fill="#ffffff"', f'fill="{tinta}"')
    with open(f'{OUT}/{nome}.svg', 'w') as f:
        f.write(svg)

    tmp = f'{OUT}/.{nome}.tmp.svg'
    with open(tmp, 'w') as f:
        f.write(svg)
    pdf = fitz.open('pdf', fitz.open(tmp).convert_to_pdf())
    pix = pdf[0].get_pixmap(matrix=fitz.Matrix(4, 4), alpha=True)
    pix.save(f'{OUT}/{nome}.png')
    import os; os.remove(tmp)
    print(f'  {nome}: svg {len(svg)//1024} KB · png {pix.width}x{pix.height}')


def marchio():
    src = fitz.open(SRC)
    dis = src[0].get_drawings()
    scelti = [dis[i] for i in MARCHIO]
    r = scelti[0]['rect']
    for d in scelti[1:]:
        r = r | d['rect']
    r = fitz.Rect(r.x0-6, r.y0-6, r.x1+6, r.y1+6)

    out = fitz.open(); pg = out.new_page(width=r.width, height=r.height)
    m = fitz.Matrix(1, 1).pretranslate(-r.x0, -r.y0)
    sh = pg.new_shape()
    for d in scelti:
        disegna(sh, d['items'], m)
        sh.finish(fill=d['fill'], color=None,
                  even_odd=d.get('even_odd', False),
                  closePath=d.get('closePath', False))
    sh.commit()
    salva(pg, 'logo-marchio')
    out.close(); src.close()


def wordmark():
    src = fitz.open(SRC)
    d = src[0].get_drawings()[SCRITTA]
    gs = contorni(d)

    def tieni(i, g):
        if i in SCAGLIE: return False
        a = area(g)
        if a >= 600: return True                      # corpi delle lettere
        return a >= 40 and compatta(g) >= 0.40        # puntini e tratti stretti

    tenuti = [g for i, g in enumerate(gs) if tieni(i, g)]
    pts = [p for g in tenuti for p in punti(g)]
    r = fitz.Rect(min(p.x for p in pts)-4, min(p.y for p in pts)-4,
                  max(p.x for p in pts)+4, max(p.y for p in pts)+4)

    out = fitz.open(); pg = out.new_page(width=r.width, height=r.height)
    m = fitz.Matrix(1, 1).pretranslate(-r.x0, -r.y0)
    sh = pg.new_shape()
    for g in tenuti:
        disegna(sh, g, m)
    sh.finish(fill=(1, 1, 1), color=None,
              even_odd=d.get('even_odd', False), closePath=True)
    sh.commit()
    salva(pg, 'logo-wordmark', tinta=LATTE)
    print(f'  ({len(tenuti)} contorni su {len(gs)}: scartati graffi e scaglie)')
    out.close(); src.close()


def spolvera(nome, raggio=9, minimo=700):
    """Ultima passata sulla scritta, sui pixel invece che sui tracciati.
    Alcuni graffi del legno sono saldati alle lettere nel disegno originale
    (la crocetta sulla 'a' finale, le scaglie sotto la 'Q') e nessun filtro
    per contorni può separarli. Un'apertura morfologica invece sì: cancella
    i tratti più sottili del raggio e lascia intatti quelli delle lettere,
    molto più spessi. La maschera aperta viene poi usata per filtrare l'alpha
    originale, così i bordi restano sfumati e non scalettati."""
    import numpy as np
    from PIL import Image
    from scipy import ndimage

    im = Image.open(f'{OUT}/{nome}.png')
    alpha = np.array(im)[:, :, 3]
    piena = alpha > 40

    y, x = np.ogrid[-raggio:raggio+1, -raggio:raggio+1]
    disco = x*x + y*y <= raggio*raggio
    aperta = ndimage.binary_opening(piena, structure=disco)

    # Via i frammenti isolati sopravvissuti all'apertura, ma la soglia deve
    # restare sotto il puntino della 'i': e' il piu' piccolo pezzo legittimo.
    etich, n = ndimage.label(aperta)
    if n:
        dim = ndimage.sum(aperta, etich, range(1, n+1))
        for i, s in enumerate(dim, 1):
            if s < minimo:
                aperta[etich == i] = False

    maschera = ndimage.binary_dilation(aperta, structure=disco)
    out = np.zeros(alpha.shape + (4,), np.uint8)
    out[..., 0], out[..., 1], out[..., 2] = 0xF6, 0xF1, 0xE4
    out[..., 3] = alpha * maschera
    Image.fromarray(out).save(f'{OUT}/{nome}.png')
    tolti = 100 * (1 - out[..., 3].sum() / max(alpha.sum(), 1))
    print(f'  spolverata: rimosso il {tolti:.1f}% dei pixel (graffi saldati alle lettere)')


print('Estrazione dal logo vettoriale:')
marchio()
wordmark()
spolvera('logo-wordmark')
`;

writeFileSync(SCRIPT, py);
try {
  execFileSync('python3', [SCRIPT], { stdio: 'inherit' });
} finally {
  unlinkSync(SCRIPT);
}
