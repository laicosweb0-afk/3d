#!/usr/bin/env bash
# =============================================================================
# BAZAR MARRAKECH — fotogrammi della hero scroll-driven
#
# Dal video sorgente (la porta che si apre, la camera che entra nello
# showroom e si posa su un salotto) estrae due sequenze di fotogrammi WebP:
#
#   public/bazar-shop/assets/hero/mobile/porta-showroom-0001.webp …   720×1280 (verticale)
#   public/bazar-shop/assets/hero/desktop/porta-showroom-0001.webp …  1600×900  (orizzontale)
#
# più le due immagini fisse (ultimo fotogramma), usate al primo caricamento e
# con «riduci movimento»:
#
#   public/bazar-shop/assets/hero/hero-poster-mobile.webp
#   public/bazar-shop/assets/hero/hero-poster-desktop.webp
#
# e il manifest con il numero di fotogrammi, letto da build.mjs.
#
# Uso:
#   bash tools/bazar-shop/hero-frames.sh <video.mp4> [fotogrammi=120] [video-verticale.mp4]
#
# Con un solo video orizzontale, la versione mobile è il ritaglio centrale
# verticale: per restare nitida serve un sorgente almeno 4K. Se c'è una
# ripresa verticale dedicata, passala come terzo argomento.
#
# Dopo: node tools/bazar-shop/build.mjs
# =============================================================================
set -euo pipefail

VIDEO="${1:?Indica il video sorgente: bash tools/bazar-shop/hero-frames.sh video.mp4}"
N="${2:-120}"
VERTICALE="${3:-$VIDEO}"
QUALITA="${QUALITA:-72}"   # qualità WebP (0-100): 72 è il compromesso peso/nitidezza

FFMPEG="${FFMPEG:-$(command -v ffmpeg || echo node_modules/ffmpeg-static/ffmpeg)}"
FFPROBE="${FFPROBE:-$(command -v ffprobe || true)}"
OUT="$(cd "$(dirname "$0")/../.." && pwd)/public/bazar-shop/assets/hero"

durata() {
  "$FFPROBE" -v error -show_entries format=duration -of default=nw=1:nk=1 "$1"
}

# Estrae N fotogrammi distribuiti su tutta la durata, a copertura del formato
# richiesto (scala finché riempie, poi ritaglia al centro).
estrai() {
  local src="$1" dir="$2" w="$3" h="$4"
  local d fps
  d="$(durata "$src")"
  fps="$(awk -v n="$N" -v d="$d" 'BEGIN { printf "%.6f", n / d }')"
  rm -rf "$dir" && mkdir -p "$dir"
  "$FFMPEG" -hide_banner -loglevel error -i "$src" \
    -vf "fps=${fps},scale=${w}:${h}:force_original_aspect_ratio=increase:flags=lanczos,crop=${w}:${h}" \
    -frames:v "$N" -c:v libwebp -quality "$QUALITA" -compression_level 6 -preset photo \
    "$dir/porta-showroom-%04d.webp"
  ls "$dir" | wc -l | tr -d ' '
}

echo "Fotogrammi mobile (720×1280) da: $VERTICALE"
NM="$(estrai "$VERTICALE" "$OUT/mobile" 720 1280)"
echo "Fotogrammi desktop (1600×900) da: $VIDEO"
ND="$(estrai "$VIDEO" "$OUT/desktop" 1600 900)"

# Le immagini fisse: l'ultimo fotogramma, dove la camera si è posata.
cp "$OUT/mobile/$(ls "$OUT/mobile" | tail -1)" "$OUT/hero-poster-mobile.webp"
cp "$OUT/desktop/$(ls "$OUT/desktop" | tail -1)" "$OUT/hero-poster-desktop.webp"

cat > "$OUT/manifest.json" <<JSON
{
  "segnaposto": false,
  "nome": "porta-showroom",
  "mobile": { "fotogrammi": $NM, "larghezza": 720, "altezza": 1280 },
  "desktop": { "fotogrammi": $ND, "larghezza": 1600, "altezza": 900 }
}
JSON

echo "Fatto: $NM fotogrammi mobile, $ND desktop. Ora: node tools/bazar-shop/build.mjs"
du -sh "$OUT/mobile" "$OUT/desktop"
