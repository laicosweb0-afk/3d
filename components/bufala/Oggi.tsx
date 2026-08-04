'use client';

// «Oggi al banco» — la disponibilità della mozzarella, richiesta dal
// titolare, nella grafica del suo riferimento (04/08): pannello con la
// fotografia a sinistra, semaforo grande a destra, le righe informative,
// i due gesti — e sotto la legenda con TUTTE e tre le lucine, sempre.
//
// Da dove viene lo stato, in ordine di autorità:
//  1. il foglio Google del titolare (company.disponibilitaCsv), se la sua
//     ultima riga è DI OGGI, fuso di Roma;
//  2. altrimenti lo stato manuale (company.disponibilitaManuale), deciso
//     dall'utente: la grafica va in campo subito, il foglio la comanderà.
// L'ora dell'ultimo aggiornamento compare solo se arriva dal foglio: un
// orario inventato sarebbe finta freschezza.
//
// ⚠️ I testi sono quelli del riferimento del titolare; da riconfermare con
// lui insieme al resto del copy (Task 10).

import { useEffect, useState } from 'react';
import { asset } from '@/lib/asset';
import { company } from '@/content/bufala/company';

type Stato = 'verde' | 'giallo' | 'rosso';
interface Disponibilita { stato: Stato; ora?: string; nota?: string }

const TESTI: Record<Stato, { titolo: string; testo: string; legenda: string }> = {
  verde: {
    titolo: 'Disponibile',
    testo: 'La mozzarella fresca di oggi è disponibile in negozio.',
    legenda: 'Puoi passare al banco.',
  },
  giallo: {
    titolo: 'Quasi terminato',
    testo: 'Ne restano poche al banco: meglio chiamare prima.',
    legenda: 'Ne restano poche al banco.',
  },
  rosso: {
    titolo: 'Terminato',
    testo: 'Tutto esaurito per oggi: domattina si ricomincia presto.',
    legenda: 'Tutto esaurito per oggi.',
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
        if (data !== oggi) return manuale; // il dato di ieri non esiste
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

/** La carta nella Visita, fedele al riferimento del titolare. */
export function Oggi() {
  const [dato, setDato] = useState<Disponibilita>({ stato: company.disponibilitaManuale });

  useEffect(() => {
    leggi().then(setDato);
  }, []);

  const t = TESTI[dato.stato];

  return (
    <div className="oggi" id="oggi">
      <div className="oggi-carta">
        {/* La fotografia: per ora la mozzarella del sito; il giorno che
            arriva lo scatto vero del sacchetto D.O.P., si sostituisce qui. */}
        <div className="oggi-foto" aria-hidden="true">
          <img
            src={asset('/assets/bufala/intera.webp')}
            alt=""
            width={1280}
            height={720}
            loading="lazy"
            decoding="async"
          />
        </div>

        <div className="oggi-contenuto">
          <p className="micro oggi-etichetta">Oggi al banco</p>

          <p className="oggi-stato">
            <span className={`oggi-punto oggi-punto--${dato.stato}`} aria-hidden="true" />
            {t.titolo}
          </p>
          <p className="oggi-testo">{dato.nota || t.testo}</p>

          <hr className="oggi-filo" />

          <div className="oggi-voce">
            <span className="oggi-icona" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 7.5V12l3 2" />
              </svg>
            </span>
            <span>
              <span className="oggi-voce-nome">Preparata questa mattina</span>
              <span className="oggi-voce-dato">Con latte fresco selezionato</span>
            </span>
          </div>

          {dato.ora && (
            <div className="oggi-voce">
              <span className="oggi-icona" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 12a8 8 0 1 1-2.3-5.6" />
                  <path d="M20 4v4h-4" />
                </svg>
              </span>
              <span>
                <span className="oggi-voce-nome">Ultimo aggiornamento</span>
                <span className="oggi-voce-dato">{dato.ora}</span>
              </span>
            </div>
          )}

          <div className="oggi-azioni">
            <a className="bottone bottone--pieno" href="#dove">
              Passa al banco <span aria-hidden="true">→</span>
            </a>
            <a className="bottone" href={company.telefonoHref}>
              Chiama il negozio
            </a>
          </div>
        </div>
      </div>

      {/* La legenda: le tre lucine, sempre visibili, come nel riferimento. */}
      <div className="oggi-legenda">
        <p className="micro oggi-etichetta">Stato disponibilità</p>
        <div className="legenda-stati">
          {ORDINE.map((s) => (
            <div className="legenda-stato" key={s}>
              <span className={`oggi-punto oggi-punto--${s}`} aria-hidden="true" />
              <span>
                <span className="oggi-voce-nome">{TESTI[s].titolo}</span>
                <span className="oggi-voce-dato">{TESTI[s].legenda}</span>
              </span>
            </div>
          ))}
        </div>
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
      <span>Oggi al banco · {TESTI[dato.stato].titolo}</span>
    </a>
  );
}
