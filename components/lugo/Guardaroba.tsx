'use client';

// Il guardaroba di LUGO CITY: si sceglie il look pezzo per pezzo.
//
// Ogni capo è una voce di dati in lib/lugo/avatar.ts, col suo prezzo in
// euro virtuali e il livello richiesto: qui non c'è nessuna lista cablata,
// il pannello si costruisce da solo su quello che c'è nel guardaroba. Un
// capo si compra una volta e resta tuo; le tinte sono comprese.

import { useLugo } from '@/lib/lugo/store';
import {
  GUARDAROBA,
  TINTE_CAPELLI,
  TINTE_PELLE,
  capoDi,
  type CategoriaCapo,
} from '@/lib/lugo/avatar';
import { livelloDaRep } from '@/lib/lugo/progressione';

const ETICHETTE: Record<CategoriaCapo, string> = {
  capelli: 'Capelli',
  copricapo: 'In testa',
  top: 'Sopra',
  pantaloni: 'Sotto',
  scarpe: 'Scarpe',
  accessorio: 'Accessori',
};

/** Il campo dell'avatar che tiene l'id scelto per una categoria. */
const CAMPO: Record<CategoriaCapo, 'capelli' | 'copricapo' | 'top' | 'pantaloni' | 'scarpe' | 'accessorio'> = {
  capelli: 'capelli',
  copricapo: 'copricapo',
  top: 'top',
  pantaloni: 'pantaloni',
  scarpe: 'scarpe',
  accessorio: 'accessorio',
};

/** Il campo che tiene l'indice di tinta, dove la categoria ne ha una. */
const CAMPO_TINTA: Partial<Record<CategoriaCapo, 'capelliTinta' | 'copricapoTinta' | 'topTinta' | 'pantaloniTinta' | 'scarpeTinta'>> = {
  capelli: 'capelliTinta',
  copricapo: 'copricapoTinta',
  top: 'topTinta',
  pantaloni: 'pantaloniTinta',
  scarpe: 'scarpeTinta',
};

export function Guardaroba() {
  const avatar = useLugo((s) => s.avatar);
  const capi = useLugo((s) => s.capi);
  const denaro = useLugo((s) => s.denaro);
  const punteggio = useLugo((s) => s.punteggio);
  const setAvatar = useLugo((s) => s.setAvatar);
  const compraCapo = useLugo((s) => s.compraCapo);
  const addDenaro = useLugo((s) => s.addDenaro);
  const setAvviso = useLugo((s) => s.setAvviso);
  const setGuardaroba = useLugo((s) => s.setGuardaroba);
  const livello = livelloDaRep(punteggio).n;

  const scegli = (cat: CategoriaCapo, id: string) => {
    const capo = capoDi(cat, id);
    const chiave = `${cat}:${id}`;
    const posseduto = capo.prezzo === 0 || capi.includes(chiave);
    if (!posseduto) {
      if ((capo.livello ?? 1) > livello) {
        setAvviso(`«${capo.nome}» si sblocca al livello ${capo.livello}`);
        return;
      }
      if (denaro < capo.prezzo) {
        setAvviso(`Ti mancano €${(capo.prezzo - denaro).toFixed(2)} per «${capo.nome}»`);
        return;
      }
      addDenaro(-capo.prezzo);
      compraCapo(chiave);
      setAvviso(`Comprato: ${capo.nome}`);
    }
    setAvatar({ [CAMPO[cat]]: id });
  };

  const cambiaTinta = (cat: CategoriaCapo, verso: number) => {
    const campo = CAMPO_TINTA[cat];
    if (!campo) return;
    setAvatar({ [campo]: (avatar[campo] as number) + verso });
  };

  return (
    <div className="lugo-guardaroba" data-hud="guardaroba">
      <div className="lugo-diario-testa">
        <div>
          <div className="lugo-vetrina-cat">Guardaroba</div>
          <div className="lugo-vetrina-nome">Come ti vesti oggi</div>
        </div>
        <button type="button" className="lugo-vetrina-chiudi" onClick={() => setGuardaroba(false)}>
          ✕
        </button>
      </div>

      {/* pelle e colore dei capelli: non si comprano, si scelgono */}
      <div className="lugo-gr-riga">
        <span className="lugo-gr-etichetta">Incarnato</span>
        <span className="lugo-gr-tinte">
          {TINTE_PELLE.map((t, i) => (
            <button
              key={t}
              type="button"
              className={'lugo-tinta' + (i === avatar.pelle ? ' lugo-tinta-scelta' : '')}
              style={{ background: t }}
              onClick={() => setAvatar({ pelle: i })}
              aria-label={`Incarnato ${i + 1}`}
            />
          ))}
        </span>
      </div>
      <div className="lugo-gr-riga">
        <span className="lugo-gr-etichetta">Colore capelli</span>
        <span className="lugo-gr-tinte">
          {TINTE_CAPELLI.map((t, i) => (
            <button
              key={t}
              type="button"
              className={'lugo-tinta' + (i === avatar.capelliTinta ? ' lugo-tinta-scelta' : '')}
              style={{ background: t }}
              onClick={() => setAvatar({ capelliTinta: i })}
              aria-label={`Capelli ${i + 1}`}
            />
          ))}
        </span>
      </div>

      {(Object.keys(GUARDAROBA) as CategoriaCapo[]).map((cat) => {
        const scelto = avatar[CAMPO[cat]] as string;
        const conTinta = Boolean(CAMPO_TINTA[cat] && capoDi(cat, scelto).tinte?.length);
        return (
          <div className="lugo-gr-gruppo" key={cat}>
            <div className="lugo-gr-testa">
              <span className="lugo-gr-etichetta">{ETICHETTE[cat]}</span>
              {conTinta && (
                <button type="button" className="lugo-gr-tinta-btn" onClick={() => cambiaTinta(cat, 1)}>
                  cambia tinta
                </button>
              )}
            </div>
            <div className="lugo-gr-capi">
              {GUARDAROBA[cat].map((capo) => {
                const chiave = `${cat}:${capo.id}`;
                const posseduto = capo.prezzo === 0 || capi.includes(chiave);
                const bloccato = !posseduto && (capo.livello ?? 1) > livello;
                const caro = !posseduto && !bloccato && denaro < capo.prezzo;
                return (
                  <button
                    key={capo.id}
                    type="button"
                    className={
                      'lugo-gr-capo' +
                      (scelto === capo.id ? ' lugo-gr-capo-addosso' : '') +
                      (bloccato || caro ? ' lugo-gr-capo-fuori' : '')
                    }
                    onClick={() => scegli(cat, capo.id)}
                  >
                    <span className="lugo-gr-capo-nome">{capo.nome}</span>
                    {posseduto ? (
                      <span className="lugo-gr-capo-stato">{scelto === capo.id ? 'addosso' : 'tuo'}</span>
                    ) : bloccato ? (
                      <span className="lugo-gr-capo-stato">liv. {capo.livello}</span>
                    ) : (
                      <span className="lugo-gr-capo-prezzo">€{capo.prezzo}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="lugo-diario-nota">
        Quello che compri resta tuo e si salva. Alcuni capi si sbloccano salendo di livello.
      </div>
    </div>
  );
}
