import { motion } from 'framer-motion';

/**
 * La boccetta grande, quella che si guarda: vetro spesso, liquido dentro,
 * tappo pesante, un riflesso che scorre e l'ombra appoggiata sotto.
 *
 * Non è il marchio. `AureaLogo` è una sagoma da 20px che deve reggere
 * nell'intestazione e dentro la moneta, e a quella misura un disegno con i
 * riflessi diventa una macchia: due mestieri diversi, due file diversi.
 *
 * **Quando c'è la foto vera, questa si fa da parte.** Se la fragranza in
 * `gioco.ts` porta un'`immagine`, la mostriamo al posto del disegno: una
 * boccetta fotografata sul tavolo del negozio batte qualunque vettoriale, e
 * il cliente riconosce quella che ha appena visto sullo scaffale. Il disegno
 * resta come rete: niente foto, niente schermata vuota.
 */
export function Boccetta({
  size = 190, immagine, nome,
}: { size?: number; immagine?: string; nome?: string }) {
  if (immagine) {
    return (
      <motion.img
        src={immagine}
        alt={nome ? `Il flacone di ${nome}` : ''}
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 170, damping: 22 }}
        style={{ width: size, height: 'auto' }}
        className="relative select-none drop-shadow-[0_22px_34px_rgba(29,29,31,.26)]"
      />
    );
  }

  return (
    <motion.svg
      width={size} height={size * (260 / 200)} viewBox="0 0 200 260"
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 170, damping: 22 }}
      className="relative select-none"
      role={nome ? 'img' : 'presentation'}
      aria-label={nome ? `Il flacone di ${nome}` : undefined}
      aria-hidden={nome ? undefined : true}
    >
      <defs>
        {/* Il vetro: quasi trasparente al centro, più denso ai bordi — è lo
            spessore del vetro che si vede di taglio, non una cornice. */}
        <linearGradient id="bo-vetro" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8C6E27" stopOpacity=".34" />
          <stop offset="16%" stopColor="#FFFFFF" stopOpacity=".78" />
          <stop offset="50%" stopColor="#FBFAF7" stopOpacity=".34" />
          <stop offset="84%" stopColor="#8C6E27" stopOpacity=".26" />
          <stop offset="100%" stopColor="#5E4A18" stopOpacity=".46" />
        </linearGradient>
        {/* Il liquido: più scuro sul fondo, dove se ne accumula di più. */}
        <linearGradient id="bo-succo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F2DFA6" />
          <stop offset="48%" stopColor="#D9B45E" />
          <stop offset="100%" stopColor="#8C6E27" />
        </linearGradient>
        <linearGradient id="bo-tappo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F6E4B4" />
          <stop offset="38%" stopColor="#E8CD86" />
          <stop offset="62%" stopColor="#C9A54E" />
          <stop offset="100%" stopColor="#8C6E27" />
        </linearGradient>
        <radialGradient id="bo-ombra" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#1D1D1F" stopOpacity=".26" />
          <stop offset="100%" stopColor="#1D1D1F" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bo-luce" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="45%" stopColor="#FFFFFF" stopOpacity=".55" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <clipPath id="bo-dentro">
          <rect x="46" y="86" width="108" height="150" rx="26" />
        </clipPath>
      </defs>

      {/* L'ombra sul piano: schiacciata, larga, senza contorno. */}
      <ellipse cx="100" cy="240" rx="62" ry="12" fill="url(#bo-ombra)" />

      {/* Il tappo, in due pezzi: la testa e l'anello che la stacca dal collo. */}
      <rect x="74" y="14" width="52" height="34" rx="9" fill="url(#bo-tappo)" />
      <rect x="74" y="14" width="52" height="12" rx="6" fill="#FBFAF7" opacity=".28" />
      <rect x="84" y="49" width="32" height="9" rx="4" fill="#8C6E27" opacity=".85" />
      {/* Il collo. */}
      <rect x="86" y="57" width="28" height="32" rx="5" fill="url(#bo-vetro)" />
      <rect x="86" y="57" width="28" height="32" rx="5" fill="none" stroke="#8C6E27"
        strokeOpacity=".35" strokeWidth="1.2" />

      {/* Il corpo: vetro, poi il liquido che si ferma a tre quarti. */}
      <rect x="46" y="86" width="108" height="150" rx="26" fill="url(#bo-vetro)" />
      <g clipPath="url(#bo-dentro)">
        <rect x="46" y="128" width="108" height="108" fill="url(#bo-succo)" />
        {/* Il pelo del liquido: una riga chiara, appena mossa. */}
        <path d="M46 128 q27 -5 54 0 t54 0 v5 H46 Z" fill="#F6E4B4" opacity=".55" />
      </g>
      <rect x="46" y="86" width="108" height="150" rx="26" fill="none" stroke="#8C6E27"
        strokeOpacity=".45" strokeWidth="1.4" />

      {/* I due riflessi fissi: la striscia lunga sul fianco sinistro e il
          punto di luce in alto a destra. Senza questi il vetro è plastica. */}
      <rect x="60" y="100" width="13" height="112" rx="6.5" fill="#FFFFFF" opacity=".42" />
      <rect x="132" y="104" width="6" height="42" rx="3" fill="#FFFFFF" opacity=".24" />

      {/* Il riflesso che scorre: lento, una volta ogni tanto, come la luce
          di una vetrina quando passa qualcuno. Va tenuto dentro il ritaglio
          del corpo, altrimenti attraversa la schermata come una banda bianca
          che con la boccetta non c'entra niente. */}
      <g clipPath="url(#bo-dentro)">
        <motion.rect
          x="46" y="86" width="70" height="150" fill="url(#bo-luce)"
          initial={{ x: -90 }}
          animate={{ x: [-90, 150] }}
          transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 3.4, ease: 'easeInOut' }}
        />
      </g>

      {/* L'etichetta: niente scritte finte, solo due righe incise. A questa
          misura un nome inventato si legge, e sarebbe un nome sbagliato. */}
      <rect x="72" y="150" width="56" height="34" rx="6" fill="#FBFAF7" opacity=".55" />
      <rect x="82" y="161" width="36" height="3" rx="1.5" fill="#8C6E27" opacity=".55" />
      <rect x="88" y="170" width="24" height="2.5" rx="1.25" fill="#8C6E27" opacity=".38" />
    </motion.svg>
  );
}
