# -*- coding: utf-8 -*-
"""Genera la tavola grande del funnel di Woman."""

W, H = 1600, 2678
L, R = 70, 1530          # colonna di contenuto
CX = (L + R) // 2        # 800
out = []
def a(s): out.append(s)

def txt(x, y, s, cls, fill="var(--ink)", anchor="start"):
    an = f' text-anchor="{anchor}"' if anchor != "start" else ""
    a(f'<text class="{cls}" x="{x}" y="{y}" fill="{fill}"{an}>{s}</text>')

def lines(x, y, seq, cls, fill, lead):
    for i, s in enumerate(seq):
        txt(x, y + i * lead, s, cls, fill)
    return y + len(seq) * lead

# ─────────────────────────────────────────────── testata
txt(L, 84, "Woman Srl · schema di acquisizione", "d-eyebrow", "var(--granata)")
txt(L, 146, "Il funnel per intero", "d-title")
txt(L, 192, "Tre sorgenti che fanno entrare, quattro filtri che tolgono. Per ogni filtro: che cosa si fa, perché si perde gente, quale numero lo misura.", "d-sub", "var(--ink-2)")
a(f'<line x1="{L}" y1="214" x2="{R}" y2="214" stroke="var(--rule)" stroke-width="1"/>')
txt(L, 240, "Via San Martino 1 · Sant'Agata sul Santerno (RA)", "d-meta", "var(--ink-3)")
txt(R, 240, "Pilota a otto settimane · agosto 2026", "d-meta", "var(--ink-3)", "end")

# ─────────────────────────────────────────────── 1. le tre sorgenti
txt(L, 300, "Le tre sorgenti — fanno entrare, non filtrano", "d-colhead", "var(--verde)")
a(f'<line x1="{L}" y1="316" x2="{R}" y2="316" stroke="var(--hair)" stroke-width="1"/>')

CARDS = [
    ("Internet", "var(--granata)", "si apre per prima",
     ["La mail alla vostra rubrica, il link che", "l'azienda gira ai suoi, Google, l'e-commerce."],
     ["Chi vi conosce già, o ha il link in mano", "da qualcuno di cui si fida. I più caldi."],
     ["Quasi zero: il tempo di scrivere la mail."]),
    ("Eventi dal vivo", "var(--verde)", "si apre per seconda",
     ["La serata in negozio, il banco in fiera,", "la serata riservata a un'azienda."],
     ["Poche persone, ma le migliori:", "vi hanno visto in faccia."],
     ["Cara se la pagate voi. Quasi zero se la", "finanzia il marchio."]),
    ("Social", "var(--ottone)", "si apre per ultima",
     ["Il post, la storia, l'annuncio a", "pagamento su Instagram e Facebook."],
     ["Estranei: non vi stavano cercando,", "gli arrivate addosso mentre scorrono."],
     ["Con una cinquantina di follower, in", "organico non esiste: o si paga, o niente."]),
]
CW, CGAP = 472, 22
CY0, CY1 = 336, 704
for i, (name, col, ordine, cose, chi, costo) in enumerate(CARDS):
    x = L + i * (CW + CGAP)
    a(f'<rect x="{x}" y="{CY0}" width="{CW}" height="{CY1-CY0}" fill="var(--panel)" stroke="var(--hair)"/>')
    a(f'<rect x="{x}" y="{CY0}" width="{CW}" height="3" fill="{col}"/>')
    tx = x + 26
    txt(tx, CY0 + 36, ordine.upper(), "d-lab", col)
    txt(tx, CY0 + 74, name, "d-cardname")
    a(f'<line x1="{tx}" y1="{CY0+94}" x2="{x+CW-26}" y2="{CY0+94}" stroke="var(--hair)"/>')
    y = CY0 + 118
    txt(tx, y, "CHE COS'È", "d-lab", "var(--ink-3)")
    y = lines(tx, y + 22, [s for s in cose if s], "d-txt", "var(--ink-2)", 21)
    y += 30
    txt(tx, y, "CHI CI ARRIVA", "d-lab", "var(--ink-3)")
    y = lines(tx, y + 22, chi, "d-txt", "var(--ink-2)", 21)
    y += 10
    a(f'<line x1="{tx}" y1="{y}" x2="{x+CW-26}" y2="{y}" stroke="var(--hair)"/>')
    y += 22
    txt(tx, y, "QUANTO COSTA", "d-lab", "var(--ink-3)")
    lines(tx, y + 22, costo, "d-txt", "var(--ink-2)", 21)

