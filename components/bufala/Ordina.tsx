'use client';

// Il compositore dell'ordine — una carta sola, come «Oggi al banco».
//
// Quattro zone divise da fili: la ricerca, la lista con lo stepper a
// chili, il ritiro con le finestre del titolare, l'invio. Il pulsante
// finale non manda niente a nessun server: apre WhatsApp col messaggio
// già scritto, e l'ordine diventa una conversazione col banco — che è
// l'unico posto dove può essere confermato davvero.
//
// Le finestre di prenotazione sono INFORMAZIONE, non cancello (decisione
// dell'utente, 04/08: «inserirla delicatamente nella box, come le luci
// della disponibilità»). Il visitatore ordina quando vuole; se le
// prenotazioni sono chiuse, il messaggio lo dice al posto suo e il banco
// risponde col primo giorno possibile. Un modulo che si blocca fuori
// orario è un cliente perso ad ogni ora sbagliata.
//
// Tutto ciò che dipende dall'orologio vive DOPO il montaggio: la pagina è
// prerenderizzata al build, e un'ora calcolata lì sarebbe l'ora del
// build, non quella del visitatore — oltre che un errore di idratazione.

import { useEffect, useMemo, useState } from 'react';
import { company } from '@/content/bufala/company';
import {
  ordinabili,
  finestre,
  statoFinestre,
  minutoRoma,
  PASSO_KG,
  type Finestra,
} from '@/content/bufala/ordina';

/** Minuscole e niente accenti: «friarielli all'olio» si trova anche
 *  scrivendo «olio» o «FRIARIELLI» — e l'apostrofo (dritto o tipografico)
 *  diventa uno spazio, sennò «all’olio» resta una parola sola. L'intervallo è quello dei segni
 *  diacritici combinanti che NFD stacca dalle lettere. */
function normalizza(testo: string): string {
  return testo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, ' ');
}

/** Una parola risponde a un termine se una delle due è prefisso
 *  dell'altra, o se condividono le prime cinque lettere: così «formaggi»
 *  trova «formaggio», «salume» trova «salumi», e «mozz» basta. */
function risponde(parola: string, termine: string): boolean {
  return (
    parola.startsWith(termine) ||
    termine.startsWith(parola) ||
    (parola.length >= 5 && termine.length >= 5 && parola.slice(0, 5) === termine.slice(0, 5))
  );
}

function cerca(query: string) {
  const termini = normalizza(query).split(/\s+/).filter(Boolean);
  if (termini.length === 0) return ordinabili;
  return ordinabili.filter((p) => {
    const parole = normalizza([p.nome, p.categoria, p.produttore ?? ''].join(' '))
      .split(/\s+/)
      .filter(Boolean);
    return termini.every((t) => parole.some((w) => risponde(w, t)));
  });
}

const kgTesto = (kg: number) => `${kg.toLocaleString('it-IT')} kg`;

