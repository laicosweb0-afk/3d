// La scritta del logo esiste in un solo colore: il latte, per il fondo verde.
// Nella firma, però, sta su una carta chiara — e latte su latte è 1,02 a 1:
// invisibile. Qui ne ricavo la gemella scura tenendo il canale alfa, che è
// l'unica cosa che conta: la sagoma delle lettere. Nessuna generazione,
// nessun credito: si ridipinge un ritaglio che abbiamo già.
import sharp from '/home/user/3d/node_modules/sharp/lib/index.js';

const sorgente = 'public/assets/brand-bufala/logo-wordmark.png';
const destinazione = 'public/assets/brand-bufala/logo-wordmark-scuro.png';
const INCHIOSTRO = [0x18, 0x26, 0x1f]; // --testo-titolo

const { data, info } = await sharp(sorgente).ensureAlpha().raw()
  .toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += info.channels) {
  data[i] = INCHIOSTRO[0];
  data[i + 1] = INCHIOSTRO[1];
  data[i + 2] = INCHIOSTRO[2];
}

await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
  .png({ compressionLevel: 9, palette: true })
  .toFile(destinazione);

const m = await sharp(destinazione).metadata();
console.log(`${destinazione}  ${m.width}×${m.height}  ${(m.size / 1024).toFixed(0)} kB`);
