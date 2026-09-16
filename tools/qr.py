"""QR code per un link — PNG per lo schermo, SVG per la stampa.

Serve per i link che vanno su materiale fisico (card, vetrina, volantini).
Unica dipendenza: `pip install segno`.

    python3 tools/qr.py https://club.ramastore.it club-qr

Produce <nome>.png e <nome>.svg. I colori sono quelli del marchio; con
--neutro escono nero su bianco, la scelta più sicura per una tipografia.
"""
import sys
import segno

INK = "#1D1D1F"      # lo stesso inchiostro della landing
CREAM = "#F5F1E9"    # lo stesso fondo

def main(argv):
    neutro = "--neutro" in argv
    argv = [a for a in argv if a != "--neutro"]
    if len(argv) < 2:
        sys.exit("uso: python3 tools/qr.py <url> [nome-file] [--neutro]")
    url = argv[1]
    nome = argv[2] if len(argv) > 2 else "qr"
    scuro, chiaro = ("black", "white") if neutro else (INK, CREAM)

    # Correzione d'errore alta: il codice regge graffi, pieghe e una stampa
    # storta, che su carta o su una vetrina capitano.
    qr = segno.make(url, error="h")
    qr.save(f"{nome}.png", scale=12, border=4, dark=scuro, light=chiaro)
    qr.save(f"{nome}.svg", scale=12, border=4, dark=scuro, light=chiaro)
    print(f"{nome}.png e {nome}.svg — versione {qr.version}, correzione {qr.error.upper()}")
    print(f"contenuto: {url}")

if __name__ == "__main__":
    main(sys.argv)