# convergenza
CXS = [L + i * (CW + CGAP) + CW // 2 for i in range(3)]
a(f'<path d="M {CXS[0]} {CY1} V 722 Q {CXS[0]} 736 {CXS[0]+14} 736 H {CX-14}" fill="none" stroke="var(--verde)" stroke-width="1.4"/>')
a(f'<path d="M {CXS[1]} {CY1} V 736" fill="none" stroke="var(--verde)" stroke-width="1.4"/>')
a(f'<path d="M {CXS[2]} {CY1} V 722 Q {CXS[2]} 736 {CXS[2]-14} 736 H {CX+14}" fill="none" stroke="var(--verde)" stroke-width="1.4"/>')
a(f'<circle cx="{CX}" cy="736" r="5" fill="var(--granata)"/>')
a(f'<path d="M {CX} 736 V 776" fill="none" stroke="var(--granata)" stroke-width="2" marker-end="url(#fr-g)"/>')
txt(CX + 22, 766, "qualunque sorgente prendano, arrivano tutti sulla stessa pagina", "d-mini", "var(--ink-2)")

# ─────────────────────────────────────────────── 2. i quattro filtri
txt(L, 804, "Che cosa si fa", "d-colhead", "var(--granata)")
txt(R, 804, "Perché si perde qui, e che numero guardare", "d-colhead", "var(--granata)", "end")
a(f'<line x1="{L}" y1="820" x2="400" y2="820" stroke="var(--hair)"/>')
a(f'<line x1="1200" y1="820" x2="{R}" y2="820" stroke="var(--hair)"/>')

ROWS = [
    dict(top=844, hw=(370, 320), band="var(--b1)", on="var(--on-b1)", num="01",
         title="LA PAGINA", sub="Arriva, e in tre secondi decide se è nel posto giusto",
         fa=[["Una pagina per ogni ente, col suo nome nel titolo."],
             ["Nessun menu, nessun link ai social, nessun", "«chi siamo»: le uniche uscite sono il pulsante", "e la X del browser."],
             ["Le stesse identiche parole del messaggio", "che l'ha portata qui."],
             ["Il conta-persone acceso prima di pubblicare,", "non dopo."]],
         perche=["Non trova quello che le era stato", "promesso — oppure trova dieci uscite", "e ne prende una."],
         numero=["Quanti restano oltre trenta secondi."],
         nota="Si migliora togliendo, non aggiungendo. E costa zero."),
    dict(top=1094, hw=(320, 270), band="var(--b2)", on="var(--on-b2)", num="02",
         title="IL CONTATTO E IL CODICE", sub="Lascia nome e mail, e riceve il codice del suo ente",
         fa=[["Tre campi: nome, mail, azienda. Nient'altro."],
             ["Due caselle separate davvero: una per", "attivare la convenzione, una per le", "comunicazioni."],
             ["Il campo «da dove arriva» compilato in", "automatico, che la persona non vede."],
             ["Pagina del grazie: codice grande, scadenza,", "indirizzo del negozio, orari."]],
         perche=["Il prezzo che chiedete è più alto del", "regalo che offrite: sette campi per", "uno sconto sono troppi."],
         numero=["Quanti aprono il modulo contro", "quanti lo finiscono."],
         nota="Tanti aprono e pochi finiscono: è il modulo. Pochi aprono: è la pagina sopra."),
    dict(top=1344, hw=(270, 220), band="var(--b3)", on="var(--on-b3)", num="03",
         title="IL PRIMO ACQUISTO", sub="Entra in negozio e compra: qui, e solo qui, diventa cliente",
         fa=[["Una scadenza vera, scritta sulla pagina,", "sul grazie e sulla locandina."],
             ["Il codice non si digita: si mostra dal", "telefono, o si dice il nome dell'ente."],
             ["Richiamata entro ventiquattro ore, sempre", "dalla stessa persona."],
             ["In cassa lo riconoscono tutti, e si segna", "lo scontrino."]],
         perche=["Non c'è nessun motivo per farlo", "adesso: niente scadenza, nessuno", "che richiama, un codice scomodo."],
         numero=["Gli acquisti, divisi per sorgente."],
         nota="Un codice attivato e mai usato non è un cliente: è una riga in un foglio."),
    dict(top=1594, hw=(220, 170), band="var(--b4)", on="var(--on-b4)", num="04",
         title="IL RITORNO", sub="Torna una seconda volta, e porta qualcuno con sé",
         fa=[["Una seconda ragione per tornare:", "il trattamento, la gift card, la serata."],
             ["La serata riservata ai dipendenti", "dell'azienda del pilota."],
             ["La proposta di Natale entro i primi", "dieci giorni di novembre."]],
         perche=["Non gli avete dato una seconda", "ragione: il profumo si compra, e per", "un anno non ci si pensa più."],
         numero=["Quanti hanno ricomprato entro", "tre mesi."],
         nota=""),
]

RH, BOFF, BH = 250, 22, 168
for r in ROWS:
    top = r["top"]; by0 = top + BOFF; by1 = by0 + BH
    hw0, hw1 = r["hw"]
    pts = f'{CX-hw0},{by0} {CX+hw0},{by0} {CX+hw1},{by1} {CX-hw1},{by1}'
    a(f'<polygon points="{pts}" fill="{r["band"]}" stroke="var(--band-line)"/>')
    txt(CX - hw0 + 34, by0 + 46, r["num"], "d-bandnum", r["on"])
    txt(CX, by0 + 66, r["title"], "d-bandtitle", r["on"], "middle")
    txt(CX, by0 + 106, r["sub"], "d-bandsub", r["on"], "middle")
    if r["nota"]:
        txt(CX, by1 + 32, r["nota"], "d-bandnote", "var(--ink-2)", "middle")

    # raccordi
    ym = (by0 + by1) // 2
    a(f'<line x1="404" y1="{ym}" x2="{CX-hw0-6}" y2="{ym}" stroke="var(--hair)" stroke-dasharray="3 4"/>')
    a(f'<line x1="{CX+hw0+6}" y1="{ym}" x2="1196" y2="{ym}" stroke="var(--hair)" stroke-dasharray="3 4"/>')

    # colonna sinistra
    a(f'<rect x="{L}" y="{top+14}" width="2.5" height="{RH-56}" fill="var(--granata)"/>')
    y = top + 40
    for b in r["fa"]:
        a(f'<circle cx="{L+18}" cy="{y-5}" r="2.6" fill="var(--granata)"/>')
        y = lines(L + 32, y, b, "d-txt", "var(--ink-2)", 21) + 12

    # colonna destra
    y = top + 40
    txt(1200, y, "PERCHÉ SI PERDE", "d-lab", "var(--granata)")
    y = lines(1200, y + 24, r["perche"], "d-txt", "var(--ink-2)", 21) + 18
    txt(1200, y, "IL NUMERO", "d-lab", "var(--granata)")
    lines(1200, y + 24, r["numero"], "d-txt", "var(--ink-2)", 21)

# anello del ritorno
BY_LAST = ROWS[-1]["top"] + BOFF + BH
a(f'<path d="M {CX} {BY_LAST} V {BY_LAST+58} H 34 V 520 H 62" fill="none" stroke="var(--ottone)" stroke-width="1.6" stroke-dasharray="6 5" marker-end="url(#fr-o)"/>')
txt(120, BY_LAST + 82, "i primi tre filtri consumano i soldi, questo è l'unico che li restituisce: chi torna rientra dalla sorgente più economica, e porta il prossimo", "d-mini", "var(--ottone)")

# ─────────────────────────────────────────────── 3. le otto settimane
TY = 1984
txt(L, TY, "Le otto settimane — chi fa che cosa", "d-colhead", "var(--granata)")
a(f'<line x1="{L}" y1="{TY+16}" x2="{R}" y2="{TY+16}" stroke="var(--hair)"/>')

TL, TR = 110, 1490
step = (TR - TL) / 8.0
wx = [TL + i * step for i in range(9)]
LINE = TY + 130
a(f'<rect x="{wx[3]:.0f}" y="{LINE-10}" width="{wx[7]-wx[3]:.0f}" height="20" fill="var(--b1)"/>')
txt((wx[3] + wx[7]) / 2, LINE - 78, "quattro settimane di raccolta — non si tocca niente, nemmeno se viene voglia", "d-mini", "var(--ink-2)", "middle")
a(f'<path d="M {(wx[3]+wx[7])/2:.0f} {LINE-70} V {LINE-14}" stroke="var(--b3)" stroke-width="1" stroke-dasharray="3 3" fill="none"/>')
a(f'<line x1="{TL}" y1="{LINE}" x2="{TR}" y2="{LINE}" stroke="var(--ink)" stroke-width="1.4"/>')
for i, x in enumerate(wx):
    a(f'<line x1="{x:.0f}" y1="{LINE-7}" x2="{x:.0f}" y2="{LINE+7}" stroke="var(--ink-3)" stroke-width="1"/>')
    txt(f"{x:.0f}", LINE + 34, str(i), "d-week", "var(--ink-3)", "middle")
txt(TL, LINE + 58, "SETTIMANA", "d-lab", "var(--ink-3)", "middle")
MILE = [(0, "up", "si conta quello che c'è in casa"), (2, "up", "la pagina è pronta"),
        (8, "up", "si apre la seconda sorgente"),
        (1, "dn", "si sceglie l'azienda"), (3, "dn", "si parte: l'azienda gira il link"),
        (7, "dn", "il lunedì dei numeri")]
for i, side, label in MILE:
    x = wx[i]
    a(f'<circle cx="{x:.0f}" cy="{LINE}" r="5.5" fill="var(--granata)"/>')
    anchor = "middle"
    if i == 0: anchor = "start"
    if i == 8: anchor = "end"
    xa = x + (-8 if i == 0 else (8 if i == 8 else 0))
    txt(f"{xa:.0f}", LINE - 26 if side == "up" else LINE + 82, label, "d-mil", "var(--ink)", anchor)

# ─────────────────────────────────────────────── 4. due pannelli
PY0, PY1 = 2248, 2570
a(f'<rect x="{L}" y="{PY0}" width="720" height="{PY1-PY0}" fill="var(--panel)" stroke="var(--hair)"/>')
a(f'<rect x="810" y="{PY0}" width="720" height="{PY1-PY0}" fill="var(--panel)" stroke="var(--hair)"/>')

txt(L + 26, PY0 + 34, "IL FOGLIO DEI NUMERI · OGNI LUNEDÌ, DIECI MINUTI", "d-lab", "var(--granata)")
a(f'<line x1="{L+26}" y1="{PY0+48}" x2="764" y2="{PY0+48}" stroke="var(--hair)"/>')
SHEET = [
    ("1", "Arrivati sulla pagina", "se è piccolo, il link non è girato"),
    ("2", "Hanno cominciato il modulo", "distingue «non convince» da «troppo lungo»"),
    ("3", "Lo hanno finito", "i contatti veri, col campo da dove arrivano"),
    ("4", "Hanno chiesto la chiamata", "dice se una persona sola basta"),
    ("5", "Hanno comprato", "la riga che conta: le altre spiegano questa"),
    ("6", "Quanto hanno speso", "se portano acquisti o solo sconti"),
    ("7", "Sono tornati", "si legge a tre mesi: decide se si ripaga"),
]
for i, (n, k, v) in enumerate(SHEET):
    y = PY0 + 82 + i * 36
    txt(L + 26, y, n, "d-rowno", "var(--granata)")
    txt(L + 50, y, k, "d-sheet")
    txt(L + 300, y, v, "d-txt", "var(--ink-2)")

txt(836, PY0 + 34, "LE TRE LETTURE · ALLA SETTIMANA SETTE", "d-lab", "var(--granata)")
a(f'<line x1="836" y1="{PY0+48}" x2="1504" y2="{PY0+48}" stroke="var(--hair)"/>')
LETT = [
    ("var(--granata)", "Pochi sono arrivati sulla pagina.",
     ["Non è la pagina: il link non è girato. Si telefona", "all'azienda e si chiede il promemoria."]),
    ("var(--ottone)", "Tanti arrivati, pochi contatti.",
     ["È la pagina o il modulo — la riga 2 dice quale.", "Si accorcia, o si allineano le parole."]),
    ("var(--verde)", "Tanti contatti, pochi acquisti.",
     ["Manca il motivo per farlo adesso: scadenza,", "chiamata a ventiquattro ore, codice comodo."]),
]
for i, (col, q, ex) in enumerate(LETT):
    y = PY0 + 84 + i * 96
    a(f'<rect x="836" y="{y-18}" width="3" height="62" fill="{col}"/>')
    txt(852, y, q, "d-lettura")
    lines(852, y + 26, ex, "d-txt", "var(--ink-2)", 21)

# ─────────────────────────────────────────────── piede
a(f'<line x1="{L}" y1="2610" x2="{R}" y2="2610" stroke="var(--rule)"/>')
txt(L, 2638, "Woman Srl · profumeria e beauty center · dal 1989", "d-meta", "var(--ink-3)")
txt(R, 2638, "Non promettiamo una percentuale: promettiamo una misura", "d-meta", "var(--ink-3)", "end")

svg = f'''<svg class="dia" viewBox="0 0 {W} {H}" role="img" aria-label="Schema completo del funnel di Woman: in alto tre sorgenti — internet, eventi dal vivo, social — che convergono su un'unica pagina; al centro quattro filtri a imbuto, la pagina, il contatto e il codice, il primo acquisto, il ritorno, ognuno con a sinistra che cosa si fa e a destra perché si perde gente e quale numero lo misura; un anello tratteggiato riporta dal ritorno alla prima sorgente; sotto la linea del tempo delle otto settimane, il foglio dei numeri a sette righe e le tre letture possibili alla settimana sette.">
<defs>
<marker id="fr-g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--granata)"/></marker>
<marker id="fr-o" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ottone)"/></marker>
</defs>
{chr(10).join(out)}
</svg>'''

open('svg.frag', 'w', encoding='utf-8').write(svg)
print('svg', len(svg), 'byte')