export function Ordina() {
  const [query, setQuery] = useState('');
  /** I chili scelti, per nome di prodotto. Assente = non nell'ordine. */
  const [kg, setKg] = useState<Record<string, number>>({});
  /** I prodotti scritti a mano: il catalogo è parziale, l'ordine no. */
  const [extra, setExtra] = useState<{ nome: string; kg: number }[]>([]);
  /** Il ritiro scelto fra le finestre aperte. */
  const [ritiro, setRitiro] = useState<string | null>(null);
  /** Lo stato delle finestre: solo dopo il montaggio (vedi testata). */
  const [adesso, setAdesso] = useState<{ aperte: Finestra[]; prossima: Finestra } | null>(null);

  useEffect(() => {
    const stato = statoFinestre(minutoRoma());
    setAdesso(stato);
    if (stato.aperte.length > 0) setRitiro(stato.aperte[0].ritiro);
  }, []);

  const trovati = useMemo(() => cerca(query), [query]);

  const cambia = (nome: string, minKg: number, verso: 1 | -1) => {
    setKg((prima) => {
      const attuale = prima[nome] ?? 0;
      const nuovo = attuale === 0 ? (verso === 1 ? minKg : 0) : attuale + verso * PASSO_KG;
      const prossimo = { ...prima };
      if (nuovo < minKg) delete prossimo[nome];
      else prossimo[nome] = nuovo;
      return prossimo;
    });
  };

  const cambiaExtra = (nome: string, verso: 1 | -1) => {
    setExtra((prima) =>
      prima
        .map((v) => (v.nome === nome ? { ...v, kg: v.kg + verso * PASSO_KG } : v))
        .filter((v) => v.kg >= 1),
    );
  };

  const pulita = query.trim();
  const giaPresente =
    trovati.some((p) => normalizza(p.nome) === normalizza(pulita)) ||
    extra.some((v) => normalizza(v.nome) === normalizza(pulita));

  const aggiungiExtra = () => {
    if (!pulita || giaPresente) return;
    setExtra((prima) => [...prima, { nome: pulita, kg: 1 }]);
    setQuery('');
  };

  const scelti = ordinabili.filter((p) => (kg[p.nome] ?? 0) > 0);
  const voci = scelti.length + extra.length;
  const totaleKg =
    scelti.reduce((somma, p) => somma + kg[p.nome], 0) + extra.reduce((s, v) => s + v.kg, 0);

  /** Il messaggio: righe corte, dati e basta — dev'essere comodo da
   *  leggere sul telefono del banco, non elegante. */
  const messaggio = [
    `Ordine — ${company.brand}`,
    '',
    ...scelti.map((p) => `• ${p.nome} — ${kgTesto(kg[p.nome])}`),
    ...extra.map((v) => `• ${v.nome} — ${kgTesto(v.kg)}`),
    '',
    ritiro
      ? `Ritiro: ${ritiro}`
      : `Ritiro: da concordare (prenotazioni chiuse al momento dell’invio${
          adesso ? `, riaprono ${adesso.prossima.apreTesto}` : ''
        })`,
  ].join('\n');

  const invia = `https://wa.me/${company.whatsapp}?text=${encodeURIComponent(messaggio)}`;

  return (
    <div className="visita-carta ordina-carta">
      {/* Zona 1 · la ricerca */}
      <p className="micro carta-etichetta">Il tuo ordine</p>
      <input
        className="ordina-cerca"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cerca: mozzarella, formaggi, salumi…"
        aria-label="Cerca un prodotto da ordinare"
        autoComplete="off"
      />
      <p className="micro ordina-regola">Si ordina al chilo: ogni prodotto parte da 1 kg.</p>

      {/* Zona 2 · la lista. Ogni riga: nome e categoria a sinistra, a
          destra «Aggiungi» che diventa uno stepper. Il meno sotto il
          minimo toglie il prodotto: il minimo non si aggira, si spiega. */}
      <div className="ordine-lista">
        {trovati.map((p) => {
          const q = kg[p.nome] ?? 0;
          return (
            <div className="ordine-riga" key={p.nome}>
              <div>
                <span className="ordine-nome">{p.nome}</span>
                <span className="ordine-dettaglio">
                  {[p.categoria, p.produttore].filter(Boolean).join(' · ')}
                </span>
              </div>
              {q === 0 ? (
                <button
                  type="button"
                  className="ordine-aggiungi"
                  onClick={() => cambia(p.nome, p.minKg, 1)}
                >
                  Aggiungi
                </button>
              ) : (
                <div className="ordine-passo">
                  <button
                    type="button"
                    className="passo-tasto"
                    onClick={() => cambia(p.nome, p.minKg, -1)}
                    aria-label={`Riduci ${p.nome}`}
                  >
                    −
                  </button>
                  <span className="passo-kg">{kgTesto(q)}</span>
                  <button
                    type="button"
                    className="passo-tasto"
                    onClick={() => cambia(p.nome, p.minKg, 1)}
                    aria-label={`Aumenta ${p.nome}`}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {extra.map((v) => (
          <div className="ordine-riga" key={v.nome}>
            <div>
              <span className="ordine-nome">{v.nome}</span>
              <span className="ordine-dettaglio">Aggiunto da te</span>
            </div>
            <div className="ordine-passo">
              <button
                type="button"
                className="passo-tasto"
                onClick={() => cambiaExtra(v.nome, -1)}
                aria-label={`Riduci ${v.nome}`}
              >
                −
              </button>
              <span className="passo-kg">{kgTesto(v.kg)}</span>
              <button
                type="button"
                className="passo-tasto"
                onClick={() => cambiaExtra(v.nome, 1)}
                aria-label={`Aumenta ${v.nome}`}
              >
                +
              </button>
            </div>
          </div>
        ))}

        {/* Il catalogo è parziale (blocco 10): quello che manca dalla
            lista non deve mancare dall'ordine. */}
        {pulita && !giaPresente && (
          <div className="ordine-riga">
            <div>
              <span className="ordine-nome">«{pulita}»</span>
              <span className="ordine-dettaglio">Non è ancora in lista — chiedilo al banco</span>
            </div>
            <button type="button" className="ordine-aggiungi" onClick={aggiungiExtra}>
              Aggiungi
            </button>
          </div>
        )}
      </div>

      <hr className="carta-filo" />

      {/* Zona 3 · il ritiro. Le finestre del titolare come informazione
          quieta — la stessa grammatica degli orari — e i giorni ordinabili
          adesso come chip da scegliere. */}
      <p className="micro carta-etichetta">Il ritiro</p>

      {adesso && adesso.aperte.length > 1 && (
        <div className="ritiro-chips" role="group" aria-label="Scegli il giorno di ritiro">
          {adesso.aperte.map((f) => (
            <button
              type="button"
              key={f.ritiro}
              className={`ritiro-chip${f.ritiro === ritiro ? ' ritiro-chip--attivo' : ''}`}
              onClick={() => setRitiro(f.ritiro)}
            >
              {f.ritiro}
            </button>
          ))}
        </div>
      )}

      <dl className="carta-orari ritiro-righe">
        {finestre.map((f) => {
          const aperta = adesso?.aperte.some((a) => a.ritiro === f.ritiro) ?? false;
          return (
            <div className="orario-riga" key={f.ritiro}>
              <dt className="orario-giorno">{f.ritiro}</dt>
              <dd className={`ritiro-quando${aperta ? ' ritiro-quando--aperta' : ''}`}>
                {aperta && <span className="oggi-punto oggi-punto--verde" aria-hidden="true" />}
                {aperta ? 'si ordina adesso' : f.quando}
              </dd>
            </div>
          );
        })}
      </dl>

      {adesso && (
        <p className="ordina-sintesi">
          {adesso.aperte.length > 0
            ? `Ordinando adesso ritiri ${ritiro}.`
            : `Le prenotazioni riaprono ${adesso.prossima.apreTesto}, per il ritiro di ${adesso.prossima.ritiro}. Puoi comunque mandare l’ordine: ti rispondiamo noi.`}
        </p>
      )}

      <hr className="carta-filo" />

      {/* Zona 4 · l'invio. */}
      {voci > 0 && (
        <p className="ordina-totale">
          {voci === 1 ? 'Un prodotto' : `${voci} prodotti`} · {kgTesto(totaleKg)}
        </p>
      )}
      <div className="carta-azioni">
        {voci > 0 ? (
          <a className="bottone bottone--pieno" href={invia} target="_blank" rel="noreferrer">
            Invia l’ordine su WhatsApp
          </a>
        ) : (
          <span className="bottone bottone--pieno bottone--spento" aria-disabled="true">
            Invia l’ordine su WhatsApp
          </span>
        )}
      </div>
      <p className="micro ordina-nota">
        Si apre WhatsApp col messaggio già scritto. L’ordine vale quando ti rispondiamo.
      </p>
    </div>
  );
}
