'use client';

// «Oggi al banco» — la disponibilità della mozzarella, richiesta dal
// titolare. Due facce dello stesso dato:
//
//  · la CARTA, nella Visita: semaforo, stato composto in Playfair, ora
//    dell'ultimo aggiornamento, e i due gesti (chiama / come arrivare);
//  · la PILLA, nell'ingresso: una riga viva in cima allo schermo che porta
//    alla carta con un'ancora. È assoluta: compare senza spostare di un
//    pixel il resto (lo spostamento di layout è a zero e ci resta).
//
// La regola d'onestà governa tutto: il dato vale solo se è DI OGGI
// (fuso di Roma). Foglio non configurato, rete assente, riga vecchia →
// nessun semaforo: l'invito a chiamare, che è sempre vero. Mai un
// «Disponibile» di ieri spacciato per fresco.
//
// ⚠️ I testi degli stati sono scritti per il titolare e vanno approvati
// con lui insieme al resto del copy (Task 10).

import { useEffect, useState } from 'react';
import { company } from '@/content/bufala/company';

type Stato = 'verde' | 'giallo' | 'rosso';
interface Disponibilita { stato: Stato; ora?: string; nota?: string }

const TESTI: Record<Stato, { titolo: string; testo: string }> = {
  verde: { titolo: 'Disponibile', testo: 'La mozzarella fresca di oggi è al banco.' },
  giallo: { titolo: 'Quasi terminata', testo: 'Ne restano poche: meglio chiamare prima.' },
  rosso: { titolo: 'Terminata per oggi', testo: 'Domattina si ricomincia presto.' },
};

/** Una lettura sola per pagina, condivisa da carta e pilla. */
let promessa: Promise<Disponibilita | null> | null = null;

function leggi(): Promise<Disponibilita | null> {
  if (!company.disponibilitaCsv) return Promise.resolve(null);
  if (!promessa) {
    promessa = fetch(company.disponibilitaCsv, { cache: 'no-store' })
      .then((r) => (r.ok ? r.text() : null))
      .then((testo) => {
        if (!testo) return null;
        // L'ultima riga compilata del foglio: il titolare aggiunge in coda.
        const righe = testo.trim().split(/\r?\n/).filter((r) => r.trim() !== '');
        const [data, stato, ora, ...nota] = righe[righe.length - 1]
          .split(',')
          .map((c) => c.replace(/^"|"$/g, '').trim());
        const oggi = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' })
          .format(new Date());
        if (data !== oggi) return null; // il dato di ieri non esiste
        if (stato !== 'verde' && stato !== 'giallo' && stato !== 'rosso') return null;
        return {
          stato: stato as Stato,
          ora: ora || undefined,
          nota: nota.join(',') || undefined,
        };
      })
      .catch(() => null);
  }
  return promessa;
}

/** La carta nella Visita. Senza dato vivo mostra la faccia onesta:
 *  l'invito a chiamare, che non può mai essere falso. */
export function Oggi() {
  const [dato, setDato] = useState<Disponibilita | null>(null);

  useEffect(() => {
    leggi().then((d) => { if (d) setDato(d); });
  }, []);

  return (
    <div className="oggi" id="oggi">
      <p className="micro oggi-etichetta">Oggi al banco</p>

      {dato ? (
        <>
          <p className="oggi-stato">
            <span className={`oggi-punto oggi-punto--${dato.stato}`} aria-hidden="true" />
            {TESTI[dato.stato].titolo}
          </p>
          <p className="oggi-testo">{dato.nota || TESTI[dato.stato].testo}</p>
          {dato.ora && (
            <p className="micro oggi-ora">Ultimo aggiornamento · {dato.ora}</p>
          )}
        </>
      ) : (
        <>
          <p className="oggi-stato">La disponibilità cambia ogni mattina.</p>
          <p className="oggi-testo">Per sapere com’è messa oggi, chiamaci.</p>
        </>
      )}

      <div className="scheda-azioni">
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

/** La riga viva nell'ingresso: esiste solo col dato di oggi. */
export function OggiPilla() {
  const [dato, setDato] = useState<Disponibilita | null>(null);

  useEffect(() => {
    leggi().then((d) => { if (d) setDato(d); });
  }, []);

  if (!dato) return null;

  return (
    <a className="oggi-pilla" href="#oggi">
      <span className={`oggi-punto oggi-punto--${dato.stato}`} aria-hidden="true" />
      <span>Oggi al banco · {TESTI[dato.stato].titolo}</span>
    </a>
  );
}
