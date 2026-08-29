// Il marchio LUGO CITY: colori, scritte e il monogramma LC.
//
// Nasce dalla key art e dal video di apertura, che parte dalla Piazza dei
// Martiri vera e si trasforma nella sua versione a blocchi. Da qui pescano
// la schermata iniziale, le insegne dei pennoni e lo stemma sulla felpa del
// protagonista, così il marchio resta una cosa sola in tutto il gioco.

export const MARCHIO = {
  nome: 'LUGO',
  nome2: 'CITY',
  claim: 'La tua città. Il tuo gioco.',
  claimEn: 'YOUR CITY. YOUR GAME.',
  /** Blu del pennone e dello stemma. */
  blu: '#1E3C72',
  bluChiaro: '#2E5EA8',
  /** L'oro della scritta CITY. */
  oro: '#F2B419',
  oroScuro: '#C8900C',
  bianco: '#F4F2ED',
  nero: '#15171D',
} as const;

/**
 * Il monogramma LC dentro lo scudo esagonale, disegnato una volta sola su
 * canvas. Lo usano lo stemma sulla schiena della felpa e i gonfaloni.
 */
export function tessituraStemma(lato = 256): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = lato;
  c.height = lato;
  const x = c.getContext('2d');
  if (!x) return null;
  x.clearRect(0, 0, lato, lato);
  const cx = lato / 2;
  const cy = lato / 2;
  const r = lato * 0.42;

  // scudo esagonale, punta in basso
  x.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r * 1.06;
    if (i === 0) x.moveTo(px, py);
    else x.lineTo(px, py);
  }
  x.closePath();
  x.fillStyle = MARCHIO.bianco;
  x.fill();

  // il monogramma: la L che abbraccia la C, come nella key art
  x.strokeStyle = MARCHIO.blu;
  x.lineWidth = lato * 0.1;
  x.lineCap = 'butt';
  x.beginPath();
  x.moveTo(cx - r * 0.42, cy - r * 0.5);
  x.lineTo(cx - r * 0.42, cy + r * 0.42);
  x.lineTo(cx + r * 0.12, cy + r * 0.42);
  x.stroke();
  x.beginPath();
  x.arc(cx + r * 0.16, cy - r * 0.02, r * 0.42, Math.PI * 0.28, Math.PI * 1.72);
  x.stroke();
  return c;
}

/** Il gonfalone blu "LUGO CITY" appeso ai lampioni della piazza. */
export function tessituraGonfalone(w = 128, h = 320): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  if (!x) return null;
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, MARCHIO.bluChiaro);
  g.addColorStop(1, MARCHIO.blu);
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);

  const stemma = tessituraStemma(128);
  if (stemma) x.drawImage(stemma, w * 0.16, h * 0.16, w * 0.68, w * 0.68);

  x.fillStyle = MARCHIO.bianco;
  x.textAlign = 'center';
  x.font = `bold ${Math.round(w * 0.2)}px ui-sans-serif, system-ui, sans-serif`;
  x.fillText('LUGO', w / 2, h * 0.72);
  x.fillText('CITY', w / 2, h * 0.86);
  return c;
}
