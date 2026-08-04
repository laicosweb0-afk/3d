'use client';

// «Oggi al banco» — ridisegno del 04/08 (brief Apple dell'utente):
// disponibilità, orari e azioni non sono più tre componenti — sono UNA
// carta. Tre zone divise da fili sottilissimi:
//
//   1. lo stato: il sacchetto D.O.P. come miniatura, lo stato composto in
//      Playfair col punto allineato otticamente, la riga attenuata sotto,
//      e i tre semafori in una riga di chip — mai un elenco in colonna:
//      l'attivo è pieno, gli altri si spengono;
//   2. gli orari: il giorno è la categoria (maiuscoletto quieto), l'orario
//      è il contenuto (tabulare, in latte); i giorni chiusi sussurrano;
//   3. le azioni: chiama, e come arrivare.
//
// Da dove viene lo stato, in ordine di autorità: il foglio Google del
// titolare se la sua ultima riga è DI OGGI (fuso di Roma); altrimenti lo
// stato manuale in company.ts. L'ora dell'aggiornamento compare solo se
// arriva dal foglio: un orario inventato sarebbe finta freschezza.
//
// ⚠️ Testi da riconfermare col titolare insieme al resto del copy (Task 10).

import { useEffect, useState } from 'react';
import { asset } from '@/lib/asset';
import { company } from '@/content/bufala/company';

type Stato = 'verde' | 'giallo' | 'rosso';
interface Disponibilita { stato: Stato; ora?: string; nota?: string }

const TESTI: Record<Stato, { titolo: string; testo: string; chip: string }> = {
  verde: {
    titolo: 'Disponibile oggi',
    testo: 'Passa al banco senza prenotazione.',
    chip: 'Disponibile',
  },
  giallo: {
    titolo: 'Quasi terminata',
    testo: 'Ne restano poche: meglio chiamare prima.',
    chip: 'Quasi terminata',
  },
  rosso: {
    titolo: 'Terminata per oggi',
    testo: 'Domattina si ricomincia presto.',
    chip: 'Terminata',
  },
};

const ORDINE: Stato[] = ['verde', 'giallo', 'rosso'];

/** Una lettura sola per pagina, condivisa da carta e pilla. */
let promessa: Promise<Disponibilita> | null = null;

function leggi(): Promise<Disponibilita> {
  const manuale: Disponibilita = { stato: company.disponibilitaManuale };
  if (!company.disponibilitaCsv) return Promise.resolve(manuale);
  if (!promessa) {
    promessa = fetch(company.disponibilitaCsv, { cache: 'no-store' })
      .then((r) => (r.ok ? r.text() : null))
      .then((testo) => {
        if (!testo) return manuale;
        const righe = testo.trim().split(/\r?\n/).filter((r) => r.trim() !== '');
        const [data, stato, ora, ...nota] = righe[righe.length - 1]
          .split(',')
          .map((c) => c.replace(/^"|"$/g, '').trim());
        const oggi = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' })
          .format(new Date());
        if (data !== oggi) return manuale;
        if (stato !== 'verde' && stato !== 'giallo' && stato !== 'rosso') return manuale;
        return {
          stato: stato as Stato,
          ora: ora || undefined,
          nota: nota.join(',') || undefined,
        };
      })
      .catch(() => manuale);
  }
  return promessa;
}

/** L'unica carta della Visita: stato, orari, azioni. */
export function Oggi() {
  const [dato, setDato] = useState<Disponibilita>({ stato: company.disponibilitaManuale });

  useEffect(() => {
    leggi().then(setDato);
  }, []);

  const t = TESTI[dato.stato];

  return (
    <div className="visita-carta" id="oggi">
      {/* Zona 1 · lo stato */}
      <div className="carta-stato">
        <span className="stato-foto" aria-hidden="true">
          <img
            src={asset('/assets/bufala/sacchetto-dop.webp')}
            alt=""
            width={1100}
            height={1375}
            loading="lazy"
            decoding="async"
          />
        </span>
        <div className="stato-testi">
          <p className="micro carta-etichetta">Oggi al banco</p>
          <p className="stato-titolo">
            <span className={`oggi-punto oggi-punto--${dato.stato}`} aria-hidden="true" />
            {t.titolo}
          </p>
          <p className="stato-riga">{dato.nota || t.testo}</p>
          {dato.ora && (
            <p className="micro stato-ora">Aggiornato alle {dato.ora}</p>
          )}
        </div>
      </div>

      {/* I tre semafori in riga: l'attivo è pieno, gli altri si spengono. */}
      <div className="stato-chips" aria-hidden="true">
        {ORDINE.map((s) => (
          <span
            className={`stato-chip${s === dato.stato ? ' stato-chip--attivo' : ''}`}
            key={s}
          >
            <span className={`oggi-punto oggi-punto--${s}`} />
            {TESTI[s].chip}
          </span>
        ))}
      </div>

      <hr className="carta-filo" />

      {/* Zona 2 · gli orari */}
      <dl className="carta-orari">
        {company.orari.map((o) => (
          <div className="orario-riga" key={o.giorno}>
            <dt className="orario-giorno">{o.giorno}</dt>
            <dd className={'apre' in o ? 'orario-ore' : 'orario-ore orario-ore--chiuso'}>
              {'apre' in o ? `${o.apre} — ${o.chiude}` : 'Chiuso'}
            </dd>
          </div>
        ))}
      </dl>

      <hr className="carta-filo" />

      {/* Zona 3 · le azioni */}
      <div className="carta-azioni">
        <a className="bottone bottone--pieno" href={company.telefonoHref}>
          Chiama il negozio
        </a>
        <a className="bottone" href="#dove">
          Come arrivare
        </a>
      </div>
    </div>
  );
}

/** La riga viva nell'ingresso: porta alla carta. */
export function OggiPilla() {
  const [dato, setDato] = useState<Disponibilita>({ stato: company.disponibilitaManuale });

  useEffect(() => {
    leggi().then(setDato);
  }, []);

  return (
    <a className="oggi-pilla" href="#oggi">
      <span className={`oggi-punto oggi-punto--${dato.stato}`} aria-hidden="true" />
      <span>Oggi al banco · {TESTI[dato.stato].chip}</span>
    </a>
  );
}
